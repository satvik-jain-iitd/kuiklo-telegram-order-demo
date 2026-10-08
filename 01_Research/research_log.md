# Quiklo research log

Date: 2026-10-08
Question: What is Quiklo / Kuiklo, a grocery delivery app that takes orders on WhatsApp by voice?

| Claim | Evidence | Tier | Confidence | Date |
|---|---|---|---|---|
| No grocery company named "Quiklo" or "Kuiklo" found in web search | Standard and extended searches, 3 queries | C (search gap) | 0.6 | 2026-10-08 |
| "Quiklo" is a student consumer-lending platform, Bengaluru, founded 2015 | [Tracxn](https://tracxn.com/d/companies/quiklo/__2wpGwV-E_W8KTd1JpX7fcc7xDkDLfNOdTDt8hpjOxrE), [Crunchbase](https://www.crunchbase.com/organization/quiklo) | B (data sites) | 0.5 | 2026-10-08 |
| Quiklo was acquired by HappyEMI | [Crunchbase](https://www.crunchbase.com/organization/quiklo) | B | 0.5 | 2026-10-08 |
| Quikorder.app is a WhatsApp order-form tool for restaurants, not grocery | [Tracxn](https://tracxn.com/d/companies/quikorderapp/__MHet5raQNr8MLean1d9gvzb02uraQFiZADBvYG6qRfA) | B | 0.5 | 2026-10-08 |
| JioMart runs a WhatsApp shopping flow (reference only) | [Wikipedia](https://en.wikipedia.org/wiki/JioMart) | C | 0.4 | 2026-10-08 |

Decision: No competitor or product data yet. Need the exact name, website, city, or where the client was found.

## Update 2026-10-08, owner gave the real site: kuiklo.com

| Claim | Evidence | Tier | Confidence | Date |
|---|---|---|---|---|
| Kuiklo is an online grocery delivery service in Patna | kuiklo.com meta description: "Order groceries online in Patna with Kuiklo. Get fruits, vegetables, dairy, snacks, and daily essentials delivered in 10 minutes." | A (company site) | 0.9 for "they say it" | 2026-10-08 |
| Promise: 10 minute delivery | Same page, title "10-Min Essentials" | A | 0.9 that they claim it; 0.4 that it holds in practice (no behaviour data) | 2026-10-08 |
| Categories: fruits, vegetables, dairy, snacks, daily essentials | Same meta description | A | 0.9 | 2026-10-08 |
| Android app: `com.kuiklo.app` | https://play.google.com/store/apps/details?id=com.kuiklo.app (linked from the site) | A | 0.9 | 2026-10-08 |
| iOS app id 6748861544 | https://apps.apple.com/in/app/kuiklo/id6748861544 (linked from the site) | A | 0.9 | 2026-10-08 |
| Social: instagram.com/kuiklo__ and a Facebook page | Linked from the site | A | 0.9 | 2026-10-08 |
| Founder: Shyam Gupta | Owner (Satvik) said so in chat | S | 0.7 (not yet checked against a public source) | 2026-10-08 |
| The site is a JS app; the homepage HTML holds no prices, fees, FAQ or contact | Raw fetch, 6.9 KB, one script bundle | A | 0.9 | 2026-10-08 |

The earlier rows about "Quiklo" (student lending) are a different company. Marked outdated.
Demo catalog in `n8n/catalog.csv` uses the site's categories (vegetables, dairy, staples, bakery). Prices are mock.

## Sarvam AI (voice for P7), checked 2026-10-08

| Claim | Evidence | Tier | Confidence | What it changes |
|---|---|---|---|---|
| Every new user gets ₹100 free credits | docs.sarvam.ai pricing page: "Every new user receives ₹100 in credits" | A (vendor) | 0.9 | Budget = ₹100 |
| Credits never expire | pricing page | A (vendor) | 0.8 | No rush |
| Voice Cloning generation costs ₹30 per 10K characters (₹3 per 1K) | pricing page | A (vendor) | 0.9 | ₹100 = about 33,000 characters |
| Bulbul v3 TTS also ₹30 per 10K characters | pricing page | A (vendor) | 0.9 | Same budget either way |
| Cloned voice is used via `POST /voices/clone` with form field `voice_id=svc-...`, `text`, `language_code` | voice cloning overview | A (vendor) | 0.9 | Integration shape |
| `text` max 1000 characters per request | voice cloning overview | A (vendor) | 0.9 | Cap messages |
| "Only clone a voice you have the right to use" | voice cloning overview | A (vendor) | 0.9 | G1 consent stays a gate |
| Key works: stock Bulbul v3, 36 chars, opus, http 200 | our own test call (no clone used) | S | 0.9 | API path proven |

Budget plan (free tier only):
- Voice replies only for the short follow-up questions (name, slot, area), about 40 to 80 characters each. Not for the order summary.
- Cap: `voice_max_chars` 150 per message, `voice_daily_cap` 100 messages per day, counter in workflow static data. Over cap = text only.
- At 80 chars per reply, ₹100 = about 400 voice replies. At 100 per day cap, 4 days of heavy demo use.
- Text fallback always. Voice reply only after Shyam Gupta's written consent is in `docs/consent/`.
