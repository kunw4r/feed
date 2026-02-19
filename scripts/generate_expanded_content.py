#!/usr/bin/env python3
"""Generate expanded content: ADF news, AI/Tech news, learning tracks, daily challenges."""

import json
import os
import uuid
from pathlib import Path

import anthropic

env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
with open(env_path) as f:
    for line in f:
        if line.strip() and not line.startswith("#"):
            k, _, v = line.strip().partition("=")
            os.environ.setdefault(k, v)

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
DATA_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

NEWS_SYSTEM = """You are a news intelligence engine for a learning platform. Generate realistic news stories as of February 2026.
Rules: Australian English, explain everything, no jargon without definition, 3-4 key concepts per story.
Return ONLY a valid JSON array of story objects. Each story has:
- simplified_title, simplified_body (3 paragraphs max 250 words), quick_summary (1 sentence)
- deep_analysis (markdown with ## Historical Context, ## Multiple Perspectives, ## Future Implications, ## What to Watch)
- why_it_matters (2 sentences starting "This affects you because...")
- concepts: [{term, definition, context}] (3-4 items)
- category (POLITICS_POLICY|ECONOMY_MARKETS|SCIENCE_TECH|SOCIETY_CULTURE|ENVIRONMENT_CLIMATE|CRIME_SAFETY|HEALTH)
- impact_score (0-100), sources: [{name, url}], published_date (2026-02-15 to 2026-02-19)
No markdown fences."""

LEARN_SYSTEM = """You are an educational content creator for a personal learning platform. Write bite-sized lessons (5-10 min read each).
Rules: Australian English, assume zero knowledge, use analogies, short paragraphs, practical examples.
Return ONLY valid JSON. No markdown fences."""

CHALLENGE_SYSTEM = """You are creating brain-training challenges for a personal development platform. Each challenge should take 5-10 minutes.
Rules: Clear instructions, hints available, solutions explained step-by-step.
Return ONLY valid JSON. No markdown fences."""


def call_api(system: str, prompt: str, max_tokens: int = 6000) -> str:
    r = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        temperature=0.4,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    text = r.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]
    return text


def parse_json_array(text: str) -> list:
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found")
    return json.loads(text[start : end + 1])


def parse_json_obj(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found")
    return json.loads(text[start : end + 1])


def add_story_meta(stories: list, region: str, region_code: str) -> list:
    for s in stories:
        s["id"] = str(uuid.uuid4())
        s["title"] = s.get("simplified_title", "")
        s["description"] = s.get("quick_summary", "")
        s["tier"] = "GLOBAL"
        s["region"] = region
        s["region_code"] = region_code
        s["source_count"] = len(s.get("sources", []))
        s["confidence"] = 0.7
        s["related_story_ids"] = []
        s["created_at"] = "2026-02-19T06:00:00.000000"
        s.setdefault("published_date", "2026-02-19")
        s.setdefault("concepts", [])
        s.setdefault("why_it_matters", None)
        s.setdefault("deep_analysis", None)
    return stories


# ========== ADF / DEFENCE NEWS ==========
def generate_adf_news():
    print("\n=== ADF & Defence News ===")
    batches = [
        "Generate 4 stories about the Australian Defence Force in Feb 2026: RAAF (Royal Australian Air Force) operations, new fighter jet acquisitions (F-35), drone warfare capabilities, AUKUS submarine program progress. Explain what the ADF is, its branches, and why Australia needs a defence force.",
        "Generate 4 stories about: Australian military exercises with allies (US, Japan, India), cyber warfare capabilities, ADF recruitment challenges, defence budget increases. Explain military alliances, Five Eyes intelligence sharing, and defence spending as % of GDP.",
    ]
    stories = []
    for i, prompt in enumerate(batches):
        print(f"  Batch {i+1}...", end=" ", flush=True)
        try:
            text = call_api(NEWS_SYSTEM, prompt)
            batch = parse_json_array(text)
            stories.extend(add_story_meta(batch, "Australia", "ADF"))
            print(f"done ({len(batch)} stories)")
        except Exception as e:
            print(f"ERROR: {e}")
    return stories


# ========== AI & TECH NEWS ==========
def generate_ai_tech_news():
    print("\n=== AI & Tech News ===")
    batches = [
        "Generate 4 stories about AI in Feb 2026: new model releases from Anthropic/OpenAI/Google/Meta, AI regulation debates, AI in healthcare breakthroughs, AI job displacement concerns. Explain what LLMs are, how training works, what parameters mean.",
        "Generate 4 stories about: Waymo autonomous vehicles expanding to new cities, drone delivery (Wing/Amazon), Apple Vision Pro updates, SpaceX Starship progress, quantum computing milestones. Explain the technology behind each simply.",
        "Generate 4 stories about: Big tech partnerships (Microsoft-OpenAI, Google-Samsung, Apple-TSMC), semiconductor chip wars (TSMC, NVIDIA), social media regulation, data privacy laws. Explain how tech companies make money, what APIs are, what cloud computing means.",
    ]
    stories = []
    for i, prompt in enumerate(batches):
        print(f"  Batch {i+1}...", end=" ", flush=True)
        try:
            text = call_api(NEWS_SYSTEM, prompt)
            batch = parse_json_array(text)
            stories.extend(add_story_meta(batch, "Global", "AI_TECH"))
            print(f"done ({len(batch)} stories)")
        except Exception as e:
            print(f"ERROR: {e}")
    return stories


# ========== LEARNING TRACKS ==========
def generate_learning_tracks():
    print("\n=== Learning Tracks ===")
    tracks = {}

    # Finance
    print("  Finance track...", end=" ", flush=True)
    try:
        text = call_api(LEARN_SYSTEM, """Create a Finance learning track with 6 lessons for beginners. Return JSON:
{"title": "Finance Fundamentals", "description": "...", "lessons": [{"title": "...", "content": "... (use \\n\\n for paragraphs, 300-400 words)", "key_takeaways": ["..."], "concepts": [{"term": "...", "definition": "..."}]}]}
Lessons: 1) What is money and how banking works 2) Stocks and the share market explained 3) How interest rates affect everything 4) Reading a company's financial health 5) What crypto actually is 6) How to start investing as a young person""")
        tracks["finance"] = parse_json_obj(text)
        tracks["finance"]["slug"] = "finance"
        tracks["finance"]["icon"] = "trending-up"
        print(f"done ({len(tracks['finance'].get('lessons', []))} lessons)")
    except Exception as e:
        print(f"ERROR: {e}")

    # Photography
    print("  Photography track...", end=" ", flush=True)
    try:
        text = call_api(LEARN_SYSTEM, """Create a Photography learning track with 6 lessons. Return JSON:
{"title": "Photography Basics", "description": "...", "lessons": [{"title": "...", "content": "... (use \\n\\n for paragraphs, 300-400 words)", "key_takeaways": ["..."], "concepts": [{"term": "...", "definition": "..."}]}]}
Lessons: 1) How cameras work (aperture, shutter speed, ISO) 2) Composition rules (rule of thirds, leading lines) 3) Lighting fundamentals 4) Portrait photography tips 5) Landscape and street photography 6) Editing basics (what to adjust and why)""")
        tracks["photography"] = parse_json_obj(text)
        tracks["photography"]["slug"] = "photography"
        tracks["photography"]["icon"] = "camera"
        print(f"done ({len(tracks['photography'].get('lessons', []))} lessons)")
    except Exception as e:
        print(f"ERROR: {e}")

    # Coding
    print("  Coding track...", end=" ", flush=True)
    try:
        text = call_api(LEARN_SYSTEM, """Create a Coding Best Practices track with 6 lessons. Return JSON:
{"title": "Coding Essentials", "description": "...", "lessons": [{"title": "...", "content": "... (use \\n\\n for paragraphs, 300-400 words)", "key_takeaways": ["..."], "concepts": [{"term": "...", "definition": "..."}]}]}
Lessons: 1) What code actually is and how computers run it 2) Variables, functions and thinking in steps 3) Writing clean readable code 4) Debugging like a detective 5) APIs: how apps talk to each other 6) Version control with Git explained""")
        tracks["coding"] = parse_json_obj(text)
        tracks["coding"]["slug"] = "coding"
        tracks["coding"]["icon"] = "code"
        print(f"done ({len(tracks['coding'].get('lessons', []))} lessons)")
    except Exception as e:
        print(f"ERROR: {e}")

    return tracks


# ========== DAILY CHALLENGES ==========
def generate_challenges():
    print("\n=== Daily Challenges ===")

    # Coding challenges
    print("  Coding challenges...", end=" ", flush=True)
    try:
        text = call_api(CHALLENGE_SYSTEM, """Create 5 beginner-friendly coding challenges (5-10 min each). Return JSON array:
[{"title": "...", "type": "coding", "difficulty": "easy|medium", "description": "Problem description", "hints": ["hint1", "hint2"], "solution": "Solution code with explanation", "language": "python", "estimated_minutes": 5}]
Problems: 1) Reverse a string 2) FizzBuzz 3) Find the most common letter 4) Simple calculator 5) Palindrome checker
Make descriptions very clear for beginners.""")
        coding = parse_json_array(text)
        for c in coding:
            c["id"] = str(uuid.uuid4())
        print(f"done ({len(coding)})")
    except Exception as e:
        print(f"ERROR: {e}")
        coding = []

    # Brain teasers
    print("  Brain teasers...", end=" ", flush=True)
    try:
        text = call_api(CHALLENGE_SYSTEM, """Create 5 brain teasers/logic puzzles (5-10 min each). Return JSON array:
[{"title": "...", "type": "brain_teaser", "difficulty": "easy|medium", "description": "The puzzle/question", "hints": ["hint1", "hint2"], "solution": "Answer with step-by-step explanation", "estimated_minutes": 5}]
Mix of: logic puzzles, lateral thinking, probability, pattern recognition, estimation (Fermi problems). Make them fun and educational.""")
        brain = parse_json_array(text)
        for b in brain:
            b["id"] = str(uuid.uuid4())
        print(f"done ({len(brain)})")
    except Exception as e:
        print(f"ERROR: {e}")
        brain = []

    # Finance scenarios
    print("  Finance scenarios...", end=" ", flush=True)
    try:
        text = call_api(CHALLENGE_SYSTEM, """Create 5 finance scenario challenges (5-10 min each). Return JSON array:
[{"title": "...", "type": "finance", "difficulty": "easy|medium", "description": "A real-world finance scenario/question", "hints": ["hint1", "hint2"], "solution": "Answer with explanation of the financial concepts", "estimated_minutes": 5}]
Scenarios: investment decisions, budget planning, understanding compound interest, reading stock prices, calculating loan costs. Explain all terms.""")
        finance = parse_json_array(text)
        for f in finance:
            f["id"] = str(uuid.uuid4())
        print(f"done ({len(finance)})")
    except Exception as e:
        print(f"ERROR: {e}")
        finance = []

    return coding + brain + finance


# ========== MAIN ==========
def main():
    # Load existing today.json
    today_path = DATA_DIR / "today.json"
    with open(today_path) as f:
        data = json.load(f)

    # Generate new news
    adf = generate_adf_news()
    ai_tech = generate_ai_tech_news()

    # Add to regions
    data["regions"]["ADF"] = adf
    data["regions"]["AI_TECH"] = ai_tech
    data["total_stories"] = sum(len(v) for v in data["regions"].values())

    with open(today_path, "w") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"\nUpdated today.json: {data['total_stories']} total stories")

    # Generate learning tracks
    tracks = generate_learning_tracks()
    for slug, track in tracks.items():
        path = DATA_DIR / f"track-{slug}.json"
        with open(path, "w") as f:
            json.dump(track, f, ensure_ascii=False, indent=2)
    # Write tracks index
    track_index = [
        {"slug": t["slug"], "title": t["title"], "description": t.get("description", ""), "icon": t.get("icon", "book"), "lesson_count": len(t.get("lessons", []))}
        for t in tracks.values()
    ]
    with open(DATA_DIR / "tracks-index.json", "w") as f:
        json.dump(track_index, f, ensure_ascii=False, indent=2)
    print(f"\nGenerated {len(tracks)} learning tracks")

    # Generate challenges
    challenges = generate_challenges()
    with open(DATA_DIR / "challenges.json", "w") as f:
        json.dump(challenges, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(challenges)} challenges")

    print("\n=== All content generated! ===")


if __name__ == "__main__":
    main()
