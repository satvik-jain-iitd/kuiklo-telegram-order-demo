# Kuiklo Telegram Voice Order Demo: Plan and Case Study

This is the user we build for: a grocery customer in Patna who speaks Hinglish and would
rather talk than type. No real customer quote has been captured yet (open).

Satvik Jain, the owner of this project, is not that customer. He is the builder. He is making
a private showcase for Shyam Gupta, the founder of Kuiklo (kuiklo.com, grocery delivery in
Patna). The demo is unofficial. Prices are mock. It is not affiliated with Kuiklo unless
confirmed in writing.

This file is the plan and the case study. It follows the bhavna.ai format. The original spec
stays at `docs/SPEC_v3.md`. This plan is built from that spec plus what happened on
2026-10-08. Where this plan and the spec differ, this plan says why.

How to read it:
- Part A: product. Strategy, market, industry, users, experience, requirements, MVP.
- Part B: engineering. Research, architecture, decision records, risks.
- Part C: backlog. Epics and stories with Gherkin acceptance criteria.
- Part D: process. TDD, DEVLOG, commits, the n8n rulebook, definitions of done.

Each part is also split into its own file under `docs/`. See `docs/README.md`.

---

## Part A: Product

### A1. Product strategy

**Vision.** A customer in Patna sends a voice note in Hinglish. The bot understands the
order, asks only for what is missing, shows every rupee before confirming, and lets the
customer change their mind for one minute. Nothing is hidden.

**Mission for this demo.** One Telegram bot, built in one day, good enough to show Shyam
Gupta what voice ordering could feel like. Real STT. Real voice replies in a cloned voice.
Mock prices.

**Why now.**
- Kuiklo claims 10-minute grocery delivery in Patna (kuiklo.com, Tier A for "they say it").
- bhavna.ai already has a Hinglish speech-to-text model (Oriserve Apex) that runs on CPU.
- The owner already runs n8n on an Oracle box (n8n.linkright.in). No new server needed.
- Sarvam sells voice cloning at ₹3 per 1,000 characters with ₹100 free credits. A demo
  costs almost nothing.
- A small LLM call (DeepSeek v3.2) costs about 0.00004 USD. Rules can do most of the work.

**Wedge.** Voice in, clear price out. Every charge is a line in the summary. The customer
taps Confirm as a separate step. Changes show before and after.

**Positioning.** "Unofficial demo. Mock prices. Not affiliated with Kuiklo." Said in the
bot, in the DEVLOG and in this plan.

**Non-goals for this demo.** WhatsApp. Live inventory or stock numbers. Real payments. Real
dispatch. A database server. Real customer data. Founder voice for real customers. Wastage
AI and founder briefs (backlog).

**The honesty bar.** The bot never says a price is final. It never shows a stock number.
Every voice reply carries the label "AI-generated voice (Shyam Gupta ki awaaz)".

**Success metrics.** Each row says what we want to know and how we capture it.
| Metric | Target | How captured | Today |
|---|---|---|---|
| Unit tests | all green | `node n8n/test/test_brain.js` | 36 PASS (2026-10-08) |
| Short voice note to transcript | under 10 s | pm2 log on Oracle, `seconds` in the STT reply | 9 s for a short Telegram note |
| Long voice note to transcript | about 0.45x real time | same | 29.4 s for 70 s; 34.2 s for 75 s |
| FAQ answer time | under 45 s | `seconds` in the `/ask` reply | 24 to 45 s with gemma3:4b |
| Voice spend | under ₹100 total | Sarvam dashboard | ₹2.34 for 35 cached lines |
| Stock numbers shown to a customer | zero | T-22, manual read of every message | zero |
| Hidden charges | zero | T-08, T-09 | zero |
| Live manual checks M-01 to M-04 | all done | `docs/tests/test-cases.md` | pending |

**Business model.** None. This is a showcase. If Kuiklo wants it, that is a separate talk.

### A2. Market and competitor research

All Kuiklo facts come from `01_Research/research_log.md` and `docs/kb/kuiklo_kb.md`. Tiers
follow the house web-research rules. "Tier A" here means the company said it on its own
site. It does not mean it is true in practice.

| Claim | Source | Tier | Confidence |
|---|---|---|---|
| Kuiklo is an online grocery delivery service in Patna | kuiklo.com meta description | A | 0.9 that they say it |
| Promise: delivery in 10 minutes | kuiklo.com title "10-Min Essentials" | A | 0.9 they claim it; 0.4 that it holds |
| Categories: fruits, vegetables, dairy, snacks, daily essentials | kuiklo.com | A | 0.9 |
| Android app `com.kuiklo.app`; iOS app id 6748861544 | Play Store and App Store links on the site | A | 0.9 |
| Social: instagram.com/kuiklo__ and a Facebook page | linked from the site | A | 0.9 |
| Founder: Shyam Gupta | the owner said so in chat | S | 0.7 (not checked against a public source) |
| The site is a JS app; the homepage HTML holds no prices, fees or FAQ | raw fetch, 6.9 KB | A | 0.9 |
| Zero delivery charges, no platform fees, no minimum order | site FAQ pulled from the JS bundle (KB) | A | 0.9 they say it |
| "Loved by 15,000+ customers", 4.9/5 rating | site testimonials (KB) | A | they say it; not independent |

**Competitors, as Kuiklo names them.** The site compares itself with Blinkit, Zepto and
Instamart. It says those apps charge "up to 20 to 30% more for convenience" and that Kuiklo
is hyperlocal, Patna-first, with zero delivery charges. This is the site's own comparison
(Tier A for "they say it", confidence 0.9). We have not checked the three apps ourselves.
No independent price comparison exists in this repo (open).

**The earlier "Quiklo" rows** (a student-lending company in Bengaluru) are a different
company. They are marked outdated in the research log and kept, never deleted.

### A3. Industry research (what is moving under this product)

Only what the sources in this repo support.
- **Hinglish speech-to-text runs on CPU now.** The Apex whisper fine-tune, shipped by
  bhavna.ai as a CTranslate2 int8 copy, transcribes a 70 s Hinglish clip in 29.4 s on a
  4-CPU Oracle box. Near word for word. (Tier S, measured 2026-10-08, confidence 0.8.)
- **Voice cloning is cheap and gated by consent.** Sarvam: ₹3 per 1,000 characters, ₹100
  free credits, text up to 1,000 characters per call, and the rule "only clone a voice you
  have the right to use". (Tier A vendor docs, confidence 0.9.)
- **Small local models answer FAQs, slowly.** gemma3:4b on 4 CPU gives good Hinglish in 24
  to 45 s. gemma3:1b is 6 to 16 s but weaker and mostly English. (Tier S, measured.)
- **Cloud LLM extraction is almost free.** One DeepSeek v3.2 call through OpenRouter costs
  about 0.00004 USD. Free model slugs are not stable: one returned 404, one 429 the same day.
- **Free hosting tiers do not fit speech models.** Render and Railway free tiers sleep and
  have too little RAM for whisper plus MiniLM plus torch. Rejected (ADR-011).

### A4. Users: personas, jobs, prioritisation

**P1. The Patna customer who orders by voice (primary).** Speaks Hinglish. Uses a phone.
Knows what she wants ("do kilo aloo, ek kilo atta") but not the brand names in the app.
Job: "Let me say my list once and see the price before I pay." Pain: typing item by item,
surprise fees at checkout, no easy way to fix a mistake after ordering. Success: she says
it, taps three buttons, sees the total, taps Confirm. Open: no real customer has used the
bot yet.

**P2. Shyam Gupta, founder of Kuiklo, reviewing the demo.** He will judge in a few minutes
on his phone. He wants to see: does it understand real Hinglish, is the price honest, does
his own voice sound right, is it labeled AI. He must also give the written consent note for
the voice clone (G1). Open: the demo has not been shown to him yet.

**P3. The operator who runs n8n (Satvik).** Builds from the repo, not the n8n UI. Deploys
the workflow by API. Runs the Oracle service under pm2. Needs: a kill switch in Config,
secrets outside the nodes, tests that run without n8n, logs with no audio content.

**Not for:** real customers in production. English-only users (the bot is Hinglish first).
WhatsApp users (Telegram only for this demo).

Prioritisation: P2 decides whether this goes anywhere, so the demo script (D1) is written
for him. P1 shapes every message. P3 shapes the build process.

### A5. Experience: journey, states, failure states, voice fallback

There is no app. The UI is a Telegram chat: text, inline buttons, and voice bubbles.

**State machine** (from `n8n/code/brain.js`).
```
IDLE ──order text/voice──▶ COLLECTING ──all fields──▶ REVIEW ──Confirm──▶ SWAP_WINDOW (60 s)
  ▲                            ▲    │ missing: qty, brand, date, slot, name, phone, area      │
  │                            └────┘ (one question per turn, buttons where possible)         │ swap item + brand
  │                                                                                           ▼
  │◀── Cancel (new session) ◀── REVIEW                                          SWAP_PENDING ──confirm──▶ CLOSED
  │                                                                                   │ cancel change: back to SWAP_WINDOW
  └── new order from CLOSED, SWAP_WINDOW or REVIEW starts a fresh session (name kept) ◀┘   60 s over: CLOSED
```
The spec listed CONFIRMED and CANCELLED as states. In code, Confirm goes straight to
SWAP_WINDOW, and Cancel resets to a new IDLE session. Same behaviour, fewer states.

**Chat flow (what the customer sees).**
1. `/start`: Devanagari welcome text, plus a voice note in the founder's cloned voice with
   the greeting from Config. Caption carries the AI label.
2. Voice note or text with the order. Voice goes to the STT service first.
3. "Maine yeh samjha:" with the item list and the date if said.
4. One question per missing field, in this order: quantity, brand (per item, with price
   buttons and "Koi bhi chalega"), date (Aaj / Kal), slot (Morning / Evening), name, phone,
   area (three Patna areas as buttons). Short questions are voiced in Devanagari.
5. Order Summary in a `<pre>` table: items, subtotal, delivery fee (demo) ₹25, handling fee
   (demo) ₹5, TOTAL. Delivery, payment (COD), area, name, masked phone. Buttons: Confirm,
   Kuch badalna hai, Cancel.
6. After Confirm: order id `ORD-YYYYMMDD-NNNN`, the one-minute notice, buttons "Order
   change karna hai" and "Sab theek hai".
7. Swap inside 60 s: pick item, pick brand, see before and after lines, confirm or keep the
   old order. Typing a brand name also works ("Daawat rozana gold").
8. Questions any time: "kitne items", "total", "delivery kab", "atta ke brands". Stock
   questions are refused. Anything else goes to the FAQ bot (KB).

**Failure states.**
| Situation | What the bot does | What the customer sees | Decision |
|---|---|---|---|
| Voice note is silence or STT returns empty | no extraction | "Kuch sunai nahi diya. Voice note dobara bhejein ya order type karein." | T-05 |
| Words not in the catalog | rules find nothing; LLM fallback runs; if still nothing, FAQ bot | "Mujhe order samajh nahi aaya..." plus the unknown words, or a FAQ answer | T-04 |
| LLM model returns 404 or 429 | node continues on error; rules answer alone | same as above | ADR-006 |
| STT service down (restart) | HTTP node fails; n8n error workflow | no reply for that note | risk R2; pm2 restarts the service |
| Sarvam or Telegram sendVoice fails | error output of the voice node sends the same text | text message with the same buttons | always text fallback |
| Voice text over 200 chars, daily cap of 100 reached, or Latin letters in the text | `/voice` returns not ok | text message instead | voice.py caps |
| Swap tapped after 60 s | state goes CLOSED | "⏱️ Change ka time nikal gaya..." | T-16, T-19b, T-28 |
| Confirm tapped twice | second tap ignored | "Order ... pehle hi confirm ho chuka hai." | T-13 |
| Old button tapped in the wrong state | nothing changes | "Yeh button ab kaam nahi karta." | brain.js |
| Stock question | refusal, no catalog read | "Stock ki jaankari main nahi de sakta." | T-22 |
| FAQ question off topic (score under 0.30) | no LLM call | "Yeh sawal Kuiklo ke baare mein nahi lag raha..." | kb.py |
| Ollama down or slow | best KB chunk sent as is | a plain answer, no model name | kb.py |
| Kill switch true in Config | workflow stops at the IF | nothing | P3 safety |

**Voice fallback.** Voice is only for the greeting and the short follow-up questions.
Summaries, lists and FAQ answers are text. Every voice line is Devanagari only (ADR-009).
If anything fails, the same text goes out with the same buttons. The customer never loses
the thread.

### A6. Product requirements document

**Problem.** Ordering groceries by typing is slow for Hinglish speakers. Checkout fees
surprise people. Fixing an order after placing it is hard.

**Goals.** G1 voice in, order out. G2 every charge visible before Confirm. G3 one-minute
change window with before and after. G4 answers about the order and brands, never stock.
G5 founder voice replies, labeled AI, with consent. G6 a journey documented as a case study.

**Functional requirements.**
| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR1 | Typed order in Hinglish is parsed into items, quantities, units, date and slot | must | done (T-01, T-27) |
| FR2 | Voice note is transcribed by bhavna.ai STT on Oracle, then the same flow | must | done (M-02 live pending) |
| FR3 | Each missing field is asked one at a time with buttons where possible | must | done (T-03, T-11) |
| FR4 | Brand is asked per item when the catalog has more than one brand | must | done (T-11, T-29) |
| FR5 | Full breakdown with every charge labeled demo, before a separate Confirm tap | must | done (T-07 to T-09) |
| FR6 | Typed "haan" or "nahi" in REVIEW works like the buttons | should | done (T-14) |
| FR7 | 60 s swap window from server time; refused after | must | done (T-15, T-16) |
| FR8 | Swap shows before and after per line and in total; change_log entry | must | done (T-17 to T-19) |
| FR9 | Questions about items, total, delivery and brands are answered from the order and catalog | must | done (T-20, T-21) |
| FR10 | Stock questions are refused; stock columns never loaded | must | done (T-06, T-22) |
| FR11 | Other questions go to the FAQ bot built from kuiklo.com text | should | done |
| FR12 | Greeting and follow-up questions are voiced in the cloned founder voice with an AI label | should | done (T-30) |
| FR13 | Every voice string is Devanagari only | must | done (T-31) |
| FR14 | Text fallback for every voice reply | must | done |
| FR15 | Phone masked to first 2 and last 2 digits everywhere | must | done (T-10) |
| FR16 | Kill switch in Config stops the bot | must | done |
| FR17 | Public order page with no PII | could | not built (P8) |

**Non-functional requirements.**
| ID | Requirement |
|---|---|
| NFR1 | STT about 0.45x real time on 4 CPU; a 10 s note in about 5 s |
| NFR2 | Voice spend under ₹100 total; 200 chars per message; 100 voice messages per day |
| NFR3 | Secrets only in the Secrets vault, n8n credentials, and `~/bhavna-stt/.env` (0600). Never in nodes or logs |
| NFR4 | The Oracle service listens on 127.0.0.1 only |
| NFR5 | Logs carry no audio and no phone numbers |
| NFR6 | The workflow is built from the repo (`assemble.js`), never edited in the n8n UI |
| NFR7 | All brain logic runs and is tested without n8n |

**Constraints.** Telegram only. Mock catalog (`n8n/catalog.csv`, 74 rows). Demo fees fixed
at ₹25 and ₹5. Payment always COD.

**Release criteria (minimum showcase, from SPEC section 12).** T-01 to T-19 pass. M-01 and
M-03 done in a real chat. No stock figure in any message. Every summary shows all charges.
DEVLOG has one entry per milestone.

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

MVP = P1 to P7 on the owner's test chat. Next = P8, then the roadmap below.

### A8. Roadmap (what comes after the demo)

| Step | Scope | Why |
|---|---|---|
| Live checks | M-01 to M-04 done by the owner, then shown to Shyam Gupta | the demo is not done until a real chat proves it |
| Consent note | Shyam Gupta's own written note in `docs/consent/` | G1 is met by the owner's word today, not by a note from Shyam |
| P8 | Order page on GitHub Pages, no PII | spec item not yet built |
| Case study site | `docs/index.html` on GitHub Pages | public story of the build |
| WhatsApp | same brain, WhatsApp Business API trigger | the spec's original channel |
| Real catalog | Kuiklo's SKU list through the same column allowlist | mock prices today |
| Order writes | append each confirmed order to a sheet or SQLite, not static data | static data is demo only |
| KB speed | test qwen2.5:3b as a middle option between 1b and 4b | 24 to 45 s is slow for chat |

---

## Part B: Engineering

### B1. Research summary (tiers per the house rules; confidence 0 to 1)

**Kuiklo.** See A2. Company site facts are Tier A for "they say it". The founder's name is
Tier S from the owner, 0.7.

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

**Config node values.** `kill_switch` false, `delivery_fee_inr` 25, `handling_fee_inr` 5,
`swap_window_s` 60, `stt_url`, `kb_url`, `voice_url` (all 127.0.0.1:8787), `voice_enabled`
true, `greeting_text` (Devanagari), `use_llm_fallback` true, `llm_model`
`deepseek/deepseek-v3.2`, `catalog_json` (the CSV as JSON).

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

### B3. Architecture decision records

Each ADR has context, decision, trade-offs, consequences. They live in
`docs/decisions/ADR-NNN.md`. All are dated 2026-10-08.

**ADR-001 n8n workflow as the backend, not a local Python bot.** The spec said `bot.py` on
the Mac with long polling. The owner said: build on n8n. Trade-off: brain logic must be
pure JS in a Code node; n8n quirks cost hours. Consequence: no Mac needs to stay on; the
bot runs where n8n runs.

**ADR-002 bhavna.ai STT on Oracle through CTranslate2 int8 and faster-whisper.** MLX cannot
run on aarch64 Linux. Same weights, same decode settings. Trade-off: 0.45x real time on CPU.

**ADR-003 One MAIN workflow, no SUB workflows.** The rulebook ladder says: one workflow if
it can do the job. 21 nodes fit. Trade-off: the brain and the FAQ and voice paths share one
canvas.

**ADR-004 Sessions and orders in workflow static data.** Demo only. No database. Trade-off:
data can be lost on re-import; not for production.

**ADR-005 Rules first, LLM only when rules find nothing.** Rules handle numbers, Hindi
number words, units, aliases and bigrams. The LLM runs only when there are unknown words
and no items. Trade-off: two code paths to test.

**ADR-006 DeepSeek v3.2 as the LLM fallback model.** Free slugs failed (404, 429) in live
tests. DeepSeek costs about 0.00004 USD per call. Trade-off: not free; a key is needed.

**ADR-007 FAQ bot with MiniLM retrieval and gemma3:4b on local Ollama.** Quality over speed,
owner's call. Trade-off: 24 to 45 s per answer.

**ADR-008 Sarvam cloned voice, cached by text hash, capped per message and per day.** Voice
only for the greeting and short questions. Trade-off: needs consent (G1) and a key.

**ADR-009 Every string sent to Sarvam is Devanagari.** Hinglish in Latin letters is
mispronounced. Enforced in `voice.py` and by T-31. Trade-off: two copies of each question
(Devanagari for voice, Hinglish for text).

**ADR-010 Brand is asked per item, never assumed.** When the catalog has more than one
brand, the bot asks with price buttons and "Koi bhi chalega". Trade-off: one more tap per
multi-brand item.

**ADR-011 Oracle box under pm2, not Render or Railway.** Free tiers sleep and lack RAM.
pm2 saved and systemd-enabled so the service survives a reboot. Trade-off: one box to keep
alive.

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

---

## Part C: Backlog (epics, stories, Gherkin)

Each story maps to a test in `docs/tests/test-cases.md`. Stories are named after the spec
priorities P1 to P8. GitHub issues are not used yet (open).

### E1. Text order (P1)
**S1.1 Typed order is parsed.**
```gherkin
Scenario: items, quantities, units and date from one line
  When the customer types "1 kg atta, 2 roti, 3 kg bhindi, kal"
  Then the bot lists atta 1 kg, roti 2 pcs, bhindi 3 kg
  And delivery date is tomorrow in Asia/Kolkata
```
**S1.2 Hindi number words and grams.**
```gherkin
Scenario: "do kilo aloo aur teen roti aadha kilo tamatar"
  Then aloo 2 kg, roti 3, tamatar 0.5 kg
Scenario: "500 gram dahi aur 250g cheeni"
  Then dahi 0.5 kg and cheeni 0.25 kg
```
**S1.3 Unknown words do not crash.**
```gherkin
Scenario: "xyzabc"
  Then the bot says it did not understand and names the unknown word
```

### E2. Voice in (P2)
**S2.1 Voice note is transcribed on Oracle.**
```gherkin
Scenario: OGG voice note
  Given the STT service is up on 127.0.0.1:8787
  When the customer sends a voice note
  Then n8n downloads the file, posts the bytes to /transcribe
  And the text enters the same flow as a typed order
```
**S2.2 Empty transcript.**
```gherkin
Scenario: silence
  When STT returns empty text
  Then the bot asks the customer to send the note again
```

### E3. Missing details (P3)
**S3.1 One question at a time, with buttons.**
```gherkin
Scenario: slot missing
  Given items, brand, and date are known
  Then the bot asks for the slot with Morning and Evening buttons
Scenario: weight item without quantity
  When the customer types "bhindi"
  Then the bot asks "Bhindi kitna chahiye?" with 500 g, 1 kg, 2 kg buttons
```
**S3.2 Brand per item (ADR-010).**
```gherkin
Scenario: atta has four brands
  When the customer orders "1 kg atta kal"
  Then the bot asks "Atta kaunsa brand chahiye?" with four price buttons and "Koi bhi chalega"
Scenario: brand typed with the item
  When the customer types "1 kg pillsbury atta, 2 roti, kal"
  Then Pillsbury is set and the brand is not asked again
```

### E4. Breakdown and Confirm (P4)
**S4.1 Every charge is visible.**
```gherkin
Scenario: subtotal 188
  Then the summary shows Items subtotal ₹188, Delivery fee (demo) ₹25, Handling fee (demo) ₹5, TOTAL ₹218
  And exactly 3 item lines and 4 charge lines carry a rupee sign
  And the word "demo" is present
```
**S4.2 Confirm is a separate tap and saves once.**
```gherkin
Scenario: Confirm tapped twice
  Then one order is saved with id ORD-20261008-0001
Scenario: typed "haan" in REVIEW
  Then it counts as Confirm
```
**S4.3 Phone is masked.**
```gherkin
Scenario: 9812345610 given
  Then the summary shows 98xxxxxx10 and never the full number
```

### E5. Swap window (P5)
```gherkin
Scenario: change at 30 s
  Then the bot asks which item to change
Scenario: change at 61 s
  Then the bot says the time is over and the state is CLOSED
Scenario: Aashirvaad to Pillsbury
  Then the bot shows "Aashirvaad 1 kg ₹48 → Pillsbury 1 kg ₹52 (+₹4)" and "TOTAL: ₹218 → ₹222"
Scenario: cancel change
  Then the original order is unchanged and change_log is empty
Scenario: change confirmed
  Then change_log has one entry, total is 222, and the dispatch message is sent
Scenario: brand typed in the window
  When the customer types "Daawat rozana gold" at 10 s
  Then the change summary shows India Gate to Daawat and the state is SWAP_PENDING
```

### E6. Questions and FAQ (P6)
```gherkin
Scenario: "kitne items"
  Then the bot lists the 3 items from the order record
Scenario: "atta ke brands"
  Then the bot lists brands from the catalog and no stock figure
Scenario: "kitna stock hai"
  Then the bot replies only "Stock ki jaankari main nahi de sakta."
Scenario: "delivery charge kitna hai?"
  Then the KB bot answers from kuiklo.com text in Hinglish
Scenario: "what is the capital of France"
  Then the KB bot says the question is not about Kuiklo and calls no model
```

### E7. Founder voice (P7)
```gherkin
Scenario: /start
  Then the greeting from Config is sent as a voice note with the AI label in the caption
Scenario: follow-up question
  Then the Devanagari question is voiced and the summary is text only
Scenario: every voice line
  Then it contains Devanagari and no Latin letters
Scenario: voice fails
  Then the same text and buttons go out as a text message
```

### E8. Order page (P8), not built
```gherkin
Scenario: public page
  Given a confirmed order
  Then a page with items, total and delivery promise exists at a random slug with noindex
  And it shows no name, phone or area
```

### E9. WhatsApp (next)
```gherkin
Scenario: same brain, new trigger
  Given a WhatsApp Business API trigger
  When a customer sends a voice note
  Then the same Order brain produces the same messages
```

### E10. Real catalog (next)
```gherkin
Scenario: Kuiklo SKU list
  Given a real catalog export
  When loadCatalog runs
  Then only the allowlisted columns are in memory and no stock column exists
```

### E11. Order writes (next)
```gherkin
Scenario: confirmed order is persisted
  When Confirm is tapped
  Then one row is appended to a sheet or SQLite with the masked phone
  And the row survives a workflow re-import
```

---

## Part D: Process (how the work runs)

### D1. Order of operations, fixed
1. Read `docs/SPEC_v3.md`. Check G1 (consent) and G2 (inventory) before any voice or
   catalog code.
2. Read the bhavna.ai process docs. Verify the STT interface. Log it in
   `docs/bhavna_integration_notes.md`.
3. Build P1 to P8 in that order. Write the tests first. Stop at each milestone to update
   `DEVLOG.md`.
4. Commit after each milestone, like `feat(M3): 60-second swap window`.
5. Keep this docs tree in step: `process-trace.md`, `journal/`, `discussions/`, `ideas.md`.

### D2. Commits and the repo
- Public repo: https://github.com/satvik-jain-iitd/kuiklo-telegram-order-demo.
- One commit per milestone, Conventional Commits, English, short.
- `docs/consent/*` is gitignored. The consent note never leaves the machine.
- `n8n/build/` is gitignored. The build is reproduced with `node n8n/assemble.js`.
- Branches and PRs are not used yet. If the project grows, follow bhavna's `dev` and
  `feat/` rules.

### D3. Test-driven development
For every story:
1. Write the failing test in `n8n/test/test_brain.js`, named after the spec id (T-NN).
2. Run `node n8n/test/test_brain.js`. See it fail.
3. Write the least code in `n8n/code/brain.js` that passes.
4. Refactor with ponytail eyes. Run again.
Rules. The brain is pure JS with the clock injected, so every state and timing test runs
without n8n. Code node sources run once with stubs after assembly. STT, KB and voice are
checked by self-checks (`kb.py`, `voice.py`) and by real calls from the Oracle box. Manual
checks M-01 to M-04 are rows in `docs/tests/test-cases.md` with a date and a result.

### D4. DEVLOG, demos and the journey log
- `DEVLOG.md`: one entry per milestone. Built, Decision, Failed, Fix, Verified by, Time.
- `docs/demos/D<n>.md`: the demo script and what was learned.
- `docs/journal/YYYY-MM-DD.md`: one entry per working session.
- `docs/decisions/ADR-NNN.md`: every decision that changes architecture or scope.
- `docs/ideas.md`: every idea, dated, one line, with status. Mirrored to the SecondBrain
  ideas log.
- `docs/research/`: findings with tiers; `experiments.md` with hypothesis, design, result,
  decision. Rows are never deleted.

### D4b. Discussion log
`docs/discussions/YYYY-MM-DD.md`: bullets of what the owner pointed out, pushed back on,
and decided. The "why" behind each ADR traces to a line here.

### D5. n8n rulebook (house rules that apply here)
- The repo is the source of truth. `assemble.js` builds the workflow. Never edit in the UI.
- MAIN owns the trigger, Config and the kill switch. SUB workflows only when one workflow
  cannot do the job (ADR-003: not needed yet).
- Secrets live in n8n credentials or `.env` files, never in node parameters.
- Every IF boolean condition carries `singleValue: true`.
- `replyMarkup` on a Telegram send node is the literal `inlineKeyboard`.
- A Code node that needs the raw update reads `$('Telegram Trigger')`, not `$input`.
- Deploy by API. Check the webhook has 0 pending updates after activation.

### D6. Definition of ready (a story may start only when all are true)
1. The story has a spec id (P-n, T-nn or M-nn) or a row in the backlog with Gherkin.
2. Every scenario is testable: a unit test, a self-check, or a manual row.
3. The gate it touches (G1 consent, G2 inventory, G3 scope) is checked and written down.
4. Dependencies (Oracle service up, credential ids, catalog rows) are listed.
5. The ponytail line is written: what is deliberately not built.

### D7. Definition of done (story)
Test written first and green. Scenario mapped to a test or a manual row. DEVLOG entry.
Ponytail review: nothing speculative added.

### D8. Definition of done (demo)
Minimum showcase: T-01 to T-19 pass; M-01 and M-03 done in a real chat; no stock figure in
any message; every summary shows all charges; DEVLOG has one entry per milestone.
Full: P6 to P8 done; T-20 to T-31 pass; M-02 and M-04 done; consent note on file.

### D9. Bug lifecycle
When a bug is found in a live test: write it in DEVLOG under Failed before the fix. Fix it.
Add a test that would have caught it when a unit test can see it. Add one row under
"Regression" in `docs/tests/test-cases.md`. One row in `docs/process-trace.md`.

### D10. Spot test before handing back
After any fix on the STT, KB or voice path, run one real call from the Oracle box (a real
wav through `/transcribe`, a real question through `/ask`, one `/voice` call) and paste the
result in DEVLOG. The owner's live check comes after, not instead.

### D11. Process trace
`docs/process-trace.md` gets one row per step. First action of a session: read it. Last
action before "done": append to it. Owner contact is marked asked, volunteered or reviewed.

### D12. Tooling
- `node` for tests and assembly. `pm2` on Oracle for the service. n8n API for deploys.
- `gh` for the public repo. GitHub Pages for `docs/index.html`.
- `python3 ~/Desktop/SecondBrain/tools/grade.py <note>` to check the reading level of docs.

---

## Verification of this plan
- Every Part A, B, C, D section has one home in `docs/README.md`.
- `node n8n/test/test_brain.js` prints 36 PASS.
- The live checks M-01 to M-04 are still pending. This plan says so and does not claim them.

## Skipped on purpose
WhatsApp, live inventory, real payments, real dispatch, a database server, real customer
data, wastage AI, founder briefs, SUB workflows, a GUI. Each is one line in `docs/ideas.md`
with status "dropped for the demo" or "next".
