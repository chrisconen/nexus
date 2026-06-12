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
  locale?: string;
}

export default function ChatInterface({ userTier, userName, userEmail, locale: localeProp }: Props) {
  const locale = localeProp || "hu";

  const strings: Record<string, Record<string, string | string[]>> = {
    hu: {
      sidebarNewChat: "+ Új beszélgetés",
      sidebarSearch: "Keresés...",
      sidebarEmpty: "Még nincsenek beszélgetéseid.",
      sidebarToday: "Ma",
      sidebarYesterday: "Tegnap",
      sidebarThisWeek: "Ezen a héten",
      sidebarOlder: "Régebbi",
      sidebarPin: "Pinelés",
      sidebarUnpin: "Kipinelés",
      sidebarDelete: "Törlés",
      sidebarHide: "Sidebar elrejtése",
      sidebarShow: "Sidebar megnyitása",
      sidebarBugReport: "Hibabejelentés",
      sidebarAccountSettings: "Fiók beállítások",
      composerPlaceholder: "Írj egy üzenetet...",
      composerPlaceholderDoc: "Kérdezz a dokumentumról...",
      composerPlaceholderLoading: "Válasz folyamatban...",
      composerSend: "Küld",
      composerFileBtn: "Fájl",
      composerFileBtnUpload: "Feldolgozás...",
      composerFileTitle: "Dokumentum csatolása (PDF, DOCX, TXT)",
      composerOptOut: "Adataim nem használhatók fel a modell fejlesztéséhez",
      composerMessagesToday: "{count} / 50 üzenet ma",
      welcomeTitle: "Üdv, {name}.",
      welcomeSystem: "System // Ready",
      welcomeHintClick: "Kattints egy példára, vagy írd be a kérdésed",
      welcomeShowGuide: "Hogyan használjam?",
      welcomeHideGuide: "✕ Bezárás",
      welcomeGuideTitle: "Hogyan használjam?",
      welcomeClose: "✕ bezár",
      welcomeGuideP1: 'Egyszerűen <strong>írd be magyar nyelven</strong>, mit szeretnél. Az asszisztens felismeri a szándékod és automatikusan a megfelelő eszközt használja.',
      welcomeTips: "💡 Példák:",
      welcomeTip1: '"Mennyi az áfa 2025-ben?"',
      welcomeTip1desc: " — lekéri a NAV aktuális adatait",
      welcomeTip2: '"Generálj weboldalt egy virágkötőnek"',
      welcomeTip2desc: " — készít egy reszponzív oldalt",
      welcomeTip3: '"Nézd meg a https://... SEO-ját"',
      welcomeTip3desc: " — auditálja a weboldalt",
      welcomeTip4: '"Mennyit kérjek el 20 óra munkáért?"',
      welcomeTip4desc: " — kalkulálja az árazást",
      welcomeTipsTitle: "⚡ Hasznos tanácsok:",
      welcomeTipDetail1: "• Minél pontosabb a kérdés, annál jobb a válasz",
      welcomeTipDetail2: "• Ha weboldalt kérsz, add meg a cégnév + szolgáltatásokat",
      welcomeTipDetail3: "• Ha auditot kérsz, másold be a teljes URL-t",
      welcomeTipDetail4: "• Több tool-t is használhatsz egy körben",
      welcomeFreeNote: '<strong>Pro</strong> tier-ben weboldalt generálhatsz, dokumentumokat elemezhetsz, és posztokat írhatsz.',
      welcomeProNote: "Fájlokat is csatolhatsz (PDF, DOCX) — az asszisztens elemzi őket.",
      welcomePremiumNote: "Képeket is elemezhetek, és stratégiai terveket készíthetek.",
      deleteConfirm: "Biztosan törlöd ezt a beszélgetést?",
      errorGeneric: "Hiba történt",
      errorUpload: "Hiba a feltöltés közben",
      errorUploadFile: "Fájlfeltöltési hiba",
      errorNoResponse: "Nincs válasz a szervertől",
      errorUnknown: "Ismeretlen hiba",
      copied: "másolva",
      like: "Hasznos",
      dislike: "Nem hasznos",
      copy: "Másolás",
      skillLabel: "Chat",
      tierFree: "Free · korlátlan chat",
      tierPro: "Pro · korlátlan chat",
      tierPremium: "Premium · korlátlan",
      freeTitle: "Free tier — 50 üzenet / nap",
      freeIcon: "🌱",
      freeHints: ["Mennyi az áfa 2026-ban?","Nézd meg a https://pelda.hu oldalt SEO szempontból","Mennyit kérjek el egy weboldal készítésért 20 óra munkával?","Mi az EKÁER és kinek kötelező?"],
      proTitle: "Pro tier — korlátlan chat + weboldal készítő",
      proIcon: "⚡",
      proHints: ["Generálj weboldalat egy virágkötőnek Budapesten","Elemezd ki ezt a szerződést: [dokumentum feltöltése]","Készíts Facebook posztot az új akciómról","Mi az áfa 2026-ban és a konkurenciám is auditáld"],
      premiumTitle: "Premium tier — teljes funkcionalitás",
      premiumIcon: "👑",
      premiumHints: ["Generálj weboldalt és hasonlíts össze 3 versenytársat","Elemezd ki a képet és a hozzá tartozó PDF-et","Készíts részletes versenytárs elemzést 5 oldalról","Írj hosszú stratégiai marketingtervet az üzletemhez"],
    },
    en: {
      sidebarNewChat: "+ New Conversation",
      sidebarSearch: "Search...",
      sidebarEmpty: "No conversations yet.",
      sidebarToday: "Today",
      sidebarYesterday: "Yesterday",
      sidebarThisWeek: "This Week",
      sidebarOlder: "Older",
      sidebarPin: "Pin",
      sidebarUnpin: "Unpin",
      sidebarDelete: "Delete",
      sidebarHide: "Hide Sidebar",
      sidebarShow: "Show Sidebar",
      sidebarBugReport: "Report Bug",
      sidebarAccountSettings: "Account Settings",
      composerPlaceholder: "Type a message...",
      composerPlaceholderDoc: "Ask about the document...",
      composerPlaceholderLoading: "Response in progress...",
      composerSend: "Send",
      composerFileBtn: "File",
      composerFileBtnUpload: "Processing...",
      composerFileTitle: "Attach document (PDF, DOCX, TXT)",
      composerOptOut: "My data must not be used for model training",
      composerMessagesToday: "{count} / 50 messages today",
      welcomeTitle: "Welcome, {name}.",
      welcomeSystem: "System // Ready",
      welcomeHintClick: "Click an example or type your question",
      welcomeShowGuide: "How to use?",
      welcomeHideGuide: "✕ Close",
      welcomeGuideTitle: "How to use?",
      welcomeClose: "✕ close",
      welcomeGuideP1: 'Simply <strong>type what you want</strong>. The assistant recognizes your intent and automatically uses the right tool.',
      welcomeTips: "💡 Examples:",
      welcomeTip1: '"What is the VAT rate in 2025?"',
      welcomeTip1desc: " — fetches current tax data",
      welcomeTip2: '"Generate a website for a florist"',
      welcomeTip2desc: " — creates a responsive site",
      welcomeTip3: '"Audit https://... for SEO"',
      welcomeTip3desc: " — analyzes the website",
      welcomeTip4: '"How much should I charge for 20 hours of work?"',
      welcomeTip4desc: " — calculates pricing",
      welcomeTipsTitle: "⚡ Helpful tips:",
      welcomeTipDetail1: "• The more specific your question, the better the answer",
      welcomeTipDetail2: "• For websites, provide business name + services",
      welcomeTipDetail3: "• For audits, include the full URL",
      welcomeTipDetail4: "• You can use multiple tools in one session",
      welcomeFreeNote: 'With <strong>Pro</strong> tier you can generate websites, analyze documents, and write posts.',
      welcomeProNote: "You can attach files (PDF, DOCX) — the assistant analyzes them.",
      welcomePremiumNote: "I can analyze images and create strategic plans.",
      deleteConfirm: "Are you sure you want to delete this conversation?",
      errorGeneric: "An error occurred",
      errorUpload: "Error during upload",
      errorUploadFile: "File upload error",
      errorNoResponse: "No response from server",
      errorUnknown: "Unknown error",
      copied: "copied",
      like: "Helpful",
      dislike: "Not helpful",
      copy: "Copy",
      skillLabel: "Chat",
      tierFree: "Free · unlimited chat",
      tierPro: "Pro · unlimited chat",
      tierPremium: "Premium · unlimited",
      freeTitle: "Free tier — 50 messages / day",
      freeIcon: "🌱",
      freeHints: ["What is the VAT rate in 2025?","Audit https://example.com for SEO","How much should I charge for 20 hours of work?","What is EKÁER and who needs it?"],
      proTitle: "Pro tier — unlimited chat + website builder",
      proIcon: "⚡",
      proHints: ["Generate a website for a florist in Budapest","Analyze this contract: [upload document]","Write a Facebook post about my new promotion","What is VAT in 2026 and audit my competitors"],
      premiumTitle: "Premium tier — full functionality",
      premiumIcon: "👑",
      premiumHints: ["Generate a website and compare 3 competitors","Analyze the image and the attached PDF","Create a detailed competitor analysis of 5 sites","Write a long strategic marketing plan for my business"],
    },
    de: {
      sidebarNewChat: "+ Neue Unterhaltung",
      sidebarSearch: "Suchen...",
      sidebarEmpty: "Noch keine Unterhaltungen.",
      sidebarToday: "Heute",
      sidebarYesterday: "Gestern",
      sidebarThisWeek: "Diese Woche",
      sidebarOlder: "Älter",
      sidebarPin: "Anheften",
      sidebarUnpin: "Loslösen",
      sidebarDelete: "Löschen",
      sidebarHide: "Seitenleiste ausblenden",
      sidebarShow: "Seitenleiste anzeigen",
      sidebarBugReport: "Fehler melden",
      sidebarAccountSettings: "Kontoeinstellungen",
      composerPlaceholder: "Schreiben Sie eine Nachricht...",
      composerPlaceholderDoc: "Fragen Sie zum Dokument...",
      composerPlaceholderLoading: "Antwort wird erstellt...",
      composerSend: "Senden",
      composerFileBtn: "Datei",
      composerFileBtnUpload: "Verarbeitung...",
      composerFileTitle: "Dokument anhängen (PDF, DOCX, TXT)",
      composerOptOut: "Meine Daten dürfen nicht für das Modelltraining verwendet werden",
      composerMessagesToday: "{count} / 50 Nachrichten heute",
      welcomeTitle: "Willkommen, {name}.",
      welcomeSystem: "System // Ready",
      welcomeHintClick: "Klicken Sie auf ein Beispiel oder geben Sie Ihre Frage ein",
      welcomeShowGuide: "Wie benutzen?",
      welcomeHideGuide: "✕ Schließen",
      welcomeGuideTitle: "Wie benutzen?",
      welcomeClose: "✕ schließen",
      welcomeGuideP1: 'Einfach <strong>eingeben, was Sie möchten</strong>. Der Assistent erkennt Ihre Absicht und verwendet automatisch das richtige Werkzeug.',
      welcomeTips: "💡 Beispiele:",
      welcomeTip1: '"Wie hoch ist der Mehrwertsteuersatz 2025?"',
      welcomeTip1desc: " — ruft aktuelle Steuerdaten ab",
      welcomeTip2: '"Erstelle eine Website für einen Floristen"',
      welcomeTip2desc: " — erstellt eine responsive Seite",
      welcomeTip3: '"Prüfe https://... auf SEO"',
      welcomeTip3desc: " — analysiert die Website",
      welcomeTip4: '"Wie viel sollte ich für 20 Stunden Arbeit verlangen?"',
      welcomeTip4desc: " — berechnet die Preisgestaltung",
      welcomeTipsTitle: "⚡ Nützliche Tipps:",
      welcomeTipDetail1: "• Je spezifischer Ihre Frage, desto besser die Antwort",
      welcomeTipDetail2: "• Für Websites geben Sie Firmenname + Dienstleistungen an",
      welcomeTipDetail3: "• Für Audits fügen Sie die vollständige URL ein",
      welcomeTipDetail4: "• Sie können mehrere Werkzeuge in einer Sitzung verwenden",
      welcomeFreeNote: 'Mit <strong>Pro</strong> können Sie Websites generieren, Dokumente analysieren und Beiträge schreiben.',
      welcomeProNote: "Sie können Dateien (PDF, DOCX) anhängen — der Assistent analysiert sie.",
      welcomePremiumNote: "Ich kann Bilder analysieren und strategische Pläne erstellen.",
      deleteConfirm: "Sind Sie sicher, dass Sie diese Unterhaltung löschen möchten?",
      errorGeneric: "Ein Fehler ist aufgetreten",
      errorUpload: "Fehler beim Hochladen",
      errorUploadFile: "Datei-Upload-Fehler",
      errorNoResponse: "Keine Antwort vom Server",
      errorUnknown: "Unbekannter Fehler",
      copied: "kopiert",
      like: "Hilfreich",
      dislike: "Nicht hilfreich",
      copy: "Kopieren",
      skillLabel: "Chat",
      tierFree: "Free · unbegrenzter Chat",
      tierPro: "Pro · unbegrenzter Chat",
      tierPremium: "Premium · unbegrenzt",
      freeTitle: "Free-Tarif — 50 Nachrichten / Tag",
      freeIcon: "🌱",
      freeHints: ["Wie hoch ist der Mehrwertsteuersatz 2025?","Prüfe https://example.com auf SEO","Wie viel soll ich für 20 Stunden Arbeit verlangen?","Was ist EKÄR und wer braucht es?"],
      proTitle: "Pro-Tarif — unbegrenzter Chat + Website-Builder",
      proIcon: "⚡",
      proHints: ["Erstelle eine Website für einen Floristen in Budapest","Analysiere diesen Vertrag: [Dokument hochladen]","Schreibe einen Facebook-Beitrag über meine Aktion","Was ist die Mehrwertsteuer 2026 und prüfe meine Konkurrenten"],
      premiumTitle: "Premium-Tarif — volle Funktionalität",
      premiumIcon: "👑",
      premiumHints: ["Erstelle eine Website und vergleiche 3 Konkurrenten","Analysiere das Bild und das angehängte PDF","Erstelle eine detaillierte Konkurrenzanalyse von 5 Websites","Schreibe einen langen strategischen Marketingplan"],
    },
  };
  const s = strings[locale] || strings.hu;

  function str(key: string, params?: Record<string, string>): string {
    const val = s[key];
    if (typeof val !== "string") return key;
    let result = val;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, v);
      }
    }
    return result;
  }

  function skillLabel(skillId: string): string {
    if (skillId === "chat-assistant") return str("skillLabel");
    return skillId;
  }

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
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [builderHighlighted, setBuilderHighlighted] = useState(false);
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
    @keyframes snake-orbit {
      0%   { transform: rotate(0deg) translateX(9px); opacity: 0; }
      8%   { opacity: 1; }
      78%  { opacity: 1; }
      100% { transform: rotate(360deg) translateX(9px); opacity: 0; }
    }
    .snake-loader {
      position: relative;
      width: 28px;
      height: 28px;
    }
    .snake-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 4px;
      margin: -2px 0 0 -2px;
      background: #34d399;
      border-radius: 50%;
      animation: snake-orbit 1.2s ease-in-out infinite;
    }
    .snake-dot:nth-child(1)  { animation-delay: 0s; }
    .snake-dot:nth-child(2)  { animation-delay: 0.15s; }
    .snake-dot:nth-child(3)  { animation-delay: 0.3s; }
    .snake-dot:nth-child(4)  { animation-delay: 0.45s; }
    .snake-dot:nth-child(5)  { animation-delay: 0.6s; }
    .snake-dot:nth-child(6)  { animation-delay: 0.75s; }
    .snake-dot:nth-child(7)  { animation-delay: 0.9s; }
    .snake-dot:nth-child(8)  { animation-delay: 1.05s; }
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

  // Free tier napi üzenet-számláló betöltése
  useEffect(() => {
    if (userTier !== "free") return;
    fetch("/api/usage")
      .then(r => r.json())
      .then(data => {
        if (typeof data.chat?.remaining === "number") {
          setDailyRemaining(data.chat.remaining);
        }
      })
      .catch(() => {});
  }, []);

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
    if (!confirm(str("deleteConfirm"))) return;

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
        const errorData = await response.json().catch(() => ({ error: str("errorUnknown") }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error(str("errorNoResponse"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let returnedConversationId: string | null = null;
      let seenBuilderRedirect = false;
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
          if (parsed.builderRedirect) {
            seenBuilderRedirect = true;
          }
        }
      }

      if (seenBuilderRedirect) {
        setBuilderHighlighted(true);
      }

      // Free tier: csökkentjük a helyi számlálót sikeres üzenet után
      if (userTier === "free") {
        setDailyRemaining(prev => (prev !== null ? Math.max(0, prev - 1) : null));
      }

      if (returnedConversationId) {
        setCurrentConversationId(returnedConversationId);
        fetchConversations();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : str("errorGeneric"));
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
        throw new Error(data.error || str("errorUpload"));
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
      setError(err instanceof Error ? err.message : str("errorUploadFile"));
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
    userTier === "pro"
      ? str("tierPro")
      : userTier === "premium"
      ? str("tierPremium")
      : null;

  // --- Tier-alapú példák a welcome képernyőhöz ---
  const tierName =
    userTier === "free" ? "Free" : userTier === "pro" ? "Pro" : "Premium";

  const TIER_HINTS: Record<string, { title: string; icon: string; hints: string[] }> = {
    free: {
      title: s["freeTitle"] as string,
      icon: s["freeIcon"] as string,
      hints: s["freeHints"] as string[],
    },
    pro: {
      title: s["proTitle"] as string,
      icon: s["proIcon"] as string,
      hints: s["proHints"] as string[],
    },
    premium: {
      title: s["premiumTitle"] as string,
      icon: s["premiumIcon"] as string,
      hints: s["premiumHints"] as string[],
    },
  };

  const currentHints = TIER_HINTS[userTier] || TIER_HINTS.free;
  const [showHints, setShowHints] = useState(false);

  // Sidebar dátum-csoportosítás
  function groupConversationsByDate(convs: Conversation[]) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yest = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const groups = [
      { label: str("sidebarToday"), items: [] as Conversation[] },
      { label: str("sidebarYesterday"), items: [] as Conversation[] },
      { label: str("sidebarThisWeek"), items: [] as Conversation[] },
      { label: str("sidebarOlder"), items: [] as Conversation[] },
    ];
    for (const c of convs) {
      const d = c.updatedAt.slice(0, 10);
      if (d === todayStr) groups[0].items.push(c);
      else if (d === yest) groups[1].items.push(c);
      else if (d >= weekAgo) groups[2].items.push(c);
      else groups[3].items.push(c);
    }
    return groups.filter(g => g.items.length > 0);
  }

  const handleHintClick = (hint: string) => {
    setInput(hint);
    setShowHints(false);
    // Fókusz a textarea-ra, hogy a user azonnal elküldhesse
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Mobil backdrop — az aside ELŐTT, hogy ne nyelje el a sidebar kattintásokat */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
        />
      )}
      {/* Sidebar — teljes nézet */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-200 border-r border-zinc-800 flex-shrink-0 overflow-hidden
        fixed md:relative inset-y-0 left-0 z-30 bg-zinc-950 md:bg-transparent`}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Top: NEXUS logo + tier + close toggle */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 no-underline min-w-0">
              <span className="text-emerald-400 font-bold text-sm tracking-wide">NEXUS AI</span>
              {userTier === "free" ? (
                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide hidden sm:inline">Free</span>
              ) : userTier === "pro" ? (
                <span className="text-[9px] bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.5 rounded-full uppercase tracking-wide hidden sm:inline">Pro</span>
              ) : (
                <span className="text-[9px] bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full uppercase tracking-wide hidden sm:inline">Premium</span>
              )}
            </a>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors flex-shrink-0 ml-2"
              title={str("sidebarHide")}
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
              {str("sidebarNewChat")}
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={str("sidebarSearch")}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Conversations lista — dátum szerint csoportosítva */}
          <div className="flex-1 overflow-y-auto p-2 sidebar-scroll">
            {conversations.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center mt-4">
                {str("sidebarEmpty")}
              </div>
            ) : (
              <div className="space-y-3">
                {groupConversationsByDate(conversations).map((group) => (
                  <div key={group.label}>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600 px-2 mb-1">{group.label}</div>
                    <ul className="space-y-0.5">
                      {group.items.map((conv) => (
                        <li key={conv.id}>
                          <button
                            onClick={() => loadConversation(conv.id)}
                            className={`group w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between gap-2 ${
                              currentConversationId === conv.id
                                ? "bg-zinc-800 text-zinc-100"
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                            }`}
                          >
                            <span className="truncate flex-1 text-xs">{conv.title}</span>
                            <span
                              onClick={(e) => togglePin(conv.id, !conv.pinned, e)}
                              className={`text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                conv.pinned ? "text-emerald-500 opacity-100" : "text-zinc-600 hover:text-emerald-400"
                              }`}
                              title={conv.pinned ? str("sidebarUnpin") : str("sidebarPin")}
                            >
                              📌
                            </span>
                            <span
                              onClick={(e) => deleteConversation(conv.id, e)}
                              className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                              title={str("sidebarDelete")}
                            >
                              ×
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: Site Builder + user */}
          <div className="p-3 border-t border-zinc-800 space-y-2">
            <a
              href="/builder"
              className={`flex items-center gap-2 text-xs rounded px-3 py-2 transition-all w-full ${
                builderHighlighted
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-600"
                  : "text-emerald-600 hover:text-emerald-400 border border-emerald-800/50 hover:border-emerald-700"
              }`}
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
                title={str("sidebarAccountSettings")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </a>
            </div>
            {/* Bug report — mobilon itt jelenik meg, mert a floating gomb el van rejtve */}
            <a
              href="https://github.com/chrisconen/nexus/issues/new?labels=bug&template=bug_report.md"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1.5 text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors pt-1"
              title={str("sidebarBugReport")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {str("sidebarBugReport")}
            </a>
          </div>
        </div>
      </aside>

      {/* Collapsed strip — ha sidebar csukva, logo + toggle itt jelenik meg */}
      {!sidebarOpen && (
        <div className="w-12 border-r border-zinc-800 flex-shrink-0 flex flex-col items-center py-3 gap-4 bg-zinc-950 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            title={str("sidebarShow")}
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

        {/* Floating bug report — jobb alsó sarok, halványabb mint volt */}
        <div className="absolute bottom-4 right-4 z-20 hidden md:flex">
          <a
            href="https://github.com/chrisconen/nexus/issues/new?labels=bug&template=bug_report.md"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 text-zinc-600 hover:text-zinc-400 px-3 py-2 rounded-full text-xs backdrop-blur-sm transition-all group"
            title={str("sidebarBugReport")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="hidden group-hover:inline">{str("sidebarBugReport")}</span>
          </a>
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
                  {str("welcomeSystem")}
                </div>
                <h2 className="text-2xl text-zinc-300 mb-2">{str("welcomeTitle", { name: userName })}</h2>
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
                  {str("welcomeHintClick")}
                </p>
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="mt-3 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
                >
                  {showHints ? str("welcomeHideGuide") : str("welcomeShowGuide")}
                </button>

                {/* "Hogyan használjam?" információs panel */}
                {showHints && (
                  <div className="mt-8 text-left max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 text-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-zinc-500">{str("welcomeGuideTitle")}</span>
                      <button onClick={() => setShowHints(false)} className="text-zinc-600 hover:text-zinc-300 text-xs">{str("welcomeClose")}</button>
                    </div>

                    <div className="space-y-4 text-zinc-400 text-xs leading-relaxed">
                      <p dangerouslySetInnerHTML={{ __html: str("welcomeGuideP1") }} />

                      <div className="border-l-2 border-emerald-700/50 pl-3 space-y-2">
                        <p className="text-zinc-300 font-medium">{str("welcomeTips")}</p>
                        <p>
                          <span className="text-emerald-400">{str("welcomeTip1")}</span>
                          <span className="text-zinc-600">{str("welcomeTip1desc")}</span>
                        </p>
                        <p>
                          <span className="text-emerald-400">{str("welcomeTip2")}</span>
                          <span className="text-zinc-600">{str("welcomeTip2desc")}</span>
                        </p>
                        <p>
                          <span className="text-emerald-400">{str("welcomeTip3")}</span>
                          <span className="text-zinc-600">{str("welcomeTip3desc")}</span>
                        </p>
                        <p>
                          <span className="text-emerald-400">{str("welcomeTip4")}</span>
                          <span className="text-zinc-600">{str("welcomeTip4desc")}</span>
                        </p>
                      </div>

                      <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1.5">
                        <p className="text-zinc-300 font-medium">{str("welcomeTipsTitle")}</p>
                        <p>{str("welcomeTipDetail1")}</p>
                        <p>{str("welcomeTipDetail2")}</p>
                        <p>{str("welcomeTipDetail3")}</p>
                        <p>{str("welcomeTipDetail4")}</p>
                      </div>

                      {userTier === "free" && (
                        <div className="border-t border-zinc-800 pt-3 text-zinc-600" dangerouslySetInnerHTML={{ __html: str("welcomeFreeNote") }} />
                      )}
                      {userTier === "pro" && (
                        <div className="border-t border-zinc-800 pt-3 text-zinc-600">
                          {str("welcomeProNote")}
                        </div>
                      )}
                      {userTier === "premium" && (
                        <div className="border-t border-zinc-800 pt-3 text-zinc-600">
                          {str("welcomePremiumNote")}
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
                        title={str("like")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={msg.feedback === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, feedback: m.feedback === "dislike" ? undefined : "dislike" } : m))}
                        className={`p-1 rounded transition-colors ${msg.feedback === "dislike" ? "text-red-400" : "hover:text-zinc-300"}`}
                        title={str("dislike")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={msg.feedback === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedMessageId(msg.id); }}
                        className="p-1 rounded hover:text-zinc-300 transition-colors relative"
                        title={str("copy")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        {copiedMessageId === msg.id && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-[10px] bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {str("copied")}
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
                    title={str("composerFileTitle")}
                  >
                    <span>{uploading ? "⏳" : "📎"}</span>
                    <span className="hidden md:inline">{uploading ? str("composerFileBtnUpload") : str("composerFileBtn")}</span>
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
  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors resize-none disabled:opacity-50"
  placeholder={loading ? str("composerPlaceholderLoading") : attachedDoc ? str("composerPlaceholderDoc") : str("composerPlaceholder")}
/>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-medium px-5 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {loading ? "..." : str("composerSend")}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-1 sm:gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={optOutTraining}
                  onChange={(e) => setOptOutTraining(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5"
                />
                <span>{str("composerOptOut")}</span>
              </label>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {currentSkill !== "chat-assistant" && (
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {skillLabel(currentSkill)}
                  </span>
                )}
                {userTier === "free" && dailyRemaining !== null ? (
                  <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded border ${
                    dailyRemaining > 20
                      ? "text-zinc-500 border-zinc-800"
                      : dailyRemaining > 5
                      ? "text-amber-500 border-amber-900/50"
                      : "text-red-400 border-red-900/50"
                  }`}>
                    {str("composerMessagesToday", { count: String(dailyRemaining) })}
                  </span>
                ) : tierLabel ? (
                  <span className="text-xs text-zinc-600">{tierLabel}</span>
                ) : null}
              </div>
            </div>
          </form>
        </div>
        {/* Messages+Input wrapper vége */}
      </div>
    </div>
  </div>
  );
}
