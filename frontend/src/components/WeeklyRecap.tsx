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
            <p className="font-read text-content-faint">
              Not enough stories this week yet. <Link href="/" className="text-accent underline underline-offset-4">Today&apos;s edition →</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
