#!/usr/bin/env python3
"""Generate history index: 100 major historical events in chronological order."""

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

SYSTEM = "You are a history educator creating a general knowledge timeline. Return ONLY valid JSON arrays. No markdown fences. Australian English."


def call_api(prompt, max_tokens=8000):
    r = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        temperature=0.3,
        system=SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = r.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]
    start = text.find("[")
    end = text.rfind("]")
    return json.loads(text[start : end + 1])


events = []

BATCHES = [
    ("Ancient & Classical (pre-1400)", """Generate a JSON array of 20 major historical events from ancient times to 1400 CE. Each object:
{"year": "3000 BCE" or "476 CE", "title": "short title", "slug": "kebab-case-slug", "summary": "1 sentence what happened", "era": "ANCIENT|CLASSICAL|MEDIEVAL", "significance": "1 sentence why it matters today"}
Include: pyramids, democracy in Athens, Alexander the Great, Roman Empire rise/fall, birth of major religions (Christianity, Islam, Buddhism), Silk Road, Magna Carta, Black Death, Mongol Empire, etc.
Chronological order. Make summaries clear for someone with zero knowledge."""),

    ("Renaissance to 1800", """Generate a JSON array of 20 major historical events from 1400-1800. Each object:
{"year": "1492", "title": "short title", "slug": "kebab-case-slug", "summary": "1 sentence what happened", "era": "RENAISSANCE|EARLY_MODERN", "significance": "1 sentence why it matters today"}
Include: printing press, Columbus, Reformation, Scientific Revolution, colonisation, slave trade, American Revolution, French Revolution, Industrial Revolution begins, etc.
Chronological order. Make summaries clear for someone with zero knowledge."""),

    ("1800s", """Generate a JSON array of 15 major historical events from 1800-1899. Each object:
{"year": "1865", "title": "short title", "slug": "kebab-case-slug", "summary": "1 sentence what happened", "era": "MODERN", "significance": "1 sentence why it matters today"}
Include: Napoleonic Wars, abolition of slavery, Darwin's evolution theory, US Civil War, unification of Germany/Italy, colonisation of Africa, Australian gold rush and federation movement, telephone/electricity inventions, etc.
Chronological order. Make summaries clear for someone with zero knowledge."""),

    ("1900-1950", """Generate a JSON array of 15 major historical events from 1900-1950. Each object:
{"year": "1914", "title": "short title", "slug": "kebab-case-slug", "summary": "1 sentence what happened", "era": "MODERN", "significance": "1 sentence why it matters today"}
Include: Wright brothers flight, WWI, Russian Revolution, Treaty of Versailles, Great Depression, rise of fascism, WWII, Holocaust, atomic bombs on Japan, United Nations founded, Indian independence, creation of Israel, etc.
Chronological order. Make summaries clear for someone with zero knowledge."""),

    ("1950-1990", """Generate a JSON array of 15 major historical events from 1950-1990. Each object:
{"year": "1969", "title": "short title", "slug": "kebab-case-slug", "summary": "1 sentence what happened", "era": "CONTEMPORARY", "significance": "1 sentence why it matters today"}
Include: Korean War, DNA discovery, decolonisation of Africa, Cuban Missile Crisis, JFK assassination, Civil Rights Act, Moon landing, Vietnam War, Watergate, Iranian Revolution, Chernobyl, fall of Berlin Wall, Tiananmen Square, etc.
Chronological order. Make summaries clear for someone with zero knowledge."""),

    ("1990-present", """Generate a JSON array of 15 major historical events from 1990-2025. Each object:
{"year": "2001", "title": "short title", "slug": "kebab-case-slug", "summary": "1 sentence what happened", "era": "CONTEMPORARY", "significance": "1 sentence why it matters today"}
Include: collapse of USSR, internet goes mainstream, Rwandan genocide, 9/11 attacks, Iraq War, 2008 financial crisis, Arab Spring, rise of smartphones, Syrian civil war, Brexit, COVID-19 pandemic, Russia-Ukraine war, AI revolution (ChatGPT), climate crisis milestones, etc.
Chronological order. Make summaries clear for someone with zero knowledge."""),
]

for label, prompt in BATCHES:
    print(f"  {label}...", end=" ", flush=True)
    try:
        batch = call_api(prompt)
        events.extend(batch)
        print(f"done ({len(batch)} events)")
    except Exception as e:
        print(f"ERROR: {e}")

# Check for existing learn content
existing = set()
for f in DATA_DIR.glob("learn-*.json"):
    if f.name != "learn-index.json":
        existing.add(f.stem.replace("learn-", ""))

# Add has_content flag
for e in events:
    e["has_content"] = e["slug"] in existing

with open(DATA_DIR / "history-index.json", "w") as f:
    json.dump(events, f, ensure_ascii=False, indent=2)

print(f"\nTotal: {len(events)} events")
print(f"With existing deep-dive content: {sum(1 for e in events if e['has_content'])}")
print(f"Needing content generation: {sum(1 for e in events if not e['has_content'])}")
