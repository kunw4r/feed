import logging
import time
from collections import defaultdict

from backend.agents.base_agent import call_llm, parse_json_response
from backend.config.sources import Tier
from backend.models.story import RawStory

logger = logging.getLogger(__name__)

BATCH_SIZE = 10
STORIES_PER_TIER = 5
MAX_PER_CATEGORY_PER_TIER = 2

SYSTEM_PROMPT = """You are a news impact scorer. Score each story from 0 to 100 based on these five dimensions:

1. BREADTH OF EFFECT (25 points): How many people are affected? A story affecting millions scores higher than one affecting hundreds.

2. CONSEQUENCE SEVERITY (25 points): What's at stake? Life/death or major economic impact scores highest. Minor inconvenience scores lowest.

3. NOVELTY (20 points): Is this a genuinely new development, or a rehash of known information? Breaking news scores higher than ongoing coverage of the same event.

4. CONNECTEDNESS (15 points): Does this story link to other major ongoing threads? Stories connected to bigger narratives score higher.

5. CATEGORY BALANCE (15 points): Would including this story improve the diversity of topics in today's briefing? Under-represented categories get a boost.

For each story, respond with a JSON array. Each element must have:
- "index": the story's index number (0-based)
- "score": integer 0-100
- "reasoning": one brief sentence explaining the score

No explanations outside the JSON. No markdown fences. Just the JSON array."""


def _build_batch_message(
    stories: list[RawStory],
    classifications: list[tuple[str, str]],
    start_index: int,
) -> str:
    """Build the user message for a batch of stories to score."""
    lines: list[str] = []
    for i, story in enumerate(stories):
        idx = start_index + i
        category, tier = classifications[idx]
        lines.append(
            f"[{idx}] Tier: {tier} | Category: {category}\n"
            f"    Source: {story.source_name}\n"
            f"    Title: {story.title}\n"
            f"    Description: {story.description[:300]}"
        )
    return "\n\n".join(lines)


def rank_stories(
    stories: list[RawStory],
    classifications: list[tuple[str, str]],
) -> list[tuple[RawStory, str, str, float]]:
    """Score and rank stories, then select the top 5 per tier.

    Args:
        stories: Deduplicated and categorised raw stories.
        classifications: Parallel list of (category, tier) tuples.

    Returns:
        List of (story, category, tier, score) tuples — 15 stories total
        (5 LOCAL, 5 NATIONAL, 5 GLOBAL), or fewer if not enough stories
        exist for a tier.
    """
    if not stories:
        return []

    start = time.time()
    logger.info("Ranking %d stories", len(stories))

    # Score all stories
    scores: list[float] = [0.0] * len(stories)

    for batch_start in range(0, len(stories), BATCH_SIZE):
        batch = stories[batch_start : batch_start + BATCH_SIZE]
        message = _build_batch_message(batch, classifications, batch_start)

        response_text = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_message=message,
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            agent_name="ranker",
        )

        parsed = parse_json_response(response_text, agent_name="ranker")
        if not isinstance(parsed, list):
            logger.warning(
                "Ranker batch %d-%d: failed to parse, scores stay at 0",
                batch_start,
                batch_start + len(batch),
            )
            continue

        for item in parsed:
            try:
                idx = int(item["index"])
                score = float(item["score"])
                scores[idx] = max(0.0, min(100.0, score))
            except (KeyError, ValueError, IndexError) as e:
                logger.warning("Ranker: skipping malformed item %s: %s", item, e)

    # Group stories by tier
    tier_groups: dict[str, list[tuple[int, float]]] = defaultdict(list)
    for i, (category, tier) in enumerate(classifications):
        tier_groups[tier].append((i, scores[i]))

    # Select top stories per tier with category diversity
    selected: list[tuple[RawStory, str, str, float]] = []

    for tier_value in [Tier.LOCAL.value, Tier.NATIONAL.value, Tier.GLOBAL.value]:
        candidates = tier_groups.get(tier_value, [])
        # Sort by score descending
        candidates.sort(key=lambda x: x[1], reverse=True)

        tier_selected: list[tuple[RawStory, str, str, float]] = []
        category_counts: dict[str, int] = defaultdict(int)

        for idx, score in candidates:
            if len(tier_selected) >= STORIES_PER_TIER:
                break

            category = classifications[idx][0]

            # Enforce category diversity
            if category_counts[category] >= MAX_PER_CATEGORY_PER_TIER:
                continue

            tier_selected.append((stories[idx], category, tier_value, score))
            category_counts[category] += 1

        # If we didn't get enough (due to diversity constraints), fill from remaining
        if len(tier_selected) < STORIES_PER_TIER:
            for idx, score in candidates:
                if len(tier_selected) >= STORIES_PER_TIER:
                    break
                already_selected = any(s[0] is stories[idx] for s in tier_selected)
                if not already_selected:
                    category = classifications[idx][0]
                    tier_selected.append((stories[idx], category, tier_value, score))

        selected.extend(tier_selected)
        logger.info(
            "Tier %s: selected %d stories (from %d candidates)",
            tier_value,
            len(tier_selected),
            len(candidates),
        )

    elapsed = time.time() - start
    logger.info("Ranking complete: %d stories selected (%.1fs)", len(selected), elapsed)

    return selected
