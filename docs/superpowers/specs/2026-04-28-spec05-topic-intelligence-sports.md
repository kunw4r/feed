# Spec #5 — Topic Intelligence: Sports

**Date:** 2026-04-28
**Status:** Designed
**Parent umbrella:** `2026-04-27-jarvis-vision-overview.md`
**Sub-project:** #5 of 6
**Dependencies:** Spec #1 must be live (Postgres+pgvector substrate required)

---

## Goal

Make brainfeed's sport coverage smart. When a story mentions Arsenal, the rendered story page includes the current EPL ladder — Arsenal's points, games played, games in hand vs title rivals, goal difference — and an inferred line like "Arsenal's win extends the lead to 4 points but City have a game in hand — if City win Wednesday, the lead drops to 1 with the same GD."

This is context-aware sport journalism that no mainstream news site delivers automatically. A human would spend five minutes cross-referencing results and tables to write this; brainfeed does it in the pipeline.

## Non-goals

- NBA, NFL, Formula 1, cricket, rugby union (deferred — add later if the patterns work)
- Live in-game score updates or push notifications
- Fantasy sport or betting tips
- User-customised team alerts (Mem0 territory, separate future spec)
- Historical match archive queries against the pgvector corpus
- Real-time animation of standings as rounds tick over

---

## Architecture

### Data sources

| Sport | Source | Auth | Rate limit | Notes |
|---|---|---|---|---|
| AFL + NRL | Squiggle API (`api.squiggle.com.au`) | None | Generous (free, open) | Ladders, results, fixtures, ML power rankings, predictions |
| EPL, La Liga, Serie A, Bundesliga, Ligue 1 | football-data.org | `FREE_TIER_KEY` header | 10 req/min, no daily cap | Real-time fixtures, standings, match events |
| ATP, WTA tennis | API Tennis (`api-tennis.com`) | `API_KEY` query param | ~500 req/day free tier | Rankings, match results, upcoming draws |

Squiggle is the single source for both AFL and NRL — simplifies the integration to one module with two endpoint paths rather than two clients.

### New backend modules

```
backend/
  integrations/
    squiggle.py          — SquiggleClient: get_ladder(sport), get_fixtures(sport), get_predictions(sport)
    football_data.py     — FootballDataClient: get_standings(league_id), get_fixtures(league_id), get_match(match_id)
    tennis_api.py        — TennisAPIClient: get_rankings(tour), get_recent_results(tour), get_upcoming(tour)
  agents/
    sport_analyst.py     — SportAnalystAgent: new agent (see below)
frontend/
  src/components/
    MiniLadder.tsx       — small standings table rendered on sport story pages
```

### New environment variables

```
FOOTBALL_DATA_API_KEY   # football-data.org free tier key
TENNIS_API_KEY          # api-tennis.com free tier key
# Squiggle requires no key
```

### sport_analyst agent

**File:** `backend/agents/sport_analyst.py`

**Input:**
- `story`: the raw story object (title, body, tier, category=SPORT)
- `league_context`: structured dict with current ladder, recent results, upcoming fixtures — fetched by the pipeline from the appropriate integration module based on sport/league detected in the story

**Output:**
- `enriched_analysis`: a paragraph written by Claude Sonnet that weaves the ladder position into the story's significance. E.g.: "Arsenal's 2-0 win over Everton moves them to 74 points — 4 clear of Manchester City, who have a game in hand. If City win Wednesday at Wolves, the gap narrows to 1 with identical goal difference. Four games remain; Arsenal's remaining schedule is harder on paper."
- `ladder_context`: a structured JSON field for the frontend mini-table, containing the top N teams' positions, points, GD, games played, games in hand vs the story's primary team

**Model:** Claude Sonnet (same as simplifier — clear context, structured output, cost-effective)

**Prompt strategy:** System prompt includes the ladder data as a structured block. User turn contains the story. Agent is instructed: "Do not invent stats. If the ladder data does not support a clear inference, omit the prediction."

**Failure mode:** If the integration returns no data (API down, off-season, sport not matched), `sport_analyst` returns `None` for both fields — pipeline continues without enrichment, story is processed by regular simplifier unchanged.

### MiniLadder component

**File:** `frontend/src/components/MiniLadder.tsx`

Renders a compact standings table on sport story pages. Inputs: the `ladder_context` field from the story object. Shows: position, club/team name, played, points, GD, and a "games in hand" column if relevant. Highlights the story's primary team. Collapsible on mobile.

Only renders if `ladder_context` is non-null — graceful no-op for stories without enrichment.

### Pipeline integration

Current pipeline order: `categoriser → ranker → verifier → simplifier → deep_thinker → story_linker → predictor → embedder → save_briefing`

New order when `category == SPORT`:
```
... → verifier → sport_analyst → simplifier → deep_thinker → story_linker → predictor → embedder → save_briefing
```

`sport_analyst` runs after verifier (needs a verified story) and before simplifier (simplifier incorporates the enriched analysis when writing the human-readable version). For all non-sport stories, pipeline is unchanged — the branch is a single conditional check in `pipeline.py`.

The pipeline must:
1. Detect sport + league from the story (keyword matching or a cheap Haiku classification call)
2. Fetch the relevant league context from the appropriate integration module
3. Pass both to `sport_analyst`
4. Merge `enriched_analysis` and `ladder_context` into the story object before handing to simplifier

---

## Phases

| # | Name | User-visible? | Estimated effort |
|---|---|---|---|
| 1 | Data layer | No | 2–3 days |
| 2 | sport_analyst agent | No (backend only) | 2 days |
| 3 | Pipeline integration | Backend-visible (API response enriched) | 1 day |
| 4 | MiniLadder + sport story UI | Yes — sport stories show standings table | 2 days |
| 5 | Predictor specialisation for sport | Yes — predictions reference real ladder numbers | 1 day |

### Phase 1 — Data layer (2–3 days)

**Deliverables:**
- `backend/integrations/squiggle.py` with `SquiggleClient`
  - `get_ladder(sport: Literal["afl", "nrl"]) -> list[TeamStanding]`
  - `get_fixtures(sport, limit=5) -> list[Fixture]`
  - `get_predictions(sport) -> list[Prediction]`
- `backend/integrations/football_data.py` with `FootballDataClient`
  - `get_standings(league_id: int) -> list[TeamStanding]`
  - `get_fixtures(league_id: int, from_date: date, to_date: date) -> list[Fixture]`
  - Supported `league_id` constants: EPL=2021, La Liga=2014, Serie A=2019, Bundesliga=2002, Ligue 1=2015
- `backend/integrations/tennis_api.py` with `TennisAPIClient`
  - `get_rankings(tour: Literal["atp", "wta"], limit=10) -> list[PlayerRanking]`
  - `get_upcoming(tour, days=7) -> list[Match]`
- Pydantic models for `TeamStanding`, `Fixture`, `Prediction`, `PlayerRanking`, `Match` in `backend/models/sport.py`
- Fixture files (JSON) for unit tests — captured from real API responses

**Test plan:**
- Unit: parse fixture JSON into Pydantic models, assert field mapping. No network calls.
- Integration: live calls to each API (run manually, guarded by env var `RUN_LIVE_TESTS=1`). Assert non-empty response and correct shape.
- Manual smoke: `python -c "from backend.integrations.squiggle import SquiggleClient; import asyncio; print(asyncio.run(SquiggleClient().get_ladder('afl')))"`

### Phase 2 — sport_analyst agent (2 days)

**Deliverables:**
- `backend/agents/sport_analyst.py`
- System prompt constant `SPORT_ANALYST_PROMPT` stored in the file
- `SportAnalystAgent.analyse(story, league_context) -> SportEnrichment | None`
- `SportEnrichment` dataclass: `enriched_analysis: str`, `ladder_context: dict`
- New columns on `stories` table: `ladder_context jsonb`, `sport_enrichment text`

**Test plan:**
- Unit: `SportAnalystAgent.analyse(story_fixture, league_context_fixture)` with LLM mocked. Assert output matches `SportEnrichment` shape, assert no stats hallucination when ladder data is absent (agent returns None).
- Integration: real Claude Sonnet call with a captured AFL ladder and a synthetic AFL story. Manually review output for plausibility.
- Manual smoke: run `python scripts/test_agents.py --agent sport_analyst --story <id>` against a real recent sport story.

### Phase 3 — Pipeline integration (1 day)

**Deliverables:**
- `backend/scheduler/pipeline.py`: add sport routing logic. Function `_get_league_context(story) -> dict | None` that:
  1. Checks `story.category == SPORT`
  2. Detects sport/league by keyword list (e.g., "AFL", "Collingwood", "Arsenal", "EPL", "Djokovic")
  3. Calls appropriate integration client
  4. Returns structured context, or `None` if unrecognised
- `SportAnalystAgent` called if `league_context` is not None
- Story saved with `ladder_context` and `sport_enrichment` fields populated
- Existing pipeline unit tests still pass (non-sport stories unchanged)

**Test plan:**
- Unit: `_get_league_context` with keyword fixture stories — assert correct sport/league detected.
- Integration: run full pipeline on one AFL story and one EPL story (use `POST /api/pipeline/trigger` dev endpoint). Assert DB row has non-null `ladder_context`.
- Manual smoke: open a sport story in the browser, confirm the API response includes `ladder_context`.

### Phase 4 — MiniLadder + sport story UI (2 days)

**Deliverables:**
- `frontend/src/components/MiniLadder.tsx`: renders `ladder_context` JSON as a styled standings table
  - Highlights the story's primary team with a coloured row
  - Shows: Pos, Team, P, Pts, GD, GiH (games in hand, if present)
  - Collapsible on mobile (default collapsed)
  - No-ops cleanly if `ladder_context` is null
- `/story/[id]/` page: renders `<MiniLadder>` below the story header and above the body, only when `ladder_context` is present
- `sport_enrichment` text rendered as a styled callout block ("Context" heading, distinct background) after the first paragraph of `simplified_body`

**Test plan:**
- Unit: `MiniLadder` renders correctly with fixture `ladder_context`, renders nothing with `null`.
- Integration: Playwright (or manual): open a sport story, assert `MiniLadder` is visible and primary team is highlighted.
- Manual smoke: open on mobile, confirm table collapses.

### Phase 5 — Predictor specialisation for sport (1 day)

**Deliverables:**
- `backend/agents/predictor.py`: add sport-aware branch. When `ladder_context` is non-null, inject it into the predictor system prompt: "The following current ladder data is confirmed accurate. Your ripple_effect predictions must reference specific points/positions from this data. Do not state things the ladder already proves — only project forward."
- Result: predictions like "If Arsenal win their remaining four games, they clinch on the final day regardless of City's results" instead of generic "Arsenal could win the title."

**Test plan:**
- Unit: predictor prompt builder with `ladder_context` fixture — assert ladder data appears in assembled prompt.
- Integration: real Claude Sonnet call with AFL ladder + story. Assert predictions contain specific round/points references.
- Manual smoke: compare a sport story's `ripple_effects` before and after this phase. Confirm improvement.

---

## Test plan: anticipated failure modes

| Failure mode | Likely cause | Test that catches it |
|---|---|---|
| Squiggle returns 503 | API down or rate limited | Integration test with retry mock; pipeline continues without enrichment |
| football-data.org returns 429 | 10 req/min exceeded if pipeline batches too fast | Rate-limiter in `FootballDataClient` (token bucket); unit test asserts limiter fires |
| League not detected for a sport story | Story about a regional competition (e.g., Sheilas Wheels Cup) | `_get_league_context` returns `None`; pipeline runs unchanged — unit test with unrecognised keyword asserts None |
| `sport_analyst` hallucinates stats | Model ignores "do not invent" instruction | Integration test compares `enriched_analysis` against `league_context` fixture — assert every stat in the text exists in the fixture |
| `ladder_context` JSON fails frontend parse | Backend sends malformed JSON | Pydantic serialisation in API schema; frontend `MiniLadder` has a try/catch that renders nothing on parse error |
| Off-season request (no current ladder) | AFL break, tennis off-season | Integration client returns empty list; `sport_analyst` receives empty context, returns `None` |
| Tennis story ignored (only team sports enriched) | Keyword detection misses player names | Unit test with Djokovic/Swiatek story confirms `TennisAPIClient` is called |

---

## Memory hooks

**Read (before each Claude turn involving a sport story):**
- Load user's followed sports and teams from Mem0: e.g., "user follows Arsenal and the Wallabies"
- Use to: prioritise which team's table position to foreground in `sport_enrichment`, and which tier of prediction to lead with

**Write:**
- When user reads or asks a follow-up about a team they haven't been associated with, record the new interest: `{"user_follows_team": "Brisbane Roar", "sport": "A-League", "first_seen": "2026-04-28"}`
- When user explicitly asks Jarvis "what's happening with [team]?", record as strong signal vs incidental reading

---

## Open implementation questions

1. **Football API breadth:** stick with football-data.org (top-5 European only), or add api-sports.io (also covers NFL, F1, basketball) to unify under one key? Trade-off: api-sports.io free tier is more restrictive (100/day); football-data.org is more generous (10/min, no daily cap). Documented, not decided.

2. **Squiggle ML predictions:** Squiggle returns its own ML-generated win probabilities and power rankings. Should these surface in brainfeed analysis ("Squiggle gives Brisbane a 63% chance on Friday"), or do we generate our own via Claude? Risk of double-attribution confusion.

3. **Off-season handling:** when a story references a sport in its off-season (no active ladder), should the story page show last season's final standings, or omit the mini-table entirely? User preference needed.

4. **League detection method:** simple keyword list vs. a cheap Haiku classification call. Keyword list is fast and free; Haiku is more robust for international competitions. Start with keywords, upgrade if false-negative rate is too high.

---

## Decision log

- **football-data.org over api-sports.io**: free tier is 10 req/min with no daily cap vs api-sports.io's 100/day. Better fit for a pipeline that might process 10+ sport stories per run. Recorded 2026-04-28.
- **Squiggle as single source for AFL + NRL**: avoids maintaining two separate integration clients for Australian football codes. The API covers both with the same query shape. Recorded 2026-04-28.
- **New `sport_analyst` agent rather than overloading `simplifier`**: simplifier's responsibility is clear prose from a verified story. Adding ladder awareness there would bloat the prompt and mix concerns. Separate agent keeps responsibilities clean and lets each be tested in isolation. Recorded 2026-04-28.
- **sport_analyst runs before simplifier**: this means the simplifier can incorporate `enriched_analysis` into the readable prose rather than the two being separate and potentially contradictory. Recorded 2026-04-28.
- **Pydantic models for all integration outputs**: ensures the pipeline never passes raw API JSON into Claude prompts — only typed, validated fields. Reduces prompt injection surface and makes unit testing trivial. Recorded 2026-04-28.

---

## Out of scope

- NBA, NFL, Formula 1, cricket, rugby union (add later)
- Live in-game updates or real-time score tickers
- Fantasy sport and betting integrations
- User-customised team alerts (Mem0 territory, future spec)
- Historical season archive queries against pgvector corpus
- Cross-sport "what's on this weekend" digest
