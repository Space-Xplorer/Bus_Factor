# Postmortem PM-2025-12: Staging Terraform Drift

**Date:** 2025-12-09 | **Severity:** SEV-3 | **Duration:** 3h
**Services affected:** infra-terraform

## Summary
Manual console changes in the staging environment drifted from infra-terraform state, causing a failed production promotion. Caught before any production impact.

## Timeline (IST)
- 10:05 — Promotion pipeline fails on plan diff.
- 10:30 — Sara Iqbal identifies manual security-group edits made during an earlier debugging session.
- 12:10 — Tanvi Desai reconciles state and re-imports resources.
- 13:00 — Promotion succeeds.

## Root Cause
Console access in staging is not read-only.

## Resolution
Sara Iqbal and Tanvi Desai locked down staging console access. Either can handle terraform state surgery independently.

**Resolved by:** Sara Iqbal, Tanvi Desai
