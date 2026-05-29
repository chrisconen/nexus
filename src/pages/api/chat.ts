import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, message, conversation, usageDaily } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { streamOllamaChat, type OllamaMessage } from "@/lib/llm/ollama";
import { streamGroqChat, runGroqToolLoop, simpleGroqChat, type GroqMessage } from "@/lib/llm/groq";
import { streamGoogleChat, runGoogleToolLoop, type GoogleMessage } from "@/lib/llm/google";
import { streamDeepSeekChat, type DeepSeekMessage } from "@/lib/llm/deepseek";
import { streamClaudeChat, type ClaudeContentBlock } from "@/lib/llm/claude";
import { logData } from "@/lib/log";
import { skillRouter, type SkillRoute } from "@/lib/llm/skills";
import "@/lib/llm/skills/setup";
import "@/lib/llm/tools/register-all";
import { detectIntent } from "@/lib/chat/intent-detector";
import { getOpenAITools } from "@/lib/llm/tools";

export const prerender = false;

type LLMMessage = OllamaMessage | GroqMessage | DeepSeekMessage | GoogleMessage;

interface StreamOptions {
  modelLabel: string;
  generator: AsyncGenerator<{ token?: string; done?: boolean; tokensIn?: number; tokensOut?: number }>;
}

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Hibás JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages: LLMMessage[] = body.messages;
  const imageData: { base64: string; mediaType: string } | undefined = body.image;
  const optOutTraining = body.optOutTraining === true;
  const requestedSkillId = body.skillId as string | undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Üzenetek listája hiányzik vagy üres" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (imageData && user.tier !== "premium") {
    return new Response(JSON.stringify({ error: "A képértés Premium funkció." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // === Intent detection ===
  const lastUserMsg = messages.filter(m => m.role === "user").at(-1);
  const lastAssistantMsg = messages.filter(m => m.role === "assistant").at(-1);
  const userText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  const intent = detectIntent(userText, lastAssistantMsg?.content as string | undefined);

  // Skill kiválasztás: a frontend által kért skill-t használjuk, ha van,
  // egyébként az intent detection eredményét
  const skillId = requestedSkillId || intent.skillId;

  // Ha low confidence, és a user nem premium, maradunk chat-assistant-nél
  const finalSkillId = (intent.confidence === "low" && user.tier !== "premium")
    ? "chat-assistant"
    : skillId;

  // Skill routing
  const route = skillRouter(finalSkillId, user.tier);

  const systemPrompt: LLMMessage = {
    role: "system",
    content: route.systemPrompt,
  };

  const fullMessages: LLMMessage[] = [systemPrompt, ...messages];

  console.log("[chat] skill=%s provider=%s model=%s messages=%d", finalSkillId, route.provider, route.modelLabel, fullMessages.length);

  // === Tool-assistant skill → tool loop ===
  if (finalSkillId === "tool-assistant") {
    const userText = messages.filter(m => m.role === "user").at(-1)?.content || "";
    const tools = getOpenAITools();

    let finalContent = "";
    let toolCount = 0;
    let modelUsed = route.modelLabel;

    const runToolLoop = async (): Promise<void> => {
      const previousMessages = messages
        .slice(0, -1)
        .filter(m => m.role !== "system")
        .map((m) => ({
          role: m.role as "system" | "user" | "assistant" | "tool",
          content: typeof m.content === "string" ? m.content : "",
        }));

      if (route.provider === "google") {
        const result = await runGoogleToolLoop(route.systemPrompt, userText, previousMessages, tools);
        finalContent = result.finalContent;
        toolCount = result.rounds;
      } else {
        const result = await runGroqToolLoop(route.systemPrompt, userText, previousMessages, tools);
        finalContent = result.finalContent;
        toolCount = result.rounds;
      }
    };

    try {
      await runToolLoop();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[chat] Tool loop failed, trying Ollama fallback:", errMsg);

      try {
        const ollamaMessages: OllamaMessage[] = fullMessages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: typeof m.content === "string" ? m.content : "",
        }));
        const ollamaGen = streamOllamaChat(ollamaMessages);
        for await (const chunk of ollamaGen) {
          if (chunk.token) finalContent += chunk.token;
        }
        modelUsed = "qwen-local-fallback";
      } catch (ollamaErr) {
        const ollamaMsg = ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr);
        return new Response(
          JSON.stringify({ error: `Tool loop és Ollama fallback is elérhetetlen: ${ollamaMsg}` }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // DB save BEFORE stream (async, fast — no Groq title gen)
    if (!optOutTraining) {
      const cid = body.conversationId || crypto.randomUUID();
      saveConversationFast(body, user, messages, finalContent, modelUsed, userText, cid)
        .catch(e => console.error("[chat] DB save error:", e));
      return produceToolStream(finalContent, toolCount, modelUsed, body, cid);
    }

    return produceToolStream(finalContent, toolCount, modelUsed, body, null);
  }

  // Provider kiválasztás a route alapján
  let llmStream: StreamOptions | null = null;
  let lastError: Error | null = null;

  switch (route.provider) {
    case "claude":
      try {
        if (import.meta.env.ANTHROPIC_API_KEY) {
          let claudeMessages = fullMessages;
          // Vision támogatás: ha kép van csatolva, content blockká alakítjuk az utolsó user üzenetet
          if (imageData?.base64) {
            claudeMessages = fullMessages.map((m, i) => {
              if (i === fullMessages.length - 1 && m.role === "user") {
                const blocks: ClaudeContentBlock[] = [
                  { type: "image", source: { type: "base64", media_type: imageData.mediaType, data: imageData.base64 } },
                  { type: "text", text: typeof m.content === "string" ? m.content : "" },
                ];
                return { ...m, content: blocks };
              }
              return m;
            });
          }
          llmStream = {
            modelLabel: route.modelLabel,
            generator: streamClaudeChat(claudeMessages),
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Claude initialization failed:", err);
      }
      break;

    case "deepseek":
      try {
        if (import.meta.env.DEEPSEEK_API_KEY) {
          llmStream = {
            modelLabel: route.modelLabel,
            generator: streamDeepSeekChat(fullMessages),
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("DeepSeek initialization failed:", err);
      }
      break;

    case "google":
      try {
        if (import.meta.env.GOOGLE_API_KEY || import.meta.env.GEMINI_API_KEY) {
          llmStream = {
            modelLabel: route.modelLabel,
            generator: streamGoogleChat(fullMessages as any),
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Gemini initialization failed:", err);
      }
      break;

    case "groq":
      try {
        if (import.meta.env.GROQ_API_KEY) {
          llmStream = {
            modelLabel: route.modelLabel,
            generator: streamGroqChat(fullMessages),
          };
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Groq initialization failed:", err);
      }
      break;

    case "ollama":
      try {
        llmStream = {
          modelLabel: route.modelLabel,
          generator: streamOllamaChat(fullMessages),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Ollama initialization failed:", err);
      }
      break;
  }

  // Fallback: ha a választott provider nem elérhető, próbáljuk a Groq → Ollama láncot
  if (!llmStream) {
    if (route.provider !== "groq" && import.meta.env.GROQ_API_KEY) {
      try {
        llmStream = {
          modelLabel: "groq-fallback",
          generator: streamGroqChat(fullMessages),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Groq fallback failed:", err);
      }
    }
    if (!llmStream) {
      try {
        llmStream = {
          modelLabel: "qwen-local-fallback",
          generator: streamOllamaChat(fullMessages),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Ollama fallback also failed:", err);
      }
    }
  }

  if (!llmStream) {
    return new Response(
      JSON.stringify({
        error: lastError?.message || "Nincs elérhető LLM szolgáltatás",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const { modelLabel, generator } = llmStream;

  // Pre-generate conversationId so we can close the stream immediately after tokens
  const preConversationId: string = body.conversationId || crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantResponse = "";
      let tokensIn = 0;
      let tokensOut = 0;

      try {
        for await (const chunk of generator) {
          if (chunk.token) {
            assistantResponse += chunk.token;
            controller.enqueue(encoder.encode(JSON.stringify({ token: chunk.token }) + "\n"));
          }
          if (chunk.done) {
            tokensIn = chunk.tokensIn || 0;
            tokensOut = chunk.tokensOut || 0;
          }
        }

        // DB save BEFORE closing the stream — Vercel terminates the function
        // after the response closes, so fire-and-forget after close() never runs.
        if (!optOutTraining) {
          await saveStreamConversation(user, messages, assistantResponse, modelLabel, tokensIn, tokensOut, preConversationId)
            .catch(e => console.error("[chat] DB save error:", e));
        }

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              conversationId: preConversationId,
              modelUsed: modelLabel,
              skillUsed: finalSkillId,
              done: true,
            }) + "\n"
          )
        );
        controller.close();
      } catch (streamErr) {
        console.error("Stream error from", modelLabel, ":", streamErr);

        // Groq error → Ollama fallback
        if (route.provider === "groq") {
          try {
            logData("Falling back to Ollama mid-stream...");
            const fallbackGenerator = streamOllamaChat(fullMessages);
            let fallbackResponse = "";

            for await (const chunk of fallbackGenerator) {
              if (chunk.token) {
                fallbackResponse += chunk.token;
                controller.enqueue(encoder.encode(JSON.stringify({ token: chunk.token }) + "\n"));
              }
            }

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  modelUsed: "qwen-local-fallback",
                  done: true,
                }) + "\n"
              )
            );
            controller.close();
          } catch (fallbackErr) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  error: "Mindkét LLM elérhetetlen, próbáld újra később",
                }) + "\n"
              )
            );
            controller.close();
          }
        } else {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                error: streamErr instanceof Error ? streamErr.message : "Ismeretlen hiba",
              }) + "\n"
            )
          );
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
};

// =========================================================================
// Tool-assistant stream helper — pure sync start, no DB in stream
// =========================================================================

/** Fire-and-forget DB save — no Groq, no await in caller */
async function saveConversationFast(
  body: any,
  user: { id: string; email?: string; name?: string; tier?: string },
  rawMessages: LLMMessage[],
  finalContent: string,
  modelLabel: string,
  userText: string,
  conversationId: string,
) {
  try {
    const now = new Date();
    const existing = await db.select().from(conversation).where(eq(conversation.id, conversationId)).limit(1);
    if (existing.length === 0 || existing[0].userId !== user.id) {
      await db.insert(conversation).values({
        id: conversationId,
        userId: user.id,
        title: userText.slice(0, 60).trim() || "Új beszélgetés",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db.update(conversation).set({ updatedAt: now }).where(eq(conversation.id, conversationId));
    }
    const lastUserMessage = rawMessages[rawMessages.length - 1] as any;
    await db.insert(message).values({
      id: crypto.randomUUID(), conversationId, role: "user",
      content: typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "", createdAt: now,
    });
    await db.insert(message).values({
      id: crypto.randomUUID(), conversationId, role: "assistant",
      content: finalContent, modelUsed: modelLabel, tokensIn: 0, tokensOut: 0, costHuf: 0, createdAt: now,
    });
    const today = now.toISOString().slice(0, 10);
    const existingUsage = await db.select().from(usageDaily)
      .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today))).limit(1);
    if (existingUsage.length === 0) {
      await db.insert(usageDaily).values({ userId: user.id, date: today, messageCount: 1 });
    } else {
      await db.update(usageDaily).set({ messageCount: existingUsage[0].messageCount + 1 })
        .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)));
    }
  } catch (e) {
    console.error("[chat] DB save error:", e);
  }
}

async function produceToolStream(
  finalContent: string,
  toolCount: number,
  modelLabel: string,
  body: any,
  conversationId: string | null,
): Promise<Response> {
  const cid = conversationId || body.conversationId || crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      try {
        // Send entire content in one event — prevents mid-stream buffer overflow
        if (finalContent) {
          controller.enqueue(encoder.encode(JSON.stringify({ token: finalContent }) + "\n"));
        }
        controller.enqueue(encoder.encode(JSON.stringify({
          conversationId: cid,
          modelUsed: modelLabel,
          skillUsed: "tool-assistant",
          toolCount: toolCount > 0 ? toolCount : undefined,
          done: true,
        }) + "\n"));
        controller.close();
      } catch (err) {
        console.error("[produceToolStream] Error:", err);
      }
    },
  });

  return new Response(stream, { 
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" }
  });
}

// =========================================================================
// Stream conversation DB save (runs after stream closes)
// =========================================================================

async function saveStreamConversation(
  user: { id: string },
  messages: LLMMessage[],
  assistantResponse: string,
  modelLabel: string,
  tokensIn: number,
  tokensOut: number,
  conversationId: string,
): Promise<void> {
  const now = new Date();

  const existing = await db.select().from(conversation)
    .where(eq(conversation.id, conversationId)).limit(1);

  if (existing.length === 0 || existing[0].userId !== user.id) {
    await db.insert(conversation).values({
      id: conversationId,
      userId: user.id,
      title: await generateTitle(messages),
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db.update(conversation).set({ updatedAt: now })
      .where(eq(conversation.id, conversationId));
  }

  const lastUserMessage = messages[messages.length - 1] as any;
  await db.insert(message).values({
    id: crypto.randomUUID(),
    conversationId,
    role: "user",
    content: typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "",
    createdAt: now,
  });

  await db.insert(message).values({
    id: crypto.randomUUID(),
    conversationId,
    role: "assistant",
    content: assistantResponse,
    modelUsed: modelLabel,
    tokensIn,
    tokensOut,
    costHuf: 0,
    createdAt: now,
  });

  const today = now.toISOString().slice(0, 10);
  const existingUsage = await db.select().from(usageDaily)
    .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today))).limit(1);

  if (existingUsage.length === 0) {
    await db.insert(usageDaily).values({ userId: user.id, date: today, messageCount: 1 });
  } else {
    await db.update(usageDaily)
      .set({ messageCount: existingUsage[0].messageCount + 1 })
      .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)));
  }
}

// =========================================================================
// Cím generálás (Groq, ingyenes)
// =========================================================================

async function generateTitle(messages: LLMMessage[]): Promise<string> {
  const lastMsg = messages.filter(m => m.role === "user").at(-1);
  const text = typeof lastMsg?.content === "string" ? lastMsg.content.slice(0, 200) : "";
  return generateTitleFromText(text);
}

async function generateTitleFromText(text: string): Promise<string> {
  if (!text) return "Új beszélgetés";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Generálj egy rövid (max 5 szavas) címet a felhasználói üzenet alapján. Csak a címet add vissza, semmi mást. Magyarul." },
          { role: "user", content: text.slice(0, 200) },
        ],
        temperature: 0.3,
        max_tokens: 20,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const title = data.choices[0]?.message?.content?.trim();
      if (title && title.length < 60) return title;
    }
  } catch {
    // Fallback
  }
  return text.slice(0, 80) || "Új beszélgetés";
}
