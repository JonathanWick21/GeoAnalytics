from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
import concurrent.futures
from playwright.sync_api import sync_playwright


MAX_CHARS = 8000 #Para no mandar demasiado texto a gemini
TIMEOUT = 45.0

def _normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url

def _is_safe_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.hostname or "").lower()
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        return False
    if host.startswith("192.168.") or host.startswith("10."):
        return False
    if host.startswith("169.254."):
        return False
    return bool(host)

def _html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    text = " ".join(soup.get_text(separator=" ", strip=True).split())
    if len(text) < 50:
        raise ValueError("La página no devolvió texto útil (muy corta o bloqueada)")
    return text[:MAX_CHARS]
def _fetch_html_httpx(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
    }
    with httpx.Client(
        timeout=TIMEOUT,
        follow_redirects=True,
        headers=headers,
        http2=False,
    ) as client:
        response = client.get(url)
        if response.status_code in (401, 403, 429):
            raise PermissionError(f"httpx blocked HTTP {response.status_code}")
        response.raise_for_status()
        return response.text
def _playwright_job(url: str, timeout_s: float) -> str:
    """Runs in a separate process (safe with uvicorn on Windows)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                locale="es-ES",
            )
            page = context.new_page()
            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=int(timeout_s * 1000),
            )
            page.wait_for_timeout(1500)
            return page.content()
        finally:
            browser.close()
def _fetch_html_playwright(url: str) -> str:
    with concurrent.futures.ProcessPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_playwright_job, url, TIMEOUT)
        return future.result(timeout=TIMEOUT + 30)

def fetch_page_text(url: str) -> str:
    url = _normalize_url(url)
    if not _is_safe_url(url):
        raise ValueError(f"URL no permitida: {url}")
    html = None
    httpx_error = None
    try:
        html = _fetch_html_httpx(url)
    except Exception as exc:
        httpx_error = exc
        print(f"[crawl] httpx failed: {exc!r}; trying Playwright")
        try:
            html = _fetch_html_playwright(url)
        except Exception as pw_exc:
            raise ValueError(
                f"Crawl falló (httpx: {httpx_error!r}; playwright: {pw_exc!r})"
            ) from pw_exc
    return _html_to_text(html)
