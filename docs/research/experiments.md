# Experiments

Every open claim gets a test. Each row says what we thought, how we checked, what we saw,
and what we chose. Rows are never deleted.

| Id | Hypothesis | Design | Decision rule | Start | Result | Decision |
|---|---|---|---|---|---|---|
| H1 | The Apex model gives the same Hinglish text on Oracle CPU (CT2 int8) as on the Mac (MLX) | Two real Hinglish wavs from bhavna `log/` through `/transcribe`. Compare with the Mac transcript | Near word for word: ship. Else try a bigger compute type | 2026-10-08 | 70 s clip: one word differs (pyaaj/byaaj). 75 s clip: full transcript. The Mac log held only the last word | **Pass.** Same weights, same decode settings. CT2 int8 ships (ADR-002) |
| H2 | STT on 4 CPU is fast enough for a demo voice note | Time the same two clips and one short Telegram note | A 10 s note under 10 s: fine for a demo | 2026-10-08 | 29.4 s for 70 s. 34.2 s for 75 s. 9 s for a short note. About 0.45x real time | **Pass for a demo.** Keep notes short. Say "samajh raha hoon" first |
| H3 | A small local model can answer Kuiklo FAQs in Hinglish from 31 KB chunks | Same 5 questions through `/ask` with gemma3:4b and gemma3:1b. Time and read each answer | Correct facts and Hinglish: pick it. Under 25 s preferred | 2026-10-08 | 4b: 24 to 45 s, good Hinglish, correct facts. 1b: 6 to 16 s, mostly English. One "I don't know" then the fact. One garbled Hindi line. Off-topic question refused at 0.04 with no model call | **gemma3:4b.** Owner's call: quality over speed (ADR-007). qwen2.5:3b is the next test |
| H4 | MiniLM cosine with a 0.30 floor separates Kuiklo questions from off-topic ones | 4 on-topic Hinglish questions and 1 off-topic | On-topic at or above 0.30. Off-topic under 0.30 | 2026-10-08 | On-topic 0.35, 0.48, 0.41, 0.38. Off-topic 0.04 | **Pass, with little margin.** Watch for on-topic questions under 0.30 (risk R4) |
| H5 | A free OpenRouter model can do extraction fallback | Live chat with unknown words. Llama free slug, then gemma free slug | HTTP 200 with a JSON array: keep it | 2026-10-08 | Llama slug 404. Gemma slug 429 | **Fail.** deepseek/deepseek-v3.2 works at about 0.00004 USD per call (ADR-006) |
| H6 | The Sarvam clone says Hinglish in Latin letters well enough | Owner listens to the greeting in Latin Hinglish, then in Devanagari | Owner's ear decides | 2026-10-08 | Latin Hinglish mispronounced. Devanagari said well | **Fail for Latin.** Devanagari only (ADR-009). voice.py refuses Latin. T-31 |
| H7 | Voice replies stay inside the ₹100 free tier for the demo | Count chars per line. Cache by text hash. Read the Sarvam spend | Under ₹100 for the whole demo | 2026-10-08 | 35 cached lines cost ₹2.34 | **Pass.** Caps of 200 chars and 100 per day stay (ADR-008) |
| H8 | n8n inline keyboards can be set from an expression on `replyMarkup` | Send a message with `replyMarkup` as an expression | Buttons appear: keep it | 2026-10-08 | No buttons ever reached Telegram. n8n shows the `inlineKeyboard` field only when the raw value is the literal | **Fail.** Literal `inlineKeyboard` (rulebook D5) |
| H9 | A free hosting tier (Render, Railway) can run whisper, MiniLM and torch for the service | Read the tier limits (sleep, RAM) against the model needs | Fits: use it. Else Oracle | 2026-10-08 | Both sleep when idle. Both have too little RAM | **Fail.** Oracle pm2, saved and systemd-enabled (ADR-011) |
| H10 | The live chat flow matches the unit tests (M-01 to M-04) | Owner runs the D1 script on his phone | All four rows done with a date | pending | | |

## KB model timing, 2026-10-08 (4 CPU, no GPU, same 5 questions)

| Question | Score | Model | Seconds |
|---|---|---|---|
| delivery charge kitna hai? | 0.35 | gemma3:4b | 24.16 |
| order cancel kaise karun? | 0.48 | gemma3:4b | 44.67 |
| kaunse area mein deliver karte ho? | 0.41 | gemma3:4b | 30.62 |
| payment COD hai kya? | 0.38 | gemma3:4b | 40.30 |
| what is the capital of France | 0.04 | none (off-topic) | 0.14 |
| delivery charge kitna hai? | 0.35 | gemma3:1b | 16.28 |
| order cancel kaise karun? | 0.48 | gemma3:1b | 6.52 |
| kaunse area mein deliver karte ho? | 0.41 | gemma3:1b | 6.82 |
| payment COD hai kya? | 0.38 | gemma3:1b | 6.39 |
| what is the capital of France | 0.04 | none (off-topic) | 0.01 |

Full answers are in `DEVLOG.md` under "KB chatbot on Oracle".
