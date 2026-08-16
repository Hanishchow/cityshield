# City Shield — Product Requirements Document

**Status:** Draft v0.1 · for review
**Owner:** —
**Last updated:** 2026-08-17
**Scope:** Bengaluru (BBMP jurisdiction) pilot, architected for multi-city

> Sections marked `> OPEN QUESTION` are assumptions I made to keep the document
> coherent. Overrule any of them — they are the fastest way for you to shape v1.

---

## 1. Summary

City Shield is a citizen emergency platform that replaces *"which number do I call?"*
with a single action, and — the part that actually matters — keeps every responding
government agency attached to **one shared incident record** instead of six
disconnected phone calls.

The product is not a directory of helplines with a nicer skin. It is an
**incident coordination layer**: the citizen creates an incident once, their live
location streams into it continuously, and agencies attach to it, see each other,
and hand off between themselves without the citizen ever re-explaining.

---

## 2. Problem

### 2.1 The citizen's problem

In an emergency a citizen in Bengaluru is expected to know which of these to dial:

| Number | Service | Notes |
|---|---|---|
| 112 | National emergency (ERSS) | Meant to be the single number; awareness is low |
| 100 | Police | Being consolidated into 112 |
| 101 | Fire & rescue | |
| 108 | Emergency ambulance | Operated via state EMS partner in Karnataka |
| 1091 | Women's helpline | |
| 1098 | Childline | |
| 1077 | District disaster control room | |
| 1533 | BBMP civic helpline | Non-emergency civic complaints |

> OPEN QUESTION: These numbers need verification against current Karnataka
> operations before shipping — helpline ownership changes, and 100/101/108 are
> progressively being folded into 112. Do you have a verified source, or should
> confirming these be a v1 task?

Three failures follow from this list:

1. **Selection cost under stress.** Choosing correctly requires knowing the
   taxonomy of Indian emergency services at the worst possible moment.
2. **Location is spoken, not sensed.** The caller describes where they are.
   Accuracy collapses on flyovers, in apartment complexes, at night, in an
   unfamiliar area, or when the caller is injured, panicking, or not a local
   language speaker.
3. **Every call is a silo.** A road accident needs ambulance *and* police *and*
   often BBMP. That is three calls, three descriptions, three independent
   dispatches, and zero shared awareness between them.

### 2.2 The agency's problem

Agencies receive an incident with no structured location, no media, no history,
and no visibility into whether another agency is already en route to the same
event. Duplicate dispatch and blind arrival are the norm, not the exception.

---

## 3. Thesis

> **One tap creates one incident. GPS keeps it located. Every agency works the
> same record.**

Three claims, in dependency order:

1. **Collapse the decision.** The citizen states *what is happening*, not *which
   department owns it*. Routing is the system's job.
2. **Sense the location, don't ask for it.** Continuous, accuracy-annotated GPS
   from the moment of report to the moment of resolution.
3. **Federate the response.** The incident is the shared spine. Agencies attach
   to it rather than each receiving a private copy.

Claim 3 is the defensible one. Claims 1 and 2 are table stakes that several apps
already attempt; nobody has made the agencies *interoperate*.

---

## 4. Non-goals

Explicitly out of scope, to keep v1 honest:

- **Not a replacement for 112.** City Shield routes *into* official channels; it
  does not claim to be the emergency service.
- **Not a dispatch system.** We do not assign vehicles or manage agency fleets.
- **Not a medical advice product.** No triage guidance, no first-aid instruction
  beyond linking official material.
- **Not a social/community safety feed** in v1. Crowd alerts are roadmap, not v1 —
  they carry serious misinformation risk during live emergencies.
- **Not multi-city at launch.** Bengaluru only, but no Bengaluru assumptions
  hardcoded below the routing table.

---

## 5. Users & roles

| Role | Who | Primary need |
|---|---|---|
| **Citizen** | Any resident or visitor | Get help fast without choosing a department |
| **Guardian** | Emergency contact of a citizen | Know when someone they care about is in trouble, and where |
| **Responder** | Field unit — ambulance crew, patrol, fire tender | Reach the right place, know who else is coming |
| **Dispatcher** | Agency control room operator | Assess, accept, assign, and hand off incidents |
| **Civic officer** | BBMP ward-level staff | Receive and close non-emergency civic reports |
| **Administrator** | Platform operator | Abuse review, audit, agency onboarding |

> OPEN QUESTION: Is v1 citizen-only (agencies receive via SMS/deep-link handoff),
> or does v1 include a real dispatcher console? This is the single largest scope
> fork in the document — it roughly doubles the build either way.

---

## 6. Core model — the incident spine

Everything in the system hangs off one object.

### 6.1 `Incident`

```jsonc
{
  "id": "inc_01J8...",              // ULID, sortable by creation time
  "createdAt": "2026-08-17T14:02:11Z",
  "reportedBy": "usr_...",           // null for anonymous reports
  "channel": "app" ,                 // app | sms | ivr | web
  "category": "medical",             // see routing table §8
  "subcategory": "road_accident",
  "severity": "critical",            // critical | urgent | standard | civic
  "silent": false,                   // §9.2 — suppresses all UI/audio feedback
  "description": "…",                // optional free text or voice transcript
  "media": ["med_…"],                // photos, audio, short video
  "origin": { "lat": 12.9784, "lng": 77.6408, "accuracy": 8.2 },
  "currentLocation": { /* latest LocationPing */ },
  "locationTrack": ["lp_…"],         // ordered LocationPing ids
  "agencies": [ /* AgencyTask[] */ ],// §6.3 — the interconnection
  "guardiansNotified": ["usr_…"],
  "state": "responding",             // §7
  "stateHistory": [ /* transitions with actor + timestamp */ ],
  "resolvedAt": null,
  "resolution": null,                // outcome + closing agency
  "auditLog": ["aud_…"]              // append-only, §13
}
```

### 6.2 `LocationPing`

Location is a **stream**, not a field.

```jsonc
{
  "id": "lp_…",
  "incidentId": "inc_…",
  "at": "2026-08-17T14:02:19Z",
  "lat": 12.9784, "lng": 77.6408,
  "accuracy": 8.2,                   // metres, from the Geolocation API
  "altitude": 912.0,                 // floor inference input where available
  "heading": 184.5, "speed": 1.2,
  "source": "gps",                   // gps | network | fused | manual | last_known
  "battery": 0.34,                   // drives §10.3 degradation
  "stale": false
}
```

### 6.3 `AgencyTask` — one per agency attached to the incident

```jsonc
{
  "id": "at_…",
  "incidentId": "inc_…",
  "agency": "ambulance",             // police | ambulance | fire | civic | disaster
  "role": "primary",                 // primary | secondary | observer
  "attachedBy": "system",            // system | dispatcher:usr_… | agency:police
  "attachedAt": "2026-08-17T14:02:13Z",
  "state": "en_route",               // notified | accepted | en_route | on_scene | cleared | declined
  "unit": { "id": "KA01AB4521", "type": "als_ambulance", "contact": "…" },
  "eta": "2026-08-17T14:09:00Z",
  "notes": []
}
```

**This is the interconnection.** A road accident is *one* `Incident` with three
`AgencyTask`s — ambulance (primary), police (secondary), civic (secondary, for the
damaged divider). Each agency sees the shared incident, its own task, and the
state of every sibling task. Nobody arrives blind. Nobody is dispatched twice.

---

## 7. Incident lifecycle

```
 draft ──► reported ──► routed ──► acknowledged ──► responding ──► on_scene ──► resolved
   │           │           │             │               │             │
   │           │           │             │               │             └──► escalated
   │           │           └─────────────┴───────────────┴────────────────► cancelled
   │           └──► failed_routing ──► manual_fallback (§12.2)
   └──► abandoned
```

| State | Meaning | Exit condition |
|---|---|---|
| `draft` | Hold in progress, not yet committed | Hold completes, or released early |
| `reported` | Committed; location captured | Routing table evaluated |
| `routed` | Agencies selected, notifications dispatched | First agency acknowledges |
| `acknowledged` | At least one agency has the incident | Unit assigned |
| `responding` | Unit(s) en route, live tracking active | Unit reports on scene |
| `on_scene` | Responder arrived | Closing agency resolves |
| `resolved` | Outcome recorded | Terminal |
| `escalated` | No acknowledgement within SLA, or dead-man triggered (§9.3) | Re-routes, widens fan-out |
| `cancelled` | Citizen cancelled with confirmation | Terminal, retained for abuse review |
| `failed_routing` | No agency reachable | Falls to manual fallback (§12.2) |

**Critical rule:** the incident is never silently dropped. Every terminal state is
explicit and recorded. A user must never be left believing help is coming when it
is not.

---

## 8. Agency routing table

Category → primary agency + automatically notified secondaries. This table is the
system's answer to *"which number do I call?"* — it exists so the citizen never has to.

| Category | Primary | Auto-notified secondary | Severity default |
|---|---|---|---|
| `medical` | Ambulance | — | critical |
| `medical.road_accident` | Ambulance | Police, Civic | critical |
| `crime.in_progress` | Police | — | critical |
| `crime.report` | Police | — | urgent |
| `personal_safety` | Police | Guardians | critical |
| `personal_safety.silent` | Police | Guardians | critical |
| `fire.structure` | Fire | Police, Ambulance | critical |
| `fire.vehicle` | Fire | Police | critical |
| `rescue.trapped` | Fire | Ambulance | critical |
| `disaster.flooding` | Disaster cell | Civic, Fire | urgent |
| `disaster.tree_fall` | Civic | Fire *(if blocking / live wires)* | urgent |
| `civic.road_damage` | Civic | — | civic |
| `civic.water` / `.garbage` / `.streetlight` / `.drainage` | Civic | — | civic |
| `utility.live_wire` | Utility | Fire, Civic | critical |

Rules:
- Secondaries are **notified, not dispatched** — they attach as `observer` and
  self-promote to `secondary` if they choose to respond.
- Severity is derived, then **user-overridable upward only** (a citizen can escalate
  their own report but cannot downgrade a system-critical classification).
- `civic` severity never pages an emergency channel. Civic and emergency paths must
  not share an alerting queue.

> OPEN QUESTION: Is `utility` (BESCOM for live wires, BWSSB for water mains) in
> scope for v1, or does everything utility-shaped route to Civic?

---

## 9. Key flows

### 9.1 Emergency SOS — the primary flow

1. **Hold to commit.** A 2-second press-and-hold, not a tap. Prevents pocket
   dispatch; the deliberate hold is itself the confirmation. Releasing early
   aborts silently.
2. **Location first.** Location acquisition starts on *press-down*, not on commit —
   we buy 2 seconds of GPS lock before the incident even exists.
3. **Category.** Post-commit, the citizen picks a category from large targets. If
   they pick nothing within 10s, the incident routes as `unknown` → Police primary,
   Ambulance secondary, and a human dispatcher disambiguates.
4. **Routing & notification.** Table §8 evaluates. Agencies notified. Guardians
   fan out per §9.4.
5. **Live tracking.** Location streams. Citizen sees exactly which agencies are
   attached and each one's state — never a fake progress bar.
6. **Resolution.** Only a responder or the citizen (with confirmation) can close.

**Anti-requirement:** the current demo shows a simulated timeline that advances on
a `setTimeout` regardless of reality. **Every status shown must be backed by an
actual event.** Fabricated reassurance in an emergency product is a safety defect,
not a UI flourish. If we don't know, we say we don't know.

### 9.2 Silent SOS

For domestic violence, kidnapping, stalking, coercion — situations where visible
phone use escalates danger.

- Triggered by volume-button pattern or a lock-screen action, not an on-screen button.
- **Zero feedback**: no sound, no vibration, no screen change, no notification banner.
- App presents a decoy screen if opened.
- Streams location and ambient audio *(consent-gated, see §14)* to Police + Guardians.
- Cancellation requires a **duress-aware PIN**: a distinct "safe" PIN cancels
  genuinely; the normal PIN under coercion cancels visibly while silently
  maintaining the incident.

> OPEN QUESTION: Silent SOS is the highest-risk, highest-value feature in this
> document. It also has real legal exposure around ambient audio capture. Do you
> want it in v1, or held until there is a legal review?

### 9.3 Escalation & dead-man's switch

- If no agency acknowledges within **SLA** (critical: 60s, urgent: 180s), the
  incident auto-escalates: widen the fan-out, notify all secondaries as primaries,
  surface to human dispatcher, and fall back to the §12.2 manual path.
- If the citizen is prompted for a wellness check and does not respond within 30s
  during a `critical` incident, treat as deterioration: escalate severity and
  notify all guardians.
- Escalation is **one-way**. It never de-escalates automatically.

### 9.4 Guardian fan-out

Emergency contacts receive, in order, until one acknowledges: push → SMS with a
live-tracking link → voice call. The tracking link is a **capability URL**
(unguessable, incident-scoped, auto-expiring on resolution + retention window).

### 9.5 Civic report

Deliberately a *different* flow — calmer, slower, no siren language, no hold-to-commit.
Photo, category, auto-located ward, submit, receive a tracking reference. Civic
reports are a queue, not a dispatch.

### 9.6 Cross-agency handoff

Any attached agency may attach another to the live incident. The citizen is
informed, never re-interviewed. The new agency inherits the full incident: the
location track, media, description, and every sibling task's state.

**This is the feature that does not exist today.** It is the thing to demo.

---

## 10. Location subsystem

### 10.1 Acquisition

- `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
- **Permission is requested at onboarding with a plain-language rationale**, never
  first at the moment of emergency — a permission dialog is the worst possible
  thing to hit during an SOS.
- Last-known-good location is cached so an incident always has *something*, tagged
  `source: "last_known"` and clearly labelled stale to responders.

### 10.2 Accuracy honesty

Responders see the **accuracy radius**, not a falsely precise pin. A 60-metre
accuracy circle displayed as a 2-metre dot is actively dangerous. Ping source
(`gps` / `network` / `last_known`) is always visible.

### 10.3 Battery-aware degradation

An emergency often coincides with a dying phone. Ping cadence adapts:

| Battery | Cadence | Notes |
|---|---|---|
| > 40% | 3s | Full fidelity |
| 15–40% | 10s | Reduced |
| 5–15% | 30s | Low-power; high-accuracy off between fixes |
| < 5% | Final ping + SMS | Send a last known position over SMS before death |

### 10.4 Indoor & vertical

GPS gives no floor. v1 captures altitude and any Wi-Fi/BLE hints, and **prompts the
citizen for a floor/landmark** when accuracy is poor or altitude suggests a
multi-storey structure. Cheap, and materially useful to a fire crew.

---

## 11. Integration tiers

An honest assessment. India's 112 ERSS is operated by state Emergency Response
Centres under MHA and has **no open public dispatch API**. Any product claiming
direct police/ambulance dispatch without a state MoU is misrepresenting itself.

### Tier 1 — buildable now, no partnership required

| Capability | Approach |
|---|---|
| Device geolocation | Browser Geolocation API |
| Maps & reverse geocoding | Maps provider (Google Maps / Ola Maps / MapMyIndia) |
| Nearby facility lookup | Places API + curated static facility dataset |
| SMS & OTP | SMS gateway (MSG91 / Twilio) |
| **112 handoff** | Deep-link `tel:112` + concurrent structured SMS carrying lat/lng, category, callback number |
| BBMP civic complaint | Sahaaya grievance submission |
| Guardian notification | Push + SMS + voice |

Tier 1 alone is a shippable, genuinely useful product: it collapses the decision,
senses location, hands a structured location off to 112, and fans out to guardians.

### Tier 2 — requires MoU / government partnership

Direct CAD dispatch integration · live responder telemetry · agency dispatcher
console accounts · hospital bed & specialty availability · official incident IDs.

### Tier 3 — aspirational

True cross-agency incident federation, where an incident created in City Shield is
a first-class record inside each agency's own system.

**Every Tier 2/3 capability is built behind an adapter interface identical to its
mock.** Partnership arrival is a configuration change, not a rewrite. See
`FRONTEND-SPEC.md` §5.

> OPEN QUESTION: Is there an existing government relationship — BBMP, Bengaluru
> City Police, KSDMA — or is this pitched cold? It changes whether Tier 2 is a
> quarter away or a year away, and therefore how much of the UI should assume it.

---

## 12. Reliability & degradation

Emergency software is defined by how it behaves when things fail.

### 12.1 Degradation ladder

| Condition | Behaviour |
|---|---|
| No data, has cellular | SMS fallback with lat/lng + category; queued sync on reconnect |
| No GPS lock | Last-known + manual pin drop + text landmark, all labelled as such |
| App backgrounded | Location continues for active incidents only |
| Server unreachable | Local incident record persists; retry with backoff; **always** surface the `tel:` fallback |
| Total failure | The dialer is one tap away, always. The app must never be the only path to help. |

### 12.2 Manual fallback

At every failure point the UI presents **"Call 112 now"** as a live `tel:` link.
This is a hard requirement, not a courtesy. City Shield must degrade to being a
very good phone dialer.

### 12.3 Targets

| Metric | Target |
|---|---|
| SOS commit → incident persisted | < 1.5s p95 |
| Incident → agency notified | < 5s p95 |
| Cold app open → SOS ready | < 2s p95 |
| Location first fix | < 3s p95 outdoors |
| Availability | 99.9%, with offline-capable client |

---

## 13. Trust, abuse & safety

Emergency systems are abused. Ignoring this makes the product unshippable.

- **Verified identity for report creation.** Phone-number verified. Anonymous
  reporting allowed only for `civic`.
- **False-report tracking.** Per-account rate of cancelled/false incidents;
  progressive friction, then suspension. Never a silent block — a suspended user
  is still routed to `tel:112`.
- **Rate limiting** per account and per device, with an override path for genuine
  repeat reporters (e.g. someone in an ongoing dangerous situation).
- **Append-only audit log** on every incident: who saw it, who attached, who
  changed state, when. Non-negotiable for a system touching police dispatch.
- **Responder verification.** Any unit shown to a citizen must be verifiable —
  displaying an unverified "responder is coming" is an attack vector.
- **Duress-aware cancellation** (§9.2).

---

## 14. Privacy & compliance

- **Location is streamed only during an active incident.** Never background,
  never ambient, no exceptions. This is the product's core privacy promise and
  should be stated in the UI, not buried in a policy.
- **Retention:** location tracks retained 90 days for incident review, then
  deleted. Incident metadata retained longer for audit; personal location data is not.
- **Purpose limitation:** incident data is available to attached agencies only, and
  only for the duration of attachment plus the review window.
- **DPDP Act 2023 alignment:** explicit consent for location and contacts, stated
  purpose, defined retention, deletion on request, breach notification path.
  Emergency processing may fall under legitimate-use provisions — **this needs
  actual legal review**, not my reading.
- **Ambient audio** (§9.2) is separately consented, never on by default, and
  disclosed prominently.
- Capability URLs for guardian tracking links expire on resolution.

> OPEN QUESTION: Ambient audio capture and duress PINs both need a lawyer's eyes
> before v1 ships. Do you have counsel, or should the spec assume these are cut?

---

## 15. Success metrics

| Metric | Why it matters |
|---|---|
| Time from SOS commit → agency acknowledgement | The core promise |
| % incidents with GPS accuracy < 20m at report | Location quality |
| **% incidents with > 1 agency attached** | **Interconnection actually happening** |
| Cross-agency handoffs per 100 incidents | The differentiator, measured |
| False-report rate | Trust integrity |
| Guardian acknowledgement rate | Fan-out effectiveness |
| SMS-fallback usage rate | How often the network fails us |
| Cancelled-before-acknowledgement rate | Signals accidental triggers |

The metric that defines the product is **% of incidents with more than one agency
attached**. If that number is near zero, City Shield is a nicer helpline directory
and the thesis is unproven.

---

## 16. Open questions — consolidated

| # | Question | Blocks |
|---|---|---|
| 1 | Helpline numbers verified against current Karnataka operations? | Content accuracy |
| 2 | Citizen-only v1, or dispatcher console included? | Scope, ~2× |
| 3 | Is `utility` (BESCOM/BWSSB) in scope, or all → Civic? | Routing table |
| 4 | Silent SOS in v1, or held for legal review? | Highest-risk feature |
| 5 | Existing government relationship, or cold pitch? | Tier 2 timeline |
| 6 | Legal counsel available for ambient audio + duress PIN? | Compliance |
| 7 | Native app or PWA? Silent SOS and reliable background location **require native**. | Platform |
| 8 | Backend: build, or BaaS? Nothing exists yet. | Architecture |
| 9 | Languages at launch — English + Kannada + Hindi? | i18n from day one |

> Q7 is worth flagging hard: several features in this document (volume-button
> triggers, true background location, lock-screen actions, reliable SMS fallback)
> **cannot be built as a web app**. A PWA can deliver a compelling demo and the
> full Tier 1 citizen flow, but Silent SOS is not achievable in a browser. The
> frontend rebuild is valuable either way — it becomes the web presence and the
> React Native codebase's design system — but the decision should be explicit.

---

## 17. Roadmap sketch

| Phase | Contents |
|---|---|
| **v0 — this rebuild** | New frontend, design system, incident model in-client, mock adapters, scroll hero |
| **v1 — Tier 1 live** | Real geolocation, maps, SMS fallback, 112 structured handoff, guardians, BBMP civic submission |
| **v2 — agency side** | Dispatcher console, real `AgencyTask` states, handoff, audit |
| **v3 — Tier 2** | CAD integration under MoU, responder telemetry, hospital availability |
| **v4** | Multi-city, community alerts, IoT triggers (crash detection, wearables) |

---

## 18. Appendix — glossary

| Term | Meaning |
|---|---|
| **ERSS** | Emergency Response Support System — India's 112 national emergency service |
| **BBMP** | Bruhat Bengaluru Mahanagara Palike — Bengaluru's municipal corporation |
| **Sahaaya** | BBMP's public grievance redressal system |
| **CAD** | Computer-Aided Dispatch — agency-side dispatch software |
| **DPDP Act** | Digital Personal Data Protection Act, 2023 |
| **Capability URL** | Unguessable URL that grants access by possession alone |
| **Dead-man's switch** | Escalation triggered by *absence* of user response |
