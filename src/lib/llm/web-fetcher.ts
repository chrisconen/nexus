const URL_REGEX = /https?:\/\/[^\s<>"']+/i;
const FETCH_TIMEOUT = 10_000;
const HTML_PREVIEW_LENGTH = 5000;

interface FetchResult {
  status: string;
  body: string;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "NEXUS-AI/1.0" },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function safeFetch(url: string): Promise<FetchResult> {
  try {
    const response = await fetchWithTimeout(url);
    const body = await response.text().catch(() => "");
    return { status: `${response.status} ${response.statusText}`, body };
  } catch {
    return { status: "Fetch failed (timeout or unreachable)", body: "" };
  }
}

function stripStyleAndScript(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
}

function stripUrlCredentials(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.username = "";
    parsed.password = "";
    return parsed.href;
  } catch {
    return raw;
  }
}

function extractBaseUrl(raw: string): string | null {
  const match = raw.match(URL_REGEX);
  if (!match) return null;
  return stripUrlCredentials(match[0]);
}

function toAbsolute(base: string, path: string): string {
  try {
    const baseUrl = new URL(base);
    return new URL(path, baseUrl.origin).href;
  } catch {
    return "";
  }
}

export async function buildWebpageContext(
  messages: Array<{ role: string; content: string | unknown }>
): Promise<{ role: "system"; content: string } | null> {
  // Only check the last user message
  const lastMsg = messages.filter((m) => m.role === "user").at(-1);
  if (!lastMsg || typeof lastMsg.content !== "string") return null;

  const url = extractBaseUrl(lastMsg.content);
  if (!url) return null;

  // Fetch the webpage
  const page = await safeFetch(url);

  // Try robots.txt and sitemap.xml
  const robots = await safeFetch(toAbsolute(url, "/robots.txt"));
  const sitemap = await safeFetch(toAbsolute(url, "/sitemap.xml"));

  // Strip style/script blokkokat, hogy a tartalom férjen az ablakba, aztán truncate
  const htmlPreview = stripStyleAndScript(page.body).slice(0, HTML_PREVIEW_LENGTH);

  const context = `<webpage_context url="${url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")}">
<status>${escapeXml(page.status)}</status>
<html>${escapeXml(htmlPreview)}</html>
<robots_txt>${escapeXml(robots.status)}</robots_txt>
<sitemap>${escapeXml(sitemap.status)}</sitemap>
</webpage_context>`;

  return {
    role: "system",
    content: `${context}

A fenti tényadatokat látod a felhasználó által említett URL-ről. EZEKBŐL dolgozz — ne találgass.`,
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
