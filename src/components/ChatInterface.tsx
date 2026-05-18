import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  userTier: string;
  userName: string;
}

export default function ChatInterface({ userTier, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Ismeretlen hiba" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Nincs válasz a szervertől");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.token) {
              accumulated += parsed.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                )
              );
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const tierLabel =
    userTier === "free"
      ? "Free tier · Napi 20 üzenet"
      : userTier === "pro"
      ? "Pro tier · Korlátlan"
      : "Premium tier · Korlátlan";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8 min-h-0">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4">
                System // Ready
              </div>
              <h2 className="text-2xl text-zinc-300 mb-2">Üdv, {userName}.</h2>
              <p className="text-sm text-zinc-500">
                Kérdezz bármit. A modell magyar nyelven is válaszol.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  msg.role === "user"
                    ? "max-w-2xl bg-emerald-950/40 border border-emerald-900 rounded-lg px-4 py-3"
                    : "max-w-2xl text-zinc-200 leading-relaxed whitespace-pre-wrap"
                }
              >
                {msg.role === "assistant" && (
                  <div className="text-xs uppercase tracking-wider text-emerald-500 mb-2">
                    NEXUS
                  </div>
                )}
                <div className={msg.role === "user" ? "text-zinc-200 whitespace-pre-wrap" : ""}>
                  {msg.content ||
                    (loading && msg.role === "assistant" ? (
                      <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse" />
                    ) : (
                      ""
                    ))}
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-4 py-3">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-zinc-800 px-6 py-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors resize-none disabled:opacity-50"
              placeholder={
                loading
                  ? "Válasz folyamatban..."
                  : "Írj egy üzenetet... (Enter küld, Shift+Enter új sor)"
              }
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-medium px-5 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              {loading ? "..." : "Küld"}
            </button>
          </div>
          <div className="text-xs text-zinc-600 mt-2 text-center">{tierLabel}</div>
        </form>
      </div>
    </div>
  );
}
