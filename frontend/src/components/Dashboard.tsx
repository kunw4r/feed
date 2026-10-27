"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { CardStory, Edition, REGION_CONFIG, CATEGORY_CONFIG } from "@/lib/types";
import { useProgress, streakOf, dueForReview } from "@/lib/progress";
import { Reveal } from "./motion";
import StoryCard from "./StoryCard";
import GlancePanel from "./GlancePanel";
import DevelopingTicker from "./DevelopingTicker";

interface DashboardProps {
  briefing: Edition;
  region?: string;
  topic?: string;
  /** Archive editions: no "new" markers, different masthead */
  archived?: boolean;
}

// Pin formatting to Brisbane so the static HTML and the browser render identical text
const TZ = "Australia/Brisbane";

const SEEN_KEY = "brainfeed-last-edition";

/** Timestamp of the edition this browser saw last time, so newer stories can be flagged. */
function useLastSeen(generatedAt?: string) {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  useEffect(() => {
    try {
      setLastSeen(localStorage.getItem(SEEN_KEY));
      if (generatedAt) localStorage.setItem(SEEN_KEY, generatedAt);
    } catch {
      // storage unavailable: nothing is flagged as new
    }
  }, [generatedAt]);
  return lastSeen;
}

function Rail({ id, title, note, stories, isNew }: { id: string; title: string; note?: string; stories: CardStory[]; isNew: (s: CardStory) => boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <section id={id} className="mb-20 scroll-mt-24">
      <Reveal className="flex items-end justify-between gap-4 mb-6 px-4 md:px-10">
        <div>
          <h2 className="font-display text-[1.9rem] md:text-[2.4rem] leading-none text-content">{title}</h2>
          {note && <p className="mt-2 text-[13px] text-content-faint">{note}</p>}
        </div>
        <div className={`hidden md:flex gap-2 ${stories.length <= 4 ? "xl:hidden" : ""}`}>
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => nudge(d)}
              aria-label={d < 0 ? "Previous" : "Next"}
              className="h-10 w-10 rounded-full border border-edge text-content-dim hover:text-content hover:border-content-faint transition-colors"
            >
              {d < 0 ? "←" : "→"}
            </button>
          ))}
        </div>
      </Reveal>
      {/* Phones/tablets scroll sideways; wide screens lay a short rail out as a full-width grid */}
      <div
        ref={ref}
        className={`no-scrollbar flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-4 md:scroll-px-10 px-4 md:px-10 pb-4 ${
          stories.length <= 4 ? "xl:grid xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] xl:overflow-visible xl:max-w-[1400px]" : ""
        }`}
      >
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} variant="rail" isNew={isNew(s)} grid={stories.length <= 4} />
        ))}
        <span className={`w-1 flex-shrink-0 ${stories.length <= 4 ? "xl:hidden" : ""}`} />
      </div>
    </section>
  );
}

export default function Dashboard({ briefing, region, topic, archived }: DashboardProps) {
  const progress = useProgress();
  const lastSeen = useLastSeen(archived ? undefined : briefing.generated_at);
  const isNew = (s: CardStory) => Boolean(!archived && lastSeen && s.created_at > lastSeen && !progress.read[s.id]);
  const activeRegion = region ?? null;
  const activeTopic = topic ?? null;

  const allStories = briefing.stories;

  const filtered = useMemo(
    () =>
      allStories.filter(
        (s) => (!activeRegion || s.region_code === activeRegion) && (!activeTopic || s.category === activeTopic),
      ),
    [allStories, activeRegion, activeTopic],
  );

  const hasFilters = Boolean(activeRegion || activeTopic);
  const lead = filtered[0];
  const five = filtered.slice(1, 6);
  const shown = new Set([lead, ...five].filter(Boolean).map((s) => s.id));

  const rails = hasFilters
    ? [{ code: "rest", title: "More", stories: filtered.filter((s) => !shown.has(s.id)) }]
    : Object.keys(REGION_CONFIG).map((code) => ({
        code,
        title: REGION_CONFIG[code].label,
        stories: allStories.filter((s) => s.region_code === code && !shown.has(s.id)),
      }));

  const readCount = allStories.filter((s) => progress.read[s.id]).length;
  const streak = streakOf(progress.days);
  const briefMinutes = Math.max(1, Math.round(allStories.reduce((n, s) => n + s.quick_summary.split(" ").length, 0) / 200));
  const developing = allStories.filter((s) => (s.thread_size ?? 1) > 1);

  const formatted = new Date(briefing.date + "T12:00:00+10:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

  const updated = briefing.generated_at
    ? new Date(briefing.generated_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: TZ })
    : null;

  const title = activeRegion
    ? REGION_CONFIG[activeRegion]?.label
    : activeTopic
      ? CATEGORY_CONFIG[activeTopic as keyof typeof CATEGORY_CONFIG]?.label
      : null;

  return (
    <div className="pb-16">
      {/* Masthead */}
      <header className="px-4 md:px-10 pt-10 md:pt-16 pb-10 max-w-[1400px]">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="rise">
            <p className="smallcaps text-[14px] text-content-faint">
              {archived ? (
                <Link href="/archive" className="hover:text-content transition-colors">← The archive</Link>
              ) : (
                formatted
              )}
            </p>
            <h1 className="font-display mt-3 text-[3.4rem] md:text-[5.5rem] leading-[0.92] font-medium text-content text-balance">
              {title ??
                (archived ? (
                  formatted
                ) : (
                  <>
                    Today&apos;s <span className="italic text-accent">edition</span>
                  </>
                ))}
            </h1>
            <p className="font-read mt-5 max-w-lg text-[1.15rem] leading-[1.5] text-content-dim">
              {filtered.length} stories from free, full-text newsrooms.{" "}
              <span className="text-content-faint">
                {updated && !archived && <>Updated {updated} · </>}
                {readCount} read{streak > 0 && !archived ? ` · ${streak}-day streak` : ""}
              </span>
              {!archived && dueForReview(progress).length > 0 && (
                <>
                  {" "}
                  <Link href="/recall" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
                    {dueForReview(progress).length} to review
                  </Link>
                </>
              )}
            </p>
          </div>

          {!archived && <Link
            href="/brief"
            className="rise group flex items-center gap-5 self-start lg:self-auto rounded-full bg-content pl-6 pr-2 py-2 text-surface shadow-2xl transition-transform hover:-translate-y-0.5"
            style={{ animationDelay: "120ms" }}
          >
            <span>
              <span className="block text-[15px] font-medium">Brief me</span>
              <span className="block text-[12px] opacity-60">All {allStories.length} stories · ~{briefMinutes} min</span>
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-bold text-white text-lg transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>}
        </div>

        {!archived && !hasFilters && (
          <div className="mt-8 xl:hidden max-w-md">
            <GlancePanel stories={allStories} compact />
          </div>
        )}

        {/* Region index */}
        {!archived && (
          <nav aria-label="Regions" className="no-scrollbar mt-10 -mx-4 md:mx-0 px-4 md:px-0 flex gap-6 overflow-x-auto border-t border-edge pt-4 text-[14px]">
            {[{ href: "/", label: "Everything", on: !hasFilters }]
              .concat(
                Object.keys(REGION_CONFIG)
                  .filter((code) => allStories.some((s) => s.region_code === code))
                  .map((code) => ({ href: `/region/${code}`, label: REGION_CONFIG[code].label, on: activeRegion === code })),
              )
              .map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={t.on ? "page" : undefined}
                  className={`whitespace-nowrap pb-1 border-b transition-colors ${t.on ? "text-content border-accent" : "text-content-faint border-transparent hover:text-content"}`}
                >
                  {t.label}
                </Link>
              ))}
          </nav>
        )}
      </header>

      {!archived && <DevelopingTicker stories={developing} />}

      {lead && (
        <div className="px-4 md:px-10 mb-16 rise" style={{ animationDelay: "200ms" }}>
          <StoryCard story={lead} variant="hero" isNew={isNew(lead)} />
        </div>
      )}

      {five.length > 0 && (
        <section className="px-4 md:px-10 mb-24 max-w-[1400px] xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-16">
          <div>
          <Reveal className="flex items-baseline gap-4 mb-2">
            <h2 className="font-display text-[1.9rem] md:text-[2.4rem] leading-none text-content">
              {hasFilters ? "Top stories" : "The five"}
            </h2>
            <span className="text-[13px] text-content-faint">what matters most after the lead</span>
          </Reveal>
          <ol className="divide-y divide-edge border-b border-edge max-w-4xl">
            {five.map((s, i) => (
              <Reveal as="li" key={s.id} delay={i * 70}>
                <StoryCard story={s} variant="row" rank={i + 2} isNew={isNew(s)} />
              </Reveal>
            ))}
          </ol>
          </div>
          {!archived && (
            <div className="hidden xl:block">
              <div className="sticky top-8 pt-2">
                <GlancePanel stories={allStories} />
              </div>
            </div>
          )}
        </section>
      )}

      {rails
        .filter((r) => r.stories.length > 0)
        .map((r) => (
          <Rail
            key={r.code}
            id={r.code}
            title={r.title}
            note={REGION_CONFIG[r.code]?.description}
            stories={r.stories}
            isNew={isNew}
          />
        ))}

      {filtered.length === 0 && (
        <p className="px-4 md:px-10 py-16 text-content-faint">Nothing here today.</p>
      )}
    </div>
  );
}
