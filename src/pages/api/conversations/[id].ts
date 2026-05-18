import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, conversation, message } from "@/lib/db";
import { eq, asc } from "drizzle-orm";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId = params.id;
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "Hiányzó conversation id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ellenőrzés: ezé a user-é?
  const conv = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .limit(1);

  if (conv.length === 0 || conv[0].userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Nem található" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = await db
    .select({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(asc(message.createdAt));

  return new Response(
    JSON.stringify({
      conversation: conv[0],
      messages,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
