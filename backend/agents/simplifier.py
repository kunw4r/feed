import logging
import time
import uuid
from datetime import datetime

from backend.agents.base_agent import call_llm, parse_json_response
from backend.models.source import Source
from backend.models.story import RawStory, Story

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are The Daily Briefing's story simplifier. Your job is to rewrite news stories so that anyone — including a 10-year-old with zero context — can understand what's happening, why it matters, and what might happen next.

You MUST follow these rules exactly:

1. NO JARGON — if a technical term is needed, explain it in plain words immediately after.
2. NO ACRONYMS without expansion on first use. Write "Reserve Bank of Australia (RBA)" then "RBA" after.
3. PARAGRAPH 1: What happened. One clear sentence.
4. PARAGRAPH 2: Why it matters and who it affects.
5. PARAGRAPH 3: What might happen next.
6. BACKGROUND SECTION: If this is part of an ongoing story, add a short "Background" paragraph explaining what came before.
7. MAX 300 WORDS for the full body. Be concise.
8. AUSTRALIAN ENGLISH: Use "organised" not "organized", "colour" not "color", "labour" not "labor" (except when referring to the political party "Labor"), "centre" not "center", etc.
9. TONE: Friendly, clear, like a smart older sibling explaining the news. Not condescending, not overly casual.
10. Be factual. Do not add opinions, speculation beyond what sources suggest, or emotional language.

For each story, produce a JSON object with these fields:
- "simplified_title": A plain-language headline (max 15 words). No clickbait.
- "quick_summary": ONE sentence that captures the whole story. This is for people who just want the gist.
- "simplified_body": The full 2-3 paragraph rewrite following all rules above.

Respond with a JSON array of objects. No markdown fences. No explanations outside the JSON."""


def simplify_stories(
    ranked: list[tuple[RawStory, str, str, float]],
) -> list[Story]:
    """Rewrite ranked stories into simplified, readable versions using Claude Sonnet.

    Args:
        ranked: List of (raw_story, category, tier, impact_score) tuples from the ranker.

    Returns:
        List of fully processed Story objects ready for database storage.
    """
    if not ranked:
        return []

    start = time.time()
    logger.info("Simplifying %d stories", len(ranked))

    # Build the user message with all stories
    lines: list[str] = []
    for i, (story, category, tier, score) in enumerate(ranked):
        lines.append(
            f"[{i}] Tier: {tier} | Category: {category}\n"
            f"    Source: {story.source_name}\n"
            f"    Original headline: {story.title}\n"
            f"    Description: {story.description[:500]}"
        )
    user_message = "\n\n".join(lines)

    # Call Sonnet for simplification
    response_text = call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model="claude-sonnet-4-5",
        max_tokens=8192,
        temperature=0.3,
        agent_name="simplifier",
    )

    parsed = parse_json_response(response_text, agent_name="simplifier")

    # Build Story objects
    result: list[Story] = []
    for i, (raw_story, category, tier, score) in enumerate(ranked):
        simplified_title = ""
        quick_summary = ""
        simplified_body = ""

        if isinstance(parsed, list) and i < len(parsed):
            item = parsed[i]
            if isinstance(item, dict):
                simplified_title = item.get("simplified_title", "")
                quick_summary = item.get("quick_summary", "")
                simplified_body = item.get("simplified_body", "")

        # Fallback: use original title/description if LLM failed
        if not simplified_title:
            simplified_title = raw_story.title
            logger.warning("Simplifier: using original title for story %d", i)
        if not quick_summary:
            quick_summary = raw_story.description[:200] if raw_story.description else raw_story.title
        if not simplified_body:
            simplified_body = raw_story.description

        story = Story(
            id=str(uuid.uuid4()),
            title=raw_story.title,
            simplified_title=simplified_title,
            simplified_body=simplified_body,
            quick_summary=quick_summary,
            description=raw_story.description,
            tier=tier,
            category=category,
            impact_score=score,
            sources=[Source(name=raw_story.source_name, url=raw_story.url)],
            source_count=1,
            created_at=datetime.utcnow(),
            published_date=raw_story.published_date.date() if raw_story.published_date else None,
        )
        result.append(story)

    elapsed = time.time() - start
    logger.info("Simplification complete: %d stories (%.1fs)", len(result), elapsed)

    return result
