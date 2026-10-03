"""Schemas for admin endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class SyncStatsSchema(BaseModel):
    """Result of POST /admin/catalog/sync."""

    model_config = ConfigDict(from_attributes=True)

    added: int = Field(ge=0)
    updated: int = Field(ge=0)
    failed: int = Field(ge=0)
    errors: list[str] = Field(default_factory=list)
