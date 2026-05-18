import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, message, conversation, usageDaily } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { streamOllamaChat, type OllamaMessage } from "@/lib/llm/ollama";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;

  // 2. Tier-routing
  if (user.tier !== "free") {
    // Pro és Premium tier még nincs implementálva
    return new Response(
      JSON.stringify({
        error: `${user.tier} tier még nem elérhető. Most csak a Free tier (Qwen) működik.`,
      }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Body parse
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Hibás JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages: OllamaMessage[] = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Üzenetek listája hiányzik vagy üres" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. System prompt
  const systemPrompt: OllamaMessage = {
    role: "system",
    content: `Te a NEXUS AI vagy, a Conen Digital saját fejlesztésű AI asszisztense.
Magyar nyelven válaszolj, egyszerűen és tömören.
Nem kell elnézést kérned vagy bocsánatot kérned semmiért.
Ne használj emojikat.`,
  };

  const fullMessages = [systemPrompt, ...messages];

  // 5. Streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantResponse = "";
      let tokensIn = 0;
      let tokensOut = 0;

      try {
        for await (const chunk of streamOllamaChat(fullMessages)) {
          if (chunk.token) {
            assistantResponse += chunk.token;
            controller.enqueue(encoder.encode(JSON.stringify({ token: chunk.token }) + "\n"));
          }
          if (chunk.done) {
            tokensIn = chunk.tokensIn || 0;
            tokensOut = chunk.tokensOut || 0;
          }
        }

        controller.close();

        // 6. Mentés a DB-be (a stream lezárása után)
        try {
          // Konverzáció létrehozása vagy folytatása
          let conversationId = body.conversationId;
          if (!conversationId) {
            conversationId = crypto.randomUUID();
            const now = new Date();
            await db.insert(conversation).values({
              id: conversationId,
              userId: user.id,
              title: messages[messages.length - 1].content.slice(0, 80),
              createdAt: now,
              updatedAt: now,
            });
          }

          // User üzenet mentése
          const lastUserMessage = messages[messages.length - 1];
          await db.insert(message).values({
            id: crypto.randomUUID(),
            conversationId,
            role: "user",
            content: lastUserMessage.content,
            createdAt: new Date(),
          });

          // Assistant válasz mentése
          await db.insert(message).values({
            id: crypto.randomUUID(),
            conversationId,
            role: "assistant",
            content: assistantResponse,
            modelUsed: "qwen-local",
            tokensIn,
            tokensOut,
            costHuf: 0, // lokális modell, nincs API költség
            createdAt: new Date(),
          });

          // Napi usage növelés
          const today = new Date().toISOString().slice(0, 10);
          const existing = await db
            .select()
            .from(usageDaily)
            .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(usageDaily).values({
              userId: user.id,
              date: today,
              messageCount: 1,
            });
          } else {
            await db
              .update(usageDaily)
              .set({ messageCount: existing[0].messageCount + 1 })
              .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)));
          }
        } catch (dbError) {
          console.error("DB write error:", dbError);
          // Nem küldjük tovább a kliensnek, már lezártuk a stream-et
        }
      } catch (err) {
        console.error("Ollama stream error:", err);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Ismeretlen hiba az LLM-mel",
            }) + "\n"
          )
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
