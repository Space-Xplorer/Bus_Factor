# Postmortem PM-2026-03: Webhook Delivery Delays

**Date:** 2026-03-11 | **Severity:** SEV-3 | **Duration:** 2h 20m
**Services affected:** notifications-service

## Summary
Merchant webhooks were delayed up to 40 minutes after a large merchant's endpoint began timing out, blocking the shared delivery queue.

## Timeline (IST)
- 15:10 — Webhook latency alert fires.
- 15:25 — Karan Shah identifies one merchant endpoint timing out at 30s, serially blocking the queue.
- 16:05 — Karan Shah ships per-merchant delivery isolation with circuit breaking.
- 17:30 — Queue drains, latency normal.

## Root Cause
Single shared delivery queue without per-merchant isolation.

## Resolution
Fixed by Karan Shah. Note: Karan Shah is the only engineer who has ever worked on notifications-service internals; Ananya Rao contributes test coverage only.

**Resolved by:** Karan Shah
