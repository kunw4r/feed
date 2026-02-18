from dataclasses import dataclass
from enum import Enum


class Tier(str, Enum):
    LOCAL = "LOCAL"
    NATIONAL = "NATIONAL"
    GLOBAL = "GLOBAL"


@dataclass(frozen=True)
class FeedSource:
    name: str
    url: str
    tier: Tier
    feed_type: str = "rss"  # rss | atom | api


# ── Local (Brisbane / QLD) ───────────────────────────────────────────────────
LOCAL_SOURCES: list[FeedSource] = [
    FeedSource(
        name="ABC News Brisbane",
        url="https://www.abc.net.au/news/feed/51120/rss.xml",
        tier=Tier.LOCAL,
    ),
    FeedSource(
        name="9News Brisbane",
        url="https://www.9news.com.au/rss",
        tier=Tier.LOCAL,
    ),
    FeedSource(
        name="Brisbane Times",
        url="https://www.brisbanetimes.com.au/rss/feed.xml",
        tier=Tier.LOCAL,
    ),
    FeedSource(
        name="Courier Mail",
        url="https://www.couriermail.com.au/rss",
        tier=Tier.LOCAL,
    ),
]

# ── National (Australia) ─────────────────────────────────────────────────────
NATIONAL_SOURCES: list[FeedSource] = [
    FeedSource(
        name="ABC News Australia",
        url="https://www.abc.net.au/news/feed/45910/rss.xml",
        tier=Tier.NATIONAL,
    ),
    FeedSource(
        name="SBS News",
        url="https://www.sbs.com.au/news/feed",
        tier=Tier.NATIONAL,
    ),
    FeedSource(
        name="The Guardian Australia",
        url="https://www.theguardian.com/au/rss",
        tier=Tier.NATIONAL,
    ),
    FeedSource(
        name="The Conversation AU",
        url="https://theconversation.com/au/articles.atom",
        tier=Tier.NATIONAL,
        feed_type="atom",
    ),
]

# ── Global ────────────────────────────────────────────────────────────────────
GLOBAL_SOURCES: list[FeedSource] = [
    FeedSource(
        name="BBC World",
        url="http://feeds.bbci.co.uk/news/world/rss.xml",
        tier=Tier.GLOBAL,
    ),
    FeedSource(
        name="Reuters",
        url="https://www.reutersagency.com/feed/",
        tier=Tier.GLOBAL,
    ),
    FeedSource(
        name="Al Jazeera",
        url="https://www.aljazeera.com/xml/rss/all.xml",
        tier=Tier.GLOBAL,
    ),
    FeedSource(
        name="The Guardian World",
        url="https://www.theguardian.com/world/rss",
        tier=Tier.GLOBAL,
    ),
    FeedSource(
        name="DW News",
        url="https://rss.dw.com/rdf/rss-en-all",
        tier=Tier.GLOBAL,
    ),
]

ALL_RSS_SOURCES: list[FeedSource] = LOCAL_SOURCES + NATIONAL_SOURCES + GLOBAL_SOURCES
