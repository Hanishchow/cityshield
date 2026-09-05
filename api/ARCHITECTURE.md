# City Shield API — Architecture

One incident record. Every agency attaches to it. That sentence is the whole
system; everything below is what it costs to make it true.

## The design pressure

This is not a CRUD app with a map. The constraints that actually shape it:

| Pressure | Consequence in the code |
|---|---|
| The user is in danger and may be one-handed, panicking, or injured | No account, no login, no form between them and help. The capability token IS the session. |
| The network is a failing mobile connection | Idempotency keys; SSE that reconnects itself; the client must work offline and sync. |
| Multiple agencies act on the same record concurrently | State transitions are server-authoritative and row-locked. The client proposes; the server decides. |
| A record may become evidence | Append-only, hash-chained audit trail. Silent edits become detectable. |
| Location is the most sensitive field we hold | It lives under its own retention clock and is deliberately kept OUT of the permanent audit log. |
| A vendor can fail mid-emergency | Provider chains fall back per-request, not per-boot. |

## Layers

```
routes/      HTTP surface. Parses, authorises, delegates. No business rules.
domain/      Incident model, legal state transitions, agency routing policy.
             Pure functions, no I/O, exhaustively tested.
store/       Persistence behind one interface. memory | postgres(+PostGIS).
providers/   External vendors behind one interface. mappls | ola | stand-in.
audit/       Hash-chained append-only log, independent of storage.
lib/         Cross-cutting: capability tokens, SSE fan-out, idempotency, telemetry.
```

The rule that keeps this honest: **`domain/` imports nothing from the other
layers.** Routing a cardiac arrest is a policy decision, and policy that depends
on a database connection cannot be tested exhaustively. It currently is.

## Decisions, and what they cost

### Server-authoritative state machine
`canTransition` lives on the server and the store takes `SELECT ... FOR UPDATE`
before checking it. A client that could pick its own transitions could mark its
own incident resolved, or skip `acknowledged` — the state a citizen is shown as
evidence that a human saw their report.
**Cost:** a round trip per transition. Accepted.

### SSE, not WebSockets
Tracking is one-way server→client. `EventSource` reconnects on its own after a
dropped mobile connection and survives proxies that break WS upgrades. This is
precisely the case where the link *will* drop and must return unaided.
**Cost:** no client→server channel on that socket. Fine; writes are POSTs.

### Capability tokens, not accounts
Holding the token grants one scope on one incident until expiry. No identity, no
other permission — which is what makes it safe to paste to a relative.
**Cost:** a leaked link is a leaked capability. Mitigated by short TTLs per scope
(agency 1h < citizen update 12h < track 7d) and by the token carrying no
authority beyond the single incident.

### Tamper-evident, not tamper-proof
Each audit entry commits to its predecessor's digest, so altering history breaks
every digest after it. Anyone with write access to the whole chain can still
recompute it end to end.
**Cost:** honest limitation. Making it tamper-proof needs the head digest
anchored outside the operator's control — and because it is a chain, only *one*
value has to leave the building to do that.

### Location out of the audit log
The log records that a fix arrived and how accurate it was, never the
coordinates. Copying location into a permanent append-only structure would put
the most sensitive field somewhere it can never be erased, which directly
contradicts storage limitation.

## Data protection (DPDP Act 2023)

Precise geolocation of an identifiable person is personal data. What is built in
response:

- **Purpose limitation** — location is collected to dispatch responders. It is
  not copied into analytics or the audit chain.
- **Storage limitation** — enforced by a sweeper (`lib/retention.ts`), not just
  configured. `RETENTION_PING_DAYS` (30) runs on a separate, shorter clock from
  `RETENTION_INCIDENT_DAYS` (365): pings are the sharpest data this service
  holds, so they are erased long before the record that justified collecting
  them. The sweep runs hourly and once at boot, and reports what it deleted.
- **Data residency** — chosen deployment region is Mumbai, so data does not
  leave India by default.
- **Credential containment** — map keys are server-side. Every `VITE_*` variable
  is inlined into the browser bundle in plaintext; that was tolerable with no
  backend and is not now.

> The scout worker tasked with confirming the section-level DPDP obligations
> crashed twice. **The DPDP claims above are therefore engineering intent, not
> verified legal analysis, and need a lawyer's review before any government
> submission.** Flagged rather than quietly asserted.

## Roadmap

**Built and tested:** incident domain and state machine, agency routing policy,
memory store, PostGIS store and schema, SSE fan-out, Mappls→Ola→stand-in
provider chain, audit chain, capability tokens, idempotency and telemetry
middleware, OpenAPI contract at `/docs`, retention sweeper, 120 tests.

**Next:** wire the PostGIS store behind `DATABASE_URL`; load BBMP ward polygons
so `ward` stops being stand-in data; agency-facing endpoints gated on the
`agency` token scope; a live map provider (Mappls credentials pending).

**Needs a government agreement, not code:** real dispatch to ERSS-112. Until that
exists, every simulated field is flagged `simulated: true` at the source rather
than being dressed up in the UI.
