# Strategy and roadmap

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

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
