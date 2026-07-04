"""Generates FloatPay's synthetic git log encoding the BusFactor screenplay.

Ownership map (the ground truth the risk engine must recover):
- payment-retry-engine, kafka-settlement-consumer, ledger-reconciliation-cron -> Priya Nair ~100% (RED zones)
- analytics-pipeline -> Rohan Bhat 100% (DECOY: sole committer but well documented)
- notifications-service -> Karan Shah ~90% (YELLOW: sole-ish owner, medium criticality)
- everything else -> healthily shared
- legacy-fx-service -> commits STOP after Dec 2025 (deprecated)
"""
import random
from datetime import date, timedelta

random.seed(42)

# service -> list of (author, weight)
OWNERSHIP = {
    "payment-retry-engine": [("Priya Nair", 100)],
    "kafka-settlement-consumer": [("Priya Nair", 100)],
    "ledger-reconciliation-cron": [("Priya Nair", 100)],
    "analytics-pipeline": [("Rohan Bhat", 100)],
    "notifications-service": [("Karan Shah", 90), ("Ananya Rao", 10)],
    "payments-api": [("Arjun Mehta", 40), ("Priya Nair", 30), ("Vikram Pillai", 30)],
    "merchant-onboarding": [("Vikram Pillai", 55), ("Arjun Mehta", 45)],
    "merchant-dashboard": [("Dev Kulkarni", 55), ("Meera Joshi", 45)],
    "design-system": [("Meera Joshi", 80), ("Dev Kulkarni", 20)],
    "infra-terraform": [("Sara Iqbal", 60), ("Tanvi Desai", 40)],
    "oncall-bot": [("Tanvi Desai", 85), ("Sara Iqbal", 15)],
    "legacy-fx-service": [("Priya Nair", 50), ("Arjun Mehta", 50)],
}

# commit volume per service across Jan 2025 - Jun 2026
VOLUME = {
    "payments-api": 34,
    "payment-retry-engine": 22,
    "kafka-settlement-consumer": 18,
    "ledger-reconciliation-cron": 12,
    "merchant-onboarding": 20,
    "notifications-service": 14,
    "analytics-pipeline": 24,
    "merchant-dashboard": 26,
    "design-system": 10,
    "infra-terraform": 16,
    "oncall-bot": 8,
    "legacy-fx-service": 6,  # all dated before Dec 2025
}

MESSAGES = {
    "payment-retry-engine": [
        "Fix idempotency key rotation on retry batch flush",
        "Add exponential backoff cap for capture retries",
        "Handle poison messages by routing to payments.retry.dlq",
        "Tune retry batch size for HDFC settlement window",
        "Guard against duplicate capture on gateway timeout",
        "Add metrics for retry queue depth",
        "Fix off-by-one in retry attempt counter",
        "Refactor idempotency salt derivation",
    ],
    "kafka-settlement-consumer": [
        "Pin consumer group partitions at 12 to avoid rebalance storms",
        "Fix offset commit race during consumer rebalance",
        "Add lag alerting for settlement topic",
        "Handle malformed settlement event schema v3",
        "Tune max.poll.records for settlement bursts",
        "Fix duplicate ledger write on rebalance replay",
    ],
    "ledger-reconciliation-cron": [
        "Add lock file guard to prevent concurrent reconciliation runs",
        "Handle late-arriving HDFC SFTP settlement files",
        "Fix double-posting when cron reruns before 06:00 IST",
        "Add mismatch report email to finance team",
        "Skip reconciliation for reversed transactions",
        "Fix timezone bug in settlement date matching",
    ],
    "analytics-pipeline": [
        "Add merchant settlement summary ETL job",
        "Fix partition pruning in daily aggregation",
        "Migrate report generation to incremental model",
        "Add data quality checks per runbook section 4",
        "Optimize settlement report query for large merchants",
        "Add backfill support for missed ETL windows",
    ],
    "notifications-service": [
        "Add webhook retry with jittered backoff",
        "Fix SMS template encoding for Hindi content",
        "Batch payment status emails per merchant",
        "Add webhook signature verification",
        "Fix duplicate email on payment status flap",
    ],
    "payments-api": [
        "Add payment status polling endpoint",
        "Fix validation on capture amount edge cases",
        "Add rate limiting per merchant API key",
        "Improve error codes for declined captures",
        "Add pagination to transactions listing",
        "Fix timeout handling on gateway calls",
        "Add request tracing headers",
    ],
    "merchant-onboarding": [
        "Add PAN verification step to KYC flow",
        "Fix GSTIN validation regex",
        "Add bank account penny-drop verification",
        "Improve onboarding funnel event tracking",
        "Handle KYC document re-upload flow",
    ],
    "merchant-dashboard": [
        "Add settlement report download page",
        "Fix date range picker timezone handling",
        "Add transaction search filters",
        "Improve dashboard load time with query batching",
        "Add webhook configuration UI",
    ],
    "design-system": [
        "Add DataTable component with sticky headers",
        "Fix button focus states for accessibility",
        "Add currency input component",
    ],
    "infra-terraform": [
        "Add staging environment for settlement services",
        "Fix k8s HPA config drift on payments cluster",
        "Rotate RDS credentials via secrets manager",
        "Add alerting module for consumer lag",
    ],
    "oncall-bot": [
        "Add incident channel auto-creation",
        "Fix pager escalation for settlement core services",
        "Add postmortem reminder workflow",
    ],
    "legacy-fx-service": [
        "Bump fx rate provider client version",
        "Fix rounding on INR conversion",
        "Patch security vulnerability in http client",
    ],
}

START = date(2025, 1, 6)
END = date(2026, 6, 26)
FX_END = date(2025, 11, 30)  # legacy-fx-service commits stop before deprecation

def pick_author(service):
    authors, weights = zip(*OWNERSHIP[service])
    return random.choices(authors, weights=weights, k=1)[0]

def random_date(end):
    span = (end - START).days
    return START + timedelta(days=random.randint(0, span))

rows = []
for service, n in VOLUME.items():
    end = FX_END if service == "legacy-fx-service" else END
    msgs = MESSAGES[service]
    for i in range(n):
        d = random_date(end)
        author = pick_author(service)
        msg = msgs[i % len(msgs)]
        h = f"{random.getrandbits(28):07x}"
        rows.append((d, h, author, service, msg))

rows.sort(key=lambda r: r[0])
with open("git_log.txt", "w") as f:
    f.write("date | commit | author | service | message\n")
    for d, h, author, service, msg in rows:
        f.write(f"{d.isoformat()} | {h} | {author} | {service} | {msg}\n")

# print verification summary: commits per author per red-zone/decoy service
from collections import Counter
c = Counter((s, a) for _, _, a, s, _ in rows)
for svc in ["payment-retry-engine", "kafka-settlement-consumer",
            "ledger-reconciliation-cron", "analytics-pipeline",
            "notifications-service", "legacy-fx-service"]:
    owners = {a: n for (s, a), n in c.items() if s == svc}
    print(svc, "->", owners)
print("total commits:", len(rows))
