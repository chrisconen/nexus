const ANTHROPIC_API_KEY = import.meta.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = import.meta.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

export async function* streamClaudeChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string | ClaudeContentBlock[] }>
): AsyncGenerator<{ token?: string; done?: boolean; tokensIn?: number; tokensOut?: number }> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  // Claude-nál a system prompt KÜLÖN mezőben van, nem a messages tömbben
  const systemMessage = messages.find((m) => m.role === "system");
  const userMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      stream: true,
      system: systemMessage?.content || undefined,
      messages: userMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Claude API error: ${response.status} ${response.statusText} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("Claude response body is null");
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
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);

      try {
        const parsed = JSON.parse(data);

        // Token extraction Claude-style
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          yield { token: parsed.delta.text };
        }

        // Input tokens a message_start event-ben
        if (parsed.type === "message_start" && parsed.message?.usage) {
          totalTokensIn = parsed.message.usage.input_tokens || 0;
        }

        // Output tokens a message_delta event-ben
        if (parsed.type === "message_delta" && parsed.usage) {
          totalTokensOut = parsed.usage.output_tokens || 0;
        }

        // Stream vége
        if (parsed.type === "message_stop") {
          yield { done: true, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
          return;
        }
      } catch {
        // skip invalid JSON
      }
    }
  }
}
