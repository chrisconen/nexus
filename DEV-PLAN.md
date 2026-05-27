# NEXUS — Fejlesztési terv és roadmap

> **Státusz:** NEXUS chat + site builder élesítve, fizetést fogad (Stripe live). Site builder Pro-only.
> **Fő irány:** AI chat + weboldal készítő magyar kisvállalkozóknak — egyetlen platformon.
> **Domain:** nexus.conendigital.hu
> **Dokumentum típusa:** Végrehajtási terv. Utolsó frissítés: 2026-05-27.

---

## 0. Vezérelv — az őszinte értéklépcső

A három tier közti különbség **a modellek valódi képességeiből** fakad, NEM mesterséges butításból.

- Soha ne korlátozz egy funkciót csak azért, hogy a magasabb tier vonzóbb legyen, ha a funkció technikailag menne.
- A differenciálás megengedett dimenziói: **valódi modellképesség** (pl. képértés), **funkcióhozzáférés** (builder Pro-only), **AI minőség**.

---

## 1. A közös tier-mátrix (aktuális állapot)

| Dimenzió | **Free** | **Pro (3 990 Ft/hó)** | **Premium (5 990 Ft/hó)** |
|---|---|---|---|
| **Chat-modell** | Llama 4 Scout (Groq, 512k kontextus) | DeepSeek V4-Flash (1M kontextus) | Claude Sonnet 4.6 |
| **Szöveges chat** | ✅ korlátlan | ✅ korlátlan | ✅ korlátlan |
| **Dokumentum-feldolgozás** (PDF/DOCX/TXT) | ❌ | ✅ max 50k karakter | ✅ max 200k karakter |
| **Képértés (vision)** | ❌ | ❌ | ✅ Claude vision |
| **Site builder** | ❌ | ✅ **teljes hozzáférés** | ✅ teljes + jobb AI minőség |
| **Képfeltöltés (builder)** | ❌ | ✅ Vercel Blob | ✅ Vercel Blob |
| **HTML letöltés** | ❌ | ✅ | ✅ |
| **AI-generálás minősége** | — | jó (DeepSeek) | legjobb (Claude) |

---

## 2. Elkészült mérföldkövek ✅

### M0 — Higiénia ✅
- [x] Modell-címke javítása (DeepSeek V4 Flash)
- [x] Régi teszt-előfizetések lemondása (Stripe)
- [x] Teszt-fizetések refundja
- [x] Külön dev Turso DB (`dev-nexus`) — prod (`nexus`) érintetlen
- [x] `feature/site-builder` branch → mergeltük main-be

### M1 — Chat dokumentum-feldolgozás ✅
- [x] Fájlfeltöltés UI (📎 gomb, Pro/Premium only)
- [x] PDF (pdf-parse), DOCX (mammoth), TXT szövegkinyerés
- [x] Tier-kapu: Free ❌, Pro 50k, Premium 200k karakter
- [x] Hibakezelés: túl nagy fájl, nem támogatott formátum

### M2 — Chat képértés ✅
- [x] Képfeltöltés UI (Premium-only, accept lista + backend kapu)
- [x] Claude `ClaudeContentBlock` típus (text + image)
- [x] Kép → base64 → Claude vision content block
- [x] Kétszintű tier-kapu: frontend + backend 403

### M3 — Site Builder Réteg 1 ✅
- [x] **Adatmodell:** `site` tábla, strukturált JSON (SiteData), Vercel Blob képtárolás
- [x] **13 szekciótípus:** hero, szolgáltatások, rólunk, galéria, kapcsolat, vélemények, csapat, kiemelt ajánlatok, GYIK, CTA, statisztikák, árazás, partner logók
- [x] **AI-generálás:** onboarding kérdéssor → tier-alapú modell → SiteData
- [x] **Split-view szerkesztő:** szekciólista + szekció editor + élő preview
- [x] **UX:** auto-save (2s), undo/redo (Ctrl+Z/Y, 30 lépés), toast értesítések, szekció duplikálás, újragenerálás
- [x] **Stílusok:** 8 színpaletta, 8 Google Font, per-szekció háttér/szövegszín/igazítás/padding/margin
- [x] **25 SVG ikon** (Lucide-stílus) a szolgáltatás kártyákhoz
- [x] **Képfeltöltés:** Vercel Blob, WebP/AVIF/PNG/JPEG, max 5MB, tényleges törlés
- [x] **SEO:** meta title, description, OG tags szerkeszthető
- [x] **Footer:** social media linkek SVG ikonokkal (FB, IG, TikTok, YT, LinkedIn, X, GitHub, Web)
- [x] **Formspree:** kapcsolati űrlap integráció endpoint URL-lel
- [x] **HTML letöltés:** önálló, reszponzív fájl, bárhol hostolható
- [x] **Dokumentáció:** `/utmutato` oldal, sidebar navigáció, keresés, 26 szekció
- [x] **Pro-only kapu:** Free user → árazás oldalra redirect
- [x] **Bug report:** fix pozíciójú gomb minden oldalon → GitHub Issues

### Infrastruktúra ✅
- [x] Free tier modell váltás: Llama 4 Scout (`meta-llama/llama-4-scout-17b-16e-instruct`, Groq)
- [x] Landing oldal frissítés: két fő funkció (Chat + Builder), frissített tier leírások
- [x] Árazás oldal frissítés: modellnevek, Premium "Hamarosan" badge
- [x] Navigáció: chat ↔ builder ↔ fiók, útmutató link everywhere

---

## 3. Következő lépések (prioritás sorrendben)

### M4 — Validáció (MOST)
> **A legfontosabb lépés:** Mielőtt bármit tovább fejlesztünk, validálni kell, hogy a célközönség használja-e.

- [ ] 2-3 valódi kisvállalkozónak megmutatni a terméket
- [ ] Feedback gyűjtés: mit használnak, mit nem, mi hiányzik
- [ ] Builder UX megfigyelés: hol akadnak el, mi nem intuitív
- [ ] Döntés: merre tovább a feedback alapján

### M5 — Builder Réteg 2: Publikálás (multi-tenant)
> **Cél:** `vallalkozas.nexus.hu` — élő weboldal egyetlen kattintással.

- [ ] Tenant-modell: site ↔ subdomain mapping
- [ ] Aldomain-választás/validálás (`valami.nexus.hu`)
- [ ] `*.nexus.hu` DNS wildcard + Vercel auto SSL
- [ ] Middleware: `tenant.nexus.hu` → helyes site HTML kiszolgálása
- [ ] "Közzététel" gomb a szerkesztőben
- [ ] Cache-kezelés újra-publikálásnál

### M6 — Soft launch
- [ ] Néhány valódi ügyfél, statikus oldalakkal, havidíjjal
- [ ] Monitoring: költségek, használat, hibák

### M7 — Saját domain + dinamikus elemek (igény alapján)
- [ ] Domain-csatolás flow (CNAME + SSL)
- [ ] **DÖNTÉSI PONT:** Vercel-árazás ellenőrzése tömeges domain bekötésnél
- [ ] Időpontfoglalás (fodrász/autószerelő tipikus igény)
- [ ] Kapcsolatfelvételi űrlap email-továbbítással (Resend már bekötve)

---

## 4. Builder továbbfejlesztési backlog

> Ezek a validáció (M4) utánra, prioritás a feedback alapján.

### UX fejlesztések
- [ ] Drag-and-drop szekció sorrend
- [ ] Kép preview az editorban (nagyobb thumbnail)
- [ ] Mobil-first szerkesztő (jelenleg desktop-optimalizált)
- [ ] Inline szerkesztés az előnézetben (kattints a szövegre, írd át)
- [ ] Szín picker per-elem (CTA gomb színe, kártya háttér)

### Funkcionális bővítések
- [ ] Több weboldal per fiók
- [ ] Verziókezelés (korábbi állapot visszatöltése)
- [ ] Egyéni betűtípus feltöltés
- [ ] Egyéni CSS beillesztés (haladó mód)
- [ ] Többnyelvű weboldal generálás
- [ ] AI szöveg újragenerálás szekciónként (nem az egész oldal)
- [ ] Sablon galéria (előre definiált iparágspecifikus sablonok)
- [ ] Google Analytics / Meta Pixel kód beillesztés

### Szekció bővítések
- [ ] Videó szekció (YouTube/Vimeo embed)
- [ ] Térkép szekció (Google Maps embed)
- [ ] Blog/hírek szekció
- [ ] Számláló/countdown szekció
- [ ] Előtte/utána szekció (képösszehasonlítás)

---

## 5. Keresztmetsző feladatok

### 5.1 Költség és kapacitás
- [x] Free tier: Groq (ingyenes API) → nincs szerver-terhelés
- [ ] Vercel Blob költség monitoring (képtárolás)
- [ ] Hosting költség vs. havidíj kalkuláció
- [ ] Platformdöntés tenant-oldalakra: Vercel vs. Cloudflare (R2 + Pages)

### 5.2 Árazás
- [x] Free: 0 Ft — chat only
- [x] Pro: 3 990 Ft/hó — chat + builder + dokumentumok
- [ ] Premium: 5 990 Ft/hó — "Hamarosan" (chat + builder + vision + prémium sablonok)
- [ ] Éves árazás kedvezménnyel

### 5.3 Jog/megfelelőség (magyar piac)
- [ ] ÁSZF, Adatkezelési tájékoztató (GDPR)
- [ ] Számlázó-integráció (Számlázz.hu/Billingo) — Stripe nem ad NAV-kompatibilis számlát
- [ ] Tartalmi felelősség: user-generated oldalak moderálása

### 5.4 Biztonság
- [x] Preview iframe: `sandbox="allow-scripts allow-same-origin"`
- [x] Titkok: kulcsok env-ből, `.env.local` gitignore-ban
- [x] Képfeltöltés: formátum + méret validálás, user-izolált Blob path
- [ ] Tenant-izoláció (M5-nél): user soha ne férjen más site adatához
- [ ] Rate limiting (Upstash Redis — már bekötve, de nincs használva)

---

## 6. Tech stack összefoglaló

| Réteg | Technológia |
|-------|------------|
| Framework | Astro 6 + React 19 |
| Stílus | Tailwind CSS 4 |
| DB | Turso (libsql) + Drizzle ORM |
| Auth | Better Auth |
| Fizetés | Stripe (live) |
| AI — Free | Llama 4 Scout (Groq) |
| AI — Pro | DeepSeek V4 Flash |
| AI — Premium | Claude Sonnet 4.6 (Anthropic) |
| Képtárolás | Vercel Blob |
| Email | Resend |
| Hosting | Vercel |
| Dev DB | Turso `dev-nexus` |
| Prod DB | Turso `nexus` |

---

## 7. Elvek

- **Ne hagyd félbe a kész részt egy újért.** A chat él és fizet — minden réteg ráépül.
- **Minden réteg önmagában is megmutatható mérföldkő.**
- **Validálj a nagy beruházások előtt.** A multi-tenant hosting előtt derüljön ki, hogy a Réteg 1-et használják-e.
- **Az őszinte értéklépcső fontosabb a mesterséges lock-in-nél.**
