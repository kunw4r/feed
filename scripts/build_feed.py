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
import os
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
    ("The Conversation", "https://theconversation.com/au/articles.atom"),
    ("BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("BBC News", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
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


def select(items: list[dict], per_region: int, existing: list[dict] | None = None) -> list[dict]:
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
    else:
        task = f"Pick up to {per_region} stories per region that matter most."
    prompt = f"""You are the editor of a daily news-learning app for a young Australian in Brisbane.
Below are the latest real headlines from free outlets. {task}
Favour broad impact, real consequences, genuinely new developments. Skip sport results, celebrity, live blogs,
quizzes, opinion columns and minor crime. Each story must appear only once (pick the best-sourced item as
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
    },
    "required": [
        "simplified_title", "quick_summary", "simplified_body", "why_it_matters",
        "deep_analysis", "concepts", "quiz", "impact_score",
    ],
    "additionalProperties": False,
}

WRITE_RULES = """Write in Australian English, friendly and clear, like a smart older sibling.
Use ONLY facts stated in the source articles below. Never invent numbers, quotes, names or dates.
If sources disagree, say so.

- simplified_title: plain-language headline, max 12 words.
- quick_summary: one sentence.
- simplified_body: 3-4 short paragraphs separated by blank lines: what happened; who it affects and why;
  background a newcomer needs; what might happen next. Expand every acronym on first use. Max 300 words.
- why_it_matters: 1-2 sentences, ideally with an Australian angle if one genuinely exists.
- deep_analysis: markdown with exactly these sections: "## Historical Context", "## Multiple Perspectives",
  "## What to Watch". General background knowledge is allowed here but keep it clearly framed as background.
- concepts: 2-4 terms a newcomer wouldn't know (term must appear verbatim in simplified_body).
- quiz: one multiple-choice question (4 options) that checks understanding, not trivia.
- impact_score: 0-100 (breadth, severity, novelty)."""


def write_story(pick: dict, articles: list[dict]) -> dict:
    sources_block = "\n\n".join(
        f"<article source=\"{a['source']}\">\n{a['title']}\n\n" + "\n".join(a["paragraphs"])[:12000] + "\n</article>"
        for a in articles
    )
    out = ask_json(f"{WRITE_RULES}\n\n{sources_block}", WRITE_SCHEMA, effort="low")
    lead = articles[0]
    story_id = str(uuid.uuid5(uuid.NAMESPACE_URL, lead["url"]))
    return {
        "id": story_id,
        "title": lead["title"],
        **{k: out[k] for k in ("simplified_title", "quick_summary", "simplified_body", "why_it_matters", "deep_analysis", "concepts", "quiz")},
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-region", type=int, default=5)
    ap.add_argument("--incremental", action="store_true", help="keep today's stories, add only new important ones")
    ap.add_argument("--max-per-region", type=int, default=6, help="edition cap per region (incremental)")
    ap.add_argument("--new-max", type=int, default=6, help="most new stories to write per incremental run")
    ap.add_argument("--max-age-hours", type=int, default=30, help="retire stories older than this (incremental)")
    ap.add_argument("--excerpt", type=int, default=0, help="store only the first N paragraphs of the original (public builds)")
    ap.add_argument("--no-fulltext", action="store_true", help="don't write original article text for the reader")
    args = ap.parse_args()

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
    picks = select(items, args.per_region if not existing else 2, existing)
    if existing:
        picks = picks[: args.new_max]

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
    for f in ARTICLE_DIR.glob("*.json"):
        if f.stem not in kept:
            f.unlink()

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
    print(f"done: {len(fresh)} new, {len(kept)} in edition, {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
