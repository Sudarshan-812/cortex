"""Shared async HTTP retry: exponential backoff + jitter on 429/5xx and transport errors."""
from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable

import httpx

_RETRY_STATUS = frozenset({429, 500, 502, 503, 504})


class ApiError(RuntimeError):
    """An upstream API call failed. The message is safe to surface to end
    users / persist to the DB - it never includes the request URL, which for
    every Gemini call in this codebase carries the API key as a query param
    (httpx's own raise_for_status() message includes the full URL)."""


def _safe_error_message(resp: httpx.Response) -> str:
    detail = None
    try:
        detail = resp.json().get("error", {}).get("message")
    except Exception:  # noqa: BLE001 - body isn't JSON or doesn't match shape
        pass
    if resp.status_code == 429:
        base = "Rate limit reached on the free-tier API key"
    else:
        base = f"Upstream API error ({resp.status_code})"
    return f"{base}: {detail}" if detail else base


def _raise_for_status_safely(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        raise ApiError(_safe_error_message(resp))


async def request_with_retry(
    send: Callable[[], Awaitable[httpx.Response]],
    *,
    max_retries: int = 5,
    base_delay: float = 0.5,
) -> httpx.Response:
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        resp: httpx.Response | None = None
        try:
            resp = await send()
        except (httpx.TransportError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt == max_retries:
                raise
        if resp is not None:
            if resp.status_code not in _RETRY_STATUS:
                _raise_for_status_safely(resp)
                return resp
            if attempt == max_retries:
                _raise_for_status_safely(resp)
        backoff = base_delay * (2**attempt) + random.uniform(0, base_delay)
        await asyncio.sleep(max(backoff, _retry_after(resp)))
    assert last_exc is not None  # unreachable
    raise last_exc


def _retry_after(resp: httpx.Response | None) -> float:
    if resp is None:
        return 0.0
    try:
        return float(resp.headers.get("Retry-After", 0))
    except (TypeError, ValueError):
        return 0.0
