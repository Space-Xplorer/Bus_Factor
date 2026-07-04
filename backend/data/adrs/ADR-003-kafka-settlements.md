# ADR-003: Kafka for Bank Settlement Event Processing

**Status:** Accepted | **Date:** 2024-02-10 | **Author:** Priya Nair

## Context
Bank settlement events must be processed in order per bank, at high volume, with replay capability for reconciliation.

## Decision
Use Kafka with a dedicated settlement topic consumed by kafka-settlement-consumer. Partition key is bank identifier to guarantee per-bank ordering.

## Consequences
- Partition count is fixed by the number of settlement banks and ordering requirements. Changing it requires a coordinated migration.
- Consumer instance count must never exceed partition count.

Note: the specific partition sizing rationale was discussed in a design review but recorded only in meeting notes that were never uploaded.
