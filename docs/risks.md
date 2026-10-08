# Risks and mitigations

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

### B4. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation | Gate |
|---|---|---|---|---|---|
| R1 | Written consent from Shyam Gupta is not on file; only the owner's word | high | voice clone must stop | get the note before any demo outside the owner's chat; text fallback always | before D1 demo |
| R2 | STT service restart or crash drops a voice note | medium | no reply | pm2 restart, systemd on boot; n8n error workflow | ongoing |
| R3 | Long voice notes take 30 s or more | medium | feels slow | tell the customer "samajh raha hoon" first; keep notes short in the demo | D1 |
| R4 | FAQ scores sit near the 0.30 floor; an on-topic question is refused | medium | wrong refusal | watch the score in logs; lower the floor or add KB chunks | after live tests |
| R5 | gemma3:4b answer takes up to 45 s | high | slow chat | qwen2.5:3b middle test; or 1b with better prompt | roadmap |
| R6 | OpenRouter model slug changes or rate limits | medium | no LLM fallback | rules answer alone; node continues on error | ongoing |
| R7 | Sarvam credits run out | low | no voice | cache by text hash; 200 char and 100 per day caps | ongoing |
| R8 | Static data lost on workflow re-import | medium | sessions gone | demo only; order writes to a sheet or SQLite on the roadmap | P8+ |
| R9 | A Latin letter slips into a voice line | low | mispronounced | voice.py refuses; T-31 checks every line | every test run |
| R10 | Demo mistaken for an official Kuiklo product | medium | trust | "Unofficial demo. Mock prices." in the bot, DEVLOG, README | every message |
| R11 | Two voice notes at once queue on one CPU model | medium | delay | one at a time is fine for a demo; say so | D1 |
| R12 | A question with a product name is read as an order | low | wrong flow | a question wins unless the text carries a quantity (fixed 2026-10-08) | T-21 |
