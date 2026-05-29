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

// A weboldal generáló prompt a skills/site-builder.ts-ben él — a skillRouter kezeli.
// Itt csak a válasz feldolgozása marad.

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
