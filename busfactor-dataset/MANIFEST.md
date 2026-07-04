# BusFactor Screenplay Dataset — MANIFEST (internal, do not ingest)

This file is for the team. Everything else in this folder gets ingested into Cognee.

## The Four Stories Encoded in This Dataset

### Story 1 — Three RED zones (the demo core)
Priya Nair is the sole knowledge holder of:
| Service | Commits | Postmortems resolved | Exclusive knowledge location |
|---|---|---|---|
| payment-retry-engine | 22/22 Priya | PM-2025-08 | Slack T1 (DLQ drain procedure), Slack T7 (salt rotation invariant), ADR-007 ("lives in Priya's head") |
| kafka-settlement-consumer | 18/18 Priya | PM-2025-11 | Slack T2 (12-partition pin, HPA cap reason) |
| ledger-reconciliation-cron | 12/12 Priya | PM-2026-01 | Slack T3 (06:00 rule, lock file, HDFC late file, reversal script) |

All three are CRITICAL in the service registry and form the settlement core (high centrality). Expected risk: MAXIMUM.

### Story 2 — The DECOY (proves the metric is smart)
Rohan Bhat: 24/24 commits on analytics-pipeline (sole committer, HIGH criticality).
BUT: full runbook (validated by non-owners twice — ADR-012, Slack T5, runbook §5).
A naive "single committer" metric flags him. Doc-coverage term must clear him.
Expected risk: LOW despite 100% commit exclusivity.

### Story 3 — The YELLOW zone (gradation)
Karan Shah: 12/14 commits on notifications-service, sole resolver of PM-2026-03,
explicitly named sole internals expert in that postmortem. But criticality MEDIUM,
not in settlement core. Expected risk: MEDIUM — flagged, below Priya's zones.

### Story 4 — The FORGET target
legacy-fx-service: deprecated Dec 2025 (ADR-015), commits stop Sep 2025, zero traffic.
ADR-015 explicitly states its knowledge must expire. The agent must forget()/exclude it
and never generate capture questions about it — even though Priya was a 50% committer.

## Ingestion Checkpoint — expected graph assertions after cognify
Verify these edges exist before building anything on top:
1. (Priya Nair) —authored/committed→ (payment-retry-engine) [and the other two red zones]
2. (Priya Nair) —resolved→ (PM-2025-08), (PM-2025-11), (PM-2026-01)
3. (payment-retry-engine) —affected_in→ (PM-2025-08)
4. (analytics-pipeline) —documented_by→ (analytics-pipeline-runbook) [or equivalent]
5. (legacy-fx-service) —deprecated_by→ (ADR-015) [or status property]
6. (payments-api) —depends_on→ (payment-retry-engine) [centrality edges from registry]
If cognify's default extraction misses these, fall back to a custom ontology
(Engineer, Service, Incident, Document, Decision + touched/resolved/covers/deprecates).

## Risk Formula (publish this in the demo — it must not look like vibes)
knowledge_risk(service) =
    exclusivity        # 1 - (distinct committers - 1)/team_size, from git edges
  × centrality         # normalized dependents + criticality tier, from registry edges
  × (1 - doc_coverage) # runbook/ADR nodes covering the service, validated-by-others bonus
Applied per (engineer, service) pair. Priya×3 red zones → top scores.
Rohan×analytics → killed by doc_coverage. Karan×notifications → mid via centrality.

## Interview Gold — what the agent must extract when "Priya resigns"
The capture interview succeeds if it surfaces (all seeded in Slack/postmortems):
- retry-engine: DLQ drain-and-replay procedure (batches ≤500, verification ON);
  salt rotation window must stay ≥ 2× max retry horizon
- kafka consumer: partitions pinned at 12 (per-bank ordering), HPA max = 12 forever
- recon cron: never rerun before 06:00 IST; check /var/lock/recon.lock;
  HDFC SFTP late on Mondays; reversal script exists only on bastion home dir
Post-interview: answers get remember()-ed → re-cognify → risk visibly drops. That is the demo.

## File Inventory
roster/team_roster.md, roster/service_registry.md — ground truth entities
git/git_log.txt (210 commits), git/generate_gitlog.py — reproducible ownership map
postmortems/ ×6 — 3 red-zone (Priya), 3 healthy-team contrast
adrs/ ×4 — includes decoy proof (ADR-012) and forget target (ADR-015)
slack/slack_threads.md — 7 threads; T1/T2/T3/T7 are Priya-exclusive gold
runbooks/analytics-pipeline-runbook.md — the decoy's alibi
