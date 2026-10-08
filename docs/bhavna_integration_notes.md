# bhavna.ai STT on Oracle (integration notes)

Date: 2026-10-08

## What bhavna.ai is on the Mac
- `~/Downloads/Bhavna.ai/macos/dictate.py`. Hotkey dictation. Uses `mlx_whisper` (Apple silicon only).
- Model: Oriserve Apex (whisper fine-tune for Hinglish). Shipped as `models/apex-mlx-q8` (Mac) and `models/apex-ct2-int8` (CTranslate2, for Windows/CPU).
- Decode settings in `dictate.py`: `language="en"`, `task="transcribe"`, `without_timestamps=True`, `temperature=0.0`.

## What runs on Oracle
- Box: aarch64 Linux, 4 CPU, no GPU, Python 3.9. MLX cannot run here.
- So the same Apex weights are served from the CT2 int8 copy with `faster-whisper 1.2.1` (`ctranslate2 4.8.2`). Same decode settings.
- Files: `~/bhavna-stt/stt_server.py`, `~/bhavna-stt/venv`, `~/bhavna-stt/models/apex-ct2-int8` (773 MB).
- Process: pm2 `bhavna-stt`. Listens on `127.0.0.1:8787` only.
- API: `POST /transcribe` raw audio bytes (OGG Opus from Telegram works; PyAV decodes it) -> `{"text": "...", "seconds": 1.2}`. `GET /health` -> `{"ok": true}`.

## Measured (2026-10-08, real Hinglish wavs from bhavna `log/`)
| Clip | Audio length | STT time | Match vs bhavna Mac transcript |
|---|---|---|---|
| 20261007-175831.wav | ~70 s | 29.4 s | Near word for word (one word differs: pyaaj/byaaj) |
| 20261007-180047.wav | ~75 s | 34.2 s | Full transcript; the Mac log txt held only the last word |

Rule of thumb: about 0.45x real time on this CPU. A 10 s voice note takes about 5 s. Fine for a demo. Tier S, confidence 0.8.

## Known limits
- One request at a time is safe. Many parallel voice notes will queue (ThreadingHTTPServer, but CPU bound).
- No VAD filter. Silence-only audio returns empty text; the bot asks to resend (T-05).
