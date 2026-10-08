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

## 2026-10-08 | KB chatbot on Oracle
Built:
- `stt/kb.py` + `docs/kb/kuiklo_kb.md` (31 `## Q:` chunks) deployed to `~/bhavna-stt/` on Oracle. `stt_server.py` now serves `POST /ask` next to `/transcribe`. Same pm2 process `bhavna-stt`, 127.0.0.1:8787.
- Retrieval: `all-MiniLM-L6-v2` (downloaded to the HF cache on first run), cosine top 3, `MIN_SCORE` 0.30. Answer: local Ollama.
- Self-check `./venv/bin/python kb.py kuiklo_kb.md` passed first time: `kb self-check ok 31 chunks 0.35 0.5 0.04`. No bug in kb.py.
- `/health` ok, `/transcribe` still works (real wav, 40 s), logs show `kb chunks 31` and `ready`.
Model timing (same 5 questions, 4 CPU, no GPU):
- `gemma3:4b`: 24 to 45 s per answer. Good Hinglish, correct facts.
- `gemma3:1b`: 6 to 16 s per answer (first call includes model load). Faster but answers are weaker: mostly English, one said "I don't know" and then gave the fact, one Hindi line was garbled ("Mai nahi jaan... Kunta").
- Default in `kb.py` switched to `gemma3:1b` (rule: under 25 s). `KB_LLM_MODEL=gemma3:4b` env var brings the better model back if speed is acceptable.

| Question | Score | Model | Seconds | Answer (first 80 chars) |
|---|---|---|---|---|
| delivery charge kitna hai? | 0.35 | gemma3:4b | 24.16 | Koi delivery charge nahi hai! Kuch hidden fees bhi nahi hain, aap jo checkout pe de |
| order cancel kaise karun? | 0.48 | gemma3:4b | 44.67 | Apne order 60 seconds ke andar cancel kar sakte hain, placement ke ek minute mein. O |
| kaunse area mein deliver karte ho? | 0.41 | gemma3:4b | 30.62 | Kuiklo Patna mein hi kaam karta hai. Hum Kankarbagh, Boring Road, Fraser Road, Kidw |
| payment COD hai kya? | 0.38 | gemma3:4b | 40.30 | Haan, hum COD bhi accept karte hain! Lekin yeh select areas mein hi available hai. Y |
| what is the capital of France | 0.04 | none (off-topic) | 0.14 | Yeh sawal Kuiklo ke baare mein nahi lag raha. Order, delivery, payment ya refund ke |
| delivery charge kitna hai? | 0.35 | gemma3:1b | 16.28 | I don't know about delivery charges. Kuiklo states there are zero charges, so you on |
| order cancel kaise karun? | 0.48 | gemma3:1b | 6.52 | Please place your order before 60 seconds after it's placed. Changes or cancellation |
| kaunse area mein deliver karte ho? | 0.41 | gemma3:1b | 6.82 | Mai nahi jaan. Kuiklo Patna mein delivery karti hai. Kunta, aapko bhi Patna mein del |
| payment COD hai kya? | 0.38 | gemma3:1b | 6.39 | You can pay through credit/debit cards, digital wallets like Apple Pay & Google Pay, |
| what is the capital of France | 0.04 | none (off-topic) | 0.01 | Yeh sawal Kuiklo ke baare mein nahi lag raha. Order, delivery, payment ya refund ke |

Open: scores for Hinglish questions sit at 0.35 to 0.48, near `MIN_SCORE` 0.30. Watch for on-topic questions that fall under 0.30. Owner to pick: 1b (fast, weak) or 4b (slow, good), or qwen2.5:3b as a middle test.

## 2026-10-08 | M5 (P7) | Founder voice replies via Sarvam
Built:
- G1: owner states Shyam Gupta allowed the clone. Note saved in `docs/consent/shyam_gupta_voice_consent.md` (private, not committed). His own written note still to be added.
- `stt/voice.py` + `POST /voice` on the Oracle service: Sarvam `POST /voices/clone` (voice_id, hi-IN, mp3) -> Telegram `sendVoice` with caption "AI-generated voice (Shyam Gupta ki awaaz)" and inline buttons. Audio cached by text hash. Caps: 200 chars per message, 100 voice messages per day. Secrets in `~/bhavna-stt/.env` (0600) on Oracle, never in n8n nodes.
- Greeting on `/start` (owner's text) is voiced. Follow-up questions (brand, slot, name, phone, area) are voiced. Summary, lists and FAQ answers stay text.
- Workflow: `Voice reply?` IF -> `Voice note (Sarvam clone)` HTTP; on error the same message goes out as text (`Telegram: send`). 21 nodes.
Decision:
- Free tier only: ₹100 credits, ₹3 per 1K chars. Greeting audio pre-seeded in the cache from one test call, so it costs nothing again.
Failed: none new. Earlier today: inline buttons never reached Telegram because `replyMarkup` was an expression; n8n hides `inlineKeyboard` when the raw value is not the literal `inlineKeyboard`. Fixed with a literal.
Verified by: 34 unit tests green; `/voice` test from Oracle -> voice bubble with button received in the owner's chat (cached: true, chars 121).
