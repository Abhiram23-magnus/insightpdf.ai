"""
auth.py
-------
FastAPI dependency that turns the request's `Authorization: Bearer <token>`
header into a signed-in user, or rejects the request with 401.

The token is checked by Supabase Auth itself (not decoded locally), so revoked
or expired sessions are always refused. Results are cached for a minute so a
burst of requests doesn't re-check the same token every time.
"""

from __future__ import annotations

import hashlib
import threading
import time
from dataclasses import dataclass

from fastapi import Header, HTTPException

from app.services import supabase_client

_CACHE_SECONDS = 60
_cache: dict[str, tuple[float, "CurrentUser"]] = {}
_lock = threading.Lock()


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str
    token: str


def _verify(token: str) -> CurrentUser:
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.monotonic()
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]

    try:
        data = supabase_client.get_user(token)
    except supabase_client.SupabaseError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    except Exception:  # noqa: BLE001  (network trouble reaching Supabase)
        raise HTTPException(status_code=503, detail="Couldn't reach the sign-in service. Try again.")

    user = CurrentUser(id=data["id"], email=data.get("email") or "", token=token)
    with _lock:
        if len(_cache) > 1000:
            _cache.clear()
        _cache[key] = (now + _CACHE_SECONDS, user)
    return user


def current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return _verify(token)
