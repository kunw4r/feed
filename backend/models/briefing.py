from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from backend.models.story import Story


@dataclass
class Briefing:
    """A daily briefing containing 15 curated stories across three tiers."""

    date: date = field(default_factory=date.today)
    local_stories: list[Story] = field(default_factory=list)
    national_stories: list[Story] = field(default_factory=list)
    global_stories: list[Story] = field(default_factory=list)

    @property
    def all_stories(self) -> list[Story]:
        return self.local_stories + self.national_stories + self.global_stories

    @property
    def story_count(self) -> int:
        return len(self.all_stories)
