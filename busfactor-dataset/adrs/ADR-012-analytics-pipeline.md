# ADR-012: Incremental ETL Architecture for Analytics Pipeline

**Status:** Accepted | **Date:** 2025-04-18 | **Author:** Rohan Bhat

## Context
Full-refresh ETL was taking 6+ hours as settlement volume grew.

## Decision
Move analytics-pipeline to incremental processing keyed on settlement batch id, with idempotent upserts and daily data quality checks.

## Design Detail
Complete architecture, failure modes, backfill procedure, and operational commands are documented in the analytics-pipeline runbook (runbooks/analytics-pipeline-runbook.md), kept current with every change. Any engineer on the data or backend team can operate the pipeline from the runbook alone; this has been validated twice during Rohan Bhat's leave periods, when Arjun Mehta ran backfills successfully using only the documentation.

## Consequences
- Report latency dropped from 6h to 25m.
- Operational knowledge is fully externalized in documentation by design.
