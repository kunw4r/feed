# Brainfeed-as-Product + Jarvis Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make brainfeed a polished standalone news-reading site backed by Postgres+pgvector with a ripple-effects predictor agent and silent embedding indexing, AND wire it into Jarvis as a curated-stories tool.

**Architecture:** Five sequential phases, each independently shippable. Phase 1 swaps SQLite for Postgres+pgvector (cheap window — no real archive yet). Phase 2 fills in the broken `/api/briefings/today` endpoints. Phase 3 polishes the read experience. Phase 4 adds a `predictor` agent generating `ripple_effects[]` and a silent embedding step. Phase 5 wires a `get_daily_briefing` tool into Jarvis.

**Tech Stack:**
- Backend: Python 3.11+, FastAPI, SQLAlchemy 2 + asyncpg, pgvector, Alembic, pytest, anthropic SDK, openai SDK
- Frontend: Next.js 16 (React 19), Tailwind 4, lucide-react, vitest + @testing-library/react (newly added)
- Infra: Docker (postgres:16 with pgvector extension), Neon/Supabase for prod (decided in P1)
- Jarvis: TypeScript, Anthropic SDK, existing manual tool-use loop

**Spec:** `docs/superpowers/specs/2026-04-27-spec01-brainfeed-product-and-jarvis-tool.md`
**Umbrella:** `docs/superpowers/specs/2026-04-27-jarvis-vision-overview.md`

---

## File Map

### Created
| Path | Responsibility |
|---|---|
| `backend/database/orm.py` | SQLAlchemy ORM models (StoryORM, BriefingORM) — single file, all tables |
| `backend/database/migrations/env.py` | Alembic env config |
| `backend/database/migrations/versions/0001_initial_schema.py` | Initial schema with pgvector + ripple_effects |
| `backend/agents/predictor.py` | Predictor agent (Sonnet) producing `ripple_effects[]` |
| `backend/ingestion/embedder.py` | OpenAI embedding wrapper, populates `embedding` column |
| `backend/tests/__init__.py` | Test package init |
| `backend/tests/conftest.py` | pytest fixtures (test DB, sample stories) |
| `backend/tests/test_repos.py` | Repo unit tests |
| `backend/tests/test_briefings_api.py` | API integration tests |
| `backend/tests/test_predictor.py` | Predictor agent tests (mocked LLM) |
| `backend/tests/test_embedder.py` | Embedder error-handling tests |
| `backend/tests/test_pipeline_e2e.py` | Pipeline end-to-end test |
| `frontend/src/components/RippleEffectsCallout.tsx` | "What might happen next" callout |
| `frontend/src/components/RelatedStoriesSidebar.tsx` | Related stories list |
| `frontend/vitest.config.ts` | Test runner config |
| `frontend/src/test-setup.ts` | jsdom + testing-library setup |
| `frontend/src/components/__tests__/RippleEffectsCallout.test.tsx` | Component tests |
| `frontend/src/components/__tests__/SourcePanel.test.tsx` | Component tests |
| `alembic.ini` | Alembic config (project root) |
| `docker-compose.yml` | Postgres + pgvector service (project root) |

### Modified
| Path | Change |
|---|---|
| `backend/requirements.txt` | Drop aiosqlite; add sqlalchemy, asyncpg, pgvector, alembic, openai, pytest, pytest-asyncio, httpx (test client) |
| `backend/.env.example` | DATABASE_URL → postgresql; add OPENAI_API_KEY |
| `backend/database/connection.py` | Switch to async SQLAlchemy engine + sessionmaker |
| `backend/database/repositories/story_repo.py` | Use ORM session |
| `backend/database/repositories/briefing_repo.py` | Use ORM session; add `get_today` (with fallback), `get_by_date`, `get_related_stories` |
| `backend/api/routes/briefings.py` | Implement `/today`, `/{date}`, `/latest` (currently empty file) |
| `backend/api/routes/stories.py` | Add `/{id}/related` endpoint |
| `backend/api/schemas/briefing_schema.py` | Add `is_today: bool` field; ensure regions dict shape |
| `backend/models/story.py` | Add `ripple_effects: list[dict]`, `embedding: Optional[list[float]]` fields |
| `backend/scheduler/pipeline.py` | Insert `predictor` and `embedder` between `story_linker` and `save_briefing` |
| `frontend/package.json` | Add vitest, @testing-library/react, @testing-library/jest-dom, jsdom devDeps; add `test`, `test:watch` scripts |
| `frontend/src/lib/types.ts` | Add `RippleEffect` interface; extend `Story` with `ripple_effects?: RippleEffect[]` |
| `frontend/src/components/SourcePanel.tsx` | Add confidence meter |
| `frontend/src/app/story/[id]/page.tsx` | Wire RippleEffectsCallout + RelatedStoriesSidebar into layout |
| `jarvis/src/lib/brainfeed.ts` | Add `getDailyBriefing(args)` calling `/api/briefings/today` |
| `jarvis/src/lib/tools.ts` | Add `get_daily_briefing` tool def + dispatcher case; sharpen `list_brief_stories` description |

---

# Phase 1 — Postgres + pgvector migration

**Goal:** Replace SQLite with Postgres+pgvector. Schema includes `embedding vector(1536)` and `ripple_effects jsonb` columns from day one (populated in P4). No user-visible change.

**Done when:** `python scripts/run_pipeline.py` runs against Postgres without errors and writes a briefing row.

---

### Task 1.1: Add Postgres+pgvector to docker-compose and update env

**Files:**
- Create: `docker-compose.yml` (project root)
- Modify: `backend/.env.example`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: brainfeed-postgres
    environment:
      POSTGRES_USER: brainfeed
      POSTGRES_PASSWORD: brainfeed
      POSTGRES_DB: brainfeed
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U brainfeed"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 2: Update `backend/.env.example`**

Replace the `DATABASE_URL` line and add `OPENAI_API_KEY`:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=postgresql+asyncpg://brainfeed:brainfeed@localhost:5433/brainfeed
NEWS_API_KEY=
GNEWS_API_KEY=
ENVIRONMENT=development
PIPELINE_SCHEDULE=0 5 * * *
LOG_LEVEL=INFO
```

- [ ] **Step 3: Start postgres and verify pgvector available**

Run:
```bash
docker compose up -d postgres
sleep 3
docker exec brainfeed-postgres psql -U brainfeed -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extname FROM pg_extension WHERE extname='vector';"
```
Expected output includes `vector` row.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/.env.example
git commit -m "infra: add postgres+pgvector via docker compose"
```

---

### Task 1.2: Update Python dependencies and add pytest setup

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `pytest.ini` (project root)

- [ ] **Step 1: Update `backend/requirements.txt`**

Remove the line `aiosqlite==0.20.0`. Add at the bottom:

```
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
pgvector==0.3.6
alembic==1.14.0
openai==1.59.6
pytest==8.3.4
pytest-asyncio==0.25.0
httpx==0.28.1
```

- [ ] **Step 2: Create `pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
pythonpath = .
testpaths = backend/tests
```

- [ ] **Step 3: Create `backend/tests/__init__.py`** (empty file)

- [ ] **Step 4: Install + verify pytest runs**

```bash
cd backend && pip install -r requirements.txt && cd .. && pytest --collect-only
```
Expected: `collected 0 items`. No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/tests/__init__.py pytest.ini
git commit -m "deps: replace aiosqlite with postgres+sqlalchemy stack; add pytest"
```

---

### Task 1.3: Define SQLAlchemy ORM models (TDD)

**Files:**
- Create: `backend/database/orm.py`
- Create: `backend/tests/test_orm.py`

- [ ] **Step 1: Write the failing test in `backend/tests/test_orm.py`**

```python
"""Tests that ORM models declare expected columns and can round-trip data."""
from datetime import date, datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from backend.database.orm import Base, StoryORM, BriefingORM


async def test_story_orm_roundtrip(tmp_path):
    db_url = "sqlite+aiosqlite:///" + str(tmp_path / "test.db")
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        story = StoryORM(
            id="s1",
            title="Original headline",
            simplified_title="Simple headline",
            simplified_body="Body",
            quick_summary="Summary",
            tier="GLOBAL",
            category="POLITICS_POLICY",
            impact_score=80.0,
            confidence=0.9,
            source_count=3,
            ripple_effects=[{"summary": "x", "horizon": "weeks", "confidence": "high"}],
            created_at=datetime.utcnow(),
        )
        session.add(story)
        await session.commit()

        result = await session.execute(select(StoryORM).where(StoryORM.id == "s1"))
        loaded = result.scalar_one()
        assert loaded.simplified_title == "Simple headline"
        assert loaded.ripple_effects[0]["horizon"] == "weeks"
        assert loaded.embedding is None  # not populated yet


async def test_briefing_orm_roundtrip(tmp_path):
    db_url = "sqlite+aiosqlite:///" + str(tmp_path / "test.db")
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        briefing = BriefingORM(
            briefing_date=date.today(),
            story_ids=["s1", "s2"],
        )
        session.add(briefing)
        await session.commit()
        result = await session.execute(select(BriefingORM))
        loaded = result.scalar_one()
        assert loaded.story_ids == ["s1", "s2"]
```

(NOTE: tests use sqlite+aiosqlite for portability — pgvector-specific behaviour is tested in integration tests against real Postgres. The schema stays the same; only `Vector` column type differs, which we'll handle as String/JSON for sqlite test compat or test against real Postgres in conftest.)

Also add `aiosqlite==0.20.0` back to requirements as a dev-only dep for tests, OR write conftest to use real Postgres only. **Decision: use real Postgres for all tests via testcontainers-style fixture.** Replace this test with:

```python
"""Tests that ORM models declare expected columns and can round-trip data."""
import pytest
from datetime import date, datetime
from sqlalchemy import select
from backend.database.orm import StoryORM, BriefingORM


async def test_story_orm_roundtrip(test_session):
    story = StoryORM(
        id="s1",
        title="Original",
        simplified_title="Simple",
        simplified_body="Body",
        quick_summary="Summary",
        tier="GLOBAL",
        category="POLITICS_POLICY",
        impact_score=80.0,
        confidence=0.9,
        source_count=3,
        ripple_effects=[{"summary": "x", "horizon": "weeks", "confidence": "high"}],
        created_at=datetime.utcnow(),
    )
    test_session.add(story)
    await test_session.commit()
    result = await test_session.execute(select(StoryORM).where(StoryORM.id == "s1"))
    loaded = result.scalar_one()
    assert loaded.simplified_title == "Simple"
    assert loaded.ripple_effects[0]["horizon"] == "weeks"
    assert loaded.embedding is None


async def test_briefing_orm_roundtrip(test_session):
    briefing = BriefingORM(briefing_date=date.today(), story_ids=["s1", "s2"])
    test_session.add(briefing)
    await test_session.commit()
    result = await test_session.execute(select(BriefingORM))
    loaded = result.scalar_one()
    assert loaded.story_ids == ["s1", "s2"]
```

The `test_session` fixture is defined in Task 1.4.

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest backend/tests/test_orm.py -v
```
Expected: ImportError or NameError on `StoryORM` (file doesn't exist yet).

- [ ] **Step 3: Implement `backend/database/orm.py`**

```python
"""SQLAlchemy ORM models for brainfeed.

All tables live in this single file. Story and Briefing are the two top-level
entities; Source is embedded as JSON on Story to avoid join overhead for the
common case of "show me all sources for this story".
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class StoryORM(Base):
    __tablename__ = "stories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    simplified_title: Mapped[str] = mapped_column(String(500), default="")
    simplified_body: Mapped[str] = mapped_column(String, default="")
    quick_summary: Mapped[str] = mapped_column(String, default="")
    deep_analysis: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    why_it_matters: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String, default="")
    tier: Mapped[str] = mapped_column(String(32))
    category: Mapped[str] = mapped_column(String(64))
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_count: Mapped[int] = mapped_column(Integer, default=0)
    region: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    region_code: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    concepts: Mapped[list] = mapped_column(JSON, default=list)
    related_story_ids: Mapped[list] = mapped_column(JSON, default=list)
    ripple_effects: Mapped[list] = mapped_column(JSON, default=list)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1536), nullable=True)
    published_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BriefingORM(Base):
    __tablename__ = "briefings"

    briefing_date: Mapped[date] = mapped_column(Date, primary_key=True)
    story_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: Run test to verify it passes (after Task 1.4 ships the fixture)**

Defer test run until 1.4 conftest exists. Move forward to 1.4.

- [ ] **Step 5: Commit ORM**

```bash
git add backend/database/orm.py backend/tests/test_orm.py
git commit -m "feat(db): add SQLAlchemy ORM models with pgvector and ripple_effects"
```

---

### Task 1.4: Build pytest fixtures with real Postgres

**Files:**
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write conftest with test_session fixture**

```python
"""Pytest fixtures.

Uses the local docker-compose Postgres on port 5433. Each test gets a clean
schema via transactional rollback. The pgvector extension is created once.
"""
import os
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from backend.database.orm import Base


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://brainfeed:brainfeed@localhost:5433/brainfeed_test",
)


@pytest.fixture(scope="session")
async def engine():
    # Connect to default db, create test db if missing
    admin_url = "postgresql+asyncpg://brainfeed:brainfeed@localhost:5433/brainfeed"
    admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    async with admin_engine.connect() as conn:
        await conn.execute(text("DROP DATABASE IF EXISTS brainfeed_test"))
        await conn.execute(text("CREATE DATABASE brainfeed_test"))
    await admin_engine.dispose()

    eng = create_async_engine(TEST_DATABASE_URL)
    async with eng.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def test_session(engine) -> AsyncSession:
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
        await session.rollback()
```

- [ ] **Step 2: Run the ORM tests from Task 1.3**

```bash
pytest backend/tests/test_orm.py -v
```
Expected: 2 PASSED (or skipped if Postgres not running — start it with `docker compose up -d postgres`).

- [ ] **Step 3: Commit fixtures**

```bash
git add backend/tests/conftest.py
git commit -m "test: add pytest fixtures with real postgres for integration tests"
```

---

### Task 1.5: Update connection module to use async SQLAlchemy

**Files:**
- Modify: `backend/database/connection.py`
- Read first to capture existing API surface (functions used elsewhere)

- [ ] **Step 1: Read existing `connection.py`**

```bash
cat backend/database/connection.py
```

Note any functions like `init_db`, `get_db`, etc. that are imported elsewhere.

- [ ] **Step 2: Replace `connection.py`**

```python
"""Async SQLAlchemy engine + session factory.

`init_db()` creates tables and the pgvector extension if missing.
`get_session()` is the dependency-injected session for routes.
"""
import os
import logging
from contextlib import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.database.orm import Base

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://brainfeed:brainfeed@localhost:5433/brainfeed",
)

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db() -> None:
    """Create extension + all tables. Idempotent."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialised at %s", DATABASE_URL.split("@")[-1])


@asynccontextmanager
async def get_session():
    async with SessionLocal() as session:
        yield session
```

- [ ] **Step 3: Update `backend/main.py` to await init_db**

The current `init_db()` is sync per the snippet read earlier. Find the `@app.on_event("startup")` block and change `init_db()` to `await init_db()`. Verify the function is `async def startup()` already (it is per the snippet).

- [ ] **Step 4: Verify import compiles**

```bash
python -c "from backend.database.connection import engine, init_db, get_session; print('ok')"
```
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add backend/database/connection.py backend/main.py
git commit -m "feat(db): switch connection module to async SQLAlchemy"
```

---

### Task 1.6: Migrate `story_repo` and `briefing_repo` to ORM (TDD)

**Files:**
- Modify: `backend/database/repositories/story_repo.py`
- Modify: `backend/database/repositories/briefing_repo.py`
- Create: `backend/tests/test_repos.py`

- [ ] **Step 1: Write failing tests**

```python
"""Repo CRUD tests against real Postgres."""
from datetime import date, datetime, timedelta
from backend.database.orm import StoryORM, BriefingORM
from backend.database.repositories import story_repo, briefing_repo


async def _make_story(test_session, story_id: str, tier: str = "GLOBAL", impact: float = 50.0):
    story = StoryORM(
        id=story_id, title=f"t-{story_id}", simplified_title=f"s-{story_id}",
        simplified_body="body", quick_summary="qs", tier=tier,
        category="POLITICS_POLICY", impact_score=impact, confidence=0.8,
        source_count=2, sources=[], concepts=[], related_story_ids=[],
        ripple_effects=[], created_at=datetime.utcnow(),
    )
    test_session.add(story)
    await test_session.commit()
    return story


async def test_save_and_get_story(test_session):
    await _make_story(test_session, "abc")
    fetched = await story_repo.get_story_by_id(test_session, "abc")
    assert fetched is not None
    assert fetched.id == "abc"


async def test_list_stories_filtered_by_tier(test_session):
    await _make_story(test_session, "g1", tier="GLOBAL")
    await _make_story(test_session, "n1", tier="NATIONAL")
    stories = await story_repo.get_stories(test_session, limit=10, tier="NATIONAL")
    assert len(stories) == 1
    assert stories[0].id == "n1"


async def test_save_and_get_briefing_by_date(test_session):
    today = date.today()
    await briefing_repo.save_briefing(test_session, today, ["s1", "s2"])
    fetched = await briefing_repo.get_by_date(test_session, today)
    assert fetched is not None
    assert fetched.story_ids == ["s1", "s2"]


async def test_get_today_returns_none_when_no_briefing(test_session):
    fetched = await briefing_repo.get_today(test_session)
    assert fetched is None


async def test_get_today_falls_back_to_most_recent(test_session):
    yesterday = date.today() - timedelta(days=1)
    await briefing_repo.save_briefing(test_session, yesterday, ["x"])
    fetched, is_today = await briefing_repo.get_today_with_fallback(test_session)
    assert fetched.story_ids == ["x"]
    assert is_today is False


async def test_get_today_returns_today_when_present(test_session):
    today = date.today()
    await briefing_repo.save_briefing(test_session, today, ["y"])
    fetched, is_today = await briefing_repo.get_today_with_fallback(test_session)
    assert fetched.story_ids == ["y"]
    assert is_today is True
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pytest backend/tests/test_repos.py -v
```
Expected: All FAIL with `AttributeError` or `ImportError`.

- [ ] **Step 3: Replace `story_repo.py`**

```python
"""Story repository — async ORM-based CRUD."""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.orm import StoryORM


async def save_story(session: AsyncSession, story: StoryORM) -> None:
    session.add(story)
    await session.commit()


async def save_stories(session: AsyncSession, stories: list[StoryORM]) -> None:
    session.add_all(stories)
    await session.commit()


async def get_story_by_id(session: AsyncSession, story_id: str) -> Optional[StoryORM]:
    result = await session.execute(select(StoryORM).where(StoryORM.id == story_id))
    return result.scalar_one_or_none()


async def get_stories(
    session: AsyncSession,
    limit: int = 50,
    offset: int = 0,
    tier: Optional[str] = None,
) -> list[StoryORM]:
    stmt = select(StoryORM).order_by(StoryORM.created_at.desc()).limit(limit).offset(offset)
    if tier:
        stmt = stmt.where(StoryORM.tier == tier.upper())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_story_count(session: AsyncSession, tier: Optional[str] = None) -> int:
    stmt = select(func.count(StoryORM.id))
    if tier:
        stmt = stmt.where(StoryORM.tier == tier.upper())
    result = await session.execute(stmt)
    return result.scalar_one()


async def get_related_stories(session: AsyncSession, story_id: str) -> list[StoryORM]:
    parent = await get_story_by_id(session, story_id)
    if not parent or not parent.related_story_ids:
        return []
    result = await session.execute(
        select(StoryORM).where(StoryORM.id.in_(parent.related_story_ids))
    )
    return list(result.scalars().all())
```

- [ ] **Step 4: Replace `briefing_repo.py`**

```python
"""Briefing repository — manages daily-briefing rows."""
from datetime import date
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.orm import BriefingORM


async def save_briefing(session: AsyncSession, briefing_date: date, story_ids: list[str]) -> None:
    """Upsert briefing for a date."""
    existing = await session.execute(select(BriefingORM).where(BriefingORM.briefing_date == briefing_date))
    row = existing.scalar_one_or_none()
    if row is not None:
        row.story_ids = story_ids
    else:
        session.add(BriefingORM(briefing_date=briefing_date, story_ids=story_ids))
    await session.commit()


async def get_by_date(session: AsyncSession, briefing_date: date) -> Optional[BriefingORM]:
    result = await session.execute(
        select(BriefingORM).where(BriefingORM.briefing_date == briefing_date)
    )
    return result.scalar_one_or_none()


async def get_today(session: AsyncSession) -> Optional[BriefingORM]:
    return await get_by_date(session, date.today())


async def get_today_with_fallback(session: AsyncSession) -> tuple[Optional[BriefingORM], bool]:
    """Return (briefing, is_today). Falls back to most recent if today's not present."""
    today_briefing = await get_today(session)
    if today_briefing:
        return (today_briefing, True)
    result = await session.execute(
        select(BriefingORM).order_by(BriefingORM.briefing_date.desc()).limit(1)
    )
    most_recent = result.scalar_one_or_none()
    return (most_recent, False) if most_recent else (None, False)
```

- [ ] **Step 5: Run tests to verify pass**

```bash
pytest backend/tests/test_repos.py -v
```
Expected: 6 PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/database/repositories/ backend/tests/test_repos.py
git commit -m "feat(db): migrate repos to async ORM with get_today_with_fallback"
```

---

### Task 1.7: Verify pipeline runs end-to-end against Postgres

**Files:** none modified (verification only). If pipeline calls fail, fix call sites.

- [ ] **Step 1: Ensure Postgres is up**

```bash
docker compose up -d postgres
```

- [ ] **Step 2: Run the seed-sources script if it exists**

```bash
ls scripts/
python scripts/seed_sources.py 2>/dev/null || echo "no seed script — proceeding"
```

- [ ] **Step 3: Run the pipeline**

```bash
python scripts/run_pipeline.py
```

Expected: Pipeline logs each stage. Final stage saves briefing. Exit 0.

If errors occur, they will be call-site mismatches between old sync repo signatures and new async signatures. Fix one at a time:
- Pipeline likely calls `save_stories(stories)` — change to `async with get_session() as s: await save_stories(s, stories)`
- Same pattern for `save_briefing`
- Convert pipeline functions to `async def` if not already (the existing `run_pipeline` is `async def` per the snippet)

- [ ] **Step 4: Verify briefing was written**

```bash
docker exec brainfeed-postgres psql -U brainfeed -c "SELECT briefing_date, jsonb_array_length(story_ids::jsonb) AS n FROM briefings ORDER BY briefing_date DESC LIMIT 1;"
```

Expected: One row, `n >= 10`.

- [ ] **Step 5: Commit any pipeline call-site fixes**

```bash
git add backend/scheduler/pipeline.py backend/scheduler/jobs.py
git commit -m "fix(pipeline): adapt call sites to async ORM repos"
```

---

# Phase 2 — Briefings endpoints + pipeline verification

**Goal:** Implement the three missing endpoints, frontend home page loads with real data, archive works.

**Done when:** Visiting `localhost:3000` shows today's briefing without console errors.

---

### Task 2.1: Implement `/api/briefings/today` endpoint (TDD)

**Files:**
- Modify: `backend/api/routes/briefings.py` (currently empty)
- Modify: `backend/api/schemas/briefing_schema.py` (add `is_today`)
- Create: `backend/tests/test_briefings_api.py`

- [ ] **Step 1: Write the failing API integration test**

```python
"""API integration tests using FastAPI's TestClient."""
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database.orm import StoryORM, BriefingORM


@pytest.fixture
async def seeded_today(test_session):
    """Seed today's briefing with 3 stories across 3 tiers."""
    today = date.today()
    for sid, tier in [("a1", "LOCAL"), ("a2", "NATIONAL"), ("a3", "GLOBAL")]:
        test_session.add(StoryORM(
            id=sid, title=sid, simplified_title=sid, simplified_body="b",
            quick_summary="q", tier=tier, category="POLITICS_POLICY",
            impact_score=70.0, confidence=0.8, source_count=2,
            sources=[], concepts=[], related_story_ids=[], ripple_effects=[],
        ))
    test_session.add(BriefingORM(briefing_date=today, story_ids=["a1", "a2", "a3"]))
    await test_session.commit()


async def test_get_today_returns_grouped_by_region(seeded_today, monkeypatch):
    # Force the API to use the test session
    from backend.database import connection
    monkeypatch.setattr(connection, "SessionLocal", lambda: seeded_today)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/briefings/today")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_today"] is True
    assert data["total_stories"] == 3
    assert "regions" in data
```

(NOTE: the monkeypatch trick is fragile across SQLAlchemy session lifecycles. Simpler approach: spin up real test DB once via conftest, drop env-injected `DATABASE_URL` at test start. Replace the monkeypatch with: `os.environ["DATABASE_URL"] = TEST_DATABASE_URL` in conftest before importing app.)

Recommended cleaner pattern — set `DATABASE_URL` env var to `TEST_DATABASE_URL` in conftest at session start, before any backend module is imported. Adjust `conftest.py` from Task 1.4 accordingly.

- [ ] **Step 2: Run the test to verify failure**

```bash
pytest backend/tests/test_briefings_api.py -v
```
Expected: 404 or 500 (endpoint doesn't exist).

- [ ] **Step 3: Update `briefing_schema.py`**

```python
from datetime import date
from typing import Dict, List, Optional
from pydantic import BaseModel
from backend.api.schemas.story_schema import StorySchema


class BriefingResponse(BaseModel):
    date: date
    regions: Dict[str, List[StorySchema]]
    total_stories: int
    is_today: bool


class BriefingNotFoundResponse(BaseModel):
    detail: str
```

- [ ] **Step 4: Implement `briefings.py`**

```python
"""Briefings API routes."""
from datetime import date as Date
from fastapi import APIRouter, HTTPException

from backend.api.schemas.briefing_schema import BriefingResponse
from backend.api.schemas.story_schema import StorySchema, SourceSchema
from backend.database.connection import SessionLocal
from backend.database.repositories import briefing_repo, story_repo
from backend.database.orm import StoryORM

router = APIRouter()


def _story_to_schema(s: StoryORM) -> StorySchema:
    return StorySchema(
        id=s.id, title=s.title, simplified_title=s.simplified_title,
        simplified_body=s.simplified_body, quick_summary=s.quick_summary,
        deep_analysis=s.deep_analysis, why_it_matters=s.why_it_matters,
        description=s.description, tier=s.tier, category=s.category,
        impact_score=s.impact_score, confidence=s.confidence,
        source_count=s.source_count, region=s.region, region_code=s.region_code,
        sources=[SourceSchema(**src) for src in (s.sources or [])],
        concepts=s.concepts or [],
        ripple_effects=s.ripple_effects or [],
        related_story_ids=s.related_story_ids or [],
        created_at=s.created_at, published_date=s.published_date,
    )


def _group_by_region(stories: list[StoryORM]) -> dict[str, list[StorySchema]]:
    groups: dict[str, list[StorySchema]] = {}
    for s in stories:
        key = s.region_code or s.tier or "UNCATEGORISED"
        groups.setdefault(key, []).append(_story_to_schema(s))
    return groups


@router.get("/api/briefings/today", response_model=BriefingResponse)
async def get_today_briefing() -> BriefingResponse:
    async with SessionLocal() as session:
        briefing, is_today = await briefing_repo.get_today_with_fallback(session)
        if briefing is None:
            raise HTTPException(404, "No briefings found")
        stories: list[StoryORM] = []
        for sid in briefing.story_ids:
            s = await story_repo.get_story_by_id(session, sid)
            if s:
                stories.append(s)
        return BriefingResponse(
            date=briefing.briefing_date,
            regions=_group_by_region(stories),
            total_stories=len(stories),
            is_today=is_today,
        )


@router.get("/api/briefings/{briefing_date}", response_model=BriefingResponse)
async def get_briefing_by_date(briefing_date: Date) -> BriefingResponse:
    async with SessionLocal() as session:
        briefing = await briefing_repo.get_by_date(session, briefing_date)
        if briefing is None:
            raise HTTPException(404, "No briefing for that date")
        stories: list[StoryORM] = []
        for sid in briefing.story_ids:
            s = await story_repo.get_story_by_id(session, sid)
            if s:
                stories.append(s)
        return BriefingResponse(
            date=briefing.briefing_date,
            regions=_group_by_region(stories),
            total_stories=len(stories),
            is_today=(briefing.briefing_date == Date.today()),
        )
```

- [ ] **Step 5: Run test to verify pass**

```bash
pytest backend/tests/test_briefings_api.py -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/api/routes/briefings.py backend/api/schemas/briefing_schema.py backend/tests/test_briefings_api.py
git commit -m "feat(api): implement /briefings/today and /briefings/{date} with fallback"
```

---

### Task 2.2: Implement `/api/stories/{id}/related` (TDD)

**Files:**
- Modify: `backend/api/routes/stories.py`
- Append to: `backend/tests/test_briefings_api.py`

- [ ] **Step 1: Write failing test**

Append:

```python
async def test_get_related_stories(test_session, monkeypatch):
    # Two stories, one references the other
    test_session.add(StoryORM(
        id="r1", title="r1", simplified_title="r1", simplified_body="b",
        quick_summary="q", tier="GLOBAL", category="POLITICS_POLICY",
        impact_score=50.0, confidence=0.8, source_count=1,
        sources=[], concepts=[], related_story_ids=["r2"], ripple_effects=[],
    ))
    test_session.add(StoryORM(
        id="r2", title="r2", simplified_title="r2", simplified_body="b",
        quick_summary="q", tier="GLOBAL", category="POLITICS_POLICY",
        impact_score=40.0, confidence=0.7, source_count=1,
        sources=[], concepts=[], related_story_ids=[], ripple_effects=[],
    ))
    await test_session.commit()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/stories/r1/related")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["id"] == "r2"
```

- [ ] **Step 2: Run to verify failure** (404)

```bash
pytest backend/tests/test_briefings_api.py::test_get_related_stories -v
```

- [ ] **Step 3: Add endpoint to `stories.py`**

Add to the existing file:

```python
from backend.database.connection import SessionLocal


@router.get("/api/stories/{story_id}/related", response_model=list[StorySchema])
async def get_related(story_id: str) -> list[StorySchema]:
    async with SessionLocal() as session:
        related = await story_repo.get_related_stories(session, story_id)
        return [_story_to_schema(s) for s in related]
```

(Adjust `_story_to_schema` import — the existing function in `stories.py` accepts a dataclass `Story`. Replace it with the ORM version from `briefings.py`, OR move `_story_to_schema` to a shared `backend/api/_helpers.py` module.)

- [ ] **Step 4: Run to verify pass**

```bash
pytest backend/tests/test_briefings_api.py::test_get_related_stories -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/api/routes/stories.py backend/tests/test_briefings_api.py
git commit -m "feat(api): add /stories/{id}/related endpoint"
```

---

### Task 2.3: Manual smoke — frontend loads today's briefing

**Files:** none modified (smoke check).

- [ ] **Step 1: Start backend + Postgres**

```bash
docker compose up -d postgres
cd backend && uvicorn main:app --reload --port 8000 &
```

- [ ] **Step 2: Confirm pipeline has produced today's briefing**

If empty:
```bash
python scripts/run_pipeline.py
```

- [ ] **Step 3: Start frontend**

```bash
cd frontend && npm install && npm run dev
```

- [ ] **Step 4: Open browser**

Navigate to `http://localhost:3000`. Verify:
- Page loads without "Failed to fetch" error
- Stories render
- Open browser DevTools console — no red errors
- Click into a story — story page loads

If anything fails, debug at the boundary (network tab → which request 4xx/5xx → match to backend log).

- [ ] **Step 5: Commit a `MIGRATION_NOTES.md` if any tweaks needed**

```bash
git add -A
git commit -m "docs: notes on local dev migration to postgres" || echo "no changes"
```

---

# Phase 3 — Reading UX polish

**Goal:** Story page renders all six new sections (why-it-matters, concepts, ripple-effects placeholder, deep-analysis toggle, related-stories sidebar, sources panel with confidence). Mobile responsive. Both themes look good.

**Done when:** A story with all fields populated renders cleanly desktop + mobile in both themes; stories with missing optional fields gracefully hide those sections.

---

### Task 3.1: Add vitest + testing-library to brainfeed frontend

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test-setup.ts`

- [ ] **Step 1: Install deps**

```bash
cd frontend && npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/react @types/react-dom
```

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` object, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Verify test runner works**

```bash
cd frontend && npm test
```
Expected: `No test files found`. No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test-setup.ts
git commit -m "test(frontend): add vitest + testing-library setup"
```

---

### Task 3.2: Add `RippleEffect` type and extend `Story` (TDD via type-check)

**Files:**
- Modify: `frontend/src/lib/types.ts`

- [ ] **Step 1: Add type to `types.ts`**

Append above the `Story` interface:

```typescript
export interface RippleEffect {
  summary: string;
  horizon: "days" | "weeks" | "months" | "years";
  confidence: "low" | "medium" | "high";
}
```

Add to the `Story` interface (after `concepts`):

```typescript
  ripple_effects?: RippleEffect[];
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat(types): add RippleEffect type to Story"
```

---

### Task 3.3: Build `RippleEffectsCallout` component (TDD)

**Files:**
- Create: `frontend/src/components/RippleEffectsCallout.tsx`
- Create: `frontend/src/components/__tests__/RippleEffectsCallout.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
import { render, screen } from "@testing-library/react";
import RippleEffectsCallout from "../RippleEffectsCallout";

describe("RippleEffectsCallout", () => {
  it("renders nothing when effects is empty", () => {
    const { container } = render(<RippleEffectsCallout effects={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders effects with horizon and confidence", () => {
    render(
      <RippleEffectsCallout
        effects={[
          { summary: "Mortgage holders see repayment rises", horizon: "weeks", confidence: "high" },
          { summary: "Construction sector slows", horizon: "months", confidence: "medium" },
        ]}
      />,
    );
    expect(screen.getByText(/What might happen next/i)).toBeInTheDocument();
    expect(screen.getByText(/Mortgage holders/)).toBeInTheDocument();
    expect(screen.getByText(/weeks/)).toBeInTheDocument();
    expect(screen.getByText(/high/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RippleEffectsCallout.tsx`**

```typescript
import { TrendingUp } from "lucide-react";
import type { RippleEffect } from "@/lib/types";

interface Props {
  effects: RippleEffect[];
}

const HORIZON_LABEL: Record<RippleEffect["horizon"], string> = {
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  years: "Years",
};

const CONFIDENCE_STYLES: Record<RippleEffect["confidence"], string> = {
  low: "text-content-faint",
  medium: "text-amber-400",
  high: "text-emerald-400",
};

export default function RippleEffectsCallout({ effects }: Props) {
  if (!effects.length) return null;

  return (
    <section className="mt-8 rounded-lg bg-surface-hover/40 border border-content-faint/10 p-5">
      <header className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-content-dim" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-content-dim">
          What might happen next
        </h2>
      </header>
      <ul className="space-y-3">
        {effects.map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-[11px] font-mono text-content-faint pt-1 w-12 shrink-0">
              {HORIZON_LABEL[e.horizon]}
            </span>
            <p className="text-[14px] text-content leading-snug flex-1">
              {e.summary}{" "}
              <span className={`text-[11px] uppercase tracking-wider ${CONFIDENCE_STYLES[e.confidence]}`}>
                · {e.confidence}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd frontend && npm test
```
Expected: 2 PASSED.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/RippleEffectsCallout.tsx frontend/src/components/__tests__/RippleEffectsCallout.test.tsx
git commit -m "feat(ui): add RippleEffectsCallout component"
```

---

### Task 3.4: Add confidence meter to `SourcePanel` (TDD)

**Files:**
- Modify: `frontend/src/components/SourcePanel.tsx`
- Create: `frontend/src/components/__tests__/SourcePanel.test.tsx`

- [ ] **Step 1: Read existing `SourcePanel.tsx`**

```bash
cat frontend/src/components/SourcePanel.tsx
```

- [ ] **Step 2: Write failing test**

```typescript
import { render, screen } from "@testing-library/react";
import SourcePanel from "../SourcePanel";

describe("SourcePanel", () => {
  it("shows 'Single source' when source_count is 1", () => {
    render(<SourcePanel sources={[{ name: "ABC", url: "https://abc.net.au" }]} confidence={0.5} sourceCount={1} />);
    expect(screen.getByText(/Single source/i)).toBeInTheDocument();
  });

  it("shows 'Multi-confirmed' when source_count >= 3", () => {
    render(<SourcePanel sources={[
      { name: "ABC", url: "x" }, { name: "BBC", url: "y" }, { name: "Reuters", url: "z" }
    ]} confidence={0.9} sourceCount={3} />);
    expect(screen.getByText(/Multi-confirmed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify failure**

- [ ] **Step 4: Modify `SourcePanel.tsx`** — accept new `confidence` and `sourceCount` props (or wire from a single Story prop), add a small meter at the top:

```typescript
function confidenceLabel(count: number): string {
  if (count >= 3) return "Multi-confirmed";
  if (count >= 2) return "Confirmed";
  return "Single source";
}
```

Render the label inline above the source list with appropriate Tailwind colour (red <2, amber =2, emerald >=3).

- [ ] **Step 5: Run to verify pass**

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SourcePanel.tsx frontend/src/components/__tests__/SourcePanel.test.tsx
git commit -m "feat(ui): add confidence meter to SourcePanel"
```

---

### Task 3.5: Build `RelatedStoriesSidebar`

**Files:**
- Create: `frontend/src/components/RelatedStoriesSidebar.tsx`

- [ ] **Step 1: Implement**

```typescript
import Link from "next/link";
import type { Story } from "@/lib/types";

interface Props {
  stories: Story[];
}

export default function RelatedStoriesSidebar({ stories }: Props) {
  if (!stories.length) return null;
  return (
    <aside className="mt-8 border-t border-content-faint/10 pt-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-content-dim mb-3">
        Related stories
      </h2>
      <ul className="space-y-3">
        {stories.map((s) => (
          <li key={s.id}>
            <Link
              href={`/story/${s.id}`}
              className="block text-[14px] text-content hover:text-content-dim transition-colors"
            >
              {s.simplified_title || s.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/RelatedStoriesSidebar.tsx
git commit -m "feat(ui): add RelatedStoriesSidebar component"
```

---

### Task 3.6: Wire new components into the story page

**Files:**
- Modify: `frontend/src/app/story/[id]/page.tsx`

- [ ] **Step 1: Read current story page** (already done in spec brainstorming)

- [ ] **Step 2: Add imports**

```typescript
import RippleEffectsCallout from "@/components/RippleEffectsCallout";
import RelatedStoriesSidebar from "@/components/RelatedStoriesSidebar";
```

- [ ] **Step 3: Insert components in JSX**

Inside the `<article>` element, after the deep analysis section (or wherever flow makes sense):

```tsx
<RippleEffectsCallout effects={story.ripple_effects ?? []} />
<RelatedStoriesSidebar stories={relatedStories} />
```

- [ ] **Step 4: Verify in browser**

Refresh `localhost:3000/story/<some-id>` — confirm new sections render. They will be empty for now (until P4 populates ripple_effects), but the related-stories sidebar should show if any related stories exist.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/story/[id]/page.tsx
git commit -m "feat(ui): wire RippleEffects and RelatedStories into story page"
```

---

### Task 3.7: Manual smoke — mobile + theme check

**Files:** none modified.

- [ ] **Step 1: Resize browser to <768px width** — verify story page stacks cleanly, no horizontal scroll, callouts and sidebar still readable.

- [ ] **Step 2: Toggle to light theme** — verify all new sections respect theme tokens (text-content, bg-surface-hover, etc., not hardcoded colours)

- [ ] **Step 3: Pick three stories** — one with rich content (concepts + why_it_matters + deep_analysis), one bare (no concepts, no deep_analysis). Verify the bare one hides empty sections cleanly.

- [ ] **Step 4: If broken, fix and commit**

```bash
git add -A && git commit -m "fix(ui): theme/mobile polish" || echo "no fixes needed"
```

---

# Phase 4 — Embeddings + predictor agent + ripple-effects pipeline

**Goal:** Pipeline produces ripple_effects for high-impact stories, populates embeddings silently, frontend renders the new feature.

**Done when:** Run `python scripts/run_pipeline.py`; query `SELECT count(*) FROM stories WHERE jsonb_array_length(ripple_effects) > 0` returns ≥ 5; query `SELECT count(*) FROM stories WHERE embedding IS NOT NULL` returns equal to total story count; frontend displays ripple_effects on a real story.

---

### Task 4.1: Build the predictor prompt + JSON parser (TDD)

**Files:**
- Create: `backend/agents/predictor.py`
- Create: `backend/tests/test_predictor.py`

- [ ] **Step 1: Write failing tests**

```python
"""Predictor agent tests (mocked LLM)."""
import json
from unittest.mock import MagicMock
from backend.agents.predictor import (
    build_predictor_prompt,
    parse_predictor_response,
    predict_ripple_effects,
)


def test_build_prompt_includes_required_fields():
    prompt = build_predictor_prompt(
        simplified_body="Body",
        deep_analysis="Analysis",
        impact_score=85.0,
        category="ECONOMY_MARKETS",
    )
    assert "Body" in prompt
    assert "Analysis" in prompt
    assert "85" in prompt
    assert "ECONOMY_MARKETS" in prompt


def test_parse_valid_response():
    raw = json.dumps([
        {"summary": "Rates rise", "horizon": "weeks", "confidence": "high"},
        {"summary": "Equities dip", "horizon": "days", "confidence": "medium"},
    ])
    result = parse_predictor_response(raw)
    assert len(result) == 2
    assert result[0]["horizon"] == "weeks"


def test_parse_invalid_horizon_filters_entry():
    raw = json.dumps([
        {"summary": "ok", "horizon": "weeks", "confidence": "high"},
        {"summary": "bad", "horizon": "centuries", "confidence": "high"},
    ])
    result = parse_predictor_response(raw)
    assert len(result) == 1
    assert result[0]["summary"] == "ok"


def test_parse_invalid_json_returns_empty():
    assert parse_predictor_response("not json") == []


def test_predict_skips_low_impact_stories(monkeypatch):
    """Stories with impact_score < 60 should return empty list without hitting the LLM."""
    called = {"count": 0}

    def fake_call(*args, **kwargs):
        called["count"] += 1
        return "[]"

    monkeypatch.setattr("backend.agents.predictor.call_llm", fake_call)
    result = predict_ripple_effects(
        simplified_body="b", deep_analysis="d",
        impact_score=40.0, category="HEALTH",
    )
    assert result == []
    assert called["count"] == 0
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pytest backend/tests/test_predictor.py -v
```
Expected: ImportError.

- [ ] **Step 3: Implement `predictor.py`**

```python
"""Predictor agent — generates ripple_effects[] for high-impact stories.

Returns empty list for stories with impact_score < 60 (cost optimisation).
Uses Sonnet — structured output doesn't need Opus reasoning.
"""
import json
import logging
from typing import Optional

from backend.agents.base_agent import call_llm

logger = logging.getLogger(__name__)

VALID_HORIZONS = {"days", "weeks", "months", "years"}
VALID_CONFIDENCES = {"low", "medium", "high"}
MIN_IMPACT = 60.0
MAX_EFFECTS = 3

SYSTEM_PROMPT = """You produce ripple-effect predictions for news stories. For each story, output 2-3 likely second-order effects with a time horizon (days/weeks/months/years) and a confidence (low/medium/high).

Be SPECIFIC. Avoid fortune-cookie filler like "this could lead to volatility" or "may have implications". A good prediction names a concrete actor, mechanism, or outcome ("Variable-rate mortgage holders likely to see repayments rise within 2-3 months as banks pass through the cash-rate increase").

If you cannot make a specific, grounded prediction, output an empty array [].

Output ONLY valid JSON — no prose, no markdown fence. Schema:
[{"summary": "...", "horizon": "weeks", "confidence": "high"}, ...]"""


def build_predictor_prompt(
    simplified_body: str,
    deep_analysis: Optional[str],
    impact_score: float,
    category: str,
) -> str:
    parts = [
        f"Category: {category}",
        f"Impact score: {impact_score:.0f}",
        f"Story:\n{simplified_body}",
    ]
    if deep_analysis:
        parts.append(f"Deep analysis:\n{deep_analysis}")
    parts.append("Produce 2-3 ripple effects.")
    return "\n\n".join(parts)


def parse_predictor_response(raw: str) -> list[dict]:
    try:
        data = json.loads(raw.strip())
    except json.JSONDecodeError:
        logger.warning("predictor: invalid JSON: %s", raw[:200])
        return []
    if not isinstance(data, list):
        return []
    cleaned = []
    for entry in data[:MAX_EFFECTS]:
        if not isinstance(entry, dict):
            continue
        h = entry.get("horizon")
        c = entry.get("confidence")
        s = entry.get("summary")
        if h in VALID_HORIZONS and c in VALID_CONFIDENCES and isinstance(s, str) and s.strip():
            cleaned.append({"summary": s.strip(), "horizon": h, "confidence": c})
    return cleaned


def predict_ripple_effects(
    simplified_body: str,
    deep_analysis: Optional[str],
    impact_score: float,
    category: str,
) -> list[dict]:
    if impact_score < MIN_IMPACT:
        return []
    user_msg = build_predictor_prompt(simplified_body, deep_analysis, impact_score, category)
    raw = call_llm(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_msg,
        model="claude-sonnet-4-6",
        max_tokens=1024,
        temperature=0.4,
        agent_name="predictor",
    )
    if not raw:
        return []
    return parse_predictor_response(raw)
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest backend/tests/test_predictor.py -v
```
Expected: 5 PASSED.

- [ ] **Step 5: Commit**

```bash
git add backend/agents/predictor.py backend/tests/test_predictor.py
git commit -m "feat(agents): add predictor agent for ripple_effects with TDD"
```

---

### Task 4.2: Build the embedder (TDD)

**Files:**
- Create: `backend/ingestion/embedder.py`
- Create: `backend/tests/test_embedder.py`

- [ ] **Step 1: Write failing tests**

```python
"""Embedder tests — verify graceful failure and input shape."""
from unittest.mock import MagicMock, patch
import pytest
from backend.ingestion.embedder import embed_text, embed_story_batch


def test_embed_text_returns_vector_on_success():
    fake_resp = MagicMock()
    fake_resp.data = [MagicMock(embedding=[0.1] * 1536)]
    with patch("backend.ingestion.embedder._get_client") as mock:
        mock.return_value.embeddings.create.return_value = fake_resp
        v = embed_text("hello")
    assert len(v) == 1536


def test_embed_text_returns_none_on_api_error():
    with patch("backend.ingestion.embedder._get_client") as mock:
        mock.return_value.embeddings.create.side_effect = Exception("rate limit")
        v = embed_text("hello")
    assert v is None


def test_embed_text_handles_empty_input():
    assert embed_text("") is None
    assert embed_text("   ") is None
```

- [ ] **Step 2: Run to verify failure**

- [ ] **Step 3: Implement `embedder.py`**

```python
"""Embedder — wraps OpenAI text-embedding-3-small.

Designed to fail open: errors return None, the pipeline continues, the story
saves with embedding=NULL. Cost: ~$0.02 per 1M tokens.
"""
import logging
import os
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

MODEL = "text-embedding-3-small"
DIMENSIONS = 1536

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def embed_text(text: str) -> Optional[list[float]]:
    if not text or not text.strip():
        return None
    try:
        resp = _get_client().embeddings.create(model=MODEL, input=text[:8000])
        return resp.data[0].embedding
    except Exception as e:
        logger.warning("embedder failed: %s", e)
        return None


def embed_story_batch(texts: list[str]) -> list[Optional[list[float]]]:
    """Batch embedding for efficiency. Each input gets a vector or None."""
    cleaned = [(i, t.strip()[:8000]) for i, t in enumerate(texts) if t and t.strip()]
    if not cleaned:
        return [None] * len(texts)
    try:
        resp = _get_client().embeddings.create(
            model=MODEL,
            input=[t for _, t in cleaned],
        )
        results: list[Optional[list[float]]] = [None] * len(texts)
        for (orig_idx, _), vec in zip(cleaned, resp.data):
            results[orig_idx] = vec.embedding
        return results
    except Exception as e:
        logger.warning("embedder batch failed: %s", e)
        return [None] * len(texts)
```

- [ ] **Step 4: Run to verify pass**

- [ ] **Step 5: Commit**

```bash
git add backend/ingestion/embedder.py backend/tests/test_embedder.py
git commit -m "feat(ingestion): add embedder with graceful API-error handling"
```

---

### Task 4.3: Wire predictor + embedder into pipeline

**Files:**
- Modify: `backend/scheduler/pipeline.py`
- Modify: `backend/models/story.py` (add fields to dataclass for in-memory pipeline use)

- [ ] **Step 1: Update `models/story.py`** to add `ripple_effects` and `embedding` to the `Story` dataclass:

```python
    ripple_effects: list[dict] = field(default_factory=list)
    embedding: Optional[list[float]] = None
```

- [ ] **Step 2: Modify `pipeline.py`** — add new stages

After the `link_stories` call, before `save_briefing`/`save_stories`:

```python
    # Stage 9.5: Predict ripple effects for high-impact stories
    logger.info("Stage 9.5: Predicting ripple effects...")
    from backend.agents.predictor import predict_ripple_effects
    for story in linked:
        story.ripple_effects = predict_ripple_effects(
            simplified_body=story.simplified_body,
            deep_analysis=story.deep_analysis,
            impact_score=story.impact_score,
            category=story.category,
        )
    logger.info("Ripple effects: %d stories with predictions",
                sum(1 for s in linked if s.ripple_effects))

    # Stage 9.6: Embed stories silently
    logger.info("Stage 9.6: Embedding stories...")
    from backend.ingestion.embedder import embed_story_batch
    texts = [f"{s.simplified_title} {s.simplified_body}" for s in linked]
    vectors = embed_story_batch(texts)
    for story, vec in zip(linked, vectors):
        story.embedding = vec
    logger.info("Embedded: %d / %d stories", sum(1 for v in vectors if v), len(vectors))
```

(Adapt variable name `linked` to whatever the existing pipeline binds — the snippet I read earlier showed `verified` after stage 6; trace through to find the binding after `link_stories`.)

- [ ] **Step 3: Update `save_stories` ORM helper to persist new fields**

In `story_repo.save_stories` (and wherever the dataclass→ORM conversion happens), make sure `ripple_effects` and `embedding` get copied into the `StoryORM` row.

If a converter function `_dataclass_to_orm(s: Story) -> StoryORM` doesn't exist, write one in `backend/database/repositories/story_repo.py`:

```python
from backend.models.story import Story
from backend.database.orm import StoryORM


def dataclass_to_orm(s: Story) -> StoryORM:
    return StoryORM(
        id=s.id, title=s.title, simplified_title=s.simplified_title,
        simplified_body=s.simplified_body, quick_summary=s.quick_summary,
        deep_analysis=s.deep_analysis,
        why_it_matters=getattr(s, "why_it_matters", None),
        description=s.description, tier=s.tier, category=s.category,
        impact_score=s.impact_score, confidence=s.confidence,
        source_count=s.source_count,
        region=getattr(s, "region", None),
        region_code=getattr(s, "region_code", None),
        sources=[{"name": src.name, "url": src.url} for src in s.sources],
        concepts=getattr(s, "concepts", []),
        related_story_ids=s.related_story_ids,
        ripple_effects=s.ripple_effects,
        embedding=s.embedding,
        published_date=s.published_date,
        created_at=s.created_at,
    )
```

Update `save_stories` to call this converter.

- [ ] **Step 4: Run pipeline end-to-end**

```bash
python scripts/run_pipeline.py
```

Watch logs for:
- Stage 9.5 line: should report some stories with predictions
- Stage 9.6 line: should report embedded count

- [ ] **Step 5: Verify in DB**

```bash
docker exec brainfeed-postgres psql -U brainfeed -c "SELECT count(*) FILTER (WHERE jsonb_array_length(ripple_effects) > 0) AS with_ripples, count(*) FILTER (WHERE embedding IS NOT NULL) AS with_embeddings, count(*) AS total FROM stories;"
```

Expected: `with_ripples >= 3`, `with_embeddings = total`.

- [ ] **Step 6: Commit**

```bash
git add backend/scheduler/pipeline.py backend/models/story.py backend/database/repositories/story_repo.py
git commit -m "feat(pipeline): integrate predictor + embedder stages"
```

---

### Task 4.4: Manual quality check on 10 predictions

**Files:** none modified (quality smoke).

- [ ] **Step 1: Query 10 ripple_effects entries**

```bash
docker exec brainfeed-postgres psql -U brainfeed -c "SELECT id, ripple_effects FROM stories WHERE jsonb_array_length(ripple_effects) > 0 LIMIT 10;" | tee /tmp/ripples.txt
```

- [ ] **Step 2: Read each prediction. Score each as either:**
   - GOOD: specific, names actor/mechanism/horizon clearly
   - FILLER: vague, "could lead to volatility", "may have implications"

- [ ] **Step 3: If filler ratio > 2/10**, sharpen `SYSTEM_PROMPT` in `predictor.py`:
   - Add explicit examples of GOOD vs FILLER predictions
   - Re-run pipeline
   - Re-score

- [ ] **Step 4: Commit prompt iteration if needed**

```bash
git add backend/agents/predictor.py
git commit -m "tune(predictor): sharpen prompt to reduce fortune-cookie filler" || echo "no changes"
```

---

# Phase 5 — Jarvis tool wiring

**Goal:** Jarvis has a `get_daily_briefing` tool that returns the curated 15. Existing `list_brief_stories` and `get_brief_story` are verified working end-to-end. Tool descriptions sharpened so Claude reaches for the right one.

**Note:** Files in this phase live in `/Users/kunwar/Desktop/Projects/jarvis/`, not the brainfeed repo. Switch directories or use absolute paths.

**Done when:** Manual smoke — chat: "what's today's briefing?" returns a tight summary; "tell me more about the second one" pulls full story; "what's been happening with [topic] over the last week?" picks worldmonitor's GDELT search.

---

### Task 5.1: Add `getDailyBriefing` to Jarvis brainfeed client

**Files:**
- Modify: `/Users/kunwar/Desktop/Projects/jarvis/src/lib/brainfeed.ts`

- [ ] **Step 1: Append to `brainfeed.ts`**

```typescript
export type DailyBriefingArgs = { tier?: "LOCAL" | "NATIONAL" | "GLOBAL" | "OCEANIA" | "ASIA_PACIFIC" };

export const getDailyBriefing = async (args: DailyBriefingArgs) => {
  const briefing = (await bfGet("/api/briefings/today")) as {
    date: string;
    regions: Record<string, unknown[]>;
    total_stories: number;
    is_today: boolean;
  };
  if (!args.tier) return briefing;
  // Filter regions to just the requested tier
  const filteredRegions: Record<string, unknown[]> = {};
  for (const [k, v] of Object.entries(briefing.regions)) {
    if (k.toUpperCase() === args.tier.toUpperCase()) filteredRegions[k] = v;
  }
  return { ...briefing, regions: filteredRegions };
};
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/kunwar/Desktop/Projects/jarvis && npx tsc --noEmit
```

- [ ] **Step 3: Commit (in jarvis repo)**

```bash
cd /Users/kunwar/Desktop/Projects/jarvis
git add src/lib/brainfeed.ts
git commit -m "feat(brainfeed): add getDailyBriefing client for /api/briefings/today"
```

---

### Task 5.2: Add the `get_daily_briefing` tool definition + dispatcher

**Files:**
- Modify: `/Users/kunwar/Desktop/Projects/jarvis/src/lib/tools.ts`

- [ ] **Step 1: Add tool def**

In the `tools` array, before `list_brief_stories`:

```typescript
  {
    name: "get_daily_briefing",
    description:
      "Fetch today's curated 15-story Brainfeed briefing — the morning brief with simplified bodies, sources, why-it-matters, ripple effects ('what might happen next'), and concept glosses. Use this when the user asks 'what's the daily briefing', 'what's today's brief', 'morning brief', or wants the curated digest. Prefer this over get_feed_digest when the user wants the simplified, comprehension-focused view rather than the raw worldmonitor firehose.",
    input_schema: {
      type: "object",
      properties: {
        tier: {
          type: "string",
          description:
            "Optional tier filter. Options: 'OCEANIA' (Australia/Pacific), 'ASIA_PACIFIC', 'GLOBAL'. Omit for all tiers.",
        },
      },
    },
  },
```

- [ ] **Step 2: Add dispatcher case**

In the `runTool` switch, before `case "list_brief_stories":`

```typescript
      case "get_daily_briefing":
        result = await bf.getDailyBriefing({ tier: input.tier as any });
        break;
```

- [ ] **Step 3: Sharpen `list_brief_stories` description**

Replace its existing description with:

```
"Fetch a paginated raw list of recent Brainfeed stories — use for archive lookups, browsing past stories, or when the user wants more than the curated 15. For 'today's briefing' or the morning brief, use get_daily_briefing instead."
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/kunwar/Desktop/Projects/jarvis && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/kunwar/Desktop/Projects/jarvis
git add src/lib/tools.ts
git commit -m "feat(tools): add get_daily_briefing tool, sharpen list_brief_stories desc"
```

---

### Task 5.3: Manual end-to-end smoke

**Files:** none modified.

- [ ] **Step 1: Start brainfeed backend**

```bash
cd /Users/kunwar/Desktop/Projects/brainfeed
docker compose up -d postgres
cd backend && uvicorn main:app --reload --port 8000 &
```

- [ ] **Step 2: Confirm a fresh briefing exists** — `curl http://localhost:8000/api/briefings/today | jq '.total_stories'`. Should return ≥ 10. If not, run pipeline.

- [ ] **Step 3: Start Jarvis** — `cd /Users/kunwar/Desktop/Projects/jarvis && npm run dev`

- [ ] **Step 4: Smoke test the three Jarvis interactions**

In the Jarvis chat:

| # | Prompt | Expected behaviour |
|---|---|---|
| 1 | "What's today's briefing?" | Tool call: `get_daily_briefing`. Response: tight 3–5 bullet morning brief format per system prompt. |
| 2 | "Tell me more about the second one" | Tool call: `get_brief_story` with the correct ID from the previous response. Response: deeper context on that story. |
| 3 | "What's been happening with the AUKUS pact over the last week?" | Tool call: `search_news` (worldmonitor GDELT), NOT `list_brief_stories`. Topic-search behaviour, not briefing-pull. |

- [ ] **Step 5: If Claude picks the wrong tool in #1 or #3**, sharpen tool descriptions and re-test. Iterate until all three smoke scenarios produce the expected tool choice.

- [ ] **Step 6: Document the smoke checklist**

Add to `jarvis/AGENTS.md` (or create `jarvis/SMOKE.md`):

```markdown
## Brainfeed integration smoke

After any change to brainfeed tools, run these three prompts in the chat UI:
1. "What's today's briefing?" → must call `get_daily_briefing`
2. "Tell me more about the second one" → must call `get_brief_story` with a real ID
3. "What's been happening with [recent topic] over the last week?" → must call `search_news`
```

- [ ] **Step 7: Commit**

```bash
cd /Users/kunwar/Desktop/Projects/jarvis
git add AGENTS.md  # or SMOKE.md if new
git commit -m "docs: add brainfeed integration smoke checklist" || echo "no changes"
```

---

## Self-Review Checklist (run after writing the plan)

**Spec coverage check** — does each spec item have a task?

| Spec item | Task |
|---|---|
| Postgres + pgvector migration | Tasks 1.1–1.7 |
| `embedding` and `ripple_effects` columns | Task 1.3 (ORM), Task 4.3 (population) |
| `/api/briefings/today` with fallback | Task 2.1 |
| `/api/briefings/{date}` | Task 2.1 |
| `/api/stories/{id}/related` | Task 2.2 |
| Frontend renders concepts + why_it_matters + sources + deep | Pre-existing components verified in Task 2.3 smoke + Task 3.7 polish smoke |
| Frontend renders ripple_effects callout | Task 3.3 + Task 3.6 wiring |
| Frontend related-stories sidebar | Task 3.5 + Task 3.6 |
| Source confidence meter | Task 3.4 |
| DepthToggle wires data switching | (existing component, verified Task 3.7 — if missing, add as Task 3.6.5) |
| Predictor agent (Sonnet, ripple_effects) | Task 4.1 |
| Embedder (silent indexing) | Task 4.2 |
| Pipeline integration | Task 4.3 |
| Manual quality check on predictions | Task 4.4 |
| `get_daily_briefing` Jarvis tool | Tasks 5.1–5.2 |
| Sharpen `list_brief_stories` description | Task 5.2 |
| Verify `get_brief_story` works end-to-end | Task 5.3 step 4 #2 |
| End-to-end smoke (3 prompts) | Task 5.3 |

**Memory hooks** — spec said note `// TODO(memory):` hook points but defer Mem0 client. No tasks in this plan touch memory; that's correct per the spec's "deferred" decision.

**Anticipated failure modes** — does the plan address each?

| Failure mode | Where addressed |
|---|---|
| Pipeline silently produces 0 stories | Task 1.7 step 4 verification query; Task 5.3 step 2 curl-count |
| `briefings/today` returns stale "today" date | `is_today` flag in response, Task 1.6 test, Task 2.1 test |
| Tool returns 50KB JSON | Existing 20KB truncation in `tools.ts`; Task 5.3 step 4 #1 implicitly tests this with a real briefing |
| Claude picks wrong tool | Task 5.3 step 4 #1 and #3 explicitly test; step 5 iterates if wrong |
| Predictor outputs filler | Task 4.4 quality check + iteration |
| Embedding API costs balloon | base_agent already logs token usage; embedder fails-open so a bad key doesn't crash pipeline |
| Postgres migration breaks existing dev | Migration is the *first* phase, no parallel SQLite branch to maintain |
| Frontend empty callouts for missing fields | Task 3.3 test "renders nothing when effects is empty"; Task 3.7 smoke step 3 picks a bare story |
| pgvector embeddings NULL because key missing | Task 4.2 graceful-failure test; Task 4.3 step 5 query distinguishes |
| Claude hallucinates story IDs | Task 5.3 step 4 #2 catches this; if it fails, tighten system prompt to require IDs from prior tool responses |

**Type consistency check:**
- `RippleEffect` shape: `{summary, horizon, confidence}` consistent across `predictor.py` validation, `orm.py` JSON column, `types.ts` TS interface, `RippleEffectsCallout.tsx` props ✓
- `BriefingResponse.is_today` boolean consistent across schema, repo return type, route ✓
- ORM column names match repo query attribute access ✓

**Placeholder scan:** No "TBD", "TODO", "implement later" in task steps. The Phase 4 prompt sharpening loop (Task 4.4 step 3) is intentionally iterative, not a placeholder. ✓

---

## Notes for the implementing agent

- **Run in a worktree.** Create one before starting: `git worktree add ../brainfeed-spec01 main && cd ../brainfeed-spec01`. Each phase = one logical work session; commit after each task; merge to main when a phase is fully shipped.
- **Phases are independently shippable.** After Phase 1, deploy is a no-op (no user-visible change). After Phase 2, the brainfeed website works again — that's a real ship. After Phase 3, the read experience is polished — another ship. After Phase 4, the predictions feature is live. After Phase 5, Jarvis can speak the briefing.
- **Don't skip the smoke checklists.** They're how the "anticipated failure modes" actually get caught.
- **If a test is hard to write, the design is wrong.** Stop and rethink before writing more code.
- **Commit small.** Every task ends with a commit. If you need to commit mid-task, do.
