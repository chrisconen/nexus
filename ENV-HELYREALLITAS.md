# Env kulcsok helyreállítása — checklist

> Készült: 2026-07-02, a .env.local véletlen törlése után.
> **Fontos tanulság:** a Vercel-ben az env változók "Sensitive" módban vannak,
> ezért onnan NEM letölthetők (`vercel env pull` üres értékeket ad).
> Az éles oldal ettől még hibátlanul fut — a Vercel belül ismeri az értékeket.
> A lista a LOKÁLIS fejlesztéshez szükséges kulcsok pótlásáról szól.

## Állapot

- [x] `.env.local` váz újraépítve (URL-ek, modellnevek, BETTER_AUTH_SECRET megvan)
- [x] Vercel projekt újralinkelve (`conen-digital-s-projects/nexus`)
- [x] Git repó újrainicializálva és összekötve (`chrisconen/nexus`)
- [ ] Turso token
- [ ] Groq API kulcs
- [ ] DeepSeek API kulcs
- [ ] Anthropic API kulcs
- [ ] Stripe teszt kulcsok
- [ ] Resend API kulcs
- [ ] Blob token

## Kulcsonként — hol szerezd be (mindegyik ~1-2 perc)

### 1. Turso (kötelező — enélkül a dev szerver el sem indul)
https://app.turso.tech → Databases → **dev-nexus** (fejlesztéshez ezt, NE az éles `nexus`-t!)
- URL: a DB oldalán látható (`libsql://dev-nexus-chrisconen...`)
- Token: "Generate Token" gomb (lejárat: no expiration)
- Írd be: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- A `.env.local`-ban most a régi ÉLES `nexus` DB URL-je van érvénytelen tokennel — cseréld le mindkettőt.

### 2. Groq (kötelező a Free tier chathez — ingyenes)
https://console.groq.com/keys → "Create API Key" → `GROQ_API_KEY`

### 3. DeepSeek (Pro tier chat + builder)
https://platform.deepseek.com/api_keys → új kulcs → `DEEPSEEK_API_KEY`

### 4. Anthropic Claude (Premium tier — most jégen, ráér)
https://console.anthropic.com/settings/keys → új kulcs → `ANTHROPIC_API_KEY`

### 5. Stripe — FIGYELEM
Lokális fejlesztéshez **TESZT módú** kulcsot használj:
- https://dashboard.stripe.com/test/apikeys → Secret key (sk_test_...) → `STRIPE_SECRET_KEY`
- Teszt price ID-k: https://dashboard.stripe.com/test/products (ha nincsenek, hozz létre teszt Pro/Premium terméket)
- Webhook lokálisan: `stripe listen --forward-to localhost:4321/api/stripe-webhook` → a kiírt `whsec_...` → `STRIPE_WEBHOOK_SECRET`

**SOHA ne nyomj "Roll key"-t az éles (live) kulcsra** — az azonnal érvényteleníti a Vercelen futó éles oldal kulcsát, és leáll a fizetés! Az éles kulcs megtekintéséhez a "Reveal live key" elég.

### 6. Resend (email verifikáció)
https://resend.com/api-keys → "Create API Key" → `RESEND_API_KEY`
(A régi kulcs nem visszanézhető, de nyugodtan hozz létre újat — a régi a Vercelen tovább él.)

### 7. Vercel Blob (builder képfeltöltés) — MEGOLDVA OIDC-vel (2026-07-02)
A `BLOB_READ_WRITE_TOKEN` is "sensitive", CLI-vel nem letölthető. Helyette lokálisan
**OIDC-hitelesítés** megy: a `.env.local`-ban `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`,
a `builder-upload.ts` pedig ezt használja, ha nincs RW token. Élesben változatlanul
az RW token él (a Vercel injektálja).

**Ha a képfeltöltés újra 500-at dob** (az OIDC token ~12 óra után lejár):
```
npx vercel env pull .env.oidc --environment=development
```
→ az új `VERCEL_OIDC_TOKEN` sort másold át a `.env.local`-ba, a fájlt töröld.

**Tartós alternatíva:** Vercel dashboard → Storage → Blob store → token kimásolása
a `BLOB_READ_WRITE_TOKEN` sorba — akkor az OIDC-frissítgetés szükségtelen.

## Ellenőrzés

```
pnpm dev
```
→ http://localhost:4321 — regisztráció/belépés próba (Turso + Better Auth),
chat próba (Groq), builder generálás próba (DeepSeek — Pro teszt fiókkal).

## Hogy többé ne fordulhasson elő

1. A `.env.example` mostantól a repóban van — a nevek sosem vesznek el.
2. A kulcsok "mester példányát" tartsd jelszókezelőben (pl. Bitwarden, ingyenes) — a .env.local csak másolat legyen.
3. Fontold meg a Vercel env-ek "Sensitive" jelölésének kikapcsolását az újonnan felvett kulcsoknál — akkor a `vercel env pull` legközelebb visszaadná őket. (Biztonsági trade-off: aki hozzáfér a Vercel fiókhoz, láthatja az értékeket.)
