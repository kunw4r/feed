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
from urllib.parse import quote
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
TODAY = ROOT / "frontend" / "public" / "data" / "today.json"
SITE = "https://kunw4r.github.io/feed"
# Same labels the site uses (frontend/src/lib/types.ts REGION_CONFIG)
REGION_LABELS = {
    "OCEANIA": "Australia & Pacific", "ASIA": "Asia", "EUROPE": "Europe", "MIDDLE_EAST_AFRICA": "Middle East & Africa",
    "AMERICAS": "Americas", "GLOBAL_SYSTEMS": "Global Systems", "ADF": "ADF & Defence", "AI_TECH": "AI & Tech",
}


def img(url: str, w: int, h: int) -> str:
    """Publisher photos resized and cropped by the same open image proxy the site uses (WebP isn't safe in email)."""
    return f"https://wsrv.nl/?url={quote(url, safe='')}&w={w}&h={h}&fit=cover&output=jpg&q=75"


def build_html(edition: dict, limit: int = 8) -> tuple[str, str]:
    stories = sorted(
        (s for v in edition["regions"].values() for s in v), key=lambda s: s["impact_score"], reverse=True
    )[:limit]
    if not stories:
        return "Brainfeed", "<p>No stories today.</p>"
    font = "-apple-system,Segoe UI,sans-serif"

    def kicker(s: dict) -> str:
        return f'<div style="font:600 11px/1.4 {font};letter-spacing:.08em;color:#c2410c;text-transform:uppercase">{html.escape(REGION_LABELS.get(s.get("region_code", ""), s["region"]))}</div>'

    lead = stories[0]
    lead_img = (
        f'<a href="{SITE}/story/{lead["id"]}/"><img src="{img(lead["image_url"], 1200, 675)}" width="552" alt="" '
        f'style="display:block;width:100%;max-width:552px;height:auto;border-radius:12px;border:0"></a>'
        if lead.get("image_url") else ""
    )
    lead_block = f"""<tr><td style="padding:8px 0 20px;border-bottom:1px solid #eee">{lead_img}
<div style="margin-top:14px">{kicker(lead)}</div>
<a href="{SITE}/story/{lead["id"]}/" style="font:600 24px/1.25 Georgia,serif;color:#111;text-decoration:none">{html.escape(lead["simplified_title"])}</a>
<div style="font:16px/1.5 Georgia,serif;color:#444;margin-top:6px">{html.escape(lead["quick_summary"])}</div>
</td></tr>"""

    rows = "".join(
        f"""<tr><td style="padding:14px 0;border-bottom:1px solid #eee">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="top" style="padding-right:14px">{kicker(s)}
<a href="{SITE}/story/{s["id"]}/" style="font:600 18px/1.3 Georgia,serif;color:#111;text-decoration:none">{html.escape(s["simplified_title"])}</a>
<div style="font:14px/1.5 Georgia,serif;color:#555;margin-top:4px">{html.escape(s["quick_summary"])}</div></td>
{f'<td valign="top" width="96"><a href="{SITE}/story/{s["id"]}/"><img src="{img(s["image_url"], 192, 192)}" width="96" height="96" alt="" style="display:block;border-radius:10px;border:0"></a></td>' if s.get("image_url") else ""}
</tr></table></td></tr>"""
        for s in stories[1:]
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0">
<div style="background:#f4f1ea;padding:24px 12px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
<div style="font:600 26px Georgia,serif;color:#111">Brainfeed<span style="color:#ea580c">.</span></div>
<div style="font:14px {font};color:#666;margin-bottom:12px">{edition["total_stories"]} stories today · top {len(stories)} below</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">{lead_block}{rows}</table>
<p style="font:14px {font};margin-top:20px"><a href="{SITE}/brief/" style="color:#ea580c">Open the brief →</a></p>
</div></div></body></html>"""
    return f"Brainfeed: {lead['simplified_title']}", body


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
