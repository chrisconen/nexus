import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { detectIntent } from "@/lib/chat/intent-detector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  skillId?: string;
  feedback?: "like" | "dislike";
}

function skillLabel(skillId: string): string {
  const labels: Record<string, string> = {


    "chat-assistant": "Chat",
  };
  return labels[skillId] || skillId;
}

interface Conversation {
  id: string;
  title: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  userTier: string;
  userName: string;
  userEmail?: string;
}

export default function ChatInterface({ userTier, userName, userEmail }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optOutTraining, setOptOutTraining] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{ fileName: string; text: string } | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ fileName: string; base64: string; mediaType: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("chat-assistant");
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSS inject — glow button + snake loading dots
useEffect(() => {
  if (document.getElementById("nexus-styles")) return;
  const style = document.createElement("style");
  style.id = "nexus-styles";
  style.textContent = `
    @property --border-angle {
      syntax: "<angle>";
      inherits: false;
      initial-value: 0deg;
    }
    @keyframes border-rotate {
      to { --border-angle: 360deg; }
    }
    .nexus-glow-btn {
      background: conic-gradient(from var(--border-angle), #10b981, #047857, #34d399, #047857, #10b981);
      animation: border-rotate 4s linear infinite;
    }
  `;
  document.head.appendChild(style);
}, []);

// Mobil/desktop alapállapot
useEffect(() => {
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  setSidebarOpen(isDesktop);
}, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // "Másolva" tooltip eltüntetése 2s után
  useEffect(() => {
    if (!copiedMessageId) return;
    const timer = setTimeout(() => setCopiedMessageId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedMessageId]);

  // Konverzációk lista betöltése (opcionális kereséssel)
  const fetchConversations = useCallback(async (query?: string) => {
    try {
      const url = query ? `/api/conversations?q=${encodeURIComponent(query)}` : "/api/conversations";
      const res = await fetch(url);
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

  // Konverzáció pinelés / kipinelés
  const togglePin = async (id: string, pinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, pinned } : c))
        );
      }
    } catch (e) {
      console.error("Failed to toggle pin:", e);
    }
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchConversations]);

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

    // Intent detection — milyen skill-t használjunk
    let detectedSkill = currentSkill;
    try {
      const intent = detectIntent(userMessage.content);
      detectedSkill = intent.skillId;
    } catch {
      // default skill on failure
    }
    if (detectedSkill !== currentSkill) {
      setCurrentSkill(detectedSkill);
    }

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", skillId: detectedSkill }]);

    try {
      // Ha dokumentum van csatolva, a user üzenet elé illesztjük kontextusként
      const chatMessages: Array<{ role: string; content: string }> = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let imageAttachment: { base64: string; mediaType: string } | undefined;

      if (attachedDoc) {
        const lastIdx = chatMessages.length - 1;
        chatMessages[lastIdx] = {
          ...chatMessages[lastIdx],
          content: `[Csatolt dokumentum: ${attachedDoc.fileName}]\n\n${attachedDoc.text}\n\n---\n\nA fenti dokumentum alapján: ${chatMessages[lastIdx].content}`,
        };
        setAttachedDoc(null);
      }

      if (attachedImage) {
        imageAttachment = { base64: attachedImage.base64, mediaType: attachedImage.mediaType };
        setAttachedImage(null);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConversationId,
          messages: chatMessages,
          image: imageAttachment,
          optOutTraining,
          skillId: detectedSkill,
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
      let lineBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Process remaining buffer
          if (lineBuffer.trim()) {
            try {
              const parsed = JSON.parse(lineBuffer);
              if (parsed.token) {
                accumulated += parsed.token;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  )
                );
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch {}
          }
          break;
        }

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        // Keep the last (incomplete) line in the buffer
        lineBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let parsed: any;
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            // skip invalid JSON lines
            continue;
          }
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
          if (parsed.modelUsed) {
            setLastModelUsed(parsed.modelUsed);
          }
          if (parsed.skillUsed) {
            setCurrentSkill(parsed.skillUsed);
          }
          if (parsed.error) {
            throw new Error(parsed.error);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Hiba a feltöltés közben");
      }

      if (data.type === "image") {
        setAttachedImage({ fileName: data.fileName, base64: data.base64, mediaType: data.mediaType });
      } else {
        setAttachedDoc({ fileName: data.fileName, text: data.text });
        if (data.truncated) {
          setError(`A dokumentum szövege levágva (${Math.round(data.originalLength / 1000)}k → ${Math.round(data.extractedLength / 1000)}k karakter). Frissíts magasabb csomagra a teljes feldolgozáshoz.`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fájlfeltöltési hiba");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      ? "Free tier · korlátlan"
      : userTier === "pro"
      ? "Pro tier · Korlátlan"
      : "Premium tier · Korlátlan";

  // --- Tier-alapú példák a welcome képernyőhöz ---
  const tierName =
    userTier === "free" ? "Free" : userTier === "pro" ? "Pro" : "Premium";

  const TIER_HINTS: Record<string, { title: string; icon: string; hints: string[] }> = {
    free: {
      title: "Free tier — napi ingyenes használat",
      icon: "🌱",
      hints: [
        "Mennyi az áfa 2026-ban?",
        "Nézd meg a https://pelda.hu oldalt SEO szempontból",
        "Mennyit kérjek el egy weboldal készítésért 20 óra munkával?",
        "Mi az EKÁER és kinek kötelező?",
      ],
    },
    pro: {
      title: "Pro tier — korlátlan használat + dokumentumok",
      icon: "⚡",
      hints: [
        "Generálj weboldalat egy virágkötőnek Budapesten",
        "Elemezd ki ezt a szerződést: [dokumentum feltöltése]",
        "Készíts Facebook posztot az új akciómról",
        "Mi az áfa 2026-ban és a konkurenciám is auditáld",
      ],
    },
    premium: {
      title: "Premium tier — teljes funkcionalitás",
      icon: "👑",
      hints: [
        "Generálj weboldalt és hasonlíts össze 3 versenytársat",
        "Elemezd ki a képet és a hozzá tartozó PDF-et",
        "Készíts részletes versenytárs elemzést 5 oldalról",
        "Írj hosszú stratégiai marketingtervet az üzletemhez",
      ],
    },
  };

  const currentHints = TIER_HINTS[userTier] || TIER_HINTS.free;
  const [showHints, setShowHints] = useState(false);

  const handleHintClick = (hint: string) => {
    setInput(hint);
    setShowHints(false);
    // Fókusz a textarea-ra, hogy a user azonnal elküldhesse
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Sidebar — teljes nézet */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-200 border-r border-zinc-800 flex-shrink-0 overflow-hidden
        fixed md:relative inset-y-0 left-0 z-30 bg-zinc-950 md:bg-transparent`}
      >
        {/* Mobil backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
          />
        )}
        <div className="w-64 h-full flex flex-col">
          {/* Top: NEXUS logo + tier + close toggle */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 no-underline min-w-0">
              <span className="text-emerald-400 font-bold text-sm tracking-wide">NEXUS AI</span>
              <span className="text-[10px] text-zinc-600 uppercase hidden sm:inline">{tierName} tier</span>
            </a>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors flex-shrink-0 ml-2"
              title="Sidebar elrejtése"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Middle: új beszélgetés + keresés */}
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <button
              onClick={newConversation}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-medium px-3 py-2 rounded text-sm transition-colors"
            >
              + Új beszélgetés
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Conversations lista */}
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
                        onClick={(e) => togglePin(conv.id, !conv.pinned, e)}
                        className={`text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                          conv.pinned ? "text-emerald-500 opacity-100" : "text-zinc-600 hover:text-emerald-400"
                        }`}
                        title={conv.pinned ? "Kipinelés" : "Pinelyés"}
                      >
                        📌
                      </span>
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

          {/* Bottom: Site Builder + user */}
          <div className="p-3 border-t border-zinc-800 space-y-2">
            <a
              href="/builder"
              className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-400 border border-emerald-800/50 hover:border-emerald-700 rounded px-3 py-2 transition-colors w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              Site Builder
            </a>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 flex-shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{userEmail || userName}</span>
              </div>
              <a
                href="/fiok"
                className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0 ml-2"
                title="Fiók beállítások"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Collapsed strip — ha sidebar csukva, logo + toggle itt jelenik meg */}
      {!sidebarOpen && (
        <div className="w-12 border-r border-zinc-800 flex-shrink-0 flex flex-col items-center py-3 gap-4 bg-zinc-950 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            title="Sidebar megnyitása"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <a
            href="/"
            className="[writing-mode:vertical-lr] text-[10px] tracking-[0.3em] text-emerald-400 font-bold no-underline flex-1 flex items-center justify-center"
            title="NEXUS AI"
          >
            NEXUS
          </a>
        </div>
      )}

      {/* Main chat area — DeepSeek-stílusú tiszta layout */}
      <div className="flex-1 flex flex-col min-h-0 relative">

        {/* Floating gombok — jobb alsó sarok */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
          {/* Bug report */}
          <a
            href="https://github.com/chrisconen/nexus/issues/new?labels=bug&template=bug_report.md"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700 hover:border-emerald-600 text-zinc-400 hover:text-emerald-400 px-3 py-2 rounded-full text-xs backdrop-blur-sm transition-all group"
            title="Hiba jelentése"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="hidden group-hover:inline">Hiba jelentése</span>
          </a>
          {/* Hogyan használjam? glow gomb */}
          <div className="relative rounded-lg p-[2px] overflow-hidden nexus-glow-btn">
            <div className="relative rounded-[5px] bg-zinc-950">
              <button
                onClick={() => setShowHints(!showHints)}
                className="text-[10px] uppercase tracking-wider text-zinc-400 hover:text-emerald-300 px-3 py-1.5 rounded-[5px] transition-colors block whitespace-nowrap"
                title="Hogyan használjam?"
              >
                {showHints ? "✕ bezár" : "Hogyan használjam?"}
              </button>
            </div>
          </div>
        </div>

        {/* Messages + Input közös wrapper — üres állapotban együtt centrírozva */}
        <div className={`flex-1 flex flex-col min-h-0 relative ${messages.length === 0 ? "justify-center" : ""}`}>
          {/* Ovális glow effekt a chat mögött — csak üres állapotban */}
          {messages.length === 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[700px] bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.12)_0%,_rgba(16,185,129,0.05)_40%,_transparent_70%)] rounded-full" />
            </div>
          )}
        {/* Messages */}
        <div className={`${messages.length === 0 ? "px-6" : "flex-1 overflow-y-auto px-6 py-8 min-h-0"}`}>
          <div className="max-w-3xl mx-auto space-y-6 w-full">
            {messages.length === 0 && (
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4">
                  System // Ready
                </div>
                <h2 className="text-2xl text-zinc-300 mb-2">Üdv, {userName}.</h2>
                <div className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 mb-6">
                  <span>{currentHints.icon}</span>
                  <span>{currentHints.title}</span>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                  {currentHints.hints.map((hint, i) => (
                    <button
                      key={i}
                      onClick={() => handleHintClick(hint)}
                      className="group relative px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-emerald-700/50 transition-all duration-200 text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <span className="line-clamp-1">{hint}</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-zinc-700 mt-6">
                  Kattints egy példára, vagy írd be a kérdésed
                </p>

                {/* "Hogyan használjam?" információs panel */}
                {showHints && (
                  <div className="mt-8 text-left max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 text-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-zinc-500">Hogyan használjam?</span>
                      <button onClick={() => setShowHints(false)} className="text-zinc-600 hover:text-zinc-300 text-xs">✕ bezár</button>
                    </div>

                    <div className="space-y-4 text-zinc-400 text-xs leading-relaxed">
                      <p>
                        Egyszerűen <span className="text-zinc-200">írd be magyar nyelven</span>, mit szeretnél. 
                        Az asszisztens felismeri a szándékod és automatikusan a megfelelő eszközt használja.
                      </p>

                      <div className="border-l-2 border-emerald-700/50 pl-3 space-y-2">
                        <p className="text-zinc-300 font-medium">💡 Példák:</p>
                        <p>
                          <span className="text-emerald-400">"Mennyi az áfa 2025-ben?"</span>
                          <span className="text-zinc-600"> — lekéri a NAV aktuális adatait</span>
                        </p>
                        <p>
                          <span className="text-emerald-400">"Generálj weboldalt egy virágkötőnek"</span>
                          <span className="text-zinc-600"> — készít egy reszponzív oldalt</span>
                        </p>
                        <p>
                          <span className="text-emerald-400">"Nézd meg a https://... SEO-ját"</span>
                          <span className="text-zinc-600"> — auditálja a weboldalt</span>
                        </p>
                        <p>
                          <span className="text-emerald-400">"Mennyit kérjek el 20 óra munkáért?"</span>
                          <span className="text-zinc-600"> — kalkulálja az árazást</span>
                        </p>
                      </div>

                      <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1.5">
                        <p className="text-zinc-300 font-medium">⚡ Hasznos tanácsok:</p>
                        <p>• Minél pontosabb a kérdés, annál jobb a válasz</p>
                        <p>• Ha weboldalt kérsz, add meg a cégnév + szolgáltatásokat</p>
                        <p>• Ha auditot kérsz, másold be a teljes URL-t</p>
                        <p>• Több tool-t is használhatsz egy körben</p>
                      </div>

                      {userTier === "free" && (
                        <div className="border-t border-zinc-800 pt-3 text-zinc-600">
                          <span className="text-emerald-400">Pro</span> tier-ben weboldalt generálhatsz, 
                          dokumentumokat elemezhetsz, és posztokat írhatsz.
                        </div>
                      )}
                      {userTier === "pro" && (
                        <div className="border-t border-zinc-800 pt-3 text-zinc-600">
                          Fájlokat is csatolhatsz (PDF, DOCX) — az asszisztens elemzi őket.
                        </div>
                      )}
                      {userTier === "premium" && (
                        <div className="border-t border-zinc-800 pt-3 text-zinc-600">
                          Képeket is elemezhetek, és stratégiai terveket készíthetek.
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs uppercase tracking-wider text-emerald-500">
                        NEXUS
                      </div>
                      {msg.skillId && msg.skillId !== "chat-assistant" && (
                        <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                          {skillLabel(msg.skillId)}
                        </span>
                      )}
                    </div>
                  )}
                  {msg.role === "user" ? (
                    <div className="text-zinc-200 whitespace-pre-wrap">{msg.content}</div>
                  ) : msg.content ? (
                    <>
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
                    <div className="flex items-center gap-1 mt-2 text-zinc-600">
                      <button
                        onClick={() => setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, feedback: m.feedback === "like" ? undefined : "like" } : m))}
                        className={`p-1 rounded transition-colors ${msg.feedback === "like" ? "text-emerald-400" : "hover:text-zinc-300"}`}
                        title="Hasznos"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={msg.feedback === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, feedback: m.feedback === "dislike" ? undefined : "dislike" } : m))}
                        className={`p-1 rounded transition-colors ${msg.feedback === "dislike" ? "text-red-400" : "hover:text-zinc-300"}`}
                        title="Nem hasznos"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={msg.feedback === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedMessageId(msg.id); }}
                        className="p-1 rounded hover:text-zinc-300 transition-colors relative"
                        title="Másolás"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        {copiedMessageId === msg.id && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                            másolva
                          </span>
                        )}
                      </button>
                    </div>
                    </>
                  ) : loading ? (
                    <div className="snake-loader">
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                      <span className="snake-dot" />
                    </div>
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
        <div className={`${messages.length === 0 ? "" : "border-t border-zinc-800"} px-6 py-4 flex-shrink-0`}>
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {(attachedDoc || attachedImage) && (
              <div className="flex items-center gap-2 mb-2 bg-emerald-950/40 border border-emerald-900 rounded px-3 py-2 text-sm">
                <span className="text-emerald-400">{attachedImage ? "🖼️" : "📎"}</span>
                <span className="text-zinc-300 truncate flex-1">
                  {attachedDoc?.fileName || attachedImage?.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => { setAttachedDoc(null); setAttachedImage(null); }}
                  className="text-zinc-500 hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-3 items-end">
              {userTier !== "free" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={userTier === "premium"
                      ? ".pdf,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                      : ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    }
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading}
                    className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 hover:border-emerald-600 hover:text-emerald-400 text-zinc-400 disabled:opacity-50 transition-colors px-3 py-3 rounded-lg text-sm whitespace-nowrap"
                    title="Dokumentum csatolása (PDF, DOCX, TXT)"
                  >
                    <span>{uploading ? "⏳" : "📎"}</span>
                    <span className="hidden md:inline">{uploading ? "Feldolgozás..." : "Fájl"}</span>
                  </button>
                </>
              )}
              <textarea
  ref={textareaRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={loading}
  rows={1}
  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors resize-none disabled:opacity-50"
  placeholder={loading ? "Válasz folyamatban..." : attachedDoc ? "Kérdezz a dokumentumról..." : "Írj egy üzenetet..."}
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
              {currentSkill !== "chat-assistant" && (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded flex-shrink-0">
                  {skillLabel(currentSkill)}
                </span>
              )}
              <span className="text-xs text-zinc-600 flex-shrink-0">{tierLabel}</span>
            </div>
          </form>
        </div>
        {/* Messages+Input wrapper vége */}
      </div>
    </div>
  </div>
  );
}
