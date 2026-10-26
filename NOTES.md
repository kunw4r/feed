# NOTES.md

Shared working memory for Claude Code and ZCode. One line per entry, `YYYY-MM-DD — note`, newest first. Prune when stale.

## Decisions
2026-10-26 — Static export uses trailingSlash: true (Pages 404'd /feed/learn/). sw.js precaches slash URLs; PAGES cache bumped to v3.
2026-10-26 — Progress (lib/progress.ts) adds readAt, practice{date:count}; day boundary = Australia/Brisbane. Daily goal = 3 reads + 1 quiz/review (goalOf). Brief/weekly quizzes go through answerPractice (feeds /recall).
2026-10-26 — /search reads build-time /search/index.json (route handler, like /recall/bank.json); "/" key opens search (AppShell). /weekly samples 10 quiz Qs across last 7 days (spreadQuiz). /you exports progress as bf1.<gzip base64url> code; import merges, never overwrites.
2026-10-26 — Story page: quiz now "Quick check" right after the story; "Since you last read" banner uses readAt across the thread; "New to this?" shows story.background_beginner when present.
2026-10-26 — Edition balance enforced in code (build_feed.balance): outlet <=20%, politics <=35% of projected edition, OCEANIA min 5 (REGION_MINIMUMS); thin regions may exceed caps. Tests: scripts/test_selection.py.
2026-10-26 — Thread links need model confidence >=0.75 AND a shared proper noun (thread_link_ok); knock-on effects (oil price from war) don't join a thread.
2026-10-26 — Stories now carry `background_beginner` (60-120 word zero-knowledge primer); frontend shows it as "New to this?".
2026-10-26 — Morning digest: scripts/send_digest.py on the 19:23 UTC run only; needs secrets RESEND_API_KEY + DIGEST_TO (DIGEST_FROM optional, onboarding@resend.dev only reaches the Resend account owner).

## Gotchas
2026-10-27 — Digest sender avatar can't be set via Resend: inbox apps pick it. On onboarding@resend.dev only a saved contact photo works (~/Desktop/Brainfeed.vcf). Own domain + BIMI (DMARC p=quarantine + SVG Tiny PS; Gmail/Apple also need a paid VMC/CMC cert) for real recipients.
2026-10-26 — Feed tests: added RNZ national/pacific, ABC health/science, BBC science/health, Guardian environment (all real full text). Rejected Crikey (91-word paywall stub), Brisbane Times (metered), The New Daily/InDaily/Michael West/ABC Pacific (feeds returned 0 items).

## Don't touch

## In progress
