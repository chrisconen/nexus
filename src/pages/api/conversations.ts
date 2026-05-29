import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, conversation, message } from "@/lib/db";
import { eq, desc, like, and } from "drizzle-orm";

export const prerender = false;

// GET — lista (opcionális ?q= keresés)
export const GET: APIRoute = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const searchQuery = url.searchParams.get("q");

  const conversations = await db
    .select({
      id: conversation.id,
      title: conversation.title,
      pinned: conversation.pinned,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })
    .from(conversation)
    .where(
      searchQuery
        ? and(
            eq(conversation.userId, session.user.id),
            like(conversation.title, `%${searchQuery}%`)
          )
        : eq(conversation.userId, session.user.id)
    )
    .orderBy(desc(conversation.pinned), desc(conversation.updatedAt))
    .limit(50);

  return new Response(JSON.stringify({ conversations }), {
    headers: { "Content-Type": "application/json" },
  });
};

// DELETE — törlés
export const DELETE: APIRoute = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId = url.searchParams.get("id");
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "Hiányzó conversation id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ellenőrzés: tényleg ennek a usernek a beszélgetése?
  const existing = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .limit(1);

  if (existing.length === 0 || existing[0].userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Nem található" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await db.delete(conversation).where(eq(conversation.id, conversationId));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

// PATCH — pin/unpin
export const PATCH: APIRoute = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId = url.searchParams.get("id");
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "Hiányzó conversation id" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const pinned = body.pinned === true;

  const existing = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .limit(1);

  if (existing.length === 0 || existing[0].userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Nem található" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  await db
    .update(conversation)
    .set({ pinned, updatedAt: new Date() })
    .where(eq(conversation.id, conversationId));

  return new Response(JSON.stringify({ success: true, pinned }), {
    headers: { "Content-Type": "application/json" },
  });
};
