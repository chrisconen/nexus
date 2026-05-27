import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, site } from "@/lib/db";
import { eq } from "drizzle-orm";
import { renderSiteHtml } from "@/lib/builder/render";
import type { SiteData } from "@/lib/builder/types";

export const prerender = false;

// GET — felhasználó site-jának lekérése
export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sites = await db
    .select()
    .from(site)
    .where(eq(site.userId, session.user.id));

  const result = sites.map((s) => ({
    id: s.id,
    templateId: s.templateId,
    status: s.status,
    subdomain: s.subdomain,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    data: JSON.parse(s.data) as SiteData,
  }));

  return new Response(JSON.stringify({ sites: result }), {
    headers: { "Content-Type": "application/json" },
  });
};

// POST — új site létrehozása
export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const siteData: SiteData = body.data;

  if (!siteData) {
    return new Response(JSON.stringify({ error: "Hiányzó site adat" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(site).values({
    id,
    userId: session.user.id,
    templateId: siteData.templateId || "starter",
    data: JSON.stringify(siteData),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

// PUT — site adatainak frissítése
export const PUT: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { id: siteId, data: siteData } = body as { id: string; data: SiteData };

  if (!siteId || !siteData) {
    return new Response(JSON.stringify({ error: "Hiányzó paraméterek" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ellenőrizzük, hogy a site a felhasználóé
  const existing = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  if (existing.length === 0 || existing[0].userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Site nem található" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await db
    .update(site)
    .set({ data: JSON.stringify(siteData), updatedAt: new Date() })
    .where(eq(site.id, siteId));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
