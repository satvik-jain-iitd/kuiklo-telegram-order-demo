# SPEC v3: Telegram Voice Order Assistant (Showcase Demo)

Project: `kuiklo-telegram-order-demo`
Audience: Shyam G., Kuiklo founder (private showcase).
Label: Unofficial demo. Mock prices and mock charges. Not affiliated with Kuiklo unless confirmed in writing.
Type: Case study. Development is logged in DEVLOG.md, following the process documented in the bhavna.ai repo.
Executor: Claude Code.

---

## 0. Blocking Gates (Read First)

These must be resolved before any voice clone is used.

- G1 Voice consent: The Shyam G. voice clone may be used only after written consent from Shyam G. is saved in `docs/consent/` (private, not published). Every voice reply must be labeled as AI-generated in the message caption. If consent is not on file, the reply uses text only.
- G2 Inventory data: The agent may read the SKU catalog to list brands and product variants. It must never read or display stock quantities, supplier data, or any sheet column that holds stock. The inventory sheet is read through a column allowlist.
- G3 Scope and time: This spec is a multi-hour build, not a 10-minute build. The showcase order of priority is in Section 12. Build in that order and stop when time runs out.

---

## 1. Product Summary

A customer messages the Kuiklo demo bot on Telegram. The customer sends a voice note or text. The bot:
1. Transcribes the voice note (local bhavna.ai STT).
2. Extracts the order and asks for any missing details.
3. Shows a full price breakdown and asks for confirmation.
4. Places the order and offers a one-minute swap window.
5. Answers customer questions about the current order and brand options.
6. Sends follow-up questions as a voice note in the Shyam G. voice (only if G1 is met), with a text caption.

The customer must always know what the bot can do. Options such as "change order" are shown as buttons, not hidden.

---

## 2. Architecture

```
Telegram (customer)
   |  long polling (getUpdates) from the developer's Mac (no public URL needed)
   v
bot.py (Python, runs on Mac M1)
   |-- voice note -> getFile -> OGG download -> bhavna.ai STT (local Python script) -> text
   |-- text -> understand.py (rules; optional LLM if key set)
   |-- order.py (state machine, mandatory fields, pricing, charges, swap window)
   |-- catalog.py (SKU catalog: name, brand, variant, unit price; allowlisted columns only)
   |-- tts.py (Sarvam TTS with Shyam G. voice ID, only if G1 met) -> ffmpeg -> OGG Opus
   |-- store.py (orders.csv or SQLite; order history for swap window)
   v
Telegram sendMessage / sendVoice / inline keyboards
```

Design choices:
- Long polling, not webhooks. The bot runs locally, so no tunnel or public HTTPS is needed.
- Telegram voice notes arrive as OGG Opus. Voice replies must be OGG Opus for `sendVoice`. Convert with ffmpeg.
- bhavna.ai is called as a local Python function or CLI. Its exact interface is verified in M0 and logged in `docs/bhavna_integration_notes.md`.
- Catalog and inventory are local CSV or Google Sheet export. No live API. A column allowlist is enforced in code.

---

## 3. Secrets and Config (.env)

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (for developer test chat only)
- `SARVAM_API_KEY`
- `SARVAM_VOICE_ID` (Shyam G. clone, used only if G1 met)
- `LLM_API_KEY` (optional)
- `BHAVNA_STT_PATH` (path to local bhavna.ai script)

`.env` is gitignored. Keys never appear in logs or DEVLOG.

---

## 4. Telegram Chat Experience

### 4.1 Formatting rules
- Use `parse_mode=HTML`. Bold for headings, `<pre>` for the breakdown table so columns align.
- One message per step. Keep each message under about 10 lines, except the order summary.
- Buttons (inline keyboard) for every yes/no choice and every option list. Never ask a customer to type "HAAN" when a button can be used. Text yes/no is still accepted as fallback.
- Hinglish for customer messages. English for logs and DEVLOG.
- Emojis only as status markers: ✅ confirmed, ⏱️ time-limited, ⚠️ warning, 🎙️ voice reply.

### 4.2 Sample flow (what the customer sees)

Step 1, customer sends voice note.

Bot:
```
🎙️ Aapka voice note mil gaya. Samajh raha hoon...
```

Step 2, bot shows what it understood, asks for missing details.

Bot:
```
Maine yeh samjha:
• Atta 1 kg
• Roti 2 pcs
• Bhindi 3 kg
📅 Delivery: kal (9 Oct)

Ek detail chahiye: Delivery slot kya rakhein?
[Morning] [Evening]
```

Step 3, follow-up as Shyam G. voice (G1 met), caption included.

Bot sends voice note with caption:
```
🎙️ AI-generated voice (Shyam G. ki awaaz). Ek sawal: aapka naam kya hai?
```
Fallback if G1 not met: text only, same wording, no voice.

Step 4, full breakdown before confirmation. This is mandatory. No charge may appear later that is not shown here.

Bot:
```
🧾 <b>Order Summary</b>

<pre>
Item              Qty     Price
Atta              1 kg    ₹48
Roti              2 pcs   ₹20
Bhindi            3 kg    ₹120
--------------------------------
Items subtotal            ₹188
Delivery fee (demo)        ₹25
Handling fee (demo)         ₹5
--------------------------------
TOTAL                     ₹218
</pre>

📦 Delivery: kal, morning slot
💳 Payment: COD (cash on delivery)
🏠 Area: Kankarbagh
👤 Naam: Ramesh | 📱 98xxxxxx10

Prices and fees are demo values. Order confirm karne se pehle sab kuch dekh lijiye.
[✅ Confirm order] [✏️ Kuch badalna hai] [❌ Cancel]
```

Step 5, after confirmation.

Bot:
```
✅ Aapka order process ho raha hai.
Order ID: ORD-20261008-0001

⏱️ Ek minute ke andar koi change ho to abhi bata sakte hain.
[🔄 Order change karna hai] [👍 Sab theek hai]

Order page: https://<user>.github.io/<slug>.html
```

The "Order change karna hai" button appears here because the customer may have remembered a change at the last minute. The swap window is shown with a clock message, not hidden.

Step 6, swap flow (inside the 60-second window only).

Bot:
```
Kaunsa item badalna hai?
[Atta] [Roti] [Bhindi]
[Koi item nahi, sirf brand badalna hai]
```

Customer taps Atta. Bot:
```
Atta ke brand options (demo catalog):
[Aashirvaad 1 kg ₹48] [Pillsbury Chakki Fresh 1 kg ₹52] [Fortune Chakki 1 kg ₹50]
```

Customer taps Pillsbury. Bot shows before and after:
```
🔁 Change summary
Atta: Aashirvaad 1 kg ₹48 → Pillsbury Chakki Fresh 1 kg ₹52 (+₹4)
Items subtotal: ₹188 → ₹192
Delivery and handling fees: unchanged
TOTAL: ₹218 → ₹222

[✅ Change confirm karein] [❌ Purana order rakhein]
```

After confirm:
```
✅ Aapke order mein change kar diya gaya hai. Updated order dispatch ho gaya.
Naya total: ₹222
```

After 60 seconds, any change button shows:
```
⏱️ Change ka time nikal gaya. Order change ke liye Kuiklo support se contact karein.
```

Step 7, customer questions.

Customer: "Mere order mein kitne items hain?" → lists items from the order record only.
Customer: "Atta ke aur brands kaun se hain?" → lists brands from the SKU catalog. No stock shown.
Customer: "Kitne bache stock mein?" → refusal: "Stock ki jaankari main nahi de sakta."

### 4.3 Transparency and fairness rules
- Every charge line item in the summary. No hidden fee.
- The summary is shown before confirmation. Confirmation is a separate tap.
- Any change after confirmation shows before and after, line by line.
- Delivery fee and handling fee do not change silently. If they change, show it.
- Payment mode and delivery promise are always shown.
- Every price is labeled "demo" in the demo build.
- The bot never says a price is final when it is a demo value.

---

## 5. Conversation State Machine

| State | Entered when | Accepts | Next |
|---|---|---|---|
| IDLE | Start or after order closed | Voice note, text | COLLECTING |
| COLLECTING | Mandatory field missing | Answer (text or button) | COLLECTING or REVIEW |
| REVIEW | All fields present | Confirm, Edit, Cancel | CONFIRMED, COLLECTING, CANCELLED |
| CONFIRMED | Confirm tapped | Swap offer, questions | SWAP_WINDOW |
| SWAP_WINDOW | Confirmed at time T, now < T + 60 s | Change request, questions | SWAP_PENDING or CLOSED |
| SWAP_PENDING | Change selected | Confirm change, cancel change | CONFIRMED or CLOSED |
| CLOSED | Window expired, or after swap confirmed | Questions only | IDLE on new order |
| CANCELLED | Cancel tapped | New order | IDLE |

The 60-second clock uses server time from the confirm event. Button presses after expiry are rejected even if the message is still visible.

---

## 6. Scope

### Showcase priority (build in this order)
- P1: Telegram bot receives text. Typed order works end to end with summary and buttons.
- P2: Voice note in. bhavna.ai STT produces text. Same flow.
- P3: Missing-detail questions with buttons.
- P4: Full charge breakdown and Confirm button.
- P5: 60-second swap window with brand selection and before-and-after summary.
- P6: Customer questions: items, total, delivery, brands. Stock refused.
- P7: Shyam G. voice reply for follow-up questions (only if G1 met). Text fallback always.
- P8: Order page link (public, no PII). Sheet logging if time allows.

### Out of scope
- WhatsApp (replaced by Telegram for this demo)
- Live inventory, stock, supplier data
- Real payments, real delivery dispatch
- Real customer data (test chat only)
- Hosted backend, database server, login
- Wastage AI and founder intelligence brief (backlog)
- Founder voice for real customers (only demo, labeled AI)

---

## 7. Data

### 7.1 Catalog (allowlisted columns)
`sku | product | brand | variant | unit | unit_price_inr | category | in_stock_flag`

`in_stock_flag` is used only to hide an item that is unavailable. Its value is never shown to the customer. Quantities are never read.

### 7.2 Order record
```json
{
  "order_id": "ORD-20261008-0001",
  "state": "SWAP_WINDOW",
  "confirmed_at": "2026-10-08T08:30:00+05:30",
  "swap_expires_at": "2026-10-08T08:31:00+05:30",
  "customer": {"name": "Ramesh", "phone_masked": "98xxxxxx10", "area": "Kankarbagh", "telegram_id": "123"},
  "items": [{"sku": "ATA-001", "brand": "Aashirvaad", "qty": 1, "unit": "kg", "unit_price": 48, "line_total": 48}],
  "charges": {"items_subtotal": 188, "delivery_fee": 25, "handling_fee": 5, "total": 218},
  "delivery": {"date": "2026-10-09", "slot": "morning"},
  "payment_mode": "COD",
  "change_log": []
}
```

Every change appends to `change_log` with before and after values, time, and reason.

### 7.3 Charges (demo values, labeled)
- Delivery fee: ₹25 fixed in demo.
- Handling fee: ₹5 fixed in demo.
- Total = items subtotal + delivery fee + handling fee.
- Payment is always COD in the demo.

---

## 8. Privacy and Safety

- Phone numbers are masked in every customer message (show last 2 digits only).
- Public order page shows items, total, delivery promise only. No name, phone, or area.
- Public page slug is random. Page has `noindex`.
- Voice clone rules (G1): labeled AI-generated, consent on file, never used to make a real customer believe they are speaking to Shyam G. personally.
- Test chat only. No real customer Telegram IDs are stored in the repo.
- DEVLOG.md stays private until Shyam G. has reviewed what is shared.

---

## 9. Milestones and Honest Estimate

| Milestone | Work | Estimate |
|---|---|---|
| M0 | Read bhavna.ai process docs, verify bhavna.ai STT interface, create repo and DEVLOG | 30 min |
| M1 | Telegram long polling, text order, summary, buttons (P1, P3, P4) with tests first | 1.5 h |
| M2 | Voice note in, bhavna.ai STT (P2) | 45 min |
| M3 | Swap window and before-and-after summary (P5) | 1 h |
| M4 | Customer questions (P6) | 30 min |
| M5 | Shyam G. voice reply with ffmpeg conversion, after G1 (P7) | 1 h |
| M6 | Order page and Sheet logging (P8) | 45 min |

Total: about 6 hours. The minimum showcase is P1 to P5, about 3 hours.

If the deadline is tonight, build P1 to P5 and P7 with text fallback. Skip P8 if needed.

---

## 10. Test Cases (Write First)

### Extraction and catalog
| ID | Input | Expected |
|---|---|---|
| T-01 | "1 kg atta, 2 roti, 3 kg bhindi, kal" | 3 items, correct qty and unit, delivery 2026-10-09 |
| T-02 | "2 roti" | roti 2 pcs (pcs-unit item, unit not required) |
| T-03 | "bhindi" | qty missing flagged (weight item) |
| T-04 | "xyzabc" | unknown_terms, no crash |
| T-05 | Voice note with STT returning empty text | Bot asks customer to resend |
| T-06 | Catalog read | Only allowlisted columns loaded. No stock column in memory. |

### Charges and summary
| ID | Scenario | Expected |
|---|---|---|
| T-07 | Items subtotal 188 | total = 188 + 25 + 5 = 218 |
| T-08 | Summary render | Every charge line present, "demo" label present |
| T-09 | Summary render | No hidden or unlisted charge lines |
| T-10 | Phone shown in summary | Masked to last 2 digits |

### Flow and buttons
| ID | Scenario | Expected |
|---|---|---|
| T-11 | Slot missing | Morning/Evening buttons shown |
| T-12 | Confirm button tapped | State CONFIRMED, order saved once |
| T-13 | Confirm tapped twice (duplicate callback) | Order saved once |
| T-14 | Text "haan" in REVIEW | Treated as Confirm |

### Swap window
| ID | Scenario | Expected |
|---|---|---|
| T-15 | Change button at 30 s | Swap allowed |
| T-16 | Change button at 61 s | Refused with support message |
| T-17 | Brand swap atta Aashirvaad to Pillsbury | Before and after lines shown, total 218 to 222 |
| T-18 | Cancel change | Original order unchanged |
| T-19 | Change confirmed | change_log entry added, total updated, dispatch message sent |

### Customer questions
| ID | Scenario | Expected |
|---|---|---|
| T-20 | "kitne items" | Count and list from order record |
| T-21 | "atta ke brands" | Brands from catalog, no stock figure |
| T-22 | "kitna stock hai" | Refusal, no data |

### Voice reply and consent
| ID | Scenario | Expected |
|---|---|---|
| T-23 | G1 not on file | Voice reply not sent, text sent |
| T-24 | G1 on file | Voice reply sent as OGG Opus, caption contains AI-generated label |

### Manual checks
| ID | Check |
|---|---|
| M-01 | Real Telegram chat, typed order, full flow to confirm |
| M-02 | Real voice note, bhavna.ai transcript, same summary |
| M-03 | Swap done within 60 s, after 60 s refused |
| M-04 | Phone of Telegram on small screen: buttons readable, breakdown aligned |

---

## 11. Process and DEVLOG

DEVLOG.md is mandatory. Use the bhavna.ai log format if found in M0. Otherwise:

```
## YYYY-MM-DD | M1 | T-01 to T-14
Built:
Decision:
Failed:
Fix:
Verified by:
Time spent:
```

Commit after each milestone. Example: `feat(M3): 60-second swap window`.

---

## 12. Definition of Done

Minimum showcase (P1 to P5 with text fallback for P7):
- T-01 to T-19 pass.
- M-01 and M-03 done in a real Telegram chat.
- No stock figure appears in any message (T-22).
- Every summary shows all charges (T-08, T-09).
- DEVLOG.md has one entry per milestone.

Full:
- P6 to P8 done, T-20 to T-24 pass, M-02 and M-04 done.

---

## 13. Open Items and Assumptions

Assumptions (verify in M0):
- A1: bhavna.ai STT runs as a local Python call and accepts OGG or converted WAV. Record the interface.
- A2: Sarvam TTS output can be converted to OGG Opus with ffmpeg and played in Telegram.
- A3: The Sarvam voice ID for Shyam G. works with the TTS endpoint. Parameter names may differ. Confirm in the docs.
- A4: Telegram long polling runs continuously on the Mac during the demo.
- A5: Device timezone is Asia/Kolkata.

Decisions:
- D1: Consent. Has Shyam G. given written consent for the voice clone demo? If not, P7 is text only.
- D2: Brand options. Confirmed as in scope. Source: SKU catalog only.
- D3: Showcase date. Confirm whether "kal" means 9 Oct 2026 (tomorrow from today, 8 Oct 2026).
- D4: Demo fees (₹25 delivery, ₹5 handling) are fixed placeholders. Confirm they are acceptable to show.

---

## 14. First Command for Claude Code

> Read SPEC_v3 fully. Check G1 and G2 before writing any voice or catalog code. Read the bhavna.ai process docs and summarize them in DEVLOG.md. Verify the bhavna.ai STT interface and log it. Then build P1 to P5 test-first, using long polling and inline buttons. Stop at each milestone to update DEVLOG.md. Do not build anything in Section 6 "Out of scope".
