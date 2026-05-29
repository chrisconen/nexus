import { registerSkill } from "./index";

export type CopyTask = "slogan" | "social-post" | "email" | "landing-text" | "product-desc";

const TASK_LABELS: Record<CopyTask, string> = {
  slogan: "szlogen/szlogen variációk",
  "social-post": "közösségi média poszt",
  email: "email szöveg",
  "landing-text": "landing oldal szöveg",
  "product-desc": "termékleírás",
};

const SOCIAL_POST_PROMPT = (topic: string, research?: string) => `
Írj egy FACEBOOK posztot a következő témában: "${topic}"

A poszt CÉLJA: megállítani a görgetést, értéket adni, és interakciót kiváltani (komment, like, továbbküldés).

KÖTELEZŐ STRUKTÚRA:

1. NYITÓSOR (1 sor) — figyelemfelkeltő kérdés vagy provokatív állítás. "Tudtad, hogy..." / "Unod már, hogy..." / "Képzeld el..."
   NEM: üdvözlés, bemutatkozás vagy "Szeretnéd, hogy..."

2. PROBLÉMA (2-3 sor) — fogalmazd meg azt a fájdalmat vagy hiányt, amit a célközönség érez. Légy konkrét, ne általános.

3. MEGOLDÁS (2-3 sor) — mutasd be, hogy a téma hogyan oldja meg a problémát. Konkrét előnyöket sorolj, ne funkciókat.

KÖTELEZŐ SZABÁLYOK:

- NE használd ezeket a kifejezéseket: "személyre szabott", "széles körű", "szakember", "szakembernek", "ügyfél", "ügyfeleket", "ügyfelek", "lehetőség", "szolgáltatás", "minőség", "hatékony", "megjeleníteni", "megjelenítsd", "online tér", "online térben", "cserébe", "mindössze", "nem kell hozzá"
- NE ismételj szavakat vagy fordulatokat a poszton belül (pl. "megjeleníteni" kétszer = instant elutasítás)
- NE köszönj, NE mutatkozz be, NE használj általános felvezetést
- Magyar nyelven, tegeződve
- Rövid sorok, mobilon olvasható
- 1-2 releváns hashtag a legvégén
- TÉNYSZERŰ: ha ismersz konkrét adatot a témáról, használd (pl. árak, helyszínek, eredmények)
- A poszt végén TÉNYLEGES call-to-action: "Kommentben válaszolok" / "Írj üzenetet" / "Kattints a linkre"
${research ? `\nFELHASZNÁLHATÓ INFORMÁCIÓK:\n${research}\n\nEzeket ÉPÍTSD BE a posztba konkrétumként.` : ""}

A poszt 5-8 sor legyen. Csak a poszt szövegét add vissza, semmi mást.`;

const DEFAULT_PROMPT = (task: string, topic: string, tone: string, length: string, research?: string) => {
  let researchSection = research ? `\n\nFELHASZNÁLHATÓ INFORMÁCIÓK:\n${research}\nEzeket ÉPÍTSD BE konkrétumként.` : "";
  return `Írj egy ${task}-t a következő témában: "${topic}"

Stílus: ${tone}
Hossz: ${length}
${researchSection}

KÖTELEZŐ:
- Magyar nyelven
- Tömör, konkrét, értékes tartalom
- NE használd: "személyre szabott", "széles körű", "szakember", "szakembernek", "ügyfél", "ügyfeleket", "ügyfelek", "kiváló minőség", "hatékony", "megjeleníteni", "megjelenítsd", "online tér", "online térben", "cserébe", "mindössze", "nem kell hozzá"
- NE ismételj szavakat vagy fordulatokat a szövegen belül
- Ha ismersz konkrét adatot, árat, helyet, eredményt a témáról, használd
- Csak a kért szöveget add vissza`;
};

registerSkill({
  id: "copywriter",
  label: "Copywriting",
  costLevel: "cheap",
  complexity: "simple",
  buildPrompt: (tier: string, context?: { task: CopyTask; topic: string; tone?: string; length?: string; research?: string }) => {
    if (!context) return "HIBA: Hiányzó kontextus.";

    const tone = context.tone || "barátságos, közvetlen";
    const length = context.length || "normál";
    const research = context.research;

    if (context.task === "social-post") {
      return SOCIAL_POST_PROMPT(context.topic, research);
    }

    return DEFAULT_PROMPT(TASK_LABELS[context.task] || "szöveg", context.topic, tone, length, research);
  },
});
