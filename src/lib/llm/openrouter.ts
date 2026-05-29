/**
 * OpenRouter API client with tool/function calling support.
 *
 * A Llama 3.3 70B (és más OpenRouter-en elérhető modellek) meghajtására
 * szolgál OpenAI-kompatibilis API-n keresztül.
 *
 * Két üzemmód:
 *   1. `callWithTools()` — tool loop-hoz, nem streamel, visszaadja a tool_call-okat
 *   2. `streamChat()` — végső válasz streameléséhez a felhasználónak
 */

// ---------------------------------------------------------------------------
// Konfiguráció
// ---------------------------------------------------------------------------
const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  import.meta.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_TIMEOUT = 30_000; // 30s
const MAX_TOOL_ROUNDS = 5;

// ---------------------------------------------------------------------------
// Típusok
// ---------------------------------------------------------------------------

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
}

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterChoice {
  finish_reason: "stop" | "tool_calls" | "length" | null;
  message: OpenRouterMessage;
}

export interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamChunk {
  choices?: Array<{
    delta: {
      content?: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
    finish_reason?: "stop" | "tool_calls" | "length" | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Segédfüggvények
// ---------------------------------------------------------------------------

function buildHeaders(isStream: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    Accept: isStream ? "text/event-stream" : "application/json",
  };
  // OpenRouter igényli
  const appUrl = import.meta.env.PUBLIC_APP_URL || "https://nexus.conendigital.hu";
  headers["HTTP-Referer"] = appUrl;
  headers["X-Title"] = "NEXUS AI";
  return headers;
}

function parseStreamLine(
  line: string
): { type: "chunk" | "done" | "error"; data: OpenRouterStreamChunk | string } | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("data: ")) return null;

  const payload = trimmed.slice(6);
  if (payload === "[DONE]") return { type: "done", data: "[DONE]" };

  try {
    const parsed = JSON.parse(payload) as OpenRouterStreamChunk;
    return { type: "chunk", data: parsed };
  } catch {
    return { type: "error", data: payload };
  }
}

// ---------------------------------------------------------------------------
// 1. Tool calling loop — nem streamel, multi-round
// ---------------------------------------------------------------------------

export interface ToolLoopResult {
  /** Az utolsó (tool-ok nélküli) assistant üzenet tartalma */
  finalContent: string;
  /** Teljes üzenet előzmény (system + user + tool round-ok) */
  messages: OpenRouterMessage[];
  /** Hány tool kört futott */
  rounds: number;
  /** Token használat (összesítve) */
  usage: { promptTokens: number; completionTokens: number };
}

/**
 * Teljes tool calling loop:
 * 1. Elküldi a user üzenetet + tool definíciókat a modellnek
 * 2. Ha tool_call jön → végrehajtja → visszaküldi az eredményt
 * 3. Addig ismétli, amíg nincs több tool_call (vagy max kör)
 * 4. Visszaadja a végső szöveges választ
 */
export async function runToolLoop(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: OpenRouterMessage[],
  tools: Record<string, unknown>[]
): Promise<ToolLoopResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY nincs beállítva");
  }

  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let rounds = 0;

  for (rounds = 0; rounds < MAX_TOOL_ROUNDS; rounds++) {
    const response = await callOpenRouter(messages, tools);

    // Token számlálás
    if (response.usage) {
      totalPromptTokens += response.usage.prompt_tokens;
      totalCompletionTokens += response.usage.completion_tokens;
    }

    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error("Üres válasz az OpenRouter-tól");
    }

    const assistantMsg = choice.message;

    // Ha van tool_call → végrehajtjuk
    if (choice.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length) {
      // Assistant üzenet (tool_calls-szal) hozzáadása a történethez
      messages.push({
        role: "assistant",
        content: assistantMsg.content || null,
        tool_calls: assistantMsg.tool_calls,
      });

      // Minden tool_call végrehajtása
      for (const tc of assistantMsg.tool_calls) {
        const toolResult = await executeSingleToolCall(tc);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResult,
        });
      }

      continue; // következő kör — a modell megkapja a tool eredményeket
    }

    // Nincs tool_call — ez a végső szöveges válasz
    const finalContent = assistantMsg.content || "";
    messages.push({ role: "assistant", content: finalContent });

    return {
      finalContent,
      messages,
      rounds: rounds + 1,
      usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
    };
  }

  // Ha elértük a max köröket, az utolsó üzenet tartalmát adjuk vissza
  const lastMsg = messages[messages.length - 1];
  return {
    finalContent:
      lastMsg.role === "assistant" && lastMsg.content
        ? lastMsg.content
        : "A kérés feldolgozása túl sok lépést igényelt. Kérlek pontosítsd a kérdésed.",
    messages,
    rounds,
    usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
  };
}

// ---------------------------------------------------------------------------
// 2. Egyetlen OpenRouter API hívás (nem streamel, tool-okkal)
// ---------------------------------------------------------------------------

async function callOpenRouter(
  messages: OpenRouterMessage[],
  tools: Record<string, unknown>[]
): Promise<OpenRouterResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT);

  try {
    const body: Record<string, unknown> = {
      model: OPENROUTER_MODEL,
      messages: sanitizeMessages(messages),
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 4096,
    };

    // Tool definíciók küldése (ha vannak)
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(false),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `OpenRouter API error (${res.status}): ${res.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ""}`
      );
    }

    return (await res.json()) as OpenRouterResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("OpenRouter timeout — a kérés 30 másodperc alatt nem ért véget");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 3. Tool végrehajtás
// ---------------------------------------------------------------------------

/**
 * Egyetlen tool_call végrehajtása.
 * Meghívja a regisztrált tool-t az index.ts-ből.
 */
import { executeToolCall } from "./tools/index";

async function executeSingleToolCall(tc: OpenRouterToolCall): Promise<string> {
  try {
    const args = JSON.parse(tc.function.arguments);
    const result = await executeToolCall({
      name: tc.function.name,
      args,
    });

    if (!result.success) {
      console.error(`[tool] ${tc.function.name} failed:`, result.error);
      return `HIBA a(z) ${tc.function.name} tool végrehajtása közben: ${result.error}`;
    }

    return result.output;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tool] Error executing ${tc.function.name}:`, msg);
    return `HIBA a(z) ${tc.function.name} tool hívásakor: ${msg}`;
  }
}

// ---------------------------------------------------------------------------
// 4. Streaming chat (végső válasz a user-nek)
// ---------------------------------------------------------------------------

export interface StreamEvent {
  token?: string;
  done?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  error?: string;
}

export async function* streamOpenRouterChat(
  messages: OpenRouterMessage[]
): AsyncGenerator<StreamEvent> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const body: Record<string, unknown> = {
    model: OPENROUTER_MODEL,
    messages: sanitizeMessages(messages),
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096,
  };

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter stream error (${response.status}): ${response.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ""}`
    );
  }

  if (!response.body) {
    throw new Error("OpenRouter stream: response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const parsed = parseStreamLine(line);
      if (!parsed) continue;

      if (parsed.type === "done") {
        yield { done: true, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
        return;
      }

      if (parsed.type === "chunk") {
        const chunk = parsed.data as OpenRouterStreamChunk;

        // Token kinyerése
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          yield { token: content };
        }

        // Token számlálás az utolsó chunk-ból
        if (chunk.usage) {
          totalTokensIn = chunk.usage.prompt_tokens || 0;
          totalTokensOut = chunk.usage.completion_tokens || 0;
        }

        // Ha tool_calls a stream közben (ritka, de kezelendő)
        const tc = chunk.choices?.[0]?.delta?.tool_calls;
        if (tc && tc.length > 0) {
          console.warn("[openrouter] Unexpected tool_calls in stream mode", tc);
        }
      }
    }
  }

  // Ha nem kaptunk [DONE] jelet
  yield { done: true, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
}

// ---------------------------------------------------------------------------
// 5. Segéd: üzenetek tisztítása (OpenRouter szigorúbb a tool üzenetekre)
// ---------------------------------------------------------------------------

function sanitizeMessages(messages: OpenRouterMessage[]): Record<string, unknown>[] {
  return messages.map((msg) => {
    const base: Record<string, unknown> = { role: msg.role };

    if (msg.role === "tool") {
      // Tool üzenet: tartalom + tool_call_id
      base.content = msg.content || "";
      base.tool_call_id = msg.tool_call_id;
    } else if (msg.role === "assistant" && msg.tool_calls) {
      // Assistant tool_calls üzenet: content lehet null
      base.content = msg.content || null;
      base.tool_calls = msg.tool_calls;
    } else {
      base.content = msg.content || "";
    }

    return base;
  });
}

// ---------------------------------------------------------------------------
// 6. Egyszerű chat (tool-ok nélkül) — meglévő egységesítés
// ---------------------------------------------------------------------------

/**
 * Egyszerű, nem-streamelő chat hívás (pl. címgeneráláshoz, intent detection-höz)
 */
export async function simpleChat(
  systemPrompt: string,
  userContent: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!OPENROUTER_API_KEY) return "";

  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(false),
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 100,
      }),
    });

    if (!res.ok) return "";

    const data = (await res.json()) as OpenRouterResponse;
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[openrouter] simpleChat error:", err);
    return "";
  }
}
