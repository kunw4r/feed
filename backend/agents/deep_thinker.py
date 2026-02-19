import logging
import time
from typing import Optional

from backend.agents.base_agent import call_llm, parse_json_response
from backend.models.story import Story

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a deeply knowledgeable analyst for The Daily Briefing. For each news story, provide a structured deep analysis.

You MUST produce a JSON object with exactly these four fields:

1. "historical_context": What past events (last 5-10 years) relate to this? Be specific with dates and events. Explain how those events led to today's situation. Include 2-4 key events as a timeline.

2. "perspectives": How would different groups view this? Present at least 2 genuine perspectives without bias. For example: economists vs workers, environmentalists vs industry, young vs old, government vs opposition. Label each perspective clearly.

3. "future_implications": What could this lead to? Consider impacts on: laws/policy, financial markets, society/culture, technology, and international relations. Be specific about mechanisms (e.g., "this could push the Reserve Bank of Australia to raise rates" not just "this affects the economy"). List 2-4 concrete implications.

4. "what_to_watch": What should the reader look out for next? What signals would indicate this is escalating or resolving? List 2-3 specific things to watch for.

RULES:
- Write in a plain, friendly tone. A 10-year-old should still be able to follow.
- Use Australian English (organised, colour, centre, etc.).
- NO JARGON without explanation. If you use a technical term, explain it in brackets.
- NO ACRONYMS without expansion on first use.
- Each section should be 50-150 words.
- Be factual. Present perspectives fairly without taking sides.

Respond with a JSON array of objects, one per story. No markdown fences. No explanations outside the JSON."""

# Process stories one at a time for better quality, but batch prompt for efficiency
MAX_BATCH_SIZE = 5


def run_deep_analysis(stories: list[Story]) -> list[Story]:
    """Run deep analysis on simplified stories using Claude Opus.

    Populates the deep_analysis field with structured markdown containing
    historical context, perspectives, future implications, and what to watch.

    Args:
        stories: List of simplified Story objects.

    Returns:
        The same list of Story objects with deep_analysis populated.
    """
    if not stories:
        return stories

    start = time.time()
    logger.info("Running deep analysis on %d stories", len(stories))

    # Process in batches
    for batch_start in range(0, len(stories), MAX_BATCH_SIZE):
        batch = stories[batch_start : batch_start + MAX_BATCH_SIZE]
        batch_num = batch_start // MAX_BATCH_SIZE + 1
        total_batches = (len(stories) + MAX_BATCH_SIZE - 1) // MAX_BATCH_SIZE
        logger.info("Deep thinker batch %d/%d (%d stories)", batch_num, total_batches, len(batch))

        _process_batch(batch)

    # Summary
    analysed = sum(1 for s in stories if s.deep_analysis)
    elapsed = time.time() - start
    logger.info(
        "Deep analysis complete: %d/%d stories analysed (%.1fs)",
        analysed,
        len(stories),
        elapsed,
    )

    return stories


def _process_batch(batch: list[Story]) -> None:
    """Process a batch of stories with the deep thinker."""
    lines: list[str] = []
    for i, story in enumerate(batch):
        lines.append(
            f"[{i}] Tier: {story.tier} | Category: {story.category}\n"
            f"    Headline: {story.simplified_title}\n"
            f"    Summary: {story.quick_summary}\n"
            f"    Full story: {story.simplified_body[:600]}"
        )
    user_message = "\n\n".join(lines)

    response_text = call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        model="claude-opus-4-6",
        max_tokens=8192,
        temperature=0.4,
        agent_name="deep_thinker",
    )

    parsed = parse_json_response(response_text, agent_name="deep_thinker")

    for i, story in enumerate(batch):
        analysis = _extract_analysis(parsed, i)
        if analysis:
            story.deep_analysis = analysis
        else:
            logger.warning("Deep thinker: no analysis for story %d (%s)", i, story.simplified_title[:50])


def _extract_analysis(parsed: Optional[list | dict], index: int) -> Optional[str]:
    """Extract and format deep analysis from LLM response into structured markdown."""
    if not isinstance(parsed, list) or index >= len(parsed):
        return None

    item = parsed[index]
    if not isinstance(item, dict):
        return None

    historical = item.get("historical_context", "")
    perspectives = item.get("perspectives", "")
    implications = item.get("future_implications", "")
    watch = item.get("what_to_watch", "")

    if not any([historical, perspectives, implications, watch]):
        return None

    # Build structured markdown
    sections: list[str] = []

    if historical:
        sections.append(f"## Historical Context\n\n{historical}")

    if perspectives:
        sections.append(f"## Multiple Perspectives\n\n{perspectives}")

    if implications:
        sections.append(f"## Future Implications\n\n{implications}")

    if watch:
        sections.append(f"## What to Watch\n\n{watch}")

    return "\n\n".join(sections)
