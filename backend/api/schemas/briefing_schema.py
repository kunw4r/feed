from datetime import date

from pydantic import BaseModel

from backend.api.schemas.story_schema import StorySchema


class BriefingSchema(BaseModel):
    date: date
    local_stories: list[StorySchema]
    national_stories: list[StorySchema]
    global_stories: list[StorySchema]
    total_stories: int
