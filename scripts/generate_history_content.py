#!/usr/bin/env python3
"""Generate detailed learn articles for history events that don't have content yet."""

import json
import os
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

SYSTEM = """You are a history educator writing for young Australians (16-25) who may know nothing about this topic.
Rules: Australian English, explain everything simply, no jargon without definition, use analogies.
Return ONLY valid JSON. No markdown fences."""


def call_api(prompt, max_tokens=6000):
    r = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        temperature=0.4,
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = r.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found")
    return json.loads(text[start : end + 1])


def generate_event(title, year, summary, slug):
    prompt = f"""Write a detailed educational article about: {title} ({year})
Context: {summary}

Return JSON:
{{"title": "{title}", "subtitle": "1 sentence hook", "sections": [{{"heading": "section title", "content": "2-3 paragraphs, 150-200 words per section"}}], "key_concepts": [{{"term": "...", "definition": "...", "context": "..."}}], "timeline": [{{"date": "...", "event": "..."}}], "why_it_still_matters": "2-3 sentences", "discussion_questions": ["question1", "question2", "question3"], "slug": "{slug}"}}

Write 5-6 sections covering: what happened, why it happened, key people involved, immediate effects, long-term impact, and connection to today.
Include 5-7 key concepts, 6-8 timeline entries, and 3-5 discussion questions.
Explain everything as if the reader knows nothing about this topic."""
    return call_api(prompt)


# Load history index
history = json.loads((DATA_DIR / "history-index.json").read_text())

# Find events without content - prioritise most important ones
PRIORITY_SLUGS = [
    "construction-of-pyramids",
    "roman-empire-falls",
    "gutenberg-printing-press",
    "columbus-reaches-americas",
    "american-revolution",
    "french-revolution",
    "world-war-i",
    "russian-revolution",
    "world-war-ii",
    "holocaust",
    "atomic-bombings-hiroshima-nagasaki",
    "united-nations-founded",
    "moon-landing",
    "vietnam-war",
    "collapse-soviet-union",
    "internet-goes-mainstream",
    "rwandan-genocide",
    "iraq-war",
    "arab-spring",
    "russia-ukraine-war",
    "rise-of-artificial-intelligence",
    "indian-independence",
    "apartheid-ends",
    "napoleon-conquers-europe",
    "abolition-of-slavery",
    "us-civil-war",
    "industrial-revolution-begins",
    "magna-carta",
    "black-death",
    "rise-of-islam",
]

# Find matching events
to_generate = []
for slug in PRIORITY_SLUGS:
    for event in history:
        if event["slug"] == slug and not event["has_content"]:
            to_generate.append(event)
            break

# Also add any remaining events without content (up to a total of ~40)
for event in history:
    if not event["has_content"] and event not in to_generate and len(to_generate) < 40:
        to_generate.append(event)

print(f"Generating content for {len(to_generate)} events...\n")

# Also update learn-index.json
learn_index = json.loads((DATA_DIR / "learn-index.json").read_text())
learn_slugs = {item["slug"] for item in learn_index}

generated = 0
for event in to_generate:
    slug = event["slug"]
    title = event["title"]
    year = event["year"]
    summary = event["summary"]

    print(f"  [{generated+1}/{len(to_generate)}] {title} ({year})...", end=" ", flush=True)
    try:
        article = generate_event(title, year, summary, slug)
        article["slug"] = slug

        with open(DATA_DIR / f"learn-{slug}.json", "w") as f:
            json.dump(article, f, ensure_ascii=False, indent=2)

        # Update history index
        for h in history:
            if h["slug"] == slug:
                h["has_content"] = True

        # Add to learn index if not there
        if slug not in learn_slugs:
            learn_index.append({
                "slug": slug,
                "title": article.get("title", title),
                "subtitle": article.get("subtitle", summary),
            })
            learn_slugs.add(slug)

        generated += 1
        print("done")
    except Exception as e:
        print(f"ERROR: {e}")

# Save updated files
with open(DATA_DIR / "history-index.json", "w") as f:
    json.dump(history, f, ensure_ascii=False, indent=2)

with open(DATA_DIR / "learn-index.json", "w") as f:
    json.dump(learn_index, f, ensure_ascii=False, indent=2)

print(f"\nGenerated {generated} articles")
print(f"Total events with content: {sum(1 for e in history if e['has_content'])}")
print(f"Total learn articles: {len(learn_index)}")
