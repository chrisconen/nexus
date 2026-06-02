export const SKILL_IDS = {
  CHAT_ASSISTANT: "chat-assistant",
  TOOL_ASSISTANT: "tool-assistant",
  WEB_AUDITOR: "web-auditor",
} as const;

export type SkillId = (typeof SKILL_IDS)[keyof typeof SKILL_IDS];

export type DetectedIntent = {
  skillId: SkillId;
  confidence: "high" | "medium" | "low";
  reason?: string;
};

interface SkillDetector {
  skillId: SkillId;
  detect: (
    userMessage: string,
    lastAssistantMessage?: string
  ) => Omit<DetectedIntent, "skillId"> | null;
}

const DETECTORS: SkillDetector[] = [
  // 1. URL/HTML detektor — mindenek előtt, mert a tool-assistant tudja letölteni az oldalt
  {
    skillId: SKILL_IDS.TOOL_ASSISTANT,
    detect: (userMessage) => {
      const URL_REGEX = /https?:\/\/[^\s<>"']+/i;
      const HTML_REGEX = /<html[\s>]|<body[\s>]|<!DOCTYPE/i;
      if (URL_REGEX.test(userMessage) || HTML_REGEX.test(userMessage)) {
        return { confidence: "high", reason: "URL vagy HTML észlelve → tool-assistant" };
      }
      return null;
    },
  },
  // 2. Web-auditor — csak ha nincs URL, különben tool-assistant kell a letöltéshez
  {
    skillId: SKILL_IDS.WEB_AUDITOR,
    detect: (userMessage) => {
      const text = userMessage.toLowerCase();

      // Weboldal audit / SEO
      if (
        /(audit|seo|ellenőrizz|elemezz|nézd meg|nézz rá).*(weboldal|oldal|site)/i.test(text) ||
        /(megnéznéd|átnéznéd|ellenőriznéd|megnézni).*(oldal|site|weboldal)/i.test(text) ||
        /(.+\s+)(audit|seo)/i.test(text)
      ) {
        return { confidence: "high", reason: "Weboldal audit kérés észlelve" };
      }

      // Konkurencia elemzés
      if (
        /(konkurencia|versenytárs|összehasonlítás|ki a jobb|átnéz).*(weboldal|oldal|site|cég)/i.test(text)
      ) {
        return { confidence: "high", reason: "Konkurencia elemzés észlelve" };
      }

      return null;
    },
  },
  {
    skillId: SKILL_IDS.TOOL_ASSISTANT,
    detect: (userMessage) => {
      const text = userMessage.toLowerCase();

      // Weboldal generálás kérések
      if (
        /(csinálj|készíts|generálj|kellene egy).*(weboldal|honlap|landing page|site)/i.test(text) ||
        /(weboldal|honlap).*(kellene|szeretnék|készíteni|csináltatni)/i.test(text)
      ) {
        return { confidence: "high", reason: "Weboldal generálás kérés észlelve" };
      }

      // NAV / adó / számla kérdések
      if (
        /(áfa|nav|számla|ekae[rr]|adó|kata|kisadózó|nyugta|pénztárgép)/i.test(text) &&
        /(mennyi|milyen|kell|hogyan|szabály|határidő|kötelező)/i.test(text)
      ) {
        return { confidence: "high", reason: "NAV/adó kérdés észlelve" };
      }

      // Árkalkulációs kérések
      if (
        /(mennyit kérjek|árazás|kalkuláció|árképzés|mennyibe kerüljön|óradíj|költségvetés|árajánlat)/i.test(text) &&
        /(szolgáltatás|munka|óra|anyag)/i.test(text)
      ) {
        return { confidence: "high", reason: "Árkalkuláció kérés észlelve" };
      }

      // Webes keresést igénylő kérdések (aktuális infók)
      if (
        /(aktuális|jelenlegi|mai|friss).*(ár|áf[aá]|szabály|határidő|nyitvatartás)/i.test(text) ||
        /(mit.*mond|mi.*szerint|hivatalos|nav\.gov)/i.test(text)
      ) {
        return { confidence: "medium", reason: "Aktuális információ kérése" };
      }

      // Dokumentum elemzés
      if (
        /(dokumentum|szerződés|pdf|fájl).*(elemezz|olvass|nézd át|értékelj)/i.test(text)
      ) {
        return { confidence: "high", reason: "Dokumentum elemzés észlelve" };
      }

      return null;
    },
  },
];

const DEFAULT_INTENT: DetectedIntent = {
  skillId: SKILL_IDS.CHAT_ASSISTANT,
  confidence: "low",
  reason: "Default fallback",
};

export function detectIntent(userMessage: string, lastAssistantMessage?: string): DetectedIntent {
  for (const detector of DETECTORS) {
    const result = detector.detect(userMessage, lastAssistantMessage);
    if (result) {
      return {
        skillId: detector.skillId,
        ...result,
      };
    }
  }

  return DEFAULT_INTENT;
}
