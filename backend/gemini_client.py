import json
import os
import re
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip().strip('"').strip("'")
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
            {"name": "gemini", "mentioned": True, "score": 0.5},
        ],
        "recommendations": [
            "Publicar contenido claro sobre productos/servicios.",
            "Mejorar presencia en fuentes que citan los LLMs.",
        ],
        "grounded": bool(page_text.strip()),
        "demo": True,
        "method": "demo",
    }


def _parse_json(text: str):
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    return json.loads(cleaned)


def _generate_text(prompt: str) -> str:
    """Una llamada a Gemini; solo devuelve el texto."""
    if not GEMINI_API_KEY:
        raise RuntimeError("Falta GEMINI_API_KEY en el .env")

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

    return data["candidates"][0]["content"]["parts"][0]["text"]


def brand_mentioned(brand: str, text: str) -> bool:
    if not text:
        return False
    t = text.lower()
    b = brand.lower().strip()
    if b and b in t:
        return True
    compact = b.replace(" ", "")
    if compact and compact in t.replace(" ", ""):
        return True
    return False


def _ask_assistant(user_question: str, page_text: str = "") -> str:
    full = (
        "Eres un asistente útil. Responde en español, de forma natural, "
        "como si un usuario te preguntara en el chat. "
        "No digas que eres un auditor GEO.\n"
        "IMPORTANTE: No hagas preguntas de aclaración ni pidas más detalles. "
        "Interpreta la pregunta con el contexto que da y responde ya con "
        "recomendaciones concretas (marcas, tiendas o sitios con nombre).\n\n"
        f"Pregunta del usuario:\n{user_question}"
    )

    return _generate_text(full)

def _infer_category(brand: str, url: str, page_text: str = "") -> str:
    context = (page_text or "")[:2000]
    if context.strip():
        prompt = f"""
Lee este texto de una web de la marca "{brand}" ({url}) y resume en una frase corta
(máx. 12 palabras) la categoría/sector concreto en español.
Ejemplos: "tienda online de componentes de PC en España,
"software de contabilidad para pymes".
Sin el nombre de la marca. Solo la frase, sin comillas ni JSON.

Texto:
\"\"\"
{context}
\"\"\"
"""
        try:
            phrase = _generate_text(prompt).strip().strip('"').strip("'")
            phrase = re.sub(r"\s+", " ", phrase)
            if 8 <= len(phrase) <= 120 and brand.lower() not in phrase.lower():
                return phrase
        except Exception:
            pass

    return f"negocio online relacionado con {url}"

def _fallback_prompts(category: str) -> list[str]:
    c = category.strip() or "productos o servicios online"
    return [
        f"¿Dónde comprar {c} con buena reputación?",
        f"¿Qué tiendas o marcas recomiendas para {c}?",
        f"Alternativas fiables a los grandes marketplaces para {c}",
        f"¿Cuáles son las mejores opciones online de {c}?",
        f"Si hoy tuviera que elegir proveedor de {c}, ¿qué mirarías primero y por qué?"
    ]


def build_geo_prompts(brand: str, url: str, page_text: str = "") -> list[str]:
    context = (page_text or "")[:2500]
    category = _infer_category(brand, url, page_text)

    prompt = f"""
Eres experto en GEO. La marca es "{brand}" (web: {url}).
Categoría/sector concreto: {category}

Contexto de la web (puede estar incompleto):
\"\"\"
{context or "Sin contexto"}
\"\"\"

Genera exactamente 5 preguntas que haría un usuario real a un asistente de IA
(ChatGPT, Gemini, etc.) sobre esa categoría.
Reglas:
- En español
- NO incluyas el nombre de la marca ni su URL
- Cada pregunta debe nombrar el producto/sector de forma concreta
- Prohibido: "este sector", "este mercado", "este tipo de productos"
- Naturales, como las haría un comprador real
- Deben permitir ver si la marca aparece sola en la respuesta

Devuelve SOLO un JSON array de 5 strings.
Ejemplo: ["pregunta 1", "pregunta 2", "pregunta 3", "pregunta 4", "pregunta 5"]
"""
    for _ in range(2):
        try:
            raw = _generate_text(prompt)
            data = _parse_json(raw)
            if isinstance(data, list):
                prompts = [str(x).strip() for x in data if str(x).strip()]
                prompts = [
                    q for q in prompts
                    if brand.lower() not in q.lower()
                    and "este sector" not in q.lower()
                    and "este mercado" not in q.lower()
                ]
                if len(prompts) >= 3:
                    return prompts[:5]
        except Exception:
            continue

    return _fallback_prompts(category)


def _recommend(brand: str, url: str, metrics: dict, page_text: str) -> list[str]:
    prompt = f"""
Eres consultor GEO. La marca {brand} ({url}) se midió así en Gemini:
- Prompts: {metrics["prompts"]}
- Menciones: {metrics["mentions"]}
- Tasa: {metrics["mention_rate"]}
Detalle: {json.dumps(metrics["details"], ensure_ascii=False)[:3000]}

Contexto web (recorte): {(page_text or "")[:1500]}

Devuelve SOLO un JSON array de 3 a 5 strings con recomendaciones en español.
Ejemplo: ["consejo 1", "consejo 2"]
"""
    raw = _generate_text(prompt)
    try:
        data = _parse_json(raw)
        if isinstance(data, list):
            return [str(x) for x in data][:5]
        if isinstance(data, dict) and "recommendations" in data:
            return [str(x) for x in data["recommendations"]][:5]
    except Exception:
        pass
    return ["Ampliar contenido útil que los asistentes puedan citar sobre la marca."]


def run_geo_audit(brand: str, url: str, page_text: str = "") -> dict:
    if os.getenv("GEO_DEMO", "0").strip() == "1":
        return _demo_result(brand, url, page_text)

    if not GEMINI_API_KEY:
        raise RuntimeError("Falta GEMINI_API_KEY en el .env")

    prompts = build_geo_prompts(brand, url, page_text)
    per_prompt = []

    for q in prompts:
        answer = _ask_assistant(q)
        mentioned = brand_mentioned(brand, answer)
        per_prompt.append(
            {
                "prompt": q,
                "mentioned": mentioned,
                "answer_excerpt": answer[:400],
            }
        )

    total = len(per_prompt)
    hits = sum(1 for p in per_prompt if p["mentioned"])
    mention_rate = hits / total if total else 0.0

    metrics_summary = {
        "prompts": total,
        "mentions": hits,
        "mention_rate": round(mention_rate, 2),
        "details": per_prompt,
    }

    recommendations = _recommend(brand, url, metrics_summary, page_text)

    return {
        "brand": brand,
        "url": url,
        "share_of_voice": round(mention_rate, 2),
        "mentions": hits,
        "summary": (
            f"En {hits} de {total} prompts, Gemini mencionó «{brand}» "
            f"(tasa {mention_rate:.0%}). Métricas por detección en texto."
        ),
        "engines": [
            {
                "name": "gemini",
                "mentioned": hits > 0,
                "score": round(mention_rate, 2),
            }
        ],
        "recommendations": recommendations,
        "grounded": bool((page_text or "").strip()),
        "method": "multi_prompt_mention_check",
        "prompt_results": per_prompt,
    }