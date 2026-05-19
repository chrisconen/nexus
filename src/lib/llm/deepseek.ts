const DEEPSEEK_API_KEY = import.meta.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = import.meta.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamDeepSeekChat(
  messages: DeepSeekMessage[]
): AsyncGenerator<{ token?: string; done?: boolean; tokensIn?: number; tokensOut?: number }> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not set");
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("DeepSeek response body is null");
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
      if (data === "[DONE]") {
        yield { done: true, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
        return;
      }

      try {
        const parsed = JSON.parse(data);

        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          yield { token };
        }

        // DeepSeek usage info az utolsó chunk-ban
        if (parsed.usage) {
          totalTokensIn = parsed.usage.prompt_tokens || 0;
          totalTokensOut = parsed.usage.completion_tokens || 0;
        }
      } catch {
        // skip invalid JSON
      }
    }
  }
}
