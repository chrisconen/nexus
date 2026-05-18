# NEXUS AI — Stratégiai irány és Nap 4-12 terv

**Készült:** 2026. május 18. (Nap 3 vége)
**Státusz:** Live MVP — auth + chat + Ollama Qwen 30B-A3B működik production-ben

---

## Két különálló termék — tisztázás

| Termék | URL | Státusz | Cél |
|---|---|---|---|
| **NEXUS AI Conen Digital asszisztens** | nexus.conendigital.hu | Kész, működik | Conen Digital sales-flow, pre-qualifikáció a 4 md fájl alapján |
| **NEXUS AI nagy LLM projekt** | nexus-self-eight.vercel.app | MVP kész (Nap 3) | Univerzális chat asszisztens magyarul, weboldal-kódolás fő use case-ként |

Ez a dokumentum **a Termék 2-ről** szól.

---

## Pozicionálás — fő döntések

### Mi a NEXUS AI (Termék 2)
- **Univerzális magyar AI chat asszisztens**
- **Tier hierarchia:** Free (Qwen 30B-A3B lokális) / Pro (DeepSeek V3) / Premium (Claude Sonnet)
- **Egyik fő use case: weboldal-kódolás** (bolt.diy / Lovable / v0.dev mintára, magyar fókusszal)

### Mi NEM (target market clarification)
- **Nem fejlesztőknek** szól, mint a v0.dev vagy Cursor
- A cél a **magyar mikrovállalkozó** (fodrász, asztalos, étterem, kisvállalkozás), aki sose hallott a React-ról
- Üzenet: "te is csinálhatsz weboldalt 5 perc alatt", nem "AI coding assistant for developers"

### Versenyelőny
1. **Magyar nyelv** (Lovable, v0, bolt nem értenek magyarul jól)
2. **Magyar üzleti kontextus** (NAV, ÁFA, GLS, ÁSZF, hazai szolgáltatók ismerete)
3. **Saját GPU hosting** (alacsony marginális költség)
4. **Conen Digital agency tapasztalat** (15+ év, érted mit akarnak az ügyfelek)

### Mi NEM versenyelőny
- **Nem a modell minősége** — a Qwen 30B-A3B jó, de nem a Claude Sonnet vagy GPT-5 ligája
- Komplex feladatoknál (dashboard state-management, bonyolult API integrációk) a Qwen elakad

---

## Scope-vágás döntés a 12 napos sprintre

**Két opció, ELDÖNTENDŐ a Nap 4 elején:**

### Opció A: MVP fókusz, fizetési tier-ek nélkül
- Csak Free tier (Qwen)
- Chat + weboldal-kódolás + élő preview
- Stripe / Pro / Premium **nincs** a 12 napos sprintben
- **Manual SaaS** megközelítés: ha valaki Pro-ra akar lépni, manuálisan kezeled a DB-ben az első 1-2 hétben
- **Előny:** gyorsabb launch, első valós felhasználói visszajelzés
- **Hátrány:** nincs azonnali bevétel

### Opció B: Multi-tier fókusz, weboldal-kódolás nélkül
- Free + Pro + Premium tier-ek mind
- Stripe integráció, billing automation
- Univerzális chat funkció (nincs speciális weboldal-kódolás flow)
- **Előny:** azonnal bevételezhető termék
- **Hátrány:** nincs differentiator a piacon, csak egy újabb "ChatGPT magyarul" lesz

**Az ajánlás: Opció A.** A differentiator a fontos első körben. A Stripe utólag is jön.

---

## Architektúra-figyelmeztetések

### Single-point-of-failure: Z440 + RTX 3090

- **A teljes Free tier infrastruktúra egy GPU-n fut**
- Áramszünet / driver crash / Windows Update → Free tier offline
- Concurrent kapacitás: kb. 1-2 user egyszerre (Qwen 17 sec/válasz)
- 10+ concurrent user esetén percekig vár

**Mitigáció:**
- Explicit válaszidő-ígéret a Free tier-en (UI-on: "Free tier: 15-30 sec, csúcsidőben lassabb")
- Vagy a default model legyen `gemma4:e4b` (8 sec/válasz, kisebb VRAM, több concurrent)
- Queue rendszer — később, ha tényleg lesz forgalom

### Infrastruktúra-debug költség

- Nap 1-3 alatt 3-4 óra elment infra-debug-ra (Cloudflare Tunnel, Ollama runner, WSL networking)
- Várható hasonló rabbit-hole-ok: Stripe webhooks (Nap 7 körül)
- Ezért a Stripe-ot **Nap 9-10-re** halasztjuk, nem korábbra

---

## Nap 4-12 frissített terv (Opció A alapján)

| Nap | Fő feladat | Deliverable |
|---|---|---|
| **4** | Multi-chat sidebar + markdown rendering fix | Több beszélgetés, váltható; **bold** formattálva |
| **5** | Weboldal-kódolás flow: live preview iframe + kód letöltés | Chat → HTML kód → iframe-ben élő preview |
| **6** | DeepSeek API integráció (Pro tier alapja) + sablon-galéria | Pro tier használható, példák szekcióval |
| **7** | Claude API integráció (Premium) + példa-galéria bővítés | Mind a 3 tier működik, gallery 5-10 példával |
| **8** | **Puffer nap** — semmi új feature, csak polish & bugfix | Konzisztens UX, mobil-responsiveness |
| **9** | Rate-limit Free tier-en (20 üzenet/nap) + Stripe checkout setup | Limit kényszerítés, Stripe basics |
| **10** | Stripe webhook + tier auto-frissítés | Vásárlás után tier=pro automatikus |
| **11** | ÁSZF, GDPR, cookie consent | Jogi minimum kész |
| **12** | Domain átirányítás (vagy önálló domain), production polish | Production-ready |
| **13-14** | **Launch előkészítés** (nem fejlesztés) | LinkedIn post, első 5-10 beta tester behívása |

---

## Pszichés / sustainability szabályok

1. **Minden napnak van MINIMUM deliverable-je.** Ha kész, **nem dolgozunk tovább azon a napon**.
2. **Nap 8 = puffer.** Nem új feature, csak debug. Pszichésen kötelező.
3. **Nem launch-olunk Nap 12-én.** Két nap launch-előkészítés.
4. **Ha egy nap csak infra-debug megy, az is OK** — a feature-t másnap folytatjuk.

---

## Open question: branding

A Centaur / Conen Digital / NEXUS név-zűrzavar later eldöntendő:
- Hosszú távon: NEXUS önálló domain (`nexusai.hu` vagy hasonló)? Vagy marad subdomain?
- "Made by Conen Digital" footer minimum, de a termék független brand
- **Most még nem kell eldönteni**, csak felmerülő kérdés

---

## Konkrét következő lépés (Nap 4 eleje)

1. **Eldönteni Opció A vagy Opció B**
2. **Markdown rendering fix** (30 perc, függetlenül attól melyik opció)
3. **Multi-chat sidebar** (chat history a bal oldalon, "Új beszélgetés" gomb)
4. **Aztán** kezdjük a weboldal-kódolás flow-t (Nap 5-6)

---

**Verziókövetés:** Ez egy élő dokumentum. Ha a piacból visszajelzés jön, vagy infra változik, frissíteni kell.
