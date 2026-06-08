# Nexus — AI Agent Context

## Stack
- **Astro** + React + Tailwind (frontend)
- **Better Auth** (session auth)
- **Drizzle ORM** + **Turso** (libsql) — SQLite-kompatibilis felhős DB
- **Vercel** serverless deployment (Node.js runtime)
- **Stripe** (live éles fizetés)

## Adatbázisok
- **Dev DB:** `libsql://dev-nexus-chrisconen.aws-eu-west-1.turso.io` (`.env.local`)
- **Prod DB:** `libsql://nexus-chrisconen.aws-eu-west-1.turso.io` (Vercel env vars)
- `drizzle.config.ts` a `.env.local`-t tölti be → `drizzle-kit push` alapból a DEV DB-re megy
- A prod sémát külön kell push-olni (lásd: prod séma push szekció lentebb)

## Vercel serverless — kritikus viselkedés

**A legfontosabb gotcha:** Vercel serverless funkciók leállnak amint a Response lezárul.

```ts
// ❌ ROSSZ — fire-and-forget a stream után SOHA nem fut le Vercelen
controller.close();
saveToDatabase().catch(console.error); // ← Vercel itt leállítja a functiont

// ✅ JÓ — await a close() ELŐTT, amíg a stream nyitva van
await saveToDatabase().catch(console.error);
controller.close();
```

Ez vonatkozik minden `ReadableStream`-re, SSE-re, és streaming response-ra.

## Hibakeresési checklist — "prodban nem működik" esetén

1. **DB séma szinkron?** A prod DB-ben megvannak az összes tábla és oszlop?
   - Ellenőrzés: Turso REST API vagy `drizzle-kit push` prod credentials-szel
   - Ha hiányzik oszlop: `drizzle-kit push --force` prod env-vel

2. **Silent error swallowing?** Keress `.catch(e => console.error(e))` mintákat kritikus útvonalakon — a hiba elnémul, a feature csendben nem működik.

3. **Async a stream után?** Minden DB/API hívás a stream bezárása ELŐTT fusson (await).

4. **Env vars Vercelen?** A `.env.local` NEM kerül fel Vercelre — minden szükséges változót manuálisan kell beállítani a Vercel dashboardon.

## DB migration workflow

**SOHA ne használj `drizzle-kit push`-t — csak `generate` + `migrate`.**

### Sémaváltoztatás lépései

```bash
# 1. Migration SQL generálása (csak dev configból, nem fut DB-re)
pnpm db:generate

# 2. Ellenőrizd a generált SQL-t: drizzle/<timestamp>_<name>.sql
# 3. Commitold a migration fájlt git-be

# 4. Dev DB-re alkalmazás
pnpm db:migrate

# 5. Prod DB-re alkalmazás (Vercel env vars kellenek)
TURSO_DATABASE_URL=libsql://nexus-chrisconen.aws-eu-west-1.turso.io \
TURSO_AUTH_TOKEN=<prod_token> \
pnpm db:migrate:prod
```

### Prod token lekérése (ha szükséges)

```bash
# Turso Management API tokennel (TURSO_API_TOKEN a Vercel dashboardon)
curl -X POST https://api.turso.tech/v1/organizations/chrisconen/databases/nexus/auth/tokens \
  -H "Authorization: Bearer <TURSO_API_TOKEN>"
```

## Tier rendszer
- `free` → Groq (Llama 4 Scout)
- `pro` → DeepSeek V4-Flash + file upload (PDF/DOCX/TXT)
- `premium` → Claude Sonnet 4.6 + képfeltöltés (vision)

## Kulcsfájlok
- `src/pages/api/chat.ts` — chat endpoint, stream + DB mentés
- `src/pages/api/conversations.ts` — CRUD conversations lista
- `src/lib/db/schema.ts` — összes DB tábla
- `src/lib/db/index.ts` — Drizzle kliens (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)
- `src/lib/llm/skills/` — skill routing logika
- `src/components/ChatInterface.tsx` — chat UI
- `src/components/SiteBuilder.tsx` — site builder UI
