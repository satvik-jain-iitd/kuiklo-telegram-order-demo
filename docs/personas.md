# Personas

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

### A4. Users: personas, jobs, prioritisation

**P1. The Patna customer who orders by voice (primary).** Speaks Hinglish. Uses a phone.
Knows what she wants ("do kilo aloo, ek kilo atta") but not the brand names in the app.
Job: "Let me say my list once and see the price before I pay." Pain: typing item by item,
surprise fees at checkout, no easy way to fix a mistake after ordering. Success: she says
it, taps three buttons, sees the total, taps Confirm. Open: no real customer has used the
bot yet. The quote at the top of `PLAN.md` is a stand-in.

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
