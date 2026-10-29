"""
supabase_client.py
------------------
Small helpers for talking to Supabase over HTTP, always AS THE SIGNED-IN USER.

Every call sends two headers:
  apikey:        the project's publishable key (identifies the project)
  Authorization: Bearer <the user's access token>

Because the user's own token is used, Postgres row-level security and the
Storage bucket policies decide what each request may touch. The backend never
holds a key that can bypass those rules, so one user can never read another
user's documents, passages, chats or files — even if this code had a bug.
"""

from __future__ import annotations

import json
from urllib.parse import quote

import httpx

from app.core.config import get_settings

_client: httpx.Client | None = None


class SupabaseError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _http() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=httpx.Timeout(60.0, connect=10.0))
    return _client


def _base() -> str:
    return get_settings().supabase_url.rstrip("/")


def _headers(token: str, extra: dict | None = None) -> dict:
    h = {
        "apikey": get_settings().supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }
    if extra:
        h.update(extra)
    return h


def _check(resp: httpx.Response) -> httpx.Response:
    if resp.status_code >= 400:
        try:
            body = resp.json()
            msg = body.get("message") or body.get("msg") or body.get("error") or resp.text
        except ValueError:
            msg = resp.text
        raise SupabaseError(resp.status_code, str(msg))
    return resp


# ---------- Auth ----------

def get_user(token: str) -> dict:
    """Ask Supabase Auth who this token belongs to. Raises if it's invalid or expired."""
    resp = _http().get(f"{_base()}/auth/v1/user", headers=_headers(token))
    return _check(resp).json()


# ---------- Postgres (PostgREST) ----------

def select(token: str, table: str, params: dict) -> list[dict]:
    resp = _http().get(f"{_base()}/rest/v1/{table}", headers=_headers(token), params=params)
    return _check(resp).json()


def insert(token: str, table: str, rows, returning: bool = True):
    headers = _headers(
        token,
        {
            "Content-Type": "application/json",
            "Prefer": "return=representation" if returning else "return=minimal",
        },
    )
    resp = _http().post(f"{_base()}/rest/v1/{table}", headers=headers, content=json.dumps(rows))
    _check(resp)
    return resp.json() if returning else None


def update(token: str, table: str, params: dict, values: dict) -> list[dict]:
    headers = _headers(
        token, {"Content-Type": "application/json", "Prefer": "return=representation"}
    )
    resp = _http().patch(
        f"{_base()}/rest/v1/{table}", headers=headers, params=params, content=json.dumps(values)
    )
    return _check(resp).json()


def delete(token: str, table: str, params: dict) -> list[dict]:
    headers = _headers(token, {"Prefer": "return=representation"})
    resp = _http().delete(f"{_base()}/rest/v1/{table}", headers=headers, params=params)
    return _check(resp).json()


def rpc(token: str, fn: str, args: dict):
    headers = _headers(token, {"Content-Type": "application/json"})
    resp = _http().post(f"{_base()}/rest/v1/rpc/{fn}", headers=headers, content=json.dumps(args))
    return _check(resp).json()


# ---------- Storage ----------

def _object_path(path: str) -> str:
    return "/".join(quote(p, safe="") for p in path.split("/"))


def upload_object(token: str, path: str, data: bytes, content_type: str) -> None:
    bucket = get_settings().storage_bucket
    resp = _http().post(
        f"{_base()}/storage/v1/object/{bucket}/{_object_path(path)}",
        headers=_headers(token, {"Content-Type": content_type, "x-upsert": "false"}),
        content=data,
    )
    _check(resp)


def remove_object(token: str, path: str) -> None:
    bucket = get_settings().storage_bucket
    resp = _http().delete(
        f"{_base()}/storage/v1/object/{bucket}/{_object_path(path)}", headers=_headers(token)
    )
    if resp.status_code not in (200, 204, 404):
        _check(resp)


def signed_url(token: str, path: str, expires_in: int = 3600) -> str:
    """A temporary link to a private file (the PDF viewer can't send auth headers)."""
    bucket = get_settings().storage_bucket
    resp = _http().post(
        f"{_base()}/storage/v1/object/sign/{bucket}/{_object_path(path)}",
        headers=_headers(token, {"Content-Type": "application/json"}),
        content=json.dumps({"expiresIn": expires_in}),
    )
    signed = _check(resp).json().get("signedURL") or _check(resp).json().get("signedUrl")
    if not signed:
        raise SupabaseError(500, "Storage did not return a signed URL.")
    return f"{_base()}/storage/v1{signed}" if signed.startswith("/") else signed
