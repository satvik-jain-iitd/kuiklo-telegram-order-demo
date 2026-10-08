# Process trace

One row per step, from the first message of the project. Owner contact: asked / volunteered / reviewed / none.
Rule: read this first in every session, append before saying done.

| # | Actor | Step | Artifact | Owner contact |
|---|---|---|---|---|
| 1 | owner | Sent SPEC_v3: Telegram voice order demo for Shyam Gupta, Kuiklo; gates G1 to G3; P1 to P8; tests T-01 to T-24; asked for the bhavna.ai process | docs/SPEC_v3.md | volunteered |
| 2 | agent | Research round: no grocery company named Quiklo found; rows logged as a search gap | 01_Research/research_log.md | none |
| 3 | owner | Gave the real site, kuiklo.com | chat | volunteered |
| 4 | agent | Research round 2: kuiklo.com facts with tiers (Patna, 10 min, app ids, social); "Quiklo" rows marked outdated | research_log.md | none |
| 5 | agent | Project folder at ~/Desktop/Quiklo; G1 checked: consent not on file; G2: catalog with allowlisted columns only | DEVLOG M0 | none |
| 6 | owner | Decided: backend is n8n, not a local Python bot | chat | volunteered |
| 7 | owner | Decided: STT is bhavna.ai, deployed on Oracle | chat | volunteered |
| 8 | agent | bhavna.ai STT served on Oracle from the CT2 int8 copy with faster-whisper; interface logged; two real wavs near word for word (29.4 s for 70 s, 34.2 s for 75 s) | docs/bhavna_integration_notes.md, stt/stt_server.py | none |
| 9 | owner | Created the new bot @Kuicklobot; token to the Secrets vault | chat | volunteered |
| 10 | owner | Decided: workflow in the Personal root of n8n.linkright.in; extraction = rules first, OpenRouter LLM fallback | chat | volunteered |
| 11 | agent | brain.js written test-first: state machine, rules extraction, pricing, HTML summary, 60 s swap, questions, stock refusal; 27 tests green | n8n/code/brain.js, n8n/test/test_brain.js | none |
| 12 | agent | assemble.js builds the 16-node workflow; deployed by API; webhook set, 0 pending updates | n8n/assemble.js, workflow qAUgmP8Q7cvciLX9 | none |
| 13 | agent | Bug 1 in live test: IF boolean conditions did nothing until `singleValue: true` was set | assemble.js | none |
| 14 | agent | Bug 2: Normalize read the Config item instead of the raw Telegram update; fixed with `$('Telegram Trigger')` | assemble.js | none |
| 15 | agent | Bug 3: STT connection refused while the service restarted; waited, retried | Oracle pm2 | none |
| 16 | agent | Bug 4: OpenRouter free llama slug returned 404; free gemma slug 429 | Config llm_model | none |
| 17 | owner | Decided: LLM fallback model is deepseek/deepseek-v3.2 | chat | asked, answered |
| 18 | agent | Bug 5: inline keyboards never reached Telegram; `replyMarkup` was an expression; n8n needs the literal `inlineKeyboard` | assemble.js | none |
| 19 | agent | Bug 6: `missing()` checked `customer.phone` instead of `phone_masked`; flow stuck at the phone step; T-12 to T-19 then green | brain.js | none |
| 20 | owner | Pushed back: the brand must be asked per item, not assumed | chat | reviewed |
| 21 | agent | Brand per item with price buttons and "Koi bhi chalega"; brand typed with the item or in the swap window; T-23 to T-29 added | brain.js, test_brain.js | none |
| 22 | agent | Bug 7: "atta ke brands?" was read as a new order; a question now wins unless the text carries a quantity | brain.js | none |
| 23 | agent | FAQ bot: kb.py with MiniLM + Ollama, 31 chunks from kuiklo.com, `/ask` on the same service; self-check ok; 4b vs 1b timed | stt/kb.py, docs/kb/kuiklo_kb.md, DEVLOG | none |
| 24 | owner | Decided: KB answer model gemma3:4b, quality over speed | chat | asked, answered |
| 25 | owner | Stated that Shyam Gupta allowed the voice clone; written note from him still to come | docs/consent/ (private) | volunteered |
| 26 | owner | Gave the greeting text for /start | chat | volunteered |
| 27 | agent | voice.py: Sarvam clone, cache by text hash, 200 char and 100 per day caps, AI label, `/voice` endpoint; workflow at 21 nodes with text fallback | stt/voice.py, assemble.js | none |
| 28 | owner | Pushed back: Sarvam mispronounces Hinglish; Hindi in Devanagari sounds right; greeting changed to Devanagari | chat, tasks/lessons.md | reviewed |
| 29 | agent | Rule: every string to Sarvam is Devanagari; voice.py refuses Latin; Devanagari product table; T-30, T-31 added; 36 tests green | brain.js, voice.py, test_brain.js | none |
| 30 | agent | Measured: 35 cached voice lines cost ₹2.34; DeepSeek about 0.00004 USD per call; short note STT 9 s | DEVLOG | none |
| 31 | owner | Decided hosting: Oracle pm2, saved and systemd-enabled; Render and Railway free tiers rejected (sleep, RAM) | chat | asked, answered |
| 32 | owner | Repo made public on GitHub; case study site to be served from docs/index.html on GitHub Pages | github.com/satvik-jain-iitd/kuiklo-telegram-order-demo | volunteered |
| 33 | agent | Docs tree written in the bhavna.ai format: PLAN, split files, 11 ADRs, backlog, risks, process, trace, journal, discussion, demo D1, ideas, tests, experiments | docs/ | none |

**What we would do differently next time (first entries for the playbook).**
- Ask on the first turn which backend the owner wants (n8n or a script). The spec said
  Python; the owner wanted n8n. One question would have saved the long-polling design.
- Set `singleValue: true` on every IF boolean and the `inlineKeyboard` literal on every
  Telegram send node from the first build. Both are now in the process rulebook (D5).
- Pick a paid, stable LLM slug from the start. Free slugs cost more time than they save.
- Ask the owner to hear one voice line before writing twenty. The Devanagari rule came from
  his ear, not from docs.
- Ask "is the brand assumed or asked?" before coding the catalog default.
