# NEXUS — Fejlesztési terv és roadmap

> **Státusz:** NEXUS chat + site builder élesítve, fizetést fogad (Stripe live). Site builder Pro-only. ÁSZF és Adatkezelési tájékoztató kész és élesben.
> **Fő irány:** AI chat + weboldal készítő magyar kisvállalkozóknak — egyetlen platformon.
> **Domain:** nexus.conendigital.hu
> **Dokumentum típusa:** Végrehajtási terv. Utolsó frissítés: 2026-05-27 (M3 utáni stratégiai újratervezés).

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

### Jogi compliance ✅ (2026-05-27)
- [x] ÁSZF MVP — Ektv. + Ptk. + 45/2014. Korm. rend. hivatkozásokkal, `/aszf` oldalon
- [x] Adatkezelési tájékoztató MVP — GDPR + Infotv. hivatkozásokkal, `/adatvedelem` oldalon
- [x] Footer linkek mindkét dokumentumhoz
- [x] Regisztráció/checkout flow: kötelező checkbox ÁSZF + Adatvédelem elfogadására (validációval)

### Infrastruktúra ✅
- [x] Free tier modell váltás: Llama 4 Scout (`meta-llama/llama-4-scout-17b-16e-instruct`, Groq)
- [x] Landing oldal frissítés: két fő funkció (Chat + Builder), frissített tier leírások
- [x] Árazás oldal frissítés: modellnevek, Premium "Hamarosan" badge
- [x] Navigáció: chat ↔ builder ↔ fiók, útmutató link everywhere

---

## 3. Aktuális helyzet és stratégiai irány

### 3.1. Pénzügyi gátló (őszinte rögzítés)

A multi-tenant publikálás (M5) műszakilag kész lenne, **de** két pénzügyi akadály áll előtte:

- **Vercel Pro ($20/hó) szükséges:** a Hobby tier ToS-e kereskedelmi használatot tilt, és a 50 domain/projekt limit blokkolja a custom domain bekötést. A NEXUS Stripe live módban fogad fizetést → kereskedelmi.
- **Egyéb pénzügyi kötelezettségek (2026 Q2):** autójavítás (250k), hajó átírás + lengyel lajstrom (340k), NAV (200k) — **kb. 1-2 hét anyagi tisztázás szükséges**.

**Döntés:** publikálás (M5) elhalasztva 1-2 hétre. Addig a builder élményén dolgozunk, hogy **mire publikálható, addigra wow-faktorú legyen**.

### 3.2. Stratégiai irány — "wow termék + párhuzamos validáció"

Két hetes fókuszált munka, hogy a publikálás pillanatában a NEXUS site builder ne csak "működjön", hanem **demonstrálható mértékben jobb legyen** a magyar piacon elérhető versenytársaknál.

**Hangsúly:** nem feature-mennyiség, hanem **1-2 jól megválasztott, mélyen kidolgozott élmény-pont**, amitől leesik az álla a usernek.

---

## 4. M3.5 — Builder Wow-faktor (2 hét, 2026-05-28 – 2026-06-10)

### Hét 1 — Élmény-pontok (3 fő feature)

#### F1: Inline szerkesztés az előnézetben (1-2 nap)
- Preview-iframe-ban contenteditable a szöveges elemekre (címsor, leírás, gombszöveg)
- Kattintás → helyben szerkeszthető → blur → state sync → auto-save
- Vizuális visszajelzés: hover effect, szerkesztés közben outline
- **Wow:** a user **azonnal érti**, mit csinál; nincs split-view kognitív váltás
- **Marketing-üzenet:** *"Kattints és írd át — semmilyen menü, semmi tanulás."*
- **Cél felhasználói reakció:** *"Várj, ezt csak így lehet?"*

#### F2: AI szöveg újragenerálás szekciónként (2 nap)
- Minden szekcióban ✨ gomb dropdown-nal: *"rövidebb / hosszabb / hivatalosabb / barátságosabb / szakszerűbb / energikusabb"*
- Backend: új endpoint `/api/builder/regenerate-section`, csak az adott szekció szövegét regenerálja, megőrzi a struktúrát
- Tier-szerinti modell (DeepSeek Pro-nak, Claude Premiumnak)
- Loading state, undo támogatás (az újragenerált tartalom mentés előtt visszavonható)
- **Wow:** az AI itt **finomhangolható eszköz**, nem egyszer-használatos varázspálca
- **Marketing-üzenet:** *"Nem tetszik a hangvétel? Egy kattintás és más."*

#### F3: Mobil/tablet/desktop preview toggle (fél nap)
- Toolbar a preview fölött: 📱 / 📲 / 🖥️ ikonok
- Preview-iframe szélessége vált (375px / 768px / 100%)
- Frame-stílus opcionális (eszköz-kiemelés)
- **Wow:** a "reszponzív" üzenet **vizuálisan** kommunikálódik
- **Bónusz:** csökkenti a későbbi "miért néz ki rosszul mobilon" panaszokat

#### Hét 1 — sikerkritérium
- Mindhárom feature dev-ben él
- Saját teszt: hozz létre egy demo-site-ot **csak az új feature-ökkel**, és vedd fel képernyő-videón az élményt
- Ez lesz a LinkedIn-poszt vizuális anyaga

### Hét 2 — Sablonok + finomítás

#### F4: Iparági sablon galéria (5-6 sablon, 4-5 nap)
- Onboarding: *"Mit csinálsz?"* → kártyák
- Minimum 6 sablon: **fodrász/szépségszalon, autószerelő, étterem/kávézó, masszőr/wellness, szolgáltató iparos (villanyszerelő/víz-gáz), általános vállalkozó**
- Sablon = előre megírt SiteData (szekciók sorrendje, alapszöveg placeholderek, color palette ajánlás, font ajánlás, illusztratív képek opcionálisan)
- AI-generálás: a sablon a vázat adja, az AI a user-specifikus szöveggel tölti fel — **kombinálódik**
- **Wow:** a user nem üres lapról indul, és nem is "tipikus AI-generált" oldalt kap, hanem **iparági standardot**, amit testreszab
- **A legmagasabb konverziós faktor** — az "üres lap fél" probléma megszűnik

#### F5: Smoke test + demo videó (1 nap)
- Teljes flow végigjátszás új tesztfiókokkal
- 30-60 másodperces demo videó (szépségszalon példa, hangalámondás vagy zene)
- LinkedIn-posztra optimalizált, 16:9 vagy 1:1 formátum

#### Hét 2 — sikerkritérium
- 6 sablon megépítve és tesztelve
- Egy 30-60 másodperces demo videó kész
- Minden feature dokumentálva a `/utmutato` oldalon
- 5 validációs beszélgetés rögzítve (lásd 5. fejezet)

---

## 5. Párhuzamos validáció (2 hét, 5 ember)

### 5.1. Cél
A "wow-feature-ök" kódolása mellett **5 valódi célközönséghez tartozó emberrel** beszélni, hogy ne csak a saját ízlésünk alapján fejlesszük a builder-t.

### 5.2. Kit keressünk
- **Nem közeli család**, nem fejlesztő-ismerős
- Kisvállalkozó: fodrász, autószerelő, étterem-tulajdonos, masszőr, iparos, kistermelő, kávézós
- Akinek **most nincs jó weboldala** vagy **régóta tervezi**

### 5.3. Hogyan keressünk
- Helyi Facebook-csoportok (helyi vállalkozók)
- Ismerős → ismerős ajánlás ("tudsz olyat, akinek nincs még weboldala?")
- Helyi kávézó/fodrász, ahova bemész → 5 perces beszélgetés helyben

### 5.4. Mit kérdezünk
1. *Van most weboldalad?* (Igen → milyen csinálta, mennyi volt, miben elégedetlen? | Nem → miért nem volt eddig?)
2. *Mennyit fizetnél havonta, hogy legyen weboldalad, ami magától naprakész marad?*
3. **Mutasd meg a NEXUS-t a jelenlegi állapotában** — sablonok, AI-generálás, inline szerkesztés
4. *Hol akadtál el? Mi volt egyértelmű? Mi nem?*
5. *Ha ma kellene egy weboldalad, ezt kipróbálnád?* (Igen → kéri-e most? | Nem → miért?)

### 5.5. Naplózás (visszatöltés ide a 2 hét végén)

| # | Dátum | Ki | Iparág | Fő tanulság |
|---|-------|-----|--------|-------------|
| 1 | — | — | — | — |
| 2 | — | — | — | — |
| 3 | — | — | — | — |
| 4 | — | — | — | — |
| 5 | — | — | — | — |

### 5.6. Döntési kritérium (2 hét végén)
- **3+ ember mondja:** *"ezt most kipróbálnám"* → **megyünk a M5-re (publikálás)**
- **2-3 ember mondja:** *"érdekes, de hiányzik X"* → **scope-ot változtatunk az M5 előtt**
- **0-1 ember mondja, hogy kipróbálná:** ***megállunk és pozicionálást/csatornát újragondoljuk***

---

## 6. M5 — Multi-tenant publikálás (várakoztatva, ~2026-06-10 után)

> **Feltétel:** anyagilag tisztázódik a Vercel Pro ($20/hó), és az 5 validációs beszélgetésből **3+ "kipróbálnám"** jön ki.

### Tervezett scope (módosítható a validáció alapján)
- **B+ csomag (3-5 nap):**
  - Aldomain publikálás (`vallalkozas.sites.conendigital.hu` vagy új domain alá)
  - Wildcard DNS + Vercel SSL
  - Reserved subdomain lista (`admin, api, www, mail, app, blog, ...`)
  - Astro middleware: subdomain → site lookup → render
  - DB: `site.subdomain UNIQUE`, `site.status (draft|published)`, `site.published_at`
  - "Közzététel" / "Visszavonás" gomb
  - Rate limiting (Upstash Redis — már bekötve, csak aktiválás)
- **Jogi update (fél nap):** ÁSZF + Adatkezelési tájékoztató — tárhelyszolgáltatói felelősség (Ektv. 8-13. §)

### Később (M5b, validáció után, ha indokolt)
- Custom domain bekötés flow (guided onboarding, DNS-poll, Vercel API auto-add)
- Per-regisztrátor screenshot-segédlet (Forpsi, Tárhely.eu, Rackforest)

---

## 7. Builder backlog (validáció-vezérelt prioritás)

> A 2 hét végén a validációs visszajelzések szerint újrarendezzük. Most ami "esetleg":

### UX
- [ ] Drag-and-drop szekció sorrend
- [ ] Szín picker per-elem (CTA gomb színe, kártya háttér)
- [ ] Verziókezelés (korábbi állapot visszatöltése)

### Funkcionális
- [ ] Több weboldal per fiók
- [ ] Egyéni CSS beillesztés (haladó mód) — *valószínűleg nem jön, célközönség nem haladó*
- [ ] Google Analytics / Meta Pixel kód beillesztés — *user-szempontból fontos lehet*

### Szekció bővítések (csak ha kéri valaki)
- [ ] Videó szekció (YouTube/Vimeo embed)
- [ ] Térkép szekció (Google Maps embed)
- [ ] Számláló/countdown szekció

### Egyértelműen NE most
- ❌ Egyéni betűtípus feltöltés (8 Google Font elég)
- ❌ Többnyelvű weboldal generálás (magyar piac)
- ❌ Blog/hírek szekció (nem kisvállalkozói prioritás)
- ❌ Előtte/utána szekció (túl niche)

---

## 8. Keresztmetsző feladatok

### 8.1. Költség és kapacitás
- [x] Free tier: Groq (ingyenes API) → nincs szerver-terhelés
- [ ] Vercel Blob költség monitoring (képtárolás) — nézzünk rá M5 előtt
- [ ] Vercel Pro upgrade — feltétele M5 indulásának
- [ ] Rate limiting aktiválása (M5 előtt KÖTELEZŐ)

### 8.2. Árazás
- [x] Free: 0 Ft — chat only
- [x] Pro: 3 990 Ft/hó — chat + builder + dokumentumok
- [ ] Premium: 5 990 Ft/hó — "Hamarosan" (M3.5 wow-feature-ök Pro-nál is élnek; Premium = Claude minőség)
- [ ] Éves árazás kedvezménnyel — később

### 8.3. Jog/megfelelőség
- [x] ÁSZF, Adatkezelési tájékoztató (MVP, GDPR + Ektv. lefedve)
- [ ] Számlázás: jelenleg manuális (kis volumen), automatizálás csak ha napi 5-6 új előfizető lesz
- [ ] Ektv. tárhelyszolgáltatói felelősség kiegészítés — M5-höz kötve

### 8.4. Biztonság
- [x] Preview iframe: `sandbox="allow-scripts allow-same-origin"`
- [x] Titkok: kulcsok env-ből, `.env.local` gitignore-ban
- [x] Képfeltöltés: formátum + méret validálás, user-izolált Blob path
- [ ] Rate limiting (M5 előtt kötelező — `/api/chat`, `/api/builder/generate`, `/api/builder/regenerate-section`)
- [ ] Tenant-izoláció (M5-nél)

---

## 9. Tech stack összefoglaló

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
| Hosting | Vercel (Hobby — Pro upgrade M5-höz) |
| Dev DB | Turso `dev-nexus` |
| Prod DB | Turso `nexus` |
| Rate limiting | Upstash Redis (bekötve, **még nincs aktív**) |

---

## 10. Elvek

- **Ne hagyd félbe a kész részt egy újért.** A chat él és fizet — minden réteg ráépül.
- **Minden réteg önmagában is megmutatható mérföldkő.**
- **Validálj a nagy beruházások előtt.** A multi-tenant hosting (M5) előtt derüljön ki, hogy a M3.5 wow-faktort használják-e.
- **Az őszinte értéklépcső fontosabb a mesterséges lock-in-nél.**
- **Anyagi gátlót nyíltan elismerünk.** Nem építünk hitelből Shopify-szintű infrastruktúrát egy hobbi projekthez.
- **A "wow" 1-2 mélyen kidolgozott pont, nem 20 középszerű feature.**
- **A célközönséggel beszélni nem opcionális.** A 5 validációs beszélgetés ugyanolyan fontos, mint a 5 új feature.

---

## 11. Naplózás — döntések (2026-05-27)

- **NAV számlaautomatizálás:** elhalasztva — manuális számlázás elég, amíg napi 5-6 fős regisztrációs forgalom nincs.
- **Jogi compliance (ÁSZF + Adatvédelem):** kész és élesben.
- **M5 (multi-tenant publikálás):** elhalasztva ~2026-06-10 utánra, Vercel Pro upgrade feltételétől függően.
- **DNS-stratégia (későbbi):** valószínűleg új domain (`.app` vagy hasonló) + aldomain rendszer, custom domain később. **NEM** vesszük a `cegoldal.hu` / `uzleted.hu` típusú "kínosan magyaros" domaineket.
- **M3.5 wow-fókusz:** 2 hét, F1-F5 feature-ök.
- **Párhuzamos validáció:** 5 ember 2 hét alatt, nem család/fejlesztő.