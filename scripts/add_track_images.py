#!/usr/bin/env python3
"""Attach cover images (from Wikipedia/Wikimedia) to the learning-track JSONs.

Same mechanism as add_learn_images.py: for each frontend/public/data/track-<slug>.json
the script resolves a Wikipedia article, reads its REST summary and stores

    cover_image: {url, width, height, credit, source_url}

on the track JSON and on its tracks-index.json entry. Tiles fall back to a
designed typographic cover when the entry has no cover_image.

Stdlib only; safe to re-run (overwrites cover_image each time).
"""

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from add_learn_images import get, check, normalize, scaled, pick_image, MIN_WIDTH, THUMB_WIDTH  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"

# slug -> search query (explicit so results are reviewable, not guessed at runtime)
QUERIES = {
    "finance": "Finance",
    "photography": "Photography",
    "coding": "Computer programming",
    "gym": "Physical fitness",
    "psychology": "Psychology",
    "writing": "Writing",
    "cooking": "Cooking",
    "geography": "Geography",
    "mathematics": "Mathematics",
    "music-theory": "Music theory",
    "public-speaking": "Public speaking",
}


def hero_for(query: str) -> dict | None:
    try:
        search = get(
            "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({
                "action": "opensearch", "format": "json", "redirects": "resolve", "limit": 1, "search": query,
            })
        )
        titles = search[1]
        if not titles:
            return None
        summary = get(
            "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(titles[0].replace(" ", "_"), safe="")
        )
        picked = pick_image(summary)
        if not picked:
            return None
        source = (summary.get("content_urls") or {}).get("desktop", {}).get("page", "")
        return {
            "url": picked["url"],
            "width": picked["width"],
            "height": picked["height"],
            "credit": f"Wikimedia Commons ({summary.get('titles', {}).get('normalized', query)})",
            "source_url": source,
        }
    except Exception as exc:
        print(f"  ! {type(exc).__name__}: {exc}", file=sys.stderr)
        return None


def main() -> None:
    index_path = DATA / "tracks-index.json"
    index = json.loads(index_path.read_text())
    for entry in index:
        slug = entry["slug"]
        path = DATA / f"track-{slug}.json"
        print(f"{slug}: ", end="", flush=True)
        if not path.exists():
            print("no track JSON, skipped")
            continue
        hero = hero_for(QUERIES.get(slug, entry.get("title", slug)))
        if not hero:
            print("no image found, skipped (tile falls back to typographic cover)")
            continue
        doc = json.loads(path.read_text())
        doc["cover_image"] = hero
        entry["cover_image"] = hero
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        print(f"{hero['width']}x{hero['height']}  {hero['url'][:96]}")
        time.sleep(1)  # stay polite with the Wikimedia APIs
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
    print(f"index updated with covers for {sum(1 for e in index if e.get('cover_image'))}/{len(index)} tracks")


if __name__ == "__main__":
    main()
