import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, message, conversation, usageDaily } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { streamOllamaChat, type OllamaMessage } from "@/lib/llm/ollama";
import { streamGroqChat, type GroqMessage } from "@/lib/llm/groq";
import { streamDeepSeekChat, type DeepSeekMessage } from "@/lib/llm/deepseek";
import { streamClaudeChat, type ClaudeContentBlock } from "@/lib/llm/claude";
import { logData } from "@/lib/log";

export const prerender = false;

type LLMMessage = OllamaMessage | GroqMessage | DeepSeekMessage;

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

  const systemPrompt: LLMMessage = {
    role: "system",
    content: `Te a NEXUS AI vagy, a Conen Digital saját fejlesztésű AI asszisztense.
Magyar nyelven válaszolj, egyszerűen és tömören.
Nem kell elnézést kérned vagy bocsánatot kérned semmiért.
Ne használj emojikat.`,
  };

  const fullMessages = [systemPrompt, ...messages];

  // Tier-routing
  let llmStream: StreamOptions | null = null;
  let lastError: Error | null = null;

  if (user.tier === "premium") {
    // PREMIUM tier: Claude Sonnet 4.6 (+ vision támogatás)
    try {
      if (import.meta.env.ANTHROPIC_API_KEY) {
        // Ha kép van csatolva, az utolsó user üzenetet vision content blockká alakítjuk
        let claudeMessages = fullMessages;
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
          modelLabel: "claude-sonnet-4-6",
          generator: streamClaudeChat(claudeMessages),
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error("Claude initialization failed:", err);
    }
  } else if (user.tier === "pro") {
    // PRO tier: DeepSeek V4 Flash
    try {
      if (import.meta.env.DEEPSEEK_API_KEY) {
        llmStream = {
          modelLabel: "deepseek-v4-flash",
          generator: streamDeepSeekChat(fullMessages),
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error("DeepSeek initialization failed:", err);
    }
  } else {
    // FREE tier: Groq elsődleges, Ollama fallback
    try {
      if (import.meta.env.GROQ_API_KEY) {
        llmStream = {
          modelLabel: "groq-llama-3.3-70b",
          generator: streamGroqChat(fullMessages),
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error("Groq initialization failed:", err);
    }

    // Ollama fallback Free tier-en
    if (!llmStream) {
      try {
        llmStream = {
          modelLabel: "qwen-local",
          generator: streamOllamaChat(fullMessages),
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error("Ollama initialization also failed:", err);
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

        let conversationId = body.conversationId;
        const now = new Date();

        if (!optOutTraining) {
          if (!conversationId) {
            conversationId = crypto.randomUUID();
            await db.insert(conversation).values({
              id: conversationId,
              userId: user.id,
              title: (messages[messages.length - 1] as any).content.slice(0, 80),
              createdAt: now,
              updatedAt: now,
            });
          } else {
            const existing = await db
              .select()
              .from(conversation)
              .where(eq(conversation.id, conversationId))
              .limit(1);
            if (existing.length === 0 || existing[0].userId !== user.id) {
              conversationId = crypto.randomUUID();
              await db.insert(conversation).values({
                id: conversationId,
                userId: user.id,
                title: (messages[messages.length - 1] as any).content.slice(0, 80),
                createdAt: now,
                updatedAt: now,
              });
            } else {
              await db
                .update(conversation)
                .set({ updatedAt: now })
                .where(eq(conversation.id, conversationId));
            }
          }
        }

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              conversationId,
              modelUsed: modelLabel,
              done: true,
            }) + "\n"
          )
        );

        controller.close();

        if (!optOutTraining) {
          try {
            const lastUserMessage = messages[messages.length - 1] as any;
            await db.insert(message).values({
              id: crypto.randomUUID(),
              conversationId,
              role: "user",
              content: lastUserMessage.content,
              createdAt: new Date(),
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
              createdAt: new Date(),
            });

            const today = new Date().toISOString().slice(0, 10);
            const existingUsage = await db
              .select()
              .from(usageDaily)
              .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)))
              .limit(1);

            if (existingUsage.length === 0) {
              await db.insert(usageDaily).values({
                userId: user.id,
                date: today,
                messageCount: 1,
              });
            } else {
              await db
                .update(usageDaily)
                .set({ messageCount: existingUsage[0].messageCount + 1 })
                .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)));
            }
          } catch (dbError) {
            console.error("DB write error:", dbError);
          }
        }
      } catch (streamErr) {
        console.error("Stream error from", modelLabel, ":", streamErr);

        // Groq error → Ollama fallback Free tier-en
        if (modelLabel === "groq-llama-3.3-70b" && user.tier === "free") {
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
