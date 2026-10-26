"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Story, CardStory, Concept, CATEGORY_CONFIG, REGION_CONFIG } from "@/lib/types";
import { markRead, useProgress } from "@/lib/progress";
import { Reveal, InkText } from "@/components/motion";
import QuizBlock from "./QuizBlock";
import NewsImage, { proxied } from "@/components/NewsImage";
import OriginalReporting from "./OriginalReporting";

const WPM = 230;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const SECTION_LABELS: Record<string, string> = {
  "Historical Context": "Background",
  "Multiple Perspectives": "Perspectives",
  "Future Implications": "What could happen",
  "What to Watch": "What to watch",
};

interface Chapter {
  id: string;
  label: string;
  minutes: number; // cumulative reading time at the end of this chapter
}

function parseAnalysis(raw: string | null) {
  if (!raw) return [];
  return raw
    .split(/^## /m)
    .map((part) => {
      const nl = part.indexOf("\n");
      return { title: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() };
    })
    .filter((s) => s.title && s.body);
}

function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((chunk, i) => (i % 2 ? <strong key={i}>{chunk}</strong> : <Fragment key={i}>{chunk}</Fragment>))}
    </>
  );
}

function AnalysisBody({ body }: { body: string }) {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- "));

  // "- **Who:** what they think" renders as a ledger of voices
  if (bullets.length >= 2 && bullets.every((b) => /^- \*\*.+?\*\*/.test(b))) {
    return (
      <dl className="divide-y divide-edge border-y border-edge">
        {bullets.map((b, i) => {
          const m = b.match(/^- \*\*(.+?):?\*\*:?\s*(.*)$/);
          return (
            <Reveal key={i} delay={i * 60} className="grid gap-1 py-5 md:grid-cols-[150px_1fr] md:gap-8">
              <dt className="smallcaps text-[15px] text-accent pt-1">{m?.[1].replace(/:$/, "")}</dt>
              <dd className="prose-read !text-[1.12rem] text-content-dim">{m?.[2]}</dd>
            </Reveal>
          );
        })}
      </dl>
    );
  }

  return (
    <div className="space-y-6">
      {lines.map((l, i) => (
        <Reveal key={i} as="p" className="prose-read text-content-dim">
          <Bold text={l.replace(/^- /, "")} />
        </Reveal>
      ))}
    </div>
  );
}

/** A body paragraph whose concept terms are tappable; on wide screens definitions sit in the margin. */
function ConceptParagraph({ text, concepts }: { text: string; concepts: Concept[] }) {
  const [open, setOpen] = useState<string | null>(null);

  const parts = useMemo(() => {
    if (!concepts.length) return [text];
    const escaped = concepts.map((c) => c.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return text.split(new RegExp(`(${escaped.join("|")})`, "i"));
  }, [text, concepts]);

  const find = (s: string) => concepts.find((c) => c.term.toLowerCase() === s.toLowerCase());
  const active = open ? find(open) : null;

  return (
    <div className="relative">
      <Reveal as="p" className="prose-read">
        {parts.map((part, i) => {
          const c = find(part);
          if (!c) return <Fragment key={i}>{part}</Fragment>;
          return (
            <button
              key={i}
              type="button"
              data-open={open === c.term}
              onClick={() => setOpen(open === c.term ? null : c.term)}
              className="term inline text-left"
            >
              {part}
            </button>
          );
        })}
      </Reveal>

      {/* Margin notes (wide screens) */}
      {concepts.length > 0 && (
        <aside className="hidden min-[1400px]:block absolute top-1 left-full ml-12 w-52 space-y-5">
          {concepts.map((c) => (
            <Reveal key={c.term} delay={200}>
              <p className={`text-[13px] leading-relaxed transition-colors ${open === c.term ? "text-content" : "text-content-faint"}`}>
                <span className="font-read italic text-[15px] text-content">{c.term}</span>
                <span className="block mt-1">{c.definition}</span>
              </p>
            </Reveal>
          ))}
        </aside>
      )}

      {/* Inline unfold (narrower screens) */}
      <div className="unfold min-[1400px]:hidden" data-open={Boolean(active)} inert={!active}>
        <div>
          {active && (
            <div className="mt-4 mb-2 border-l-2 border-accent pl-4">
              <p className="font-read italic text-[17px] text-content">{active.term}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-content-dim">{active.definition}</p>
              {active.context && <p className="mt-2 text-[13px] text-content-faint">{active.context}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChapterHead({ n, label }: { n: number; label: string }) {
  return (
    <Reveal className="mb-10 flex items-baseline gap-4">
      <span className="font-display italic text-accent text-[22px] leading-none">{String(n).padStart(2, "0")}</span>
      <span className="smallcaps text-[15px] text-content-faint">{label}</span>
      <span className="h-px flex-1 bg-edge translate-y-[-4px]" />
    </Reveal>
  );
}

function ThreadTimeline({ thread, currentId, fresh }: { thread: CardStory[]; currentId: string; fresh: Set<string> }) {
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
  return (
    <ol className="relative">
      <span className="absolute left-[5px] top-2 bottom-2 w-px bg-edge" />
      {thread.map((t) => {
        const here = t.id === currentId;
        return (
          <Reveal as="li" key={t.id} className="relative pl-8 pb-9 last:pb-0">
            <span
              className={`absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 ${
                here ? "border-accent bg-accent" : "border-content-faint bg-surface"
              }`}
            />
            <p className="smallcaps text-[13px] text-content-faint">
              {day(t.created_at)}
              {here && <span className="ml-2 text-accent">you are here</span>}
              {!here && fresh.has(t.id) && <span className="ml-2 rounded-full bg-accent-bold px-1.5 text-[10px] font-semibold leading-[1.6] text-white">new since you read</span>}
            </p>
            {here ? (
              <p className="font-display mt-1 text-[1.3rem] leading-snug text-content">{t.simplified_title}</p>
            ) : (
              <Link prefetch={false} href={`/story/${t.id}`} className="group block">
                <span className="font-display mt-1 block text-[1.3rem] leading-snug text-content-dim group-hover:text-accent transition-colors">
                  {t.simplified_title}
                </span>
                <span className="mt-1 block font-read text-[1.02rem] leading-snug text-content-faint line-clamp-2">{t.quick_summary}</span>
              </Link>
            )}
          </Reveal>
        );
      })}
    </ol>
  );
}

/** Thread parts published after the last part this reader read (only if they read an earlier part). */
function useSinceLastRead(thread: CardStory[], currentId: string) {
  const progress = useProgress();
  return useMemo(() => {
    const reads = thread
      .filter((t) => t.id !== currentId && progress.read[t.id])
      .map((t) => progress.readAt[t.id] ?? `${progress.read[t.id]}T23:59:59+10:00`);
    if (!reads.length) return { last: null as string | null, fresh: new Set<string>() };
    const last = reads.sort().at(-1)!;
    const fresh = new Set(thread.filter((t) => t.id !== currentId && t.created_at > last && !progress.read[t.id]).map((t) => t.id));
    return { last, fresh };
  }, [thread, currentId, progress]);
}

/** "New to this?" primer, folded away until asked for. */
function BeginnerPrimer({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-10 rounded-2xl border border-edge bg-surface-raised">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block font-display text-[1.15rem] text-content">New to this?</span>
          <span className="block text-[13px] text-content-faint">The 30-second version for anyone starting from zero</span>
        </span>
        <span className={`text-accent text-xl transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className="unfold" data-open={open} inert={!open}>
        <div>
          <p className="px-5 pb-5 font-read text-[1.1rem] leading-relaxed text-content-dim">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function DepthReader({ story, next, thread = [] }: { story: Story; next: Story | null; thread?: CardStory[] }) {
  const heroRef = useRef<HTMLElement>(null);
  const endOfExplainer = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("gist");

  const analysis = useMemo(() => parseAnalysis(story.deep_analysis), [story.deep_analysis]);
  const since = useSinceLastRead(thread, story.id);
  const paragraphs = story.simplified_body.split(/\n\n+/).filter(Boolean);
  const concepts = story.concepts || [];

  // Each concept is explained at its first appearance only
  const conceptsByPara = useMemo(() => {
    const used = new Set<string>();
    return paragraphs.map((p) =>
      concepts.filter((c) => {
        if (used.has(c.term) || !p.toLowerCase().includes(c.term.toLowerCase())) return false;
        used.add(c.term);
        return true;
      }),
    );
  }, [paragraphs, concepts]);

  const chapters: Chapter[] = useMemo(() => {
    let total = 0;
    const add = (id: string, label: string, text: string) => {
      total += words(text) / WPM;
      return { id, label, minutes: total };
    };
    const list = [add("gist", "The gist", story.quick_summary), add("story", "The story", story.simplified_body)];
    if (story.why_it_matters) list.push(add("why", "Why it matters", story.why_it_matters));
    if (thread.length > 1) list.push(add("thread", "The story so far", thread.map((t) => t.simplified_title).join(" ")));
    // Asked while the story is fresh, before the background and perspectives
    if (story.quiz) list.push(add("check", "Quick check", story.quiz.question + story.quiz.options.join(" ")));
    analysis.forEach((s, i) => list.push(add(`a${i}`, SECTION_LABELS[s.title] || s.title, s.body)));
    if (story.has_fulltext) list.push({ id: "original", label: "Original reporting", minutes: total + (story.reading_minutes || 3) });
    return list;
  }, [story, analysis, thread]);

  // Hero recedes as you scroll past it
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--p", Math.min(1, window.scrollY / el.offsetHeight).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // Reaching the end of the explainer counts as reading the story
  useEffect(() => {
    const el = endOfExplainer.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && markRead(story.id));
    io.observe(el);
    return () => io.disconnect();
  }, [story.id]);

  const activeIdx = Math.max(0, chapters.findIndex((c) => c.id === active));
  const cat = CATEGORY_CONFIG[story.category] || CATEGORY_CONFIG.UNCATEGORISED;
  const region = story.region_code ? REGION_CONFIG[story.region_code] : null;
  const sourceNames = story.sources.map((s) => s.name).filter((n, i, a) => a.indexOf(n) === i);
  const published = story.created_at
    ? new Date(story.created_at).toLocaleString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Australia/Brisbane",
      })
    : null;
  const fmtMin = (m: number) => (m < 1 ? `${Math.max(10, Math.round((m * 60) / 10) * 10)} sec` : `${Math.round(m)} min`);
  let n = 0;

  return (
    <div>
      {/* ── Hero ── */}
      <header ref={heroRef} className="relative h-[92svh] min-h-[560px] overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950">
        {story.image_url && (
          // Tiny blurred preview so the hero never flashes black while the full photo loads
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxied(story.image_url, 48)} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
        )}
        {story.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <NewsImage
            src={story.image_url}
            priority
            fade
            sizes="(min-width: 1024px) calc(100vw - 240px), 100vw"
            className="hero-media absolute inset-0 h-full w-full object-cover will-change-transform"
            fallback={<div className="hero-media absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />}
          />
        ) : (
          <div className="hero-media absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/85" />

        <Link
          href="/"
          className="absolute top-6 left-5 md:left-10 z-10 text-[13px] text-white/80 hover:text-white transition-colors"
        >
          ← Today&apos;s edition
        </Link>

        <div className="hero-copy absolute inset-x-0 bottom-0 px-5 md:px-10 pb-12 md:pb-16 max-w-5xl">
          <p className="rise smallcaps text-[14px] text-white/70">
            {region?.label ?? cat.label} · {cat.label}
          </p>
          <h1
            className="rise font-display mt-4 text-[2.6rem] leading-[1.02] md:text-[4.4rem] font-medium text-white text-balance"
            style={{ animationDelay: "90ms" }}
          >
            {story.simplified_title}
          </h1>
          <p className="rise mt-6 text-[14px] text-white/65" style={{ animationDelay: "180ms" }}>
            {published && <>{published} · </>}Reported by {sourceNames.join(", ")} · {fmtMin(chapters[chapters.length - 1].minutes)} all the way down
          </p>
        </div>

        <div className="absolute bottom-6 right-5 md:right-10 flex flex-col items-center gap-2 text-white/60">
          <span className="smallcaps text-[12px] [writing-mode:vertical-rl]">scroll to go deeper</span>
          <span className="h-10 w-px overflow-hidden bg-white/20">
            <span className="block h-1/2 w-px bg-white animate-[cue_2s_ease-in-out_infinite]" />
          </span>
        </div>
      </header>

      {/* ── Mobile depth bar ── */}
      <div className="lg:hidden sticky top-14 z-20 bg-surface-header backdrop-blur-xl px-5 py-2.5 border-b border-edge">
        <div className="flex gap-1">
          {chapters.map((c, i) => (
            <span key={c.id} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${i <= activeIdx ? "bg-accent" : "bg-edge"}`} />
          ))}
        </div>
        <p className="mt-1.5 flex justify-between text-[11px] text-content-faint">
          <span className="smallcaps text-content">{chapters[activeIdx]?.label}</span>
          <span>{fmtMin(chapters[activeIdx]?.minutes ?? 0)} in</span>
        </p>
      </div>

      {/* ── Body ── */}
      <div className="relative mx-auto max-w-[1180px] px-5 md:px-10 lg:grid lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-16">
        {/* Depth rail */}
        <nav className="hidden lg:block">
          <ol className="sticky top-24 mt-24 space-y-0">
            {chapters.map((c, i) => {
              const state = i < activeIdx ? "done" : i === activeIdx ? "now" : "todo";
              return (
                <li key={c.id} className="relative pl-6 pb-5 last:pb-0">
                  {i < chapters.length - 1 && (
                    <span className="absolute left-[3px] top-3 bottom-0 w-px bg-edge">
                      <span className={`block w-px bg-accent transition-all duration-700 ${state === "done" ? "h-full" : "h-0"}`} />
                    </span>
                  )}
                  <span
                    className={`absolute left-0 top-[7px] h-[7px] w-[7px] rounded-full transition-all duration-500 ${
                      state === "todo" ? "bg-edge" : "bg-accent"
                    } ${state === "now" ? "ring-4 ring-accent/20" : ""}`}
                  />
                  <a
                    href={`#${c.id}`}
                    className={`block text-[13px] leading-tight transition-colors ${state === "now" ? "text-content" : "text-content-faint hover:text-content-dim"}`}
                  >
                    {c.label}
                  </a>
                  <span className="text-[11px] text-content-faint/70">{fmtMin(c.minutes)}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="min-w-0 max-w-[640px] pb-10">
          {since.fresh.size > 0 && since.last && (
            <a
              href="#thread"
              className="mt-12 flex items-center justify-between gap-4 rounded-2xl border border-edge-accent bg-accent-soft px-5 py-4 text-content"
            >
              <span>
                <span className="smallcaps block text-[12px] text-accent">Since you last read</span>
                <span className="mt-0.5 block font-read text-[1.05rem]">
                  {since.fresh.size} new {since.fresh.size === 1 ? "development" : "developments"} since{" "}
                  {new Date(since.last).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short", timeZone: "Australia/Brisbane" })}
                </span>
              </span>
              <span className="text-accent">↓</span>
            </a>
          )}

          {/* 01 Gist */}
          <section id="gist" className="pt-20 md:pt-28 pb-24 scroll-mt-20">
            <ChapterHead n={++n} label="The gist" />
            <InkText text={story.quick_summary} className="font-display text-[2rem] md:text-[2.6rem] leading-[1.18] font-normal text-content text-pretty" />
          </section>

          {/* 02 Story */}
          <section id="story" className="pb-24 scroll-mt-20">
            <ChapterHead n={++n} label="The story" />
            <div className="space-y-7">
              {paragraphs.map((p, i) => (
                <ConceptParagraph key={i} text={p} concepts={conceptsByPara[i]} />
              ))}
            </div>
          </section>

          {/* 03 Why */}
          {story.why_it_matters && (
            <section id="why" className="pb-24 scroll-mt-20">
              <ChapterHead n={++n} label="Why it matters" />
              <InkText
                text={story.why_it_matters}
                className="font-display italic text-[1.7rem] md:text-[2.1rem] leading-[1.25] text-content text-pretty"
              />
            </section>
          )}
          {thread.length > 1 && (
            <section id="thread" className="pb-24 scroll-mt-20">
              <ChapterHead n={++n} label="The story so far" />
              <Reveal as="p" className="font-read mb-10 text-[1.1rem] text-content-dim">
                This is part of a developing story. Here&apos;s how it has unfolded.
              </Reveal>
              <ThreadTimeline thread={thread} currentId={story.id} fresh={since.fresh} />
            </section>
          )}
          <div ref={endOfExplainer} />

          {story.quiz && (
            <section id="check" className="pb-24 scroll-mt-20">
              <ChapterHead n={++n} label="Quick check" />
              <QuizBlock storyId={story.id} quiz={story.quiz} />
            </section>
          )}

          {/* Analysis */}
          {analysis.map((s, i) => (
            <section key={s.title} id={`a${i}`} className="pb-24 scroll-mt-20">
              <ChapterHead n={++n} label={SECTION_LABELS[s.title] || s.title} />
              {s.title === "Historical Context" && story.background_beginner && <BeginnerPrimer text={story.background_beginner} />}
              <AnalysisBody body={s.body} />
            </section>
          ))}

          {story.has_fulltext && (
            <section id="original" className="pb-16 scroll-mt-20">
              <ChapterHead n={++n} label="Original reporting" />
              <OriginalReporting storyId={story.id} minutes={story.reading_minutes} />
            </section>
          )}

          <Reveal className="border-t border-edge pt-6 text-[13px] text-content-faint">
            Sources:{" "}
            {story.sources.map((s, i) => (
              <Fragment key={s.url}>
                {i > 0 && ", "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-content-dim underline decoration-edge underline-offset-4 hover:decoration-accent">
                  {s.name}
                </a>
              </Fragment>
            ))}
          </Reveal>
        </main>
      </div>

      {/* ── Up next ── */}
      {next && (
        <Link href={`/story/${next.id}`} className="group relative mt-16 block h-[70svh] min-h-[420px] overflow-hidden bg-black">
          <NewsImage
            src={next.image_url}
            sizes="(min-width: 1024px) calc(100vw - 240px), 100vw"
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-[1.6s] ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <Reveal className="absolute inset-x-0 bottom-0 px-5 md:px-10 pb-14 max-w-4xl">
            <p className="smallcaps text-[14px] text-white/60">Up next</p>
            <p className="font-display mt-3 text-[2.2rem] md:text-[3.4rem] leading-[1.05] text-white">{next.simplified_title}</p>
            <p className="mt-4 max-w-xl text-[15px] text-white/70">{next.quick_summary}</p>
            <span className="mt-6 inline-block text-[13px] text-white/90 border-b border-white/40 pb-0.5 group-hover:border-white transition-colors">
              Keep reading →
            </span>
          </Reveal>
        </Link>
      )}
    </div>
  );
}
