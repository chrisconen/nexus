import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, site } from "@/lib/db";
import { eq } from "drizzle-orm";
import { renderSiteHtml } from "@/lib/builder/render";
import type { SiteData } from "@/lib/builder/types";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const siteId = url.searchParams.get("id");

  if (!siteId) {
    return new Response("Missing id", { status: 400 });
  }

  const result = await db.select().from(site).where(eq(site.id, siteId)).limit(1);
  if (result.length === 0 || result[0].userId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }

  const siteData: SiteData = JSON.parse(result[0].data);
  const html = renderSiteHtml(siteData);
  const fileName = `${siteData.business.name.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ ]/g, "").replace(/ /g, "-").toLowerCase()}.html`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
};
