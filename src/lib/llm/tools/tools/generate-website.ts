/**
 * generate_website tool
 *
 * Weboldal generálás magyar kisvállalkozások számára.
 * A tool létrehoz egy site-ot a meglévő builder infrastruktúrán keresztül,
 * és visszaadja a preview URL-t.
 *
 * Használati minta:
 *   User: "Csinálj weboldalt a kis pékségemnek"
 *   → tool: generate_website({ business_name: "Kis Pékség", ... })
 */

import { registerTool } from "../index";
import type { ToolDefinition } from "../types";

const SITE_API_BASE =
  import.meta.env.PUBLIC_APP_URL || "https://nexus.conendigital.hu";

interface GenerateResult {
  success: boolean;
  siteId?: string;
  previewUrl?: string;
  message?: string;
  error?: string;
}

const VALID_TONES = ["formal", "friendly", "playful"];
const VALID_TONES_HU = "formal (hivatalos), friendly (barátságos), playful (játékos)";

const generateWebsiteTool: ToolDefinition = {
  name: "generate_website",
  description:
    "TELJES weboldal generálása magyar kisvállalkozás számára. " +
    "A felhasználó által megadott adatokból (cégnév, szolgáltatások, elérhetőség, " +
    "hangnem, színpaletta) komplett reszponzív weboldalt készít. " +
    "A generálás után visszaadja a preview URL-t.",
  parameters: {
    business_name: {
      type: "string",
      description: "Vállalkozás neve (kötelező)",
      required: true,
    },
    business_type: {
      type: "string",
      description: "Vállalkozás típusa, pl. fodrász, villanyszerelő, étterem, ügyvéd (kötelező)",
      required: true,
    },
    services: {
      type: "string",
      description: "Szolgáltatások felsorolása, vesszővel elválasztva (kötelező)",
      required: true,
    },
    contact_info: {
      type: "string",
      description: "Elérhetőség: telefon, email, cím (kötelező)",
      required: true,
    },
    tone: {
      type: "string",
      description: `Hangnem: ${VALID_TONES_HU}. Alapértelmezett: friendly`,
      required: false,
    },
    palette: {
      type: "string",
      description: "Színpaletta leírása vagy hex kódok (pl. 'kék-fehér', '#2563eb-#ffffff'). Alapértelmezett: modern alap",
      required: false,
    },
    include_sections: {
      type: "string",
      description: "Kívánt szekciók vesszővel: hero, services, about, testimonials, faq, contact, stats, gallery. Alapértelmezett: az összes releváns",
      required: false,
    },
  },

  toOpenAITool(): Record<string, unknown> {
    return {
      type: "function",
      function: {
        name: "generate_website",
        description:
          "Generate a complete website for a Hungarian small business. " +
          "Creates a responsive site with hero, services, about, contact sections. " +
          "Returns a preview URL.",
        parameters: {
          type: "object",
          properties: {
            business_name: { type: "string", description: "Business name" },
            business_type: { type: "string", description: "Business type (e.g., bakery, electrician)" },
            services: { type: "string", description: "Services offered, comma-separated" },
            contact_info: { type: "string", description: "Phone, email, address" },
            tone: { type: "string", description: `Tone: ${VALID_TONES_HU}` },
            palette: { type: "string", description: "Color palette description" },
            include_sections: { type: "string", description: "Sections to include" },
          },
          required: ["business_name", "business_type", "services", "contact_info"],
        },
      },
    };
  },

  async execute(args: Record<string, string>): Promise<string> {
    const businessName = args.business_name?.trim();
    const businessType = args.business_type?.trim();
    const services = args.services?.trim();
    const contactInfo = args.contact_info?.trim();

    if (!businessName) return "HIBA: A 'business_name' (vállalkozás neve) kötelező.";
    if (!businessType) return "HIBA: A 'business_type' (vállalkozás típusa) kötelező.";
    if (!services) return "HIBA: A 'services' (szolgáltatások) kötelező.";
    if (!contactInfo) return "HIBA: A 'contact_info' (elérhetőség) kötelező.";

    const tone = args.tone?.trim().toLowerCase() || "friendly";
    if (!VALID_TONES.includes(tone)) {
      return `HIBA: Érvénytelen hangnem: "${tone}". Elfogadott: ${VALID_TONES_HU}.`;
    }

    try {
      const res = await fetch(`${SITE_API_BASE}/api/site-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessType,
          services: services.split(",").map((s) => s.trim()),
          contactInfo,
          tone,
          palette: args.palette?.trim() || "modern alap",
          sections: args.include_sections
            ? args.include_sections.split(",").map((s) => s.trim())
            : undefined,
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          return JSON.stringify({
            success: false,
            userMessage: "BUILDER_REDIRECT",
            message: "A weboldal generáláshoz nyisd meg a Builder fület az alkalmazásban.",
          });
        }
        const errBody = await res.text().catch(() => "");
        return `HIBA a weboldal generálásakor (${res.status}): ${errBody.slice(0, 300)}`;
      }

      const result = (await res.json()) as GenerateResult;

      if (!result.success) {
        return `HIBA: ${result.error || "Ismeretlen hiba a generálás során"}`;
      }

      const previewUrl = result.previewUrl || `/builder/${result.siteId}`;
      return JSON.stringify({
        success: true,
        siteId: result.siteId,
        previewUrl,
        message: `A weboldal elkészült! Megtekinthető itt: ${previewUrl}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[generate_website] Error:", msg);
      return `HIBA: Nem sikerült kapcsolódni a generáló szolgáltatáshoz. Részletek: ${msg}`;
    }
  },
};

registerTool(generateWebsiteTool);
