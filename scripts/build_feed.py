#!/usr/bin/env python3
"""Build today's Brainfeed from REAL news.

Replaces generate_continent_stories.py (which asked the model to invent stories).

Pipeline:
  1. Pull RSS from free-to-read outlets (no paywalls).
  2. Claude picks the most important stories per region from the real headlines.
  3. Fetch each article, extract the full text + lead image (trafilatura).
  4. Claude writes the explainer, concepts and a quiz FROM the article text only.
  5. Write frontend/public/data/today.json (+ per-story full text for the reader).

Usage:
  .venv/bin/python scripts/build_feed.py                          # fresh edition
  .venv/bin/python scripts/build_feed.py --incremental            # add only new important stories
  .venv/bin/python scripts/build_feed.py --incremental --excerpt 3   # what CI runs for the public site
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import anthropic
import feedparser
import httpx
import trafilatura

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "frontend" / "public" / "data"
ARTICLE_DIR = DATA_DIR / "articles"
ARCHIVE_DIR = DATA_DIR / "archive"

env_path = ROOT / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.strip() and not line.startswith("#"):
            key, _, value = line.strip().partition("=")
            os.environ.setdefault(key, value)

BRISBANE = ZoneInfo("Australia/Brisbane")
MODEL = os.environ.get("BRAINFEED_MODEL", "claude-opus-5-5")
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh) Brainfeed/2.0 personal news reader"}

# Free-to-read outlets only. Paywalled outlets (Courier Mail, AFR, The Australian,
# NYT, WSJ, FT, Bloomberg) are deliberately excluded so every story is readable.
FEEDS: list[tuple[str, str]] = [
    ("ABC News", "https://www.abc.net.au/news/feed/51120/rss.xml"),
    ("ABC News", "https://www.abc.net.au/news/feed/45910/rss.xml"),
    ("SBS News", "https://www.sbs.com.au/news/feed"),
    ("The Guardian", "https://www.theguardian.com/australia-news/rss"),
    ("The Guardian", "https://www.theguardian.com/world/rss"),
    ("The Guardian", "https://www.theguardian.com/technology/rss"),
    ("The Guardian", "https://www.theguardian.com/environment/rss"),
    ("The Conversation", "https://theconversation.com/au/articles.atom"),
    ("ABC News", "https://www.abc.net.au/news/feed/9167762/rss.xml"),  # health
    ("ABC News", "https://www.abc.net.au/news/feed/2942460/rss.xml"),  # science
    ("RNZ", "https://www.rnz.co.nz/rss/national.xml"),
    ("RNZ", "https://www.rnz.co.nz/rss/pacific.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/health/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/asia/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/africa/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/europe/rss.xml"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("DW", "https://rss.dw.com/rdf/rss-en-all"),
    ("CNA", "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511"),
    ("France 24", "https://www.france24.com/en/rss"),
    ("ASPI Strategist", "https://www.aspistrategist.org.au/feed/"),
    ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
]

REGIONS = {
    "OCEANIA": "Australia, New Zealand & Pacific (incl. Brisbane/QLD)",
    "ASIA": "Asia",
    "EUROPE": "Europe incl. UK, Russia-Ukraine",
    "MIDDLE_EAST_AFRICA": "Middle East & Africa",
    "AMERICAS": "North & South America",
    "GLOBAL_SYSTEMS": "Global economy, markets, trade, international institutions",
    "ADF": "Australian defence, ADF, AUKUS, regional security",
    "AI_TECH": "AI and technology",
}
CATEGORIES = [
    "POLITICS_POLICY", "ECONOMY_MARKETS", "SCIENCE_TECH", "SOCIETY_CULTURE",
    "ENVIRONMENT_CLIMATE", "CRIME_SAFETY", "HEALTH",
]

# Edition balance (enforced in code after the editor's picks, not just asked for in the prompt)
OUTLET_SHARE = 0.20      # no single outlet supplies more than ~20% of an edition
POLITICS_SHARE = 0.35    # politics is capped so other beats get room
WANTED_CATEGORIES = ["ECONOMY_MARKETS", "SCIENCE_TECH", "ENVIRONMENT_CLIMATE", "HEALTH"]
REGION_MINIMUMS = {"OCEANIA": 5}  # reader is in Brisbane; overrides --min-per-region

client = anthropic.Anthropic()


# ── 1. Collect ───────────────────────────────────────────────────────────────
def _entry_image(e: dict) -> str | None:
    for key in ("media_content", "media_thumbnail"):
        items = e.get(key) or []
        # Pick the widest image on offer
        best = sorted(items, key=lambda m: int(m.get("width") or 0), reverse=True)
        for m in best:
            if m.get("url"):
                return m["url"]
    for link in e.get("links", []):
        if "image" in (link.get("type") or "") and link.get("href"):
            return link["href"]
    return None


def collect(max_age_hours: int = 36) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    items: list[dict] = []
    seen: set[str] = set()

    def fetch(feed: tuple[str, str]) -> list[dict]:
        source, url = feed
        try:
            with httpx.Client(follow_redirects=True, headers=HEADERS, timeout=15) as c:
                parsed = feedparser.parse(c.get(url).text)
        except Exception as ex:  # a dead feed must not kill the run
            print(f"  ! {source}: {ex}")
            return []
        out = []
        for e in parsed.entries[:30]:
            ts = e.get("published_parsed") or e.get("updated_parsed")
            published = datetime(*ts[:6], tzinfo=timezone.utc) if ts else None
            if published and published < cutoff:
                continue
            summary = re.sub(r"<[^>]+>", "", e.get("summary", ""))[:280]
            out.append({
                "source": source,
                "title": e.get("title", "").strip(),
                "summary": summary.strip(),
                "url": e.get("link", "").split("?at_medium")[0],
                "image": _entry_image(e),
                "published": published.isoformat() if published else None,
            })
        print(f"  {source:16} {len(out):3} recent")
        return out

    with ThreadPoolExecutor(8) as pool:
        for batch in pool.map(fetch, FEEDS):
            for item in batch:
                if item["title"] and item["url"] not in seen:
                    seen.add(item["url"])
                    items.append(item)
    return items


# ── Claude helper ────────────────────────────────────────────────────────────
def ask_json(prompt: str, schema: dict, effort: str = "medium", max_tokens: int = 16000) -> dict:
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason == "refusal":
        raise RuntimeError(f"refused: {msg.stop_details}")
    text = next(b.text for b in msg.content if b.type == "text")
    return json.loads(text)


# ── 2. Select ────────────────────────────────────────────────────────────────
SELECT_SCHEMA = {
    "type": "object",
    "properties": {
        "picks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "also": {"type": "array", "items": {"type": "integer"}},
                    "region_code": {"type": "string", "enum": list(REGIONS)},
                    "category": {"type": "string", "enum": CATEGORIES},
                },
                "required": ["index", "also", "region_code", "category"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["picks"],
    "additionalProperties": False,
}


def select(
    items: list[dict],
    per_region: int,
    existing: list[dict] | None = None,
    needs: dict[str, int] | None = None,
    missing_categories: list[str] | None = None,
) -> list[dict]:
    lines = "\n".join(
        f"[{i}] ({it['source']}) {it['title']} — {it['summary'][:160]}" for i, it in enumerate(items)
    )
    regions = "\n".join(f"- {k}: {v}" for k, v in REGIONS.items())
    if existing:
        covered = "\n".join(f"- ({s['region_code']}) {s['title']}" for s in existing)
        task = f"""The edition already covers these stories:
{covered}

Pick ONLY genuinely new, important stories that are not already covered (a meaningful new development
in a covered story counts only if it changes the picture). The bar is high: a pick must be at least as
important as the stories already in its region. On a typical update that means 0-4 picks; picking nothing
is the right answer on a quiet news cycle. At most {per_region} per region. List picks most important first."""
        if needs:
            thin = ", ".join(f"{code} needs {n} more" for code, n in needs.items())
            task += f"""

Some regions are thin and must be topped up so every section has something to read: {thin}.
For those regions only, pick the best available uncovered stories even if they are less major."""
    else:
        task = f"Pick up to {per_region} stories per region that matter most, plus up to 2 extra per region as reserves."
    if missing_categories:
        task += f"""

The edition is short on these beats: {", ".join(missing_categories)}. If a genuinely newsworthy story on one
of them exists below, include it."""
    prompt = f"""You are the editor of a daily news-learning app for a young Australian in Brisbane.
Below are the latest real headlines from free outlets. {task}
Favour broad impact, real consequences, genuinely new developments. Skip sport results, celebrity, live blogs,
quizzes, opinion columns and minor crime. Don't let politics crowd out economy, science, environment and
health stories of similar weight, and spread picks across outlets. Each story must appear only once (pick the best-sourced item as
`index`; put other items covering the SAME event in `also`).

Regions:
{regions}

Headlines:
{lines}"""
    picks = ask_json(prompt, SELECT_SCHEMA)["picks"]
    known = {s["sources"][0]["url"] for s in existing or []}
    valid = [p for p in picks if 0 <= p["index"] < len(items) and items[p["index"]]["url"] not in known]
    print(f"  selected {len(valid)} stories")
    return valid


def balance(
    picks: list[dict],
    items: list[dict],
    existing: list[dict],
    needs: dict[str, int] | None = None,
    limit: int | None = None,
) -> list[dict]:
    """Enforce outlet and politics caps over the projected edition, keeping the editor's order.

    picks arrive most-important first. A pick that would push an outlet past OUTLET_SHARE or politics
    past POLITICS_SHARE is held back; held picks only come back to fill regions that still need stories.
    """
    want = limit if limit is not None else len(picks)
    size = len(existing) + min(want, len(picks))
    outlet_cap = max(1, math.ceil(OUTLET_SHARE * size))
    politics_cap = max(1, math.ceil(POLITICS_SHARE * size))

    outlets: dict[str, int] = {}
    for s in existing:
        name = (s.get("sources") or [{}])[0].get("name")
        outlets[name] = outlets.get(name, 0) + 1
    politics = sum(s.get("category") == "POLITICS_POLICY" for s in existing)
    region_need = dict(needs or {})

    chosen: list[dict] = []
    held: list[dict] = []
    for p in picks:
        src = items[p["index"]]["source"]
        is_politics = p["category"] == "POLITICS_POLICY"
        if outlets.get(src, 0) >= outlet_cap or (is_politics and politics >= politics_cap):
            held.append(p)
            continue
        chosen.append(p)
        outlets[src] = outlets.get(src, 0) + 1
        politics += is_politics
        if region_need.get(p["region_code"]):
            region_need[p["region_code"]] -= 1

    # Thin regions beat the caps: better a slightly lopsided edition than an empty section
    for p in held:
        if region_need.get(p["region_code"], 0) > 0:
            chosen.append(p)
            region_need[p["region_code"]] -= 1

    order = {id(p): i for i, p in enumerate(picks)}
    chosen.sort(key=lambda p: order[id(p)])
    if len(chosen) != len(picks):
        print(f"  balance: kept {len(chosen)}/{len(picks)} picks (outlet cap {outlet_cap}, politics cap {politics_cap})")
    return chosen[:want] if limit is not None else chosen


# ── 3. Fetch full text ───────────────────────────────────────────────────────
def best_image(html: str, og: str | None, rss: str | None) -> str | None:
    """Largest clean lead image: og:image minus publisher logo overlays, else the RSS thumbnail."""
    if og and "branded_news" in og:  # BBC stamps its logo on og images; 'standard' is the clean rendition
        return og.replace("/branded_news/", "/standard/")
    if og and "overlay-" in og:  # Guardian: overlaid og image, look for a large clean rendition in the page
        found = [
            (int(w), u.replace("&amp;", "&"))
            for u, w in re.findall(r'(https://i\.guim\.co\.uk/img/[^"\s]+?width=(\d+)[^"\s]*)', html)
            if "overlay" not in u
        ]
        large = [f for f in found if f[0] >= 600]
        return max(large)[1] if large else rss or og
    return og or rss


def fetch_article(item: dict) -> dict | None:
    try:
        with httpx.Client(follow_redirects=True, headers=HEADERS, timeout=20) as c:
            html = c.get(item["url"]).text
    except Exception:
        return None
    text = trafilatura.extract(html, include_comments=False, include_tables=False, favor_precision=True)
    if not text or len(text.split()) < 150:
        return None
    meta = trafilatura.extract_metadata(html)
    return {
        "source": item["source"],
        "url": item["url"],
        "title": (meta.title if meta and meta.title else item["title"]),
        "byline": meta.author if meta and meta.author else None,
        # og:image is full-resolution; RSS thumbnails are often ~240px
        "image": best_image(html, meta.image if meta else None, item["image"]),
        # Drop UI debris like "Published", "Share", "Image caption" (real paragraphs have 5+ words)
        "paragraphs": [p.strip() for p in text.split("\n") if len(p.split()) >= 5],
    }


# ── 4. Write explainer ───────────────────────────────────────────────────────
WRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "simplified_title": {"type": "string"},
        "quick_summary": {"type": "string"},
        "simplified_body": {"type": "string"},
        "why_it_matters": {"type": "string"},
        "deep_analysis": {"type": "string"},
        "concepts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "term": {"type": "string"},
                    "definition": {"type": "string"},
                    "context": {"type": "string"},
                },
                "required": ["term", "definition", "context"],
                "additionalProperties": False,
            },
        },
        "quiz": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "options": {"type": "array", "items": {"type": "string"}},
                "answer_index": {"type": "integer"},
                "explanation": {"type": "string"},
            },
            "required": ["question", "options", "answer_index", "explanation"],
            "additionalProperties": False,
        },
        "impact_score": {"type": "integer"},
        "background_beginner": {"type": "string"},
    },
    "required": [
        "simplified_title", "quick_summary", "simplified_body", "why_it_matters",
        "deep_analysis", "concepts", "quiz", "impact_score", "background_beginner",
    ],
    "additionalProperties": False,
}

WRITE_RULES = """Write in Australian English, friendly and clear, like a smart older sibling.
Use ONLY facts stated in the source articles below. Never invent numbers, quotes, names or dates.
If sources disagree, say so. State settled, well-established facts plainly; only attribute or hedge
("X says", "reportedly") for claims that are disputed, unverified or brand new. Never open a section with
"According to the sources".

- simplified_title: plain-language headline, max 12 words.
- quick_summary: one sentence.
- simplified_body: 3-4 short paragraphs separated by blank lines: what happened; who it affects and why;
  background a newcomer needs; what might happen next. Expand every acronym on first use. Max 300 words.
- why_it_matters: 1-2 sentences, ideally with an Australian angle if one genuinely exists.
- deep_analysis: markdown with exactly these sections: "## Historical Context", "## Multiple Perspectives",
  "## What to Watch". General background knowledge is allowed here but keep it clearly framed as background.
- concepts: 2-4 terms a newcomer wouldn't know (term must appear verbatim in simplified_body).
- quiz: one multiple-choice question (4 options) that checks understanding, not trivia.
- impact_score: 0-100 (breadth, severity, novelty).
- background_beginner: 60-120 words for someone who has never heard of this topic: who the main players
  are, how it started, and why it keeps coming up. No jargon; general background knowledge is fine here."""


def shuffle_quiz(quiz: dict, seed: str) -> dict:
    """Models favour putting the right answer second; shuffle deterministically per story."""
    order = list(range(len(quiz["options"])))
    random.Random(seed).shuffle(order)
    return {
        **quiz,
        "options": [quiz["options"][i] for i in order],
        "answer_index": order.index(quiz["answer_index"]),
    }


def write_story(pick: dict, articles: list[dict]) -> dict:
    sources_block = "\n\n".join(
        f"<article source=\"{a['source']}\">\n{a['title']}\n\n" + "\n".join(a["paragraphs"])[:12000] + "\n</article>"
        for a in articles
    )
    out = ask_json(f"{WRITE_RULES}\n\n{sources_block}", WRITE_SCHEMA, effort="low")
    lead = articles[0]
    story_id = str(uuid.uuid5(uuid.NAMESPACE_URL, lead["url"]))
    out["quiz"] = shuffle_quiz(out["quiz"], story_id)
    return {
        "id": story_id,
        "title": lead["title"],
        **{k: out[k] for k in ("simplified_title", "quick_summary", "simplified_body", "why_it_matters", "deep_analysis", "concepts", "quiz", "background_beginner")},
        "impact_score": max(0, min(100, out["impact_score"])),
        "image_url": next((a["image"] for a in articles if a["image"]), None),
        "region": REGIONS[pick["region_code"]],
        "region_code": pick["region_code"],
        "description": out["quick_summary"],
        "tier": "LOCAL" if pick["region_code"] == "OCEANIA" else "GLOBAL",
        "category": pick["category"],
        "sources": [{"name": a["source"], "url": a["url"]} for a in articles],
        "source_count": len(articles),
        "confidence": min(0.95, 0.55 + 0.15 * (len(articles) - 1)),
        "related_story_ids": [],
        "reading_minutes": max(1, round(sum(len(p.split()) for p in lead["paragraphs"]) / 230)),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_date": datetime.now(BRISBANE).date().isoformat(),
        "_article": {k: lead[k] for k in ("source", "url", "title", "byline", "paragraphs")},
    }


# ── Threads: link stories about the same developing event ────────────────────
LINK_SCHEMA = {
    "type": "object",
    "properties": {
        "links": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "related": {"type": "array", "items": {"type": "string"}},
                    "shared_subject": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["id", "related", "shared_subject", "confidence"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["links"],
    "additionalProperties": False,
}
GROUP_SCHEMA = {
    "type": "object",
    "properties": {"threads": {"type": "array", "items": {"type": "array", "items": {"type": "string"}}}},
    "required": ["threads"],
    "additionalProperties": False,
}
SAME_THREAD = """Two stories belong to the same thread only if they cover the same ongoing event or
saga (the same war, court case, election, outbreak, negotiation, company crisis). Sharing a topic or a
country is not enough, and neither is a knock-on effect (an oil price move caused by a war is not part of
the war's thread unless the story is mainly about the war)."""

LINK_CONFIDENCE = 0.75
_NOT_NAMES = {
    "The", "A", "An", "In", "On", "At", "As", "After", "Before", "Why", "How", "What", "New", "More", "Its",
    "This", "That", "Over", "Amid", "With", "From", "For", "And", "But", "Says", "Is", "Are", "Of", "To", "By",
}


def _names(s: dict) -> set[str]:
    """Rough proper-noun set from a story's headline + summary, used as a cheap same-subject check."""
    text = f"{s.get('simplified_title', '')} {s.get('title', '')} {s.get('quick_summary', '')}"
    return {w for w in re.findall(r"\b[A-Z][a-zA-Z'-]{2,}\b", text) if w not in _NOT_NAMES}


def thread_link_ok(target: dict, earlier: dict, confidence: float) -> bool:
    """Keep a suggested thread link only if the model is confident and the stories share a named subject."""
    return confidence >= LINK_CONFIDENCE and bool(_names(target) & _names(earlier))


def _story_line(s: dict) -> str:
    return f"{s['id']} | {s.get('published_date', '')} | {s['simplified_title']} — {s['quick_summary'][:140]}"


def archived_stories(days: int) -> list[dict]:
    cutoff = (datetime.now(BRISBANE) - timedelta(days=days)).date().isoformat()
    seen: dict[str, dict] = {}
    for f in sorted(ARCHIVE_DIR.glob("20*.json"), reverse=True):
        if f.stem < cutoff:
            continue
        for stories in json.loads(f.read_text())["regions"].values():
            for s in stories:
                seen.setdefault(s["id"], s)
    return list(seen.values())


def link_threads(targets: list[dict], pool: list[dict]) -> None:
    """Set related_story_ids on each target to earlier stories in the same thread."""
    pool = [p for p in pool if p["id"] not in {t["id"] for t in targets}]
    if not targets or not pool:
        return
    prompt = f"""{SAME_THREAD}

For each NEW story, list the ids of EARLIER stories in the same thread, name the shared subject
(e.g. "US-Iran war"), and give your confidence 0-1 that they are the same saga. Most stories have none;
return an empty list for those.

EARLIER stories (id | date | headline — summary):
{chr(10).join(_story_line(s) for s in pool)}

NEW stories:
{chr(10).join(_story_line(s) for s in targets)}"""
    try:
        links = ask_json(prompt, LINK_SCHEMA, effort="low")["links"]
    except Exception as ex:  # threads are a nice-to-have; never fail the run over them
        print(f"  ! thread linking skipped: {ex}")
        return
    pool_by_id = {p["id"]: p for p in pool}
    by_id = {t["id"]: t for t in targets}
    linked = 0
    for link in links:
        target = by_id.get(link["id"])
        if target is None:
            continue
        related = [
            r for r in link["related"]
            if r in pool_by_id and thread_link_ok(target, pool_by_id[r], link["confidence"])
        ]
        if target is not None and related:
            target["related_story_ids"] = sorted(set(target.get("related_story_ids") or []) | set(related))
            linked += 1
    print(f"  linked {linked} new stories into existing threads")


def backfill_threads(days: int) -> None:
    """One-off: group everything in today's edition and the archive into threads."""
    files = [DATA_DIR / "today.json"] + sorted(ARCHIVE_DIR.glob("20*.json"))
    stories: dict[str, dict] = {}
    for f in files:
        for v in json.loads(f.read_text())["regions"].values():
            for s in v:
                stories.setdefault(s["id"], s)
    prompt = f"""{SAME_THREAD}

Group these stories into threads. Only output groups of 2 or more; leave standalone stories out.

{chr(10).join(_story_line(s) for s in stories.values())}"""
    groups = [[i for i in g if i in stories] for g in ask_json(prompt, GROUP_SCHEMA)["threads"]]
    related = {i: sorted(set(g) - {i}) for g in groups if len(g) > 1 for i in g}
    for f in files:
        data = json.loads(f.read_text())
        for v in data["regions"].values():
            for s in v:
                s["related_story_ids"] = related.get(s["id"], [])
        f.write_text(json.dumps(data, ensure_ascii=False, indent=1 if f.name == "today.json" else None))
    print(f"backfill: {len([g for g in groups if len(g) > 1])} threads across {len(related)} stories")


def write_archive(briefing: dict, keep_days: int) -> None:
    """Snapshot the edition per day, prune old days, and drop article files nothing references."""
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    (ARCHIVE_DIR / f"{briefing['date']}.json").write_text(json.dumps(briefing, ensure_ascii=False))

    cutoff = (datetime.now(BRISBANE) - timedelta(days=keep_days)).date().isoformat()
    index, referenced = [], set()
    for f in sorted(ARCHIVE_DIR.glob("20*.json"), reverse=True):
        if f.stem < cutoff:
            f.unlink()
            continue
        day = json.loads(f.read_text())
        stories = sorted((s for v in day["regions"].values() for s in v), key=lambda s: s["impact_score"], reverse=True)
        referenced.update(s["id"] for s in stories)
        index.append({
            "date": day["date"],
            "total_stories": len(stories),
            "lead": {k: stories[0].get(k) for k in ("id", "simplified_title", "image_url")} if stories else None,
        })
    (ARCHIVE_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False))
    for f in ARTICLE_DIR.glob("*.json"):
        if f.stem not in referenced:
            f.unlink()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-region", type=int, default=5)
    ap.add_argument("--incremental", action="store_true", help="keep today's stories, add only new important ones")
    ap.add_argument("--max-per-region", type=int, default=6, help="edition cap per region (incremental)")
    ap.add_argument("--min-per-region", type=int, default=3, help="top up regions below this (incremental)")
    ap.add_argument("--archive-days", type=int, default=30, help="how long daily snapshots are kept")
    ap.add_argument("--new-max", type=int, default=6, help="most new stories to write per incremental run")
    ap.add_argument("--max-age-hours", type=int, default=30, help="retire stories older than this (incremental)")
    ap.add_argument("--excerpt", type=int, default=0, help="store only the first N paragraphs of the original (public builds)")
    ap.add_argument("--no-fulltext", action="store_true", help="don't write original article text for the reader")
    ap.add_argument("--link-backfill", action="store_true", help="group existing stories into threads, then exit")
    args = ap.parse_args()

    if args.link_backfill:
        backfill_threads(args.archive_days)
        return

    t0 = time.time()
    now = datetime.now(timezone.utc)
    today_path = DATA_DIR / "today.json"

    existing: list[dict] = []
    if args.incremental and today_path.exists():
        prev = json.loads(today_path.read_text())
        cutoff = now - timedelta(hours=args.max_age_hours)
        existing = [
            s for stories in prev.get("regions", {}).values() for s in stories
            if datetime.fromisoformat(s["created_at"]) >= cutoff
        ]
        print(f"incremental: keeping {len(existing)} recent stories")

    print("1/4 collecting feeds")
    items = collect()
    print(f"  {len(items)} candidate headlines")

    print("2/4 selecting")
    needs: dict[str, int] = {}
    if existing:
        for code in REGIONS:
            have = sum(s["region_code"] == code for s in existing)
            floor = REGION_MINIMUMS.get(code, args.min_per_region)
            if have < floor:
                needs[code] = floor - have
    covered = {s.get("category") for s in existing}
    missing = [c for c in WANTED_CATEGORIES if c not in covered]
    picks = select(items, args.per_region if not existing else 2, existing, needs, missing)
    if existing:
        picks = balance(picks, items, existing, needs, limit=args.new_max + sum(needs.values()))
    else:
        picks = balance(picks, items, [], {c: REGION_MINIMUMS.get(c, args.min_per_region) for c in REGIONS})
        per: dict[str, int] = {}
        trimmed = []
        for p in picks:  # reserves only survive where a region's first choices were held back
            per[p["region_code"]] = per.get(p["region_code"], 0) + 1
            if per[p["region_code"]] <= max(args.per_region, REGION_MINIMUMS.get(p["region_code"], 0)):
                trimmed.append(p)
        picks = trimmed

    print("3/4 fetching full articles")

    def gather(pick: dict) -> tuple[dict, list[dict]]:
        cands = [items[pick["index"]]] + [items[i] for i in pick["also"] if 0 <= i < len(items)][:2]
        return pick, [a for a in map(fetch_article, cands) if a]

    with ThreadPoolExecutor(8) as pool:
        gathered = [(p, arts) for p, arts in pool.map(gather, picks) if arts]
    print(f"  {len(gathered)}/{len(picks)} readable")

    print("4/4 writing explainers")

    def safe_write(pa: tuple[dict, list[dict]]) -> dict | None:
        try:
            return write_story(*pa)
        except Exception as ex:
            print(f"  ! {pa[1][0]['title'][:60]}: {ex}")
            return None

    with ThreadPoolExecutor(6) as pool:
        fresh = [s for s in pool.map(safe_write, gathered) if s]

    ARTICLE_DIR.mkdir(parents=True, exist_ok=True)
    for s in fresh:
        article = s.pop("_article")
        if args.excerpt:
            article["truncated"] = len(article["paragraphs"]) > args.excerpt
            article["paragraphs"] = article["paragraphs"][: args.excerpt]
        s["has_fulltext"] = not args.no_fulltext
        if not args.no_fulltext:
            (ARTICLE_DIR / f"{s['id']}.json").write_text(json.dumps(article, ensure_ascii=False))

    if existing:
        floor: dict[str, float] = {}
        for code in REGIONS:
            scores = sorted((s["impact_score"] for s in existing if s["region_code"] == code), reverse=True)
            if len(scores) >= args.max_per_region:
                floor[code] = scores[args.max_per_region - 1]
        dropped = [s for s in fresh if s["impact_score"] <= floor.get(s["region_code"], -1)]
        fresh = [s for s in fresh if s not in dropped]
        for s in dropped:
            (ARTICLE_DIR / f"{s['id']}.json").unlink(missing_ok=True)
        if dropped:
            print(f"  {len(dropped)} new stories weren't strong enough to displace existing ones")

    if fresh:
        print("  linking threads")
        link_threads(fresh, existing + archived_stories(args.archive_days))

    # Merge, keep the strongest stories per region
    regions: dict[str, list[dict]] = {code: [] for code in REGIONS}
    seen_ids: set[str] = set()
    for s in fresh + existing:
        if s["id"] not in seen_ids and s.get("region_code") in regions:
            seen_ids.add(s["id"])
            regions[s["region_code"]].append(s)
    cap = args.max_per_region if args.incremental else 10**6
    for code in regions:
        regions[code] = sorted(regions[code], key=lambda s: s["impact_score"], reverse=True)[:cap]

    kept = {s["id"] for stories in regions.values() for s in stories}

    if args.incremental and not fresh and existing and len(kept) == len(existing):
        print(f"no new stories; edition unchanged ({time.time() - t0:.0f}s)")
        return

    briefing = {
        "date": now.astimezone(BRISBANE).date().isoformat(),
        "generated_at": now.isoformat(),
        "regions": {k: v for k, v in regions.items() if v},
        "total_stories": len(kept),
    }
    today_path.write_text(json.dumps(briefing, ensure_ascii=False, indent=1))
    write_archive(briefing, args.archive_days)
    print(f"done: {len(fresh)} new, {len(kept)} in edition, {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
