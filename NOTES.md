# NOTES.md

Shared working memory for Claude Code and ZCode. One line per entry, `YYYY-MM-DD — note`, newest first. Prune when stale.

## Decisions
2026-10-26 — Static export uses trailingSlash: true (Pages 404'd /feed/learn/). sw.js precaches slash URLs; PAGES cache bumped to v3.
2026-10-26 — Progress (lib/progress.ts) adds readAt, practice{date:count}; day boundary = Australia/Brisbane. Daily goal = 3 reads + 1 quiz/review (goalOf). Brief/weekly quizzes go through answerPractice (feeds /recall).
2026-10-26 — /search reads build-time /search/index.json (route handler, like /recall/bank.json); "/" key opens search (AppShell). /weekly samples 10 quiz Qs across last 7 days (spreadQuiz). /you exports progress as bf1.<gzip base64url> code; import merges, never overwrites.
2026-10-26 — Story page: quiz now "Quick check" right after the story; "Since you last read" banner uses readAt across the thread; "New to this?" shows story.background_beginner when present.

## Gotchas

## Don't touch

## In progress
