# Market and industry

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

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
