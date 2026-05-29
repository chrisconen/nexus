/**
 * web_search tool
 *
 * Webes keresés magyar nyelven a Jina AI Search API-n keresztül.
 * Visszaadja a találatok összegzését markdown formátumban.
 *
 * Használati minta:
 *   User: "Mi az aktuális NAV áfakulcs 2025-ben?"
 *   → tool: web_search({ query: "NAV áfakulcs 2025 Magyarország" })
 */

import { registerTool } from "../index";
import type { ToolDefinition } from "../types";

const JINA_SEARCH_URL = "https://s.jina.ai";
const SEARCH_TIMEOUT = 10_000;

interface JinaSearchResult {
  data?: Array<{
    title?: string;
    url?: string;
    description?: string;
    content?: string;
  }>;
}

async function jinaSearch(query: string, maxResults: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

  try {
    const res = await fetch(`${JINA_SEARCH_URL}/${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: import.meta.env.JINA_API_KEY
          ? `Bearer ${import.meta.env.JINA_API_KEY}`
          : "",
        "X-Retain-Images": "none",
        "X-Result-Limit": String(maxResults),
      },
    });

    if (!res.ok) {
      if (res.status === 402) {
        return "KERESÉSI LIMIT ELÉRVE: A napi ingyenes keresési keret kimerült. Próbáld pontosabban megadni a kérdést, hogy ne kelljen keresni.";
      }
      return "";
    }

    const data = (await res.json()) as JinaSearchResult;

    if (!data.data || data.data.length === 0) {
      return "Nem található releváns találat erre a keresésre.";
    }

    return data.data
      .map(
        (item, i) =>
          `**${i + 1}. ${item.title || "Cím nélkül"}**\n` +
          `  URL: ${item.url || "—"}\n` +
          `  ${item.description || item.content?.slice(0, 500) || "—"}\n`
      )
      .join("\n");
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "Keresési időtúllépés — a szolgáltatás nem válaszolt időben.";
    }
    console.error("[web_search] Error:", err);
    return "HIBA: A keresés nem sikerült. Próbáld újra később.";
  } finally {
    clearTimeout(timer);
  }
}

const webSearchTool: ToolDefinition = {
  name: "web_search",
  description:
    "Keresés a weben magyar nyelven. Bármilyen aktuális információhoz használd: " +
    "hírek, árak, NAV adatok, versenytársak, nyitvatartás, elérhetőségek, " +
    "jogszabályok. Mindig magyar nyelvű találatokat ad vissza.",
  parameters: {
    query: {
      type: "string",
      description: "A keresési kulcsszó magyar nyelven, minél pontosabban (pl. 'NAV áfakulcs 2025', 'Kis Pékség Budapest nyitvatartás')",
      required: true,
    },
    max_results: {
      type: "number",
      description: "Maximum találatok száma 1-10 között (alapértelmezett: 5)",
      required: false,
    },
  },

  toOpenAITool(): Record<string, unknown> {
    return {
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the web for current information in Hungarian. Returns markdown-formatted results.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query in Hungarian",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results (1-10, default: 5)",
            },
          },
          required: ["query"],
        },
      },
    };
  },

  async execute(args: Record<string, string>): Promise<string> {
    const query = args.query?.trim();
    if (!query) {
      return "HIBA: A 'query' paraméter kötelező.";
    }

    const maxResults = Math.min(Math.max(parseInt(args.max_results, 10) || 5, 1), 10);

    const results = await jinaSearch(query, maxResults);
    return results;
  },
};

registerTool(webSearchTool);
