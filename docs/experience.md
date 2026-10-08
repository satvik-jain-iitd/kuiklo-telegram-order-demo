# Experience: chat flow, states, failure states, voice fallback

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

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
