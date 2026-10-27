"use client";

import { useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import { Reveal } from "./motion";
import { dateKey, streakOf } from "@/lib/progress";

interface Challenge {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  description: string;
  hints: string[];
  solution: string;
  language?: string;
  estimated_minutes: number;
}

const TYPE_LABEL: Record<string, string> = { coding: "Coding", brain_teaser: "Brain teaser", finance: "Finance" };

// Completion lives in localStorage ({id: YYYY-MM-DD done}); "today" is a Brisbane
// day (dateKey), so the featured challenge and the streak turn over at local midnight.
const KEY = "brainfeed-challenges";

function loadDone(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDone(all: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage unavailable: completions last for this visit only
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-[1.7] ${
        accent ? "bg-accent-soft text-accent" : "border border-edge text-content-faint"
      }`}
    >
      {children}
    </span>
  );
}

/** Hints + solution + "mark as done", shared by the hero and the grid cards. */
function ChallengeBody({ c, done, onDone }: { c: Challenge; done: boolean; onDone: () => void }) {
  const [hints, setHints] = useState(0);
  const [solution, setSolution] = useState(false);

  return (
    <div>
      <div className="space-y-4">
        {c.description.split("\n\n").map((p, i) => (
          <p key={i} className="prose-read !text-[1.08rem]">{p}</p>
        ))}
      </div>

      {hints > 0 && (
        <ol className="mt-6 space-y-2 border-l-2 border-accent pl-4">
          {c.hints.slice(0, hints).map((h, i) => (
            <li key={i} className="animate-in font-read italic text-[1.02rem] text-content-dim">Hint {i + 1}: {h}</li>
          ))}
        </ol>
      )}

      {solution && (
        <pre className="animate-in mt-6 overflow-x-auto whitespace-pre-wrap rounded-xl border border-edge bg-surface-inset px-5 py-4 font-mono text-[13px] leading-relaxed text-content">
          {c.solution}
        </pre>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-5 text-[14px]">
        <button
          onClick={onDone}
          className={`rounded-full px-4 py-2 font-medium transition-colors ${
            done ? "border border-accent text-accent" : "bg-content text-surface hover:opacity-90"
          }`}
        >
          {done ? "✓ Done" : "Mark as done"}
        </button>
        {hints < c.hints.length && (
          <button onClick={() => setHints(hints + 1)} className="text-content-dim underline decoration-edge underline-offset-4 hover:decoration-accent">
            {hints === 0 ? "Give me a hint" : "Another hint"}
          </button>
        )}
        <button onClick={() => setSolution(!solution)} className="text-content-dim underline decoration-edge underline-offset-4 hover:decoration-accent">
          {solution ? "Hide the answer" : "Show the answer"}
        </button>
      </div>
    </div>
  );
}

export default function ChallengesClient({ challenges }: { challenges: Challenge[] }) {
  const [type, setType] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  // Featured pick is date-derived; resolved on the client so the static HTML
  // (built days earlier) doesn't bake in a stale day
  const [todayIdx, setTodayIdx] = useState<number | null>(null);

  useEffect(() => {
    setDone(loadDone());
    setReady(true);
    const day = Number(dateKey().slice(-2));
    setTodayIdx(day % challenges.length);
  }, [challenges.length]);

  const markDone = (id: string) => {
    const all = loadDone();
    if (all[id]) delete all[id];
    else all[id] = dateKey();
    saveDone(all);
    setDone(all);
  };

  const streak = streakOf([...new Set(Object.values(done))]);
  const types = [...new Set(challenges.map((c) => c.type))];
  const filtered = type ? challenges.filter((c) => c.type === type) : challenges;
  const today = todayIdx === null ? null : challenges[todayIdx];
  const rest = today ? filtered.filter((c) => c.id !== today.id) : filtered;
  const tab = (on: boolean) =>
    `whitespace-nowrap pb-1 border-b transition-colors ${on ? "text-content border-accent" : "text-content-faint border-transparent hover:text-content"}`;
  const todayLabel = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });

  return (
    <div className="mx-auto max-w-[1200px] px-5 md:px-10 pb-24">
      <PageHeader
        kicker="Train your brain"
        title="Daily challenges"
        standfirst="Five to ten minute puzzles. Have a real go before you reach for a hint."
      />

      {/* ── Today's challenge ── */}
      <section aria-label="Today's challenge" className="mb-16">
        <Reveal className="border-l-2 border-accent pl-6 md:pl-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="smallcaps text-[14px] text-content-faint">Today&apos;s challenge · {todayLabel}</p>
            {ready && streak > 0 && <Chip accent>{streak}-day streak</Chip>}
          </div>
          {today ? (
            <>
              <h2 className="mt-4 font-display text-[2.2rem] leading-[1.05] font-medium text-content text-balance md:text-[3.2rem]">
                {today.title}
              </h2>
              <p className="mt-3 flex flex-wrap items-center gap-2">
                <Chip accent>{TYPE_LABEL[today.type] ?? today.type}</Chip>
                <Chip>{cap(today.difficulty)}</Chip>
                <Chip>~{today.estimated_minutes} min</Chip>
                {done[today.id] === dateKey() && <Chip accent>✓ done today</Chip>}
              </p>
              <div className="mt-6 max-w-3xl">
                <ChallengeBody c={today} done={Boolean(done[today.id])} onDone={() => markDone(today.id)} />
              </div>
            </>
          ) : (
            // Static HTML renders this frame; the day-derived pick lands right after hydration
            <div className="mt-4 h-40" aria-hidden />
          )}
        </Reveal>
      </section>

      {/* ── All challenges ── */}
      <Reveal className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-display text-[1.9rem] md:text-[2.2rem] leading-none text-content">All challenges</h2>
        <nav aria-label="Challenge types" className="no-scrollbar flex gap-6 overflow-x-auto text-[14px]">
          <button onClick={() => setType(null)} className={tab(!type)}>All {challenges.length}</button>
          {types.map((t) => (
            <button key={t} onClick={() => setType(type === t ? null : t)} className={tab(type === t)}>
              {TYPE_LABEL[t] ?? t}
            </button>
          ))}
        </nav>
      </Reveal>

      <ol className="mt-8 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rest.map((c, i) => {
          const isOpen = open === c.id;
          const doneDate = ready ? done[c.id] : undefined;
          return (
            <Reveal as="li" key={c.id} className={isOpen ? "md:col-span-2 xl:col-span-3" : ""}>
              <div className="card-depth h-full rounded-[20px] border border-edge bg-surface-raised p-6">
                <button
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  className="group block w-full text-left"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-display italic text-[1.3rem] leading-none text-accent/80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      {doneDate && <span className="text-[12px] font-medium text-accent">✓ {doneDate === dateKey() ? "today" : doneDate.slice(5)}</span>}
                      <span className={`text-content-faint transition-transform duration-500 ${isOpen ? "rotate-45" : ""}`} aria-hidden>+</span>
                    </span>
                  </span>
                  <span className="mt-3 block font-display text-[1.35rem] leading-tight text-content transition-colors group-hover:text-accent">
                    {c.title}
                  </span>
                  <span className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Chip accent>{TYPE_LABEL[c.type] ?? c.type}</Chip>
                    <Chip>{cap(c.difficulty)}</Chip>
                    <Chip>~{c.estimated_minutes} min</Chip>
                  </span>
                </button>

                <div className="unfold" data-open={isOpen} inert={!isOpen}>
                  <div>
                    <div className="max-w-3xl pt-5">
                      <ChallengeBody c={c} done={Boolean(doneDate)} onDone={() => markDone(c.id)} />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ol>

      {rest.length === 0 && (
        <p className="py-12 font-read text-content-faint">No {TYPE_LABEL[type ?? ""] ?? ""} challenges yet.</p>
      )}
    </div>
  );
}
