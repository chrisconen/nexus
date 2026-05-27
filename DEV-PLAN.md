# NEXUS — Fejlesztési terv és roadmap

> **Státusz:** A NEXUS chat-termék élesítve, fizetést fogad (Stripe live).
> **Fő irány:** Site builder magyar kisvállalkozóknak — a chat-termék a közös tier-gerincre épülő második képesség.
> **Dokumentum típusa:** Végrehajtási terv (a "hogyan"). Az üzleti/architektúra "miért"-et a külön termékvázlat (docx) tartalmazza.

---

## 0. Vezérelv — az őszinte értéklépcső

A három tier közti különbség **a modellek valódi képességeiből** fakad, NEM mesterséges butításból. A Free nem azért gyengébb, mert korlátoztuk, hanem mert a mögötte lévő modell ténylegesen kevesebbet tud. Ez tartja a terméket őszintének és a felhasználót elégedettnek.

- Soha ne korlátozz egy funkciót csak azért, hogy a magasabb tier vonzóbb legyen, ha a funkció technikailag menne.
- A differenciálás megengedett dimenziói: **valódi modellképesség** (pl. képértés), **mennyiség** (üzenet/nap, dokumentumhossz), **sablon/funkciókészlet** a builderben.

---

## 1. A közös tier-mátrix (a termék gerince)

Egyetlen előfizetés (Free/Pro/Premium) szabja meg EGYSZERRE a chat- és a builder-képességeket. A meglévő Stripe tier-rendszer a közös alap mindkettő alatt.

| Dimenzió | **Free** | **Pro** | **Premium** |
|---|---|---|---|
| **Chat-modell** | Qwen3 30B (lokális, Ollama) — fallback: Llama 3.3 70B (Groq) | DeepSeek V4-Flash (cloud, 1M kontextus) | Claude Sonnet 4.6 (cloud) |
| **Szöveges chat** | ✅ alap | ✅ gyors, nagy kontextus | ✅ legárnyaltabb |
| **Dokumentum-feldolgozás** (PDF/docx → szöveg) | ❌ vagy erős limit | ✅ közepes hossz | ✅ hosszú dokumentumok |
| **Képértés (vision)** | ❌ | ❌ (modell nem támogatja) | ✅ **Premium-exkluzív, valódi képesség** |
| **Üzenet/nap limit** | szigorú (pl. 10–20) | bőséges (pl. 200) | gyakorlatilag korlátlan |
| **Site builder — sablonok** | 1 alap sablon | több sablon | összes prémium sablon |
| **Site builder — oldalszám** | 1 statikus oldal | több aldoldal | több oldal + prioritás |
| **Saját domain** | ❌ (csak `*.nexus.hu` aldomain) | ✅ saját domain bekötés | ✅ saját domain + prioritás |
| **Dinamikus elemek** (űrlap, foglalás, DB) | ❌ | ❌ vagy alap űrlap | ✅ teljes (Üzleti csomag) |
| **AI-generálás minősége a builderben** | alap (Qwen) | jó (DeepSeek) | legjobb (Claude) |

> **Megjegyzés:** a pontos limitszámok és a Pro/Premium dokumentum-hosszhatárok véglegesítendők a 7. szakasz költség/kapacitás-elemzése alapján.

---

## 2. Azonnali higiénia (gyors, fél napon belül)

Apró, de fontos tételek, amik az élesítés után maradtak:

- [x] **Modell-címke javítása a UI-ban** — a chat fejléce „DEEPSEEK V3"-at ír, miközben a modell `deepseek-v4-flash`. Keresd a `modelLabel`/címke-konstanst (`ChatInterface.tsx` vagy közös konstans), javítsd „DeepSeek V4"-re.
- [x] **Régi teszt-előfizetések lemondása** a Stripe live-ban (a február­i €0.10/€0.50-es Premium subok), ha még maradt.
- [x] **Teszt-fizetés(ek) refundja** a saját élesítési próbából.
- [x] **Külön dev Turso DB létrehozása** — a local (test Stripe) és a prod (live Stripe) jelenleg KÖZÖS DB-t használ. Ez test/live adatkeveredést okoz (ld. a `cus_` test customer hibát). Teendő: új Turso DB devhez, `.env.local` átállítása, `db:push` rá. Prod marad a jelenlegi DB-n.
- [x] **`feature/site-builder` git branch** létrehozása — a `main` maradjon deploy-kész az élesített állapottal.

---

## 3. Chat-oldali tier-funkciók (a mátrix kitöltése)

A builder előtt érdemes a chat-tier funkciókat lezárni, mert ezek a meglévő, működő kódra épülnek és gyors győzelmek.

### 3.1 Dokumentum-feldolgozás (Pro + Premium)
- [x] Fájlfeltöltés UI a chatbe (PDF, docx, txt) — `ChatInterface.tsx`.
- [x] Szerveroldali szövegkinyerés (PDF/docx → plain text) a `chat.ts`-ben, feltöltés-kezelés.
- [x] A kinyert szöveg beillesztése a modell kontextusába (mindkét cloud-modell támogatja).
- [x] Tier-kapu: Free nem, Pro közepes hossz, Premium hosszú. A limitet a tier dönti el.
- [x] Hibakezelés: túl nagy fájl, nem támogatott formátum, üres kinyerés.

### 3.2 Képértés (Premium-only)
- [ ] Képfeltöltés UI (csak Premium usernek látható).
- [ ] A `claude.ts` `content` típusának bővítése `string`-ről `string | ContentBlock[]`-re (image block támogatás).
- [ ] Kép → base64 → Claude `image` content block.
- [ ] Tier-kapu: Pro/Free user szép üzenetet kap („A képértés Premium funkció").

### 3.3 Limitek és mérés
- [ ] Üzenet/nap limit a `usageDaily` táblára építve (már létezik a sémában).
- [ ] Limit-túllépés UI (Free user lássa, mennyi van hátra, és a fejlesztési ajánlatot).

---

## 4. Site builder — RÉTEG 1: generálás + szerkesztés + előnézet

> **Cél:** egy oldal, egy felhasználó, élő előnézet. Még NINCS multi-tenant, NINCS publikálás. Ez a megmutatható v1, amin validálható, hogy a célközönség használja-e.

### 4.1 Adatmodell
- [ ] `site` tábla: id, userId, sablonazonosító, létrehozva/módosítva, státusz (draft).
- [ ] A site tartalma **strukturált adatként** tárolva (JSON): szekciók, szövegek, képhivatkozások, színpaletta. NEM nyers HTML.
- [ ] Object storage a feltöltött képeknek (Cloudflare R2 / Vercel Blob) — a DB csak hivatkozást tárol.

### 4.2 Sablonrendszer
- [ ] 1–2 jól megtervezett, reszponzív „névjegy-weboldal" sablon (hero, szolgáltatások, galéria, kapcsolat, nyitvatartás).
- [ ] A sablon = strukturált séma + renderelő. Egy sablon több színpalettával.
- [ ] Tier szerinti sablonkínálat (ld. mátrix).

### 4.3 AI-generálás (kérdéssorból)
- [ ] Onboarding kérdéssor: vállalkozás típusa, neve, szolgáltatások, elérhetőség, hangnem.
- [ ] Az AI a **sablon adatstruktúráját** tölti ki (szekciók szövegei, javasolt színek) — NEM nyers kódot ad.
- [ ] A generálás minősége tier-függő (Qwen/DeepSeek/Claude). Premium = legjobb szövegek.
- [ ] Logó/kép feltöltés opció (kapcsolódik a 3.2 képkezeléshez).

### 4.4 Helyben szerkesztés (laikus-barát)
- [ ] „Kattints a szövegre, írd át" inline szerkesztés. NEM drag-and-drop.
- [ ] Képcsere, színváltás előre definiált palettából. A szerkezet KÖTÖTT — nem lehet elrontani.
- [ ] Mentés a strukturált adatba.

### 4.5 Élő előnézet (BIZTONSÁG KRITIKUS)
- [ ] Előnézet sandboxolt iframe-ben: `sandbox="allow-scripts"`, **`allow-same-origin` NÉLKÜL**.
- [ ] A preview külön origin-on, elválasztva a NEXUS-app auth-sütijeitől.
- [ ] Reszponzív előnézet (mobil/desktop váltó).

---

## 5. Site builder — RÉTEG 2: publikálás (multi-tenant)

> **Cél:** a `tenant.nexus.hu` élővé tétele. Ez a projekt legnehezebb, leginkább alábecsült része.

### 5.1 Tenant-infrastruktúra
- [ ] Tenant-modell: melyik site melyik aldomainen/domainen él, melyik csomagban.
- [ ] Aldomain-választás/validálás a usernek (`valami.nexus.hu`), foglaltság-ellenőrzés.
- [ ] Publikálás: a strukturált adatból statikus HTML renderelés (CDN-re) — ez az olcsó, gyors út névjegyoldalakhoz.

### 5.2 Wildcard subdomain + SSL
- [ ] `*.nexus.hu` DNS wildcard beállítás.
- [ ] **Vercel-specifikus:** a domaint a Vercel névszerverére állítani (auto wildcard SSL).
- [ ] Kérés-routing: `tenant.nexus.hu` → a helyes tenant tartalma (middleware).

### 5.3 Közzététel-flow
- [ ] „Közzététel" gomb a szerkesztőben → publikál → azonnal él.
- [ ] Újra-publikálás szerkesztés után (verziókezelés/cache-ürítés).
- [ ] Tier-kapu: Free csak `*.nexus.hu`.

---

## 6. Site builder — RÉTEG 3 és 4 (későbbi)

### 6.1 Réteg 3 — Saját domain + SSL (Pro/Premium)
- [ ] Domain-csatolás flow: user CNAME-et állít a regisztrátoránál.
- [ ] Domain-tulajdon ellenőrzés + automatikus SSL generálás.
- [ ] **DÖNTÉSI PONT a kezdés ELŐTT:** ellenőrizni, hogy a tenant saját domének tömeges, automatizált bekötése a friss Vercel-árazáson nem ütközik-e Enterprise-falba. Ha igen → Cloudflare-alapú megoldás mérlegelése a kiszolgált oldalakra.

### 6.2 Réteg 4 — Dinamikus elemek (Üzleti csomag, Premium)
- [ ] Kapcsolatfelvételi űrlap (email-továbbítás, pl. Resend — már be van kötve).
- [ ] Időpontfoglalás (a fodrász/autószerelő tipikus igénye) — tenantonkénti backend-állapot.
- [ ] Mini-adatbázis tenantonként. **Ez nagyságrenddel bonyolultabb** — külön termékág, drágább csomag.

---

## 7. Keresztmetsző feladatok (végig kísérik a launchot)

### 7.1 Költség és kapacitás
- [ ] **Free tier lokális Qwen kockázata:** a lokális modell NEM skálázódik — sok egyidejű Free user megfojtja. Teendő: szigorú Free-limit, és terv arra, ha a Free is cloud-modellre kell, hogy kerüljön (a Groq-fallback már létezik).
- [ ] Hosting valós költségének számítása (tárhely, sávszél, build) → a havidíjnak fedeznie KELL.
- [ ] Platformdöntés finomítása: NEXUS-app Vercelen; a kiszolgált tenant-oldalak skálán esetleg Cloudflare-re (R2 + Pages) költségokokból.

### 7.2 Árazás véglegesítése
- [ ] Csomagárak: Start (statikus), Pro (saját domain), Üzleti (dinamikus). Induló versenyképes ár, siker-alapú emelés.
- [ ] A chat-tier és a builder-tier összehangolása egyetlen előfizetésbe.

### 7.3 Jog/megfelelőség (magyar piac)
- [ ] ÁSZF, Adatkezelési tájékoztató (GDPR) — a felhasználók adatait és a végfelhasználói oldalakat is.
- [ ] Számlázás: a Stripe nem ad magyar NAV-kompatibilis számlát automatikusan — számlázó-integráció (pl. Számlázz.hu/Billingo) mérlegelése.
- [ ] Tartalmi felelősség: a felhasználók által közzétett oldalak moderálási kerete.

### 7.4 Biztonság (folyamatos)
- [ ] Minden generált/szerkesztett/közzétett tartalom = felhasználói tartalom → sandbox/izoláció (ld. 4.5).
- [ ] Tenant-izoláció: egy user soha ne férjen másik tenant adatához.
- [ ] Titkok kezelése: kulcsok kizárólag env-ből, soha a repóban.

---

## 8. Javasolt végrehajtási sorrend (mérföldkövek)

1. **M0 — Higiénia** (2. szakasz): modell-címke, dev DB szétválasztás, feature branch. *(fél nap)*
2. **M1 — Chat dokumentum-feldolgozás** (3.1): gyors érték, meglévő kódra épül. *(napok)*
3. **M2 — Chat képértés Premium-only** (3.2): a tier-differenciálás kézzelfogható bizonyítéka. *(napok)*
4. **M3 — Builder Réteg 1** (4. szakasz): generálás + szerkesztés + előnézet. A nagy „wow". *(hetek)*
5. **M4 — Validáció:** 2–3 valódi kisvállalkozónak megmutatni, MIELŐTT a multi-tenantra mész.
6. **M5 — Builder Réteg 2** (5. szakasz): publikálás `*.nexus.hu`-ra. *(hetek)*
7. **M6 — Soft launch:** néhány valódi ügyfél, statikus oldalakkal, havidíjjal.
8. **M7 — Réteg 3** (saját domain) és **Réteg 4** (dinamikus) igény szerint, fizető ügyfelek alapján.

---

## 9. Elvek, amik végig érvényesek

- **Ne hagyd félbe a kész részt egy újért.** A NEXUS chat él és fizet — minden réteg ráépül, nem helyettesíti.
- **Minden réteg önmagában is megmutatható mérföldkő.** Ha leállsz, akkor is van működő termék.
- **Az agentikus eszköz (opencode) a kódírást gyorsítja, NEM az architektúrát dönti el.** A multi-tenant/SSL/domain döntéseket előre, kézzel kell meghozni — ez a dokumentum erről a térkép.
- **Validálj a nagy beruházások előtt.** Mielőtt hónapokat tennél a hostingba, derüljön ki, hogy a célközönség használja-e a Réteg 1-et.