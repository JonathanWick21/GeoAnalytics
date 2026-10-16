import json
import os
import re
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip().strip('"').strip("'")
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"



def run_geo_audit(brand: str, url: str) -> dict:
    """
    Asks Gemini for a simple GEO-style JSON about brand visibility
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("Falta GEMINI_API_KEY en el .env")

    promt = f"""
    Eres un analista GEO (Generative Engine Optimization).
    Marca: {brand}
    Web: {url}
    
    
    Responde SOLO con un JSON válido (sin markdown) con esta forma:
    {{
      "brand": "{brand}",
      "url": "{url}",
      "share_of_voice": 0.0,
      "mentions": 0,
      "summary": "texto corto en español",
      "engines": [
        {{"name": "chatgpt", "mentioned": true, "score": 0.0}},
        {{"name": "gemini", "mentioned": false, "score": 0.0}},
        {{"name": "claude", "mentioned": false, "score": 0.0}}
      ],
      "recommendations": ["consejo 1", "consejo 2"]
    }}
    Estimaciones razonables según lo que sepas de la marca/sector.
    share_of_voice y score entre 0 y 1.
    """

    api_url = f"{GEMINI_API_BASE}/models/{GEMINI_MODEL}:generateContent"

    payload = {
        "contents": [{"parts": [{"text": promt}]}],
        "generationConfig": {"temperature": 0.3},
    }

    last_error = None
    with httpx.Client(timeout=60.0) as client:
        for attempt in range(3):
            response = client.post(
                api_url,
                params={"key": GEMINI_API_KEY},
                json=payload,
            )
            if response.status_code == 503:
                last_error = response
                time.sleep(2 * (attempt + 1))  # 2s, 4s, 6s
                continue
            response.raise_for_status()
            data = response.json()
            break
        else:
            response = last_error
            response.raise_for_status()

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return _parse_json(text)

def _parse_json(text: str) -> dict:
    """Gemini sometimes wraps JSON in ``` fences; strip them."""

    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()

    return json.loads(cleaned)