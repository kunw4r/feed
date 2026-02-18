import asyncio
import logging
import time
from datetime import datetime
from typing import Optional

import feedparser
import httpx

from backend.config.settings import MAX_CONCURRENT_FEEDS, REQUEST_TIMEOUT
from backend.config.sources import ALL_RSS_SOURCES, FeedSource
from backend.models.story import RawStory

logger = logging.getLogger(__name__)


def _parse_published_date(entry: dict) -> Optional[datetime]:
    """Extract and parse the published date from a feed entry."""
    for date_field in ("published_parsed", "updated_parsed"):
        parsed = entry.get(date_field)
        if parsed:
            try:
                return datetime(*parsed[:6])
            except (TypeError, ValueError):
                continue
    return None


def _parse_entry(entry: dict, source: FeedSource) -> Optional[RawStory]:
    """Convert a feedparser entry into a RawStory."""
    title = entry.get("title", "").strip()
    if not title:
        return None

    description = entry.get("summary", "") or entry.get("description", "")
    description = description.strip()

    link = entry.get("link", "").strip()
    if not link:
        return None

    return RawStory(
        title=title,
        description=description,
        url=link,
        source_name=source.name,
        source_url=source.url,
        tier=source.tier,
        published_date=_parse_published_date(entry),
    )


async def _fetch_feed(client: httpx.AsyncClient, source: FeedSource) -> list[RawStory]:
    """Fetch and parse a single RSS/Atom feed."""
    stories: list[RawStory] = []
    start = time.time()

    try:
        response = await client.get(source.url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        feed = feedparser.parse(response.text)

        if feed.bozo and not feed.entries:
            logger.warning("Feed %s returned malformed data: %s", source.name, feed.bozo_exception)
            return stories

        for entry in feed.entries:
            story = _parse_entry(entry, source)
            if story:
                stories.append(story)

        elapsed = time.time() - start
        logger.info(
            "Fetched %d stories from %s (%.1fs)",
            len(stories),
            source.name,
            elapsed,
        )

    except httpx.TimeoutException:
        logger.warning("Timeout fetching %s (%s)", source.name, source.url)
    except httpx.HTTPStatusError as e:
        logger.warning("HTTP %d from %s: %s", e.response.status_code, source.name, source.url)
    except Exception as e:
        logger.error("Error fetching %s: %s", source.name, e)

    return stories


async def collect_rss_stories(
    sources: Optional[list[FeedSource]] = None,
) -> list[RawStory]:
    """Fetch stories from all configured RSS/Atom feeds concurrently.

    Returns a flat list of RawStory objects from all feeds.
    """
    if sources is None:
        sources = ALL_RSS_SOURCES

    all_stories: list[RawStory] = []
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_FEEDS)

    async def _limited_fetch(client: httpx.AsyncClient, source: FeedSource) -> list[RawStory]:
        async with semaphore:
            return await _fetch_feed(client, source)

    start = time.time()
    logger.info("Starting RSS collection from %d sources", len(sources))

    async with httpx.AsyncClient(
        follow_redirects=True,
        headers={"User-Agent": "TheDailyBriefing/1.0 (+https://github.com/daily-briefing)"},
    ) as client:
        tasks = [_limited_fetch(client, source) for source in sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error("Failed to fetch %s: %s", sources[i].name, result)
            else:
                all_stories.extend(result)

    elapsed = time.time() - start
    logger.info(
        "RSS collection complete: %d stories from %d sources (%.1fs)",
        len(all_stories),
        len(sources),
        elapsed,
    )

    return all_stories
