#!/usr/bin/env python3
"""Generate continent-based news stories using Anthropic API."""

import json
import os
import uuid
from pathlib import Path

import anthropic

env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
with open(env_path) as f:
    for line in f:
        if line.strip() and not line.startswith("#"):
            key, _, value = line.strip().partition("=")
            os.environ.setdefault(key, value)

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
DATA_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data" / "today.json"

REGIONS = [
    {
        "name": "Australia & Oceania",
        "code": "OCEANIA",
        "batches": [
            "Generate 4 stories about: Australian federal politics (cost of living crisis, housing policy, election dynamics), Queensland state issues (infrastructure, floods/climate), Australian economy (RBA interest rates, mining sector, real wages)",
            "Generate 4 stories about: Pacific Islands (climate threats, China's Pacific influence, AUKUS), New Zealand politics, Australian defence (AUKUS submarines, military spending), Australian society (education, healthcare, immigration debate)",
        ],
    },
    {
        "name": "Asia",
        "code": "ASIA",
        "batches": [
            "Generate 4 stories about: China's economy (property crisis, tech crackdowns, Belt and Road), China-Taiwan tensions, India's economic rise and tech sector, Japan's military buildup and aging population",
            "Generate 4 stories about: North Korea missile tests, South Korea's political crisis, Southeast Asian economies (Vietnam, Indonesia growth), ASEAN security and South China Sea disputes",
        ],
    },
    {
        "name": "Europe",
        "code": "EUROPE",
        "batches": [
            "Generate 4 stories about: Russia-Ukraine war (peace talks, territorial disputes, NATO involvement), European defence spending surge, EU energy transition from Russian gas, UK post-Brexit economy",
            "Generate 4 stories about: European far-right political movements, EU AI regulation, Greenland/Arctic geopolitics, European migration crisis and border policies",
        ],
    },
    {
        "name": "Middle East & Africa",
        "code": "MIDDLE_EAST_AFRICA",
        "batches": [
            "Generate 4 stories about: Israel-Palestine conflict (West Bank annexation, Gaza humanitarian crisis), Iran nuclear program and sanctions, Saudi Arabia's economic transformation (Vision 2030), Yemen/Red Sea shipping disruptions",
            "Generate 4 stories about: Sudan civil war humanitarian crisis, African Union and continental development, Nigeria/South Africa economies, Sahel region military coups and instability",
        ],
    },
    {
        "name": "Americas",
        "code": "AMERICAS",
        "batches": [
            "Generate 4 stories about: US politics under Trump (tariffs on China/EU, government spending cuts, immigration crackdown), US Federal Reserve and interest rate decisions, US tech regulation (AI, social media), US-China trade war escalation",
            "Generate 4 stories about: Mexico drug cartel violence, Venezuela political crisis, Brazil's Amazon deforestation policies, Canada-US trade tensions and Arctic sovereignty",
        ],
    },
    {
        "name": "Global Systems",
        "code": "GLOBAL_SYSTEMS",
        "batches": [
            "Generate 3 stories about: How hedge funds and bonds work (explain these financial instruments through a current story), IMF/World Bank lending to developing nations, global cryptocurrency regulation. IMPORTANT: really explain what hedge funds are, what bonds are, how currency markets work — teach the reader.",
            "Generate 3 stories about: UN climate agreements and carbon credits (explain how carbon trading works), WHO pandemic preparedness, global AI governance and safety regulation. IMPORTANT: explain how international organisations actually work — who funds them, how decisions are made.",
        ],
    },
]

SYSTEM_PROMPT = """You are a news intelligence engine for The Daily Briefing, helping young Australians (16-25) understand the world.

Generate realistic news stories about current events as of February 2026. Stories must:
1. Be based on real ongoing situations (extrapolate from what you know)
2. Explain ALL context — assume zero prior knowledge
3. Use Australian English
4. Include financial, geopolitical, and defence concepts
5. TEACH the reader about how the world works

For EACH story provide a JSON object with:
- "simplified_title": Clear headline
- "simplified_body": 3-4 paragraphs (what happened, why it matters, what's next, background). Max 300 words.
- "quick_summary": One sentence
- "deep_analysis": Markdown with ## Historical Context, ## Multiple Perspectives, ## Future Implications, ## What to Watch
- "why_it_matters": 2-3 sentences. Start with "This affects you because..." Be specific about how it impacts a young Australian.
- "concepts": Array of 3-4 {term, definition, context} objects. FOCUS ON BUILDING LITERACY: finance terms (explain what bonds/tariffs/sanctions/inflation/hedge funds actually ARE), geopolitics terms, defence terms, legal terms.
- "category": POLITICS_POLICY | ECONOMY_MARKETS | SCIENCE_TECH | SOCIETY_CULTURE | ENVIRONMENT_CLIMATE | CRIME_SAFETY | HEALTH
- "impact_score": 0-100
- "sources": [{name, url}] (use real news outlet names and plausible URLs)
- "published_date": Date between 2026-02-15 and 2026-02-19

Return ONLY a valid JSON array. No markdown fences. No text before or after the JSON."""


def generate_batch(region_name: str, prompt: str) -> list[dict]:
    """Generate a batch of stories."""
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=8000,
        temperature=0.4,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Region: {region_name}\n\n{prompt}\n\nReturn ONLY valid JSON array.",
            }
        ],
    )

    text = response.content[0].text.strip()
    # Strip markdown fences
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]
    # Find JSON array bounds
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in response")
    text = text[start : end + 1]

    return json.loads(text)


def main() -> None:
    all_regions: dict[str, list] = {}

    for region in REGIONS:
        print(f"\n=== {region['name']} ===")
        stories = []

        for i, batch_prompt in enumerate(region["batches"]):
            print(f"  Batch {i + 1}/{len(region['batches'])}...", end=" ", flush=True)
            try:
                batch = generate_batch(region["name"], batch_prompt)
                for s in batch:
                    s["id"] = str(uuid.uuid4())
                    s["title"] = s.get("simplified_title", "")
                    s["description"] = s.get("quick_summary", "")
                    s["tier"] = "GLOBAL"
                    s["region"] = region["name"]
                    s["region_code"] = region["code"]
                    s["source_count"] = len(s.get("sources", []))
                    s["confidence"] = 0.7
                    s["related_story_ids"] = []
                    s["created_at"] = "2026-02-19T06:00:00.000000"
                    s.setdefault("published_date", "2026-02-19")
                    s.setdefault("concepts", [])
                    s.setdefault("why_it_matters", None)
                    s.setdefault("deep_analysis", None)
                stories.extend(batch)
                print(f"✓ {len(batch)} stories")
                for s in batch:
                    print(f"    • {s['simplified_title'][:70]}")
            except Exception as e:
                print(f"✗ Error: {e}")

        all_regions[region["code"]] = stories

    data = {
        "date": "2026-02-19",
        "regions": all_regions,
        "total_stories": sum(len(v) for v in all_regions.values()),
    }

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n=== Done! {data['total_stories']} stories across {len(all_regions)} regions ===")


if __name__ == "__main__":
    main()
