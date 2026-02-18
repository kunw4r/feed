import logging
import time
from datetime import datetime
from typing import Optional

import httpx

from backend.config.settings import NEWS_API_KEY, REQUEST_TIMEOUT
from backend.config.sources import Tier
from backend.models.story import RawStory

logger = logging.getLogger(__name__)

NEWSAPI_BASE_URL = "https://newsapi.org/v2"


async def collect_api_stories() -> list[RawStory]:
    """Fetch global stories from NewsAPI.org.

    Returns an empty list if NEWS_API_KEY is not configured.
    """
    if not NEWS_API_KEY:
        logger.info("NEWS_API_KEY not set — skipping API collection")
        return []

    stories: list[RawStory] = []
    start = time.time()

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(
                f"{NEWSAPI_BASE_URL}/top-headlines",
                params={
                    "language": "en",
                    "pageSize": 50,
                    "apiKey": NEWS_API_KEY,
                },
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") != "ok":
                logger.warning("NewsAPI returned status: %s", data.get("status"))
                return stories

            for article in data.get("articles", []):
                story = _parse_article(article)
                if story:
                    stories.append(story)

        elapsed = time.time() - start
        logger.info("Fetched %d stories from NewsAPI (%.1fs)", len(stories), elapsed)

    except httpx.TimeoutException:
        logger.warning("Timeout fetching from NewsAPI")
    except httpx.HTTPStatusError as e:
        logger.warning("HTTP %d from NewsAPI", e.response.status_code)
    except Exception as e:
        logger.error("Error fetching from NewsAPI: %s", e)

    return stories


def _parse_article(article: dict) -> Optional[RawStory]:
    """Convert a NewsAPI article into a RawStory."""
    title = (article.get("title") or "").strip()
    if not title or title == "[Removed]":
        return None

    url = (article.get("url") or "").strip()
    if not url:
        return None

    description = (article.get("description") or "").strip()
    source_name = article.get("source", {}).get("name", "NewsAPI")

    published_date = None
    if article.get("publishedAt"):
        try:
            published_date = datetime.fromisoformat(
                article["publishedAt"].replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            pass

    return RawStory(
        title=title,
        description=description,
        url=url,
        source_name=source_name,
        source_url=url,
        tier=Tier.GLOBAL,
        published_date=published_date,
    )
