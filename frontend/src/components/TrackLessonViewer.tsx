"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "./motion";
import { ProgressRing } from "./TracksSearch";

interface Lesson {
  title: string;
  content: string;
  key_takeaways: string[];
  concepts: { term: string; definition: string }[];
}

const KEY = "brainfeed-tracks";

function loadDone(slug: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}")[slug] ?? [];
  } catch {
    return [];
  }
}

function saveDone(slug: string, done: number[]) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    localStorage.setItem(KEY, JSON.stringify({ ...all, [slug]: done }));
  } catch {
    // storage unavailable: progress lasts for this visit only
  }
}

/** First sentence of a lesson, for the next-lesson preview card. */
function excerpt(content: string): string {
  const first = content.replace(/\s+/g, " ").trim();
  return first.match(/^.{10,}?[.!?](?=\s|$)/)?.[0] ?? first.slice(0, 160) + "…";
}

export default function TrackLessonViewer({ slug, lessons, minutes }: { slug: string; lessons: Lesson[]; minutes: number[] }) {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const finished = loadDone(slug);
    setDone(finished);
    // Pick up where the reader left off: first lesson not yet completed
    const first = lessons.findIndex((_, i) => !finished.includes(i));
    if (first > 0) setActive(first);
  }, [slug, lessons]);

  // Reading progress through the current lesson (same measure as the deep dives)
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : rect.top < 0 ? 1 : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [active]);

  const go = (i: number) => {
    setActive(i);
    document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const complete = () => {
    const next = done.includes(active) ? done.filter((d) => d !== active) : [...done, active];
    setDone(next);
    saveDone(slug, next);
    if (!done.includes(active) && active < lessons.length - 1) go(active + 1);
  };

  const lesson = lessons[active];
  const isLast = active === lessons.length - 1;

  const lessonList = (onPick: (i: number) => void) => (
    <ol>
      {lessons.map((l, i) => (
        <li key={i} className="border-b border-edge last:border-b-0">
          <button
            onClick={() => onPick(i)}
            aria-current={i === active ? "step" : undefined}
            className={`grid w-full grid-cols-[1.8rem_1fr_auto] items-baseline gap-2 py-3 text-left transition-colors ${
              i === active ? "text-content" : "text-content-faint hover:text-content"
            }`}
          >
            <span className={`font-display italic text-[15px] ${done.includes(i) ? "text-accent" : ""}`}>
              {done.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[14px] leading-snug">{l.title}</span>
            <span className="text-[11px] text-content-faint/80 tabular-nums">~{minutes[i]} min</span>
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <div>
      {/* ── Reading progress, sticky under the app header on phones, viewport top on desktop ── */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-5 md:-mx-10 border-b border-edge bg-surface-header px-5 py-2 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-4">
          <p className="smallcaps hidden min-w-0 flex-1 truncate text-[12px] text-content-faint sm:block">
            <span className="text-content">{lesson.title}</span>
            <span className="ml-2 normal-case tracking-normal">lesson {active + 1} of {lessons.length}</span>
          </p>
          <div className="h-[2px] flex-1 bg-edge sm:flex-none sm:w-40 lg:w-56">
            <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="font-display text-[12px] italic tabular-nums text-content-faint">{Math.round(progress * 100)}%</span>
          <details className="relative lg:hidden">
            <summary className="smallcaps ml-1 cursor-pointer list-none whitespace-nowrap text-[12px] text-content hover:text-accent [&::-webkit-details-marker]:hidden">
              Lessons
            </summary>
            <div className="absolute right-0 top-8 z-30 max-h-[60vh] w-80 max-w-[calc(100vw-4rem)] overflow-y-auto rounded-2xl border border-edge bg-surface-raised p-2 shadow-2xl">
              {lessonList(go)}
            </div>
          </details>
        </div>
      </div>

      <div className="mt-10 lg:grid lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-20">
        {/* ── Sidebar lesson nav (lg+) ── */}
        <nav aria-label="Lessons" className="hidden lg:block">
          <div className="sticky top-12">
            <div className="flex items-center gap-3 pb-4">
              <ProgressRing done={done.length} total={lessons.length} />
              <p className="smallcaps text-[12px] text-content-subtle">
                {done.length === lessons.length ? "Track complete" : `${done.length} of ${lessons.length} done`}
              </p>
            </div>
            {lessonList(go)}
          </div>
        </nav>

        {/* ── Lesson ── */}
        <div className="min-w-0 max-w-[760px]">
          <article id="lesson" ref={articleRef} key={active} className="scroll-mt-28 animate-in lg:scroll-mt-16">
            <p className="smallcaps text-[13px] text-content-faint">Lesson {active + 1} of {lessons.length} · ~{minutes[active]} min</p>
            <h2 className="font-display mt-2 mb-8 text-[2rem] md:text-[2.6rem] leading-[1.05] font-medium text-content text-balance">{lesson.title}</h2>
            <div className="space-y-6">
              {lesson.content.split("\n\n").map((p, i) => (
                <Reveal as="p" key={i} className="prose-read">{p}</Reveal>
              ))}
            </div>

            {lesson.key_takeaways?.length > 0 && (
              <Reveal className="mt-14">
                <p className="smallcaps text-[13px] text-content-faint mb-4">Remember</p>
                <ol className="space-y-3">
                  {lesson.key_takeaways.map((t, i) => (
                    <li key={i} className="grid grid-cols-[1.8rem_1fr] gap-2 font-read text-[1.1rem] leading-snug text-content">
                      <span className="font-display italic text-accent">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ol>
              </Reveal>
            )}

            {lesson.concepts?.length > 0 && (
              <Reveal className="mt-14">
                <p className="smallcaps text-[13px] text-content-faint mb-4">Words to know</p>
                <dl className="divide-y divide-edge border-y border-edge">
                  {lesson.concepts.map((c) => (
                    <div key={c.term} className="grid gap-1 py-4 md:grid-cols-[160px_1fr] md:gap-6">
                      <dt className="font-read italic text-[1.05rem] text-content">{c.term}</dt>
                      <dd className="text-[14px] leading-relaxed text-content-dim">{c.definition}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}

            <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-6">
              <button
                onClick={complete}
                className={`rounded-full px-5 py-2.5 text-[14px] font-medium transition-colors ${
                  done.includes(active) ? "border border-edge text-content-dim" : "bg-content text-surface hover:opacity-90"
                }`}
              >
                {done.includes(active) ? "✓ Completed" : isLast ? "Finish track" : "Done — next lesson"}
              </button>
              <div className="flex gap-5 text-[14px]">
                {active > 0 && (
                  <button onClick={() => go(active - 1)} className="text-content-faint hover:text-content">← Previous</button>
                )}
                {!isLast && (
                  <button onClick={() => go(active + 1)} className="text-content-faint hover:text-content">Skip →</button>
                )}
              </div>
            </div>
          </article>

          {/* ── What's next ── */}
          {!isLast ? (
            <Reveal className="mt-12">
              <button onClick={() => go(active + 1)} className="group block w-full rounded-[20px] border border-edge bg-surface-raised p-6 text-left card-depth md:p-7">
                <p className="smallcaps text-[12px] text-content-faint">
                  Up next · lesson {active + 2} of {lessons.length} · ~{minutes[active + 1]} min
                </p>
                <p className="mt-2 font-display text-[1.45rem] leading-tight text-content transition-colors group-hover:text-accent">
                  {lessons[active + 1].title}
                </p>
                <p className="mt-2 font-read text-[1.02rem] leading-[1.55] text-content-dim line-clamp-2">
                  {excerpt(lessons[active + 1].content)}
                </p>
                <span className="mt-4 inline-block text-[14px] font-medium text-accent">Continue →</span>
              </button>
            </Reveal>
          ) : (
            <Reveal className="mt-12">
              <div className="rounded-[20px] border border-edge bg-surface-raised p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <ProgressRing done={done.length} total={lessons.length} />
                  <p className="smallcaps text-[12px] text-content-faint">
                    {done.length === lessons.length ? "That's the whole track — nicely done." : "Last lesson"}
                  </p>
                </div>
                <p className="mt-4 font-read text-[1.08rem] leading-[1.55] text-content-dim">
                  {done.length === lessons.length
                    ? "Every lesson ticked off. The ideas stick better the second time round — revisit any lesson from the list above."
                    : "Tick this one off and the track is complete."}
                </p>
                <Link href="/tracks" className="mt-5 inline-block rounded-full bg-content px-5 py-2.5 text-[14px] font-medium text-surface">
                  Back to all tracks
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
