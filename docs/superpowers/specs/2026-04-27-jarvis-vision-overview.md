# Jarvis Vision — Umbrella Design

**Date:** 2026-04-27
**Status:** Approved (umbrella scope)
**Scope:** Multi-project, three apps, six sub-projects

---

## Vision

A laptop-resident AI assistant ("Jarvis") that is the user's front door to understanding what's happening in the world.

The user double-claps to wake Jarvis, asks "what's happening in the world?", and Jarvis pulls from:
- **worldmonitor** — raw firehose of 435+ feeds, 45 data layers, country intel, market signals
- **brainfeed** — 15 curated, simplified daily stories with sources, concept glosses, "why it matters", deep analysis, ripple-effect predictions
- **memory** — what the user already knows, prior conversations, portfolio context

…and synthesises a tight, Brisbane/AU-lens, portfolio-aware spoken answer with ElevenLabs TTS.

The user can also click around the worldmonitor desktop app visually and ask Jarvis follow-up questions about what's on screen ("what's happening in that region?") — Jarvis knows the on-screen context and can also send commands back ("show me Ukraine", "switch to the finance variant", "filter to last 24h").

---

## Three apps, all on the laptop

| App | Today | After everything ships |
|---|---|---|
| **worldmonitor** | Tauri desktop app, exists. Read-only HTTP API. | Same + bidirectional control & context channel with Jarvis |
| **brainfeed** | Next.js site, half-built, dormant 7 weeks. SQLite. | Polished standalone news-reading site (consumer product), backed by Postgres+pgvector, with `ripple_effects` predictions, exposed to Jarvis via tools |
| **Jarvis** | Next.js chat, text-only, talks to worldmonitor + brainfeed + marketmate over HTTP. Mem0 wired in env but not used. | Tauri desktop app. Voice in/out (double-clap wake → Whisper → Claude → ElevenLabs). Memory live. Controls + reads worldmonitor. |

---

## Communication channels (final state)

- **Jarvis → brainfeed**: HTTP GET. Tools: `get_daily_briefing`, `list_brief_stories`, `get_brief_story`. (spec #1)
- **Jarvis → worldmonitor (data)**: HTTP, already done.
- **Jarvis → worldmonitor (control)**: new channel — likely local WebSocket or `postMessage` (spec #3).
- **worldmonitor → Jarvis (context)**: same transport as above (spec #4).
- **Jarvis voice loop**: clap detector (Web Audio API analyser node) → Whisper STT → Claude streaming → ElevenLabs TTS, with VAD-driven barge-in (spec #2).
- **Jarvis ↔ Mem0**: memory layer — read-on-turn, write-on-significant-fact. Cross-cutting, applies to every sub-project.

---

## Cross-cutting decisions

These apply to every sub-project. Don't relitigate per spec.

### 1. Packaging path: browser-first, Tauri later
Build new Jarvis code as plain Next.js. Avoid browser-only APIs that don't have Tauri equivalents. When unavoidable (mic, notifications, system tray, filesystem), wrap behind an abstraction that can swap to a Tauri command later.

**Tauri migration timing:** after sub-project #2 (voice). Voice's always-on clap detector only works properly as a desktop app — that's what motivates the wrap.

**Brainfeed stays a website.** No Tauri. Brainfeed is a public-readable news-reading site, not a desktop app.

### 2. Voice stack
Already in `jarvis/package.json`:
- `openai` — Whisper STT
- `@elevenlabs/elevenlabs-js` — TTS
- `@ricky0123/vad-web` — voice activity detection
- Wake mechanism: **double-clap** detected via Web Audio API analyser node watching for two amplitude transients ~200–500ms apart. Tradeoff accepted: false positives from doors/keyboards/music; worst case Jarvis wakes up, hears nothing, sleeps again.

### 3. Model
`claude-opus-4-7` with `thinking: { type: "adaptive" }`. Streaming required. No `temperature`, `top_p`, `top_k` (removed on Opus 4.7). Manual tool-use loop (not the SDK's tool runner — we need per-token streaming). All per existing `jarvis/AGENTS.md`.

### 4. Memory (Mem0)
Jarvis has `MEMORY_URL=http://localhost:8765` in `.env.example` but no read/write code yet. Memory is a **5th cross-cutting concern**, not a sub-project. Each sub-project must consider:
- What facts about the user does this sub-project need to remember? (e.g., "user already saw the BHP story this morning", "user wants more on Ukraine", "user is currently looking at the Asia panel")
- When does it write to memory? (e.g., on follow-up requests, on portfolio mentions, on session start/end)
- When does it read from memory? (e.g., before every Claude turn — load relevant memories into the system prompt)

Memory implementation isn't built out as its own spec because it's small and woven through everything. Each sub-project spec has a **"Memory hooks"** section describing what it reads/writes.

### 5. Brainfeed = consumer product, not just a backend
Brainfeed is a polished standalone news-reading website that's good enough on its own that someone would visit it daily. Jarvis uses it because it's good. This framing matters: every brainfeed decision is "what makes this a great news app for a human to read?" first, "what makes it a useful tool for Jarvis?" second.

---

## Sub-project sequence

**Note on parallelism:** Specs 5 and 6 are independent of Voice (#2) and the Jarvis↔worldmonitor channels (#3, #4). They can ship in parallel or before, depending on user appetite. Spec 6 has a natural overlap with #3 (both involve worldmonitor integration) — if both are tackled, build #3 first then layer #6 on top.

| # | Sub-project | Spec | Status |
|---|---|---|---|
| 1 | **brainfeed-as-product + Jarvis tool** | `2026-04-27-spec01-brainfeed-product-and-jarvis-tool.md` | Designed |
| 2 | **Voice I/O** — double-clap wake, STT, TTS, barge-in | TBD (brainstorm when #1 ships) | Pending |
| 3 | **Jarvis → worldmonitor control** — voice commands navigate the dashboard | TBD | Pending |
| 4 | **worldmonitor → Jarvis context** — Jarvis knows what panel is in view | TBD | Pending |
| 5 | **Topic Intelligence — Sports** — sport-specific data sources + ladder-aware analyst | `2026-04-28-spec05-topic-intelligence-sports.md` | Designed |
| 6 | **Defence Map embed** — render worldmonitor's defence map in brainfeed defence pages | `2026-04-28-spec06-defence-map-embed.md` | Designed |

Each sub-project is brainstormed in detail when it's next, not all upfront. Each sharpens after the previous one teaches us something.

---

## Testing philosophy

"Less time wasted" = write the *kind* of tests that catch the bugs we anticipate, not just any tests.

Three test layers per sub-project:
1. **Unit** — pure logic (parsers, prompt builders, state machines, query builders)
2. **Integration** — end-to-end data flow with the LLM mocked. Real HTTP between processes where possible.
3. **Manual smoke script** — for the things that can't be unit-tested (voice quality, clap detection, real LLM response shape, frontend visual polish). Written as a numbered checklist, takes <5 min, runs before each merge.

Every sub-project spec ends with a **table of anticipated failure modes paired with the test that would catch each.** This is non-negotiable — it's how "less time wasted" actually happens.

---

## Out of scope for the umbrella

- Auth / multi-user. Personal tool, single user.
- Cloud deploy of Jarvis. It's local-only.
- Brainfeed mobile app. Responsive web only.
- Knowledge-graph queries against the historical embedding corpus. Embeddings are populated in spec #1 (silent indexing per Gemini's "data gravity" point); query layer becomes its own future sub-project once corpus is meaningful.
- Replacing marketmate or merging it into Jarvis. Marketmate stays as its own service Jarvis pulls from.

---

## Decision log

- **Build path**: browser-first Next.js → Tauri after voice. Confirmed in conversation 2026-04-27.
- **Wake mechanism**: double-clap (not wake-word, not push-to-talk, not call-mode). User preference, accepted false-positive tradeoff. Confirmed 2026-04-27.
- **Sub-project order**: 1 → 2 → 3 → 4. Confirmed 2026-04-27.
- **Brainfeed fate**: stays as standalone consumer site AND becomes a Jarvis tool. Both. Confirmed 2026-04-27.
- **Predictions feature scope**: Medium (agent-generated `ripple_effects[]` from LLM general knowledge) BUT with Postgres+pgvector infra in place from day one and silent embedding indexing in the pipeline, so the Ambitious knowledge-graph version becomes a query layer over existing data later. Per Gemini second opinion on data-gravity argument. Confirmed 2026-04-27.
- **Memory**: 5th cross-cutting concern, not a separate sub-project. Each spec has a "Memory hooks" section. Confirmed 2026-04-27.
- **Specs 5 (Sport) + 6 (Defence Map) added 2026-04-28** — scope: "discover everything" mandate. Sport is genuinely novel (table-aware analysis nobody else does); Defence Map is integration work (leverages existing worldmonitor). Both gated on spec01 merging first so the Postgres+pgvector substrate is live.
- **Sport data API choices**: Squiggle (AFL+NRL, free no-auth), football-data.org (top-5 European leagues, free 10/min), API Tennis (ATP/WTA, free 500/day). Recorded for future "why these and not others" questions.
- **Defence map approach: HTTP API to self-hosted worldmonitor**, NOT iframe and NOT native build. Preserves brainfeed proprietary license under AGPL boundary; gives brainfeed control over UX while reusing worldmonitor's superior data layer.
