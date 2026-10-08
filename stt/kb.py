"""Kuiklo FAQ chatbot: MiniLM retrieval + local Ollama answer.

kb_load(path)        -> reads docs/kb/kuiklo_kb.md into chunks, embeds with all-MiniLM-L6-v2
kb_answer(question)  -> {"answer", "sources", "score", "model"}

Retrieval: cosine top-k over MiniLM embeddings. Generation: Ollama (gemma3:4b by default)
with the top chunks as context, Hinglish reply. If Ollama fails, the best chunk's answer is
returned as is, so the bot never goes silent.
"""
import json
import os
import re
import urllib.request

import numpy as np
from sentence_transformers import SentenceTransformer

EMBED_MODEL = os.environ.get("KB_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL = os.environ.get("KB_LLM_MODEL", "gemma3:4b")  # owner choice 2026-10-08: quality over speed (24-45 s/answer on 4 CPU)
TOP_K = 3
MIN_SCORE = 0.30  # below this the question is probably not about Kuiklo

_model = None
_chunks = []   # [{"q","a","tags"}]
_emb = None    # (n, 384) unit vectors


def kb_load(path):
    global _model, _chunks, _emb
    text = open(path, encoding="utf8").read().split("## Notes for the maintainer")[0]
    _chunks = []
    for block in re.split(r"\n## Q: ", text)[1:]:
        q, _, rest = block.partition("\n")
        a = re.search(r"A: (.*?)(?:\nTags:|\Z)", rest, re.S)
        tags = re.search(r"Tags: (.*)", rest)
        _chunks.append({"q": q.strip(), "a": (a.group(1).strip() if a else rest.strip()), "tags": (tags.group(1).strip() if tags else "")})
    _model = SentenceTransformer(EMBED_MODEL, device="cpu")
    _emb = _model.encode([f"{c['q']} {c['tags']} {c['a']}" for c in _chunks], normalize_embeddings=True)
    return len(_chunks)


def kb_search(question, k=TOP_K):
    v = _model.encode([question], normalize_embeddings=True)[0]
    scores = _emb @ v
    idx = np.argsort(-scores)[:k]
    return [(float(scores[i]), _chunks[i]) for i in idx]


def _ollama(prompt):
    body = json.dumps({"model": LLM_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1, "num_predict": 220}}).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/generate", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r).get("response", "").strip()


def kb_answer(question):
    hits = kb_search(question)
    best_score, best = hits[0]
    if best_score < MIN_SCORE:
        return {"answer": "Yeh sawal Kuiklo ke baare mein nahi lag raha. Order, delivery, payment ya refund ke baare mein poochhiye, ya support@kuiklo.com par likhiye.",
                "sources": [], "score": best_score, "model": None}
    context = "\n\n".join(f"Q: {c['q']}\nA: {c['a']}" for _, c in hits)
    prompt = (
        "You are Kuiklo's customer support assistant (grocery delivery, Patna). Answer ONLY from the facts below. "
        "If the facts do not cover it, say you do not know and point to support@kuiklo.com. "
        "Reply in short Hinglish (Roman script), 2 to 4 sentences, friendly, no markdown.\n\n"
        f"FACTS:\n{context}\n\nCUSTOMER: {question}\nANSWER:"
    )
    try:
        ans = _ollama(prompt)
        model = LLM_MODEL
        if not ans:
            raise ValueError("empty")
    except Exception:  # ollama down or slow -> best chunk verbatim
        ans, model = best["a"], None
    return {"answer": ans, "sources": [c["q"] for _, c in hits], "score": best_score, "model": model}


if __name__ == "__main__":  # self-check: python3 kb.py ../docs/kb/kuiklo_kb.md
    import sys
    n = kb_load(sys.argv[1] if len(sys.argv) > 1 else "kuiklo_kb.md")
    assert n >= 25, n
    s, c = kb_search("delivery charge kitna hai?")[0]
    assert "delivery charges" in c["q"].lower(), c["q"]
    s2, c2 = kb_search("order cancel kaise karun")[0]
    assert "cancel" in c2["q"].lower(), c2["q"]
    s3, _ = kb_search("what is the capital of France")[0]
    assert s3 < MIN_SCORE + 0.15, s3
    print("kb self-check ok", n, "chunks", round(s, 2), round(s2, 2), round(s3, 2))
