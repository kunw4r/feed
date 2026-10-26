#!/usr/bin/env python3
"""Email the morning edition's top stories via Resend.

Needs RESEND_API_KEY and DIGEST_TO (comma-separated). DIGEST_FROM is optional; Resend's shared
onboarding@resend.dev sender only delivers to the Resend account's own address, so set DIGEST_FROM
to a verified domain to send anywhere else. Exits quietly (status 0) when not configured.
"""

from __future__ import annotations

import html
import json
import os
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
TODAY = ROOT / "frontend" / "public" / "data" / "today.json"
SITE = "https://kunw4r.github.io/feed"


def build_html(edition: dict, limit: int = 8) -> tuple[str, str]:
    stories = sorted(
        (s for v in edition["regions"].values() for s in v), key=lambda s: s["impact_score"], reverse=True
    )[:limit]
    rows = "".join(
        f"""<tr><td style="padding:14px 0;border-bottom:1px solid #eee">
<div style="font:600 11px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.08em;color:#c2410c;text-transform:uppercase">{html.escape(s["region"])}</div>
<a href="{SITE}/story/{s["id"]}" style="font:600 19px/1.3 Georgia,serif;color:#111;text-decoration:none">{html.escape(s["simplified_title"])}</a>
<div style="font:15px/1.5 Georgia,serif;color:#444;margin-top:4px">{html.escape(s["quick_summary"])}</div>
</td></tr>"""
        for s in stories
    )
    body = f"""<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="font:600 26px Georgia,serif">Brainfeed<span style="color:#ea580c">.</span></div>
<div style="font:14px -apple-system,sans-serif;color:#666;margin-bottom:8px">{edition["total_stories"]} stories today · top {len(stories)} below</div>
<table style="width:100%;border-collapse:collapse">{rows}</table>
<p style="font:14px -apple-system,sans-serif;margin-top:20px"><a href="{SITE}/brief" style="color:#ea580c">Open the brief →</a></p>
</div>"""
    subject = f"Brainfeed: {stories[0]['simplified_title']}" if stories else "Brainfeed"
    return subject, body


def main() -> int:
    key, to = os.environ.get("RESEND_API_KEY"), os.environ.get("DIGEST_TO")
    if not key or not to:
        print("digest: RESEND_API_KEY / DIGEST_TO not set, skipping")
        return 0
    subject, body = build_html(json.loads(TODAY.read_text()))
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "from": os.environ.get("DIGEST_FROM") or "Brainfeed <onboarding@resend.dev>",
                "to": [a.strip() for a in to.split(",") if a.strip()],
                "subject": subject,
                "html": body,
            },
            timeout=20,
        )
        print(f"digest: {r.status_code} {r.text[:200]}")
    except Exception as ex:  # an email hiccup must never fail the edition
        print(f"digest: failed ({ex})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
