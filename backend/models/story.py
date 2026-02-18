from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional

from backend.config.sources import Tier
from backend.models.category import Category
from backend.models.source import Source


@dataclass
class RawStory:
    """A story as collected from an RSS feed or API, before processing."""

    title: str
    description: str
    url: str
    source_name: str
    source_url: str
    tier: Tier
    published_date: Optional[datetime] = None


@dataclass
class Story:
    """A fully processed story ready for storage and display."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    simplified_title: str = ""
    simplified_body: str = ""
    quick_summary: str = ""
    deep_analysis: Optional[str] = None
    description: str = ""
    tier: str = Tier.GLOBAL.value
    category: str = Category.UNCATEGORISED.value
    impact_score: float = 0.0
    sources: list[Source] = field(default_factory=list)
    source_count: int = 0
    confidence: float = 0.0
    related_story_ids: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    published_date: Optional[date] = None
