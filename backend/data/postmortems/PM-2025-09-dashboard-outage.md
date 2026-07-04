# Postmortem PM-2025-09: Merchant Dashboard Outage

**Date:** 2025-09-14 | **Severity:** SEV-2 | **Duration:** 1h 10m
**Services affected:** merchant-dashboard

## Summary
A merchant-dashboard deploy shipped an unbounded transactions query that exhausted the API connection pool during evening peak. Dashboard returned 500s for 70 minutes. No money movement affected.

## Timeline (IST)
- 19:20 — Deploy by Dev Kulkarni ships new transaction search filters.
- 19:41 — Connection pool exhaustion alerts. Dashboard errors spike.
- 19:55 — Dev Kulkarni and Meera Joshi identify the unbounded query together.
- 20:15 — Meera Joshi ships pagination fix; Dev Kulkarni adds query timeout.
- 20:30 — Error rates back to baseline.

## Root Cause
Missing default pagination on the new search endpoint call.

## Resolution
Fixed same evening by the two engineers who own the service. Both are fully familiar with the codebase; knowledge is well distributed.

**Resolved by:** Dev Kulkarni, Meera Joshi
