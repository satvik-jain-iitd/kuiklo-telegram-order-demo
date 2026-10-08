# MVP and increments

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

### A7. MVP and increments

| Priority | What you can show | Status (2026-10-08) |
|---|---|---|
| P1 Text order | Typed order to summary with buttons | done, T-01 to T-14 green; M-01 pending |
| P2 Voice in | Voice note to the same summary via STT on Oracle | done; two real wavs near word for word; M-02 pending |
| P3 Missing details | Qty, brand, date, slot, name, phone, area asked with buttons | done |
| P4 Breakdown and Confirm | Every charge in a `<pre>` table, Confirm is a separate tap | done |
| P5 Swap window | 60 s, brand buttons, before and after, refused after | done, T-15 to T-19b, T-23 to T-28; M-03 pending |
| P6 Questions | Items, total, delivery, brands; stock refused; FAQ bot for the rest | done, T-20 to T-22; KB 31 chunks |
| P7 Founder voice | Sarvam clone, cached, capped, Devanagari only, AI label | done, T-30, T-31; written consent note pending |
| P8 Order page | Public page, no PII; sheet logging | not built |

MVP = P1 to P7 on the owner's test chat. Next = P8, then the roadmap in `strategy.md`.

**Milestones as logged in DEVLOG.**
| Milestone | What | Done |
|---|---|---|
| M0 | Gates G1 to G3, research log, STT interface verified | 2026-10-08 |
| M1 to M4 | Brain, workflow (16 nodes at the time), STT service on Oracle | 2026-10-08 |
| KB | FAQ bot `/ask` with MiniLM + Ollama, 31 chunks | 2026-10-08 |
| M5 | Founder voice `/voice` with Sarvam, workflow at 21 nodes | 2026-10-08 |
| M6 | Order page and sheet logging | not started |
