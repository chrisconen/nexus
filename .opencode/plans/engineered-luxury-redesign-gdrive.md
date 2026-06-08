# Engineered Luxury Redesign — G:\CONEN_DIGITAL

> **For agentic workers:** Use subagent-driven-development. Each Group is a separate sub-agent task.

**Goal:** Redesign all 22 HTML files in `G:\CONEN_DIGITAL` from cyberpunk (cyan/magenta/orange) to "Engineered Luxury" (obsidian/gold/accent) theme, matching the already-completed `index.html`.

**Architecture:** All files are monolithic HTML with inline `<style>` CSS and inline `<script>` JS. No build step. Each file gets its `:root` replaced, cyberpunk CSS sections removed, and color/font references updated.

**Files NOT modified:**
- `index.html` — already has Engineered Luxury CSS
- `google452375ed927a7b98.html` — Google verify
- `weboldal-konfigurator-v2.html` — excluded by user
- `backup_original\*` — backup folder

---

### Group A — 13 city pages (identical CSS template)

**Files:**
- `G:\CONEN_DIGITAL\weboldal-keszites-budapest.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-debrecen.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-eger.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-kaposvar.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-kecskemet.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-miskolc.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-nyiregyhaza.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-pecs.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-sopron.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-szeged.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-szekesfehervar.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-szolnok.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-szombathely.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-veszprem.html`
- `G:\CONEN_DIGITAL\weboldal-keszites-zalaegerszeg.html`

**CSS structure (lines ~145-2582):**
- Double `:root` blocks (lines 146-164 + 171-181)
- Full cyberpunk CSS: scanlines, grain, cursor, loader
- Section CSS: navigation, hero, services, process, team, contact, footer
- Closes `</style>` around line 2582

**HTML body:**
- Lines 2587-2601: Loader div + effects divs (scanlines, grain, cursor, cursorTrailContainer)
- Lines 2603+: Navigation, hero, content sections

**JS:**
- Lines ~3495-3610: `<script>` block with loader JS, cursor JS, nav JS, scroll reveal JS
- Later: dotface canvas JS (must PRESERVE), cert modal JS

**Changes needed per file:**
1. Replace `:root` section → Engineered Luxury CSS
2. Remove `.cursor`, `.cursor-trail`, `#cursorTrailContainer`, `.scanlines` CSS
3. Remove `.grain` + `@keyframes grain` CSS
4. Remove `.loader` CSS block
5. Remove `.glitch` CSS if present
6. Remove `body { cursor: none }` and related
7. Remove `::selection { background: var(--cyan) }` → gold
8. Remove HTML: loader div, scanlines div, grain div, cursor div, cursorTrailContainer
9. Remove JS: loader lines, cursor lines, trail lines (lines 3496-3558)
10. Replace all `var(--cyan)` → `var(--gold)` in CSS + inline styles
11. Replace all `var(--magenta)` → `var(--accent)`
12. Replace all `var(--orange)` → `var(--gold)`
13. Replace inline styles using `var(--cyan)` / `var(--black)` patterns
14. Remove font links for Cinzel, Cormorant Garamond, Space Mono (keep Space Grotesk, Inter Tight, JetBrains Mono)

**New `:root` CSS to use:**
```css
        :root {
            --bg:          #09090b;
            --surface:     #111113;
            --surface-2:   #18181b;
            --surface-3:   #1e1e22;
            --border:      #27272a;
            --border-hover: #3f3f46;
            --text:        #fafafa;
            --text-secondary: #a1a1aa;
            --text-tertiary:  #71717a;
            --gold:        #C9A962;
            --gold-glow:   rgba(201, 169, 98, 0.15);
            --gold-text:   #e5d4a1;
            --accent:      #8b7cf6;
            --accent-glow: rgba(139, 124, 246, 0.12);
            --success:     #4ade80;
            --error:       #f87171;
            --section-y:   clamp(80px, 12vw, 140px);
            --section-x:   clamp(20px, 5vw, 80px);
            --container:   1280px;
            --radius-sm:   6px;
            --radius-md:   12px;
            --radius-lg:   20px;
            --radius-full: 9999px;
            --font-main: 'Space Grotesk', sans-serif;
            --font-body: 'Inter Tight', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }
```

**Color replacement map:**
| Old | New |
|-----|-----|
| `var(--cyan)` | `var(--gold)` |
| `var(--magenta)` | `var(--accent)` |
| `var(--orange)` | `var(--gold)` |
| `var(--black)` | `var(--bg)` |
| `var(--gray)` | `var(--surface)` |
| `var(--gray-light)` | `var(--surface-2)` |
| `var(--white)` | `var(--text)` |

---

### Group B — 6 belső pages

**Files:**
- `szolgaltatasok.html`
- `webaruhaz-keszites.html`
- `weboldal-keszites.html`
- `kapcsolat.html`
- `portfolio.html`
- `rolunk.html`
- `wordpress-weboldal-modernizalas.html`

Same structure as Group A (double `:root`, full cyberpunk CSS). Apply same changes as Group A.

---

### Group C — Small pages

**Files:**
- `G:\CONEN_DIGITAL\adatvedelem.html` (16KB)
- `G:\CONEN_DIGITAL\email-sikeresen-elkuldve.html` (7.6KB)

Each has a single `:root` with cyberpunk colors. Replace `:root` and color references. Remove scanlines/cursor/grain if present.

---

### Group D — kentaur-index.html

**File:** `G:\CONEN_DIGITAL\kentaur-index.html` (36KB)

Already has gold/obsidian theme with Cinzel/Cormorant Garamond/Space Mono fonts. Changes needed:
- Replace `--gold`, `--gold-light`, `--gold-dark` → align with Engineered Luxury naming
- Replace fonts: Cinzel → Space Grotesk, Cormorant Garamond → Inter Tight, Space Mono → JetBrains Mono
- Remove grain/noise overlay (`.hero::before` with SVG noise)
- Add `--surface`, `--border`, `--text-secondary` vars
- Update button styles to match Engineered Luxury (gold gradient → filled gold)

---

### Verification

For each group after changes:
- [ ] No `--cyan`, `--magenta`, `--orange` remain in CSS/JS
- [ ] No `.loader`, `.scanlines`, `.grain`, `.cursor` CSS/HTML/JS remains
- [ ] No inline `cursor: none` CSS
- [ ] All `:root` blocks use Engineered Luxury variables
- [ ] Font links load Space Grotesk + Inter Tight + JetBrains Mono only
- [ ] dotface canvas JS preserved
- [ ] cert-modal JS preserved
- [ ] Navigation + hero + sections render correctly
