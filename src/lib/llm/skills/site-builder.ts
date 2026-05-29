import { registerSkill } from "./index";

export interface OnboardingAnswers {
  businessName: string;
  businessType: string;
  services: string;
  contactInfo: string;
  tone: string;
  palette: string;
}

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
    const toneMap: Record<string, string> = {
      formal: "hivatalos, professzionális",
      friendly: "barátságos, közvetlen",
      playful: "játékos, laza",
    };

    return `Te egy magyar kisvállalkozások számára weboldalt generáló AI vagy.
A generálás minősége: ${tier === "premium" ? "kiemelkedő" : tier === "pro" ? "jó" : "alap"}.

A felhasználó a következő adatokat adta meg:

- Vállalkozás neve: ${a.businessName}
- Vállalkozás típusa: ${a.businessType}
- Szolgáltatások: ${a.services}
- Elérhetőségek: ${a.contactInfo}
- Hangnem: ${toneMap[a.tone] || "barátságos, közvetlen"}

Generálj komplett weboldal tartalmat az alábbi JSON struktúrában. Minden szöveg legyen magyar nyelvű és a vállalkozás típusához illő.

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
    { "type": "hero", "headline": "főcím", "subheadline": "alcím", "ctaText": "gomb", "ctaUrl": "#kapcsolat", "layout": "center" },
    { "type": "services", "title": "Szolgáltatásaink", "items": [{ "name": "...", "description": "...", "price": "..." }] },
    { "type": "stats", "items": [{ "value": "...", "label": "..." }] },
    { "type": "about", "title": "Rólunk", "text": "2-3 mondat", "layout": "text-left" },
    { "type": "testimonials", "title": "Ügyfeleink mondták", "items": [{ "name": "...", "text": "...", "rating": 5 }] },
    { "type": "cta", "headline": "...", "text": "...", "buttonText": "...", "buttonUrl": "#kapcsolat" },
    { "type": "faq", "title": "GYIK", "items": [{ "question": "...", "answer": "..." }] },
    { "type": "contact", "title": "Kapcsolat", "text": "...", "showForm": true,
      "formFields": [{ "label": "Név", "type": "text", "required": true }, { "label": "Email", "type": "email", "required": true }, { "label": "Üzenet", "type": "textarea", "required": true }] }
  ]
}

Generálj 3-5 szolgáltatást, 2-3 statisztikát, 2-3 véleményt, 3-4 GYIK kérdést.`;
  },
});
