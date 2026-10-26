# NOTES.md

Shared working memory for Claude Code and ZCode. One line per entry, `YYYY-MM-DD — note`, newest first. Prune when stale.

## Decisions
2026-10-27 — Learn rework (feat/immersive-learn): deep-dive hero/3-zone reader/timeline scrubber/theme-flip finale live in `frontend/src/components/learn/*`; hero images come from `scripts/add_learn_images.py` (Wikipedia REST, stored as `hero_image` in learn-*.json; re-runnable). Finale flips the page bg via `body[data-finale="on"]`; reduced motion = instant flip. "Related in the news" is build-time keyword overlap (score ≥ 3) — may pick 1–2 loose matches (Cold War → coral reefs); raise the threshold in learn/[slug]/page.tsx if it bothers.
2026-10-26 — Static export uses trailingSlash: true (Pages 404'd /feed/learn/). sw.js precaches slash URLs; PAGES cache bumped to v3.
2026-10-26 — Progress (lib/progress.ts) adds readAt, practice{date:count}; day boundary = Australia/Brisbane. Daily goal = 3 reads + 1 quiz/review (goalOf). Brief/weekly quizzes go through answerPractice (feeds /recall).
2026-10-26 — /search reads build-time /search/index.json (route handler, like /recall/bank.json); "/" key opens search (AppShell). /weekly samples 10 quiz Qs across last 7 days (spreadQuiz). /you exports progress as bf1.<gzip base64url> code; import merges, never overwrites.
2026-10-26 — Story page: quiz now "Quick check" right after the story; "Since you last read" banner uses readAt across the thread; "New to this?" shows story.background_beginner when present.
2026-10-26 — Edition balance enforced in code (build_feed.balance): outlet <=20%, politics <=35% of projected edition, OCEANIA min 5 (REGION_MINIMUMS); thin regions may exceed caps. Tests: scripts/test_selection.py.
2026-10-26 — Thread links need model confidence >=0.75 AND a shared proper noun (thread_link_ok); knock-on effects (oil price from war) don't join a thread.
2026-10-26 — Stories now carry `background_beginner` (60-120 word zero-knowledge primer); frontend shows it as "New to this?".
2026-10-26 — Morning digest: scripts/send_digest.py on the 19:23 UTC run only; needs secrets RESEND_API_KEY + DIGEST_TO (DIGEST_FROM optional, onboarding@resend.dev only reaches the Resend account owner).

## Gotchas
2026-10-27 — wsrv.nl 404s some upload.wikimedia.org thumb URLs (ORB-blocks the <img> before NewsImage's fallback). proxied() in lib/images.ts passes Wikimedia URLs through, building renditions at Wikimedia's FIXED buckets (330/500/960/1280/1920px) — arbitrary widths are rejected (HTTP 400); raster thumbs need /thumb/<h>/<hh>/<file>/<W>px-<file>, renders swap the size segment.
2026-10-27 — Digest sender avatar can't be set via Resend: inbox apps pick it. On onboarding@resend.dev only a saved contact photo works (~/Desktop/Brainfeed.vcf). Own domain + BIMI (DMARC p=quarantine + SVG Tiny PS; Gmail/Apple also need a paid VMC/CMC cert) for real recipients.
2026-10-26 — Feed tests: added RNZ national/pacific, ABC health/science, BBC science/health, Guardian environment (all real full text). Rejected Crikey (91-word paywall stub), Brisbane Times (metered), The New Daily/InDaily/Michael West/ABC Pacific (feeds returned 0 items).

## Don't touch

## In progress
