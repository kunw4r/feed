from datetime import date

from fastapi import APIRouter, HTTPException, Query

from backend.api.schemas.briefing_schema import BriefingSchema
from backend.api.schemas.story_schema import SourceSchema, StorySchema
from backend.database.repositories.briefing_repo import (
    get_briefing_by_date,
    get_latest_briefing_dates,
)
from backend.models.briefing import Briefing
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


def _briefing_to_schema(briefing: Briefing) -> BriefingSchema:
    return BriefingSchema(
        date=briefing.date,
        local_stories=[_story_to_schema(s) for s in briefing.local_stories],
        national_stories=[_story_to_schema(s) for s in briefing.national_stories],
        global_stories=[_story_to_schema(s) for s in briefing.global_stories],
        total_stories=briefing.story_count,
    )


@router.get("/api/briefings/today", response_model=BriefingSchema)
async def get_todays_briefing() -> BriefingSchema:
    """Get today's briefing with 15 simplified stories grouped by tier."""
    briefing = get_briefing_by_date(date.today())
    if not briefing:
        raise HTTPException(status_code=404, detail="No briefing available for today")
    return _briefing_to_schema(briefing)


@router.get("/api/briefings/{briefing_date}", response_model=BriefingSchema)
async def get_briefing_by_date_endpoint(briefing_date: date) -> BriefingSchema:
    """Get the briefing for a specific date."""
    briefing = get_briefing_by_date(briefing_date)
    if not briefing:
        raise HTTPException(
            status_code=404,
            detail=f"No briefing available for {briefing_date.isoformat()}",
        )
    return _briefing_to_schema(briefing)


@router.get("/api/briefings/latest/list")
async def get_latest_briefings(limit: int = Query(default=7, ge=1, le=30)) -> dict:
    """Get the most recent briefing dates."""
    dates = get_latest_briefing_dates(limit=limit)
    return {"dates": [d.isoformat() for d in dates], "count": len(dates)}
