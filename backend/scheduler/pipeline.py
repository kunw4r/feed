import logging
import time
from datetime import date, datetime

from backend.agents.categoriser import categorise_stories
from backend.agents.ranker import rank_stories
from backend.agents.simplifier import simplify_stories
from backend.database.connection import init_db
from backend.database.repositories.briefing_repo import save_briefing
from backend.database.repositories.story_repo import save_stories
from backend.ingestion.api_collector import collect_api_stories
from backend.ingestion.deduplicator import deduplicate_stories
from backend.ingestion.rss_collector import collect_rss_stories
from backend.models.briefing import Briefing
from backend.models.story import RawStory

logger = logging.getLogger(__name__)


async def run_pipeline() -> dict:
    """Execute the full news pipeline.

    Pipeline stages:
        1. Collect stories from RSS feeds
        2. Collect stories from news APIs
        3. Deduplicate
        4. Categorise (Claude Haiku)
        5. Rank and select top 15 (Claude Haiku)
        6. Simplify (Claude Sonnet)
        7. Save briefing to database

    Returns a summary dict with counts at each stage.
    """
    start = time.time()
    logger.info("=" * 60)
    logger.info("PIPELINE START")
    logger.info("=" * 60)

    # Initialise database
    init_db()

    # Stage 1: Collect from RSS feeds
    logger.info("Stage 1: Collecting from RSS feeds...")
    rss_stories = await collect_rss_stories()
    logger.info("RSS collection: %d stories", len(rss_stories))

    # Stage 2: Collect from news APIs
    logger.info("Stage 2: Collecting from news APIs...")
    api_stories = await collect_api_stories()
    logger.info("API collection: %d stories", len(api_stories))

    # Combine all raw stories
    all_raw: list[RawStory] = rss_stories + api_stories
    total_collected = len(all_raw)
    logger.info("Total collected: %d stories", total_collected)

    # Stage 3: Deduplicate
    logger.info("Stage 3: Deduplicating...")
    unique_stories = deduplicate_stories(all_raw)
    deduped_count = total_collected - len(unique_stories)

    # Stage 4: Categorise with Claude Haiku
    logger.info("Stage 4: Categorising %d stories...", len(unique_stories))
    categorised_stories, classifications = categorise_stories(unique_stories)

    # Stage 5: Rank and select top 15
    logger.info("Stage 5: Ranking and selecting top stories...")
    ranked = rank_stories(categorised_stories, classifications)
    logger.info("Selected %d stories for today's briefing", len(ranked))

    # Stage 6: Simplify with Claude Sonnet
    logger.info("Stage 6: Simplifying selected stories...")
    simplified = simplify_stories(ranked)

    # Stage 7: Save to database
    logger.info("Stage 7: Saving briefing to database...")
    saved = save_stories(simplified)

    # Build and save briefing
    briefing = Briefing(
        date=date.today(),
        local_stories=[s for s in simplified if s.tier == "LOCAL"],
        national_stories=[s for s in simplified if s.tier == "NATIONAL"],
        global_stories=[s for s in simplified if s.tier == "GLOBAL"],
    )
    save_briefing(briefing)

    elapsed = time.time() - start

    summary = {
        "total_collected": total_collected,
        "rss_count": len(rss_stories),
        "api_count": len(api_stories),
        "duplicates_removed": deduped_count,
        "unique_stories": len(unique_stories),
        "stories_categorised": len(categorised_stories),
        "stories_ranked": len(ranked),
        "stories_simplified": len(simplified),
        "briefing_stories": briefing.story_count,
        "saved_to_db": saved,
        "elapsed_seconds": round(elapsed, 1),
    }

    logger.info("=" * 60)
    logger.info("PIPELINE COMPLETE")
    logger.info(
        "Collected %d → deduplicated %d → briefing %d stories (%.1fs)",
        total_collected,
        len(unique_stories),
        briefing.story_count,
        elapsed,
    )
    logger.info("Summary: %s", summary)
    logger.info("=" * 60)

    return summary
