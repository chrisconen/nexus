import { registerSkill } from "./index";
import { getTemplate, templateSectionPlan } from "@/lib/builder/templates";
import { SERVICE_ICON_OPTIONS } from "@/lib/builder/types";

export interface OnboardingAnswers {
  businessName: string;
  businessType: string;
  services: string;
  contactInfo: string;
  tone: string;
  palette: string;
  templateId?: string;
}

// Szekciónkénti JSON-séma részletek a prompt-hoz
const SECTION_SPECS: Record<string, string> = {
  hero: `{ "type": "hero", "headline": "ütős főcím", "subheadline": "1-2 mondatos alcím", "ctaText": "gomb szövege", "ctaUrl": "#kapcsolat", "layout": "center" }`,
  services: `{ "type": "services", "title": "...", "subtitle": "...", "items": [{ "name": "...", "description": "1-2 mondat", "price": "ár Ft-ban vagy üres", "icon": "ikon az engedélyezett listából" }] }`,
  about: `{ "type": "about", "title": "...", "text": "3-4 mondat, személyes, bizalomépítő", "layout": "text-left" }`,
  gallery: `{ "type": "gallery", "title": "...", "subtitle": "..." }`,
  contact: `{ "type": "contact", "title": "Kapcsolat", "text": "1-2 mondat", "showForm": true }`,
  testimonials: `{ "type": "testimonials", "title": "...", "items": [{ "name": "magyar név", "text": "hiteles, konkrét vélemény", "rating": 5 }] }`,
  team: `{ "type": "team", "title": "...", "members": [{ "name": "...", "role": "...", "bio": "..." }] }`,
  offers: `{ "type": "offers", "title": "...", "items": [{ "title": "...", "description": "...", "discountPrice": "...", "badge": "AKCIÓ" }] }`,
  faq: `{ "type": "faq", "title": "...", "items": [{ "question": "...?", "answer": "..." }] }`,
  cta: `{ "type": "cta", "headline": "...", "text": "...", "buttonText": "...", "buttonUrl": "#kapcsolat" }`,
  stats: `{ "type": "stats", "items": [{ "value": "pl. 500+", "label": "pl. Elégedett ügyfél" }] }`,
  pricing: `{ "type": "pricing", "title": "...", "plans": [{ "name": "...", "price": "...", "period": "...", "features": ["..."], "highlighted": false, "ctaText": "..." }] }`,
  logos: `{ "type": "logos", "title": "..." }`,
};

registerSkill({
  id: "site-builder",
  label: "Weboldal generáló",
  costLevel: "standard",
  complexity: "complex",
  modelOverride: {
    free: "groq:groq-llama-3.3-70b",
    pro: "deepseek:deepseek-v4-flash",
    premium: "claude:claude-sonnet-4-6",
  },
  buildPrompt: (tier: string, context?: { answers: OnboardingAnswers }) => {
    if (!context?.answers) {
      return "HIBA: Hiányzó onboarding adatok.";
    }
    const a = context.answers;
    const template = getTemplate(a.templateId);
    const plan = templateSectionPlan(template);
    const toneMap: Record<string, string> = {
      formal: "hivatalos, professzionális",
      friendly: "barátságos, közvetlen",
      playful: "játékos, laza",
    };

    const sectionSpecs = plan
      .map(type => SECTION_SPECS[type])
      .filter(Boolean)
      .join(",\n    ");

    const iconList = SERVICE_ICON_OPTIONS.filter(o => o.value).map(o => o.value).join(", ");

    return `Te egy magyar kisvállalkozások számára weboldalt generáló AI vagy.
A generálás minősége: ${tier === "premium" ? "kiemelkedő" : tier === "pro" ? "jó" : "alap"}.

A felhasználó a következő adatokat adta meg:

- Vállalkozás neve: ${a.businessName}
- Vállalkozás típusa: ${a.businessType || template.businessTypeLabel}
- Szolgáltatások: ${a.services || "nem adta meg — találj ki iparágba illőt"}
- Elérhetőségek: ${a.contactInfo || "nem adta meg"}
- Hangnem: ${toneMap[a.tone] || "barátságos, közvetlen"}

IPARÁGI SABLON: ${template.label}
${template.aiBrief}

Generálj komplett weboldal tartalmat az alábbi JSON struktúrában. Minden szöveg legyen magyar nyelvű, a vállalkozás típusához illő, és a megadott hangnemben íródjon. A szövegek legyenek konkrétak és hitelesek — kerüld az üres marketingfrázisokat ("prémium minőség", "ügyfeleink elégedettsége az első").

A "sections" tömbben PONTOSAN ebben a sorrendben generáld a szekciókat: ${plan.join(", ")}.

Szolgáltatás-ikonok — CSAK ezekből választhatsz: ${iconList}.

FONTOS: Kizárólag valid JSON-t adj vissza, semmi mást. Ne használj markdown kódblokk jelölést.

{
  "business": {
    "name": "...",
    "tagline": "rövid szlogen",
    "phone": "ha megadták",
    "email": "ha megadták",
    "address": "ha megadták",
    "openingHours": "ha releváns"
  },
  "sections": [
    ${sectionSpecs}
  ]
}

Generálj 3-6 szolgáltatást (a user által felsoroltakból kiindulva), 2-3 statisztikát, 2-3 véleményt magyar nevekkel, 3-4 GYIK kérdést. Ha a user megadott árakat vagy konkrétumokat, azokat pontosan használd fel.`;
  },
});
