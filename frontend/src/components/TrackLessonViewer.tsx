"use client";

import { useEffect, useState } from "react";
import { Reveal } from "./motion";

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

export default function TrackLessonViewer({ slug, lessons }: { slug: string; lessons: Lesson[] }) {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => setDone(loadDone(slug)), [slug]);

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

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,640px)] lg:gap-16">
      {/* Contents */}
      <nav aria-label="Lessons" className="mb-12 lg:mb-0">
        <div className="lg:sticky lg:top-8">
          <div className="flex items-baseline justify-between mb-3">
            <p className="smallcaps text-[13px] text-content-faint">Lessons</p>
            <p className="text-[12px] text-content-faint">{done.length}/{lessons.length} done</p>
          </div>
          <div className="mb-4 h-[2px] bg-edge">
            <div className="h-full bg-accent transition-all duration-700" style={{ width: `${(done.length / lessons.length) * 100}%` }} />
          </div>
          <ol>
            {lessons.map((l, i) => (
              <li key={i} className="border-b border-edge">
                <button
                  onClick={() => go(i)}
                  aria-current={i === active ? "step" : undefined}
                  className={`grid w-full grid-cols-[1.8rem_1fr] gap-2 py-3 text-left transition-colors ${i === active ? "text-content" : "text-content-faint hover:text-content"}`}
                >
                  <span className={`font-display italic text-[15px] ${done.includes(i) ? "text-accent" : ""}`}>
                    {done.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[14px] leading-snug">{l.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      {/* Lesson */}
      <article id="lesson" key={active} className="scroll-mt-20 animate-in min-w-0">
        <p className="smallcaps text-[13px] text-content-faint">Lesson {active + 1} of {lessons.length}</p>
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
            {done.includes(active) ? "✓ Completed" : active < lessons.length - 1 ? "Done — next lesson" : "Finish track"}
          </button>
          <div className="flex gap-5 text-[14px]">
            {active > 0 && (
              <button onClick={() => go(active - 1)} className="text-content-faint hover:text-content">← Previous</button>
            )}
            {active < lessons.length - 1 && (
              <button onClick={() => go(active + 1)} className="text-content-faint hover:text-content">Skip →</button>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
