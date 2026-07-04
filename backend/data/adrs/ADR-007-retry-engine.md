# ADR-007: Dedicated Payment Retry Engine

**Status:** Accepted | **Date:** 2024-06-02 | **Author:** Priya Nair

## Context
Failed captures were being retried ad hoc inside payments-api, causing duplicate captures during gateway incidents.

## Decision
Extract retries into payment-retry-engine, a dedicated service owning idempotency guarantees. Every retry carries an idempotency key derived from transaction id plus a rotating salt.

## Consequences
- payments-api becomes stateless with respect to retries.
- Idempotency key derivation and salt rotation logic is subtle; incorrect changes can cause silent duplicate captures.

Reviewers at the time noted the design "lives mostly in Priya's head" and requested follow-up documentation. Not yet written.
