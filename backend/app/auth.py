from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request

from . import db

SESSION_COOKIE = "finvn_session"
CSRF_COOKIE = "finvn_csrf"
IDLE_TTL = 12 * 60 * 60
ABSOLUTE_TTL = 7 * 24 * 60 * 60


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    full_name: str
    avatar_url: str | None = None


def verify_google_credential(credential: str) -> dict:
    import os
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is required")
    claims = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid token issuer")
    if claims.get("aud") != client_id or not claims.get("sub"):
        raise ValueError("Invalid token audience or subject")
    if not claims.get("email_verified") or not claims.get("email"):
        raise ValueError("Google email must be verified")
    return claims


def create_session(user_id: str) -> tuple[str, str]:
    token = secrets.token_urlsafe(48)
    csrf = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db.execute_query(
        """INSERT INTO user_sessions (token_hash, user_id, csrf_hash, created_at, last_seen_at, expires_at)
           VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s)""",
        (token_hash, user_id, hashlib.sha256(csrf.encode()).hexdigest(), datetime.now(timezone.utc) + timedelta(seconds=ABSOLUTE_TTL)),
        commit=True,
    )
    return token, csrf


def require_current_user(request: Request) -> AuthenticatedUser:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Đăng nhập để tiếp tục.")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    row = db.execute_query(
        """UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP
           WHERE token_hash = %s AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
             AND last_seen_at > CURRENT_TIMESTAMP - INTERVAL '12 hours'
           RETURNING user_id""",
        (token_hash,), fetch_one=True, commit=True,
    )
    if not row:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn.")
    user = db.get_user_by_id(row["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ.")
    return AuthenticatedUser(user["id"], user.get("email") or "", user.get("full_name") or "", user.get("avatar_url"))


def require_csrf(request: Request) -> None:
    import os
    import hashlib

    # Xác thực qua Authorization Bearer header không bị ảnh hưởng bởi CSRF
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        origin = request.headers.get("origin")
        allowed = {item.strip().rstrip("/") for item in os.getenv("WEB_ORIGIN", "http://localhost:5173").split(",") if item.strip()}
        if (not origin and os.getenv("APP_ENV", "development").lower() == "production") or (origin and origin.rstrip("/") not in allowed):
            raise HTTPException(status_code=403, detail="Origin không hợp lệ.")
        return

    origin = request.headers.get("origin")
    allowed = {item.strip().rstrip("/") for item in os.getenv("WEB_ORIGIN", "http://localhost:5173").split(",") if item.strip()}
    if (not origin and os.getenv("APP_ENV", "development").lower() == "production") or (origin and origin.rstrip("/") not in allowed):
        raise HTTPException(status_code=403, detail="Origin không hợp lệ.")
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get("x-csrf-token")
    session = request.cookies.get(SESSION_COOKIE)
    if not cookie or not header or not session or not secrets.compare_digest(cookie, header):
        raise HTTPException(status_code=403, detail="CSRF token không hợp lệ.")
    row = db.execute_query("SELECT csrf_hash FROM user_sessions WHERE token_hash=%s AND revoked_at IS NULL",
        (hashlib.sha256(session.encode()).hexdigest(),), fetch_one=True)
    if not row or not secrets.compare_digest(row["csrf_hash"], hashlib.sha256(cookie.encode()).hexdigest()):
        raise HTTPException(status_code=403, detail="CSRF token không hợp lệ.")
