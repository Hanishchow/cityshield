# City Shield

One emergency incident record that every responding agency in Bengaluru attaches
to, instead of knowing which of eight public helplines to call.

**Live:** https://hanishchow.github.io/cityshield/

> **Prototype.** This does not dispatch real emergency services. Real dispatch
> needs an ERSS-112 integration that requires a government agreement. Responder
> positions in live tracking are simulated and labelled as such in the
> interface. **In a real emergency in India, call 112.**

## What it does

- **One action raises an incident.** The citizen never picks a department. A
  server-side routing policy assigns a primary agency and attaches secondaries.
- **Location carries its uncertainty.** Accuracy radius and fix source are always
  shown, never a falsely precise pin.
- **Every agency shares one record** and can see the others on it.
- **Live tracking** shows units converging on a real map.
- **It degrades to a phone call.** No data, no GPS, no server: 112 stays one tap
  away on every screen, including every error state.

## Layout

```
.            React 19 + Vite 8 + Tailwind 3. Installable PWA.
api/         Node 24 + Fastify 5 + Zod. TypeScript, no build step.
```

## Running it

Both halves run with **zero environment variables**. Absent credentials degrade
a capability to a clearly-labelled stand-in; they never stop the app booting.

```bash
npm install && npm run dev          # app on http://localhost:5178
cd api && npm install && npm run dev # api on http://localhost:8787
```

Tests: `npm test` (app) and `npm test` in `api/`.

## Configuration

Copy `api/.env.example` to `api/.env` and fill in what you have.

| Variable | Effect when absent |
|---|---|
| `MAPPLS_CLIENT_ID` / `_SECRET` | falls back to Ola, then a labelled stand-in |
| `OLA_MAPS_API_KEY` | same chain, one step down |
| `DATABASE_URL` | in-memory store instead of Postgres + PostGIS |
| `VITE_MAPS_API_KEY` | map renders as a schematic grid |

Map provider credentials live on the **server**. Every `VITE_*` variable is
inlined into the browser bundle in plaintext, so anything secret must not be one.

## Design notes

`api/ARCHITECTURE.md` covers the state machine, the tamper-evident audit chain,
capability tokens, retention under the DPDP Act, and what is deliberately still
mocked.
