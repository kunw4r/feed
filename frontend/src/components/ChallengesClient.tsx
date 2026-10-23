"use client";

import { useState } from "react";
import PageHeader from "./PageHeader";
import { Reveal } from "./motion";

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

function ChallengeRow({ c, n }: { c: Challenge; n: number }) {
  const [open, setOpen] = useState(false);
  const [hints, setHints] = useState(0);
  const [solution, setSolution] = useState(false);

  return (
    <li className="border-b border-edge">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="group grid w-full grid-cols-[2.4rem_1fr_auto] items-baseline gap-3 py-6 text-left">
        <span className="font-display italic text-[1.5rem] leading-none text-accent/80">{String(n).padStart(2, "0")}</span>
        <span>
          <span className="block font-display text-[1.4rem] leading-tight text-content group-hover:text-accent transition-colors">{c.title}</span>
          <span className="mt-1 block text-[13px] text-content-faint">
            {TYPE_LABEL[c.type] ?? c.type} · {c.difficulty} · {c.estimated_minutes} min
          </span>
        </span>
        <span className={`text-content-faint transition-transform duration-500 ${open ? "rotate-45" : ""}`} aria-hidden>+</span>
      </button>

      <div className="unfold" data-open={open} inert={!open}>
        <div>
          <div className="pb-8 md:pl-[3.15rem]">
            <div className="space-y-4">
              {c.description.split("\n\n").map((p, i) => (
                <p key={i} className="prose-read !text-[1.12rem]">{p}</p>
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

            <div className="mt-6 flex flex-wrap gap-5 text-[14px]">
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
        </div>
      </div>
    </li>
  );
}

export default function ChallengesClient({ challenges }: { challenges: Challenge[] }) {
  const [type, setType] = useState<string | null>(null);
  const types = [...new Set(challenges.map((c) => c.type))];
  const filtered = type ? challenges.filter((c) => c.type === type) : challenges;
  const tab = (on: boolean) =>
    `whitespace-nowrap pb-1 border-b transition-colors ${on ? "text-content border-accent" : "text-content-faint border-transparent hover:text-content"}`;

  return (
    <div className="max-w-4xl px-4 md:px-10 pb-24">
      <PageHeader
        kicker="Train your brain"
        title="Daily challenges"
        standfirst="Five to ten minute puzzles. Have a real go before you reach for a hint."
      />
      <nav aria-label="Challenge types" className="no-scrollbar mb-6 flex gap-6 overflow-x-auto text-[14px]">
        <button onClick={() => setType(null)} className={tab(!type)}>All {challenges.length}</button>
        {types.map((t) => (
          <button key={t} onClick={() => setType(type === t ? null : t)} className={tab(type === t)}>
            {TYPE_LABEL[t] ?? t}
          </button>
        ))}
      </nav>
      <Reveal>
        <ol className="border-t border-edge">
          {filtered.map((c, i) => (
            <ChallengeRow key={c.id} c={c} n={i + 1} />
          ))}
        </ol>
      </Reveal>
    </div>
  );
}
