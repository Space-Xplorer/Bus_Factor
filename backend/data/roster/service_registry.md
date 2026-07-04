# FloatPay Service Registry

| Service | Description | Criticality | Status | Depends On |
|---------|-------------|-------------|--------|------------|
| payments-api | Public API for payment initiation and status | CRITICAL | active | payment-retry-engine, kafka-settlement-consumer |
| payment-retry-engine | Retries failed payment captures with idempotency guarantees | CRITICAL | active | payments-api |
| kafka-settlement-consumer | Consumes bank settlement events from Kafka, updates ledger | CRITICAL | active | ledger-reconciliation-cron |
| ledger-reconciliation-cron | Nightly job reconciling internal ledger against bank settlement files | CRITICAL | active | kafka-settlement-consumer |
| merchant-onboarding | KYC and merchant account creation flows | HIGH | active | payments-api |
| notifications-service | Sends payment status emails, SMS and webhooks to merchants | MEDIUM | active | payments-api |
| analytics-pipeline | Batch ETL producing merchant settlement reports and internal dashboards | HIGH | active | kafka-settlement-consumer |
| merchant-dashboard | Merchant-facing web dashboard | HIGH | active | payments-api, analytics-pipeline |
| design-system | Shared React component library | LOW | active | - |
| infra-terraform | Infrastructure as code for all environments | HIGH | active | - |
| oncall-bot | Slack bot for paging and incident coordination | MEDIUM | active | - |
| legacy-fx-service | Old currency conversion service | LOW | DEPRECATED (Dec 2025, see ADR-015) | - |

Dependency notes:
- payment-retry-engine, kafka-settlement-consumer and ledger-reconciliation-cron form the settlement core. An outage in any of them blocks merchant payouts.
- analytics-pipeline is high criticality but isolated: failures degrade reporting, not money movement.
- legacy-fx-service receives no traffic since December 2025.
