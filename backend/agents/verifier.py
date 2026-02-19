import logging
import time
from typing import Optional

from backend.agents.base_agent import call_llm, parse_json_response
from backend.models.story import RawStory

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are The Daily Briefing's story verification agent. Your job is to assess the credibility and verification status of news stories based on their sources.

For each story, you will be given:
- The headline and description
- The source name
- How many additional sources reported the same event (from deduplication)
- The tier (LOCAL, NATIONAL, or GLOBAL)

For each story, produce a JSON object with these fields:
- "confidence": A float between 0.0 and 1.0 representing how confident we can be in this story's accuracy.
  - 0.9-1.0: Multiple reputable sources agree on key facts
  - 0.7-0.89: At least 2 independent sources, minor detail differences
  - 0.5-0.69: Single reputable source (e.g. ABC, BBC, Reuters) or 2+ sources with some disagreement
  - 0.3-0.49: Single less-established source or sources with significant contradictions
  - 0.0-0.29: Unverifiable or highly questionable
- "verification_note": A short sentence (max 20 words) summarising the verification status. E.g. "Reported by 3 major outlets with consistent facts" or "Single source — treat with caution".
- "source_agreement": "AGREE" | "PARTIAL" | "SINGLE" — whether multiple sources agree, partially agree, or only one source exists.

Consider these factors:
1. Source reputation: ABC, BBC, Reuters, AP, Guardian, SBS are Tier 1. Most others are Tier 2.
2. Number of independent sources reporting the same event.
3. Whether the story contains claims that are easily verifiable (dates, names, official statements).
4. Breaking news gets lower confidence until confirmed by multiple outlets.

Respond with a JSON array of objects. No markdown fences. No explanations outside the JSON."""


# Tier 1 sources get a credibility boost
TIER_1_SOURCES = {
    "ABC News",
    "ABC News Brisbane",
    "BBC World",
    "BBC News",
    "Reuters",
    "AP News",
    "The Guardian",
    "The Guardian Australia",
    "SBS News",
    "Al Jazeera",
    "DW News",
    "The Conversation",
}


def verify_stories(
    ranked: list[tuple[RawStory, str, str, float]],
) -> list[tuple[RawStory, str, str, float, float, str]]:
    """Verify ranked stories and assign confidence scores.

    Args:
        ranked: List of (raw_story, category, tier, impact_score) tuples from the ranker.

    Returns:
        List of (raw_story, category, tier, impact_score, confidence, verification_note) tuples.
    """
    if not ranked:
        return []

    start = time.time()
    logger.info("Verifying %d stories", len(ranked))

    # Build the user message
    lines: list[str] = []
    for i, (story, category, tier, score) in enumerate(ranked):
        source_count = len(getattr(story, "additional_sources", [])) + 1
        lines.append(
            f"[{i}] Tier: {tier} | Category: {category} | Impact: {score}\n"
            f"    Source: {story.source_name}\n"
            f"    Additional sources reporting same event: {source_count - 1}\n"
            f"    Headline: {story.title}\n"
            f"    Description: {story.description[:400]}"
        )
    user_message = "\n\n".join(lines)

    # Call Sonnet for verification
    response_text = call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model="claude-sonnet-4-5",
        max_tokens=4096,
        temperature=0.0,
        agent_name="verifier",
    )

    parsed = parse_json_response(response_text, agent_name="verifier")

    # Build results with confidence scores
    result: list[tuple[RawStory, str, str, float, float, str]] = []
    for i, (story, category, tier, score) in enumerate(ranked):
        confidence = _fallback_confidence(story)
        verification_note = _fallback_note(story)

        if isinstance(parsed, list) and i < len(parsed):
            item = parsed[i]
            if isinstance(item, dict):
                confidence = float(item.get("confidence", confidence))
                confidence = max(0.0, min(1.0, confidence))
                verification_note = item.get("verification_note", verification_note)

        result.append((story, category, tier, score, confidence, verification_note))
        logger.debug(
            "Story %d: confidence=%.2f note=%s", i, confidence, verification_note
        )

    elapsed = time.time() - start
    logger.info("Verification complete: %d stories (%.1fs)", len(result), elapsed)

    # Log summary
    high = sum(1 for *_, c, _ in result if c >= 0.7)
    medium = sum(1 for *_, c, _ in result if 0.5 <= c < 0.7)
    low = sum(1 for *_, c, _ in result if c < 0.5)
    logger.info(
        "Confidence breakdown: %d high (>=0.7), %d medium (0.5-0.69), %d low (<0.5)",
        high,
        medium,
        low,
    )

    return result


def _fallback_confidence(story: RawStory) -> float:
    """Estimate confidence when LLM verification fails."""
    if story.source_name in TIER_1_SOURCES:
        return 0.6
    return 0.4


def _fallback_note(story: RawStory) -> str:
    """Generate a fallback verification note."""
    if story.source_name in TIER_1_SOURCES:
        return "Single reputable source — not independently verified"
    return "Single source — treat with caution"
