"use client";

import { useState } from "react";
import Link from "next/link";
import { QuizItem } from "@/lib/types";
import PageHeader from "./PageHeader";
import QuizRunner from "./QuizRunner";

export default function WeeklyRecap({ items, storyCount }: { items: QuizItem[]; storyCount: number }) {
  const [started, setStarted] = useState(false);

  return (
    <div className="max-w-3xl px-4 md:px-10 pb-24">
      {started ? (
        <div className="pt-10 md:pt-16">
          <p className="smallcaps text-[13px] text-content-faint mb-6">Weekly recap</p>
          <QuizRunner items={items} />
        </div>
      ) : (
        <>
          <PageHeader
            kicker="Weekly recap"
            title={<>The week in <span className="italic text-accent">ten questions</span></>}
            standfirst={`One question per big story from the last seven days (${storyCount} stories in all). Misses join your review so they stick.`}
          />
          {items.length > 0 ? (
            <div className="rise">
              <button onClick={() => setStarted(true)} className="rounded-full bg-content px-6 py-3 text-[15px] font-medium text-surface">
                Start the recap →
              </button>
              <p className="mt-4 text-[13px] text-content-faint">About {Math.max(2, Math.round(items.length * 0.4))} minutes.</p>
            </div>
          ) : (
            <div className="rise md:grid md:grid-cols-[1fr_360px] md:gap-12">
              <div>
                <p className="font-display text-[1.9rem] leading-tight text-content">The week is still filling up.</p>
                <p className="mt-3 font-read text-[1.08rem] leading-[1.6] text-content-dim">
                  Every Friday-scale stretch of editions becomes a ten-question recap: one question per big
                  story, drawn from the last seven days. Misses join your review, so anything you slip on
                  comes back until it sticks.
                </p>
                <p className="mt-3 font-read text-[1.08rem] leading-[1.6] text-content-dim">
                  {storyCount > 0
                    ? `${storyCount} ${storyCount === 1 ? "story is" : "stories are"} in this week so far — the first questions appear once they carry quizzes.`
                    : "Read today's edition and the week starts collecting itself."}
                </p>
                <Link href="/" className="mt-8 inline-block rounded-full bg-content px-6 py-3 text-[15px] font-medium text-surface">
                  Today&apos;s edition →
                </Link>
              </div>
              <aside className="mt-10 md:mt-0" aria-label="Example recap question">
                <p className="smallcaps text-[12px] text-content-faint">A recap question looks like this</p>
                <div className="mt-3 rounded-[20px] border border-edge bg-surface-raised p-5" style={{ boxShadow: "var(--t-shadow-card)" }}>
                  <p className="font-display text-[1.15rem] leading-snug text-content">
                    Why did markets move after the rate decision — and who was caught out?
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-edge pt-4 text-[13.5px] leading-snug text-content-faint">
                    <li className="flex items-baseline gap-2.5"><span className="font-display italic">a</span>Central banks cut, and savers felt it first</li>
                    <li className="flex items-baseline gap-2.5"><span className="font-display italic">b</span>The move was priced in days earlier</li>
                    <li className="flex items-baseline gap-2.5"><span className="font-display italic">c</span>Neither — the story was about shipping</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
