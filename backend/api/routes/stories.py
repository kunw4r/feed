from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.api.schemas.story_schema import SourceSchema, StoriesResponse, StorySchema
from backend.database.repositories.story_repo import get_stories, get_story_by_id, get_story_count
from backend.models.story import Story

router = APIRouter()


def _story_to_schema(story: Story) -> StorySchema:
    return StorySchema(
        id=story.id,
        title=story.title,
        simplified_title=story.simplified_title,
        simplified_body=story.simplified_body,
        quick_summary=story.quick_summary,
        deep_analysis=story.deep_analysis,
        description=story.description,
        tier=story.tier,
        category=story.category,
        impact_score=story.impact_score,
        sources=[SourceSchema(name=s.name, url=s.url) for s in story.sources],
        source_count=story.source_count,
        confidence=story.confidence,
        created_at=story.created_at,
        published_date=story.published_date,
    )


@router.get("/api/stories", response_model=StoriesResponse)
async def list_stories(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    tier: Optional[str] = Query(default=None),
) -> StoriesResponse:
    """List all collected stories with pagination."""
    stories = get_stories(limit=limit, offset=offset, tier=tier)
    total = get_story_count(tier=tier)

    return StoriesResponse(
        stories=[_story_to_schema(s) for s in stories],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/api/stories/{story_id}", response_model=StorySchema)
async def get_story(story_id: str) -> StorySchema:
    """Get a single story by ID."""
    story = get_story_by_id(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return _story_to_schema(story)
