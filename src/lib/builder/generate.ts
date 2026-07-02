import type { SiteData, Section } from "./types";
import { COLOR_PALETTES, createDefaultSection } from "./types";
import { getTemplate } from "./templates";

export interface OnboardingAnswers {
  businessName: string;
  businessType: string;
  services: string;
  contactInfo: string;
  tone: string;
  palette: string;
  templateId?: string;
}

// A weboldal generáló prompt a skills/site-builder.ts-ben él — a skillRouter kezeli.
// Itt csak a válasz feldolgozása marad.

export function parseSiteDataFromAI(raw: string, answers: OnboardingAnswers): SiteData {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  const template = getTemplate(answers.templateId);
  const palette = COLOR_PALETTES[answers.palette] || COLOR_PALETTES[template.palette] || COLOR_PALETTES.emerald;

  // Sablon-váz + AI-tartalom merge:
  // a váz adja a szekciósorrendet és a fallback szöveget, az AI a user-specifikus tartalmat.
  const skeleton = template.buildSections();
  const rawSections: any[] = Array.isArray(parsed.sections) ? parsed.sections : [];
  const consumed = new Set<number>();

  function takeAISection(type: string): any | null {
    for (let i = 0; i < rawSections.length; i++) {
      if (!consumed.has(i) && rawSections[i]?.type === type) {
        consumed.add(i);
        return rawSections[i];
      }
    }
    return null;
  }

  const sections: Section[] = skeleton.map(base => {
    const ai = takeAISection(base.type);
    if (!ai) return base;
    const merged = { ...base, ...ai, id: base.id, type: base.type, enabled: true, style: base.style } as Section;
    // Sablon-ikonok megőrzése, ha az AI nem adott ikont a szolgáltatásokhoz
    if (merged.type === "services" && base.type === "services" && Array.isArray((merged as any).items)) {
      (merged as any).items = (merged as any).items.map((item: any, i: number) => ({
        ...item,
        icon: item.icon || base.items[i % Math.max(base.items.length, 1)]?.icon || "check-circle",
      }));
    }
    return merged;
  });

  // Az AI által küldött, a vázban nem szereplő szekciók — a contact elé fűzzük be
  for (let i = 0; i < rawSections.length; i++) {
    if (consumed.has(i)) continue;
    const raw = rawSections[i];
    if (!raw?.type) continue;
    let base: Section;
    try {
      base = createDefaultSection(raw.type);
    } catch {
      continue;
    }
    if (!base) continue;
    const merged = { ...base, ...raw, id: base.id, enabled: true } as Section;
    const contactIdx = sections.findIndex(s => s.type === "contact");
    if (contactIdx >= 0) sections.splice(contactIdx, 0, merged);
    else sections.push(merged);
  }

  return {
    templateId: template.id,
    globalStyles: {
      colors: palette,
      fonts: { ...template.fonts },
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
