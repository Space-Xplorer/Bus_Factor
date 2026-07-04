# ADR-015: Deprecate legacy-fx-service

**Status:** Accepted | **Date:** 2025-12-01 | **Author:** Arjun Mehta

## Context
FloatPay no longer offers multi-currency settlement. legacy-fx-service serves no traffic since the November 2025 product sunset.

## Decision
Deprecate legacy-fx-service effective December 2025. No further development, no on-call coverage, repository archived. Knowledge about this service is intentionally allowed to expire; it must not be treated as an at-risk knowledge area.

## Consequences
- Removed from on-call rotation and service registry criticality review.
- Historical commits and incidents referencing legacy-fx-service should be excluded from operational knowledge tracking.
