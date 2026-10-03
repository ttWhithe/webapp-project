from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App
    app_name: str = "Genshin Progress Tracker"
    app_env: str = "development"
    app_debug: bool = True
    app_secret_key: str = Field(..., min_length=16)

    # DB
    database_url: str
    test_database_url: str | None = None

    # Redis
    redis_url: str

    # JWT
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # External catalog API
    genshin_db_api_base: str = "https://genshin-db-api.vercel.app/api/v5"
    genshin_db_api_timeout: int = 30
    genshin_db_api_concurrency: int = 5
    catalog_cache_ttl: int = 86400

    # CORS
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
