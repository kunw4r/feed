# Spec #1 — Brainfeed as Product + Jarvis Tool

**Date:** 2026-04-27
**Status:** Designed, awaiting user review
**Parent umbrella:** `2026-04-27-jarvis-vision-overview.md`
**Sub-project:** #1 of 4

---

## Goal

Make brainfeed a polished standalone news-reading website that's good enough that someone would visit it daily, AND wire it cleanly into Jarvis as a curated-stories tool. Migrate to Postgres+pgvector now (cheap window, no archive yet) so the future knowledge-graph layer is just a query layer over existing data.

## Non-goals (out of scope for this spec)

- Knowledge-graph query layer (semantic-similarity queries against embeddings). Embeddings are *stored* in this spec; queried in a future spec.
- Auth, accounts, personalisation per user. Single-tenant.
- Push notifications, email digest, RSS export. Polish read experience only.
- Voice in brainfeed itself. Voice is for Jarvis (spec #2).
- Replacing the existing per-story `/api/chat` endpoint (Haiku-powered story Q&A). Stays as-is.

---

## Architecture changes

### Database
- **Before**: SQLite (`DATABASE_URL=sqlite:///./data/briefing.db`)
- **After**: Postgres 16 + pgvector extension, locally via Docker for dev, hosted (Neon/Supabase/Railway) for prod
- New `embedding vector(1536)` column on `stories` table (OpenAI `text-embedding-3-small` dimensions)
- New `ripple_effects jsonb` column on `stories` table (array of `{summary: str, horizon: str, confidence: float}`)
- Migration tool: Alembic (or simple script — there's no existing data to preserve, so a fresh schema is fine)

### Pipeline (new steps)
The existing pipeline order (per `backend/scheduler/pipeline.py`) is: `categoriser → ranker → verifier → simplifier → deep_thinker → story_linker → save_briefing`. New steps slot in after `story_linker`:
```
... → deep_thinker → story_linker → predictor → embedder → save_briefing
```
- `predictor` (new agent) — Sonnet, generates 2–3 ripple_effects per story with `impact_score >= 60`. Lower-impact stories get an empty array (don't waste tokens).
- `embedder` — calls OpenAI `text-embedding-3-small` on `simplified_title + " " + simplified_body`, stores vector. Silent — no user-visible output. Errors don't crash pipeline (vector stays NULL, story still saves).

### Backend API additions
| Endpoint | Status | Purpose |
|---|---|---|
| `GET /api/briefings/today` | NEW (file is empty stub) | Returns today's curated 15 stories grouped by tier. Falls back to most recent briefing if today's pipeline hasn't run yet. |
| `GET /api/briefings/{date}` | NEW | Archive lookup. 404 if no briefing for that date. |
| `GET /api/stories/{id}/related` | NEW | Returns related stories from `related_story_ids`. |
| `GET /api/stories` | EXISTS — keep | Paginated raw stories list (used by Jarvis `list_brief_stories`). |
| `GET /api/stories/{id}` | EXISTS — keep | Single story by ID. |
| `POST /api/chat` | EXISTS — keep | Per-story Q&A with Haiku. |

### Frontend changes (read-experience polish)
| Component | Change |
|---|---|
| `BriefingCard.tsx` | Render `quick_summary`, `category` badge, `impact_score` indicator, source-count |
| Story page `/story/[id]/` | New section: **"Why this matters"** callout (renders `why_it_matters`), **"Concepts"** inline-glossary chips (renders `concepts[]`), **"What might happen next"** ripple-effects callout (renders `ripple_effects[]`), **"Go deeper"** toggle revealing `deep_analysis`, **"Related stories"** sidebar (calls `/api/stories/{id}/related`), **"Sources"** panel showing publisher names + confidence badge (renders `sources[]` + `confidence`) |
| `SourcePanel.tsx` | New: confidence meter (0–1 → "Single source / Confirmed / Multi-confirmed") |
| `DepthToggle.tsx` | Already conceptually exists per CLAUDE.md (Quick / Standard / Deep). Wire to actual data switching: Quick = `quick_summary`, Standard = `simplified_body`, Deep = `simplified_body` + `deep_analysis` + `ripple_effects` |
| Dark/light theme | Already shipped (commit b660902). No changes. |

### Jarvis tool additions
| Tool | Status |
|---|---|
| `get_daily_briefing` | NEW. Returns the curated 15 stories for today, grouped by tier, with a tier filter param. |
| `list_brief_stories` | EXISTS, verify works end-to-end. Sharpen description: "raw paginated archive" not "today's brief" — push Claude toward `get_daily_briefing` for "what's the brief?" queries. |
| `get_brief_story` | EXISTS, verify works end-to-end. |

### Environment additions
| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | brainfeed `.env` | Update to `postgresql://...` |
| `OPENAI_API_KEY` | brainfeed `.env` | For embedding API calls |
| `BRAINFEED_URL` | jarvis `.env` | Already exists; verify points at correct port |

---

## Phases (each independently shippable)

### Phase 1 — Postgres + pgvector migration (~1–2 days)
**Deliverables:**
- `docker-compose.yml` adds `postgres:16` service with pgvector extension
- New schema: stories table includes `embedding vector(1536)` and `ripple_effects jsonb`
- `backend/database/connection.py` swaps to `psycopg` (or `asyncpg`) + SQLAlchemy
- Repos updated: `story_repo`, `briefing_repo` use Postgres
- `.env.example` updated
- README updated with `docker compose up postgres` step

**Done when:**
- `python scripts/run_pipeline.py` runs against Postgres without errors
- `pytest backend/tests/test_repos.py` passes (write basic CRUD tests if missing)

**Tests:** unit tests on repos (insert + retrieve a Story, list with tier filter, get by id, related-stories query). No frontend changes — fully invisible phase.

---

### Phase 2 — Briefings endpoints + pipeline verification (~1–2 days)
**Deliverables:**
- `backend/api/routes/briefings.py` implements `/today`, `/{date}`, `/latest?limit=N`
- `backend/api/routes/stories.py` adds `/{id}/related`
- `briefing_repo.get_today()` with fallback-to-most-recent logic
- Pipeline runs end-to-end and produces at least one fresh briefing (manual smoke)
- Frontend at `localhost:3000` loads today's briefing without errors

**API contract — `GET /api/briefings/today`:**
```json
{
  "date": "2026-04-27",
  "regions": {
    "OCEANIA": [Story, Story, ...],
    "ASIA_PACIFIC": [...],
    "GLOBAL": [...]
  },
  "total_stories": 15,
  "is_today": true
}
```
`is_today` is `false` when fallback-to-most-recent triggered. Frontend can show a "showing yesterday's briefing" notice.

**Done when:**
- Frontend home page loads with real data, no errors in console
- Archive page can navigate to a past date and loads (or shows clean 404 for dates with no briefing)

**Tests:** integration test calls `GET /api/briefings/today` against a seeded test DB; asserts shape + that `is_today` flag is correct. Smoke step: load `localhost:3000` in browser, verify visually.

---

### Phase 3 — Reading UX polish (~2–3 days)
**Deliverables:**
- Story page renders all six new sections (why-it-matters, concepts, ripple-effects placeholder for now, deep-analysis toggle, related-stories sidebar, sources panel)
- DepthToggle (Quick/Standard/Deep) actually swaps content
- Concept chips show inline tooltip on hover with `definition + context`
- Source panel shows confidence as a labeled meter
- Mobile responsive (stacked layout under 768px)

**Done when:**
- A story with all fields populated renders cleanly desktop + mobile
- A story with missing fields (e.g., no `deep_analysis`, no `ripple_effects`) gracefully hides those sections — no empty boxes
- Dark and light themes both look good (manual smoke)

**Tests:**
- Component tests for `StoryPage` with three fixtures: full story, partial story (missing optional fields), empty story
- Manual smoke: pick three stories from different categories, click through Quick/Standard/Deep, verify hover tooltips on concepts work, switch themes — confirm nothing's broken

---

### Phase 4 — Embeddings + predictor agent + ripple-effects UI (~3–4 days)
**Deliverables:**
- `backend/agents/predictor.py` — new agent. Sonnet. Input: a Story with `simplified_body` and `deep_analysis`. Output: 2–3 `ripple_effects` for stories with `impact_score >= 60`, empty array otherwise.
- `backend/ingestion/embedder.py` — new module. Calls OpenAI `text-embedding-3-small` on each story, stores vector. Errors logged but don't crash pipeline.
- `backend/scheduler/pipeline.py` — adds predictor + embedder steps in correct order
- Frontend renders `ripple_effects` as a "What might happen next" callout on story page
- Logging: token usage + cost per pipeline run logged at INFO

**Predictor prompt structure (in `predictor.py`):**
- System: "You produce ripple-effect predictions for news stories. For each story, output 2–3 likely second-order effects with a time horizon (days/weeks/months) and a confidence (low/medium/high). Be specific — avoid 'this could lead to volatility' fortune-cookie filler. If you can't make a specific prediction, output an empty array."
- User: simplified body + deep analysis + impact score + category
- Output: structured JSON, validated against `ripple_effects` schema

**`ripple_effects` field shape:**
```json
[
  {
    "summary": "Mortgage holders on variable rates likely to see repayments rise within 2-3 months",
    "horizon": "weeks",
    "confidence": "high"
  }
]
```

**Done when:**
- Pipeline run produces ripple_effects for high-impact stories (manually inspect 5)
- Frontend shows the callout for stories that have it, hides for stories that don't
- Embeddings are stored for every story (verify with `SELECT count(*) FROM stories WHERE embedding IS NOT NULL`)
- Cost per pipeline run logged and reasonable (<$1/day expected)

**Tests:**
- Unit: predictor prompt builder produces correct structure given a Story
- Unit: embedder handles OpenAI errors gracefully (returns None, doesn't raise)
- Integration: full pipeline run on a small test fixture (5 stories) — assert ripple_effects populated for high-impact ones, embeddings stored for all
- Manual quality check: read 10 ripple_effects across 5 stories. Are any "fortune cookie" filler? If >2/10, sharpen the prompt and re-run.

---

### Phase 5 — Jarvis tool wiring (~0.5 day)
**Deliverables:**
- `jarvis/src/lib/brainfeed.ts` adds `getDailyBriefing` function calling `GET /api/briefings/today`
- `jarvis/src/lib/tools.ts` adds `get_daily_briefing` tool definition + dispatcher case
- Sharpen `list_brief_stories` description: "Use for archive lookups or paginated browsing — NOT for 'today's brief' (use get_daily_briefing for that)"
- Manual smoke: run brainfeed + jarvis locally, ask Jarvis "what's today's briefing?" — verify it calls `get_daily_briefing` and produces the expected 3-5 bullet morning brief format from the system prompt.

**Done when:**
- Jarvis chat: "what's today's briefing?" — returns a tight summary sourced from brainfeed
- Jarvis chat: "tell me more about the second one" — successfully calls `get_brief_story` with the right ID
- Jarvis chat: "what's been happening with [topic] lately?" — picks `search_news` (worldmonitor GDELT) over `list_brief_stories`, since it's an archive search not a daily-brief query

---

## Memory hooks (cross-cutting per umbrella)

For this sub-project specifically, Mem0 should:
- **Read**: at conversation start, load any saved facts about briefing preferences ("user prefers brief summaries", "user already saw the BHP story", "user is following the Ukraine thread"). Inject into system prompt.
- **Write**: when the user follows up on a story ("more on that one"), record "user is interested in [topic]" so future briefings can highlight it. When the user dismisses a topic ("I don't care about crypto"), record that.

Memory write/read isn't blocking for spec #1 — note the hook points in code (`// TODO(memory): write user preference here`) but defer actual Mem0 client wiring to whenever it's first needed across sub-projects. Don't build a Mem0 client just for spec #1.

---

## Anticipated failure modes → tests that catch them

| Failure mode | Test that would catch it |
|---|---|
| Pipeline silently produces 0 stories | Phase 2 smoke step explicitly counts stories and asserts ≥10 |
| `briefings/today` returns stale "today" date when pipeline didn't run | Endpoint returns `is_today: false` when fallback used; test asserts this flag |
| Tool returns 50KB JSON, blows Claude's context budget | tools.ts already truncates at 20KB — Phase 5 test sends a 30-story payload and asserts truncation works |
| Claude consistently picks `get_feed_digest` (worldmonitor) over `get_daily_briefing` (brainfeed) for "what's today's briefing?" | Phase 5 manual smoke step #1 explicitly checks this; if wrong, sharpen tool descriptions |
| Predictor outputs fortune-cookie filler ("this could lead to volatility") | Phase 4 manual quality check on 10 predictions; if >2/10 are filler, iterate on the prompt |
| Embedding API costs balloon | Phase 4 logs cost per run; alert if >$2/day |
| Postgres migration breaks existing local dev | Migration phase ships before any other phase touches code; pure infra change; old SQLite repo is deleted, not kept as a fallback (no half-state) |
| Frontend shows empty callout boxes for stories missing optional fields | Phase 3 fixture test for "partial story" |
| pgvector embeddings are NULL because OpenAI key missing | Embedder logs WARNING; pipeline continues; tests have a fixture with a mocked-failure embedder asserting graceful degradation |
| Claude hallucinates story IDs when user asks "tell me more about that one" | Phase 5 smoke step explicitly tests follow-up; if Claude makes up IDs, system prompt needs to remind it to only use IDs it just received |

---

## Open implementation questions (decide during writing-plans)

- **Postgres host for prod**: Neon vs Supabase vs Railway vs Fly. All work; Neon is cheapest at small scale with pgvector. Pick during P1.
- **Embedding model**: `text-embedding-3-small` (1536d, $0.02/1M) vs `text-embedding-3-large` (3072d, $0.13/1M). Default to `small` — corpus too small to need higher quality, cost matters at daily-pipeline cadence.
- **Predictor model**: Sonnet vs Opus. Default to Sonnet — predictor is structured generation, doesn't need Opus's reasoning. Re-evaluate after manual quality check in P4.
- **DepthToggle UX**: tabs vs segmented control vs accordion. Defer to P3 implementation.

---

## Decision log

- **Postgres + pgvector now, not later** — per Gemini's "data gravity" argument: cheap migration window now (no real archive), expensive later.
- **Predictions agent uses Sonnet, not Opus** — structured output, doesn't need deepest reasoning.
- **Embeddings populated but not queried in spec #1** — knowledge-graph query layer is a future spec; embeddings are an infra investment now.
- **Brainfeed UX polish is Phase 3, not "nice to have later"** — the user explicitly framed brainfeed as "should be a nice news app", so polish is in scope, not optional.
- **Mem0 client wiring deferred** — note hook points in code, build the actual client when first needed across sub-projects.
