## 2026-10-08 | Sarvam TTS gets Devanagari only
Owner: "Sarvam hindi me likhenge to proper pronunciation karta hai, Hinglish me thoda galat pronounce kar deta hai."
Rule: every string sent to Sarvam (greeting, follow-up questions, any future line) is Devanagari with no Latin letters.
Enforced in code: `stt/voice.py` refuses non-Devanagari text (n8n then sends plain text), test T-31 checks every voice line.
