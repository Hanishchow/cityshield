# City Shield — Rebuild Execution Checklist

**Companion to:** `PRD.md`, `FRONTEND-SPEC.md`
**Status:** rebuild executed on mocks · 2026-08-17

Legend: `[x]` done · `[~]` blocked on a decision · `[ ]` pending

---

## Stage 0 — Decisions

Resolved by default to unblock the build. **Any of these can be overruled.**

- [x] TypeScript vs JS → **JS + JSDoc** (repo was already JS; contracts documented as typedefs)
- [x] Hero substrate → **procedural grid**, swappable for real footage via manifest
- [x] `/` marketing vs SOS surface → **marketing home**, since the animated hero was the ask
- [x] Platform → **web app built now**; native decision deferred

Still genuinely open:

- [~] PRD §16 Q2 — citizen-only, or dispatcher console? *(≈2× scope)*
- [~] PRD §16 Q4 — Silent SOS in v1, or held for legal review?
- [~] PRD §16 Q7 — **PWA or native?** Silent SOS, background location and
      volume-button triggers are **not achievable in a browser**
- [~] PRD §16 Q8 — backend: build or BaaS? Guardian SMS is blocked on this
- [~] FRONTEND-SPEC §9 Q3 — map provider (Ola Maps / Google / Mappls)

---

## Stage 1 — Foundation ✅

- [x] `styles/tokens.css` — full light + dark token set
- [x] `tailwind.config.js` — tokens mapped into `theme.extend`
- [x] `styles/base.css` — reset, focus-visible ring, reduced-motion guard
- [x] Fonts self-hosted (`@fontsource-variable/inter`, `@fontsource/instrument-serif`)
- [x] `GlobalStyle` component and its Google Fonts `@import` deleted
- [x] Unused scaffolding removed (`react.svg`, `vite.svg`, `hero.png`, `icons.svg`)
- [ ] `git init` — **still not a repo.** The original file survives at
      `C:\Users\yakka\Downloads\city-shield.jsx`, so nothing was lost, but this
      should happen before further work

**Verified:** no request to `fonts.googleapis.com`; tokens resolve in-browser
(`--ground #fbfaf8`, `--signal #c8102e`, `--civic #1e3a5f`).

---

## Stage 2 — Structure ✅

- [x] `react-router-dom` v7, real URLs
- [x] `src/` tree per FRONTEND-SPEC §5.1
- [x] `app/App.jsx` = router + providers only
- [x] `/sos` and `/track` eagerly imported; marketing routes lazy
- [x] Header / Footer / MobileNav on `NavLink`
- [x] Permanent `tel:112` in header, footer, and every error surface

**Verified:** all 7 routes render by direct URL; `/totally-bogus` → NotFound;
**every route carries 5–6 `tel:` links including 404 and Track.**

---

## Stage 3 — UI primitives ✅

- [x] `Button` — `civic` / `signal` / `outline` / `ghost` / `quiet`, 44px min target
- [x] `StatusPill` — **text label mandatory**, infinite pulse removed
- [x] `Card`, `CardLabel`, `MockNotice`
- [x] Focus-visible ring globally

---

## Stage 4 — Incident model ✅

- [x] `model.js` — `Incident`, `LocationPing`, `AgencyTask`
- [x] `machine.js` — PRD §7 machine; **illegal transitions throw**
- [x] `routing.js` — PRD §8 table as data
- [x] `IncidentProvider` — context + reducer

**Verified:** `npm test` → **17/17 passing**, covering the full progress spine,
illegal-transition rejection, terminal states having no exits, cancellability
from every pre-arrival state, one-way escalation, upward-only severity override,
civic never carrying emergency severity, and ETA defaulting to `null` rather
than a guess.

---

## Stage 5 — Service adapters ✅

- [x] Mock adapters with realistic Bengaluru data and simulated accuracy drift
- [x] Browser geolocation adapter with the PRD §10.3 battery cadence ladder
- [x] Env-based adapter selection
- [x] `.env.example` committed; `.env.local` gitignored
- [x] `adapterStatus` surfaced on `/about` so nothing pretends to be live

---

## Stage 6 — Key validation ✅

- [x] `scripts/check-keys.mjs`, one real call per configured service
- [x] Values masked to 6 chars; never logged in full
- [x] `npm run check:keys`

**Verified:** with no keys → both `SKIPPED`, exit 0.

---

## Stage 7 — Hero sequence ✅

- [x] Deterministic generator, 120 frames, desktop + mobile sets
- [x] ffmpeg → WebP, poster, manifest, **intermediates cleaned**
- [x] `useFrameSequence` — bounded decode queue, progressive readiness
- [x] `ScrollHero` — sticky stage, rAF-coalesced draw, IntersectionObserver, DPR cap 2
- [x] Fallbacks: reduced-motion, Save-Data, slow link, decode failure → poster
- [x] Skip-links precede the hero (`#main` and `/sos`)

**Verified:** desktop **2.90 MB** (budget 6), mobile **1.23 MB** (budget 2);
~25 KB/frame. Poster fallback and the 70vh collapsed track confirmed in-browser.

**Not verified:** live scroll-scrubbing and 60fps. The automation browser pane
runs hidden, so `requestAnimationFrame` is frozen and images never fire `load` —
**needs a human to open the page and scroll.**

Fixed during verification: `img.decode()` rejects on hidden documents, which had
made the hero fall back to the poster permanently on a backgrounded tab. `load`
is now the source of truth and `decode()` is best-effort.

---

## Stage 8 — Pages ✅

- [x] `Home` — hero, problem, how-it-works, live routing table, commitments
- [x] `Services` — driven by `routing.js`, grouped by urgency
- [x] `Sos` — press-down location acquisition, 2s hold, category picker, 10s auto-route
- [x] `Track` — agency list showing sibling states, real timeline, accuracy banner
- [x] `Report` — calm civic flow, no siren language, no hold-to-commit
- [x] `About` — honest Tier 1/2/3 breakdown and live adapter status
- [x] `NotFound`

**Verified by grep — zero hits for:** `useCountUp`, `Space Grotesk`,
`fonts.googleapis`, `Indiranagar PS`, `St. Mark`, `KA-01-AB-4521`.
**Raw hex appears only in `styles/tokens.css`.**

---

## Stage 9 — Accessibility ⚠️ partial

- [x] `aria-live="assertive"` on SOS commit, `polite` on incident status
- [x] Skip-links, `role="img"` + descriptive `aria-label` on the hero
- [x] Focus-visible ring; 44px minimum targets
- [x] Colour never the sole carrier of meaning (StatusPill always labelled)
- [x] No infinite animations outside the scroll-driven hero
- [ ] Screen-reader pass (NVDA / Narrator) — **needs a human**
- [ ] Lighthouse a11y run — **needs a visible browser**
- [ ] 200% zoom / 320px width check — **needs a visible browser**

---

## Stage 10 — Ship checks ✅ / partial

- [x] `npm run build` clean
- [x] `npm run lint` clean — zero warnings
- [x] `npm test` — 17/17
- [x] Budgets met: **JS 88 KB gzip** (budget 120), **CSS 5.1 KB gzip** (budget 20)
- [x] README with setup, `hero:build`, `check:keys`, deploy, and the Flow swap command
- [x] **No secret in git history** — only `.env.example` is tracked; verified before the first commit
- [ ] Lighthouse perf/a11y — needs a visible browser

---

## Stage 11 — Deployment ✅

- [x] `git init`, first commit, pushed to `Hanishchow/city-shield` (public)
- [x] Sub-path support: `vite base`, router `basename`, base-relative hero manifest
- [x] `%BASE_URL%` for favicon and poster preload in `index.html`
- [x] Raw `href="/sos"` anchors converted to router `Link` so they respect the basename
- [x] `postbuild.mjs` — `.nojekyll`, `404.html`, real directory indexes per static route
- [x] `npm run deploy` — repeatable publish to `gh-pages`
- [x] GitHub Pages enabled on `gh-pages` / root

**Live:** https://hanishchow.github.io/city-shield/

**Verified on the deployed site:** all 7 routes render; `/`, `/sos`, `/services`,
`/report`, `/about` return **200**; hero manifest loads with 120 frames;
**zero failed resource requests**.

Known and accepted: `/track/:id` and unknown paths return HTTP **404** while
serving the app. Correct for unknown paths; unavoidable for dynamic routes on
static hosting. The page loads and routes correctly either way.

---

## Cross-cutting invariants

All currently hold:

1. **No fabricated state.** Simulated agency progression is labelled with
   `MockNotice` wherever it surfaces.
2. **`tel:112` always one tap away** — confirmed on all 7 routes.
3. **No raw hex** outside `tokens.css` — confirmed by grep.
4. **No key value** in source or logs — checker masks to 6 chars.
5. **Emergency path never lazy-loaded** and never waits on the hero.
6. **Colour never the sole carrier of meaning.**
7. **App runs with zero env vars set** — this is how it currently runs.

---

## What a human needs to check

The automation browser runs with a hidden pane, so anything requiring
compositing could not be verified:

1. Open http://localhost:5178 and **scroll the hero** — confirm smooth scrubbing.
2. Confirm the SOS hold completes in ~2s (rAF-driven, frozen in a hidden tab).
3. Toggle OS reduced-motion and confirm the track collapses to one screen.
4. Run Lighthouse on `/` and `/sos`.
