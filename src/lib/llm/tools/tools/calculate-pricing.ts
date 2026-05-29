/**
 * calculate_pricing tool
 *
 * Árkalkulátor magyar kisvállalkozások számára.
 * Segít kiszámolni az árazást: anyagköltség + munkaóra + haszonkulcs + áfa.
 * Visszaadja a nettó és bruttó árat, plusz egy részletes költséglebontást.
 *
 * Használati minta:
 *   User: "Mennyit kérjek el egy weboldal készítésért? 20 óra, óradíj 8000 Ft"
 *   → tool: calculate_pricing({ service_name: "Weboldal készítés", labor_hours: 20, hourly_rate: 8000 })
 */

import { registerTool } from "../index";
import type { ToolDefinition } from "../types";

// ---------------------------------------------------------------------------
// Iparági óradíj átlagok (Ft/óra) — referencia a tool számára
// ---------------------------------------------------------------------------

interface IndustryRate {
  keywords: string[];
  minRate: number;
  maxRate: number;
  label: string;
}

const INDUSTRY_RATES: IndustryRate[] = [
  { keywords: ["web", "webfejlesztés", "programozó", "fejlesztő", "it", "informatika", "szoftver"], minRate: 6000, maxRate: 15000, label: "IT / webfejlesztés" },
  { keywords: ["fodrász", "haj", "szépség"], minRate: 3000, maxRate: 8000, label: "Fodrászat / szépségipar" },
  { keywords: ["fotós", "fotózás", "videó"], minRate: 8000, maxRate: 25000, label: "Fotózás / videózás" },
  { keywords: ["grafikus", "design", "tervező"], minRate: 5000, maxRate: 12000, label: "Grafika / design" },
  { keywords: ["ügyvéd", "jogász", "ügyvivő"], minRate: 15000, maxRate: 40000, label: "Jogászat" },
  { keywords: ["könyvelő", "könyvvitel", "adótanácsadó"], minRate: 6000, maxRate: 15000, label: "Könyvelés / adótanácsadás" },
  { keywords: ["építész", "építőipar", "kivitelező", "felújítás"], minRate: 4000, maxRate: 10000, label: "Építőipar" },
  { keywords: ["szerelő", "villanyszerelő", "vízvezeték", "gázszerelő"], minRate: 5000, maxRate: 12000, label: "Szerelőipar" },
  { keywords: ["tanár", "oktató", "tutor", "edző"], minRate: 4000, maxRate: 12000, label: "Oktatás / edzés" },
  { keywords: ["masszázs", "szépségápolás", "kozmetika"], minRate: 4000, maxRate: 10000, label: "Masszázs / kozmetika" },
  { keywords: ["pék", "cukrász", "élelmiszer"], minRate: 2500, maxRate: 5000, label: "Pék / cukrász" },
  { keywords: ["festő", "mázoló", "lakberendező"], minRate: 4000, maxRate: 9000, label: "Festés / lakberendezés" },
];

function estimateHourlyRate(serviceName: string): { rate: number; label: string } {
  const lower = serviceName.toLowerCase();
  for (const industry of INDUSTRY_RATES) {
    if (industry.keywords.some((kw) => lower.includes(kw))) {
      const avg = Math.round((industry.minRate + industry.maxRate) / 2);
      return { rate: avg, label: industry.label };
    }
  }
  return { rate: 6000, label: "Általános szolgáltatás" };
}

// ---------------------------------------------------------------------------
// Árkalkuláció
// ---------------------------------------------------------------------------

interface PricingInput {
  serviceName: string;
  materialCost: number;
  laborHours: number;
  hourlyRate: number;
  marginPercent: number;
  vatRate: number;
}

interface PricingLineItem {
  label: string;
  amount: number;
}

interface PricingResult {
  lineItems: PricingLineItem[];
  totalNet: number;
  marginAmount: number;
  marginPercentActual: number;
  priceNet: number;
  vatAmount: number;
  priceGross: number;
  suggestedRange?: { min: number; max: number };
  industryRef?: { label: string; rate: number };
}

function calculatePricing(input: PricingInput): PricingResult {
  const {
    serviceName,
    materialCost,
    laborHours,
    hourlyRate,
    marginPercent,
    vatRate,
  } = input;

  const lineItems: PricingLineItem[] = [];
  let totalCost = 0;

  // Anyagköltség
  if (materialCost > 0) {
    lineItems.push({ label: "Anyagköltség", amount: materialCost });
    totalCost += materialCost;
  }

  // Munkaóra költség
  if (laborHours > 0) {
    const laborCost = laborHours * hourlyRate;
    lineItems.push({
      label: `Munkaóra (${laborHours} óra × ${hourlyRate.toLocaleString("hu-HU")} Ft/óra)`,
      amount: laborCost,
    });
    totalCost += laborCost;
  }

  // Haszonkulcs
  const marginAmount = Math.round(totalCost * (marginPercent / 100));

  // Nettó ár
  const priceNet = totalCost + marginAmount;
  const marginPercentActual = totalCost > 0 ? Math.round((marginAmount / totalCost) * 100) : 0;

  // ÁFA
  const vatAmount = Math.round(priceNet * (vatRate / 100));
  const priceGross = priceNet + vatAmount;

  // Iparági referencia
  const industryRef = estimateHourlyRate(serviceName);

  return {
    lineItems,
    totalNet: totalCost,
    marginAmount,
    marginPercentActual,
    priceNet,
    vatAmount,
    priceGross,
    suggestedRange: {
      min: Math.round(priceNet * 0.9),
      max: Math.round(priceNet * 1.3),
    },
    industryRef,
  };
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

const calculatePricingTool: ToolDefinition = {
  name: "calculate_pricing",
  description:
    "Árkalkulátor magyar kisvállalkozások számára. " +
    "Kiszámolja a szolgáltatás nettó és bruttó ajánlott árát " +
    "az anyagköltség, munkaóra, haszonkulcs és áfa alapján. " +
    "Iparági óradíj referencia átlagokat is ad.",
  parameters: {
    service_name: {
      type: "string",
      description: "Szolgáltatás megnevezése (pl. 'weboldal készítés', 'fodrász vágás', 'villanyszerelés')",
      required: true,
    },
    material_cost: {
      type: "number",
      description: "Anyagköltség forintban (ha nincs, 0)",
      required: false,
    },
    labor_hours: {
      type: "number",
      description: "Munkaórák száma",
      required: false,
    },
    hourly_rate: {
      type: "number",
      description: "Óradíj forintban (ha nincs megadva, a tool iparági átlagot javasol)",
      required: false,
    },
    margin_percent: {
      type: "number",
      description: "Kívánt haszonkulcs százalékban (alapértelmezett: 30)",
      required: false,
    },
    vat_rate: {
      type: "number",
      description: "ÁFA kulcs százalékban (alapértelmezett: 27)",
      required: false,
    },
  },

  toOpenAITool(): Record<string, unknown> {
    return {
      type: "function",
      function: {
        name: "calculate_pricing",
        description:
          "Calculate pricing for a service. Returns net and gross prices, " +
          "cost breakdown, and industry hourly rate reference.",
        parameters: {
          type: "object",
          properties: {
            service_name: { type: "string", description: "Service name" },
            material_cost: { type: "number", description: "Material cost in HUF" },
            labor_hours: { type: "number", description: "Hours of work" },
            hourly_rate: { type: "number", description: "Hourly rate in HUF" },
            margin_percent: { type: "number", description: "Profit margin percentage" },
            vat_rate: { type: "number", description: "VAT rate percentage" },
          },
          required: ["service_name"],
        },
      },
    };
  },

  async execute(args: Record<string, string>): Promise<string> {
    const serviceName = args.service_name?.trim();
    if (!serviceName) {
      return "HIBA: A 'service_name' paraméter kötelező.";
    }

    let materialCost = 0;
    if (args.material_cost) {
      materialCost = parseInt(args.material_cost, 10);
      if (isNaN(materialCost) || materialCost < 0) {
        return "HIBA: Érvénytelen 'material_cost' — pozitív számnak kell lennie.";
      }
    }

    let laborHours = 0;
    if (args.labor_hours) {
      laborHours = parseFloat(args.labor_hours);
      if (isNaN(laborHours) || laborHours < 0) {
        return "HIBA: Érvénytelen 'labor_hours' — pozitív számnak kell lennie.";
      }
    }

    let hourlyRate = 0;
    const industryRef = estimateHourlyRate(serviceName);

    if (args.hourly_rate) {
      hourlyRate = parseInt(args.hourly_rate, 10);
      if (isNaN(hourlyRate) || hourlyRate < 0) {
        return "HIBA: Érvénytelen 'hourly_rate' — pozitív számnak kell lennie.";
      }
    } else if (laborHours > 0) {
      // Ha van munkaóra de nincs óradíj, iparági átlagot használunk
      hourlyRate = industryRef.rate;
    }

    const marginPercent = parseInt(args.margin_percent, 10) || 30;
    if (marginPercent < 0 || marginPercent > 500) {
      return "HIBA: A haszonkulcs 0-500% között lehet.";
    }

    const vatRate = parseInt(args.vat_rate, 10) || 27;
    if (vatRate < 0 || vatRate > 50) {
      return "HIBA: Az ÁFA kulcs 0-50% között lehet.";
    }

    if (materialCost === 0 && laborHours === 0) {
      return "HIBA: Adj meg legalább anyagköltséget (material_cost) vagy munkaórát (labor_hours).";
    }

    const result = calculatePricing({
      serviceName, materialCost, laborHours,
      hourlyRate, marginPercent, vatRate,
    });

    // Kimenet formázása
    const lines: string[] = [];
    lines.push(`## Árkalkuláció: ${serviceName}`);
    lines.push("");

    if (result.lineItems.length > 0) {
      lines.push("### Költségek");
      result.lineItems.forEach((item) => {
        lines.push(`- ${item.label}: ${item.amount.toLocaleString("hu-HU")} Ft`);
      });
      lines.push(`- **Összes költség**: ${result.totalNet.toLocaleString("hu-HU")} Ft`);
    }

    lines.push("");
    lines.push("### Árazás");
    lines.push(`- Haszonkulcs: ${result.marginPercentActual}% (${result.marginAmount.toLocaleString("hu-HU")} Ft)`);
    lines.push(`- **Nettó ár**: ${result.priceNet.toLocaleString("hu-HU")} Ft`);
    lines.push(`- ÁFA (${vatRate}%): ${result.vatAmount.toLocaleString("hu-HU")} Ft`);
    lines.push(`- **Bruttó ár**: ${result.priceGross.toLocaleString("hu-HU")} Ft`);

    if (result.suggestedRange) {
      lines.push("");
      lines.push("### Ajánlott ársáv");
      lines.push(`- ${result.suggestedRange.min.toLocaleString("hu-HU")} Ft – ${result.suggestedRange.max.toLocaleString("hu-HU")} Ft`);
    }

    if (industryRef && !args.hourly_rate && laborHours > 0) {
      lines.push("");
      lines.push(`### Iparági referencia`);
      lines.push(`- Kategória: ${industryRef.label}`);
      lines.push(`- Javasolt óradíj: ${industryRef.rate.toLocaleString("hu-HU")} Ft/óra`);
      lines.push(`- Iparági sáv: ${">=".toLowerCase()}${estimateHourlyRate(serviceName).rate} Ft/óra`);
    }

    return lines.join("\n");
  },
};

registerTool(calculatePricingTool);
