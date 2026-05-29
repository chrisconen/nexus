const DDG_API = "https://api.duckduckgo.com/";
const FETCH_TIMEOUT = 8_000;

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(
      `${DDG_API}?q=${encodeURIComponent(query)}&format=json&no_html=1`,
      { signal: controller.signal, headers: { "User-Agent": "NEXUS-AI/1.0" } }
    );
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    const results: SearchResult[] = [];

    // DuckDuckGo API returns AbstractText, AbstractSource, and RelatedTopics
    if (data.AbstractText) {
      results.push({
        title: data.AbstractSource || "DuckDuckGo",
        snippet: data.AbstractText,
        url: data.AbstractURL || "",
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.FirstURL || "",
            snippet: topic.Text,
            url: topic.FirstURL || "",
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}
