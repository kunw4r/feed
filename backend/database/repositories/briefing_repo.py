import json
import logging
from datetime import date
from typing import Optional

from backend.database.connection import get_connection
from backend.database.repositories.story_repo import get_stories
from backend.models.briefing import Briefing
from backend.models.story import Story

logger = logging.getLogger(__name__)

CREATE_BRIEFINGS_TABLE = """
CREATE TABLE IF NOT EXISTS briefings (
    date TEXT PRIMARY KEY,
    story_ids_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def init_briefings_table() -> None:
    """Create the briefings table if it doesn't exist."""
    with get_connection() as conn:
        conn.execute(CREATE_BRIEFINGS_TABLE)
        conn.commit()


def save_briefing(briefing: Briefing) -> None:
    """Save a briefing's story IDs indexed by date."""
    from datetime import datetime

    init_briefings_table()

    story_ids = [s.id for s in briefing.all_stories]
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO briefings (date, story_ids_json, created_at) VALUES (?, ?, ?)",
            (
                briefing.date.isoformat(),
                json.dumps(story_ids),
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    logger.info(
        "Saved briefing for %s with %d stories",
        briefing.date.isoformat(),
        len(story_ids),
    )


def get_briefing_by_date(target_date: date) -> Optional[Briefing]:
    """Load a briefing for a specific date."""
    init_briefings_table()

    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM briefings WHERE date = ?",
            (target_date.isoformat(),),
        ).fetchone()

    if not row:
        return None

    story_ids: list[str] = json.loads(row["story_ids_json"])
    if not story_ids:
        return None

    # Load all stories for this briefing
    from backend.database.repositories.story_repo import get_story_by_id

    stories: list[Story] = []
    for sid in story_ids:
        story = get_story_by_id(sid)
        if story:
            stories.append(story)

    return Briefing(
        date=target_date,
        local_stories=[s for s in stories if s.tier == "LOCAL"],
        national_stories=[s for s in stories if s.tier == "NATIONAL"],
        global_stories=[s for s in stories if s.tier == "GLOBAL"],
    )


def get_latest_briefing_dates(limit: int = 7) -> list[date]:
    """Get the most recent briefing dates."""
    init_briefings_table()

    with get_connection() as conn:
        rows = conn.execute(
            "SELECT date FROM briefings ORDER BY date DESC LIMIT ?",
            (limit,),
        ).fetchall()

    return [date.fromisoformat(row["date"]) for row in rows]
