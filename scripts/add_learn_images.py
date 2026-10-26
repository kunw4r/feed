#!/usr/bin/env python3
"""Attach hero images (from Wikipedia/Wikimedia) to the deep-dive JSONs.

For each frontend/public/data/learn-<slug>.json the script resolves a Wikipedia
article via the opensearch API, reads its REST summary and stores

    hero_image: {url, width, height, credit, source_url}

preferring originalimage (downscaled through the upload.wikimedia.org thumb
endpoint when huge) and skipping gracefully when nothing usable is found.
learn-index.json entries get the same object so the index can show tiles.

Stdlib only; safe to re-run (overwrites hero_image each time).
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"
UA = "brainfeed-learn-images/1.0 (local development)"

# slug -> search query (explicit so results are reviewable, not guessed at runtime)
QUERIES = {
    "financial-crisis-2008": "2007–2008 financial crisis",
    "the-great-depression": "Great Depression",
    "cold-war": "Cold War",
    "covid-19-pandemic": "COVID-19 pandemic",
    "september-11": "September 11 attacks",
    "brexit": "Brexit",
    "fall-of-the-berlin-wall": "Berlin Wall",
    "climate-change": "Climate change",
}

MIN_WIDTH = 640  # below this an image is useless as a full-bleed hero
THUMB_WIDTH = 1920  # Wikimedia only serves thumbnails at fixed widths (20..3840); this is the hero bucket

import time


def get(url: str):
    for attempt in range(3):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.load(res)
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < 2:
                time.sleep(2 ** (attempt + 1))
                continue
            raise


def check(url: str) -> bool:
    for attempt in range(3):
        req = urllib.request.Request(url, headers={"User-Agent": UA}, method="HEAD")
        try:
            return urllib.request.urlopen(req, timeout=30).status == 200
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < 2:  # throttled: back off and retry
                time.sleep(2 ** (attempt + 1))
                continue
            return False
        except Exception:
            return False
    return False


def normalize(url: str) -> str:
    """Drop tracking params and serve everything from upload.wikimedia.org."""
    url = url.split("?", 1)[0]
    return url.replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/", 1)


def scaled(url: str, width: int) -> str | None:
    """upload.wikimedia.org renders any standard width via /wikipedia/<repo>/thumb/<h1>/<h2>/<file>/<w>px-<name>."""
    m = re.match(r"^(https://upload\.wikimedia\.org/wikipedia/(?:commons|en)/)thumb/([^/]+/[^/]+/)([^/]+)/\d+px-(.+)$", url)
    if m:  # already a render (svg/pdf/djvu -> png/jpg): re-request at the new size
        return f"{m.group(1)}thumb/{m.group(2)}{m.group(3)}/{width}px-{m.group(4)}"
    m = re.match(r"^(https://upload\.wikimedia\.org/wikipedia/(?:commons|en)/)([^/]+/[^/]+/)([^/]+)$", url)
    if not m:
        return None
    name = m.group(3)
    rendered = {"svg": ".png", "pdf": ".jpg", "djvu": ".jpg"}.get(name.rsplit(".", 1)[-1].lower(), "")
    return f"{m.group(1)}thumb/{m.group(2)}{name}/{width}px-{name}{rendered}"


def pick_image(summary: dict) -> dict | None:
    for key in ("originalimage", "thumbnail"):
        candidate = summary.get(key)
        if not candidate:
            continue
        url = normalize(candidate.get("source") or "")
        width, height = int(candidate.get("width") or 0), int(candidate.get("height") or 0)
        if not width:
            continue
        target = None
        if re.search(r"/thumb/[^/]+/[^/]+/[^/]+/\d+px-", url):
            # Render of an svg/pdf lead image: any standard width is possible, so ask for hero size
            target = scaled(url, THUMB_WIDTH) if width < THUMB_WIDTH else None
        elif width > THUMB_WIDTH:
            target = scaled(url, THUMB_WIDTH)
        if target and check(target):
            return {"url": target, "width": THUMB_WIDTH, "height": round(THUMB_WIDTH * height / width)}
        if width >= MIN_WIDTH:
            return {"url": url, "width": width, "height": height}
    return None


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
    index_path = DATA / "learn-index.json"
    index = json.loads(index_path.read_text())
    for entry in index:
        slug = entry["slug"]
        path = DATA / f"learn-{slug}.json"
        print(f"{slug}: ", end="", flush=True)
        if not path.exists():
            print("no deep-dive JSON, skipped")
            continue
        doc = json.loads(path.read_text())
        hero = hero_for(QUERIES.get(slug, doc.get("title", slug)))
        if not hero:
            print("no image found, skipped")
            continue
        doc["hero_image"] = hero
        entry["hero_image"] = hero
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        print(f"{hero['width']}x{hero['height']}  {hero['url'][:96]}")
        time.sleep(1)  # stay polite with the Wikimedia APIs
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
    print(f"index updated with thumbnails for {sum(1 for e in index if e.get('hero_image'))}/{len(index)} entries")


if __name__ == "__main__":
    main()
