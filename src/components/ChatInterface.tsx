import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optOutTraining, setOptOutTraining] = useState(false);

// Mobil/desktop alapállapot
useEffect(() => {
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  setSidebarOpen(isDesktop);
}, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Konverzációk lista betöltése
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
  }, []);

  // Egy konverzáció üzeneteinek betöltése
  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setCurrentConversationId(id);
        setError(null);
      }
    } catch (e) {
      console.error("Failed to load conversation:", e);
    }
  };

  // Új beszélgetés
  const newConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
    setInput("");
  };

  // Konverzáció törlése
  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Biztosan törlöd ezt a beszélgetést?")) return;

    try {
      const res = await fetch(`/api/conversations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          newConversation();
        }
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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
          conversationId: currentConversationId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          optOutTraining,
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
      let returnedConversationId: string | null = null;

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
            if (parsed.conversationId) {
              returnedConversationId = parsed.conversationId;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseErr) {
            // skip
          }
        }
      }

      if (returnedConversationId) {
        setCurrentConversationId(returnedConversationId);
        // Frissítjük a konverzációk listáját (új beszélgetés esetén legalábbis)
        fetchConversations();
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
    <div className="flex-1 flex min-h-0">
      {/* Sidebar */}
        <aside
  className={`${
    sidebarOpen ? "w-64" : "w-0"
  } transition-all duration-200 border-r border-zinc-800 flex-shrink-0 overflow-hidden
  fixed md:relative inset-y-0 left-0 z-30 bg-zinc-950 md:bg-transparent`}
>
        {/* Mobil backdrop - csak mobilon és nyitott sidebarnál */}
{sidebarOpen && (
  <div
    onClick={() => setSidebarOpen(false)}
    className="fixed inset-0 bg-black/50 z-20 md:hidden"
  />
)}
        <div className="w-64 h-full flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <button
              onClick={newConversation}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-medium px-3 py-2 rounded text-sm transition-colors"
            >
              + Új beszélgetés
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center mt-4">
                Még nincsenek beszélgetéseid.
              </div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => loadConversation(conv.id)}
                      className={`group w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between gap-2 ${
                        currentConversationId === conv.id
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      <span className="truncate flex-1">{conv.title}</span>
                      <span
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                        title="Törlés"
                      >
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Sidebar toggle */}
        <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-zinc-500 hover:text-zinc-300 text-sm"
            title={sidebarOpen ? "Sidebar elrejtése" : "Sidebar megjelenítése"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <span className="text-xs text-zinc-500">
            {currentConversationId
              ? conversations.find((c) => c.id === currentConversationId)?.title || "Beszélgetés"
              : "Új beszélgetés"}
          </span>
        </div>

        {/* Messages */}
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
                      : "max-w-2xl text-zinc-200 leading-relaxed"
                  }
                >
                  {msg.role === "assistant" && (
                    <div className="text-xs uppercase tracking-wider text-emerald-500 mb-2">
                      NEXUS
                    </div>
                  )}
                  {msg.role === "user" ? (
                    <div className="text-zinc-200 whitespace-pre-wrap">{msg.content}</div>
                  ) : msg.content ? (
                    <div
                      className="prose prose-invert max-w-none
                      prose-p:my-2 prose-p:leading-relaxed
                      prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                      prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-zinc-200
                      prose-strong:text-zinc-100
                      prose-a:text-emerald-400
                      prose-code:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:my-3 prose-pre:text-sm"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : loading ? (
                    <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse" />
                  ) : (
                    ""
                  )}
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

        {/* Input area */}
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
  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors resize-none disabled:opacity-50"
  placeholder={loading ? "Válasz folyamatban..." : "Írj egy üzenetet..."}
/>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-medium px-5 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {loading ? "..." : "Küld"}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={optOutTraining}
                  onChange={(e) => setOptOutTraining(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5"
                />
                <span>Adataim nem használhatók fel a modell fejlesztéséhez</span>
              </label>
              <span className="text-xs text-zinc-600 flex-shrink-0">{tierLabel}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
