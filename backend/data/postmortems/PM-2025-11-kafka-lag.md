# Postmortem PM-2025-11: Settlement Consumer Lag Spiral

**Date:** 2025-11-06 | **Severity:** SEV-1 | **Duration:** 5h 15m
**Services affected:** kafka-settlement-consumer, ledger-reconciliation-cron

## Summary
Consumer lag on the settlement topic grew to 2.1M events after a Kubernetes HPA scaling event triggered repeated consumer group rebalances. The nightly ledger-reconciliation-cron ran against an incomplete ledger and produced a false mismatch report to finance.

## Timeline (IST)
- 21:14 — Traffic spike causes HPA to scale kafka-settlement-consumer from 12 to 18 pods.
- 21:15 — Consumer group enters rebalance loop: partitions are pinned at 12, so 6 pods sit idle while rebalances repeatedly stall consumption.
- 22:40 — Lag alert fires. Tanvi Desai paged, cannot identify cause, escalates to Priya Nair.
- 23:05 — Priya Nair identifies the rebalance storm immediately: "partitions are pinned at 12 on purpose; the HPA max must never exceed 12 for this deployment."
- 23:20 — Priya Nair caps HPA max replicas at 12. Rebalancing stops, consumption resumes.
- 02:30 — ledger-reconciliation-cron runs on schedule against a still-catching-up ledger, emails a false mismatch report.
- 02:35 — Priya Nair suppresses the report and re-runs reconciliation after lag clears at 04:10.

## Root Cause
Undocumented coupling between kafka-settlement-consumer partition count (fixed at 12) and infra-terraform HPA configuration. The constraint existed only in Priya Nair's head and one old Slack thread.

## Resolution
HPA cap committed to infra-terraform by Sara Iqbal. The reasoning behind the 12-partition pin (settlement event ordering per bank) remains undocumented.

## Action Items
- [DONE] Cap HPA max replicas at 12 (Sara Iqbal)
- [OPEN] Document partition strategy for kafka-settlement-consumer
- [OPEN] Add rebalance-storm detection to oncall-bot

**Resolved by:** Priya Nair
