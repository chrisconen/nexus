/**
 * webpage_audit tool
 *
 * Weboldal letöltése és SEO auditja Jina AI reader-en keresztül.
 * Visszaadja a HTML struktúrát, meta információkat, heading tree-t,
 * és sebességi indikátorokat.
 *
 * Használati minta:
 *   User: "Nézd meg a konkurensem oldalát"
 *   → tool: webpage_audit({ url: "https://pelda.hu" })
 */

import { registerTool } from "../index";
import type { ToolDefinition } from "../types";

const JINA_READER_URL = "https://r.jina.ai";
const FETCH_TIMEOUT = 15_000;

/**
 * SEO-specifikus információk kinyerése nyers HTML-ből regex segítségével.
 * Ez egy lightweight parser — nem kell hozzá jsdom/cheerio.
 */
function extractSEOMetrics(html: string) {
  const meta: Record<string, string> = {};
  const ogTags: Record<string, string> = {};
  const twitterTags: Record<string, string> = {};
  const links: string[] = [];
  const scripts: string[] = [];
  const headings: string[] = [];
  let jsonLdTypes: string[] = [];
  let hasViewport = false;
  let hasCharset = false;
  let inlineStyleSize = 0;

  // Title tag (nem meta, hanem <title>...</title>)
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : "";

  // Meta tag-ek
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(html)) !== null) {
    const attrs = m[1];
    const nameMatch = attrs.match(/name=["']([^"']+)["']/i);
    const propMatch = attrs.match(/property=["']([^"']+)["']/i);
    const contentMatch = attrs.match(/content=["']([^"']+)["']/i);
    const charsetMatch = attrs.match(/charset=["']([^"']+)["']/i);

    if (charsetMatch) hasCharset = true;
    if (attrs.includes("viewport")) hasViewport = true;

    const key = nameMatch?.[1] || propMatch?.[1] || "";
    const value = contentMatch?.[1] || "";
    if (key && value) {
      meta[key.toLowerCase()] = value;
      if (key.startsWith("og:")) ogTags[key] = value;
      if (key.startsWith("twitter:")) twitterTags[key] = value;
    }
  }

  // Canonical (link rel="canonical" href="...")
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : (meta["canonical"] || "");

  // Robots (meta robots vagy a link rel="canonical"-nál a robots meta)
  const robots = meta["robots"] || "";

  // JSON-LD
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const types: string[] = [];
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => item["@type"] && types.push(item["@type"]));
      } else if (parsed["@graph"]) {
        parsed["@graph"].forEach((item: any) => item["@type"] && types.push(item["@type"]));
      } else if (parsed["@type"]) {
        types.push(parsed["@type"]);
      }
      jsonLdTypes = [...jsonLdTypes, ...types];
    } catch {
      // skip invalid JSON
    }
  }
  jsonLdTypes = [...new Set(jsonLdTypes)];

  // Heading struktúra
  for (let i = 1; i <= 6; i++) {
    const hRegex = new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi");
    while ((m = hRegex.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      if (text) headings.push(`h${i}: ${text.slice(0, 200)}`);
    }
  }

  // CSS/JS extern file-ok
  const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    if (href.endsWith(".css")) links.push(href);
  }

  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = scriptRegex.exec(html)) !== null) {
    scripts.push(m[1]);
  }

  // Inline CSS mérete
  const inlineStyleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  while ((m = inlineStyleRegex.exec(html)) !== null) {
    inlineStyleSize += m[0].length;
  }

  return {
    title: pageTitle || meta["title"] || "",
    description: meta["description"] || "",
    charset: hasCharset,
    viewport: hasViewport,
    ogTags,
    twitterTags,
    jsonLdTypes,
    headings: headings.slice(0, 30),
    cssFiles: links.filter((l) => l.endsWith(".css")),
    jsFiles: scripts,
    inlineCSS_kb: Math.round(inlineStyleSize / 1024 * 10) / 10,
    canonical,
    robots,
    language: meta["language"] || meta["dc.language"] || "",
  };
}

async function fetchPage(url: string): Promise<{
  markdown: string;
  seo: ReturnType<typeof extractSEOMetrics>;
  rawHtml?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    // 1. Jina reader — tiszta markdown tartalom
    const jinaUrl = `${JINA_READER_URL}/${url}`;
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "markdown",
        "User-Agent": "NEXUS-AI-Bot/1.0 (SEO Audit Tool; +https://nexus.conendigital.hu)",
      },
    });

    const markdown = res.ok ? (await res.text()).slice(0, 15_000) : "";

    // 2. SEO meta adatok kinyerése Jina válaszból
    let seo = extractSEOMetrics("");
    let jinaTitle = "";
    let jinaDescription = "";

    // Jina válaszfejlécek: a reader visszaad meta adatokat
    if (res?.headers) {
      jinaTitle = res.headers.get("x-reader-title") || "";
      jinaDescription = res.headers.get("x-reader-description") || "";
    }

    // Ha Jina fejlécben nincs, próbáljuk a markdown első sorából kiolvasni
    if (!jinaTitle && markdown.startsWith("Title:")) {
      const firstLineEnd = markdown.indexOf("\n");
      jinaTitle = markdown.slice(6, firstLineEnd).trim();
    }

    // 3. Nyers HTML letöltése SEO elemzéshez (ha sikerül)
    let rawHtml = "";
    try {
      const htmlRes = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" },
      });
      if (htmlRes.ok) {
        rawHtml = await htmlRes.text();
        seo = extractSEOMetrics(rawHtml);
      }
    } catch {
      // HTML lekérés nem kritikus — Jina-ból is van információnk
    }

    // 4. Ha a nyers HTML lekérés nem sikerült, Jina fejléc adatait használjuk
    if (!rawHtml) {
      seo = {
        title: jinaTitle,
        description: jinaDescription,
        charset: true,
        viewport: true,
        ogTags: {},
        twitterTags: {},
        jsonLdTypes: [],
        headings: [],
        cssFiles: [],
        jsFiles: [],
        inlineCSS_kb: 0,
        canonical: "",
        robots: "",
        language: "hu",
      };
    }

    return { markdown, seo, rawHtml: rawHtml.slice(0, 5000) };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Időtúllépés — az oldal nem válaszolt 15 másodpercen belül.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const webpageAuditTool: ToolDefinition = {
  name: "webpage_audit",
  description:
    "Weboldal letöltése és SEO auditja. Visszaadja a HTML struktúrát, " +
    "meta információkat (title, description, OG, Twitter), heading struktúrát, " +
    "JSON-LD séma típusokat, CSS/JS fájlokat. Magyar weboldalak auditjára optimalizálva.",
  parameters: {
    url: {
      type: "string",
      description: "A weboldal teljes URL-je https:// formában",
      required: true,
    },
  },

  toOpenAITool(): Record<string, unknown> {
    return {
      type: "function",
      function: {
        name: "webpage_audit",
        description:
          "Fetch and audit a webpage for SEO. Returns meta tags, heading structure, JSON-LD schemas, and page content.",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The full URL of the webpage to audit (https://...)",
            },
          },
          required: ["url"],
        },
      },
    };
  },

  async execute(args: Record<string, string>): Promise<string> {
    let url = args.url?.trim();
    if (!url) {
      return "HIBA: A 'url' paraméter kötelező.";
    }

    // URL normalizálás
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      return "HIBA: Érvénytelen URL formátum.";
    }

    try {
      const { markdown, seo, rawHtml } = await fetchPage(url);

      const lines: string[] = [];
      lines.push(`## SEO Audit: ${url}`);
      lines.push("");

      // Meta információk
      lines.push("### Technikai alapok");
      lines.push(`- Title: ${seo.title || "❌ HIÁNYZIK"} (${seo.title.length} karakter)`);
      lines.push(`- Meta description: ${seo.description || "❌ HIÁNYZIK"} (${seo.description.length} karakter)`);
      lines.push(`- Charset: ${seo.charset ? "✅" : "❌"}`);
      lines.push(`- Viewport: ${seo.viewport ? "✅" : "❌"}`);
      lines.push(`- Canonical: ${seo.canonical || "❌"}`);
      lines.push(`- Robots: ${seo.robots || "nincs"}`);
      lines.push(`- Nyelv: ${seo.language || "nem állítható be"}`);

      // JSON-LD
      lines.push("");
      lines.push("### Strukturált adat (JSON-LD)");
      if (seo.jsonLdTypes.length > 0) {
        lines.push(`- Séma típusok: ${seo.jsonLdTypes.join(", ")}`);
      } else {
        lines.push("- ❌ Nincs JSON-LD séma az oldalon");
      }

      // Heading struktúra
      lines.push("");
      lines.push("### Heading struktúra");
      if (seo.headings.length > 0) {
        seo.headings.forEach((h) => lines.push(`- ${h}`));
      } else {
        lines.push("- ❌ Nincs heading elem");
      }

      // Open Graph
      lines.push("");
      lines.push("### Open Graph / Social");
      const ogCount = Object.keys(seo.ogTags).length;
      const twCount = Object.keys(seo.twitterTags).length;
      lines.push(`- OG tag-ek: ${ogCount > 0 ? `✅ (${ogCount} db)` : "❌"}`);
      if (ogCount > 0) {
        Object.entries(seo.ogTags).forEach(([k, v]) => lines.push(`  - ${k}: ${v.slice(0, 100)}`));
      }
      lines.push(`- Twitter tag-ek: ${twCount > 0 ? `✅ (${twCount} db)` : "❌"}`);

      // Sebesség
      lines.push("");
      lines.push("### Sebesség indikátorok");
      lines.push(`- Inline CSS: ${seo.inlineCSS_kb} KB`);
      lines.push(`- CSS fájlok: ${seo.cssFiles.length > 0 ? seo.cssFiles.join(", ") : "inline / nincs"}`);
      lines.push(`- JS fájlok: ${seo.jsFiles.length} db`);

      // Tartalom előnézet
      if (markdown) {
        lines.push("");
        lines.push("### Oldal tartalma (első 500 karakter)");
        lines.push(markdown.slice(0, 500));
      }

      // Nyers HTML (csak ha van és rövid)
      if (rawHtml && rawHtml.length < 2000) {
        lines.push("");
        lines.push("### HTML kivonat");
        lines.push(rawHtml.slice(0, 1000));
      }

      return lines.join("\n");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `HIBA az audit során: ${msg}`;
    }
  },
};

registerTool(webpageAuditTool);
