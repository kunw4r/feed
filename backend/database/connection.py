import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from typing import Generator

from backend.config.settings import DATABASE_PATH

logger = logging.getLogger(__name__)

CREATE_STORIES_TABLE = """
CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    simplified_title TEXT DEFAULT '',
    simplified_body TEXT DEFAULT '',
    quick_summary TEXT DEFAULT '',
    deep_analysis TEXT,
    description TEXT DEFAULT '',
    tier TEXT NOT NULL,
    category TEXT DEFAULT 'UNCATEGORISED',
    impact_score REAL DEFAULT 0.0,
    sources_json TEXT DEFAULT '[]',
    source_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    related_story_ids_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    published_date TEXT
);
"""

CREATE_INDEX_TIER = """
CREATE INDEX IF NOT EXISTS idx_stories_tier ON stories(tier);
"""

CREATE_INDEX_CREATED = """
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
"""

CREATE_INDEX_PUBLISHED = """
CREATE INDEX IF NOT EXISTS idx_stories_published_date ON stories(published_date);
"""


def init_db() -> None:
    """Create the database and tables if they don't exist."""
    logger.info("Initialising database at %s", DATABASE_PATH)
    with get_connection() as conn:
        conn.execute(CREATE_STORIES_TABLE)
        conn.execute(CREATE_INDEX_TIER)
        conn.execute(CREATE_INDEX_CREATED)
        conn.execute(CREATE_INDEX_PUBLISHED)
        conn.commit()
    logger.info("Database initialised successfully")


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
