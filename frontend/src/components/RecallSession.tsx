"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Quiz } from "@/lib/types";
import { useProgress, dueForReview, reviewRecall, pruneRecall } from "@/lib/progress";
import PageHeader from "./PageHeader";

const BASE = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";
const SESSION = 8;

interface BankItem {
  id: string;
  title: string;
  created_at: string;
  quiz: Quiz;
}

// Reorder options per day so the answer's position can't be memorised
function reshuffle(quiz: Quiz, seed: string): Quiz {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const order = quiz.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...quiz, options: order.map((i) => quiz.options[i]), answer_index: order.indexOf(quiz.answer_index) };
}

function ago(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

export default function RecallSession() {
  const progress = useProgress();
  const [bank, setBank] = useState<BankItem[] | null>(null);
  const [queue, setQueue] = useState<BankItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetch(`${BASE}/recall/bank.json`)
      .then((r) => r.json())
      .then((items: BankItem[]) => {
        setBank(items);
        pruneRecall(new Set(items.map((b) => b.id)));
      })
      .catch(() => setBank([]));
  }, []);

  const byId = useMemo(() => new Map((bank ?? []).map((b) => [b.id, b])), [bank]);
  const due = dueForReview(progress).filter((id) => byId.has(id));
  const readable = Object.keys(progress.read).filter((id) => byId.has(id));
  const today = new Date().toLocaleDateString("en-CA");

  const start = (ids: string[]) => {
    setQueue(ids.slice(0, SESSION).map((id) => byId.get(id)!));
    setIdx(0);
    setPicked(null);
    setScore(0);
  };

  const item = queue?.[idx];
  const quiz = item ? reshuffle(item.quiz, item.id + today) : null;

  const choose = (i: number) => {
    if (picked !== null || !item || !quiz) return;
    setPicked(i);
    const right = i === quiz.answer_index;
    if (right) setScore((s) => s + 1);
    reviewRecall(item.id, right);
  };

  // ── Start / empty states ──
  if (!queue) {
    const nextDue = Object.values(progress.recall)
      .map((c) => c.due)
      .filter((d) => d > today)
      .sort()[0];
    return (
      <div className="max-w-3xl px-4 md:px-10 pb-24">
        <PageHeader
          kicker="Make it stick"
          title={<>Review</>}
          standfirst="A few quick questions on stories you've read. Get one right and it comes back later; miss it and you'll see it again tomorrow."
        />
        {bank === null ? (
          <p className="font-read text-content-faint">Loading your questions…</p>
        ) : due.length > 0 ? (
          <div className="rise">
            <p className="font-display text-[2rem] leading-tight text-content">
              {due.length} {due.length === 1 ? "story" : "stories"} to review.
            </p>
            <p className="mt-2 font-read text-[1.1rem] text-content-dim">About {Math.max(1, Math.round(Math.min(due.length, SESSION) * 0.4))} minutes.</p>
            <button onClick={() => start(due)} className="mt-8 rounded-full bg-content px-6 py-3 text-[15px] font-medium text-surface">
              Start review →
            </button>
          </div>
        ) : readable.length > 0 ? (
          <div className="rise">
            <p className="font-display text-[2rem] leading-tight text-content">You&apos;re all caught up.</p>
            <p className="mt-2 font-read text-[1.1rem] text-content-dim">
              {nextDue ? `Next review due ${new Date(nextDue + "T12:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}.` : ""}
            </p>
            <button
              onClick={() => start([...readable].sort(() => Math.random() - 0.5))}
              className="mt-8 rounded-full border border-edge px-6 py-3 text-[15px] text-content-dim hover:text-content hover:border-content-faint transition-colors"
            >
              Practise anyway
            </button>
          </div>
        ) : (
          <div className="rise">
            <p className="font-display text-[2rem] leading-tight text-content">Nothing to review yet.</p>
            <p className="mt-2 font-read text-[1.1rem] text-content-dim">Read a few stories and they&apos;ll show up here, spaced out so they stick.</p>
            <Link href="/" className="mt-8 inline-block rounded-full bg-content px-6 py-3 text-[15px] font-medium text-surface">Today&apos;s edition →</Link>
          </div>
        )}
      </div>
    );
  }

  // ── Finished ──
  if (!item || !quiz) {
    return (
      <div className="flex min-h-[80vh] items-center px-4 md:px-10">
        <div className="rise">
          <p className="font-display italic text-accent text-[22px]">Done.</p>
          <h1 className="font-display mt-3 text-[3rem] md:text-[4.4rem] leading-none text-content">
            {score} of {queue.length} remembered.
          </h1>
          <p className="font-read mt-5 max-w-lg text-[1.15rem] text-content-dim">
            {score === queue.length
              ? "Every one. Those stories are pushed further out now."
              : "The ones you missed come back tomorrow. That's how they stick."}
          </p>
          <div className="mt-8 flex gap-6 text-[14px]">
            <Link href="/" className="rounded-full bg-content px-5 py-2.5 font-medium text-surface">Today&apos;s edition</Link>
            <button onClick={() => setQueue(null)} className="py-2.5 text-content-dim hover:text-content">Back to review</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Question ──
  const answered = picked !== null;
  return (
    <div className="max-w-3xl px-4 md:px-10 pt-10 md:pt-16 pb-24">
      <div className="mb-10 flex items-center gap-4">
        <div className="h-[2px] flex-1 bg-edge">
          <div className="h-full bg-accent transition-all duration-700" style={{ width: `${(idx / queue.length) * 100}%` }} />
        </div>
        <span className="font-display italic text-[15px] text-content-faint tabular-nums">
          {idx + 1} / {queue.length}
        </span>
      </div>

      <div key={item.id} className="animate-in">
        <p className="smallcaps text-[13px] text-content-faint">
          From a story you read {ago(item.created_at)}
        </p>
        <Link prefetch={false} href={`/story/${item.id}`} className="mt-1 block font-read italic text-[1.05rem] text-content-dim hover:text-accent transition-colors">
          {item.title}
        </Link>
        <h1 className="font-display mt-8 text-[1.8rem] md:text-[2.3rem] leading-[1.2] font-medium text-content text-pretty">{quiz.question}</h1>

        <ol className="mt-8 border-t border-edge">
          {quiz.options.map((opt, i) => {
            const isAnswer = i === quiz.answer_index;
            const tone = !answered
              ? "text-content hover:pl-3"
              : isAnswer
                ? "text-content pl-3"
                : i === picked
                  ? "text-content-faint line-through decoration-red-400/70"
                  : "text-content-faint";
            return (
              <li key={i} className="border-b border-edge">
                <button
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`group flex w-full items-baseline gap-5 py-4 text-left transition-all duration-500 ${tone}`}
                >
                  <span className={`font-display italic text-[17px] w-5 ${answered && isAnswer ? "text-accent" : "text-content-faint group-hover:text-accent"}`}>
                    {answered && isAnswer ? "✓" : String.fromCharCode(97 + i)}
                  </span>
                  <span className="font-read text-[1.12rem] leading-snug">{opt}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="unfold" data-open={answered} inert={!answered}>
          <div>
            <p className="pt-6 font-read text-[1.1rem] leading-relaxed text-content-dim">
              <span className="font-display italic text-content">{picked === quiz.answer_index ? "Remembered. " : "Not this time. "}</span>
              {quiz.explanation}
            </p>
            <button
              onClick={() => {
                setIdx(idx + 1);
                setPicked(null);
              }}
              className="mt-8 rounded-full bg-content px-6 py-3 text-[15px] font-medium text-surface"
            >
              {idx + 1 < queue.length ? "Next question →" : "See how you did"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
