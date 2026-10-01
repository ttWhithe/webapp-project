"""Helpers for setting and clearing authentication cookies.

Security choices:
- httpOnly: cookies are not accessible to JavaScript, mitigating XSS token theft.
- secure: only sent over HTTPS. Enabled in production.
- samesite=lax: cookie is not sent on cross-site POST/PUT/DELETE, which protects
  state-changing endpoints from CSRF without needing a separate CSRF token.
- The refresh cookie is scoped to /api/v1/auth so it is not sent on every request.
"""

from fastapi import Response

from app.core.config import settings

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _access_max_age() -> int:
    return settings.access_token_expire_minutes * 60


def _refresh_max_age() -> int:
    return settings.refresh_token_expire_days * 24 * 60 * 60


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
) -> None:
    """Attach access + refresh cookies to the response."""
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=_access_max_age(),
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=_refresh_max_age(),
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    """Delete both auth cookies."""
    response.delete_cookie(key=ACCESS_COOKIE, path="/")
    response.delete_cookie(key=REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)
