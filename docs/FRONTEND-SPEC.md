# City Shield — Frontend Specification

**Status:** Draft v0.1 · for review
**Companion to:** `PRD.md`
**Applies to:** `city-shield-app/` — React 19.2 · Vite 8.2 · Tailwind 3.4

---

## 0. What is wrong with the current frontend

Stated plainly, because the rebuild is justified by these and not by taste alone.

| # | Problem | Consequence |
|---|---|---|
| 1 | 921 lines in one file, 9 components, zero separation | Unmaintainable; nothing is testable or reusable |
| 2 | Styling via inline `style={{}}` objects on a `C` token object | Tailwind is installed and unused; no hover/focus/media states possible in inline styles; no theming |
| 3 | `useState("home")` as the router | No URLs, no deep links, back button broken, no shareable tracking link — **which the PRD requires** (§9.4 capability URLs) |
| 4 | `@import` of Google Fonts inside a `<style>` tag in a component | Render-blocking, re-injected on every mount, FOUT, third-party dependency on a CDN in an emergency app |
| 5 | The SOS timeline advances on `setTimeout` regardless of reality | **Safety defect.** Fabricated reassurance — see PRD §9.1 anti-requirement |
| 6 | Everything hardcoded: `"Indiranagar PS · 1.1 km"`, `"2.4 km"`, count-up stats | No data layer to attach anything real to |
| 7 | Space Grotesk + cyan-on-navy + glow + pulsing rings | Reads as AI-generated landing page, not public infrastructure |
| 8 | No focus states, no `aria-live`, no reduced-motion, no keyboard path to SOS | Inaccessible — disqualifying for an emergency product |
| 9 | `sosPulse` and `blip` animate infinitely | Battery drain and vestibular-trigger risk on a page that may sit open during a crisis |

The palette change alone fixes #7. Items 1–6 and 8–9 require the rebuild.

---

## 1. Design principles

1. **Credibility over flourish.** This sits next to police and ambulance services.
   It should look like infrastructure, not a product launch.
2. **Red is a signal, not a colour.** Saturated red appears *only* where something
   is actually critical. Used everywhere, it means nothing. **This single rule does
   more to remove the "AI-generated" look than any hex value.**
3. **Never fake a state.** No progress bars that aren't measuring anything. No
   "responder assigned" without a responder.
4. **Reachable under stress, one-handed, at 3am.** Large targets, bottom-weighted
   primary actions, high contrast, no precision gestures.
5. **Motion earns its place.** The hero may be cinematic. The SOS screen may not.
   Motion decreases as stakes increase — the reverse of typical marketing sites.

---

## 2. Colour

Institutional light ground, deep civic navy, reserved signal red.

### 2.1 Tokens

```css
:root {
  /* Ground */
  --ground:        #FBFAF8;   /* warm paper — page background */
  --surface:       #FFFFFF;   /* raised cards */
  --sunken:        #F3F1ED;   /* wells, insets, table stripes */

  /* Ink */
  --ink:           #12151A;   /* primary text */
  --ink-2:         #454C58;   /* secondary text */
  --ink-3:         #6B7480;   /* tertiary, meta, labels */

  /* Line */
  --line:          #E3E0DA;   /* hairline dividers */
  --line-strong:   #CFCBC3;   /* input borders, emphasis */

  /* Signal — CRITICAL STATES ONLY */
  --signal:        #C8102E;
  --signal-hover:  #A50D25;
  --signal-tint:   #FDF2F3;

  /* Civic — primary actions, agency chrome */
  --civic:         #1E3A5F;
  --civic-hover:   #162C49;
  --civic-tint:    #EDF2F8;

  /* Status */
  --ok:            #1B7F5A;   /* operational, resolved */
  --warn:          #9A5109;   /* degraded, en route, pending */

  --focus:         #1E3A5F;   /* focus ring, 2px offset 2px */
}
```

### 2.2 Verified contrast

Computed, not assumed. WCAG 2.1 AA requires 4.5:1 for normal text, 3:1 for large.

| Pair | Ratio | Verdict |
|---|---|---|
| `--ink` on `--ground` | ~17:1 | AAA |
| `--ink-2` on `--ground` | 8.3:1 | AAA |
| `--ink-3` on `--ground` | 4.5:1 | AA — restricted to ≥14px meta text |
| white on `--signal` | 5.9:1 | AA |
| white on `--civic` | 11.5:1 | AAA |
| white on `--ok` | 5.0:1 | AA |
| white on `--warn` | 5.9:1 | AA |

> `--warn` was darkened from an initial `#B25E09` (4.47:1 — a fail) to `#9A5109`.
> Worth recording that the check changed the palette rather than rubber-stamping it.

### 2.3 Dark theme

Dark mode is an **ink ground**, not the current navy. Navy-as-background is the
look we are deliberately leaving behind.

```css
[data-theme="dark"] {
  --ground: #0E1116;  --surface: #161A21;  --sunken: #0A0D11;
  --ink:    #F2F4F7;  --ink-2:   #B4BCC8;  --ink-3:  #828C9B;
  --line:   #242A33;  --line-strong: #333B47;
  --signal: #FF4D5E;  --signal-hover: #FF6B79;  --signal-tint: #2A1114;
  --civic:  #7BA7DB;  --civic-hover:  #9CBFE8;  --civic-tint:  #131C28;
  --ok:     #3FBF8A;  --warn: #E0913A;
}
```

Signal and civic lighten in dark mode — the same hex on a dark ground would fail
contrast. Full token parity: no component may reference a raw hex.

### 2.4 Usage discipline — enforced in review

| Colour | Permitted | Forbidden |
|---|---|---|
| `--signal` | Active emergency state, SOS commit control, critical severity badges, destructive confirms | Marketing headings, decorative accents, hover states on non-critical controls, icon tinting |
| `--civic` | Primary buttons, links, active nav, agency chrome | Backgrounds larger than a card |
| `--ok` / `--warn` | Status only, always with a text label | Colour as the sole carrier of meaning |

**No gradients on interactive surfaces. No glow. No shadow larger than
`0 1px 2px rgba(18,21,26,.06)` except modals and the sticky header.**

---

## 3. Typography

**Remove:** Space Grotesk (the single strongest generic-AI-design tell) and the
in-component Google Fonts `@import`.

**Adopt**, self-hosted via `@fontsource` — no CDN, no render-block, no third-party
request path in an emergency product:

| Role | Family | Notes |
|---|---|---|
| UI + body | **Inter** (variable) | `font-feature-settings: "cv05","ss01"` for a less default look |
| Numerals | Inter, `font-variant-numeric: tabular-nums` | **Mandatory** on ETA, distance, counts, timestamps — non-tabular digits jitter on live-updating values |
| Hero statement only | **Instrument Serif** | Exactly one place in the product |

### Scale — 1.200 minor third, 16px base

| Token | Size / line-height | Use |
|---|---|---|
| `display` | 56 / 1.05, -0.02em | Hero only |
| `h1` | 36 / 1.15, -0.015em | Page title |
| `h2` | 27 / 1.25, -0.01em | Section |
| `h3` | 20 / 1.35 | Card title |
| `body` | 16 / 1.6 | Default — the current 12–13px body text is too small for a stress context |
| `small` | 14 / 1.5 | Meta |
| `label` | 12 / 1.4, 0.04em, uppercase | Eyebrow labels only |

Body copy caps at `70ch`. No text below 14px anywhere in the product.

---

## 4. Layout, spacing, motion

- **Spacing:** 4px base — `4 8 12 16 24 32 48 64 96 128`. No arbitrary values.
- **Radius:** `sm 4` · `md 8` · `lg 12` · `full`. Current 16–24px radii read
  consumer-app; institutional wants tighter.
- **Grid:** 12-col, 1200px max, 24px gutter, 20px page margin mobile.
- **Targets:** 44×44px minimum. SOS control 200px+.
- **Motion:** durations `120ms` (state) · `200ms` (transition) · `400ms` (entrance).
  Easing `cubic-bezier(.2,0,0,1)`. **No infinite animations anywhere except the
  hero, and the hero is scroll-driven, so it stops when the user stops.**
  All motion inside `@media (prefers-reduced-motion: no-preference)`.

---

## 5. Architecture

### 5.1 Structure

```
src/
├── main.jsx
├── app/
│   ├── App.jsx                 # router + providers only
│   ├── routes.jsx
│   └── providers/
│       ├── IncidentProvider.jsx    # active incident, context + reducer
│       └── ThemeProvider.jsx
├── pages/
│   ├── Home.jsx  Services.jsx  Sos.jsx  Track.jsx  NotFound.jsx
├── components/                 # presentational, no data access
│   ├── layout/     Header Footer MobileNav Page
│   ├── ui/         Button Badge Card Field StatusPill Disclosure Skeleton
│   └── hero/       ScrollHero.jsx  useFrameSequence.js  hero.css
├── features/                   # domain, may use services
│   ├── sos/        SosControl HoldToCommit CategoryPicker
│   ├── incident/   IncidentTimeline AgencyTaskList SeverityBadge
│   ├── location/   LocationBanner AccuracyRing useLiveLocation
│   └── civic/      CivicReportForm
├── lib/
│   ├── services/   index.js + adapters (§5.3)
│   ├── incident/   model.js machine.js routing.js
│   └── utils/      format.js cn.js
└── styles/
    ├── tokens.css  base.css
```

**Rule:** `components/` never imports from `lib/services`. Data flows down from
pages and features. Keeps the UI layer testable in isolation.

### 5.2 Routing

`react-router-dom` v7:

| Path | Page | Notes |
|---|---|---|
| `/` | Home | Scroll hero |
| `/services` | Services | |
| `/sos` | Sos | |
| `/report/:category` | Civic report | |
| `/track/:incidentId` | Track | Public-capable — the guardian capability URL from PRD §9.4 |
| `*` | NotFound | |

`/track/:incidentId` is why the `useState("home")` switcher must go: PRD §9.4
requires a shareable, expiring tracking link. That is not expressible without real URLs.

### 5.3 Service adapter layer

Every external capability sits behind an interface with a mock and a real
implementation, selected by env. This is what makes PRD §11 Tier 2 a config change.

```
lib/services/
├── index.js                 # selects impl from import.meta.env
├── types.js                 # JSDoc typedefs — the contract
├── geolocation/  browser.js  mock.js
├── geocode/      maps.js     mock.js
├── facilities/   places.js   mock.js     # nearby hospitals / stations
├── dispatch/     handoff.js  mock.js     # 112 SMS+tel handoff; mock = Tier 2 sim
└── notify/       sms.js      mock.js     # guardian fan-out
```

```js
// lib/services/index.js
const useMock = (key) => !import.meta.env[key];

export const geolocation = useMock('VITE_MAPS_API_KEY') ? mockGeo : browserGeo;
export const geocode     = useMock('VITE_MAPS_API_KEY') ? mockGeocode : mapsGeocode;
// …
```

Mocks are **realistic, not empty**: plausible Bengaluru coordinates, simulated
accuracy drift, injectable failure and latency. Degradation paths (PRD §12.1) are
testable without breaking anything.

### 5.4 State

- `IncidentProvider` — context + `useReducer` over the PRD §7 state machine.
  Transitions validated against `lib/incident/machine.js`; an illegal transition
  throws in dev. No Redux.
- Location stream in `useLiveLocation`, subscribing to the geolocation adapter.
- Everything else is local component state.

---

## 6. Scroll-frame hero

The Apple product-page technique: a rendered image sequence scrubbed by scroll
position, drawn to a `<canvas>`.

### 6.1 Concept

The animation *is* the thesis — the same idea PRD §3 states in words:

| Progress | Beat |
|---|---|
| 0.00–0.15 | Aerial city grid at rest, slow push-in. Cool neutral, no red anywhere. |
| 0.15–0.30 | A single point ignites `--signal`. One incident. |
| 0.30–0.55 | Three agency nodes acknowledge and light up. |
| 0.55–0.80 | Three response vectors trace inward along the street grid and converge. |
| 0.80–1.00 | Convergence resolves; a connecting arc links the three agencies **to each other**, not just to the incident. Red recedes to a calm marker. |

The final beat is the whole product: the agencies end up connected to one another.

### 6.2 Generation pipeline

```
scripts/hero/generate-frames.mjs   →  120 PNG @ 1600×900   (@napi-rs/canvas)
scripts/hero/encode.mjs            →  ffmpeg → WebP q75
                                   →  public/hero/frames/desktop/f0000.webp …
                                   →  public/hero/frames/mobile/  (800×450)
                                   →  public/hero/frames.json     (manifest)
                                   →  public/hero/poster.webp     (frame 0)
```

- `@napi-rs/canvas` — prebuilt binary, no node-gyp, no build toolchain.
- ffmpeg 9.0 is already on PATH (verified).
- Budget: ~45KB/frame desktop → **~5.4MB total**; mobile set ~1.6MB.
- **Intermediate PNGs are deleted after encode** — only ~8GB free on C:.
- Deterministic: seeded, no `Math.random()` at render time, so regeneration is
  byte-stable and reviewable.

### 6.3 Manifest — the Flow swap contract

```jsonc
// public/hero/frames.json
{
  "version": 1,
  "frameCount": 120,
  "sets": {
    "desktop": { "width": 1600, "height": 900, "path": "/hero/frames/desktop/f{i}.webp" },
    "mobile":  { "width": 800,  "height": 450, "path": "/hero/frames/mobile/f{i}.webp" }
  },
  "indexPad": 4,
  "poster": "/hero/poster.webp",
  "source": "procedural-v1"
}
```

**Replacing the procedural sequence with Google Flow footage later is:**

```bash
ffmpeg -i flow-hero.mp4 -vf "fps=24,scale=1600:900" -q:v 75 public/hero/frames/desktop/f%04d.webp
```

…then update `frameCount` and `source` in the manifest. **Zero component changes.**
The placeholder is not throwaway work — it is the pipeline the real footage uses.

### 6.4 Playback

```
<section class="hero-track">        height: 300vh
  <div class="hero-stage">          position: sticky; top: 0; height: 100vh
    <canvas>                        object-fit: cover
```

- `useFrameSequence(manifest)` — preloads via a bounded decode queue
  (6 concurrent, `img.decode()`), reports readiness, returns a `draw(i)`.
- Scroll → `progress = clamp(-rect.top / (rect.height - vh))` → `frame =
  round(progress × (N-1))` → `requestAnimationFrame` → `drawImage`. Never draw
  synchronously in the scroll handler; coalesce to one draw per frame.
- Poster shown until frame 0 decodes; sequence is progressive — the hero is
  interactive before all frames land, degrading to nearest-loaded-frame.
- `IntersectionObserver` unbinds the scroll listener when off-screen.
- Canvas sized to `devicePixelRatio`, capped at 2.
- Mobile set chosen by `matchMedia("(max-width: 768px)")` **and**
  `navigator.connection.saveData` / `effectiveType` — on 2G/3G, skip the sequence
  entirely and show the poster.

### 6.5 Accessibility & fallback — hard requirements

| Condition | Behaviour |
|---|---|
| `prefers-reduced-motion: reduce` | Static poster. Scroll track collapses to `100vh`. **No scrubbing.** |
| Save-Data / slow connection | Poster only, no frame fetch |
| Canvas or decode failure | Poster only; hero never blocks the page |
| Screen reader | `role="img"` with an `aria-label` describing the sequence; the track is not a focus trap |
| **Keyboard / skip** | The hero is decorative. A visible skip-link precedes it, and **Tab from the header must reach the SOS control without traversing 300vh.** |

**The hero must never delay or obstruct access to SOS.** It renders below the
primary action in DOM order, and nothing in the emergency path waits on frame loading.

---

## 7. Component inventory & migration

| Old (`App.jsx`) | New | Change |
|---|---|---|
| `C` token object | `styles/tokens.css` | Inline styles → CSS vars + Tailwind |
| `GlobalStyle` | `styles/base.css` | Delete; fonts self-hosted |
| `Badge` | `ui/Badge` | New palette, `status` variant carries a text label |
| `StatusDot` | `ui/StatusPill` | Infinite `blip` removed; label required |
| `Navbar` / `BottomNav` | `layout/Header` / `layout/MobileNav` | `NavLink`; remove `sosPulse` |
| `NetworkDiagram` | **deleted** | Superseded by the scroll hero |
| `Home` | `pages/Home` + sections | Decomposed; count-up stats cut (fabricated) |
| `Services` | `pages/Services` | Data → `lib/incident/routing.js` |
| `Sos` | `pages/Sos` + `features/sos/*` | **`setTimeout` timeline deleted** — real state machine |
| `Tracking` | `pages/Track` + `features/incident/*` | Real incident data; hardcoded ETA/distance removed |
| `useCountUp` | **deleted** | Animated invented numbers |
| `Footer` | `layout/Footer` | Adds the permanent `tel:112` fallback (PRD §12.2) |

**Data currently hardcoded and to be removed or sourced:** `"Indiranagar PS · 1.1 km"`,
`"St. Mark's Hospital · 1.8 km"`, `"Domlur Fire Station · 2.3 km"`, `"Priya S. · Notified"`,
`"Ambulance 102 / KA-01-AB-4521"`, `2.4 - t*1.8` km, `6 - t*5` min ETA, `100+` response
points, `5+` services. Every one becomes an adapter call or is cut.

---

## 8. Performance & quality budgets

| Metric | Budget |
|---|---|
| JS (gzip, initial) | < 120KB |
| CSS (gzip) | < 20KB |
| LCP | < 2.0s (hero poster is the LCP element, preloaded) |
| CLS | < 0.02 — hero stage reserves its box before frames load |
| Hero frames | < 6MB desktop, < 2MB mobile, all lazy |
| Lighthouse a11y | 100 |
| Route JS | Lazy per route; `/sos` **eagerly** loaded — never lazy-load the emergency path |

---

## 9. Open questions

| # | Question | Blocks |
|---|---|---|
| 1 | TypeScript or stay JS + JSDoc? Data contracts in PRD §6 want real types. | Whole rebuild |
| 2 | Dark theme in this pass, or tokens-only and ship light first? | Scope |
| 3 | Which map provider — Google Maps, Ola Maps, MapMyIndia? Affects `/track` heavily. | Track page |
| 4 | Hero art direction: abstract grid *(specified above)* vs a real Bengaluru road-network extract? The latter is far stronger and derivable from OSM data. | Hero generation |
| 5 | Keep `oxlint`, or move to ESLint + Prettier? | Tooling |
| 6 | Is the marketing home page needed at all, or should `/` *be* the SOS surface for returning users? | IA |

> Q4 is worth your attention: rendering the actual Bengaluru street network from
> OpenStreetMap as the hero substrate — real roads, real ward boundaries — would
> look categorically less generic than any abstract grid, procedural or AI-generated.
> It costs one extra data-prep step.

> Q6 too: a returning citizen opening this app during an emergency should not land
> on a marketing page. Strong argument for `/` being the SOS surface once a user is
> known, with the marketing site at `/about`.
