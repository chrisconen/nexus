import type { SiteData, Section } from "./types";
import { COLOR_PALETTES, createDefaultSection } from "./types";

export interface OnboardingAnswers {
  businessName: string;
  businessType: string;
  services: string;
  contactInfo: string;
  tone: string;
  palette: string;
}

export function buildGeneratePrompt(answers: OnboardingAnswers): string {
  return `Te egy magyar kisvállalkozások számára weboldalt generáló AI vagy.
A felhasználó a következő adatokat adta meg:

- Vállalkozás neve: ${answers.businessName}
- Vállalkozás típusa: ${answers.businessType}
- Szolgáltatások: ${answers.services}
- Elérhetőségek: ${answers.contactInfo}
- Hangnem: ${answers.tone === "formal" ? "hivatalos, professzionális" : answers.tone === "friendly" ? "barátságos, közvetlen" : "játékos, laza"}

Generálj komplett weboldal tartalmat az alábbi JSON struktúrában. Minden szöveg legyen magyar nyelvű és a vállalkozás típusához illő.

FONTOS: Kizárólag valid JSON-t adj vissza, semmi mást. Ne használj markdown kódblokk jelölést.

{
  "business": {
    "name": "...",
    "tagline": "rövid szlogen",
    "type": "...",
    "phone": "ha megadták",
    "email": "ha megadták",
    "address": "ha megadták",
    "openingHours": "ha releváns"
  },
  "sections": [
    {
      "type": "hero",
      "headline": "figyelemfelkeltő főcím",
      "subheadline": "rövid alcím",
      "ctaText": "CTA gomb szöveg",
      "ctaUrl": "#kapcsolat",
      "layout": "center"
    },
    {
      "type": "services",
      "title": "Szolgáltatásaink",
      "items": [
        { "name": "...", "description": "...", "price": "... Ft" }
      ]
    },
    {
      "type": "stats",
      "items": [
        { "value": "...", "label": "..." }
      ]
    },
    {
      "type": "about",
      "title": "Rólunk",
      "text": "2-3 mondat a vállalkozásról",
      "layout": "text-left"
    },
    {
      "type": "testimonials",
      "title": "Ügyfeleink mondták",
      "items": [
        { "name": "...", "text": "...", "rating": 5 }
      ]
    },
    {
      "type": "cta",
      "headline": "...",
      "text": "...",
      "buttonText": "...",
      "buttonUrl": "#kapcsolat"
    },
    {
      "type": "faq",
      "title": "Gyakran ismételt kérdések",
      "items": [
        { "question": "...", "answer": "..." }
      ]
    },
    {
      "type": "contact",
      "title": "Kapcsolat",
      "text": "...",
      "showForm": true,
      "formFields": [
        { "label": "Név", "type": "text", "required": true },
        { "label": "Email", "type": "email", "required": true },
        { "label": "Üzenet", "type": "textarea", "required": true }
      ]
    }
  ]
}

Generálj 3-5 szolgáltatást, 2-3 statisztikát, 2-3 véleményt, 3-4 GYIK kérdést.`;
}

export function parseSiteDataFromAI(raw: string, answers: OnboardingAnswers): SiteData {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  const palette = COLOR_PALETTES[answers.palette] || COLOR_PALETTES.emerald;

  // Szekciók feldolgozása
  const sections: Section[] = [];
  const rawSections: any[] = Array.isArray(parsed.sections) ? parsed.sections : [];

  for (const raw of rawSections) {
    if (!raw.type) continue;
    const base = createDefaultSection(raw.type);
    // Merge AI data into default
    sections.push({ ...base, ...raw, id: base.id, enabled: true });
  }

  // Ha nincs hero, adjunk hozzá
  if (!sections.find(s => s.type === "hero")) {
    const hero = createDefaultSection("hero");
    sections.unshift(hero);
  }

  // Ha nincs contact, adjunk hozzá a végére
  if (!sections.find(s => s.type === "contact")) {
    sections.push(createDefaultSection("contact"));
  }

  return {
    templateId: "starter",
    globalStyles: {
      colors: palette,
      fonts: { heading: "Inter", body: "Inter" },
    },
    meta: {
      title: `${parsed.business?.name || answers.businessName} — ${parsed.business?.tagline || ""}`,
      description: parsed.business?.tagline || answers.businessType,
    },
    business: {
      name: parsed.business?.name || answers.businessName,
      tagline: parsed.business?.tagline || "",
      type: parsed.business?.type || answers.businessType,
      phone: parsed.business?.phone,
      email: parsed.business?.email,
      address: parsed.business?.address,
      openingHours: parsed.business?.openingHours,
    },
    footer: {
      socials: [],
    },
    sections,
  };
}
