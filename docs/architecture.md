# Architecture and research summary

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

### B1. Research summary (tiers per the house rules; confidence 0 to 1)

**Kuiklo.** See `market.md`. Company site facts are Tier A for "they say it". The founder's
name is Tier S from the owner, 0.7.

**STT.** bhavna.ai on the Mac uses MLX (Apple silicon only). Oracle is aarch64 Linux, 4 CPU,
no GPU, Python 3.9. The same Apex weights are served from the CT2 int8 copy (773 MB) with
faster-whisper 1.2.1. Same decode settings: language en, temperature 0, no timestamps, beam
size 1, no VAD. Measured: 70 s clip in 29.4 s, 75 s clip in 34.2 s, a short Telegram note in
9 s. About 0.45x real time. One request at a time is safe. Tier S, 0.8.

**FAQ bot.** `docs/kb/kuiklo_kb.md` holds 31 `## Q:` chunks pulled from kuiklo.com pages.
Retrieval: all-MiniLM-L6-v2, cosine top 3, `MIN_SCORE` 0.30. Scores on Hinglish questions
sit at 0.35 to 0.48, close to the floor. Answer: local Ollama. gemma3:4b 24 to 45 s, good
Hinglish. gemma3:1b 6 to 16 s, weaker. Owner chose 4b. Tier S, 0.8.

**Voice.** Sarvam `POST /voices/clone`, `voice_id`, `language_code` hi-IN, mp3 out. ₹3 per
1,000 chars, ₹100 free credits, 1,000 chars max per call. 35 cached lines cost ₹2.34. Tier A
for pricing (0.9), Tier S for the spend (0.9). Hinglish in Latin letters is mispronounced;
Devanagari is pronounced well (owner's ear, Tier S, 0.8).

**LLM fallback.** OpenRouter. Free llama slug returned 404. Free gemma slug returned 429.
`deepseek/deepseek-v3.2` works, about 0.00004 USD per call. Tier S, 0.9.

**Hosting.** Render and Railway free tiers sleep and lack RAM for whisper + MiniLM + torch.
Oracle box: aarch64, 4 CPU, 22 GB RAM. pm2 saved and systemd-enabled. Tier S, 0.9.

**n8n facts learned the hard way.** IF boolean conditions need `singleValue: true`. A Code
node after Config sees Config's item, so the raw update must be read with
`$('Telegram Trigger')`. `replyMarkup` must be the literal string `inlineKeyboard`; an
expression hides the keyboard field. A fake POST to the webhook returns 403 because n8n
checks the Telegram secret token. Tier S, 0.9 each.

### B2. Architecture

```
Telegram (customer, @Kuicklobot)
   │ webhook
   ▼
n8n.linkright.in, Personal root, workflow "Kuiklo MAIN 01 Telegram Order Bot" (id qAUgmP8Q7cvciLX9, 21 nodes)
   Telegram Trigger ─▶ Config ─▶ Kill switch? ─▶ Normalize ─▶ Voice?
        voice: Telegram: get voice file ─▶ STT (bhavna on Oracle) ─▶ Merge STT text ─┐
        text:  ────────────────────────────────────────────────────────────────────┤
                                                                                      ▼
   Extract check (rules) ─▶ Needs LLM? ─▶ [OpenRouter extract ─▶ Parse LLM] ─▶ Order brain
   Order brain ─▶ FAQ question? ─▶ [KB ask (MiniLM + Ollama) ─▶ KB reply] ─▶ Voice reply?
   Voice reply? ─▶ true: Voice note (Sarvam clone) ─▶ Button press? ─▶ Telegram: ack button
                ─▶ false: Telegram: send ─▶ Button press? ─▶ Telegram: ack button
                   (voice error output also goes to Telegram: send)
   │ HTTP to 127.0.0.1:8787 on the same box
   ▼
Oracle box (aarch64, 4 CPU, 22 GB), pm2 "bhavna-stt": stt_server.py
   POST /transcribe  OGG bytes → {text, seconds}      faster-whisper, apex-ct2-int8
   POST /ask         {question} → {answer, score}     kb.py: MiniLM + Ollama gemma3:4b
   POST /voice       {chat_id, text, caption, keyboard} → sendVoice   voice.py: Sarvam clone, cache, caps
   GET  /health
```

**The 21 nodes, in order.**
| # | Node | Type | Job |
|---|---|---|---|
| 1 | Telegram Trigger | telegramTrigger | message and callback_query updates |
| 2 | Config | set | all tunable values (below) |
| 3 | Kill switch? | if | stops when `kill_switch` is true |
| 4 | Normalize | code | one flat item from message or button press; reads the raw update |
| 5 | Voice? | if | `is_voice` |
| 6 | Telegram: get voice file | telegram | downloads the OGG |
| 7 | STT (bhavna on Oracle) | httpRequest | POST bytes to `stt_url`, 60 s timeout |
| 8 | Merge STT text | code | puts `text` and `stt_seconds` on the item |
| 9 | Extract check | code | rules extraction; sets `needs_llm` |
| 10 | Needs LLM? | if | `needs_llm` |
| 11 | OpenRouter extract | httpRequest | JSON array of items from `llm_model`; continues on error |
| 12 | Parse LLM | code | `llm_items`, empty on any parse problem |
| 13 | Order brain | code | `brain()` with static data and Config; one item per message |
| 14 | FAQ question? | if | `kb_query` not empty |
| 15 | KB ask (MiniLM + Ollama) | httpRequest | POST question to `kb_url`, 90 s timeout |
| 16 | KB reply | code | answer replaces the fallback text |
| 17 | Voice reply? | if | `voice_text` set and `voice_enabled` |
| 18 | Voice note (Sarvam clone) | httpRequest | POST to `voice_url`; error output goes to text send |
| 19 | Telegram: send | telegram | HTML text with `replyMarkup: 'inlineKeyboard'` literal |
| 20 | Button press? | if | `callback_query_id` not empty |
| 21 | Telegram: ack button | telegram | answerQuery so the button stops spinning |

**Config node values.** `kill_switch` false, `delivery_fee_inr` 25, `handling_fee_inr` 5,
`swap_window_s` 60, `stt_url`, `kb_url`, `voice_url` (all 127.0.0.1:8787), `voice_enabled`
true, `greeting_text` (Devanagari), `use_llm_fallback` true, `llm_model`
`deepseek/deepseek-v3.2`, `catalog_json` (the CSV as JSON). Settings: timezone
Asia/Kolkata, error workflow `uiKA54V6gWkhQ69W`, caller policy same owner.

**Services on Oracle.** One pm2 process `bhavna-stt` runs `stt_server.py`. It loads the
Apex CT2 model, warms it with one second of silence, loads the KB chunks, and then serves.
Max body 20 MB. Bad audio returns 422, never a crash. Logs are one line per request with no
audio content.

**Data.** Sessions and orders live in `$getWorkflowStaticData('global')`. Demo only. Phone is
stored masked. Catalog: `n8n/catalog.csv`, 74 rows, allowlisted columns, `in_stock_flag`
dropped before anything else runs. KB: `docs/kb/kuiklo_kb.md`. Voice cache: mp3 by text
hash in `~/bhavna-stt/voice_cache`. Daily counter: `voice_counter.json`.

**Secrets.** Bot token: Secrets vault `04_integrations.env` (`KUIKLO_TELEGRAM_BOT_TOKEN`) and
n8n credential `Kuiklo Demo Bot` (id `ErynbU8X1vKpaTRO`). OpenRouter: n8n credential id
`3UvcSxPc55DLZzwJ`. Sarvam key, Sarvam voice id and the bot token for `sendVoice`:
`~/bhavna-stt/.env` on Oracle, 0600. No secret in any node, log or doc.

**Build.** `node n8n/assemble.js` writes `n8n/build/workflow.json` from `code/brain.js` and
`catalog.csv`. The repo is the source of truth, never the n8n UI.
