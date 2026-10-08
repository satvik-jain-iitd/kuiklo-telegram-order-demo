# DEVLOG: Kuiklo Telegram Voice Order Demo

Unofficial demo. Mock prices. Not affiliated with Kuiklo unless confirmed in writing.
Spec: `docs/SPEC_v3.md`. Backend: n8n on Oracle (n8n.linkright.in), not a local bot.py.

## 2026-10-08 | M0 | Gates and setup
Built:
- Project folder `~/Desktop/Quiklo/` (owner asked for Desktop).
- Research log `01_Research/research_log.md`: no public data on a grocery company named Kuiklo. Search gap, confidence 0.6.
- G1 voice consent: NOT on file (`docs/consent/` is empty). P7 is text only. No voice clone code built.
- G2 inventory: catalog `n8n/catalog.csv` has only allowlisted columns. `in_stock_flag` only hides items. `loadCatalog` drops the flag before anything else runs. T-06 proves it.
- G3 scope: owner wants a 10 minute first ship. Built P1 to P6. P7 text fallback. P8 skipped.
Decision:
- Owner: backend is n8n workflows, not Python. One MAIN workflow, no SUB (build ladder: one workflow does it).
- Owner: STT is bhavna.ai, deployed on Oracle. bhavna.ai on the Mac uses MLX (Apple only). Oracle is aarch64 Linux, CPU only. So the bhavna Apex model is served from its CT2 int8 copy (`models/apex-ct2-int8`, shipped with bhavna.ai) through faster-whisper. Same model weights, same decode settings (language en, temperature 0, no timestamps). Interface logged in `docs/bhavna_integration_notes.md`.
- Owner: new Telegram bot `@Kuicklobot`. Token saved in Secrets vault (`04_integrations.env`, `KUIKLO_TELEGRAM_BOT_TOKEN`). n8n credential `Kuiklo Demo Bot` id `ErynbU8X1vKpaTRO`.
- Owner: workflow goes in Personal root (no folder). Extraction = rules first, OpenRouter LLM fallback when rules find nothing.
- D3: "kal" = tomorrow from server date (Asia/Kolkata). D4: demo fees ₹25 + ₹5 kept.
Verified by: `node n8n/test/test_brain.js` (27 pass). Code node sources run with stubs (rule 80).

## 2026-10-08 | M1 to M4 | Brain, workflow, STT
Built:
- `n8n/code/brain.js`: state machine (IDLE, COLLECTING, REVIEW, SWAP_WINDOW, SWAP_PENDING, CLOSED), rules extraction with Hindi number words and units, pricing, HTML summary, 60 s swap window with before and after lines, customer questions, stock refusal.
- `n8n/assemble.js` builds `n8n/build/workflow.json` (16 nodes). Trigger -> Config -> Kill switch? -> Normalize -> Voice? -> (get file -> STT -> merge) -> Extract check -> Needs LLM? -> (OpenRouter -> Parse LLM) -> Order brain -> Telegram: send -> ack button.
- Sessions and orders live in workflow static data (`$getWorkflowStaticData('global')`). Demo only. Phone stored masked.
- `stt/stt_server.py` on Oracle, pm2 `bhavna-stt`, 127.0.0.1:8787. POST raw OGG -> `{text}`.
Failed:
- `missing()` checked `customer.phone` but the field is `phone_masked`. Flow stuck on phone step. Fixed. T-12 to T-19 then went green.
- A question like "atta ke brands?" was read as an order for atta. Fix: a question wins unless the text carries a quantity.
Verified by: see Gates below.
Time spent: C3.

## Gates (proof)
| Gate | Proof |
|---|---|
| Unit tests T-01 to T-22 + 5 extra | `node n8n/test/test_brain.js` -> 27 passed |
| Code nodes run with stubs | assemble + stub run: normalize, extract, brain, parse LLM all produce expected items |
| Workflow created and active on n8n | id `qAUgmP8Q7cvciLX9`, Telegram webhook set on @Kuicklobot, 0 pending updates |
| STT real audio | pm2 `bhavna-stt` on Oracle, two real Hinglish wavs transcribed, near word for word. `docs/bhavna_integration_notes.md` |
| M-01 real Telegram typed order | pending |
| M-03 swap inside and after 60 s | pending |

Note: a fake update POSTed to the webhook returns 403 (n8n checks the Telegram secret token). Real chat test must come from the owner.
