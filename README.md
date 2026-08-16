# City Shield

**Live: https://hanishchow.github.io/city-shield/**

A citizen emergency platform for Bengaluru. One tap plus continuous GPS replaces
six helplines — and every responding government agency shares **one incident
record** instead of receiving six disconnected phone calls.

> Prototype on mock data. No emergency service is contacted. Call 112 for real emergencies.

- [`docs/PRD.md`](docs/PRD.md) — product requirements, incident model, integration tiers
- [`docs/FRONTEND-SPEC.md`](docs/FRONTEND-SPEC.md) — design system, architecture, hero technique
- [`docs/CHECKLIST.md`](docs/CHECKLIST.md) — build checklist and open decisions

## Run it

```bash
npm install
npm run dev
```

Dev server: http://localhost:5178

**The app runs fully with zero environment variables.** Every external service
falls back to a mock adapter with realistic Bengaluru data, simulated GPS accuracy
drift, and injectable failure. Nothing is blocked on keys.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | oxlint |
| `npm test` | Incident state machine + routing tests (17) |
| `npm run hero:build` | Regenerate the hero frame sequence |
| `npm run check:keys` | Validate configured API keys with one real call each |
| `npm run deploy` | Build and publish to GitHub Pages |

## Deployment

Published to GitHub Pages from the `gh-pages` branch:

```bash
npm run deploy
```

The site is served from a sub-path (`/city-shield/`), so `vite.config.js` sets
`base` and the router takes `basename={import.meta.env.BASE_URL}`. The hero
manifest stores **base-relative** paths for the same reason. To host at a domain
root instead:

```bash
BASE_PATH=/ npm run build
```

`scripts/postbuild.mjs` writes `.nojekyll`, a `404.html` fallback, and a real
directory index for each static route — so `/sos`, `/services`, `/report` and
`/about` return a genuine **200** rather than Pages' 404-with-a-body. Dynamic
routes (`/track/:id`) still fall back to `404.html`: the page loads and routes
correctly, but the HTTP status is 404, which is unavoidable on static hosting.

## Configuration

Copy `.env.example` to `.env.local`. Both keys are optional.

> Every `VITE_*` variable is inlined into the client bundle as **plain text**.
> Only browser-safe, referrer-restricted keys belong there — never an SMS,
> payment, or admin key. Those require a backend, which is why guardian SMS
> stays mocked in this build.

Check whatever you configured:

```bash
npm run check:keys
```

Unconfigured keys report `SKIPPED` and exit 0. A failing key is reported, never
silently fallen back from.

## The hero

The homepage hero is a 120-frame image sequence scrubbed by scroll position —
the Apple product-page technique. Frames are generated procedurally and
deterministically by `scripts/hero/generate-frames.mjs`, then encoded to WebP.

```bash
npm run hero:build
```

Requires `ffmpeg` on PATH. Output is ~2.9 MB desktop and ~1.2 MB mobile;
intermediate PNGs are deleted after encoding.

It falls back to a static poster under `prefers-reduced-motion`, Save-Data, slow
connections, and decode failure. Deleting `public/hero/` entirely leaves the page
functional.

### Swapping in real footage

The component reads `public/hero/frames.json`, so replacing the procedural
sequence with rendered video (e.g. from Google Flow) needs **no component changes**:

```bash
ffmpeg -i flow-hero.mp4 -vf "fps=24,scale=1600:900" -q:v 75 -start_number 0 public/hero/frames/desktop/f%04d.webp
```

Then update `frameCount` and `source` in `public/hero/frames.json`.

## Architecture

```
src/
├── app/            router, providers (IncidentProvider)
├── pages/          Home, Sos, Track, Services, Report, About, NotFound
├── components/     layout/, ui/, hero/   — presentational, no data access
├── features/       sos/, location/       — domain components
├── lib/
│   ├── incident/   model, state machine, agency routing table
│   ├── services/   adapter layer (mock + real, selected by env)
│   └── utils/
└── styles/         tokens.css, base.css
```

Design tokens are CSS custom properties surfaced through Tailwind, so components
use `bg-surface text-ink border-line` — **no component references a raw hex**.

## Invariants

These hold everywhere and are worth preserving:

1. **No fabricated state.** Every status shown is backed by a real event. Anything
   derived from a mock is labelled as simulated.
2. **`tel:112` is always one tap away**, including on every error screen.
3. **No raw hex** in any component.
4. **No key value** in source, logs, or git history.
5. **The emergency path is never lazy-loaded** and never waits on the hero.
6. **Colour is never the sole carrier of meaning.**
7. **The app runs with zero env vars set.**

## Status

Prototype. Direct dispatch to police, ambulance or fire requires a government
integration that does not exist — see `docs/PRD.md` §11 for the honest tier
breakdown. In a real emergency, call 112.
