"use client";

import { useState } from "react";
import Link from "next/link";
import { QuizItem } from "@/lib/types";
import { answerPractice } from "@/lib/progress";

// A short run of questions from different stories (end-of-brief quiz, weekly recap).
// Answers feed the same review schedule as /recall, so misses come back tomorrow.
export default function QuizRunner({
  items,
  onDone,
  doneLabel = "Back to the edition",
  dark,
}: {
  items: QuizItem[];
  onDone?: () => void;
  doneLabel?: string;
  /** Brief deck uses a fixed dark palette rather than the theme tokens */
  dark?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const c = dark
    ? { text: "text-[#f3ede4]", dim: "text-white/70", faint: "text-white/50", edge: "border-white/15", bar: "bg-white/15", btn: "bg-[#f3ede4] text-[#0b0a09]", accent: "text-[#ff7a4d]", fill: "bg-[#ff7a4d]" }
    : { text: "text-content", dim: "text-content-dim", faint: "text-content-faint", edge: "border-edge", bar: "bg-edge", btn: "bg-content text-surface", accent: "text-accent", fill: "bg-accent" };

  const item = items[idx];

  if (!item) {
    return (
      <div className="rise">
        <p className={`font-display italic text-[22px] ${c.accent}`}>Done.</p>
        <p className={`font-display mt-3 text-[2.6rem] md:text-[3.6rem] leading-none ${c.text}`}>
          {score} of {items.length} right.
        </p>
        <p className={`font-read mt-5 max-w-lg text-[1.15rem] ${c.dim}`}>
          {score === items.length ? "Clean sweep. Those stories are pushed further out in your review." : "The ones you missed join tomorrow's review so they stick."}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6 text-[14px]">
          {onDone ? (
            <button onClick={onDone} className={`rounded-full px-5 py-2.5 font-medium ${c.btn}`}>{doneLabel}</button>
          ) : (
            <Link href="/" className={`rounded-full px-5 py-2.5 font-medium ${c.btn}`}>{doneLabel}</Link>
          )}
          <Link href="/recall" className={`${c.dim} hover:underline underline-offset-4`}>Open review →</Link>
        </div>
      </div>
    );
  }

  const { quiz } = item;
  const answered = picked !== null;
  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const right = i === quiz.answer_index;
    if (right) setScore((s) => s + 1);
    answerPractice(item.id, right);
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className={`h-[2px] flex-1 ${c.bar}`}>
          <div className={`h-full ${c.fill} transition-all duration-700`} style={{ width: `${(idx / items.length) * 100}%` }} />
        </div>
        <span className={`font-display italic text-[15px] tabular-nums ${c.faint}`}>
          {idx + 1} / {items.length}
        </span>
      </div>

      <div key={item.id} className="animate-in">
        <Link prefetch={false} href={`/story/${item.id}`} className={`block font-read italic text-[1rem] ${c.faint} hover:underline underline-offset-4`}>
          {item.title}
        </Link>
        <p className={`font-display mt-4 text-[1.6rem] md:text-[2.1rem] leading-[1.2] font-medium text-pretty ${c.text}`}>{quiz.question}</p>

        <ol className={`mt-7 border-t ${c.edge}`}>
          {quiz.options.map((opt, i) => {
            const isAnswer = i === quiz.answer_index;
            const tone = !answered ? `${c.text} hover:pl-3` : isAnswer ? `${c.text} pl-3` : i === picked ? `${c.faint} line-through decoration-red-400/70` : c.faint;
            return (
              <li key={i} className={`border-b ${c.edge}`}>
                <button onClick={() => choose(i)} disabled={answered} className={`group flex w-full items-baseline gap-5 py-4 text-left transition-all duration-500 ${tone}`}>
                  <span className={`font-display italic text-[17px] w-5 ${answered && isAnswer ? c.accent : c.faint}`}>
                    {answered && isAnswer ? "✓" : String.fromCharCode(97 + i)}
                  </span>
                  <span className="font-read text-[1.1rem] leading-snug">{opt}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="unfold" data-open={answered} inert={!answered}>
          <div>
            {answered && (
              <p className={`pt-6 font-read text-[1.08rem] leading-relaxed ${c.dim}`}>
                <span className={`font-display italic ${c.text}`}>{picked === quiz.answer_index ? "Right. " : "Not quite. "}</span>
                {quiz.explanation}
              </p>
            )}
            <button
              onClick={() => {
                setIdx(idx + 1);
                setPicked(null);
              }}
              className={`mt-7 rounded-full px-6 py-3 text-[15px] font-medium ${c.btn}`}
            >
              {idx + 1 < items.length ? "Next question →" : "See how you did"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
