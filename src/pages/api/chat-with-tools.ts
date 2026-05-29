/**
 * Chat-with-Tools API endpoint
 *
 * Teljes tool calling flow Groq-on keresztül (Llama 3.3 70B Versatile).
 *
 * A tool calling flow:
 *   1. User üzenet fogadása
 *   2. Intent detection → tool-assistant vagy sima chat
 *   3. Ha tool-assistant:
 *      a. runGroqToolLoop(): modell hívása tool definíciókkal
 *         → tool_call → végrehajtás → tool eredmény → modell újra
 *         → max 5 kör
 *      b. Végső válasz streamelése a user-nek
 *   4. Ha sima chat: streamGroqChat() közvetlenül
 *
 * Példa tool hívások:
 *   "Mennyi az áfa 2025-ben?"             → invoice_info
 *   "Auditáld a https://pelda.hu oldalt"  → webpage_audit
 *   "Generálj weboldalt egy virágkötőnek" → generate_website
 *   "Mennyit kérjek el 20 óra munkáért?"  → calculate_pricing
 *   "Keresd meg a Kis Pékség nyitvatartását" → web_search
 */

import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, message, conversation, usageDaily } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { logData } from "@/lib/log";
import { skillRouter } from "@/lib/llm/skills";
import "@/lib/llm/skills/setup";
import "@/lib/llm/tools/register-all";
import {
  runGroqToolLoop,
  streamGroqChat,
  simpleGroqChat,
  type GroqMessage,
} from "@/lib/llm/groq";
import { getOpenAITools } from "@/lib/llm/tools";
import { detectIntent } from "@/lib/chat/intent-detector";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // -----------------------------------------------------------------------
  // 1. Autentikáció
  // -----------------------------------------------------------------------
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(
      JSON.stringify({ error: "Nem vagy bejelentkezve" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { user } = session;

  // -----------------------------------------------------------------------
  // 2. Body feldolgozás
  // -----------------------------------------------------------------------
  let body: {
    messages?: Array<{ role: string; content: string }>;
    conversationId?: string;
    optOutTraining?: boolean;
    skillId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Hibás JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userMessages = body.messages || [];
  const requestedSkillId = body.skillId;
  const optOutTraining = body.optOutTraining === true;

  if (userMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Üzenetek listája hiányzik vagy üres" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // -----------------------------------------------------------------------
  // 3. Intent detection
  // -----------------------------------------------------------------------
  const lastUserMsg = userMessages.filter((m) => m.role === "user").at(-1);
  const lastAssistantMsg = userMessages.filter((m) => m.role === "assistant").at(-1);
  const userText = lastUserMsg?.content || "";

  const intent = detectIntent(userText, lastAssistantMsg?.content);
  const skillId = requestedSkillId || intent.skillId;

  // Tool-assistant skill-t használjuk, ha az intent felismerte,
  // VAGY ha explicit kérték
  const useTools = skillId === "tool-assistant" || requestedSkillId === "tool-assistant";

  // -----------------------------------------------------------------------
  // 4. TOOL CALLING FLOW (csak tool-assistant skill esetén)
  //
  // Ez a teljes tool calling flow gyakorlati példákkal:
  //
  // PÉLDA 1: "Mennyi az áfa 2025-ben?"
  //   a. groq: POST { messages, tools: [invoice_info, ...] }
  //      → válasz: finish_reason="tool_calls", tool_calls=[{name:"invoice_info", args:{topic:"áfa 2025"}}]
  //   b. execute: invoice_info({ topic: "áfa 2025" })
  //      → "Általános áfakulcs: 27%, kedvezményes: 18% és 5%"
  //   c. groq: POST { messages: [..., assistant(tool_calls), tool(result)] }
  //      → válasz: finish_reason="stop", content="2025-ben az általános áfakulcs 27%..."
  //   d. stream: a content-et streameljük a user-nek
  //
  // PÉLDA 2: "Generálj weboldalt egy virágkötőnek, hívják: Rózsa Virág"
  //   a. groq: POST { messages, tools }
  //      → válasz: tool_calls=[{name:"generate_website", args:{business_name:"Rózsa Virág",...}}]
  //   b. execute: generate_website({...})
  //      → { success: true, siteId: "abc", previewUrl: "/builder/abc" }
  //   c. groq: POST { messages: [..., tool(result)] }
  //      → content: "A weboldal elkészült! Itt tekinthető meg: /builder/abc"
  //   d. stream
  //
  // PÉLDA 3: "Mennyit kérjek el egy weboldal készítésért? 20 óra, 8000 Ft/óra"
  //   a. groq: POST { messages, tools }
  //      → tool_calls=[{name:"calculate_pricing", args:{service_name:"Weboldal", labor_hours:20, hourly_rate:8000}}]
  //   b. execute: calculate_pricing({...})
  //      → nettó: 208.000 Ft, bruttó: 264.160 Ft
  //   c. groq: POST → content: "Az ajánlott ár: nettó 208.000 Ft..."
  //   d. stream
  // -----------------------------------------------------------------------

  let finalContent = "";
  let modelUsed = "groq-llama-3.3-70b-versatile";
  let toolCount = 0;

  if (useTools) {
    // System prompt a skill-ből
    let systemPrompt = "";
    try {
      const route = skillRouter("tool-assistant", user.tier);
      systemPrompt = route.systemPrompt;
      modelUsed = `${route.provider}:${route.modelLabel}`;
    } catch (err) {
      console.error("[chat-with-tools] Skill routing error:", err);
      return new Response(
        JSON.stringify({ error: "A tool-assistant skill nem elérhető" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Korábbi üzenetek átalakítása
    const previousMessages: GroqMessage[] = userMessages
      .slice(0, -1)
      .map((m) => ({
        role: m.role as "system" | "user" | "assistant" | "tool",
        content: m.content,
      }));

    // Tool definíciók a registry-ből
    const tools = getOpenAITools();

    logData(
      `[chat-with-tools] Tool loop start: user=${user.id}, ` +
      `tools=${tools.length}, query="${userText.slice(0, 100)}"`
    );

    try {
      const result = await runGroqToolLoop(
        systemPrompt,
        userText,
        previousMessages,
        tools
      );

      finalContent = result.finalContent;
      toolCount = result.rounds;

      logData(
        `[chat-with-tools] Tool loop done: ${result.rounds} rounds, ` +
        `${result.usage.promptTokens} in / ${result.usage.completionTokens} out`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[chat-with-tools] Tool loop error:", errMsg);

      return new Response(
        JSON.stringify({ error: `A feldolgozás során hiba történt: ${errMsg}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // -----------------------------------------------------------------------
  // 5. Válasz streamelése a user-nek
  // -----------------------------------------------------------------------
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let conversationId = body.conversationId || null;
      const now = new Date();

      try {
        if (useTools && finalContent) {
          // Tool loop után: a kész tartalmat token-ekre bontva streameljük
          const words = finalContent.split(/(?<=\s)/);
          for (const word of words) {
            controller.enqueue(encoder.encode(JSON.stringify({ token: word }) + "\n"));
            await new Promise((r) => setTimeout(r, 5));
          }
        } else {
          // Sima chat — Groq stream
          const groqMessages: GroqMessage[] = userMessages.map((m) => ({
            role: m.role as "system" | "user" | "assistant" | "tool",
            content: m.content,
          }));

          for await (const chunk of streamGroqChat(groqMessages)) {
            if (chunk.token) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ token: chunk.token }) + "\n")
              );
            }
            if (chunk.error) {
              throw new Error(chunk.error);
            }
          }
        }

        // -------------------------------------------------------------------
        // 6. Beszélgetés mentése (ha optOutTraining hamis)
        // -------------------------------------------------------------------
        if (!optOutTraining) {
          if (!conversationId) {
            conversationId = crypto.randomUUID();
            await db.insert(conversation).values({
              id: conversationId,
              userId: user.id,
              title: await generateTitle(userText),
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
                title: await generateTitle(userText),
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

          const lastUserMessage = userMessages[userMessages.length - 1];
          await db.insert(message).values({
            id: crypto.randomUUID(),
            conversationId,
            role: "user",
            content: lastUserMessage.content,
            createdAt: now,
          });

          await db.insert(message).values({
            id: crypto.randomUUID(),
            conversationId,
            role: "assistant",
            content: finalContent || "(streamelt válasz)",
            modelUsed,
            tokensIn: 0,
            tokensOut: 0,
            costHuf: 0,
            createdAt: now,
          });

          const today = now.toISOString().slice(0, 10);
          const existingUsage = await db
            .select()
            .from(usageDaily)
            .where(
              and(
                eq(usageDaily.userId, user.id),
                eq(usageDaily.date, today)
              )
            )
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
              .where(
                and(
                  eq(usageDaily.userId, user.id),
                  eq(usageDaily.date, today)
                )
              );
          }
        }

        // Válasz lezárása
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              conversationId,
              modelUsed,
              skillUsed: useTools ? "tool-assistant" : "chat-assistant",
              toolCount: toolCount > 0 ? toolCount : undefined,
              done: true,
            }) + "\n"
          )
        );

        controller.close();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Ismeretlen hiba";
        console.error("[chat-with-tools] Stream error:", errMsg);

        controller.enqueue(
          encoder.encode(JSON.stringify({ error: errMsg }) + "\n")
        );
        controller.close();
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

/**
 * Cím generálása az első user üzenetből Groq segítségével.
 */
async function generateTitle(text: string): Promise<string> {
  const content = text.slice(0, 200);
  if (!content) return "Új beszélgetés";

  try {
    const title = await simpleGroqChat(
      "Generálj egy rövid (max 5 szavas) címet a felhasználói üzenet alapján. Csak a címet add vissza, semmi mást. Magyarul.",
      content,
      { temperature: 0.3, maxTokens: 20 }
    );
    if (title && title.length < 60 && title.length > 2) return title;
  } catch (err) {
    console.error("[chat-with-tools] Title generation error:", err);
  }

  return content.slice(0, 60) || "Új beszélgetés";
}
