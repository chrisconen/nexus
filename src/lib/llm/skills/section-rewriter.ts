import { registerSkill } from "./index";

export type RewriteDirection = "shorter" | "longer" | "formal" | "friendly" | "professional" | "energetic";

const DIRECTION_LABELS: Record<RewriteDirection, string> = {
  shorter: "RÖVIDÍTÉS — a szöveg lényegretörőbb, tömörebb változata",
  longer: "BŐVÍTÉS — a szöveg részletesebb, kifejtősebb változata",
  formal: "HIVATALOS — udvarias, formális, professzionális hangnem",
  friendly: "BARÁTSÁGOS — közvetlen, meleg, személyes hangnem",
  professional: "SZAKSZERŰ — iparági szakkifejezésekkel, hiteles hangnem",
  energetic: "ENERGIKUS — lendületes, lelkesítő, cselekvésre ösztönző hangnem",
};

registerSkill({
  id: "section-rewriter",
  label: "Szekció szöveg újragenerálás",
  costLevel: "cheap",
  complexity: "simple",
  buildPrompt: (tier: string, context?: { sectionType: string; direction: RewriteDirection; currentText: string }) => {
    if (!context) return "HIBA: Hiányzó kontextus.";

    const directionLabel = DIRECTION_LABELS[context.direction] || DIRECTION_LABELS.friendly;

    return `Te egy weboldal szekció szövegeket átíró AI vagy.

Szekció típusa: ${context.sectionType}
Átírás iránya: ${directionLabel}

Eredeti szöveg:
"""
${context.currentText}
"""

A fenti szöveget írd át a megadott irány szerint. 
- Őrizd meg a szakmai tartalmat és a tényeket.
- A szekció típusához illő stílusban írj.
- Csak a szöveges tartalmat add vissza, semmi JSON-t, semmi magyarázatot.
- Magyar nyelven.`;
  },
});
