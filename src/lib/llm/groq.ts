const GROQ_API_KEY = import.meta.env.GROQ_API_KEY;
const GROQ_MODEL = import.meta.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamGroqChat(
  messages: GroqMessage[]
): AsyncGenerator<{ token?: string; done?: boolean; tokensIn?: number; tokensOut?: number }> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Groq API error: ${response.status} ${response.statusText} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("Groq response body is null");
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
