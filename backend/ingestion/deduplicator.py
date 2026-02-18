import logging
import time
from difflib import SequenceMatcher

from backend.config.settings import DEDUP_THRESHOLD
from backend.models.story import RawStory

logger = logging.getLogger(__name__)


def _similarity(a: str, b: str) -> float:
    """Compute title similarity ratio between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def deduplicate_stories(stories: list[RawStory]) -> list[RawStory]:
    """Remove duplicate stories based on title similarity.

    When duplicates are found, the first story is kept and additional source
    URLs are noted. The duplicate's information is discarded but the source
    is preserved in the kept story's description as a note.

    Args:
        stories: List of raw stories, potentially with duplicates.

    Returns:
        Deduplicated list of stories. Each kept story's description may be
        augmented with additional source attribution.
    """
    if not stories:
        return []

    start = time.time()
    original_count = len(stories)

    # Track which stories have been merged into another
    merged: set[int] = set()
    # Map from kept story index → list of additional sources
    additional_sources: dict[int, list[tuple[str, str]]] = {}

    for i in range(len(stories)):
        if i in merged:
            continue

        for j in range(i + 1, len(stories)):
            if j in merged:
                continue

            if _similarity(stories[i].title, stories[j].title) >= DEDUP_THRESHOLD:
                merged.add(j)
                if i not in additional_sources:
                    additional_sources[i] = []
                additional_sources[i].append(
                    (stories[j].source_name, stories[j].url)
                )

    # Build the deduplicated list
    result: list[RawStory] = []
    for i, story in enumerate(stories):
        if i in merged:
            continue

        # If this story has duplicates, note the additional sources
        if i in additional_sources:
            extra_sources = additional_sources[i]
            source_note = " | Also reported by: " + ", ".join(
                f"{name}" for name, _ in extra_sources
            )
            story = RawStory(
                title=story.title,
                description=story.description + source_note,
                url=story.url,
                source_name=story.source_name,
                source_url=story.source_url,
                tier=story.tier,
                published_date=story.published_date,
            )

        result.append(story)

    elapsed = time.time() - start
    deduped_count = original_count - len(result)
    logger.info(
        "Deduplication complete: %d stories → %d unique (%d duplicates removed, %.1fs)",
        original_count,
        len(result),
        deduped_count,
        elapsed,
    )

    return result
