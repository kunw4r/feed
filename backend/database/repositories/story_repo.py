import json
import logging
from datetime import date, datetime
from typing import Optional

from backend.database.connection import get_connection
from backend.models.source import Source
from backend.models.story import Story

logger = logging.getLogger(__name__)


def _row_to_story(row: dict) -> Story:
    """Convert a database row to a Story object."""
    sources_data = json.loads(row["sources_json"]) if row["sources_json"] else []
    sources = [Source(name=s["name"], url=s["url"]) for s in sources_data]
    related_ids = json.loads(row["related_story_ids_json"]) if row["related_story_ids_json"] else []

    published = None
    if row["published_date"]:
        try:
            published = date.fromisoformat(row["published_date"])
        except (ValueError, TypeError):
            pass

    return Story(
        id=row["id"],
        title=row["title"],
        simplified_title=row["simplified_title"] or "",
        simplified_body=row["simplified_body"] or "",
        quick_summary=row["quick_summary"] or "",
        deep_analysis=row["deep_analysis"],
        description=row["description"] or "",
        tier=row["tier"],
        category=row["category"] or "UNCATEGORISED",
        impact_score=row["impact_score"] or 0.0,
        sources=sources,
        source_count=row["source_count"] or 0,
        confidence=row["confidence"] or 0.0,
        related_story_ids=related_ids,
        created_at=datetime.fromisoformat(row["created_at"]),
        published_date=published,
    )


def save_story(story: Story) -> None:
    """Insert or replace a story in the database."""
    sources_json = json.dumps([{"name": s.name, "url": s.url} for s in story.sources])
    related_json = json.dumps(story.related_story_ids)

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO stories
            (id, title, simplified_title, simplified_body, quick_summary, deep_analysis,
             description, tier, category, impact_score, sources_json, source_count,
             confidence, related_story_ids_json, created_at, published_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                story.id,
                story.title,
                story.simplified_title,
                story.simplified_body,
                story.quick_summary,
                story.deep_analysis,
                story.description,
                story.tier,
                story.category,
                story.impact_score,
                sources_json,
                story.source_count,
                story.confidence,
                related_json,
                story.created_at.isoformat(),
                story.published_date.isoformat() if story.published_date else None,
            ),
        )
        conn.commit()


def save_stories(stories: list[Story]) -> int:
    """Bulk-save stories. Returns the count saved."""
    for story in stories:
        save_story(story)
    logger.info("Saved %d stories to database", len(stories))
    return len(stories)


def get_stories(
    limit: int = 50,
    offset: int = 0,
    tier: Optional[str] = None,
    published_date: Optional[date] = None,
) -> list[Story]:
    """Retrieve stories with optional filtering and pagination."""
    query = "SELECT * FROM stories WHERE 1=1"
    params: list = []

    if tier:
        query += " AND tier = ?"
        params.append(tier)

    if published_date:
        query += " AND published_date = ?"
        params.append(published_date.isoformat())

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [_row_to_story(dict(row)) for row in rows]


def get_story_by_id(story_id: str) -> Optional[Story]:
    """Get a single story by ID."""
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM stories WHERE id = ?", (story_id,)).fetchone()
        if row:
            return _row_to_story(dict(row))
        return None


def get_story_count(tier: Optional[str] = None) -> int:
    """Get total story count, optionally filtered by tier."""
    query = "SELECT COUNT(*) as cnt FROM stories"
    params: list = []
    if tier:
        query += " WHERE tier = ?"
        params.append(tier)

    with get_connection() as conn:
        row = conn.execute(query, params).fetchone()
        return row["cnt"] if row else 0
