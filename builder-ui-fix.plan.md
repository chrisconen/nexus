# SiteBuilder UI — Kontraszt + panel + fullscreen fix terv

> **Cél:** A builder szerkesztőfelület (NEM a generált weboldal) olvashatóságának és használhatóságának javítása.
> **Fontos:** Ez kizárólag a `SiteBuilder.tsx` Tailwind class-eit érinti. A `render.ts`-hez NEM nyúlunk (az a generált oldal, az külön ügy — az a 4. prioritás, külön kezeljük).
> **A Claude Code-nak szól. Sorszámok a feltöltött 886 soros SiteBuilder.tsx alapján.**

---

## Prioritás 1 — Kontraszt / olvashatóság

### A probléma gyökere (szisztematikus, nem egyedi)

A builder UI a `text-zinc-500` (#71717a) és `text-zinc-600` (#52525b) árnyalatokat használja feliratokra, segédszövegekre és ikonokra, sötét (`zinc-900/950`) háttéren. Kontraszt-arányok:

| Class | Hex | Kontraszt sötét háttéren | WCAG AA (4.5:1) |
|-------|-----|--------------------------|-----------------|
| `text-zinc-600` | #52525b | ~2.3:1 | ❌ megbukik |
| `text-zinc-500` | #71717a | ~3.5:1 | ❌ megbukik (kis szöveg) |
| `text-zinc-400` | #a1a1aa | ~6.4:1 | ✅ megfelel |
| `text-zinc-300` | #d4d4d8 | ~10:1 | ✅ kényelmes |

**A szabály:** a builder UI-ban a `text-zinc-600` és `text-zinc-500` szinte mindenhol egy szinttel világosabbra cserélendő. NEM kell egyedileg gondolkodni — egy szisztematikus emelés a megoldás.

### A csere-szabály (globális)

| Jelenlegi | Új | Mire |
|-----------|-----|------|
| `text-zinc-600` | `text-zinc-400` | feliratok, ikonok, segédszöveg, `#1` indexek |
| `text-zinc-500` | `text-zinc-400` | label-ek, segédszövegek, leírások |
| `text-zinc-500` (aktív/fontos label) | `text-zinc-300` | szekció-tab feliratok, fő label-ek |
| `disabled:text-zinc-700` | `disabled:text-zinc-600` | letiltott gombok (ezek MARADJANAK halványak, de egy hajszállal láthatóbbak) |
| `hover:text-zinc-400` | `hover:text-zinc-200` | hover állapot — legyen markánsabb |
| `hover:text-zinc-300` | `hover:text-zinc-100` | hover állapot |

### Konkrét sorok, ahol cserélni kell

**FONTOS:** ne vakon keress-cserélj az egész fájlban, mert néhány `text-zinc-*` legitim (pl. `bg-zinc-800 text-zinc-300` aktív állapot — az jó). Az alábbi sorok azok, ahol a **felirat/segédszöveg/ikon** halvány. Sorszám szerint:

**Toolbar (felső sáv) — 369-399:**
- `369`: `text-zinc-500` → `text-zinc-400` (NEXUS Builder felirat)
- `372,373`: undo/redo gombok `text-zinc-500 hover:text-zinc-300` → `text-zinc-400 hover:text-zinc-100`; a `disabled:text-zinc-700` → `disabled:text-zinc-600`
- `378`: desktop/mobil toggle inaktív `text-zinc-600 hover:text-zinc-400` → `text-zinc-400 hover:text-zinc-200`
- `385`: "Automatikusan mentve" felirat `text-zinc-600` → `text-zinc-400`
- `390,394`: Újragenerálás / Letöltés gombok `text-zinc-500` → `text-zinc-300`, és a `border-zinc-800` → `border-zinc-600` (hogy a gomb-keret is látszódjon)
- `398,399`: a `?` és `Chat` `text-zinc-500 hover:text-zinc-300` → `text-zinc-300 hover:text-zinc-100` (a `?`-ről lásd a 3. prioritást is)

**Szekciók/Stílusok tab — 407-408:**
- inaktív tab `text-zinc-500` → `text-zinc-400`

**Szekció-lista sor-ikonok (▲▼⧉●✕) — 424-428:**
- mind `text-zinc-600` → `text-zinc-400`; a hover-eket tartsd meg (`hover:text-zinc-300` → `hover:text-zinc-100`, `hover:text-emerald-400` és `hover:text-red-400` maradhat)
- **EZEK A LEGFONTOSABBAK** — ezek az ikonok a screenshot szerint szinte láthatatlanok (a GYIK sor melletti `▲▼●⧉✕`)

**Globális stílus panel label-ek — 442-535:**
- minden `text-[10px] text-zinc-500` és `text-zinc-600` label → `text-zinc-400`
- a `442,453,459,465,474,486,493`: `Színpaletta`, `Címsor betűtípus`, `Szövegtörzs`, `Egyéni színek`, `Vállalkozás`, `SEO / Meta`, `Footer / Social` label-ek → `text-zinc-300` (ezek szekció-fejlécek, legyenek markánsak)
- `535`: szekció-leírás `text-zinc-500` → `text-zinc-400`

**SectionStyleEditor (szekció stílus panel) — 752-772:**
- `752`: "Szekció stílus" fejléc `text-zinc-500` → `text-zinc-300`
- `755,762,769`: `Háttérszín`, `Szövegszín`, `Szöveg igazítás` label-ek `text-zinc-600` → `text-zinc-400`
- `758,765`: az `X` törlő-gombok `text-zinc-600 hover:text-zinc-400` → `text-zinc-400 hover:text-zinc-200`

**Input-mező label-ek (a kis újrahasznált komponensek) — 790,799,808,819,870:**
- mind `text-[10px] text-zinc-500/600` → `text-zinc-400`
- ezek a `Cím`, `Alcím`, `Kérdés`, `Válasz` stb. feliratok az input mezők fölött — a screenshot szerint pont ezek halványak

**Egyéb segédszövegek — 311,535,630,829:**
- `311`: onboarding segédszöveg `text-zinc-500` → `text-zinc-400`
- `630`: Formspree segédszöveg `text-zinc-600` → `text-zinc-400`
- `829`: `#{index+1}` indexek `text-zinc-600` → `text-zinc-400`

### Input mezők háttér/border kontraszt

A screenshot alapján az input mezők (`Cím`, `Kérdés` stb.) is kicsit "elmosódnak" a panel-háttérben. Keresd az input-mezők class-ét (valószínűleg `bg-zinc-900 border-zinc-800` vagy hasonló a `LabeledInput` / `TextInput` komponensben, ~790-820 körül), és:
- a border: `border-zinc-800` → `border-zinc-700` (látható mezőhatár)
- ha az input háttere `bg-zinc-900` és a panel is `bg-zinc-900`, akkor az input → `bg-zinc-950` vagy `bg-black/40`, hogy a mező "bemélyedjen" vizuálisan

### Uppercase tracking label-ek olvashatósága

Több label `uppercase tracking-wider` vagy `tracking-[0.3em]` (pl. 309, 442). A nagyon ritkított nagybetűs szöveg kis méretben (`text-[10px]`) nehezen olvasható. Javaslat:
- a `text-[10px]` label-eknél a `tracking-[0.3em]` → `tracking-wider` (kevésbé szétszórt)
- vagy emeld a méretet `text-[11px]`-re — apró, de sokat számít

---

## Prioritás 2 — Panel becsukás/kinyitás + teljes képernyős előnézet

### A cél
A bal oldali szekció-lista panel ÉS a középső szerkesztő-panel külön-külön becsukható/kinyitható legyen, hogy az előnézet teljes szélességet kapjon. Ez az F3 (mobil-preview toggle) természetes párja, és a "wow" demóhoz fontos.

### A jelenlegi layout
A 402. sor: `{/* Split view: sidebar + editor + preview */}`. Három oszlop: bal sidebar (szekciólista), középső editor-panel, jobb preview. Valószínűleg flex vagy grid.

### Megoldás — két toggle state

A komponens state-jeihez (a 78-88 blokkhoz) add:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(true);
const [editorPanelOpen, setEditorPanelOpen] = useState(true);
```

A három oszlop wrapper-jeit tedd feltételessé. Ha flex-layout:

```tsx
{/* Bal sidebar */}
{sidebarOpen && (
  <aside className="w-56 shrink-0 ...">
    {/* szekciólista */}
  </aside>
)}

{/* Középső editor panel */}
{editorPanelOpen && (
  <section className="w-80 shrink-0 ...">
    {/* aktív szekció szerkesztő */}
  </section>
)}

{/* Preview — mindig kitölti a maradékot */}
<section className="flex-1 min-w-0 ...">
  {/* iframe */}
</section>
```

### Toggle gombok elhelyezése

Két jó megoldás, válaszd az egyszerűbbet:

**A) Csíkos "fül" a panel szélén (ajánlott):** minden becsukható panel szélén egy keskeny függőleges sáv egy `‹` / `›` ikonnal. Becsukott állapotban egy vékony (pl. `w-6`) függőleges sáv marad, rajta a kinyitó nyíl.

**B) Toolbar gombok:** a felső toolbarba (369-399 sáv) két kis gomb: `⬚ Szekciók` és `⬚ Szerkesztő`, amik togglik a `sidebarOpen` / `editorPanelOpen` state-et. Egyszerűbb, de kevésbé felfedezhető.

**Javaslat:** B a gyors megoldás (toolbar gombok), de tegyél melléjük ikon + szöveget, hogy felfedezhető legyen. Pl.:
```tsx
<button onClick={() => setSidebarOpen(o => !o)}
  className="text-zinc-300 hover:text-zinc-100 text-xs px-2 py-1 border border-zinc-600 rounded"
  title="Szekciólista ki/be">
  {sidebarOpen ? "◧" : "▢"} Panelek
</button>
```

### "Teljes előnézet" egy gombra

A wow-demóhoz a leghasznosabb egy **egyetlen gomb**, ami MINDKÉT panelt becsukja egyszerre (és újra kinyitja). Egy "⛶ Teljes előnézet" gomb a toolbarban:

```tsx
const [fullPreview, setFullPreview] = useState(false);

function toggleFullPreview() {
  const next = !fullPreview;
  setFullPreview(next);
  setSidebarOpen(!next);
  setEditorPanelOpen(!next);
}

// toolbar gomb:
<button onClick={toggleFullPreview}
  className="text-zinc-300 hover:text-emerald-400 text-xs px-2 py-1 border border-zinc-600 rounded"
  title="Teljes képernyős előnézet">
  {fullPreview ? "⛶ Kilépés" : "⛶ Teljes előnézet"}
</button>
```

Ez a legjobb ár/érték: egy gomb, és az előnézet teljes szélességű lesz. Az inline szerkesztés (F1) közben is működik, mert a preview-iframe ugyanaz marad.

### Animáció (opcionális, de szép)
A panelek `transition-all duration-200` + a szélességet `w-56`/`w-0 overflow-hidden` váltással animálni szebb, mint a hirtelen eltűnés. De ezt csak ha az alap működik — ne ez legyen az első.

---

## Prioritás 3 — A `?` útmutató gomb észrevehetősége

Jelenleg (398. sor): `<a href="/utmutato" ... className="text-zinc-500 hover:text-zinc-300 text-xs px-2">?</a>` — egy halvány, kis `?`, amit tényleg nem lehet észrevenni.

### Fix: tedd gomb-szerűvé felirattal

```tsx
<a href="/utmutato" target="_blank"
  className="flex items-center gap-1 text-zinc-300 hover:text-emerald-400 text-xs px-2 py-1 border border-zinc-600 rounded transition-colors"
  title="Útmutató / Súgó">
  <span className="text-sm">?</span>
  <span>Útmutató</span>
</a>
```

- Most már van **szövege** ("Útmutató"), nem csak egy `?`
- Van **kerete**, mint a többi gombnak → vizuálisan gomb
- A `text-zinc-300` olvasható
- Konzisztens az Újragenerálás / Letöltés gombokkal

Ugyanígy a `Chat` link (399) is kapjon egységes stílust, hogy a két link ne lógjon ki formázatlanul.

---

## Prioritás 4 — Felső nav-bar menük (a GENERÁLT oldalon) — KÜLÖN ÜGY

> **Figyelem:** ez NEM a builder UI, hanem a `render.ts` által generált weboldal nav-ja. Ez a `renderNav()` függvény (render.ts 324-342) és a hozzá tartozó CSS (render.ts 383-395).

A screenshot szerint a generált oldal nav-menüi (`Szolgáltatásaink`, `Rólunk`, stb.) `var(--c-muted)` színűek, ami a sötét palettáknál halvány. A render.ts CSS-ben (388. sor):

```css
nav a{color:var(--c-muted);...}
```

**Fontos megfontolás:** ez a generált oldal, amit a user majd a saját ügyfeleinek mutat. A nav-link kontraszt itt **a user palettájától függ** — a 8 színpaletta közül a sötét hátterűeknél (emerald, blue, rose stb.) a `--c-muted` (#a1a1aa) halvány lehet a `--c-surface`-en.

Két opció:
- **A)** A nav-linkek színét emeld `var(--c-text)`-re (a teljes szövegszín), és a `--c-muted` maradjon hover-előtti állapotnak. De ez a generált oldal dizájnját érinti — ízlés kérdése.
- **B)** Hagyd, mert a generált oldal egy külön dizájn-rendszer, és a felhasználó a palettával úgyis befolyásolja.

**Javaslat:** ezt a 4. prioritást **a validációs beszélgetések UTÁN** döntsd el. Ha a tesztelő userek panaszkodnak a generált oldal nav-jára, akkor javítsd. Ha nem, hagyd — a builder UI fixe (1-3 prioritás) sokkal fontosabb. NE keverd össze a kettőt egy menetben.

---

## Megvalósítási sorrend (Claude Code-nak)

1. **Prioritás 1 — kontraszt:** menj végig a fenti sorlistán, cseréld a class-eket. Ez mechanikus, de figyelj, hogy az AKTÍV állapotok (`bg-zinc-800 text-zinc-300/200`) MARADJANAK — csak a halvány feliratokat/ikonokat emeld.
2. **Teszt #1:** nyisd meg a buildert, és nézd meg, hogy a `Cím`, `Kérdés`, `Válasz` label-ek, a szekció-sor ikonok (▲▼●✕), és a stílus-panel label-jei olvashatók-e. Hasonlítsd a screenshothoz.
3. **Prioritás 3 — `?` gomb:** gyors, egy elem. Csináld meg, mert 2 perc.
4. **Prioritás 2 — panelek + fullscreen:** a két toggle state + a "Teljes előnézet" gomb. Előbb működés, utána animáció.
5. **Teszt #2:** Teljes előnézet gomb → mindkét panel becsukódik → preview teljes szélességű → inline szerkesztés (F1) MÉG mindig működik benne → gomb újra → panelek vissza.
6. **Prioritás 4:** HAGYD későbbre (validáció után döntsd el).

---

## Tesztelési checklista (kész-definíció)

- [ ] A `Cím / Alcím / Kérdés / Válasz` label-ek tisztán olvashatók
- [ ] A szekció-sor ikonjai (▲ ▼ ⧉ ● ✕) láthatók nyugalmi állapotban is (nem csak hoverre)
- [ ] A stílus-panel (`Háttérszín`, `Szövegszín`, `Padding` stb.) label-jei olvashatók
- [ ] A "Automatikusan mentve" felirat látható
- [ ] Az input mezők kerete elválik a panel hátterétől
- [ ] A `?` gomb most "Útmutató" felirattal, kerettel, jól látható
- [ ] A "Teljes előnézet" gomb becsukja mindkét panelt, az előnézet teljes szélességű
- [ ] Becsukott panelek visszanyithatók
- [ ] Az inline szerkesztés (F1) teljes előnézet módban is működik
- [ ] Az aktív állapotok (kiválasztott tab, kiválasztott szekció) NEM lettek halványabbak — csak a feliratok lettek világosabbak