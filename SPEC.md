# The Daily Briefing — Phased Build Specification

## Build Philosophy

Each phase produces a working, usable product. No phase depends on future phases being complete. Ship early, iterate fast.

---

## PHASE 1: RSS Ingestion + Basic Pipeline (Days 1-2)
**Goal: Collect real news from all sources and display raw stories via API**

### Day 1 Tasks
1. Initialise the repo with the full project structure from CLAUDE.md
2. Set up FastAPI backend with health check endpoint
3. Create the Source model and sources.py config with ALL RSS feed URLs
4. Build rss_collector.py:
   - Uses feedparser to fetch all RSS feeds
   - Parses title, description, link, published date, source name
   - Handles errors gracefully (feeds go down, formats vary)
   - Returns List[RawStory] dataclass
5. Build api_collector.py:
   - NewsAPI integration for global stories
   - Returns same List[RawStory] format
6. Build deduplicator.py:
   - Simple title similarity check (difflib.SequenceMatcher, threshold 0.7)
   - Groups duplicate stories, keeps all source URLs
   - Returns deduplicated list with source_urls aggregated
7. Create a simple SQLite database (swap to PostgreSQL later) with story table
8. Build the pipeline.py orchestrator:
   - Calls collector → deduplicator → saves to DB
   - Logs count of stories collected, duplicates removed
9. Build run_pipeline.py script for manual triggering
10. Create GET /api/stories endpoint returning all collected stories (paginated)

### Day 1 Definition of Done
- Running `python scripts/run_pipeline.py` pulls real stories from RSS feeds
- GET /api/stories returns real news data as JSON
- Logs show: "Collected 187 stories, deduplicated to 94"

### Day 2 Tasks
1. Build categoriser.py agent:
   - Uses Claude Haiku to classify each story into category + tier
   - System prompt: Given a news headline and description from [source], classify into exactly one category (POLITICS_POLICY, ECONOMY_MARKETS, SCIENCE_TECH, SOCIETY_CULTURE, ENVIRONMENT_CLIMATE, CRIME_SAFETY, HEALTH) and one tier (LOCAL, NATIONAL, GLOBAL). Return JSON only.
   - Batch stories in groups of 10 to reduce API calls
   - Fallback: if LLM fails, assign based on source (ABC Brisbane = LOCAL, BBC = GLOBAL, etc.)
2. Build ranker.py agent:
   - Uses Claude Haiku to score each story 0-100 using the impact rubric
   - System prompt includes the 5-dimension rubric from CLAUDE.md
   - Selects top 5 per tier, ensuring category diversity (no more than 2 stories from same category per tier)
   - Returns 15 ranked stories
3. Build simplifier.py agent:
   - Uses Claude Sonnet to rewrite each of the 15 selected stories
   - Generates all 3 depth levels per story:
     - quick_summary: Single sentence
     - simplified_body: 2-3 paragraphs following the Simplifier Rules
     - (deep_analysis left empty for Phase 3)
   - System prompt enforces all 10 Simplifier Writing Rules from CLAUDE.md
4. Update pipeline.py: collector → deduplicator → categoriser → ranker → simplifier → save
5. Build briefing model and GET /api/briefings/today endpoint:
   - Returns structured JSON with stories grouped by tier
   - Each story includes: simplified_title, quick_summary, simplified_body, category, tier, impact_score, sources (list of {name, url})
6. Add APScheduler to main.py — runs pipeline at 5am AEST daily

### Day 2 Definition of Done
- Full pipeline runs end-to-end: RSS → categorise → rank → simplify → DB
- GET /api/briefings/today returns 15 real simplified news stories
- Stories are genuinely readable by a 10-year-old
- Each story lists its sources with URLs
- Pipeline is scheduled to run daily at 5am AEST

---

## PHASE 2: Frontend + Verification (Days 3-4)
**Goal: Beautiful, usable news site with verified stories**

### Day 3 Tasks
1. Initialise Next.js frontend with Tailwind CSS
2. Build the home page (page.tsx):
   - Three sections: Local, National, Global
   - Each section shows 5 story cards
   - Clean, newspaper-inspired design — lots of whitespace, strong typography
   - Mobile-first responsive layout
3. Build BriefingCard component:
   - Shows: simplified_title, category badge, quick_summary
   - Click to expand → shows full simplified_body
   - Source count indicator ("Verified by 3 sources")
   - Impact score shown subtly (e.g., coloured bar or dot)
4. Build CategoryBadge component:
   - Colour-coded pills for each category
   - POLITICS = blue, ECONOMY = green, SCIENCE = purple, SOCIETY = orange, ENVIRONMENT = teal, CRIME = red, HEALTH = pink
5. Build DepthToggle component:
   - Three buttons: Quick | Standard | Deep
   - Toggles what level of detail is shown for each story
   - Deep is greyed out / "Coming soon" until Phase 3
6. Build Header component:
   - "The Daily Briefing" title
   - Today's date formatted nicely
   - Subtitle: "15 stories. 3 perspectives. Zero jargon."
7. Set up API client (lib/api.ts) to fetch from backend
8. TypeScript types matching backend schemas

### Day 3 Definition of Done
- Opening localhost:3000 shows today's 15 real news stories
- Stories are grouped by Local / National / Global
- Category badges are colour-coded
- Quick/Standard toggle works
- Looks clean and professional on both desktop and mobile

### Day 4 Tasks
1. Build verifier.py agent:
   - For each of the 15 selected stories, checks how many independent sources report the same event
   - Uses Claude Sonnet: Given these [N] article descriptions about potentially the same event, determine: (a) are they about the same event? (b) do they agree on key facts? (c) any contradictions?
   - Assigns confidence score 0-1
   - Flags stories with only 1 source or with contradictions
2. Update pipeline: insert verifier between ranker and simplifier
3. Build SourcePanel component:
   - Expandable panel on each story card
   - Lists all sources: name, link, whether facts agree
   - Shows confidence score as a visual indicator
   - If single-source: shows yellow warning "Single source — treat with caution"
4. Build the individual story page (story/[id]/page.tsx):
   - Full story view with all metadata
   - Source panel always visible
   - Related stories section (placeholder for Phase 3)
   - Share button
5. Build archive page (archive/page.tsx):
   - Calendar or list view of past briefings
   - Click a date to see that day's briefing
6. Add GET /api/briefings/{date} endpoint
7. Polish: loading states, error handling, 404 pages, favicon, meta tags

### Day 4 Definition of Done
- Stories show verification status and source transparency
- Individual story pages work with full detail
- Archive page shows past briefings
- Source panel builds user trust in the content
- Site feels polished and ready to share

---

## PHASE 3: Deep Thinker + Story Threading (Days 5-6)
**Goal: Historical context, future implications, and connected narratives**

### Day 5 Tasks
1. Build deep_thinker.py agent:
   - Uses Claude Opus for each of the 15 stories
   - System prompt:
     You are a deeply knowledgeable analyst. For this news story, provide:
     1. HISTORICAL CONTEXT: What past events (last 5-10 years) relate to this? Be specific with dates and events. Explain how those events led to today's situation.
     2. MULTIPLE PERSPECTIVES: How would different groups view this? (e.g., economists vs workers, environmentalists vs industry, young vs old). Present at least 2 genuine perspectives without bias.
     3. FUTURE IMPLICATIONS: What could this lead to? Consider impacts on: laws/policy, financial markets/stocks, society/culture, technology, and international relations. Be specific about mechanisms (e.g., "this could push the RBA to..." not just "this affects the economy").
     4. WHAT TO WATCH: What should the reader look out for next? What signals would indicate this is escalating or resolving?
     Write in the same plain, friendly tone as the simplified version. A 10-year-old should still be able to follow. Use Australian English.
   - deep_analysis field populated with structured markdown
2. Update pipeline: deep thinker runs after simplifier
3. Update the frontend Deep toggle — now functional
4. Build the deep analysis view in the story page:
   - Expandable sections: Historical Context, Perspectives, Future Implications, What to Watch
   - Each section styled distinctly
   - Historical events shown as a mini-timeline if possible

### Day 5 Definition of Done
- Every story has a "Deep" mode with real analysis
- Historical context references specific past events
- Future implications mention concrete mechanisms
- Multiple perspectives presented without bias
- Still readable by a 10-year-old

### Day 6 Tasks
1. Build story threading:
   - When the deep thinker processes a story, it also checks: are any stories in today's briefing related to each other? Are any related to stories from previous days?
   - Uses embedding similarity (pgvector) to find semantically related past stories
   - Populates related_story_ids
2. Build StoryThread component:
   - Timeline view showing how a narrative has evolved across days
   - "This story is connected to: [Story X from 3 days ago], [Story Y from today]"
   - Click to navigate between connected stories
3. Add "What Changed Since Yesterday" for ongoing stories:
   - If a story is a continuation of a previous story, the simplifier highlights what's new
   - Shows a diff-style summary: "Yesterday: X. Today: Y changed."
4. Update archive page to show story threads spanning multiple days

### Day 6 Definition of Done
- Related stories are automatically linked
- Story threads show narrative evolution over time
- Ongoing stories highlight what's new
- The platform feels like it "remembers" past coverage

---

## PHASE 4: Polish + Deploy (Day 7)
**Goal: Production-ready, deployed, and usable as a daily tool**

### Tasks
1. Swap SQLite for PostgreSQL + pgvector:
   - Set up via docker-compose.yml
   - Run Alembic migrations
   - Verify all queries work
2. Add Redis for caching:
   - Cache today's briefing (invalidate on new pipeline run)
   - Cache individual story lookups
3. Error handling audit:
   - Every agent has try/except with fallback behaviour
   - Pipeline logs errors but continues (a single failed story shouldn't kill the briefing)
   - Frontend shows graceful error states
4. Performance:
   - Frontend: Static generation for today's briefing page
   - Backend: Async database queries
   - Pipeline: Batch LLM calls where possible
5. Deploy:
   - Backend to Railway or Fly.io
   - Frontend to Vercel
   - PostgreSQL on Railway or Supabase
   - Redis on Railway or Upstash
   - Set up environment variables
   - Verify scheduled pipeline runs at 5am AEST
6. Add basic analytics:
   - Track which stories are expanded (Quick→Standard→Deep)
   - Log which categories get most engagement
   - This feeds future ranking improvements
7. README.md:
   - Project description
   - Setup instructions
   - Architecture diagram
   - Screenshots
8. Final QA:
   - Test all 3 tiers display correctly
   - Test all 3 depth levels
   - Test source panel
   - Test archive
   - Test story threading
   - Test on mobile
   - Test pipeline recovery from errors

### Day 7 Definition of Done
- Site is live on a public URL
- Pipeline runs automatically at 5am AEST daily
- All features work end-to-end
- Mobile responsive
- README complete
- You're reading your morning briefing from it

---

## FUTURE PHASES (Week 2+)

### Phase 5: Continual Learning
- Knowledge graph accumulates over weeks
- Deep thinker's context window includes past analysis
- Impact scoring improves based on user engagement signals
- Trending topics detection across days

### Phase 6: Audio Briefing
- TTS generation of the daily 15 stories
- "Your 10-minute morning briefing" audio format
- Podcast RSS feed

### Phase 7: User Accounts + Personalisation
- Users can weight category preferences
- Bookmark stories
- Get notifications on story thread updates
- Custom depth defaults

### Phase 8: Weekly Synthesis
- Every Sunday: "The Week in Review"
- Connects the 5 biggest threads from the week
- Projects what to watch next week
- Deeper analysis than daily stories

---

## CRITICAL NOTES FOR CLAUDE CODE

1. Start with Phase 1 Day 1. Do not skip ahead.
2. Use real RSS feeds from the start — no mock data after Day 1.
3. Test each agent individually before integrating into the pipeline.
4. The simplifier is the most important agent — spend extra effort on its system prompt.
5. Australian English (en-AU) everywhere: "organised" not "organized", "colour" not "color".
6. Every file needs proper error handling. The pipeline MUST be resilient.
7. Frontend should look great from Day 3. First impressions matter.
8. Keep LLM costs in mind: Haiku for bulk, Sonnet for quality, Opus for depth.
9. Log everything. Pipeline debugging depends on good logs.
10. Each phase's "Definition of Done" is the acceptance criteria. Don't move on until met.