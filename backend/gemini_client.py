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

def _demo_result(brand: str, url: str, page_text: str) -> dict:
    return {
        "brand": brand,
        "url": url,
        "share_of_voice": 0.35,
        "mentions": 12,
        "summary": (
            f"(Demo) Análisis simulado de {brand}. "
            "Activa GEO_DEMO=0 y un Gemini estable para resultado real."
        ),
        "engines": [
            {"name": "chatgpt", "mentioned": True, "score": 0.4},
            {"name": "gemini", "mentioned": True, "score": 0.5},
            {"name": "claude", "mentioned": False, "score": 0.2},
        ],
        "recommendations": [
            "Publicar contenido claro sobre productos/servicios.",
            "Mejorar presencia en fuentes que citan los LLMs.",
        ],
        "grounded": bool(page_text.strip()),
        "demo": True,
    }

def run_geo_audit(brand: str, url: str, page_text: str = "") -> dict:
    """
    Asks Gemini for a simple GEO-style JSON about brand visibility
    """

    if os.getenv("GEO_DEMO", "0").strip() == "1":
        return _demo_result(brand, url, page_text)

    if not GEMINI_API_KEY:
        raise RuntimeError("Falta GEMINI_API_KEY en el .env")

    context = page_text.strip() or "(No se pudo obtener texto de la web)"
    prompt = f"""
    Eres un analista de GEO (Generative Engine Optimization).
    Marca: {brand}
    Web: {url}
    CONTEXTO extraído de la web (puede estar incompleto):
    \"\"\"
    {context}
    \"\"\"
    Usa sobre todo ese contexto. Si es insuficiente, indícalo en summary.
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
      "recommendations": ["consejo 1", "consejo 2"],
      "grounded": true
    }}
    share_of_voice y score entre 0 y 1.
    grounded = true si usaste el contexto de la web de forma clara.
    """

    api_url = f"{GEMINI_API_BASE}/models/{GEMINI_MODEL}:generateContent"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3},
    }

    last_error = None
    data = None
    with httpx.Client(timeout=120.0) as client:
        for attempt in range(3):
            try:
                response = client.post(
                    api_url,
                    params={"key": GEMINI_API_KEY},
                    json=payload,
                )
            except httpx.TimeoutException as exc:
                last_error = exc
                time.sleep(2 * (attempt + 1))
                continue

            if response.status_code == 503:
                last_error = response
                time.sleep(2 * (attempt + 1))
                continue

            response.raise_for_status()
            data = response.json()
            break
        else:
            if isinstance(last_error, httpx.Response):
                last_error.raise_for_status()
            raise last_error if last_error else RuntimeError("Gemini request failed")

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return _parse_json(text)

def _parse_json(text: str) -> dict:
    """Gemini sometimes wraps JSON in ``` fences; strip them."""

    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()

    return json.loads(cleaned)