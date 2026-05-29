/**
 * Groq API client — streaming + tool calling támogatás
 *
 * A Llama 3.3 70B Versatile modellt használja Groq-on keresztül,
 * OpenAI-kompatibilis API-n.
 *
 * Két üzemmód:
 *   1. `callGroqWithTools()` — nem streamel, tool_call-okat is visszaad
 *   2. `streamGroqChat()` — streamel a user-nek
 *   3. `simpleGroqChat()` — egyszerű lekérés (címgenerálás, intent)
 */

const GROQ_API_KEY = import.meta.env.GROQ_API_KEY;
const GROQ_MODEL =
  import.meta.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_TIMEOUT = 45_000;

// ---------------------------------------------------------------------------
// Típusok
// ---------------------------------------------------------------------------

export interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

export interface GroqToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface GroqResponse {
  id: string;
  choices: Array<{
    finish_reason: "stop" | "tool_calls" | "length" | null;
    message: {
      role: string;
      content: string | null;
      tool_calls?: GroqToolCall[];
    };
  }>;
  usage?: GroqUsage;
  x_groq?: { usage?: GroqUsage };
}

export interface ToolLoopResult {
  /** Az utolsó (tool-ok nélküli) assistant üzenet tartalma */
  finalContent: string;
  /** Teljes üzenet előzmény (system + user + tool round-ok) */
  messages: GroqMessage[];
  /** Hány tool kört futott */
  rounds: number;
  /** Token használat */
  usage: { promptTokens: number; completionTokens: number };
}

// ---------------------------------------------------------------------------
// 1. Non-streaming hívás tool támogatással (a tool loop-hoz)
// ---------------------------------------------------------------------------

async function groqFetch(
  body: Record<string, unknown>,
  stream: boolean
): Promise<Response> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY nincs beállítva");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({ ...body, stream }),
      signal: controller.signal,
    });

    if (res.status === 429 && !stream) {
      // Rate limit — próbáljuk kiolvasni a várakozási időt
      const retryAfter = parseRetryAfter(res);
      if (retryAfter > 0 && retryAfter <= 30) {
        console.warn(`[groq] Rate limited, waiting ${retryAfter}s...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000 + 500));
        // Újrahívás friss controllerrel
        clearTimeout(timer);
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), GROQ_TIMEOUT);
        try {
          return await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({ ...body, stream }),
            signal: retryController.signal,
          });
        } finally {
          clearTimeout(retryTimer);
        }
      }
    }

    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Kiolvassa a Retry-After fejlécet, vagy a hibaüzenetből a várakozási időt */
function parseRetryAfter(res: Response): number {
  // 1. Retry-After fejléc
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = parseInt(header, 10);
    if (!isNaN(seconds)) return seconds;
  }

  // 2. JSON body-ból (Groq formátum)
  return 15; // default várakozás
}

/**
 * Tool calling loop — nem streamel, multi-round.
 *
 * Flow:
 *   1. Elküldi a user üzenetet + tool definíciókat a Llama 3.3-nak
 *   2. Ha tool_call jön → végrehajtja → visszaküldi az eredményt
 *   3. Addig ismétli, amíg nincs több tool_call (vagy max 5 kör)
 *   4. Visszaadja a végső szöveges választ
 */
export async function runGroqToolLoop(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GroqMessage[],
  tools: Record<string, unknown>[]
): Promise<ToolLoopResult> {
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let rounds = 0;
  const MAX_ROUNDS = 5;

  for (rounds = 0; rounds < MAX_ROUNDS; rounds++) {
    // --- 1. HÍVÁS: elküldjük az üzeneteket + tool definíciókat ---
    const response = await callGroq(messages, tools);

    // Token számlálás
    if (response.usage) {
      totalPromptTokens += response.usage.prompt_tokens;
      totalCompletionTokens += response.usage.completion_tokens;
    }

    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error("Üres válasz a Groq API-tól");
    }

    const assistantMsg = choice.message;

    // --- 2. ELLENŐRZÉS: van-e tool_call a válaszban? ---
    if (choice.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length) {
      // Assistant üzenet hozzáadása (a tool_calls tartalommal)
      messages.push({
        role: "assistant",
        content: assistantMsg.content || null,
        tool_calls: assistantMsg.tool_calls,
      });

      // --- 3. VÉGREHAJTÁS: minden tool_call-t lefuttatunk ---
      for (const tc of assistantMsg.tool_calls) {
        const toolResult = await executeSingleGroqTool(tc);

        // Tool eredmény visszaküldése a modellnek
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResult,
        });
      }

      // Következő kör — a modell megkapja a tool eredményeket
      continue;
    }

    // --- 4. NINCS tool_call → ez a végső szöveges válasz ---
    const finalContent = assistantMsg.content || "";
    messages.push({ role: "assistant", content: finalContent });

    return {
      finalContent,
      messages,
      rounds: rounds + 1,
      usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
    };
  }

  // Max körök elérve — az utolsó assistant üzenetet adjuk vissza
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

/**
 * Egyetlen Groq API hívás tool definíciókkal (nem streamel).
 */
async function callGroq(
  messages: GroqMessage[],
  tools: Record<string, unknown>[]
): Promise<GroqResponse> {
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages: sanitizeGroqMessages(messages),
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2048,
  };

  // Tool definíciók küldése (ha vannak)
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await groqFetch(body, false);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Groq API error (${res.status}): ${res.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ""}`
    );
  }

  return (await res.json()) as GroqResponse;
}

/**
 * Egy tool_call végrehajtása a registry-ből.
 */
import { executeToolCall } from "./tools/index";

async function executeSingleGroqTool(tc: GroqToolCall): Promise<string> {
  try {
    const args = JSON.parse(tc.function.arguments);
    const result = await executeToolCall({
      name: tc.function.name,
      args,
    });

    if (!result.success) {
      console.error(`[groq-tools] ${tc.function.name} failed:`, result.error);
      return `HIBA a(z) ${tc.function.name} tool végrehajtása közben: ${result.error}`;
    }

    return result.output;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[groq-tools] Error executing ${tc.function.name}:`, msg);
    return `HIBA a(z) ${tc.function.name} tool hívásakor: ${msg}`;
  }
}

// ---------------------------------------------------------------------------
// 2. Streaming chat (végső válasz a user-nek)
// ---------------------------------------------------------------------------

export interface GroqStreamEvent {
  token?: string;
  done?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  error?: string;
}

export async function* streamGroqChat(
  messages: GroqMessage[]
): AsyncGenerator<GroqStreamEvent> {
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages: sanitizeGroqMessages(messages),
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096,
  };

  const res = await groqFetch(body, true);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Groq stream error (${res.status}): ${res.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ""}`
    );
  }

  if (!res.body) {
    throw new Error("Groq stream: response body is null");
  }

  const reader = res.body.getReader();
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
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") {
        yield { done: true, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
        return;
      }

      try {
        const parsed = JSON.parse(data);

        // Tool calling a stream közben (ritka, de kezeljük)
        const tc = parsed.choices?.[0]?.delta?.tool_calls;
        if (tc && tc.length > 0) {
          console.warn("[groq] Unexpected tool_calls in stream", tc);
          continue;
        }

        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          yield { token };
        }

        // Groq usage info
        if (parsed.x_groq?.usage) {
          totalTokensIn = parsed.x_groq.usage.prompt_tokens || 0;
          totalTokensOut = parsed.x_groq.usage.completion_tokens || 0;
        }
      } catch {
        // skip invalid JSON
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Egyszerű chat (tool-ok nélkül) — címgeneráláshoz, intent-hez
// ---------------------------------------------------------------------------

export async function simpleGroqChat(
  systemPrompt: string,
  userContent: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  try {
    const body: Record<string, unknown> = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 100,
    };

    const res = await groqFetch(body, false);

    if (!res.ok) return "";

    const data = (await res.json()) as GroqResponse;
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[groq] simpleChat error:", err);
    return "";
  }
}

// ---------------------------------------------------------------------------
// 4. Segéd: üzenetek tisztítása
// ---------------------------------------------------------------------------

function sanitizeGroqMessages(messages: GroqMessage[]): Record<string, unknown>[] {
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
