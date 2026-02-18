# The Daily Briefing — AI-Powered News Intelligence Platform

## Project Overview

An AI-powered news platform that delivers 15 curated, verified, and simplified news stories daily across three tiers: Local (Brisbane/QLD), National (Australia), and Global. Stories are rewritten so anyone — including a 10-year-old with zero context — can understand what's happening, why it matters, and what might happen next.

This is NOT a news aggregator. It's a **news comprehension engine**.

## Core Philosophy

- Clarity over complexity: Every story understandable without assumed context
- Verification over speed: Multi-source verification before publication
- Depth over volume: 15 high-impact stories beats 100 unfiltered headlines
- Connection over isolation: Stories link to history and project forward

## Tech Stack

- Frontend: React + Next.js (TypeScript), Tailwind CSS
- Backend: FastAPI (Python 3.11+)
- Database: PostgreSQL + pgvector (for semantic search/knowledge graph)
- LLM: Anthropic Claude API (Haiku for classification, Sonnet for rewriting, Opus for deep analysis)
- Task Scheduling: APScheduler
- Deployment: Vercel (frontend) + Railway or Fly.io (backend)
- RSS Parsing: feedparser (Python)
- News APIs: NewsAPI.org (global), GNews API (backup)

## Project Structure
```
the-daily-briefing/
├── CLAUDE.md
├── SPEC.md
├── README.md
├── docker-compose.yml
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/
│   │   ├── settings.py
│   │   └── sources.py
│   ├── ingestion/
│   │   ├── rss_collector.py
│   │   ├── api_collector.py
│   │   └── deduplicator.py
│   ├── agents/
│   │   ├── base_agent.py
│   │   ├── categoriser.py
│   │   ├── ranker.py
│   │   ├── verifier.py
│   │   ├── simplifier.py
│   │   └── deep_thinker.py
│   ├── models/
│   │   ├── story.py
│   │   ├── source.py
│   │   ├── briefing.py
│   │   └── category.py
│   ├── database/
│   │   ├── connection.py
│   │   ├── migrations/
│   │   └── repositories/
│   │       ├── story_repo.py
│   │       └── briefing_repo.py
│   ├── scheduler/
│   │   ├── pipeline.py
│   │   └── jobs.py
│   └── api/
│       ├── routes/
│       │   ├── briefings.py
│       │   ├── stories.py
│       │   └── health.py
│       └── schemas/
│           ├── briefing_schema.py
│           └── story_schema.py
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── archive/page.tsx
│       │   └── story/[id]/page.tsx
│       ├── components/
│       │   ├── BriefingCard.tsx
│       │   ├── TierSection.tsx
│       │   ├── CategoryBadge.tsx
│       │   ├── SourcePanel.tsx
│       │   ├── DepthToggle.tsx
│       │   ├── StoryThread.tsx
│       │   └── Header.tsx
│       ├── lib/
│       │   ├── api.ts
│       │   └── types.ts
│       └── styles/globals.css
└── scripts/
    ├── seed_sources.py
    ├── run_pipeline.py
    └── test_agents.py
```

## Coding Standards

- Python: Type hints everywhere, async where possible
- TypeScript: Strict mode, no `any` types
- Agent prompts stored as constants in each agent file
- Environment variables for all API keys (never hardcoded)
- A failed agent must not crash the pipeline
- Each agent logs inputs, outputs, and processing time
- Australian English (en-AU) in all user-facing content

## Key Data Models

### Story
- id: UUID
- title: str (original headline)
- simplified_title: str (plain language headline)
- simplified_body: str (plain language, Standard depth)
- quick_summary: str (one sentence, Quick depth)
- deep_analysis: Optional[str] (historical context + implications, Deep depth)
- tier: LOCAL | NATIONAL | GLOBAL
- category: POLITICS_POLICY | ECONOMY_MARKETS | SCIENCE_TECH | SOCIETY_CULTURE | ENVIRONMENT_CLIMATE | CRIME_SAFETY | HEALTH
- impact_score: float (0-100)
- sources: List[Source]
- source_count: int
- confidence: float (0-1)
- related_story_ids: List[UUID]
- created_at: datetime
- published_date: date

## News Sources

### Local (Brisbane/QLD)
- ABC News Brisbane: https://www.abc.net.au/news/feed/51120/rss.xml (RSS)
- 9News Brisbane: https://www.9news.com.au/rss (RSS, filter QLD)
- Brisbane Times: https://www.brisbanetimes.com.au/rss/feed.xml (RSS)
- Courier Mail: https://www.couriermail.com.au/rss (RSS)
- Brisbane City Council: https://www.brisbane.qld.gov.au (RSS)

### National (Australia)
- ABC News: https://www.abc.net.au/news/feed/45910/rss.xml (RSS)
- SBS News: https://www.sbs.com.au/news/feed (RSS)
- The Guardian AU: https://www.theguardian.com/au/rss (RSS)
- The Conversation AU: https://theconversation.com/au/articles.atom (Atom)

### Global
- BBC World: http://feeds.bbci.co.uk/news/world/rss.xml (RSS)
- Reuters: https://www.reutersagency.com/feed/ (RSS)
- AP News: Via NewsAPI (API)
- Al Jazeera: https://www.aljazeera.com/xml/rss/all.xml (RSS)
- The Guardian World: https://www.theguardian.com/world/rss (RSS)
- DW News: https://rss.dw.com/rdf/rss-en-all (RSS)

## Agent Pipeline

RSS Feeds + APIs → Collector (~200+ stories/day) → Deduplicator → Categoriser (Haiku) → Ranker (Haiku) → Verifier (Sonnet) → Simplifier (Sonnet) → Deep Thinker (Opus) → Publisher (DB + frontend)

## Impact Scoring Rubric (Ranker)

- Breadth of effect (25/100): How many people affected?
- Consequence severity (25/100): What's at stake?
- Novelty (20/100): New development or rehash?
- Connectedness (15/100): Links to ongoing threads?
- Category balance (15/100): Boost underrepresented categories

## Simplifier Rules

1. No jargon — explain terms inline
2. No acronyms without expansion on first use
3. Para 1: What happened (one sentence)
4. Para 2: Why it matters / who it affects
5. Para 3: What might happen next
6. Background section for ongoing stories
7. Max 300 words (Standard), 1 sentence (Quick)
8. Australian English (en-AU)
9. Tone: Friendly, clear, like a smart older sibling

## API Endpoints

- GET /api/briefings/today
- GET /api/briefings/{date}
- GET /api/briefings/latest?limit=7
- GET /api/stories/{id}
- GET /api/stories/{id}/deep
- GET /api/stories/{id}/related
- GET /api/health
- POST /api/pipeline/trigger (dev only)

## Environment Variables

- ANTHROPIC_API_KEY
- DATABASE_URL (postgresql)
- REDIS_URL
- NEWS_API_KEY (newsapi.org)
- GNEWS_API_KEY (gnews.io, backup)
- ENVIRONMENT (development | staging | production)
- PIPELINE_SCHEDULE (cron, default: 0 5 * * * for 5am AEST)
- LOG_LEVEL

## Commands
```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev

# Pipeline
python scripts/run_pipeline.py
```