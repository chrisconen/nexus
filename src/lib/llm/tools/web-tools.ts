import { registerTool } from "./index";
import type { ToolDefinition } from "./types";

const JINA_TIMEOUT = 10_000;

async function jinaFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JINA_TIMEOUT);
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "markdown",
        "User-Agent": "NEXUS-AI/1.0",
      },
    });
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 8_000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

const webFetchTool: ToolDefinition = {
  name: "web_fetch",
  description: "Egy adott URL tartalmának letöltése Jina AI reader-en keresztül. Tiszta markdown szöveget ad vissza.",
  parameters: {
    url: { type: "string", description: "A letöltendő URL (https://...)", required: true },
  },
  toOpenAITool() {
    return {
      type: "function",
      function: {
        name: "web_fetch",
        description: "Fetch and extract text content from a URL via Jina AI reader",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL to fetch" },
          },
          required: ["url"],
        },
      },
    };
  },
  async execute(args) {
    const url = args.url?.trim();
    if (!url) return "HIBA: nincs URL";
    try { new URL(url); } catch { return "HIBA: érvénytelen URL"; }
    const content = await jinaFetch(url);
    if (!content) return "Az oldal nem elérhető vagy üres.";
    return content;
  },
};

registerTool(webFetchTool);
