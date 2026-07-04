# Postmortem PM-2025-08: Payment Retry Storm

**Date:** 2025-08-19 | **Severity:** SEV-1 | **Duration:** 3h 40m
**Services affected:** payment-retry-engine, payments-api

## Summary
A gateway outage at our acquiring bank caused ~48,000 failed captures in 25 minutes. The payment-retry-engine retried all of them simultaneously when the gateway recovered, overwhelming it and causing a second outage. Merchant payouts were delayed by one settlement cycle.

## Timeline (IST)
- 14:02 — Acquiring gateway begins returning 503s. Captures fail.
- 14:27 — Gateway recovers. payment-retry-engine releases entire backlog at once.
- 14:31 — Gateway saturates again under retry load. PagerDuty fires.
- 14:50 — Arjun Mehta paged, escalates to Priya Nair.
- 15:10 — Priya Nair pauses the retry consumer and manually drains the backlog into payments.retry.dlq.
- 16:45 — Priya Nair replays the DLQ in throttled batches of 500 with idempotency verification enabled.
- 17:42 — Backlog cleared. All captures settled exactly once.

## Root Cause
The retry scheduler had no jitter and no global concurrency cap. All retries shared the same backoff clock, so recovery produced a thundering herd.

## Resolution
Priya Nair added an exponential backoff cap and a per-gateway concurrency limit to payment-retry-engine. The manual DLQ drain-and-replay procedure she used is not documented anywhere; she performed it from memory.

## Action Items
- [DONE] Backoff cap and concurrency limit (Priya Nair)
- [OPEN] Document the DLQ drain-and-replay runbook for payment-retry-engine
- [OPEN] Second engineer to shadow Priya Nair on retry-engine internals

**Resolved by:** Priya Nair
