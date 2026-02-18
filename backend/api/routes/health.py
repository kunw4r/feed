from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
async def health_check() -> dict:
    return {"status": "healthy", "service": "the-daily-briefing"}
