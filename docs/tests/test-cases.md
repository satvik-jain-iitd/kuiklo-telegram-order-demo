# Test cases

Every test maps to a spec id and a story. Manual rows carry a date and a result.
Run: `node n8n/test/test_brain.js`. Last run 2026-10-08: 36 PASS, exit 0.

| Test | Story | Checks | Kind | Status |
|---|---|---|---|---|
| T-01 | S1.1 | "1 kg atta, 2 roti, 3 kg bhindi, kal" gives 3 items with qty and unit; date is 2026-10-09 | unit | green |
| T-02 | S1.1 | "2 roti" gives qty 2, unit pcs | unit | green |
| T-03 | S3.1 | "bhindi" flags qty missing and asks "Bhindi kitna chahiye" | unit | green |
| T-04 | S1.3 | "xyzabc" says not understood and names the word; no crash | unit | green |
| T-05 | S2.2 | blank text asks to resend | unit | green |
| T-06 | FR10 | loadCatalog has no in_stock_flag, stock or qty_in_stock; out-of-stock skus BRD-003 and AAM-001 hidden | unit | green |
| T-07 | S4.1 | full order total is 218 | unit | green |
| T-08 | S4.1 | summary has Items subtotal, Delivery fee (demo), Handling fee (demo), TOTAL, ₹218, "demo" | unit | green |
| T-09 | S4.1 | exactly 3 item lines plus 4 charge lines carry ₹ | unit | green |
| T-10 | S4.3 | summary shows 98xxxxxx10 and never 9812345610; maskPhone handles a space | unit | green |
| T-11 | S3.1, S3.2 | "1 kg atta kal" asks the brand with 5 rows; after "Koi bhi chalega" the slot buttons are Morning, Evening | unit | green |
| T-12 | S4.2 | Confirm sets SWAP_WINDOW and saves one order ORD-20261008-0001 | unit | green |
| T-13 | S4.2 | Confirm twice saves one order | unit | green |
| T-14 | S4.2 | "haan" in REVIEW acts as Confirm | unit | green |
| T-15 | E5 | swap at 30 s is allowed | unit | green |
| T-16 | E5 | swap at 61 s is refused and state is CLOSED | unit | green |
| T-17 | E5 | brand options for atta have 4 rows; swap shows "Aashirvaad 1 kg ₹48 → Pillsbury 1 kg ₹52 (+₹4)" and "TOTAL: ₹218 → ₹222" | unit | green |
| T-18 | E5 | cancel change keeps ATA-001 and an empty change_log | unit | green |
| T-19 | E5 | confirmed change adds one change_log entry, total_after 222, message says dispatch and ₹222 | unit | green |
| T-19b | E5 | swapconfirm at 65 s is refused and the item is unchanged | unit | green |
| T-20 | E6 | "mere order mein kitne items hain?" lists 3 items | unit | green |
| T-21 | E6 | "atta ke aur brands kaun se hain?" lists Aashirvaad and Pillsbury, no "stock" | unit | green |
| T-22 | E6 | "kitna bacha hai stock mein atta?" replies only the refusal line | unit | green |
| X-hindi-nums | S1.2 | "do kilo aloo aur teen roti aadha kilo tamatar" gives 2 kg, 3, 0.5 kg | unit | green |
| X-grams | S1.2 | "500 gram dahi aur 250g cheeni" gives 0.5 kg and 0.25 kg | unit | green |
| X-html-escape | S4.1 | a name with `<b>` tags is escaped in the summary | unit | green |
| X-sessions-isolated | ADR-004 | chat 1 and chat 2 keep separate items | unit | green |
| T-23 | E5 | "Chawal ka dusra brand chahiye" in the window gives swapto buttons for CHA-001 | unit | green |
| T-24 | E5 | "Daawat rozana gold" typed in the window shows India Gate to Daawat and state SWAP_PENDING | unit | green |
| T-25 | S3.2 | "atta pillsbury wala" before confirm applies ATA-002 and shows the summary again | unit | green |
| T-26 | S3.2 | edit button gives per-item brand buttons; brand tap applies Fortune and shows the summary | unit | green |
| T-27 | S1.2 | "1 kg moong dal, 2 packet maggi, ek dozen kele, 250 g hari mirch" gives moong dal 1 kg, maggi 2 pcs, kela 12 pcs, mirch 0.25 kg | unit | green |
| T-28 | E5 | brand typed at 61 s gets the expired message | unit | green |
| T-29 | S3.2 | "1 kg pillsbury atta, 2 roti, kal" sets Pillsbury and does not ask the brand; asks the slot | unit | green |
| T-30 | E7 | /start carries greeting_text as voice_text; the brand question carries Devanagari voice_text; the summary has none | unit | green |
| T-31 | E7, ADR-009 | every voice_text over 8 steps has Devanagari and no Latin letters | unit | green |

Spec tests T-23 and T-24 (voice consent on or off) were renumbered in the test file to the
brand tests above. Consent is enforced by `voice.py` and the Config `voice_enabled` flag,
and is covered by the self-check in `stt/voice.py` (Devanagari refusal, caps, keyboard shape).

## Self-checks on the Oracle service

| Check | Command | Last result |
|---|---|---|
| KB load and retrieval | `./venv/bin/python kb.py kuiklo_kb.md` | ok, 31 chunks, scores 0.35 / 0.5 / 0.04, 2026-10-08 |
| Voice refusals and keyboard shape | `./venv/bin/python voice.py` | ok, 2026-10-08 |
| Health | `curl 127.0.0.1:8787/health` | `{"ok": true}`, 2026-10-08 |
| Real audio through /transcribe | two bhavna wavs | near word for word, 29.4 s and 34.2 s, 2026-10-08 |
| Real /voice call | from Oracle to the owner's chat | voice bubble with button received, cached true, 121 chars, 2026-10-08 |

## Manual checks (SPEC section 10)

| ID | Check | Status |
|---|---|---|
| M-01 | Real Telegram chat, typed order, full flow to confirm | done 2026-10-08, owner's chat, order ORD-20261008-0001 confirmed (screenshot in session) |
| M-02 | Real voice note, bhavna.ai transcript, same summary | pending (short note transcribed in 9 s; full flow not yet recorded) |
| M-03 | Swap done within 60 s, after 60 s refused | partly: brand change by text seen live; button swap and the 60 s refusal still to be shown in a real chat |
| M-04 | Phone of Telegram on a small screen: buttons readable, breakdown aligned | pending |

## Regression (one row per closed bug, re-checked at every demo)

| Bug | Check | Last result |
|---|---|---|
| IF conditions without `singleValue: true` did nothing | assemble.js: every boolean IF carries `singleValue: true` | fixed 2026-10-08; live |
| Normalize read the Config item, not the update | assemble.js: Normalize reads `$('Telegram Trigger')` | fixed 2026-10-08; live |
| STT connection refused during restart | pm2 saved, systemd-enabled; `/health` before a demo | fixed 2026-10-08 |
| OpenRouter free slug 404 / 429 | Config `llm_model` is deepseek/deepseek-v3.2; node continues on error | fixed 2026-10-08 |
| Inline keyboards never sent | assemble.js: `replyMarkup: 'inlineKeyboard'` literal | fixed 2026-10-08; live |
| `missing()` checked `customer.phone` | T-12 to T-19 reach Confirm | green |
| "atta ke brands?" read as an order | T-21 | green |
