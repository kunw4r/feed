"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Concept } from "@/lib/types";
import { Reveal } from "@/components/motion";
import TimelineScrubber from "./TimelineScrubber";

export interface Chapter {
  id: string;
  label: string;
  minutes: number;
  /** Chapter that lives in the right-hand rail on wide screens; only shown inline (and in nav) below lg. */
  inlineOnly?: boolean;
}

export interface LearnSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

interface Glance {
  span: string | null;
  chapters: number;
  minutes: number;
}

const fmtMin = (m: number) => (m < 1 ? "<1 min" : `~${Math.max(1, Math.round(m))} min`);

function ChapterHead({ n, label }: { n: number; label: string }) {
  return (
    <Reveal className="mb-10 flex items-baseline gap-4">
      <span className="font-display italic text-accent text-[22px] leading-none">{String(n).padStart(2, "0")}</span>
      <h2 className="font-display text-[1.6rem] leading-tight font-medium text-content md:text-[2rem]">{label}</h2>
      <span className="h-px flex-1 translate-y-[-4px] bg-edge" />
    </Reveal>
  );
}

/** A paragraph whose key concepts are tappable; the explanation lives in the rail (lg+) or the glossary chapter (<lg). */
function ConceptParagraph({
  text,
  concepts,
  active,
  onTerm,
}: {
  text: string;
  concepts: Concept[];
  active: string | null;
  onTerm: (term: string) => void;
}) {
  const parts = useMemo(() => {
    if (!concepts.length) return [text];
    const escaped = concepts.map((c) => c.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return text.split(new RegExp(`(${escaped.join("|")})`, "i"));
  }, [text, concepts]);

  const find = (s: string) => concepts.find((c) => c.term.toLowerCase() === s.toLowerCase());

  return (
    <Reveal as="p" className="prose-read">
      {parts.map((part, i) => {
        const c = find(part);
        if (!c) return <Fragment key={i}>{part}</Fragment>;
        return (
          <button
            key={i}
            type="button"
            className="term inline text-left"
            data-open={active === c.term}
            aria-pressed={active === c.term}
            onClick={() => onTerm(c.term)}
          >
            {part}
          </button>
        );
      })}
    </Reveal>
  );
}

/**
 * The three-zone reading layout: sticky chapter nav + scroll progress on the
 * left, a comfortable ~68ch reading column in the middle, and a sticky rail
 * with the key-concepts glossary and an "at a glance" summary on the right.
 * Below xl the nav collapses into a top progress bar + contents dropdown;
 * below lg the rail folds into an inline "Words to know" chapter.
 */
export default function LearnReader({
  chapters,
  timeline,
  sections,
  concepts,
  glance,
}: {
  chapters: Chapter[];
  timeline: { date: string; event: string }[];
  sections: LearnSection[];
  concepts: Concept[];
  glance: Glance;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(chapters[0]?.id ?? "");
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [hoverTerm, setHoverTerm] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const effTerm = hoverTerm ?? activeTerm;

  // Track the chapter under the reading line
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [chapters]);

  // Reading progress through the article body
  useEffect(() => {
    const el = bodyRef.current;
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
  }, []);

  const onTerm = (term: string) => {
    setActiveTerm((a) => (a === term ? null : term));
    // Below lg the rail is gone: jump to the glossary chapter instead
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("words")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  };

  // Each concept is linked at its first appearance only
  const flat = sections.flatMap((s) => s.paragraphs);
  const conceptsByPara = useMemo(() => {
    const used = new Set<string>();
    return flat.map((p) =>
      concepts.filter((c) => {
        if (used.has(c.term) || !p.toLowerCase().includes(c.term.toLowerCase())) return false;
        used.add(c.term);
        return true;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, concepts]);

  const num = (id: string) => chapters.findIndex((c) => c.id === id) + 1;
  const activeIdx = Math.max(0, chapters.findIndex((c) => c.id === active));

  const navList = (forDropdown: boolean) => (
    <ol>
      {chapters.map((c, i) => (
        <li key={c.id} className={c.inlineOnly && forDropdown ? "lg:hidden" : c.inlineOnly ? "hidden" : ""}>
          <a
            href={`#${c.id}`}
            className={`flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] leading-tight transition-colors ${
              active === c.id ? "bg-nav-active text-content" : "text-content-faint hover:text-content-dim"
            }`}
          >
            <span>
              <span className="mr-2 font-display italic text-accent/80">{String(i + 1).padStart(2, "0")}</span>
              {c.label}
            </span>
            <span className="text-[11px] text-content-faint/70">{fmtMin(c.minutes)}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  let paraCursor = 0;

  return (
    <div ref={bodyRef} className="relative mx-auto max-w-[1360px] px-5 md:px-10">
      {/* ── Mobile/tablet chapter bar: progress segments + contents dropdown ── */}
      <div className="xl:hidden sticky top-14 z-20 -mx-5 mb-10 border-b border-edge bg-surface-header px-5 py-2.5 backdrop-blur-xl md:-mx-10 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {chapters.map((c, i) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                aria-label={c.label}
                className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${i <= activeIdx ? "bg-accent" : "bg-edge"}`}
              />
            ))}
          </div>
          <details className="relative">
            <summary className="smallcaps cursor-pointer list-none whitespace-nowrap text-[12px] text-content [&::-webkit-details-marker]:hidden">
              Chapters ▾
            </summary>
            <div className="absolute right-0 top-7 z-30 w-72 rounded-2xl border border-edge bg-surface-raised p-2 shadow-2xl">
              {navList(true)}
            </div>
          </details>
        </div>
        <p className="mt-1.5 text-[11px] text-content-faint">
          <span className="smallcaps text-content">{chapters[activeIdx]?.label}</span>
          <span className="ml-2">{Math.round(progress * 100)}% read</span>
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,680px)_280px] lg:justify-center lg:gap-14 xl:grid-cols-[190px_minmax(0,680px)_280px] xl:gap-16">
        {/* ── Left: chapter nav + reading progress (xl+) ── */}
        <nav className="hidden xl:block" aria-label="Chapters">
          <div className="sticky top-24">
            <p className="smallcaps mb-3 px-2 text-[12px] text-content-subtle">Contents</p>
            <div className="relative">
              <span className="absolute bottom-2 left-[3px] top-2 w-px bg-edge" aria-hidden />
              <span
                className="absolute left-[3px] top-2 w-px bg-accent transition-[height] duration-300"
                style={{ height: `calc((100% - 16px) * ${progress})` }}
                aria-hidden
              />
              {navList(false)}
            </div>
            <p className="mt-4 px-2 text-[11px] tabular-nums text-content-faint">{Math.round(progress * 100)}% read</p>
          </div>
        </nav>

        {/* ── Centre: the reading column ── */}
        <main className="min-w-0 pb-10">
          {/* At a glance strip (<lg, where the rail doesn't exist) */}
          <Reveal className="mb-14 grid grid-cols-3 gap-4 border-y border-edge py-4 text-center lg:hidden">
            <div>
              <p className="smallcaps text-[11px] text-content-faint">Timeline</p>
              <p className="mt-1 font-display text-[1.05rem] text-content tabular-nums">{glance.span ?? "—"}</p>
            </div>
            <div>
              <p className="smallcaps text-[11px] text-content-faint">Chapters</p>
              <p className="mt-1 font-display text-[1.05rem] text-content tabular-nums">{glance.chapters}</p>
            </div>
            <div>
              <p className="smallcaps text-[11px] text-content-faint">Read time</p>
              <p className="mt-1 font-display text-[1.05rem] text-content tabular-nums">{fmtMin(glance.minutes)}</p>
            </div>
          </Reveal>

          {timeline.length > 0 && (
            <section id="timeline" className="mb-20 scroll-mt-32">
              <ChapterHead n={num("timeline")} label="Timeline" />
              <TimelineScrubber items={timeline} />
            </section>
          )}

          {sections.map((s) => {
            const start = paraCursor;
            paraCursor += s.paragraphs.length;
            return (
              <section key={s.id} id={s.id} className="mb-20 scroll-mt-32">
                <ChapterHead n={num(s.id)} label={s.heading} />
                <div className="space-y-7">
                  {s.paragraphs.map((p, i) => (
                    <ConceptParagraph key={i} text={p} concepts={conceptsByPara[start + i]} active={effTerm} onTerm={onTerm} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Inline glossary for <lg (the rail carries it on wide screens) */}
          {concepts.length > 0 && (
            <section id="words" className="mb-20 scroll-mt-32 lg:hidden">
              <ChapterHead n={num("words")} label="Words to know" />
              <dl className="divide-y divide-edge border-y border-edge">
                {concepts.map((c) => (
                  <Reveal key={c.term} className={`grid gap-1 py-5 ${effTerm === c.term ? "bg-accent-soft" : ""}`}>
                    <dt className="font-read italic text-[1.1rem] text-content">{c.term}</dt>
                    <dd>
                      <p className="text-[15px] leading-relaxed text-content-dim">{c.definition}</p>
                      {c.context && <p className="mt-1.5 text-[13px] text-content-faint">{c.context}</p>}
                    </dd>
                  </Reveal>
                ))}
              </dl>
            </section>
          )}
        </main>

        {/* ── Right rail: at a glance + key concepts (lg+) ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-10 pb-10">
            <div className="rounded-2xl border border-edge bg-surface-raised p-5" style={{ boxShadow: "var(--t-shadow-card)" }}>
              <p className="smallcaps text-[12px] text-content-subtle">At a glance</p>
              <dl className="mt-3 space-y-2.5 text-[13.5px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-content-faint">Timeline span</dt>
                  <dd className="font-display tabular-nums text-content">{glance.span ?? "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-content-faint">Chapters</dt>
                  <dd className="font-display tabular-nums text-content">{glance.chapters}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-content-faint">Read time</dt>
                  <dd className="font-display tabular-nums text-content">{fmtMin(glance.minutes)}</dd>
                </div>
              </dl>
            </div>

            {concepts.length > 0 && (
              <div>
                <p className="smallcaps mb-2 text-[12px] text-content-subtle">Key concepts</p>
                <ul className="divide-y divide-edge">
                  {concepts.map((c) => (
                    <li key={c.term}>
                      <button
                        type="button"
                        aria-expanded={effTerm === c.term}
                        onMouseEnter={() => setHoverTerm(c.term)}
                        onMouseLeave={() => setHoverTerm(null)}
                        onClick={() => setActiveTerm((a) => (a === c.term ? null : c.term))}
                        className="group w-full py-2.5 text-left"
                      >
                        <span
                          className={`font-read text-[1.08rem] italic transition-colors ${
                            effTerm === c.term ? "text-accent" : "text-content group-hover:text-accent"
                          }`}
                        >
                          {c.term}
                        </span>
                      </button>
                      <div className="unfold" data-open={effTerm === c.term} inert={effTerm !== c.term}>
                        <div>
                          <p className="pb-4 text-[13px] leading-relaxed text-content-dim">{c.definition}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11.5px] leading-relaxed text-content-faint">
                  Highlighted terms in the text open their meaning here — hover or tap.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
