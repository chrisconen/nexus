/**
 * F2 — AI szekció újragenerálás
 *
 * Kap egy szekció JSON-t + irányt (rövidebb/hosszabb/barátságosabb stb.),
 * visszaad egy részlegesen újraírt szekció JSON-t (csak szöveges mezők változnak).
 *
 * Tier routing: Free → 403, Pro → DeepSeek, Premium → Claude
 */

import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { checkSectionRegenLimit, incrementSectionRegen } from "@/lib/usage";
import { skillRouter } from "@/lib/llm/skills";
import "@/lib/llm/skills/setup";

export const prerender = false;

export type RewriteDirection = "shorter" | "longer" | "formal" | "friendly" | "professional" | "energetic";

const DIRECTION_HU: Record<RewriteDirection, string> = {
  shorter: "RÖVIDÍTÉS — lényegretörőbb, tömörebb",
  longer: "BŐVÍTÉS — részletesebb, kifejtősebb",
  formal: "HIVATALOS — udvarias, formális, professzionális hangnem",
  friendly: "BARÁTSÁGOS — közvetlen, meleg, személyes hangnem",
  professional: "SZAKSZERŰ — iparági szakszavak, hiteles hangnem",
  energetic: "ENERGIKUS — lendületes, lelkesítő, cselekvésre ösztönző",
};

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;

  if (user.tier === "free") {
    return new Response(JSON.stringify({ error: "Az AI szekció-újragenerálás Pro funkció." }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const { allowed, remaining } = await checkSectionRegenLimit(user.id, user.tier);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Elérted a havi szekció-regenerálási limitedet (Pro: 30/hó). Premium csomaggal korlátlan." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { section: any; direction: RewriteDirection };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Hibás JSON body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { section, direction } = body;
  if (!section || !direction || !DIRECTION_HU[direction]) {
    return new Response(JSON.stringify({ error: "Hiányzó vagy érvénytelen paraméterek." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const directionLabel = DIRECTION_HU[direction];
  const sectionJson = JSON.stringify(section, null, 2);

  const prompt = `Te egy weboldal szekció szövegeit átíró AI vagy. Kizárólag JSON-t adsz vissza, semmi mást.

Feladat: Írd át a következő weboldal szekció JSON összes szöveges tartalom mezőjét ezzel az iránnyal: ${directionLabel}

Szabályok:
- Csak szöveges tartalmat írj át (title, subtitle, headline, subheadline, text, description, name, role, bio, question, answer, buttonText, ctaText, value, label, badge, features tömbök elemei stb.)
- NE változtasd meg: URL-eket, szín értékeket, szám mezőket (columns, rating), boolean értékeket (enabled, highlighted, showForm, required), layout értékeket, típus mezőket (type, icon, platform), ID-kat
- Őrizd meg a tények pontosságát, csak a hangnemet/hosszt változtasd
- Magyar nyelven írj
- Tartsd meg pontosan ugyanazt a JSON struktúrát

Szekció JSON:
${sectionJson}

Visszaadandó: az ugyanolyan strukturájú, de átírt szövegű szekció JSON. Csak a JSON-t add vissza, semmi magyarázatot.`;

  try {
    const route = skillRouter("section-rewriter", user.tier, {
      sectionType: section.type,
      direction,
      currentText: sectionJson,
    });

    let rawResponse: string;

    switch (route.provider) {
      case "claude":
        rawResponse = await callClaude(prompt);
        break;
      case "deepseek":
        rawResponse = await callDeepSeek(prompt);
        break;
      case "groq":
      default:
        rawResponse = await callGroq(prompt);
        break;
    }

    // Strip markdown code fences if present
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const updatedSection = JSON.parse(cleaned);

    // Preserve non-text fields from original (safety: never let AI change id/type/enabled)
    updatedSection.id = section.id;
    updatedSection.type = section.type;
    updatedSection.enabled = section.enabled;
    if (section.style !== undefined) updatedSection.style = section.style;

    // Track usage (fire-and-forget)
    incrementSectionRegen(user.id).catch(e => console.error("[regenerate-section] usage error:", e));

    return new Response(JSON.stringify({ section: updatedSection, remaining: remaining - 1 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[regenerate-section] error:", err);
    return new Response(JSON.stringify({ error: "Hiba az újragenerálás közben. Próbáld újra." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: import.meta.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: import.meta.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: import.meta.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
