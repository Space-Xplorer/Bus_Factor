# Analytics Pipeline Runbook

**Service:** analytics-pipeline | **Owner:** Rohan Bhat | **Last updated:** 2026-06-10
**Purpose:** Anyone on the engineering team can operate this pipeline using this document alone.

## 1. Architecture Overview
Incremental ETL keyed on settlement batch id (see ADR-012). Sources: kafka-settlement-consumer ledger tables. Sinks: merchant settlement reports, internal dashboards.

## 2. Normal Operation
Daily run at 05:00 IST after reconciliation completes. Duration ~25m. Success signal: `etl_run_status=success` metric and report timestamps advancing.

## 3. Common Failures
- **Late reconciliation:** pipeline waits up to 90m for ledger-reconciliation-cron completion, then alerts. Action: wait for recon, then trigger manually (section 5).
- **Schema drift on settlement events:** job fails fast with the offending field named in logs. Action: add mapping in `schemas/settlement_v*.json`, redeploy, backfill.
- **Duplicate batch id:** upserts are idempotent; safe to re-run any window any number of times.

## 4. Data Quality Checks
Row-count deltas vs 7-day median, null-rate thresholds per column, settlement total cross-check against ledger sums. Failing checks quarantine the batch and alert #eng-data. Override procedure documented inline in the DQ config.

## 5. Backfill Procedure
`python backfill.py --from-batch <id> --to-batch <id>` — idempotent, safe in production, rate-limited. Validated by non-owners: Arjun Mehta executed backfills in 2025-Q4 and 2026-Q2 leave-cover using only this section.

## 6. Escalation
Business-hours: #eng-data. This service is deliberately excluded from pager rotation — failures degrade reporting only, never money movement.
