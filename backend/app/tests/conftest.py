import os

os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-do-not-use-in-prod-32chars")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://gpt:gpt_secret@localhost:5432/gpt_tracker",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
