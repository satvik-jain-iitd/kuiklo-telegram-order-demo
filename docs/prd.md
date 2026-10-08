# Product requirements

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

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
