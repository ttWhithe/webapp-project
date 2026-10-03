"""Async HTTP client for genshin-db-api.

Docs: https://github.com/genshindev/api

Notes:
- The list endpoints ("?query=names&matchCategories=true") return a JSON array
  of display names (e.g. "Hu Tao").
- The detail endpoints ("?query=Hu%20Tao") return a single JSON object.
- Requests are throttled by a semaphore (see settings.genshin_db_api_concurrency)
  and retried with exponential backoff on transient failures.
"""

import asyncio
from types import TracebackType
from typing import Self

import httpx

from app.core.config import settings
from app.core.logging import log
from app.schemas.external.genshin_db import (
    ExternalArtifactSet,
    ExternalCharacter,
    ExternalWeapon,
)

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 3


class GenshinDbClientError(Exception):
    """Raised when the external API cannot be reached after retries."""


class GenshinDbClient:
    """Thin wrapper over the genshin-db-api v5 REST endpoints."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout: int | None = None,
        concurrency: int | None = None,
    ) -> None:
        self._base_url = (base_url or settings.genshin_db_api_base).rstrip("/")
        self._timeout = timeout or settings.genshin_db_api_timeout
        self._sem = asyncio.Semaphore(concurrency or settings.genshin_db_api_concurrency)
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> Self:
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
            headers={"Accept": "application/json"},
        )
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    # ---------- list endpoints ----------

    async def list_characters(self) -> list[str]:
        return await self._get_names("characters")

    async def list_weapons(self) -> list[str]:
        return await self._get_names("weapons")

    async def list_artifacts(self) -> list[str]:
        return await self._get_names("artifacts")

    # ---------- detail endpoints ----------

    async def get_character(self, name: str) -> ExternalCharacter | None:
        raw = await self._get_detail("characters", name)
        if raw is None:
            return None
        return ExternalCharacter.model_validate(raw)

    async def get_weapon(self, name: str) -> ExternalWeapon | None:
        raw = await self._get_detail("weapons", name)
        if raw is None:
            return None
        return ExternalWeapon.model_validate(raw)

    async def get_artifact(self, name: str) -> ExternalArtifactSet | None:
        raw = await self._get_detail("artifacts", name)
        if raw is None:
            return None
        return ExternalArtifactSet.model_validate(raw)

    # ---------- internals ----------

    def _require_client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("GenshinDbClient must be used as an async context manager")
        return self._client

    async def _get_names(self, resource: str) -> list[str]:
        client = self._require_client()
        payload = await self._request_with_retry(
            client,
            resource,
            params={"query": "names", "matchCategories": "true"},
        )
        if not isinstance(payload, list):
            raise GenshinDbClientError(
                f"Expected a list of names from /{resource}, got {type(payload).__name__}"
            )
        return [str(name) for name in payload]

    async def _get_detail(self, resource: str, name: str) -> dict[str, object] | None:
        client = self._require_client()
        payload = await self._request_with_retry(
            client,
            resource,
            params={"query": name},
        )
        if payload is None or payload == "":
            return None
        if not isinstance(payload, dict):
            raise GenshinDbClientError(
                f"Expected an object from /{resource}?query={name}, got {type(payload).__name__}"
            )
        return payload

    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        resource: str,
        params: dict[str, str],
    ) -> object:
        url = f"/{resource}"
        last_exc: Exception | None = None

        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                async with self._sem:
                    response = await client.get(url, params=params)
            except httpx.HTTPError as exc:
                last_exc = exc
                log.warning(
                    "genshin_db_request_failed",
                    resource=resource,
                    attempt=attempt,
                    error=str(exc),
                )
                await self._backoff(attempt)
                continue

            if response.status_code in _RETRYABLE_STATUS:
                last_exc = GenshinDbClientError(f"HTTP {response.status_code} from {url}")
                log.warning(
                    "genshin_db_retryable_status",
                    resource=resource,
                    status=response.status_code,
                    attempt=attempt,
                )
                await self._backoff(attempt)
                continue

            if response.status_code == 404:
                return None

            response.raise_for_status()

            # The API returns an empty body in some edge cases (e.g. unknown query
            # shape) — treat it as "not found".
            if not response.text.strip():
                return None

            return response.json()

        raise GenshinDbClientError(
            f"Failed to fetch {url} after {_MAX_ATTEMPTS} attempts"
        ) from last_exc

    @staticmethod
    async def _backoff(attempt: int) -> None:
        await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
