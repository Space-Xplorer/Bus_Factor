# FloatPay Slack Threads (exported from #eng-backend and #incidents)

---
## Thread 1 — #incidents, 2025-08-19
**Arjun Mehta:** gateway is back but retry engine is hammering it, what do I do
**Priya Nair:** pause the retry consumer first. then move the backlog to payments.retry.dlq — there's a drain script, `drain_to_dlq.sh` on the ops bastion under my home dir
**Priya Nair:** when you replay, ALWAYS batches of 500 max with idempotency verification on. if you replay with verification off you will double-capture and finance will have a very bad week
**Arjun Mehta:** where is this written down
**Priya Nair:** it isn't 😅 it's in my head and now in this thread

---
## Thread 2 — #eng-backend, 2025-06-30
**Tanvi Desai:** why is kafka-settlement-consumer HPA capped weirdly? autoscaler keeps wanting more pods
**Priya Nair:** partitions on the settlement topic are pinned at 12 — one per settlement bank, ordering guarantee per ADR-003. any consumer count above 12 just triggers rebalance storms, the extra pods sit idle and stall the group
**Priya Nair:** so HPA max replicas must stay at 12 for kafka-settlement-consumer. forever. or until we redo the partition strategy, which is a whole migration
**Tanvi Desai:** got it, adding a comment in terraform
**Priya Nair:** the comment got removed in a refactor last time lol. just remember it

---
## Thread 3 — #eng-backend, 2025-10-14
**Karan Shah:** recon cron looks hung, no logs since 02:30, safe to rerun?
**Priya Nair:** DO NOT rerun before 06:00 IST. it's almost certainly waiting on the HDFC settlement file — their SFTP is late basically every Monday
**Priya Nair:** check /var/lock/recon.lock first, always. if the lock exists the first run is alive and rerunning will double-post the ledger
**Priya Nair:** if you genuinely must rerun after 06:00, my reversal script `reverse_recon_batch.py` fixes duplicates by settlement batch id. bastion, my home dir
**Karan Shah:** noted, thanks
(note: this guidance was not followed during PM-2026-01)

---
## Thread 4 — #eng-backend, 2026-02-03
**Vikram Pillai:** payments-api capture timeout on gateway calls — 8s or 12s? staging and prod differ
**Arjun Mehta:** 12s in prod, deliberate — acquiring bank p99 is 9.4s during settlement hours. staging is 8s and nobody bothered to align it
**Vikram Pillai:** aligning them now

---
## Thread 5 — #eng-data, 2026-04-21
**Meera Joshi:** settlement report for one merchant looks stale, who do I ping? Rohan is on leave
**Arjun Mehta:** runbook covers it — runbooks/analytics-pipeline-runbook.md, section 4 has the data quality checks and section 5 the backfill command. I ran a backfill from it last quarter without touching Rohan
**Meera Joshi:** worked, thanks. that runbook is genuinely good

---
## Thread 6 — #eng-backend, 2026-01-05
**Ananya Rao:** test env is calling legacy-fx-service and failing, do I fix the tests?
**Arjun Mehta:** delete those tests — service is deprecated per ADR-015, zero traffic since November. nothing about it matters anymore

---
## Thread 7 — #eng-backend, 2026-05-12
**Sara Iqbal:** retry engine metrics show idempotency salt rotation warnings since last deploy, is that bad
**Priya Nair:** benign IF the rotation window overlap is >= 2x the max retry horizon. current config is fine. if anyone ever shortens the rotation window below that, retries straddling the rotation boundary will get fresh keys and double-capture
**Sara Iqbal:** how does anyone besides you know that
**Priya Nair:** they don't 🙂
