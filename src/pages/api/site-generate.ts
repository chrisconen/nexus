import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { parseSiteDataFromAI, type OnboardingAnswers } from "@/lib/builder/generate";
import { skillRouter } from "@/lib/llm/skills";
import "@/lib/llm/skills/setup";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;
  const answers: OnboardingAnswers = await request.json();

  if (!answers.businessName || !answers.businessType) {
    return new Response(JSON.stringify({ error: "Vállalkozás neve és típusa kötelező" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Skill routing — a promptot és a modellt a site-builder skill határozza meg
    const route = skillRouter("site-builder", user.tier, { answers });

    let aiResponse: string;

    switch (route.provider) {
      case "claude":
        if (!import.meta.env.ANTHROPIC_API_KEY) throw new Error("Claude API key not configured");
        aiResponse = await callClaude(route.systemPrompt);
        break;
      case "deepseek":
        if (!import.meta.env.DEEPSEEK_API_KEY) throw new Error("DeepSeek API key not configured");
        aiResponse = await callDeepSeek(route.systemPrompt);
        break;
      case "groq":
        if (!import.meta.env.GROQ_API_KEY) throw new Error("Groq API key not configured");
        aiResponse = await callGroq(route.systemPrompt);
        break;
      default:
        throw new Error(`Nincs elérhető AI szolgáltatás a site-builder skillhez`);
    }

    const siteData = parseSiteDataFromAI(aiResponse, answers);

    return new Response(JSON.stringify({ data: siteData }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Site generation error:", err);
    return new Response(
      JSON.stringify({ error: "Hiba a weboldal generálása közben. Próbáld újra." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
      max_tokens: 4096,
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
      max_tokens: 4096,
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
      model: import.meta.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
