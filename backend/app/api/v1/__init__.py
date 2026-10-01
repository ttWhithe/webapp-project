from app.api.v1 import health
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
