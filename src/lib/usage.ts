/**
 * Usage guards — cost protection
 *
 * Napi chat limit (Free), havi site generálás limit (Pro),
 * havi szekció-regenerálás limit (Pro).
 */

import { db } from "@/lib/db";
import { usageDaily, usageMonthly } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// === LIMITS ===

const DAILY_CHAT_LIMIT_FREE = 50;

const MONTHLY_SITE_GEN: Record<string, number> = {
  free: 0,
  pro: 10,
  premium: Infinity,
};

const MONTHLY_SECTION_REGEN: Record<string, number> = {
  free: 0,
  pro: 30,
  premium: Infinity,
};

// === HELPERS ===

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function getOrCreateMonthly(userId: string) {
  const ym = thisMonth();
  const rows = await db
    .select()
    .from(usageMonthly)
    .where(and(eq(usageMonthly.userId, userId), eq(usageMonthly.yearMonth, ym)))
    .limit(1);

  if (rows.length > 0) return rows[0];

  await db.insert(usageMonthly).values({
    userId,
    yearMonth: ym,
    siteGenerationCount: 0,
    sectionRegenCount: 0,
  });

  return { userId, yearMonth: ym, siteGenerationCount: 0, sectionRegenCount: 0 };
}

// === CHAT ===

export async function checkChatLimit(
  userId: string,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  if (tier !== "free") return { allowed: true, remaining: Infinity };

  const dateStr = today();
  const rows = await db
    .select()
    .from(usageDaily)
    .where(and(eq(usageDaily.userId, userId), eq(usageDaily.date, dateStr)))
    .limit(1);

  const count = rows[0]?.messageCount ?? 0;
  const remaining = Math.max(0, DAILY_CHAT_LIMIT_FREE - count);
  return { allowed: remaining > 0, remaining };
}

// === SITE GENERATION ===

export async function checkSiteGenerationLimit(
  userId: string,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = MONTHLY_SITE_GEN[tier] ?? 0;
  if (limit === 0) return { allowed: false, remaining: 0 };
  if (limit === Infinity) return { allowed: true, remaining: Infinity };

  const row = await getOrCreateMonthly(userId);
  const remaining = Math.max(0, limit - row.siteGenerationCount);
  return { allowed: remaining > 0, remaining };
}

export async function incrementSiteGeneration(userId: string): Promise<void> {
  const ym = thisMonth();
  const row = await getOrCreateMonthly(userId);

  await db
    .update(usageMonthly)
    .set({ siteGenerationCount: row.siteGenerationCount + 1 })
    .where(and(eq(usageMonthly.userId, userId), eq(usageMonthly.yearMonth, ym)));
}

// === SECTION REGENERATION ===

export async function checkSectionRegenLimit(
  userId: string,
  tier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = MONTHLY_SECTION_REGEN[tier] ?? 0;
  if (limit === 0) return { allowed: false, remaining: 0 };
  if (limit === Infinity) return { allowed: true, remaining: Infinity };

  const row = await getOrCreateMonthly(userId);
  const remaining = Math.max(0, limit - row.sectionRegenCount);
  return { allowed: remaining > 0, remaining };
}

export async function incrementSectionRegen(userId: string): Promise<void> {
  const ym = thisMonth();
  const row = await getOrCreateMonthly(userId);

  await db
    .update(usageMonthly)
    .set({ sectionRegenCount: row.sectionRegenCount + 1 })
    .where(and(eq(usageMonthly.userId, userId), eq(usageMonthly.yearMonth, ym)));
}
