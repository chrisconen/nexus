# Chat Fejlesztés — 3 fázis

> **Cél:** A NEXUS chat funkciójának profi szintre emelése három fázisban: (1) skill auto-detection, (2) konverzáció menedzsment, (3) UI/UX javítások.
>
> **Architektúra:** A skill rendszerre építünk — a frontend intent-detection-t végez és elküldi a `skillId`-t a backend-nek, ami már készen áll a skill-váltásra. A konverzáció menedzsment a meglévő DB-re épül új API endpoint-okkal. Az UI/UX a React komponens frissítéseit jelenti.
>
> **Tech Stack:** Astro 6 + React 19 + Tailwind CSS 4 + Turso (libsql) + Drizzle ORM

---

## Fájl struktúra

**Létrehozandó:**
```
src/lib/chat/
  intent-detector.ts    # Intent felismerés (URL, copywriting kérés, stb.)
  search.ts             # Konverzáció keresés logika (DB)
  types.ts              # Megosztott típusok
```

**Módosítandó:**
```
src/components/ChatInterface.tsx   # Mindhárom fázis UI változásai
src/pages/api/chat.ts              # SkillId fogadása + intent-based routing
src/pages/api/conversations.ts     # Search query param támogatás
src/lib/db/schema.ts               # message: skillId mező, conversation: pinned mező
```

---

## 1. Fázis — Skill auto-detection

**Cél:** A chat felismeri a user intent-jét és automatikusan a megfelelő skill-t használja. Pl. URL beillesztése → `web-auditor`, "írj egy Facebook posztot" → `copywriter`.

### Task 1.1: Intent detector (szerver oldali)

**Files:**
- Create: `src/lib/chat/intent-detector.ts`

**Step 1:** Implement intent detection logic

```typescript
// src/lib/chat/intent-detector.ts

export type DetectedIntent = {
  skillId: "chat-assistant" | "web-auditor" | "copywriter";
  confidence: "high" | "low";
  reason?: string;
};

const URL_REGEX = /https?:\/\/[^\s<>"']+/i;
const HTML_REGEX = /<html[\s>]|<body[\s>]|<!DOCTYPE/i;

// Copywriting kulcsszavak — amikor a user tartalmat akar íratni, nem kérdezni
const COPY_WRITE_TRIGGERS = [
  "írj", "írd meg", "írnál", "készíts", "csinálj", "generálj",
  "szöveget", "posztot", "emailt", "üzenetet", "leírást",
  "szlogent", "kampány", "reklám", "bejegyzést",
  "facebook", "instagram", "linkedin", "tiktok",
  "hirdetés", "ajánlat", "promóció",
];

const COPY_READ_TRIGGERS = [
  "véleményezd", "nézd át", "javítsd", "értékeld",
  "mit szólsz", "jó ez", "hogy tetszik",
];

export function detectIntent(userMessage: string, lastAssistantMessage?: string): DetectedIntent {
  const text = userMessage.toLowerCase().trim();

  // 1. URL vagy HTML → web auditor (magas prioritás)
  if (URL_REGEX.test(userMessage) || HTML_REGEX.test(userMessage)) {
    return { skillId: "web-auditor", confidence: "high", reason: "URL vagy HTML észlelve" };
  }

  // 2. Copywriting trigger — tartalom írás kérése
  const hasWriteTrigger = COPY_WRITE_TRIGGERS.some(t => text.includes(t));
  if (hasWriteTrigger) {
    return { skillId: "copywriter", confidence: "high", reason: "Tartalomírás kérése észlelve" };
  }

  // 3. Copywriting review — ha az előző asszisztens válasz tartalom volt és review-t kér
  const hasReviewTrigger = COPY_READ_TRIGGERS.some(t => text.includes(t));
  if (hasReviewTrigger && lastAssistantMessage && lastAssistantMessage.length > 100) {
    return { skillId: "copywriter", confidence: "low", reason: "Lehetséges tartalom véleményezés" };
  }

  // 4. Default — chat assistant
  return { skillId: "chat-assistant", confidence: "high" };
}
```

**Step 2:** Export the function and types from `src/lib/chat/types.ts`

```typescript
// src/lib/chat/types.ts
export type { DetectedIntent } from "./intent-detector";
export { detectIntent } from "./intent-detector";
```

---

### Task 1.2: Backend skillId fogadása

**Files:**
- Modify: `src/pages/api/chat.ts`

**Step 1:** Add `skillId` to the request body parsing and use it in `skillRouter`

Change the skill routing logic: if the client sends a `skillId`, use that; otherwise default to `chat-assistant`. The backend will ALSO run intent detection as a fallback/override.

```typescript
// A body parsing után, a skillRouter hívás előtt
import { detectIntent } from "@/lib/chat/intent-detector";

// A POST függvényben, a body parsing után:
const body = await request.json();
const messages: LLMMessage[] = body.messages;
const imageData = body.image;
const optOutTraining = body.optOutTraining === true;
const requestedSkillId = body.skillId as string | undefined;

// --- Intent detection ---
const lastUserMsg = messages.filter(m => m.role === "user").at(-1);
const lastAssistantMsg = messages.filter(m => m.role === "assistant").at(-1);
const userText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

const intent = detectIntent(userText, lastAssistantMsg?.content as string | undefined);

// Skill kiválasztás: a frontend által kért skill-t használjuk, ha van,
// egyébként az intent detection eredményét
const skillId = requestedSkillId || intent.skillId;

// Ha low confidence, és a user tier nem premium, maradunk a chat-assistant-nél
const finalSkillId = (intent.confidence === "low" && user.tier !== "premium")
  ? "chat-assistant"
  : skillId;

const route = skillRouter(finalSkillId, user.tier);
```

**Step 2:** Send back the detected skill in the response so the frontend can display it

```typescript
// A stream végén, a done event-ben adjuk hozzá:
controller.enqueue(
  encoder.encode(
    JSON.stringify({
      conversationId,
      modelUsed: modelLabel,
      skillUsed: finalSkillId,
      done: true,
    }) + "\n"
  )
);
```

---

### Task 1.3: Frontend intent + skill megjelenítés

**Files:**
- Modify: `src/components/ChatInterface.tsx`

**Step 1:** Send `skillId` with the chat request when the intent detector fires

Add a `currentSkill` state variable and run intent detection before sending:

```typescript
const [currentSkill, setCurrentSkill] = useState<string>("chat-assistant");

// handleSubmit-ben, a fetch előtt:
const userText = input.trim();
const intent = detectIntent(userText);
const detectedSkill = intent.skillId;

// Ha változott a skill, frissítjük a UI-t
if (detectedSkill !== currentSkill) {
  setCurrentSkill(detectedSkill);
}

// A fetch body-ban:
body: JSON.stringify({
  conversationId: currentConversationId,
  messages: chatMessages,
  image: imageAttachment,
  optOutTraining,
  skillId: detectedSkill,
}),
```

**Step 2:** Display the active skill in the message area header

```typescript
// Az assistant üzenet fejlécében, a "NEXUS" label mellett:
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
```

Update the `Message` interface to include `skillId`:

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  skillId?: string;
}
```

Add a helper:

```typescript
function skillLabel(skillId: string): string {
  const labels: Record<string, string> = {
    "web-auditor": "Web Audit",
    "copywriter": "Copywriting",
    "chat-assistant": "Chat",
  };
  return labels[skillId] || skillId;
}
```

**Step 3:** Visual feedback when skill changes — show a brief "skill pill" near the input area

```typescript
// A textarea alatt, a tier label előtt:
{currentSkill !== "chat-assistant" && (
  <span className="text-[10px] uppercase tracking-wider bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">
    {skillLabel(currentSkill)}
  </span>
)}
```

---

## 2. Fázis — Konverzáció menedzsment

### Task 2.1: Konverzáció keresés

**Files:**
- Modify: `src/pages/api/conversations.ts`

**Step 1:** Add `q` (search) query parameter support

```typescript
// src/pages/api/conversations.ts

export const GET: APIRoute = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const searchQuery = url.searchParams.get("q");

  let conversations;

  if (searchQuery) {
    // Keresés a címben és az üzenetekben
    conversations = await db
      .select({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
      .from(conversation)
      .where(
        and(
          eq(conversation.userId, session.user.id),
          like(conversation.title, `%${searchQuery}%`)
        )
      )
      .orderBy(desc(conversation.updatedAt))
      .limit(50);
  } else {
    // Eredeti lista (változatlan)
    conversations = await db
      .select({ ... })
      .from(conversation)
      .where(eq(conversation.userId, session.user.id))
      .orderBy(desc(conversation.updatedAt))
      .limit(50);
  }

  return new Response(JSON.stringify({ conversations }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

Note: for SQLite (Turso), `like` is available from drizzle-orm — import `like` from `drizzle-orm`.

**Step 2:** Add search input to the sidebar in ChatInterface.tsx

```typescript
// A sidebar tetején, az "Új beszélgetés" gomb alatt:
<div className="px-3 pb-2">
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => {
      setSearchQuery(e.target.value);
      // Debounced search
    }}
    placeholder="Keresés..."
    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
  />
</div>
```

---

### Task 2.2: Intelligens konverzáció címek

**Files:**
- Modify: `src/pages/api/chat.ts` (a konverzáció létrehozásnál)

**Step 1:** AI-generált cím az első üzenetből

A jelenlegi rendszer az első user üzenet első 80 karakterét használja címként. Ezt kiváltjuk egy AI hívással (cheap — Groq Llama, ingyenes).

```typescript
// Az új konverzáció létrehozásánál:
if (!conversationId) {
  conversationId = crypto.randomUUID();
  const title = await generateTitle(messages, user.tier);
  await db.insert(conversation).values({
    id: conversationId,
    userId: user.id,
    title: title,
    createdAt: now,
    updatedAt: now,
  });
}
```

```typescript
// A fájl végén vagy külön fájlban:
async function generateTitle(messages: LLMMessage[], tier: string): Promise<string> {
  const lastMsg = messages.filter(m => m.role === "user").at(-1);
  const text = typeof lastMsg?.content === "string" ? lastMsg.content.slice(0, 200) : "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Generálj egy rövid (max 5 szavas) címet a felhasználói üzenet alapján. Csak a címet add vissza, semmi mást. Magyarul." },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 20,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const title = data.choices[0]?.message?.content?.trim();
      if (title && title.length < 60) return title;
    }
  } catch {
    // Fallback: első 80 karakter
  }
  return text.slice(0, 80);
}
```

---

### Task 2.3: Beszélgetés pinelés

**Files:**
- Modify: `src/lib/db/schema.ts` (conversation tábla: pinned mező)
- Modify: `src/pages/api/conversations.ts` (pin/unpin endpoint)
- Modify: `src/components/ChatInterface.tsx` (pin UI)

**Step 1:** Add `pinned` field to conversation schema

```typescript
// src/lib/db/schema.ts — a conversation táblában:
export const conversation = sqliteTable("conversation", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Új beszélgetés"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});
```

**Step 2:** Add pin/unpin API endpoint

```typescript
// conversations.ts-ben:
// PATCH — pin/unpin
export const PATCH: APIRoute = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId = url.searchParams.get("id");
  const body = await request.json();
  const pinned = body.pinned === true;

  if (!conversationId) {
    return new Response(JSON.stringify({ error: "Hiányzó conversation id" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const existing = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .limit(1);

  if (existing.length === 0 || existing[0].userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Nem található" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  await db
    .update(conversation)
    .set({ pinned, updatedAt: new Date() })
    .where(eq(conversation.id, conversationId));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

**Step 3:** UI — pin icon in sidebar

```typescript
// A sidebar listában, a törlés gomb mellett:
<span
  onClick={(e) => togglePin(conv.id, !conv.pinned, e)}
  className={`text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
    conv.pinned ? "text-emerald-500 opacity-100" : "text-zinc-600 hover:text-emerald-400"
  }`}
  title={conv.pinned ? "Kipintelve" : "Pinely"}
>
  {conv.pinned ? "📌" : "📍"}
</span>
```

Add `pinned` to the `Conversation` interface and the fetch queries.

---

## 3. Fázis — Chat UI/UX

### Task 3.1: Aktív skill badge + modell info

**Files:**
- Modify: `src/components/ChatInterface.tsx`

**Step 1:** Show active model and skill in the header

```typescript
// A header sávban a sidebar toggle mellett:
<div className="flex items-center gap-2">
  {currentSkill !== "chat-assistant" && (
    <span className="text-[10px] uppercase tracking-wider bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">
      {skillLabel(currentSkill)}
    </span>
  )}
  {lastModelUsed && (
    <span className="text-[10px] text-zinc-600">
      {modelLabel(lastModelUsed)}
    </span>
  )}
</div>
```

**Step 2:** Store `lastModelUsed` from the stream response

```typescript
// A stream feldolgozásánál, ahol a done eventet kezeljük:
if (parsed.modelUsed) {
  setLastModelUsed(parsed.modelUsed);
}
if (parsed.skillUsed) {
  setCurrentSkill(parsed.skillUsed);
}
```

---

### Task 3.2: Streaming typing indicator

**Files:**
- Modify: `src/components/ChatInterface.tsx`

**Step 1:** Add a smooth cursor animation during streaming

Jelenleg a cursor egy egyszerű pulzáló blokk (`animate-pulse`). Cseréljük egy szebb animációra:

```typescript
// A loading állapotban, amikor még nincs token:
{loading && assistantResponse === "" && (
  <div className="flex items-center gap-1.5 py-2">
    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms]" />
    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
    <span className="text-[10px] text-zinc-600 ml-1">gondolkodik</span>
  </div>
)}
```

**Step 2:** Smooth token appearance (fade in new tokens)

A már streamingelt szöveg marad, de az éppen érkező token-ek kaphatnak egy enyhe highlight-ot. Mivel a token-ek folyamatosan frissítik a state-et, ez React-ben automatikusan működik — a pulzáló kurzor elég vizuális visszajelzés.

---

### Task 3.3: Input area — gyors műveletek

**Files:**
- Modify: `src/components/ChatInterface.tsx`

**Step 1:** Add quick action buttons above the input

```typescript
// A textarea felett, a csatolt fájl jelző alatt:
{!attachedDoc && !attachedImage && input === "" && (
  <div className="flex gap-1.5 mb-2 flex-wrap">
    <button
      type="button"
      onClick={() => setInput("Véleményezd a weboldalamat: ")}
      className="text-[10px] bg-zinc-900 border border-zinc-800 hover:border-emerald-700 text-zinc-500 hover:text-emerald-400 px-2 py-1 rounded transition-colors"
    >
      🔍 Weboldal audit
    </button>
    <button
      type="button"
      onClick={() => setInput("Írj egy Facebook posztot erről: ")}
      className="text-[10px] bg-zinc-900 border border-zinc-800 hover:border-emerald-700 text-zinc-500 hover:text-emerald-400 px-2 py-1 rounded transition-colors"
    >
      ✍️ Poszt írása
    </button>
  </div>
)}
```

---

### Task 3.4: Message actions (másolás, újragenerálás)

**Files:**
- Modify: `src/components/ChatInterface.tsx`

**Step 1:** Copy button on assistant messages

```typescript
// Az assistant üzenetekben, a NEXUS label sorában:
{msg.role === "assistant" && msg.content && (
  <div className="flex items-center gap-2 mb-2">
    <div className="text-xs uppercase tracking-wider text-emerald-500">
      NEXUS
    </div>
    <button
      onClick={() => navigator.clipboard.writeText(msg.content)}
      className="text-zinc-600 hover:text-zinc-400 transition-colors ml-auto text-xs"
      title="Másolás"
    >
      📋
    </button>
  </div>
)}
```

---

## Végrehajtási sorrend

| # | Fázis | Task | Becsült idő |
|---|---|---|---|
| 1 | 1 | Intent detector létrehozása | 10 perc |
| 2 | 1 | Backend skillId fogadása | 15 perc |
| 3 | 1 | Frontend intent + skill kijelzés | 15 perc |
| 4 | 2 | Konverzáció keresés (API + UI) | 20 perc |
| 5 | 2 | Intelligens címek (generateTitle) | 15 perc |
| 6 | 2 | Beszélgetés pinelés (schema + API + UI) | 20 perc |
| 7 | 3 | Skill badge + modell info | 10 perc |
| 8 | 3 | Streaming typing indicator | 10 perc |
| 9 | 3 | Gyors műveletek gombok | 10 perc |
| 10 | 3 | Message másolás gomb | 5 perc |

**Teljes becsült idő: ~2 óra**

---

## Ellenőrző lista

- [ ] `pnpm build` — hiba nélkül kompilál
- [ ] Skill auto-detection: URL beillesztése → web-auditor skill
- [ ] Skill auto-detection: "írj egy posztot" → copywriter skill
- [ ] Skill auto-detection: default → chat-assistant
- [ ] Skill badge megjelenik a UI-n
- [ ] Konverzáció keresés működik
- [ ] AI-generált címek működnek (Groq hívás)
- [ ] Pinelés működik (pin/unpin + rendezés)
- [ ] Typing indicator animáció megjelenik
- [ ] Gyors műveletek gombok működnek
- [ ] Másolás gomb működik
