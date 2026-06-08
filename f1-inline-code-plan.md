# F1 — Inline szerkesztés az előnézetben — Implementációs terv

> **Cél:** A preview-ban a felhasználó közvetlenül a szövegre kattint, és ott helyben átírja (címsor, alcím, gombszöveg, leírások stb.). Nincs split-view kognitív váltás.
>
> **Ez a dokumentum a Claude Code-nak szól.** Konkrét, a meglévő kódbázisra szabott terv. Nem általános elmélet.

---

## 0. A jelenlegi architektúra (amit NEM bontunk meg)

A meglévő kód három fontos tényt rögzít:

1. **A preview iframe-ben renderelődik `srcDoc`-kal.** A `SiteBuilder.tsx` egy `/api/site-preview` POST endpointtól kapja a teljes HTML-t (`previewHtml` state), és egy `<iframe srcDoc={previewHtml}>`-be tölti (SiteBuilder.tsx ~555. sor). A HTML-t a `render.ts` `renderSiteHtml()` állítja elő.

2. **Minden szekció már most kap egy stabil DOM id-t.** A `renderSiteHtml()` minden szekció `<section>`-jére rárak egy `id="s-{sec.id}"`-t (render.ts ~355. sor). **Ezt fogjuk kihasználni** — nem kell új azonosító-rendszer.

3. **A state-mutáció egységes és undo/redo-kompatibilis.** Minden módosítás a `updateSection(id, updater)` → `updateSiteData` → `history.set()` láncon megy át (SiteBuilder.tsx 235-245. sor). **Az inline szerkesztésnek is ezen kell átmennie**, hogy az undo/redo és az auto-save ingyen működjön.

**Következmény:** mivel a preview izolált iframe, a szülő React és az iframe közti kommunikáció `postMessage`-dzsel történik. Ez a tiszta megoldás. NE próbáljuk meg az iframe-et ugyanabba a React-fába hozni — az szétverné a meglévő preview-architektúrát.

---

## 1. A megoldás nagy képe

```
┌─────────────────────────────────────────────────────────┐
│  SiteBuilder.tsx (szülő, React)                          │
│                                                           │
│  - siteData (forrás-igazság, history-ben)                │
│  - <iframe srcDoc={previewHtml} ref={iframeRef}>         │
│                                                           │
│        ▲  postMessage                  │ postMessage      │
│        │  {type:"EDIT", path, value}   ▼ {type:"READY"}   │
│  ┌─────┴──────────────────────────────────────────┐     │
│  │  iframe (izolált, renderSiteHtml HTML)          │     │
│  │                                                  │     │
│  │  - data-edit attribútumok a szerkeszthető       │     │
│  │    elemeken (h1, p.subtitle, .btn, ...)         │     │
│  │  - egy beinjektált <script> kezeli a kattintást,│     │
│  │    contenteditable-t, blur-t → postMessage       │     │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Folyamat:**
1. A `render.ts` minden szerkeszthető szövegelemre rárak egy `data-edit="<path>"` attribútumot, ahol a `<path>` megmondja, melyik mezőt szerkeszti (pl. `headline`, `items.0.name`).
2. A `render.ts` a HTML végére injektál egy kis `<script>`-et (csak preview módban!), ami kezeli a kattintást → `contentEditable=true` → fókusz → blur/Enter → `postMessage` a szülőnek.
3. A szülő `SiteBuilder.tsx` egy `message` listener-rel fogadja az edit-eket, és a meglévő `updateSection`-nal beírja a state-be.
4. A state változás → a meglévő live-preview effect újrarendereli az iframe-et. (Lásd 6. pont a fókusz-villanás kezeléséről.)

---

## 2. Preview vs. letöltött HTML szétválasztása (KRITIKUS)

A `renderSiteHtml()` jelenleg **két célt szolgál egyszerre**: a live preview-t ÉS a letölthető végleges HTML-t. Az inline szerkesztés extra cuccait (data-edit attribútumok, injektált script) **CSAK a preview-ba szabad tenni**, a letöltött/publikált HTML-be SOHA.

**Megoldás:** adjunk a `renderSiteHtml`-nek egy opciós paramétert:

```ts
// render.ts
export interface RenderOptions {
  editable?: boolean;  // true → preview inline-edit cuccokkal; false/undefined → tiszta production HTML
}

export function renderSiteHtml(data: SiteData, opts: RenderOptions = {}): string {
  // ...
  // a data-edit attribútumokat és az injektált scriptet csak ha opts.editable
}
```

- A `/api/site-preview` endpoint hívja: `renderSiteHtml(data, { editable: true })`
- A letöltés / publikálás (M5) hívja: `renderSiteHtml(data)` → tiszta HTML, nulla edit-maradvány

**Ellenőrző teszt a végén:** tölts le egy HTML-t, és `grep -c "data-edit"` → legyen `0`.

---

## 3. render.ts módosítások

### 3.1. Path-alapú data-edit attribútum helper

Vegyél fel egy helper-t, ami a `data-edit` attribútumot generálja, de csak editable módban:

```ts
function editAttr(path: string, editable: boolean): string {
  return editable ? ` data-edit="${path}"` : "";
}
```

A `path` konvenció: a szekción belüli mező-útvonal, ponttal és indexszel:
- egyszerű mező: `headline`, `subheadline`, `ctaText`, `title`, `text`
- tömb-elem mező: `items.0.name`, `items.2.description`, `members.1.role`

A `path` NEM tartalmazza a szekció id-t — azt a `<section id="s-{id}">` adja, a script majd onnan olvassa ki.

### 3.2. Szerkeszthető elemek megjelölése

A renderelő függvényeket bővítsd ki. Csak a **sima szöveges** mezőket tedd szerkeszthetővé (NE a strukturális dolgokat, NE az URL-eket, NE a képeket — azok maradnak a sidebar editorban). Példák:

**renderHero** (render.ts ~54-56. sor):
```ts
<h1${editAttr("headline", editable)}>${esc(s.headline)}</h1>
<p class="subtitle"${editAttr("subheadline", editable)}>${esc(s.subheadline)}</p>
<a href="..." class="btn"${editAttr("ctaText", editable)}>${esc(s.ctaText)}</a>
```
(A `ctaUrl`-t NEM tesszük inline-szerkeszthetővé, mert az egy URL — marad a sidebarban.)

**renderServices** (render.ts ~66-74. sor):
```ts
<h2${editAttr("title", editable)}>${esc(s.title)}</h2>
// az items.map-ben, az index kell:
${s.items.map((i, idx) => `
  <div class="card">
    <h3${editAttr(`items.${idx}.name`, editable)}>${esc(i.name)}</h3>
    <p${editAttr(`items.${idx}.description`, editable)}>${esc(i.description)}</p>
    ${i.price ? `<div class="price"${editAttr(`items.${idx}.price`, editable)}>${esc(i.price)}</div>` : ""}
  </div>
`).join("")}
```

**Alkalmazd ezt a mintát minden szekció szöveges mezőjére:**
- about: `title`, `text`
- testimonials: `title`, `items.{i}.text`, `items.{i}.name`, `items.{i}.role`
- faq: `title`, `items.{i}.question`, `items.{i}.answer`
- cta: `headline`, `text`, `buttonText`
- stats: `items.{i}.value`, `items.{i}.label`
- pricing: `title`, `plans.{i}.name`, `plans.{i}.price`, `plans.{i}.features.{j}`
- offers: `title`, `items.{i}.title`, `items.{i}.description`, `items.{i}.discountPrice`, `items.{i}.badge`
- team: `title`, `members.{i}.name`, `members.{i}.role`, `members.{i}.bio`
- gallery/logos/contact: a title-öket igen, de a strukturált adatokat (képek, formfields) NE

### 3.3. Injektált szerkesztő-script (csak editable módban)

A `renderSiteHtml` végén, a `</body>` előtt, ha `editable`:

```ts
const editorScript = editable ? `
<style>
  [data-edit]{outline:1px dashed transparent;outline-offset:2px;transition:outline-color .15s;cursor:text}
  [data-edit]:hover{outline-color:color-mix(in srgb,var(--c-primary) 50%,transparent)}
  [data-edit]:focus{outline:2px solid var(--c-primary);outline-offset:2px}
  [data-edit].nx-saving{outline-color:var(--c-accent)}
</style>
<script>
(function(){
  let active = null;

  function findSectionId(el){
    const sec = el.closest('[id^="s-"]');
    return sec ? sec.id.slice(2) : null; // "s-xxx" → "xxx"
  }

  document.addEventListener('click', function(e){
    const t = e.target.closest('[data-edit]');
    if(!t) return;
    e.preventDefault();
    if(active === t) return;
    startEdit(t);
  });

  function startEdit(el){
    active = el;
    el.contentEditable = 'true';
    el.focus();
    // kurzort a végére
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function commit(el){
    const sectionId = findSectionId(el);
    const path = el.getAttribute('data-edit');
    const value = el.innerText.trim();
    el.contentEditable = 'false';
    if(sectionId && path){
      parent.postMessage({ source:'nx-inline', type:'EDIT', sectionId, path, value }, '*');
    }
    active = null;
  }

  document.addEventListener('blur', function(e){
    if(e.target && e.target.hasAttribute && e.target.hasAttribute('data-edit') && e.target.contentEditable === 'true'){
      commit(e.target);
    }
  }, true);

  document.addEventListener('keydown', function(e){
    if(!active) return;
    // Enter (Shift nélkül) commit, kivéve textarea-szerű többsoros mezők
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      active.blur();
    }
    if(e.key === 'Escape'){
      e.preventDefault();
      active.contentEditable = 'false';
      active = null;
      // visszaállítás: kérünk egy re-rendert (a parent state változatlan, így az iframe srcDoc visszaáll)
      parent.postMessage({ source:'nx-inline', type:'CANCEL' }, '*');
    }
  });

  // jelezzük a parentnek, hogy készen állunk
  parent.postMessage({ source:'nx-inline', type:'READY' }, '*');
})();
</script>` : "";

// ... és a return-ben a </body> elé:
//   ${editorScript}
// </body>
```

**Fontos:** a `esc()` HTML-escapinget használ. A `contentEditable` `innerText`-je nyers szöveget ad vissza, ami helyes (a state-be nyers szöveg kell, a re-render majd újra escape-eli). Ne `innerHTML`-t olvass — az XSS-t és formázási szemetet vinne a state-be.

---

## 4. SiteBuilder.tsx módosítások

### 4.1. iframe ref

A preview iframe-hez kell egy ref (a 555. sor környékén):

```tsx
const iframeRef = useRef<HTMLIFrameElement>(null);
// ...
<iframe ref={iframeRef} srcDoc={previewHtml} ... />
```

### 4.2. postMessage listener

Új `useEffect`, ami a beérkező edit-eket a meglévő `updateSection`-nal írja state-be:

```tsx
useEffect(() => {
  function onMessage(e: MessageEvent) {
    const msg = e.data;
    if (!msg || msg.source !== "nx-inline") return;

    if (msg.type === "EDIT") {
      const { sectionId, path, value } = msg;
      updateSection(sectionId, (s) => setByPath(s, path, value));
    }
    // READY / CANCEL: most nincs teendő (CANCEL-nél a re-render úgyis visszaállít)
  }
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}, [siteData]); // updateSection a siteData-t zárja, ezért dep
```

### 4.3. setByPath helper

Egy kis path-alapú setter (a `items.0.name` → beágyazott mező). Tedd a komponens fölé vagy egy util fájlba:

```ts
function setByPath(obj: any, path: string, value: string): any {
  const keys = path.split(".");
  const root = obj; // már mély-másolt (updateSection JSON.parse(JSON.stringify) miatt? — NEM, lásd lent)
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur = cur[k];
    if (cur == null) return root; // védő: nem létező path
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}
```

**FIGYELEM a mély-másolásra:** a meglévő `updateSection` az `updateSiteData`-n keresztül **már csinál** egy `JSON.parse(JSON.stringify(siteData))` mély-másolatot (SiteBuilder.tsx 237. sor), ÉS az `updateSection` egy `{ ...s }` sekély másolatot ad az updater-nek (243. sor). A `setByPath` beágyazott tömb-elemet mutál (`items.0.name`), és a sekély `{ ...s }` az `items` tömböt **megosztva** hagyja. **Ezért** a `setByPath`-nak a beágyazott szinteket is másolnia kell, VAGY az `updateSection` updater-jében előbb egy mélymásolat kell. A legbiztosabb: a listener-ben

```tsx
updateSection(sectionId, (s) => setByPath(structuredClone(s), path, value));
```

`structuredClone` modern böngészőkben elérhető. Így biztosan tiszta másolaton dolgozunk, és a history-snapshotok nem osztoznak referencián.

---

## 5. UX finomítások (a "wow" itt dől el)

1. **Hover-jelzés:** a `[data-edit]:hover` szaggatott outline (már a scriptben). Ettől a user LÁTJA, mi szerkeszthető, mielőtt kattint. Ez a fél wow.
2. **Aktív fókusz:** `[data-edit]:focus` tömör primary outline.
3. **Egy diszkrét tipp az első belépéskor:** a szülő editorban egy egyszeri toast: *"Tipp: kattints bármelyik szövegre az előnézetben, és ott helyben átírhatod."* (A meglévő `toast()` helper-rel, SiteBuilder.tsx ~101. sor.)
4. **NE legyen szerkeszthető**, ami nem szöveg: URL-ek, képek, kapcsoló-mezők. Ezek a sidebarban maradnak — a kettő együtt él.

---

## 6. A fókusz-villanás probléma (FONTOS edge-case)

A jelenlegi live-preview effect **minden `siteData` változáskor** újra POST-ol az `/api/site-preview`-ra és lecseréli a teljes `srcDoc`-ot (SiteBuilder.tsx 127-139). Ha a user inline szerkeszt → state változik → az iframe **teljesen újratöltődik** → a kurzor és a fókusz elveszik, és villan a kép.

**Ezt commit-on (blur/Enter) elfogadjuk** — ott a user már befejezte a szerkesztést, egy finom re-render rendben van. A `contentEditable` természeténél fogva a szerkesztés *közben* a DOM-ot a böngésző kezeli, nem a re-render, mert a state csak commit-kor frissül (nem minden billentyűre). Tehát az alap-flow OK.

**De két dolgot kezelni kell:**

a) **Debounce a preview-frissítésen.** Hogy a commit utáni re-render ne legyen azonnali ugrás, tedd a preview-fetch-et egy rövid (pl. 150-300ms) debounce mögé. Így ha gyorsan több mezőt szerkeszt, nem minden commit tölti újra az iframe-et azonnal.

b) **Opcionális, csak ha zavaró a villanás:** a re-render után görgess vissza a szerkesztett elemhez. A `postMessage` READY-jét használva a parent a frissítés után küldhet egy `{type:"SCROLL_TO", sectionId}` üzenetet, és a script odagörget. **Ezt csak akkor építsd meg, ha tesztelésnél tényleg zavaró** — ne preventív.

> **A Claude Code-nak:** előbb az alap-flow-t építsd meg (2-5. pont), és teszteld. A 6/b-t csak akkor, ha a villanás a gyakorlatban zavaró.

---

## 7. Megvalósítási sorrend (a Claude Code-nak, lépésről lépésre)

1. **render.ts:** add a `RenderOptions { editable }` paramétert, és a `editAttr` helpert. Egyelőre CSAK a hero szekcióhoz add hozzá a `data-edit`-eket + az injektált scriptet. **Ne nyúlj a többi szekcióhoz még.**
2. **/api/site-preview:** módosítsd, hogy `renderSiteHtml(data, { editable: true })`-t hívjon.
3. **SiteBuilder.tsx:** add az `iframeRef`-et, a `setByPath` helpert, és a `message` listener `useEffect`-et.
4. **Teszt #1:** hero headline-t kattintásra átírni → state frissül → undo (Ctrl+Z) visszaállít → auto-save „Mentve". Ha ez megy, a nehezén túl vagy.
5. **Kiterjesztés:** add a `data-edit`-eket a TÖBBI szekcióhoz (3.2 lista), egyenként.
6. **Teszt #2:** tömb-elemes mező (pl. egy szolgáltatás neve, `items.2.name`) szerkesztése → helyes elem frissül.
7. **Production-tisztaság teszt:** tölts le egy HTML-t (a letöltés `editable` nélkül hívja a render-t) → `grep -c "data-edit"` legyen `0`, és ne legyen benne az injektált `<script>`.
8. **UX:** hover/focus stílusok finomítása, egyszeri tipp-toast.

---

## 8. Amit NEM csinálunk az F1-ben (scope-védelem)

- ❌ Gazdag szövegszerkesztés (félkövér, dőlt, link beszúrás) — sima szöveg elég, a stílus a globális/szekció szinten dől el
- ❌ Új szekció hozzáadása vagy törlése a preview-ból — marad a sidebarban
- ❌ Drag-and-drop a preview-ban — az külön feature (backlog)
- ❌ Kép cseréje inline — marad a sidebar képfeltöltőben
- ❌ URL-mezők inline szerkesztése — sidebarban maradnak

Ezek mind csábítóak, de az F1 lényege EGY dolog kifogástalan megvalósítása: **kattints a szövegre, írd át.** Ha ez sima, az a wow. A többi külön feature.

---

## 9. Tesztelési checklista (kész-definíció)

- [ ] Hero headline inline szerkeszthető, state frissül
- [ ] Minden felsorolt szöveges mező (3.2) szerkeszthető a maga szekciójában
- [ ] Tömb-elemes mezők a helyes indexre írnak (items.2.name a 3. elemet)
- [ ] Undo/redo működik az inline szerkesztés után (Ctrl+Z/Y)
- [ ] Auto-save lefut a szerkesztés után ("Mentve" toast)
- [ ] Escape megszakítja a szerkesztést, visszaáll az eredeti
- [ ] Enter commit-ol (egysoros mezőknél), Shift+Enter új sor
- [ ] Hover-jelzés látszik a szerkeszthető elemeken
- [ ] **Letöltött/production HTML-ben NINCS `data-edit` és NINCS injektált script**
- [ ] Mobil-preview módban is működik (a `previewMode === "mobile"` 375px-es iframe-ben)
- [ ] XSS-teszt: írj be egy `<script>alert(1)</script>`-öt egy mezőbe → a state-ben nyers szövegként legyen, a re-render escape-elje (ne fusson le)