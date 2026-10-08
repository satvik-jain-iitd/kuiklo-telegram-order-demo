"""Voice replies in the cloned founder voice (Sarvam) sent as Telegram voice notes.

voice_send(chat_id, text, caption, keyboard) -> {"ok", "cached", "chars", "reason"}

- Sarvam POST /voices/clone with voice_id (svc-...), mp3 out. Billed per character, so:
  * audio is cached on disk by text hash (the greeting costs credits once, then never again)
  * VOICE_MAX_CHARS per message, VOICE_DAILY_CAP messages per day (counter file)
- Telegram sendVoice accepts mp3 and shows a voice bubble. Caption carries the text and the
  AI-generated label. Inline keyboard (n8n rows shape) is converted to Telegram's shape.
- Secrets come from ~/bhavna-stt/.env (0600): SARVAM_API_KEY, SARVAM_VOICE_ID, TELEGRAM_BOT_TOKEN.
"""
import datetime
import hashlib
import json
import os

import requests

HOME = os.path.expanduser("~/bhavna-stt")
CACHE = os.path.join(HOME, "voice_cache")
COUNTER = os.path.join(HOME, "voice_counter.json")
VOICE_MAX_CHARS = int(os.environ.get("VOICE_MAX_CHARS", "200"))
VOICE_DAILY_CAP = int(os.environ.get("VOICE_DAILY_CAP", "100"))
AI_LABEL = "🎙️ AI-generated voice (Shyam Gupta ki awaaz)."


def _env():
    env = {}
    try:
        for line in open(os.path.join(HOME, ".env")):
            if "=" in line and not line.startswith("#"):
                k, v = line.rstrip("\n").split("=", 1)
                env[k] = v
    except FileNotFoundError:
        pass
    return env


def _count_today(add=0):
    today = datetime.date.today().isoformat()
    try:
        c = json.load(open(COUNTER))
    except Exception:
        c = {}
    n = c.get(today, 0) + add
    if add:
        json.dump({today: n}, open(COUNTER, "w"))
    return n


def _tts(text, env):
    """Returns mp3 bytes. Cached by text hash so repeated lines cost nothing."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, hashlib.sha1(text.encode()).hexdigest() + ".mp3")
    if os.path.exists(path):
        return open(path, "rb").read(), True
    r = requests.post("https://api.sarvam.ai/voices/clone", headers={"api-subscription-key": env["SARVAM_API_KEY"]},
                      files={"voice_id": (None, env["SARVAM_VOICE_ID"]), "text": (None, text), "language_code": (None, "hi-IN"),
                             "output_audio_codec": (None, "mp3")}, timeout=60)
    r.raise_for_status()
    import base64
    audio = base64.b64decode(r.json()["audio_b64"])
    open(path, "wb").write(audio)
    return audio, False


def _keyboard(kb):
    """n8n rows shape -> Telegram inline_keyboard."""
    rows = (kb or {}).get("rows") or []
    out = []
    for r in rows:
        btns = ((r.get("row") or {}).get("buttons")) or []
        out.append([{"text": b.get("text", ""), "callback_data": (b.get("additionalFields") or {}).get("callback_data", "x")} for b in btns])
    return {"inline_keyboard": out} if out else None


def voice_send(chat_id, text, caption=None, keyboard=None):
    text = (text or "").strip()
    if not text:
        return {"ok": False, "reason": "empty text"}
    if len(text) > VOICE_MAX_CHARS:
        return {"ok": False, "reason": f"text over {VOICE_MAX_CHARS} chars"}
    env = _env()
    for k in ("SARVAM_API_KEY", "SARVAM_VOICE_ID", "TELEGRAM_BOT_TOKEN"):
        if not env.get(k):
            return {"ok": False, "reason": f"missing {k} in .env"}
    if _count_today() >= VOICE_DAILY_CAP:
        return {"ok": False, "reason": "daily cap reached"}
    audio, cached = _tts(text, env)
    if not cached:
        _count_today(1)
    cap = f"{AI_LABEL}\n{caption or text}"[:1024]
    data = {"chat_id": str(chat_id), "caption": cap, "parse_mode": "HTML"}
    kb = _keyboard(keyboard)
    if kb:
        data["reply_markup"] = json.dumps(kb)
    r = requests.post(f"https://api.telegram.org/bot{env['TELEGRAM_BOT_TOKEN']}/sendVoice", data=data,
                      files={"voice": ("reply.mp3", audio, "audio/mpeg")}, timeout=30)
    ok = r.ok and r.json().get("ok")
    return {"ok": bool(ok), "cached": cached, "chars": len(text), "reason": None if ok else r.text[:200]}


if __name__ == "__main__":  # self-check without network: keyboard conversion and caps
    assert _keyboard({"rows": [{"row": {"buttons": [{"text": "A", "additionalFields": {"callback_data": "a"}}]}}]}) == {"inline_keyboard": [[{"text": "A", "callback_data": "a"}]]}
    assert _keyboard(None) is None
    assert voice_send("1", "x" * (VOICE_MAX_CHARS + 1))["reason"].startswith("text over")
    print("voice self-check ok")
