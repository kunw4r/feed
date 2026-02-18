from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class SourceSchema(BaseModel):
    name: str
    url: str


class StorySchema(BaseModel):
    id: str
    title: str
    simplified_title: str
    simplified_body: str
    quick_summary: str
    deep_analysis: Optional[str] = None
    description: str
    tier: str
    category: str
    impact_score: float
    sources: list[SourceSchema]
    source_count: int
    confidence: float
    created_at: datetime
    published_date: Optional[date] = None


class StoriesResponse(BaseModel):
    stories: list[StorySchema]
    total: int
    limit: int
    offset: int
