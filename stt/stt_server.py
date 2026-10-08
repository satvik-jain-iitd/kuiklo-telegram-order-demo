#!/usr/bin/env python3
"""Bhavna.ai STT as an HTTP service for n8n.

Runs the Apex Hinglish whisper model (bhavna.ai models/apex-ct2-int8) on CPU with
faster-whisper. Same decode settings as bhavna macos/dictate.py: language en,
temperature 0, no timestamps.

POST /transcribe  body = raw audio bytes (OGG Opus from Telegram, WAV, MP3 ...)
                  -> {"text": "...", "seconds": 3.2}
GET  /health      -> {"ok": true}

Listens on 127.0.0.1:8787 only. n8n on the same box calls it.
"""
import io
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from faster_whisper import WhisperModel

MODEL_DIR = os.environ.get("BHAVNA_MODEL", os.path.expanduser("~/bhavna-stt/models/apex-ct2-int8"))
PORT = int(os.environ.get("BHAVNA_PORT", "8787"))
MAX_BYTES = 20 * 1024 * 1024  # Telegram voice notes are small; refuse anything bigger

print(f"loading {MODEL_DIR}", flush=True)
model = WhisperModel(MODEL_DIR, device="cpu", compute_type="int8", cpu_threads=4)
import numpy as np
list(model.transcribe(np.zeros(16000, np.float32), language="en")[0])  # warm up
print("ready", flush=True)


def transcribe(data: bytes) -> str:
    segments, _ = model.transcribe(
        io.BytesIO(data), language="en", task="transcribe", beam_size=1,
        temperature=0.0, without_timestamps=True, vad_filter=False,
    )
    return " ".join(s.text.strip() for s in segments if s.text.strip())


class H(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._json(200 if self.path == "/health" else 404, {"ok": self.path == "/health"})

    def do_POST(self):
        if self.path != "/transcribe":
            return self._json(404, {"error": "not found"})
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0 or n > MAX_BYTES:
            return self._json(400, {"error": f"bad length {n}"})
        data = self.rfile.read(n)
        t0 = time.time()
        try:
            text = transcribe(data)
        except Exception as e:  # bad audio -> 422, never crash the server
            return self._json(422, {"error": str(e)[:200]})
        self._json(200, {"text": text, "seconds": round(time.time() - t0, 2)})

    def log_message(self, fmt, *args):  # one line per request, no audio content
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
