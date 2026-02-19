#!/usr/bin/env python3
"""Generate why_it_matters, concepts, and region fields for all stories in today.json."""

import json
import os
import sys
from pathlib import Path

import anthropic

# Load API key from backend .env
env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
with open(env_path) as f:
    for line in f:
        if line.strip() and not line.startswith("#"):
            key, _, value = line.strip().partition("=")
            os.environ.setdefault(key, value)

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

DATA_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data" / "today.json"

SYSTEM_PROMPT = """You are a learning-focused news analyst for The Daily Briefing, a platform helping young Australians understand the world.

For each news story, you must generate three things:

1. **why_it_matters**: A 2-3 sentence explanation of why a young person (16-25) should care about this story. Connect it to their life — jobs, cost of living, rights, future, technology, safety, or global stability. Use Australian English. Be direct and personal ("This affects you because...").

2. **concepts**: A list of 2-4 key concepts/terms from the story that a young reader might not fully understand. For each concept provide:
   - term: The word or phrase
   - definition: A simple 1-2 sentence definition (no jargon)
   - context: How this concept specifically relates to this story (1 sentence)

   Focus on concepts that build real-world literacy: financial terms (inflation, hedge funds, bonds, tariffs), geopolitical terms (annexation, sanctions, NATO), legal terms (bail, duty of care), scientific terms, etc.

3. **region**: The geographic region this story is primarily about. Use one of: "Brisbane", "Queensland", "Australia", "North America", "South America", "Europe", "Middle East", "Africa", "Asia", "Oceania", "Global". Pick the most specific applicable region.

Respond ONLY with valid JSON in this exact format:
{
  "why_it_matters": "...",
  "concepts": [
    {"term": "...", "definition": "...", "context": "..."},
    {"term": "...", "definition": "...", "context": "..."}
  ],
  "region": "..."
}"""


def generate_fields(story: dict) -> dict:
    """Generate learning fields for a single story."""
    user_msg = f"""Story title: {story['simplified_title']}
Category: {story['category']}
Tier: {story['tier']}
Summary: {story['quick_summary']}
Full story: {story['simplified_body']}"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        temperature=0.3,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    text = response.content[0].text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[: text.rfind("```")]
    return json.loads(text)


def main() -> None:
    with open(DATA_PATH) as f:
        data = json.load(f)

    all_stories = []
    for tier_key in ("local_stories", "national_stories", "global_stories"):
        all_stories.extend((tier_key, i, s) for i, s in enumerate(data[tier_key]))

    print(f"Generating learning fields for {len(all_stories)} stories...")

    for tier_key, idx, story in all_stories:
        title = story["simplified_title"]
        print(f"  [{tier_key}][{idx}] {title[:60]}...", end=" ", flush=True)

        try:
            fields = generate_fields(story)
            data[tier_key][idx]["why_it_matters"] = fields["why_it_matters"]
            data[tier_key][idx]["concepts"] = fields["concepts"]
            data[tier_key][idx]["region"] = fields["region"]
            print(f"✓ ({len(fields['concepts'])} concepts)")
        except Exception as e:
            print(f"✗ Error: {e}")
            # Set defaults so the site doesn't break
            data[tier_key][idx].setdefault("why_it_matters", None)
            data[tier_key][idx].setdefault("concepts", [])
            data[tier_key][idx].setdefault("region", None)

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"\nDone! Updated {DATA_PATH}")


if __name__ == "__main__":
    main()
