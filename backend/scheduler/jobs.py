import asyncio
import logging

from backend.scheduler.pipeline import run_pipeline

logger = logging.getLogger(__name__)


def run_daily_pipeline() -> None:
    """Synchronous wrapper for the pipeline, used by APScheduler."""
    logger.info("Scheduled pipeline job triggered")
    try:
        summary = asyncio.run(run_pipeline())
        logger.info("Scheduled pipeline completed: %s", summary)
    except Exception as e:
        logger.error("Scheduled pipeline failed: %s", e, exc_info=True)
