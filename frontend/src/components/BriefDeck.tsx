"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardStory, QuizItem, CATEGORY_CONFIG, REGION_CONFIG } from "@/lib/types";
import { useProgress } from "@/lib/progress";
import NewsImage from "./NewsImage";
import { proxied } from "@/lib/images";
import QuizRunner from "./QuizRunner";

// Full-screen, one-story-per-screen triage: read the gist, go deeper only on what hooks you.
export default function BriefDeck({ stories, quiz = [] }: { stories: CardStory[]; quiz?: QuizItem[] }) {
  const deck = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const progress = useProgress();
  const [idx, setIdx] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const total = stories.length;

  useEffect(() => {
    const root = deck.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setIdx(Number((e.target as HTMLElement).dataset.idx));
        }),
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    const target = deck.current?.querySelectorAll("section")[i];
    target?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (quizOpen) {
        if (e.key === "Escape") setQuizOpen(false);
        return;
      }
      if (["ArrowDown", "j", " "].includes(e.key)) {
        e.preventDefault();
        go(Math.min(idx + 1, total));
      } else if (["ArrowUp", "k"].includes(e.key)) {
        e.preventDefault();
        go(Math.max(idx - 1, 0));
      } else if (e.key === "Enter" && stories[idx]) {
        router.push(`/story/${stories[idx].id}`);
      } else if (e.key === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, total, stories, go, router, quizOpen]);

  const unread = stories.filter((s) => !progress.read[s.id]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0a09] text-[#f3ede4]">
      <h1 className="sr-only">The brief: today&apos;s stories, one at a time</h1>
      {/* Chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-5 md:p-8 flex items-start justify-between">
        <Link href="/" className="pointer-events-auto text-[13px] text-white/60 hover:text-white transition-colors">
          ✕ Close
        </Link>
        <p className="font-display italic text-[15px] text-white/70 tabular-nums">
          {String(Math.min(idx + 1, total)).padStart(2, "0")} <span className="text-white/60">/ {total}</span>
        </p>
      </div>
      <div className="absolute inset-x-0 top-0 z-20 h-[2px] bg-white/10">
        <div className="h-full bg-[#ff7a4d] transition-[width] duration-700 ease-out" style={{ width: `${(Math.min(idx + 1, total) / total) * 100}%` }} />
      </div>

      <div ref={deck} className="snap-deck no-scrollbar h-full overflow-y-scroll">
        {stories.map((s, i) => {
          const cat = CATEGORY_CONFIG[s.category] || CATEGORY_CONFIG.UNCATEGORISED;
          const region = s.region_code ? REGION_CONFIG[s.region_code] : null;
          const on = i === idx;
          const step = (d: number) => ({
            transitionDelay: on ? `${d}ms` : "0ms",
            opacity: on ? 1 : 0,
            transform: on ? "none" : "translateY(24px)",
            filter: on ? "none" : "blur(6px)",
          });
          return (
            <section key={s.id} data-idx={i} className="relative h-[100svh] overflow-hidden">
              {s.image_url && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proxied(s.image_url, 160)} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover scale-125 blur-3xl opacity-35" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90" />

              <div className="relative grid h-full md:grid-cols-[1.05fr_1fr] md:items-center gap-0 md:gap-14 px-5 md:px-14 pt-16 pb-8 md:py-16">
                <div
                  className="relative h-[34svh] md:h-[68svh] overflow-hidden rounded-[22px] transition-all duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ transform: on ? "scale(1)" : "scale(0.94)", opacity: on ? 1 : 0.4 }}
                >
                  {s.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <NewsImage
                      src={s.image_url}
                      priority={i === 0}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="h-full w-full object-cover"
                      fallback={<div className="h-full w-full bg-gradient-to-br from-stone-800 to-orange-950" />}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-stone-800 to-orange-950" />
                  )}
                  {progress.read[s.id] && (
                    <span className="absolute top-3 left-3 rounded-full bg-black/50 backdrop-blur px-2.5 py-1 text-[11px] text-white/90">Read</span>
                  )}
                </div>

                <div className="mt-6 md:mt-0 max-w-xl [&>*]:transition-all [&>*]:duration-1000 [&>*]:ease-[cubic-bezier(.16,1,.3,1)]">
                  <p className="smallcaps text-[13px] text-white/55" style={step(80)}>
                    {region?.label} · {cat.label}
                  </p>
                  <h2 className="font-display mt-3 text-[1.9rem] md:text-[3rem] leading-[1.05] font-medium text-balance" style={step(160)}>
                    {s.simplified_title}
                  </h2>
                  <p className="font-read mt-5 text-[1.12rem] md:text-[1.3rem] leading-[1.55] text-white/80 text-pretty" style={step(260)}>
                    {s.quick_summary}
                  </p>
                  {s.why_it_matters && (
                    <p className="hidden sm:block mt-5 border-l border-[#ff7a4d] pl-4 font-read italic text-[1rem] leading-relaxed text-white/60" style={step(360)}>
                      {s.why_it_matters}
                    </p>
                  )}
                  <div className="mt-7 flex items-center gap-6 text-[14px]" style={step(460)}>
                    <Link prefetch={false} href={`/story/${s.id}`} className="rounded-full bg-[#f3ede4] px-5 py-2.5 font-medium text-[#0b0a09] hover:bg-white transition-colors">
                      Go deeper
                    </Link>
                    <button onClick={() => go(i + 1)} className="text-white/55 hover:text-white transition-colors">
                      Next ↓
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <section data-idx={total} className="relative flex h-[100svh] items-center justify-center px-6 text-center">
          <div>
            <p className="font-display italic text-[#ff7a4d] text-[20px]">Fin.</p>
            <h2 className="font-display mt-4 text-[2.6rem] md:text-[4rem] leading-none">You&apos;re briefed.</h2>
            <p className="font-read mt-5 text-[1.2rem] text-white/65">
              {total} stories skimmed. {unread.length ? `${unread.length} still waiting for a deeper read.` : "And you've read every one."}
            </p>
            {quiz.length > 0 && (
              <button
                onClick={() => setQuizOpen(true)}
                className="mt-9 inline-flex items-center gap-4 rounded-full bg-[#ff7a4d] pl-6 pr-2 py-2 text-left text-[#0b0a09] shadow-2xl transition-transform hover:-translate-y-0.5"
              >
                <span>
                  <span className="block text-[15px] font-semibold">Did it stick?</span>
                  <span className="block text-[12px] opacity-70">{quiz.length} quick questions · counts toward today&apos;s goal</span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b0a09] text-[#f3ede4]">→</span>
              </button>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[14px]">
              {unread[0] && (
                <Link href={`/story/${unread[0].id}`} className="rounded-full bg-[#f3ede4] px-5 py-2.5 font-medium text-[#0b0a09]">
                  Read the top unread story
                </Link>
              )}
              <Link href="/" className="text-white/60 hover:text-white">Back to the edition</Link>
            </div>
          </div>
        </section>
      </div>

      {quizOpen && (
        <div role="dialog" aria-modal="true" aria-label="Brief quiz" className="absolute inset-0 z-30 overflow-y-auto bg-[#0b0a09]">
          <div className="mx-auto max-w-2xl px-5 md:px-8 pt-20 pb-16">
            <button onClick={() => setQuizOpen(false)} className="absolute top-5 left-5 md:top-8 md:left-8 text-[13px] text-white/60 hover:text-white">
              ✕ Close quiz
            </button>
            <p className="smallcaps text-[13px] text-white/50 mb-6">Today&apos;s brief · quick check</p>
            <QuizRunner items={quiz} dark onDone={() => router.push("/")} />
          </div>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-4 inset-x-0 z-20 hidden md:block text-center text-[11px] text-white/55">
        ↑ ↓ to move · enter to go deeper · esc to close
      </p>
    </div>
  );
}
