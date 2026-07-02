export interface GoogleMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface ToolLoopResult {
  finalContent: string;
  rounds: number;
  usage: { promptTokens: number; completionTokens: number };
  builderRedirect?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Streaming chat (existing — kevesebb módosítás)
// ---------------------------------------------------------------------------

export async function* streamGoogleChat(
  messages: GoogleMessage[]
): AsyncGenerator<{ token?: string; done?: boolean; tokensIn?: number; tokensOut?: number }> {
  const apiKey = import.meta.env.GOOGLE_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY vagy GEMINI_API_KEY hiányzik");
  const model = import.meta.env.GOOGLE_MODEL || import.meta.env.GEMINI_MODEL || "gemini-2.5-pro";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let tokensIn = 0;
  let tokensOut = 0;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") {
        yield { done: true, tokensIn, tokensOut };
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) yield { token };
        if (parsed.usage) {
          tokensIn = parsed.usage.prompt_tokens || 0;
          tokensOut = parsed.usage.completion_tokens || 0;
        }
      } catch {}
    }
  }
  yield { done: true, tokensIn, tokensOut };
}

// ---------------------------------------------------------------------------
// 2. Non-streaming tool calling (Google OpenAI-kompatibilis endpoint)
// ---------------------------------------------------------------------------

async function getGoogleConfig() {
  const apiKey = import.meta.env.GOOGLE_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Google API key not set");
  const model = import.meta.env.GOOGLE_MODEL || import.meta.env.GEMINI_MODEL || "gemini-2.5-pro";
  return { apiKey, model, baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" };
}

interface GoogleToolResponse {
  id: string;
  choices: Array<{
    finish_reason: "stop" | "tool_calls" | "length" | null;
    message: {
      role: string;
      content: string | null;
      tool_calls?: GoogleMessage["tool_calls"];
    };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

async function callGoogleWithTools(
  messages: GoogleMessage[],
  tools: Record<string, unknown>[]
): Promise<GoogleToolResponse> {
    const { apiKey, model, baseUrl } = await getGoogleConfig();
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const reqBody = JSON.stringify(body);
    console.log(`[google-tools] Calling ${model} with ${tools.length} tools, ${messages.length} messages, body length: ${reqBody.length}`);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: reqBody,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[google-tools] API error ${res.status}: ${err.slice(0, 300)}`);
      throw new Error(`Google API error (${res.status}): ${err.slice(0, 500)}`);
    }

    const data = await res.json();
    console.log(`[google-tools] Response: finish_reason=${data.choices?.[0]?.finish_reason}, has_tool_calls=${!!data.choices?.[0]?.message?.tool_calls}, content_length=${(data.choices?.[0]?.message?.content || "").length}`);
    return data;
}

// ---------------------------------------------------------------------------
// 3. Tool calling loop (több kör, tool_call → execute → újra)
// ---------------------------------------------------------------------------

import { executeToolCall } from "./tools/index";

async function executeGoogleTool(tc: NonNullable<GoogleMessage["tool_calls"]>[number]): Promise<string> {
  try {
    const args = JSON.parse(tc.function.arguments);
    const result = await executeToolCall({ name: tc.function.name, args });
    if (!result.success) {
      return `HIBA a(z) ${tc.function.name} tool végrehajtása közben: ${result.error}`;
    }
    return result.output;
  } catch (err) {
    return `HIBA a(z) ${tc.function.name} tool hívásakor: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function runGoogleToolLoop(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GoogleMessage[],
  tools: Record<string, unknown>[]
): Promise<ToolLoopResult> {
  const messages: GoogleMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let rounds = 0;
  const MAX_ROUNDS = 5;

  for (rounds = 0; rounds < MAX_ROUNDS; rounds++) {
    const response = await callGoogleWithTools(messages, tools);

    if (response.usage) {
      totalPromptTokens += response.usage.prompt_tokens || 0;
      totalCompletionTokens += response.usage.completion_tokens || 0;
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error("Empty response from Google API");
    const assistantMsg = choice.message;

    if (choice.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: assistantMsg.content || null,
        tool_calls: assistantMsg.tool_calls,
      });

      for (const tc of assistantMsg.tool_calls) {
        const toolResult = await executeGoogleTool(tc);
        messages.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
      }
      continue;
    }

    const finalContent = assistantMsg.content || "";
    return {
      finalContent,
      rounds: rounds + 1,
      usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
      builderRedirect: detectGoogleBuilderRedirect(messages),
    };
  }

  const lastMsg = messages[messages.length - 1];
  return {
    finalContent: lastMsg.role === "assistant" && lastMsg.content ? lastMsg.content : "Túl sok lépés — kérlek pontosítsd a kérdésed.",
    rounds,
    usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
    builderRedirect: detectGoogleBuilderRedirect(messages),
  };
}

function detectGoogleBuilderRedirect(messages: GoogleMessage[]): boolean {
  return messages.some((m) => {
    if (m.role !== "tool") return false;
    const content = typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? JSON.stringify(m.content)
        : "";
    return content.includes("BUILDER_REDIRECT");
  });
}