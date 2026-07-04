# Postmortem PM-2026-01: Double-Posted Ledger Entries

**Date:** 2026-01-22 | **Severity:** SEV-2 | **Duration:** 9h (detection to correction)
**Services affected:** ledger-reconciliation-cron

## Summary
A finance analyst noticed 1,842 duplicated ledger entries from the night of 2026-01-21. Cause: an on-call engineer manually re-ran ledger-reconciliation-cron at 04:55 IST after the 02:30 run appeared to hang, unaware that re-running before 06:00 IST double-posts entries when the HDFC SFTP settlement file arrives late.

## Timeline (IST)
- 02:30 — Scheduled run starts. HDFC settlement file has not yet arrived on SFTP (arrived 03:12, expected by 02:00).
- 02:31 — Job waits on the file, appearing hung. No log output.
- 04:55 — On-call (Karan Shah) re-runs the job manually. Lock file /var/lock/recon.lock was not checked.
- 04:56 — First run resumes as file arrives; both runs post entries. 1,842 duplicates.
- 11:40 — Finance flags the mismatch. Priya Nair paged.
- 12:15 — Priya Nair identifies double-posting instantly, runs her correction script to reverse duplicates by settlement batch id.
- 13:55 — Ledger corrected and verified against bank statement.

## Root Cause
The safe-rerun rules for ledger-reconciliation-cron — never before 06:00 IST, always check /var/lock/recon.lock, expect late HDFC files on Mondays — exist only as tribal knowledge held by Priya Nair.

## Resolution
Duplicates reversed. Priya Nair's correction script lives in her home directory on the ops bastion and is not in version control.

## Action Items
- [OPEN] Move correction script into the ledger-reconciliation-cron repo
- [OPEN] Add lock-file check and pre-06:00 guard to the job itself
- [OPEN] Write the reconciliation runbook

**Resolved by:** Priya Nair
