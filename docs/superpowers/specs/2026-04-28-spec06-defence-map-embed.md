# Spec #6 — Defence Map Embed

**Date:** 2026-04-28
**Status:** Designed
**Parent umbrella:** `2026-04-27-jarvis-vision-overview.md`
**Sub-project:** #6 of 6
**Dependencies:** Spec #1 must be live (story page infrastructure). Natural overlap with Spec #3 (Jarvis→worldmonitor control) — if both are built, build #3 first, then layer this on top.

---

## Goal

On brainfeed defence story pages, render a live defence map showing nearby military activity — ships and aircraft — drawn from the user's worldmonitor instance. Without re-implementing worldmonitor's data layer inside brainfeed.

When a story says "the USS Carl Vinson has entered the South China Sea", the page shows a deck.gl map zoomed to the South China Sea with the carrier's current AIS position and any nearby military assets worldmonitor is tracking.

---

## Constraint: AGPL licence boundary

Worldmonitor is licensed under AGPL v3. If brainfeed imports, vendors, or statically links any worldmonitor code, brainfeed inherits the AGPL licence. To keep brainfeed under its own proprietary licence, **brainfeed must interact with worldmonitor exclusively over the network** — HTTP API or iframe. No `import`, no `require`, no copy-pasting worldmonitor source into brainfeed's codebase.

This constraint is hard. It must be documented here and referenced in any future PR that touches the worldmonitor integration. If a developer proposes vendoring worldmonitor code for performance reasons, that decision requires an explicit licence review and likely a dual-licence arrangement with the worldmonitor maintainer.

---

## Architecture options

### Option A — iframe embed

Embed `worldmonitor.app/defence-view?region=south-china-sea` in an iframe on brainfeed defence story pages. Worldmonitor renders its own map; brainfeed just sizes the frame.

**Pros:** Zero integration work on brainfeed side. Inherently AGPL-safe (iframe content is cross-origin).
**Cons:** Cross-origin restrictions limit communication (can only use `postMessage`). Worldmonitor's full UI chrome appears inside the frame. No brainfeed branding or custom styling. Zoom/filter controls must be implemented in worldmonitor's `defence-view` route specifically for this purpose.

### Option B — HTTP API (RECOMMENDED)

Brainfeed makes HTTP calls to a self-hosted worldmonitor instance for ship and aircraft position data. Brainfeed renders its own minimal deck.gl map with that data. Worldmonitor is the data source; brainfeed is the renderer.

**Pros:** Brainfeed controls the map UX entirely. Custom styling, tight visual integration with story content, no worldmonitor chrome. AGPL-safe (HTTP is a clear network boundary). Map can be story-context-aware (auto-zoom to mentioned region, filter to relevant vessel types). Faster — no full page load for worldmonitor's app.
**Cons:** Worldmonitor must expose clean JSON endpoints for vessel and flight positions (Phase 1 work in the worldmonitor repo). Brainfeed carries deck.gl as a dependency.

### Option C — native build

Brainfeed builds its own defence map from public sources: AISHub (vessel AIS), OpenSky Network (aircraft transponders). No worldmonitor dependency at all.

**Pros:** Fully independent. Maximum control.
**Cons:** AISHub and OpenSky data quality is significantly lower than worldmonitor's USNI-fused military vessel layer. AIS is opt-in — military vessels routinely go dark. Most of the engineering work is duplicated from worldmonitor. Defeats the purpose of having worldmonitor.

### Recommendation: Option B, with Option A as fallback

Option B is the right call if worldmonitor exposes the necessary endpoints (Phase 1). If Phase 1 is delayed — worldmonitor work is blocked or deprioritised — fall back to Option A using `postMessage` for region sync until the API is ready.

Option C is only viable if the user decides to decommission worldmonitor.

---

## Architecture (Option B detail)

### Worldmonitor API endpoints (Phase 1 — worldmonitor repo)

These endpoints live in the worldmonitor codebase, not brainfeed. Spec records them here for clarity.

```
GET /api/military/vessels
  Query params: region (bounding box: lat_min, lon_min, lat_max, lon_max), limit (default 100)
  Response: { vessels: [{ mmsi, name, lat, lon, heading, speed, vessel_type, flag, last_seen }] }

GET /api/military/flights
  Query params: region (bounding box), limit (default 100)
  Response: { flights: [{ icao24, callsign, lat, lon, altitude, heading, speed, aircraft_type, last_seen }] }
```

Authentication: local API key header (`X-WM-Key`). Brainfeed stores the key in `WORLDMONITOR_API_KEY` env var.

### Brainfeed additions

**New component:** `frontend/src/components/DefenceMap.tsx`
- Uses `deck.gl` (already in the React ecosystem; add to `package.json`)
- Renders a `MapView` with `ScatterplotLayer` for vessels + `IconLayer` for aircraft
- Props: `region: BoundingBox`, `vessels: Vessel[]`, `flights: Flight[]`
- Handles loading state (spinner), error state (soft fail — "Map unavailable"), empty state (no tracked activity in region)
- Story-context-aware: if story text mentions a region keyword (South China Sea, Persian Gulf, Baltic, Red Sea, Indo-Pacific), the map auto-zooms to that region

**New API route in brainfeed:** `GET /api/defence/context?region=south-china-sea`
- Brainfeed backend calls worldmonitor at `WORLDMONITOR_URL/api/military/vessels` and `/api/military/flights`
- Returns combined payload to the frontend
- Caches response for 5 minutes (Redis) — no point hammering worldmonitor for position updates more often than that
- If worldmonitor is unreachable, returns 503 and the frontend renders the soft-fail state

**Story page integration:**
- `/story/[id]/` page: if `story.category == DEFENCE` (or equivalent — may need a new category, see open questions), render `<DefenceMap>` below the story header
- Region is inferred from story body: keyword-to-bounding-box mapping table in `lib/defence_regions.ts`

**New environment variables:**
```
WORLDMONITOR_URL        # e.g., http://localhost:4000 or https://wm.local
WORLDMONITOR_API_KEY    # shared secret for local API
```

### New story category consideration

The existing category taxonomy (`POLITICS_POLICY | ECONOMY_MARKETS | SCIENCE_TECH | SOCIETY_CULTURE | ENVIRONMENT_CLIMATE | CRIME_SAFETY | HEALTH`) has no `DEFENCE` bucket. Options:
1. Add `DEFENCE_SECURITY` as a new category (cleanest, lets the map trigger on category alone)
2. Tag defence stories with a boolean `is_defence: bool` field (lighter schema change)
3. Use keyword detection at render time (no schema change, but fragile)

Recommendation: add `DEFENCE_SECURITY` — it's a meaningful editorial category that brainfeed should distinguish regardless of the map feature.

---

## Phases

| # | Name | User-visible? | Estimated effort |
|---|---|---|---|
| 1 | Worldmonitor exposes `/api/military/vessels` + `/api/military/flights` | No (worldmonitor repo work) | 2–3 days |
| 2 | Brainfeed `DefenceMap.tsx` + backend proxy route | Yes — defence stories show map | 3 days |
| 3 | Story-aware map: zoom to mentioned region + filter | Yes — map is context-aware | 1–2 days |

### Phase 1 — Worldmonitor API endpoints (2–3 days, worldmonitor repo)

**Deliverables (worldmonitor codebase):**
- `GET /api/military/vessels` with bounding-box filter
- `GET /api/military/flights` with bounding-box filter
- API key middleware on both routes
- Response shape matches the schema above (Pydantic models in worldmonitor)
- OpenAPI doc updated

**Test plan:**
- Unit (worldmonitor): vessel/flight query with fixture DB data returns correct JSON shape
- Integration (worldmonitor): live call against worldmonitor dev instance with known vessel, assert it appears in response
- Manual smoke: `curl "http://localhost:4000/api/military/vessels?lat_min=-10&lon_min=100&lat_max=25&lon_max=125" -H "X-WM-Key: ..."` — assert reasonable vessel list for South China Sea region

### Phase 2 — DefenceMap component + proxy route (3 days)

**Deliverables (brainfeed):**
- `frontend/src/components/DefenceMap.tsx`
- `frontend/src/lib/types.ts`: add `Vessel`, `Flight`, `BoundingBox` types
- `backend/api/routes/defence.py`: `GET /api/defence/context?region=...` proxy route
- `lib/defence_regions.ts`: mapping of region name → bounding box (start with 10 key regions: South China Sea, Persian Gulf, Red Sea, Baltic Sea, Mediterranean, Black Sea, Indo-Pacific, North Atlantic, Arctic, South Atlantic)
- `WORLDMONITOR_URL` and `WORLDMONITOR_API_KEY` added to `.env.example`
- Story page renders `<DefenceMap>` when category is `DEFENCE_SECURITY`

**Test plan:**
- Unit: `DefenceMap` renders loading state, error state, and data state with fixture data
- Unit: `defence_regions.ts` lookup — known region names return correct bounding boxes
- Unit: brainfeed proxy route returns 503 when worldmonitor is unreachable (mock)
- Integration: open a defence story with worldmonitor running locally, confirm map shows vessels
- Manual smoke: open on mobile, confirm map is readable (deck.gl responsive)

### Phase 3 — Story-aware region zoom + filter (1–2 days)

**Deliverables:**
- `backend/agents/defence_region_extractor.py` (or extend `simplifier` prompt): extracts the primary geographic region from a defence story. Outputs a region name that maps to a bounding box.
- New field on story: `defence_region: str | None`
- `DefenceMap.tsx` accepts `defaultRegion` prop, zooms to it on mount
- If story mentions multiple regions, map defaults to the first mentioned and provides a region selector dropdown

**Test plan:**
- Unit: region extractor with fixture stories — assert South China Sea story returns "south_china_sea", Ukraine story returns "black_sea", etc.
- Integration: full pipeline run on a defence story, assert `defence_region` field populated in DB
- Manual smoke: open three different defence stories, confirm map zooms to different correct regions

---

## Test plan: anticipated failure modes

| Failure mode | Likely cause | Test that catches it |
|---|---|---|
| Worldmonitor unreachable | Service not running, network issue | Brainfeed proxy returns 503; `DefenceMap` renders soft-fail state — integration test with worldmonitor mocked down |
| AGPL boundary violated | Developer imports worldmonitor TypeScript types | Linting rule or CI check that disallows imports from `worldmonitor` package paths — unit test or lint gate |
| Map shows no vessels (military vessels running dark) | Legitimate — military AIS is opt-in | Empty state renders "No tracked activity in this region" — manual smoke confirms this is informative not broken |
| Region extraction wrong | Story about "East China Sea" but LLM returns "South China Sea" | Unit test with 20 fixture stories and known correct regions; flag to human review if confidence below threshold |
| deck.gl bundle size bloat | deck.gl is large (~600kb gzipped) | Next.js dynamic import with `ssr: false`; only loaded on defence story pages — Lighthouse score regression test |
| Bounding box too small misses relevant vessel | Region keywords map to tight box | Allow 10% padding in bounding box; integration test checks a known vessel just outside the tight box still appears |
| Defence story in wrong category | Categoriser misses DEFENCE_SECURITY | Categoriser unit tests include defence story fixtures; manual review of mis-categorised stories post-deploy |

---

## Memory hooks

**Read (before rendering a defence story):**
- Load user's regions of interest from Mem0: e.g., "user watches Indo-Pacific closely", "user has portfolio exposure to Middle East shipping"
- Use to: default the map to user's preferred region if story spans multiple regions, or to offer "also watching" context

**Write:**
- When user explicitly scrolls/interacts with the map on a particular region, record region interest: `{"defence_region_interest": "south_china_sea", "first_seen": "2026-04-28"}`
- When user asks Jarvis a follow-up about a defence story mentioning a specific fleet or vessel class, record: `{"defence_interest": "carrier_groups", "context": "South China Sea story"}`

---

## Open implementation questions

1. **New DEFENCE_SECURITY category vs boolean flag**: adding a category is the right call editorially, but requires a DB migration and categoriser prompt update. Is this spec the right moment to expand the taxonomy, or should it be deferred to a taxonomy-wide review?

2. **Caching TTL**: 5-minute cache on the worldmonitor proxy is reasonable for ship positions (AIS updates every few minutes). Is this too aggressive (stale data) or too conservative (unnecessary worldmonitor load)?

3. **deck.gl vs Leaflet/Mapbox**: deck.gl is powerful and GPU-accelerated but large. Leaflet with a simple marker layer would be much lighter. Given brainfeed is a news site (not a tracking app), is the full deck.gl power justified?

4. **Region selector UX on stories spanning multiple theatres**: if a story mentions the Red Sea AND the Persian Gulf, what's the default view? Continent-level zoom (Arabian Peninsula)? Or pick the first-mentioned? Needs a UX decision.

5. **Worldmonitor Phase 1 blocking**: if worldmonitor endpoint work is slow, should Phase 2 be built against a mock API (fixture JSON file) and wired up later? This lets brainfeed work proceed independently.

---

## Decision log

- **Option B (HTTP API) over Option A (iframe) and Option C (native build)**: preserves brainfeed's proprietary licence under the AGPL boundary, gives brainfeed full UX control, and reuses worldmonitor's superior USNI-fused data layer without duplicating it. Option A is the fallback if worldmonitor endpoints are delayed. Recorded 2026-04-28.
- **Brainfeed must never import worldmonitor code**: AGPL clause applies to static linking, not network calls. HTTP is the only safe boundary. This is a hard constraint documented in this spec and must be enforced in code review. Recorded 2026-04-28.
- **Redis cache on proxy route**: worldmonitor position data refreshes every few minutes at best; no value in hitting it per page load. 5-min TTL is a reasonable starting point. Recorded 2026-04-28.
- **Natural overlap with Spec #3 noted**: Spec #3 (Jarvis→worldmonitor control) will establish the worldmonitor HTTP API surface. If Spec #3 ships first, the Phase 1 work here (worldmonitor endpoints) may already be partially done. Build #3 first, then layer this on top rather than building parallel API surfaces. Recorded 2026-04-28.

---

## Out of scope

- Real-time animation of vessel movements (vessel position trails, movement history)
- Civilian vessel and flight tracking (defence stories only — do not mix with commercial AIS)
- Replacing worldmonitor's full globe view — that stays as worldmonitor's domain
- Push notifications for vessel movements near a region of interest (Mem0 territory, future spec)
- Historical vessel position replay
- Threat assessment or risk scoring of tracked vessels (this is editorial judgement, not automation)
