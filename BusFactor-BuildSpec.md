# BusFactor — Build Spec v1.0
**Team SpaM** — Mahesh (lead, Claude Code + VS Code + Antigravity) · Sp (Antigravity)
**Hackathon:** The Hangover: Part AI (WeMakeDevs × Cognee) · Deadline: Jul 5, 2026
**Working time remaining at spec writing: ~42h from Jul 4, 00:00 IST**

---

## 0. One-paragraph definition

BusFactor is an agentic system that gives an engineering organization a persistent memory of *who knows what* — and acts on it. It ingests git history, postmortems, ADRs, runbooks, and Slack threads into a Cognee knowledge graph, computes a knowledge-risk score for every (engineer, service) pair, and when a key engineer resigns, it autonomously conducts a targeted knowledge-capture interview, writes the answers back into organizational memory, and visibly heals the risk map. It forgets deprecated systems so it never wastes capture effort on dead knowledge.

**The demo is the requirement.** Everything below exists to make the 3-minute demo (§2) work flawlessly. Anything not on the demo path is out of scope.

---

## 1. Scope

### In scope (MVP — must work)
- R1. Ingest the FloatPay screenplay dataset into Cognee (`add` → `cognify`)
- R2. Knowledge-risk engine: score every (engineer, service) pair; formula must be visible in UI
- R3. Risk dashboard: force-graph of engineers↔services colored by risk + ranked risk table
- R4. Resignation trigger: select "Priya Nair" → agent identifies her exclusive knowledge zones
- R5. Capture interview: agent generates ≤3 targeted questions per red zone from recalled context; chat UI; answers stored via Cognee `add` + re-`cognify`
- R6. Risk recomputation after capture → graph visibly heals (red → green)
- R7. Forget: `legacy-fx-service` is excluded/pruned (Cognee `forget`/dataset delete or ontology exclusion) — agent must never ask about it, and UI shows it greyed out
- R8. Decoy correctness: analytics-pipeline shows LOW risk despite sole committer (doc-coverage term)

### Stretch (only if MVP is demo-ready by Sat 20:00 IST)
- S1. `memify` run after capture, shown in demo narration
- S2. Generated "handover document" artifact per red zone from interview answers
- S3. Live judge-as-Priya interactive interview in the demo

### Out of scope (do not build, do not discuss)
- Auth, multi-org, real git integration, Slack/GitHub connectors, mobile, deployment beyond localhost/tunnel, LangGraph orchestration (plain FastAPI loop is enough).

---

## 2. The Demo Script (source of truth)

1. **[20s] Problem:** "Every team has a Priya — the only person who knows how the money actually moves. The industry calls it the bus factor. Nobody tracks it."
2. **[30s] Dashboard:** FloatPay's knowledge graph. Three services glow red around Priya. Click one → risk breakdown shows the formula: exclusivity × centrality × (1 − doc-coverage). Point at analytics-pipeline: "sole committer, but green — because the graph knows a validated runbook covers it. A naive metric can't tell those apart. The knowledge graph can."
3. **[20s] Forget:** "legacy-fx-service — also single-owner. Greyed out. The graph read ADR-015, knows it's deprecated, and *forgot* it. Memory that knows what NOT to remember."
4. **[30s] Event:** Click "Priya Nair resigns." Agent traverses her exclusive subgraph, announces 3 red zones with evidence (postmortems resolved, Slack answers only she gave).
5. **[60s] Capture:** Agent interviews Priya (Sp or a judge plays her). 3 sharp questions per zone — questions that could only come from the graph ("PM-2026-01 mentions your reversal script — where does it live and how does it key duplicates?"). Answers stream into memory.
6. **[30s] Heal:** Re-cognify. Risk scores recompute live. Red zones fade. "The organization just survived losing its most critical engineer. That's memory as infrastructure."

**Fail-safes:** every step must have a rehearsed fallback (see §8).

---

## 3. HLD — Architecture

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND (Sp) — React + Vite + Tailwind                 │
│  Dashboard (force-graph + risk table) · Interview chat  │
│  Resign trigger · Risk-delta view                       │
└──────────────────────────┬──────────────────────────────┘
                           │ REST (JSON, contract §6)
┌──────────────────────────┴──────────────────────────────┐
│ BACKEND (Mahesh) — FastAPI (Python 3.11)                │
│  /ingest /graph /risk /resign /interview /capture       │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │ Risk Engine    │  │ Interview     │  │ Ingestion  │ │
│  │ deterministic  │  │ Agent (LLM)   │  │ Pipeline   │ │
│  └───────┬────────┘  └──────┬────────┘  └─────┬──────┘ │
└──────────┼──────────────────┼─────────────────┼────────┘
           │ graph reads      │ recall/search   │ add/cognify/forget
┌──────────┴──────────────────┴─────────────────┴────────┐
│ COGNEE (memory layer)                                   │
│  D1 decision: Cognee Cloud (iPhone track, default)      │
│  or self-hosted SDK w/ default stores (MacBook track)   │
│  + LLM key (Anthropic or OpenAI) for cognify/agent      │
└─────────────────────────────────────────────────────────┘
```

### The one architecture decision that protects the demo
**Hybrid risk engine.** Risk scores are computed deterministically in Python. Data source priority:
1. **Cognee graph** (if ingestion checkpoint §7-CP1 passes): read Engineer—touched→Service, Doc—covers→Service edges via Cognee's graph access / search.
2. **Raw dataset fallback** (always built, built FIRST): parse `git_log.txt` + `service_registry.md` + doc inventory directly with pandas. Identical output shape.

Cognee remains load-bearing regardless of which path feeds the risk engine: interview question generation (recall/search over postmortems + Slack), knowledge capture (add + re-cognify), forget, and the graph visualization. This means an extraction disappointment degrades "Best Use of Cognee" from 10 to 7 — but never kills the demo. A crashed demo scores 0 on everything.

---

## 4. LLD — Backend (Mahesh)

### 4.1 Repo layout
```
busfactor/
├── backend/
│   ├── main.py              # FastAPI app, CORS open for localhost
│   ├── config.py            # env: COGNEE_MODE=cloud|local, LLM keys
│   ├── ingestion.py         # dataset → cognee add/cognify; forget legacy-fx
│   ├── graph_client.py      # thin wrapper: all cognee calls live HERE only
│   ├── risk_engine.py       # scoring; two providers: CogneeProvider, RawProvider
│   ├── interview.py         # agent: zone detection, question gen, capture
│   ├── models.py            # pydantic schemas (mirror §6 contract exactly)
│   └── data/                # the screenplay dataset (unzip busfactor-dataset.zip)
├── frontend/                # Sp's Vite app
├── MANIFEST.md              # ground truth + checkpoints
└── README.md                # Sp writes, Mahesh reviews
```

### 4.2 Risk engine
```
risk(engineer, service) = exclusivity * centrality * (1 - doc_coverage)

exclusivity  = share of service commits by engineer, boosted if engineer is
               sole resolver of incidents affecting the service
               (commits: 0.7 weight, incident-resolution: 0.3 weight)
centrality   = 0.5 * criticality_tier(CRITICAL=1.0, HIGH=0.7, MEDIUM=0.4, LOW=0.1)
             + 0.5 * normalized_dependents(count of depends_on edges pointing at it)
doc_coverage = 0.0 none | 0.5 doc exists | 1.0 doc validated by non-owner
               (ADR-012 + runbook §5 gives analytics-pipeline 1.0)

status buckets: RED ≥ 0.45 · YELLOW 0.20–0.45 · GREEN < 0.20 · EXCLUDED (forgotten)
```
Expected outputs against the screenplay (unit-test these, they are the ground truth):
Priya×{retry-engine, kafka-consumer, recon-cron} = RED (top 3 scores).
Rohan×analytics-pipeline = GREEN. Karan×notifications = YELLOW.
legacy-fx-service = EXCLUDED, appears in no scoring output.

### 4.3 Interview agent (plain loop, no framework)
```
on POST /resign {engineer}:
  zones = risk_engine.red_zones(engineer)              # deterministic
  for zone in zones:
      ctx = graph_client.recall(zone)                  # cognee search: postmortems,
                                                       # slack threads, ADRs re: zone
      questions[zone] = llm.generate(ctx, n<=3, style="specific, cites evidence,
                        asks for procedures/locations/invariants ONLY the departing
                        engineer would know; never generic")
  create session, return zones + first question

on POST /interview/{session}/answer:
  store answer; next question or zone; when done → /capture ready

on POST /capture/complete:
  doc = format answers as "Knowledge Capture: {engineer} — {zone}" markdown
  graph_client.add(doc); graph_client.cognify()        # memory grows
  risk_engine.recompute()                              # doc_coverage now > 0
  return risk_delta                                    # frontend animates healing
```
Capture raises doc_coverage for the zone to 0.5 (exists, not yet validated) — honest
semantics AND visible healing (RED → YELLOW/GREEN depending on score). Say this in the
demo; judges will respect that captured-but-unvalidated ≠ fully safe.

### 4.4 Cognee integration rules
- ALL cognee calls isolated in graph_client.py — one file to swap cloud↔local (D1).
- Hour-1 spike (before anything else): add 2 files, cognify, search, inspect graph.
  Decide D1 (cloud vs local) based on what works in 60 minutes, not on prizes.
- Datasets: ingest each source type into named datasets (git, postmortems, adrs,
  slack, runbooks, registry) — enables targeted forget() of legacy-fx content and
  clean re-cognify on capture.
- forget(): try cognee's delete/prune API on legacy-fx-service nodes; fallback =
  exclude at ingestion + EXCLUDED status in risk engine (demo-equivalent; narrate
  as "the ontology excludes deprecated systems, enforced at memory level").
- If default cognify extraction fails CP1 → custom ontology: entities {Engineer,
  Service, Incident, Decision, Document}, relations {touched, resolved, affects,
  covers, deprecates, depends_on}. This is ALSO a "best use of cognee" bonus.

---

## 5. LLD — Frontend (Sp)

Stack: **Vite + React + Tailwind + react-force-graph-2d** (single dependency for the
graph; do not use D3 directly). State: plain useState/useReducer — no Redux.

### Pages/panels (one screen, three panels — no routing)
1. **Graph panel** (left, 60%): force-graph. Nodes = engineers (circles) + services
   (squares, sized by centrality). Edges = touched/covers. Service color = risk
   status (RED #ef4444, YELLOW #f59e0b, GREEN #22c55e, EXCLUDED #6b7280 dashed).
   Click service → breakdown popover showing the three formula terms as bars.
2. **Risk table** (right-top): ranked (engineer, service, score, status), sortable.
   Header shows the formula as text — judges must see the math.
3. **Action panel** (right-bottom): engineer dropdown + "Simulate resignation" →
   swaps to Interview chat (agent messages left, input right, zone progress chips)
   → on completion shows Risk Delta view (before/after scores, animated).

### Build order for Sp (mock-first — do NOT wait for backend)
1. Hours 0–6: build everything against `mock.ts` returning the §6 shapes verbatim
   (copy the example JSONs). Demo-quality polish on the graph panel FIRST.
2. Hour ~10 (CP2): flip `VITE_API_URL` to Mahesh's backend. Fix mismatches together.
3. After integration: risk-delta animation (tween node colors over 2s — this is the
   demo's money shot; spend real time here).

---

## 6. API Contract (frozen — neither side changes it without telling the other)

Base: `http://localhost:8000/api`

**GET /graph** → `{ nodes: [{id, label, type: "engineer"|"service", criticality?,
status?: "RED"|"YELLOW"|"GREEN"|"EXCLUDED"}], edges: [{source, target,
kind: "touched"|"covers"|"depends_on"|"resolved"}] }`

**GET /risk** → `{ formula: string, pairs: [{engineer, service, score: 0..1,
status, breakdown: {exclusivity, centrality, doc_coverage}}] }`

**POST /resign** `{engineer: "Priya Nair"}` → `{session_id, zones: [{service,
score, evidence: [string]}], first_question: {zone, text, index, total}}`

**POST /interview/{session_id}/answer** `{text}` → `{done: false, next_question:
{zone, text, index, total}}` | `{done: true, captured_zones: [string]}`

**POST /capture/{session_id}/complete** → `{delta: [{engineer, service,
before: {score, status}, after: {score, status}}], memory_events: [string]}`
(memory_events = human-readable log lines like "cognify: 3 documents added",
shown in UI as the 'memory heartbeat' — makes Cognee usage visible to judges)

**POST /ingest** (dev-only, idempotent) → `{datasets: [...], node_count, edge_count}`

Error shape everywhere: `{error: string}` with proper status codes. CORS: allow all
localhost origins.

---

## 7. Timeline & Checkpoints (IST)

### Fri Jul 4
- **00:00–02:00 · Mahesh:** repo + env + Cognee hour-1 spike → **decide D1
  (cloud/local)**. Sp: Vite scaffold + mock.ts + static graph rendering.
- **02:00–09:00:** sleep. Non-negotiable; Saturday is the long day.
- **09:00–12:00 · Mahesh:** full ingestion pipeline; run **CP1 = the 6 graph
  assertions from MANIFEST §Ingestion-Checkpoint**. If <4 pass → custom ontology
  (budget 3h max, then RawProvider carries risk and cognee carries interview).
  **Sp:** graph panel polish + risk table on mocks.
- **12:00–16:00 · Mahesh:** risk engine (RawProvider first, CogneeProvider second)
  + unit tests against §4.2 expected outputs (**CP2a: all 5 ground-truth
  assertions green**). **Sp:** action panel + interview chat UI on mocks.
- **16:00–17:00 · BOTH — CP2: integration.** Flip Sp to real API. GET /graph and
  GET /risk render correctly.
- **17:00–22:00 · Mahesh:** interview agent + capture + recompute loop end-to-end
  via curl. **Sp:** interview chat against real endpoints; risk-delta animation.
- **22:00–23:00 · CP3: full demo path** clicked through once by Sp while Mahesh
  watches logs. List every rough edge; triage.

### Sat Jul 5
- **09:00–12:00 · Mahesh:** fix CP3 list; forget() flow; memory_events polish.
  **Sp:** README draft + demo script §2 rehearsal + screenshots.
- **12:00–14:00 · BOTH:** dress rehearsal ×3 (timed, 3 min). Stretch goals only
  if all three runs are clean.
- **14:00–17:00 · Sp:** record + edit demo video (script §2; screen + voiceover).
  **Mahesh:** submission writeup — problem, why-graph kill-test, cognee lifecycle
  usage (add/cognify/search/forget + memify if S1), architecture diagram.
- **17:00–19:00 · BOTH:** submit with ≥3h buffer before deadline. Assume the
  submission form has surprises (video hosting, repo visibility, team info).

**Rule:** any task 2h over its slot gets cut or falls back per §8. The demo path
is sacred; nothing else is.

---

## 8. Risk Register (pre-decided fallbacks — no debating at 2am)

| # | Risk | Trigger | Fallback (pre-decided) |
|---|------|---------|------------------------|
| 1 | cognify extraction misses edges | CP1 <4/6 pass | 3h ontology attempt → else RawProvider for risk; cognee still does interview recall, capture, viz |
| 2 | Cognee Cloud quota/latency/downtime | hour-1 spike or any CP | flip COGNEE_MODE=local (one env var; graph_client.py is the only touchpoint) |
| 3 | forget() API not surfaced/limited | Fri 22:00 | ingestion-exclusion + EXCLUDED status; narrate as ontology-level forgetting |
| 4 | Interview questions come out generic | CP3 | few-shot the prompt with 3 hand-written gold questions from MANIFEST §Interview-Gold |
| 5 | Live demo breaks on stage | any | Sp records full happy-path screen capture Sat 12:00; video is the submission's spine, live demo is bonus |
| 6 | Sp blocked on Antigravity/env | any | everything Sp builds runs on mocks with zero backend; blocking dependency is only at CP2 |
| 7 | Integration hell at CP2 | >90min of mismatch | Mahesh conforms backend to contract §6 verbatim — frontend shapes win, always |

---

## 9. Division of Labor Summary

**Mahesh (the risky core — everything that can fail fails here first):**
backend repo, Cognee spike + D1 decision, ingestion + CP1, risk engine + tests,
interview agent, capture/recompute, forget, integration support, submission writeup.

**Sp (the visible surface + the submission — judges see Sp's work first):**
entire frontend on mock-first contract, risk-delta animation (money shot), demo
rehearsal ownership, README, demo video recording + editing, screenshots, form
submission. Sp also plays Priya in the demo.

Sp's Antigravity workflow: paste §5 + §6 of this spec as the opening prompt,
build panel by panel against mock.ts. No Cognee knowledge required — the contract
is the interface.

---

## 10. Open Decisions for Mahesh (answer async, defaults active until then)

- **D1 — Cloud vs self-host** (prize track): default = try Cloud in hour-1 spike;
  local fallback ready. Decide on engineering merit at 01:00 Fri, not prize value.
- **D2 — LLM key for cognify + agent:** default = Anthropic key via env; OpenAI
  works identically through config.py.
- **D3 — Name:** "BusFactor" active everywhere; rename is a find-replace, decide
  by Sat 12:00 (submission materials lock it).
