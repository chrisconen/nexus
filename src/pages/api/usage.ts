import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { usageDaily, usageMonthly } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const prerender = false;

const DAILY_CHAT_LIMIT = 50;

export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;
  const today = new Date().toISOString().slice(0, 10);
  const ym = new Date().toISOString().slice(0, 7);

  const [dailyRows, monthlyRows] = await Promise.all([
    db.select().from(usageDaily)
      .where(and(eq(usageDaily.userId, user.id), eq(usageDaily.date, today)))
      .limit(1),
    db.select().from(usageMonthly)
      .where(and(eq(usageMonthly.userId, user.id), eq(usageMonthly.yearMonth, ym)))
      .limit(1),
  ]);

  const dailyMessages = dailyRows[0]?.messageCount ?? 0;
  const siteGenCount = monthlyRows[0]?.siteGenerationCount ?? 0;
  const regenCount = monthlyRows[0]?.sectionRegenCount ?? 0;

  return new Response(JSON.stringify({
    tier: user.tier,
    chat: {
      used: dailyMessages,
      limit: user.tier === "free" ? DAILY_CHAT_LIMIT : null,
      remaining: user.tier === "free" ? Math.max(0, DAILY_CHAT_LIMIT - dailyMessages) : null,
    },
    siteGeneration: {
      used: siteGenCount,
      limit: user.tier === "pro" ? 10 : user.tier === "premium" ? null : 0,
      remaining: user.tier === "pro" ? Math.max(0, 10 - siteGenCount) : user.tier === "premium" ? null : 0,
    },
    sectionRegen: {
      used: regenCount,
      limit: user.tier === "pro" ? 30 : user.tier === "premium" ? null : 0,
      remaining: user.tier === "pro" ? Math.max(0, 30 - regenCount) : user.tier === "premium" ? null : 0,
    },
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
