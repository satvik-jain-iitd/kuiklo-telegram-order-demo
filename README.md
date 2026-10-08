# Kuiklo Voice Order Assistant (demo)

A customer sends a voice note on Telegram. The bot understands the order in Hinglish, asks only what is missing (with buttons), shows every charge before confirming, gives a 60-second window to change a brand, answers questions from Kuiklo's own FAQ, and replies in the founder's voice.

**Try it:** [t.me/Kuicklobot](https://t.me/Kuicklobot) · **Case study site:** https://satvik-jain-iitd.github.io/kuiklo-telegram-order-demo/ · **Code:** this repo

> Unofficial demo built for Kuiklo (Patna, 10-minute grocery delivery). Mock prices and mock fees. Not affiliated with Kuiklo unless confirmed in writing.

---

## What it does, in one flow

| Step | What the customer sees | What runs |
|---|---|---|
| 1 | `/start` → a voice note in Shyam Gupta's voice: "नमस्ते। क्विकलो यूज़ करने के लिए थैंक यू…" (labelled AI-generated) | Sarvam voice clone, cached |
| 2 | Customer sends a voice note: "एक किलो आटा, एक किलो चावल, दो रोटी, कल सुबह" | bhavna.ai Hinglish speech-to-text on our own server |
| 3 | "Maine yeh samjha: Atta 1 kg, Chawal 1 kg, Roti 2 pcs, Delivery: kal" | Rules-based extraction; DeepSeek only if rules find nothing |
| 4 | Brand buttons per item (Aashirvaad / Pillsbury / Fortune / Patanjali / Sudha / Koi bhi chalega) | Catalog, never stock |
| 5 | Slot, name, phone, area: each asked once, by voice, with buttons where possible | Same workflow |
| 6 | Order summary: every line, delivery fee, handling fee, TOTAL, COD, masked phone, "demo" label | Pricing in code, tested |
| 7 | ✅ Confirm → Order ID → "⏱️ Ek minute ke andar koi change…" | 60-second swap window, server clock |
| 8 | 🔄 Change → pick item → pick brand → before/after lines → confirm | Change log on the order |
| 9 | "delivery charge kitna hai?" → answer from kuiklo.com FAQ | MiniLM retrieval + gemma3:4b, local |
| 10 | "stock kitna hai?" → "Stock ki jaankari main nahi de sakta." | Hard refusal, by design |

## Why it is built this way

- **Transparent by rule.** No charge appears that was not shown before Confirm. Changes show before and after. Every demo price is labelled "demo". (SPEC §4.3)
- **Kuiklo's own policy, enforced.** "Changes only within 60 seconds" is on kuiklo.com's support page. The bot enforces exactly that.
- **Private by default.** Phone shown as `98xxxxxx10`. Stock quantities are never read. Voice replies carry an AI label. Consent for the voice clone is on file (private folder).
- **Local first.** Speech-to-text, FAQ retrieval and the FAQ answer model run on one Oracle Cloud box. Only Telegram, Sarvam (voice) and a tiny DeepSeek fallback leave the box.
- **Cheap.** Sarvam: ₹3 per 1,000 characters, ₹100 free credits, 35 fixed voice lines cached once for ₹2.34. DeepSeek fallback about ₹0.003 per call. Everything else: ₹0.

## Architecture

```
Telegram (customer)
   │ webhook
   ▼
n8n on Oracle Cloud: "Kuiklo MAIN 01 Telegram Order Bot" (21 nodes)
   Telegram Trigger → Config → Kill switch? → Normalize → Voice?
     ├─ voice: get file → STT (bhavna, local) → merge text
     └─ text
   → Extract (rules) → Needs LLM? → DeepSeek v3.2 (fallback only)
   → Order brain (state machine, pricing, 60 s swap, questions)
   → FAQ question? → KB ask (MiniLM + gemma3:4b, local)
   → Voice reply? → Sarvam voice note (Devanagari only, cached, capped)
   → Telegram send (text + inline buttons) → ack button
   state: n8n workflow static data (sessions, orders, change log)

Local service on the same box (pm2 `bhavna-stt`, 127.0.0.1:8787):
   POST /transcribe   bhavna.ai Apex Hinglish whisper (CT2 int8, faster-whisper)
   POST /ask          31 Q&A from kuiklo.com, all-MiniLM-L6-v2 retrieval, Ollama gemma3:4b answer
   POST /voice        Sarvam /voices/clone → Telegram sendVoice, cache by text hash, 200 chars, 100/day
```

## Numbers we measured (8 Oct 2026)

| What | Result |
|---|---|
| Speech-to-text, 4 CPU, no GPU | about 0.45× real time. A 10 s voice note takes about 5 s. A 70 s clip took 29 s, near word-for-word with the Mac version |
| FAQ answer (gemma3:4b) | 24 to 45 s. gemma3:1b was 6 to 16 s but weaker, so 4b was chosen |
| Voice reply | first time about 2 s per line, then instant from cache |
| Unit tests | 35 green: T-01 to T-33 plus extras (`node n8n/test/test_brain.js`) |
| Catalog | 197 synthetic rows, 114 products, 14 categories, Patna-flavoured (Sudha, sattu, parwal, litchi) |

## Repo map

| Path | What |
|---|---|
| `n8n/code/brain.js` | The order brain: extraction rules, state machine, pricing, summary, swap window, questions |
| `n8n/assemble.js` | Builds the n8n workflow JSON from the code and the catalog (source of truth is the repo, not the UI) |
| `n8n/catalog.csv` | Demo catalog, allowlisted columns only |
| `n8n/test/test_brain.js` | Spec tests T-01…T-33 and extras |
| `stt/stt_server.py` | Local service: `/transcribe`, `/ask`, `/voice` |
| `stt/kb.py`, `stt/voice.py` | FAQ retrieval + answer; Sarvam voice with cache and caps |
| `docs/kb/kuiklo_kb.md` | The knowledge base, built from kuiklo.com pages |
| `docs/` | Plan, architecture, decisions (ADRs), risks, backlog, process, journal, demos, tests, case-study site |
| `DEVLOG.md` | One entry per milestone: built, decision, failed, fix, verified by |
| `01_Research/research_log.md` | Every fact with its source tier and confidence |

## Run it yourself

1. **Service** (Linux or Mac, Python 3.9+): `pip install faster-whisper sentence-transformers requests`, put the bhavna.ai `apex-ct2-int8` model folder at `~/bhavna-stt/models/`, copy `stt/*.py` and `docs/kb/kuiklo_kb.md` to `~/bhavna-stt/`, create `~/bhavna-stt/.env` (0600) with `SARVAM_API_KEY`, `SARVAM_VOICE_ID`, `TELEGRAM_BOT_TOKEN`, run `python stt_server.py`. Ollama with `gemma3:4b` on the same box.
2. **Workflow**: `node n8n/assemble.js` → import `n8n/build/workflow.json` into n8n, set the Telegram credential and the OpenRouter credential, activate.
3. **Tests**: `node n8n/test/test_brain.js`.

Secrets never live in this repo. `.env`, `docs/consent/`, and the build output are git-ignored.

## What is next

- WhatsApp Business API with the same brain (Telegram was chosen for the demo because it needs no approval).
- Real catalog and prices from Kuiklo's list; orders written to a sheet or Kuiklo's system.
- Delivery slots from store hours and area coverage.
- More founder-voice lines, each one in Devanagari, after written consent.

## Credits

Built by Satvik Jain with Claude Code, 8 Oct 2026. Speech-to-text model: Oriserve Apex (Apache 2.0) via the bhavna.ai project. Voice: Sarvam AI. FAQ model: Google gemma3 via Ollama. Embeddings: all-MiniLM-L6-v2.
