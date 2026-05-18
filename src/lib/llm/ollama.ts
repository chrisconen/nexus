const OLLAMA_BASE_URL = import.meta.env.OLLAMA_BASE_URL || "https://llm.conendigital.hu";
const OLLAMA_MODEL = import.meta.env.OLLAMA_MODEL || "qwen3:30b-a3b-instruct-2507-q4_K_M";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

export async function* streamOllamaChat(
  messages: OllamaMessage[]
): AsyncGenerator<{ token?: string; done?: boolean; tokensIn?: number; tokensOut?: number }> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.8,
        top_k: 20,
        repeat_penalty: 1.05,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Ollama response body is null");
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
      if (!line.trim()) continue;
      try {
        const parsed: OllamaChatResponse = JSON.parse(line);

        if (parsed.message?.content) {
          yield { token: parsed.message.content };
        }

        if (parsed.done) {
          totalTokensIn = parsed.prompt_eval_count || 0;
          totalTokensOut = parsed.eval_count || 0;
          yield { done: true, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
        }
      } catch {
        // skip invalid JSON
      }
    }
  }
}
