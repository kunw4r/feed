import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import briefings, chat, health, stories
from backend.config.settings import ENVIRONMENT, LOG_LEVEL
from backend.database.connection import init_db
from backend.scheduler.jobs import run_daily_pipeline

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="The Daily Briefing",
    description="AI-powered news intelligence platform",
    version="0.1.0",
)

# CORS — allow frontend in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router)
app.include_router(stories.router)
app.include_router(briefings.router)
app.include_router(chat.router)

# APScheduler — runs pipeline daily at 5am AEST (UTC+10 = 19:00 UTC previous day)
scheduler = BackgroundScheduler()
scheduler.add_job(
    run_daily_pipeline,
    "cron",
    hour=19,
    minute=0,
    id="daily_pipeline",
    timezone="UTC",
    replace_existing=True,
)


@app.on_event("startup")
async def startup() -> None:
    logger.info("Starting The Daily Briefing API (%s)", ENVIRONMENT)
    init_db()
    logger.info("Database initialised")
    scheduler.start()
    logger.info("Scheduler started — pipeline runs daily at 5:00 AM AEST")


@app.on_event("shutdown")
async def shutdown() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler shut down")


@app.post("/api/pipeline/trigger")
async def trigger_pipeline() -> dict:
    """Manually trigger the pipeline (dev only)."""
    if ENVIRONMENT not in ("development", "staging"):
        return {"error": "Pipeline trigger only available in development/staging"}

    from backend.scheduler.pipeline import run_pipeline

    summary = await run_pipeline()
    return {"status": "completed", "summary": summary}
