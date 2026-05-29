/**
 * invoice_info tool
 *
 * NAV / online számlázás / EKÁER / adó információk lekérdezése.
 *
 * Két forrásból dolgozik:
 *   1. Statikus tudásbázis (tax-rules.json) — gyakran használt infók
 *   2. Web search — aktuális, változó adatok (áfakulcsok, határidők)
 *
 * Használati minta:
 *   User: "2025-ben mennyi az áfa az éttermi szolgáltatásoknak?"
 *   → tool: invoice_info({ topic: "afa éttermi szolgáltatás" })
 */

import { registerTool } from "../index";
import type { ToolDefinition } from "../types";

// ---------------------------------------------------------------------------
// Statikus tudásbázis gyakori témákhoz
// ---------------------------------------------------------------------------

interface TaxRule {
  topic: string;
  keywords: string[];
  content: string;
  lastUpdated: string;
}

// Futásidőben betöltjük, ha van fájl; ha nincs, üres array
let taxRules: TaxRule[] = [];

async function loadTaxRules(): Promise<TaxRule[]> {
  if (taxRules.length > 0) return taxRules;

  try {
    // Dinamikus import — a fájl lehet, hogy nem létezik
    const mod = await import("../data/tax-rules.json");
    taxRules = mod.default || mod;
  } catch {
    // Ha nincs fájl, használjuk a beépített alapadatokat
    taxRules = getBuiltinRules();
  }

  return taxRules;
}

function getBuiltinRules(): TaxRule[] {
  return [
    {
      topic: "Általános áfakulcs",
      keywords: ["afa", "áfa", "áfakulcs", "afa mérték", "általános áfa"],
      content:
        "Magyarországon az általános áfakulcs 27% (2025-ben is). " +
        "Kedvezményes kulcsok: 18% (pl. alapvető élelmiszerek, szálláshely-szolgáltatás), " +
        "5% (pl. gyógyszerek, könyvek, távhő, internet). " +
        "A NAV online számlaadat-szolgáltatásban minden belföldi számlát rögzíteni kell.",
      lastUpdated: "2025-01-01",
    },
    {
      topic: "Számla kötelező adatai",
      keywords: ["számla", "számlázás", "számla adatok", "online számla"],
      content:
        "A számla kötelező adatai: kibocsátó neve, címe, adószáma; " +
        "vevő neve, címe (adószáma áfás számlánál); számla sorszáma; " +
        "kibocsátás dátuma; teljesítés dátuma; fizetési határidő; " +
        "termék/szolgáltatás megnevezése, mennyisége, egységára, nettó értéke; " +
        "áfakulcs, áfa összege; bruttó összeg. " +
        "Online számla: 2025-ben már minden belföldi számlát 24 órán belül fel kell tölteni a NAV-hoz.",
      lastUpdated: "2025-01-01",
    },
    {
      topic: "Nyugtaadási kötelezettség",
      keywords: ["nyugta", "nyugtázás", "pénztárgép", "online pénztárgép"],
      content:
        "Minden készpénzes fizetésnél nyugtát kell adni. " +
        "Online pénztárgép használata kötelező a készpénzes forgalmat bonyolító vállalkozásoknak. " +
        "A nyugtaadás elmulasztása 500.000 Ft-ig terjedő mulasztási bírsággal sújtható.",
      lastUpdated: "2025-01-01",
    },
    {
      topic: "EKÁER",
      keywords: ["ekaer", "ekáer", "fuvar", "közúti szállítás"],
      content:
        "EKÁER (Elektronikus Közúti Áruforgalom Ellenőrző Rendszer) " +
        "kockázatos termékek közúti szállításának bejelentésére szolgál. " +
        "Bejelentési kötelezettség: ha a fuvar tárgya kockázatos termék " +
        "(pl. építőanyag, élelmiszer nagyker, üzemanyag) és nettó 2,5M Ft feletti. " +
        "A bejelentést a fuvar megkezdése előtt kell megtenni az EKÁER rendszerben.",
      lastUpdated: "2025-01-01",
    },
    {
      topic: "KATA",
      keywords: ["kata", "kisadózó", "kata 2025"],
      content:
        "A KATA (kisadózó vállalkozások tételes adója) 2025-ben: " +
        "főállású kisadózó havi 50.000 Ft (vagy választható 75.000 Ft magasabb ellátásokkal). " +
        "Éves bevételi limit: 12 millió Ft. A limit feletti rész 40%-os adóval terhelt. " +
        "KATA csak magánszemélyként folytatott tevékenységre választható.",
      lastUpdated: "2025-01-01",
    },
    {
      topic: "Számviteli határidők",
      keywords: ["határidő", "bevallás", "adóbevallás", "éves beszámoló"],
      content:
        "Főbb határidők: áfa bevallás: tárgyhót követő 20. nap; " +
        "társasági adó (Tao): adóévet követő 5. hó 31.; " +
        "személyi jövedelemadó (SZJA): május 20.; " +
        "éves beszámoló letétbe helyezése: adóévet követő 5. hó 31.; " +
        "iparűzési adó (IPA): évente két részletben, március 15. és szeptember 15.",
      lastUpdated: "2025-01-01",
    },
  ];
}

// ---------------------------------------------------------------------------
// Tool implementáció
// ---------------------------------------------------------------------------

const invoiceInfoTool: ToolDefinition = {
  name: "invoice_info",
  description:
    "NAV és online számlázási információk lekérdezése. " +
    "Visszaadja az aktuális áfakulcsokat, számlázási szabályokat, " +
    "nyugtaadási kötelezettséget, EKÁER információkat, KATA szabályokat. " +
    "Magyar kisvállalkozások számára hasznos adótárgyi információkat szolgáltat.",
  parameters: {
    topic: {
      type: "string",
      description:
        "A kérdéses téma szabad szöveggel, pl. 'áfakulcs 2025', 'nyugtaadás', " +
        "'EKÁER', 'KATA', 'számla határidő', 'számla kötelező adatai'",
      required: false,
    },
  },

  toOpenAITool(): Record<string, unknown> {
    return {
      type: "function",
      function: {
        name: "invoice_info",
        description:
          "Get Hungarian tax and invoice information. Returns current VAT rates, " +
          "invoicing rules, EKÁER requirements, KATA rules. In Hungarian.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "The topic to query (e.g., 'VAT rates 2025', 'invoice requirements')",
            },
          },
        },
      },
    };
  },

  async execute(args: Record<string, string>): Promise<string> {
    const topic = (args.topic || "általános áfa mértékek").trim().toLowerCase();

    // 1. Statikus tudásbázisban keresés
    const rules = await loadTaxRules();

    // Szó-alapú relevancia keresés
    const queryWords = topic
      .replace(/[^a-záéíóöőúüű0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const scored = rules.map((rule) => {
      const score = queryWords.reduce((acc, word) => {
        return acc + (rule.keywords.some((kw) => kw.includes(word) || word.includes(kw)) ? 1 : 0);
      }, 0);
      return { rule, score };
    });

    const bestMatch = scored.sort((a, b) => b.score - a.score)[0];

    if (bestMatch && bestMatch.score > 0) {
      return `[NAV Információ — ${bestMatch.rule.topic}]\n` +
        `(Utolsó frissítés: ${bestMatch.rule.lastUpdated})\n\n` +
        bestMatch.rule.content;
    }

    // 2. Ha nincs találat a tudásbázisban → web search
    return `[NAV Információ]\n\n` +
      `A(z) "${topic}" témában nincs előre betöltött információnk. ` +
      `Kérlek pontosítsd a kérdésed az alábbi témák valamelyikére:\n` +
      rules.map((r) => `- ${r.topic}`).join("\n") +
      `\n\nVAGY használd a web_search tool-t pontos kereséshez (pl. 'web_search query=NAV ${topic}').`;
  },
};

registerTool(invoiceInfoTool);
