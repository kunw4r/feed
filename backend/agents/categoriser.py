import logging
import time
from typing import Optional

from backend.agents.base_agent import call_llm, parse_json_response
from backend.config.sources import Tier
from backend.models.category import Category
from backend.models.story import RawStory

logger = logging.getLogger(__name__)

BATCH_SIZE = 10

SYSTEM_PROMPT = """You are a news classification engine. Your job is to classify news stories.

For each story, assign exactly ONE category and ONE tier.

Categories:
- POLITICS_POLICY: Government, elections, legislation, diplomacy, political parties
- ECONOMY_MARKETS: Finance, trade, employment, housing, cost of living, business
- SCIENCE_TECH: Research, space, AI, inventions, digital technology
- SOCIETY_CULTURE: Social issues, arts, education, religion, sports, entertainment
- ENVIRONMENT_CLIMATE: Climate change, weather, natural disasters, conservation, energy
- CRIME_SAFETY: Crime, courts, policing, national security, terrorism
- HEALTH: Public health, medical research, healthcare systems, disease outbreaks

Tiers:
- LOCAL: Primarily about Brisbane, Queensland, or south-east Queensland
- NATIONAL: About Australia as a whole, or Australian states other than QLD local news
- GLOBAL: International news, or news primarily about countries other than Australia

IMPORTANT: Use the source name as a strong hint for tier. Sources like "ABC News Brisbane", "Brisbane Times", "9News Brisbane", "Courier Mail" strongly suggest LOCAL. Sources like "BBC World", "Al Jazeera", "DW News", "The Guardian World" strongly suggest GLOBAL.

Respond with a JSON array only. Each element must have:
- "index": the story's index number (0-based)
- "category": one of the category codes above
- "tier": one of LOCAL, NATIONAL, GLOBAL

No explanations, no markdown fences. Just the JSON array."""

# Fallback tier mapping based on source name
SOURCE_TIER_FALLBACK: dict[str, str] = {
    "ABC News Brisbane": Tier.LOCAL.value,
    "9News Brisbane": Tier.LOCAL.value,
    "Brisbane Times": Tier.LOCAL.value,
    "Courier Mail": Tier.LOCAL.value,
    "ABC News Australia": Tier.NATIONAL.value,
    "SBS News": Tier.NATIONAL.value,
    "The Guardian Australia": Tier.NATIONAL.value,
    "The Conversation AU": Tier.NATIONAL.value,
    "BBC World": Tier.GLOBAL.value,
    "Reuters": Tier.GLOBAL.value,
    "Al Jazeera": Tier.GLOBAL.value,
    "The Guardian World": Tier.GLOBAL.value,
    "DW News": Tier.GLOBAL.value,
}

VALID_CATEGORIES = {c.value for c in Category if c != Category.UNCATEGORISED}
VALID_TIERS = {t.value for t in Tier}


def _build_batch_message(stories: list[RawStory], start_index: int) -> str:
    """Build the user message for a batch of stories."""
    lines: list[str] = []
    for i, story in enumerate(stories):
        idx = start_index + i
        lines.append(
            f"[{idx}] Source: {story.source_name}\n"
            f"    Title: {story.title}\n"
            f"    Description: {story.description[:300]}"
        )
    return "\n\n".join(lines)


def _apply_fallback(story: RawStory) -> tuple[str, str]:
    """Return (category, tier) based on source name when LLM fails."""
    tier = SOURCE_TIER_FALLBACK.get(story.source_name, story.tier.value)
    return Category.UNCATEGORISED.value, tier


def categorise_stories(stories: list[RawStory]) -> list[RawStory]:
    """Classify each story with a category and tier using Claude Haiku.

    Stories are batched in groups of BATCH_SIZE to reduce API calls.
    On LLM failure, falls back to source-based tier assignment.

    Modifies stories in-place (updates tier) and returns a parallel list of
    (category, tier) tuples stored in a dict for the pipeline to use.
    """
    if not stories:
        return stories

    start = time.time()
    logger.info("Categorising %d stories in batches of %d", len(stories), BATCH_SIZE)

    # We'll store classifications in a list parallel to stories
    classifications: list[tuple[str, str]] = [_apply_fallback(s) for s in stories]

    for batch_start in range(0, len(stories), BATCH_SIZE):
        batch = stories[batch_start : batch_start + BATCH_SIZE]
        message = _build_batch_message(batch, batch_start)

        response_text = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_message=message,
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            agent_name="categoriser",
        )

        parsed = parse_json_response(response_text, agent_name="categoriser")
        if not isinstance(parsed, list):
            logger.warning(
                "Categoriser batch %d-%d: failed to parse, using fallbacks",
                batch_start,
                batch_start + len(batch),
            )
            continue

        for item in parsed:
            try:
                idx = int(item["index"])
                category = item["category"]
                tier = item["tier"]

                if category not in VALID_CATEGORIES:
                    category = Category.UNCATEGORISED.value
                if tier not in VALID_TIERS:
                    tier = classifications[idx][1]  # keep fallback tier

                classifications[idx] = (category, tier)
            except (KeyError, ValueError, IndexError) as e:
                logger.warning("Categoriser: skipping malformed item %s: %s", item, e)

    # Apply classifications back to stories
    for i, (category, tier) in enumerate(classifications):
        stories[i] = RawStory(
            title=stories[i].title,
            description=stories[i].description,
            url=stories[i].url,
            source_name=stories[i].source_name,
            source_url=stories[i].source_url,
            tier=Tier(tier),
            published_date=stories[i].published_date,
        )

    elapsed = time.time() - start
    logger.info("Categorisation complete (%.1fs)", elapsed)

    return stories, classifications
