#!/usr/bin/env python3
"""Generate educational content for the Learn section."""

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

EVENTS = [
    {
        "slug": "financial-crisis-2008",
        "title": "The 2008 Global Financial Crisis",
        "prompt": "Explain the 2008 Global Financial Crisis. Cover: what subprime mortgages are, how banks bundled them into securities, why the housing bubble burst, how Lehman Brothers collapsed, the domino effect on banks worldwide, government bailouts, what quantitative easing is, and how it affected ordinary people (job losses, house prices). Explain what a recession is. Cover the Australian response (stimulus packages, why Australia avoided recession). Explain financial concepts: mortgage, securities, derivatives, hedge funds, credit default swaps, bailout, central banks, interest rates.",
    },
    {
        "slug": "the-great-depression",
        "title": "The Great Depression (1929-1939)",
        "prompt": "Explain the Great Depression. Cover: the 1929 stock market crash, what the stock market actually is, how buying on margin worked, the bank runs, why unemployment reached 25%, the Dust Bowl, Hoover vs Roosevelt, the New Deal programs, how it ended (WWII industrial production). Explain how it affected Australia (wool/wheat prices crashed, 30% unemployment). Key concepts: stocks, shares, market crash, inflation vs deflation, unemployment, fiscal policy, monetary policy, protectionism, tariffs.",
    },
    {
        "slug": "cold-war",
        "title": "The Cold War (1947-1991)",
        "prompt": "Explain the Cold War. Cover: why the US and Soviet Union became rivals after WWII, what capitalism vs communism means, the Iron Curtain, nuclear arms race (what MAD means), the Korean War, Cuban Missile Crisis, Vietnam War, Space Race, proxy wars, the Berlin Wall, how Gorbachev's reforms led to the USSR's collapse. Explain Australia's role (ANZUS alliance, Vietnam War involvement). Key concepts: superpower, ideology, nuclear deterrence, NATO vs Warsaw Pact, proxy war, espionage, propaganda, détente, sanctions.",
    },
    {
        "slug": "covid-19-pandemic",
        "title": "The COVID-19 Pandemic",
        "prompt": "Explain the COVID-19 pandemic from 2020-2023. Cover: how the virus originated, what a pandemic is, how lockdowns worked, the economic impact (what a recession is, how governments spent trillions), vaccine development (how mRNA vaccines work in simple terms), supply chain disruptions, work-from-home shift, mental health impacts, political polarisation. Cover Australia specifically: border closures, JobKeeper, state vs federal powers, hotel quarantine. Key concepts: pandemic, lockdown, mRNA vaccine, stimulus, supply chain, inflation, public health order, fiscal policy.",
    },
    {
        "slug": "september-11",
        "title": "September 11, 2001",
        "prompt": "Explain the September 11 attacks and their aftermath. Cover: what happened that day, who al-Qaeda was, why they attacked, the immediate response, the War on Terror, invasion of Afghanistan, invasion of Iraq (and the WMD controversy), the Patriot Act and surveillance expansion, how airport security changed, Osama bin Laden's death in 2011, the long-term impact on Middle East stability. Cover Australia's role (ANZUS invoked, troops to Afghanistan/Iraq). Key concepts: terrorism, extremism, intelligence agencies, NATO Article 5, weapons of mass destruction, occupation, insurgency, civil liberties vs security.",
    },
    {
        "slug": "brexit",
        "title": "Brexit: The UK Leaves the EU",
        "prompt": "Explain Brexit. Cover: what the European Union is and how it works, why some British people wanted to leave (immigration, sovereignty, regulations), the 2016 referendum, the leave vs remain campaigns, why the result was so close, the years of negotiations, the Northern Ireland border problem, what actually changed (trade barriers, freedom of movement), the economic impact. How it affects Australia (trade deal opportunities, visa changes). Key concepts: referendum, sovereignty, single market, customs union, free trade agreement, immigration, border controls, trade barriers, tariffs.",
    },
    {
        "slug": "fall-of-the-berlin-wall",
        "title": "The Fall of the Berlin Wall (1989)",
        "prompt": "Explain the Berlin Wall and its fall. Cover: why Germany was split after WWII, what East and West Germany were like, why the wall was built in 1961, life in East Germany (surveillance, Stasi), escape attempts, the Solidarity movement in Poland, Gorbachev's perestroika and glasnost, the peaceful revolution, the night the wall fell (November 9 1989), German reunification, and the end of communist Europe. Key concepts: communism, democracy, Iron Curtain, surveillance state, peaceful revolution, reunification, self-determination, sovereignty.",
    },
    {
        "slug": "climate-change",
        "title": "Climate Change Explained",
        "prompt": "Explain climate change comprehensively. Cover: the greenhouse effect (how it works), the difference between weather and climate, evidence for climate change (temperature records, ice cores, sea levels), what carbon dioxide and methane are, how fossil fuels cause emissions, the Paris Agreement, what 1.5°C and 2°C warming means, effects on different regions (Pacific islands, Australia's bushfires/bleaching), renewable energy (solar, wind, nuclear debate), carbon credits and emissions trading. Australia's role: coal exports, Great Barrier Reef, bushfire crisis 2019-20, renewable energy targets. Key concepts: greenhouse gas, fossil fuels, carbon footprint, renewable energy, Paris Agreement, net zero, carbon credits, adaptation vs mitigation.",
    },
]

SYSTEM = """You are an educational writer for The Daily Briefing, explaining major world events to young Australians (10-25 years old) with ZERO assumed knowledge.

Write clear, engaging educational content. Rules:
1. Explain EVERYTHING — assume the reader knows nothing
2. Use Australian English
3. Define every term when first used
4. Use analogies and examples from everyday life
5. Be balanced — show multiple perspectives
6. Connect to the reader's life where possible
7. Keep paragraphs short (2-3 sentences max)
8. No jargon without immediate explanation

Return ONLY valid JSON with these fields:
{
  "title": "...",
  "subtitle": "A one-sentence description",
  "sections": [
    {
      "heading": "Section title",
      "content": "Content with \\n\\n paragraph breaks"
    }
  ],
  "key_concepts": [
    {"term": "...", "definition": "...", "context": "How it relates to this event"}
  ],
  "timeline": [
    {"date": "1929", "event": "Brief description"}
  ],
  "why_it_still_matters": "2-3 sentences on why this matters today",
  "discussion_questions": ["Question 1?", "Question 2?", "Question 3?"]
}"""


def generate_event(event: dict) -> dict:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=6000,
        temperature=0.3,
        system=SYSTEM,
        messages=[{"role": "user", "content": event["prompt"]}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON found")

    data = json.loads(text[start : end + 1])
    data["slug"] = event["slug"]
    return data


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    all_events = []

    for event in EVENTS:
        print(f"Generating: {event['title']}...", end=" ", flush=True)
        try:
            data = generate_event(event)
            all_events.append(data)

            # Write individual file
            with open(DATA_DIR / f"learn-{event['slug']}.json", "w") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"done ({len(data.get('sections', []))} sections, {len(data.get('key_concepts', []))} concepts)")
        except Exception as e:
            print(f"ERROR: {e}")

    # Write index
    index = [
        {"slug": e["slug"], "title": e.get("title", ""), "subtitle": e.get("subtitle", "")}
        for e in all_events
    ]
    with open(DATA_DIR / "learn-index.json", "w") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Generated {len(all_events)} events")


if __name__ == "__main__":
    main()
