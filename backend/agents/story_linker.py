import logging
import time
from typing import Optional

from backend.agents.base_agent import call_llm, parse_json_response
from backend.models.story import Story

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a story connection analyst for The Daily Briefing. Your job is to find connections between news stories in today's briefing.

Given a list of today's stories, identify which ones are related to each other. Stories are related if they:
1. Cover the same ongoing event or issue
2. Share a cause-and-effect relationship (one event led to another)
3. Both relate to the same broader theme or policy area in a meaningful way
4. Involve the same key actors (people, organisations, governments)

Do NOT link stories just because they share a category (e.g., don't link all "Health" stories). Links must be specific and meaningful.

For each story, return a JSON object with:
- "index": The story's index number
- "related_indices": Array of indices of related stories (empty array if none)
- "connection_notes": Object mapping related index to a short explanation (max 15 words) of how they're connected

Respond with a JSON array. No markdown fences. No extra text."""


def link_stories(stories: list[Story]) -> list[Story]:
    """Identify connections between today's stories.

    Uses LLM to find meaningful relationships and populate related_story_ids.

    Args:
        stories: List of fully processed Story objects from today's briefing.

    Returns:
        The same stories with related_story_ids populated.
    """
    if len(stories) < 2:
        return stories

    start = time.time()
    logger.info("Linking %d stories", len(stories))

    # Build story summaries for the LLM
    lines: list[str] = []
    for i, story in enumerate(stories):
        lines.append(
            f"[{i}] Tier: {story.tier} | Category: {story.category}\n"
            f"    Title: {story.simplified_title}\n"
            f"    Summary: {story.quick_summary}"
        )
    user_message = "\n\n".join(lines)

    response_text = call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        temperature=0.0,
        agent_name="story_linker",
    )

    parsed = parse_json_response(response_text, agent_name="story_linker")

    if not isinstance(parsed, list):
        logger.warning("Story linker: failed to parse response")
        return stories

    # Apply connections
    links_found = 0
    for item in parsed:
        if not isinstance(item, dict):
            continue

        idx = item.get("index")
        related = item.get("related_indices", [])

        if not isinstance(idx, int) or idx < 0 or idx >= len(stories):
            continue

        story = stories[idx]
        for rel_idx in related:
            if isinstance(rel_idx, int) and 0 <= rel_idx < len(stories) and rel_idx != idx:
                rel_id = stories[rel_idx].id
                if rel_id not in story.related_story_ids:
                    story.related_story_ids.append(rel_id)
                    links_found += 1

    elapsed = time.time() - start
    logger.info("Story linking complete: %d connections found (%.1fs)", links_found, elapsed)

    return stories
