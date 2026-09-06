"""Shared async HTTP retry: exponential backoff + jitter on 429/5xx and transport errors."""
from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable

import httpx

_RETRY_STATUS = frozenset({429, 500, 502, 503, 504})


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
                resp.raise_for_status()
                return resp
            if attempt == max_retries:
                resp.raise_for_status()
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
