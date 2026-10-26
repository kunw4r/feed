"use client";

import Link from "next/link";
import { CardStory, REGION_CONFIG } from "@/lib/types";
import { useProgress, goalOf, streakOf, dueForReview, GOAL_READS } from "@/lib/progress";

function Ring({ done, total, size = 64 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" className="stroke-edge" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-accent transition-[stroke-dashoffset] duration-1000"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - done / total)}
      />
    </svg>
  );
}

function goalLine(reads: number, practice: number, met: boolean) {
  if (met) return "Goal met. Anything more is a bonus.";
  const left = Math.max(0, GOAL_READS - reads);
  const parts = [left ? `read ${left} more ${left === 1 ? "story" : "stories"}` : "", practice < 1 ? "answer one quiz" : ""].filter(Boolean);
  return parts.join(" and ").replace(/^./, (c) => c.toUpperCase()) + ".";
}

/** Daily goal, streak and what's waiting. `compact` is the slim strip shown on phones and tablets. */
export default function GlancePanel({ stories, compact }: { stories: CardStory[]; compact?: boolean }) {
  const progress = useProgress();
  const goal = goalOf(progress);
  const streak = streakOf(progress.days);
  const due = dueForReview(progress).length;
  const weekday = new Date().toLocaleDateString("en-AU", { weekday: "long", timeZone: "Australia/Brisbane" });
  const recapDay = weekday === "Sunday" || weekday === "Monday";

  if (compact) {
    return (
      <Link href="/you" className="flex items-center gap-4 rounded-2xl border border-edge bg-surface-raised px-4 py-3">
        <Ring done={goal.done} total={goal.total} size={40} />
        <span className="min-w-0 text-[13px] leading-snug">
          <span className="block text-content">
            {goal.met ? "Today's goal: done" : `Today's goal: ${goal.done}/${goal.total}`}
            {streak > 0 && <span className="text-content-faint"> · {streak}-day streak</span>}
          </span>
          <span className="block text-content-faint">{goalLine(goal.reads, goal.practice, goal.met)}</span>
        </span>
      </Link>
    );
  }

  const counts = Object.keys(REGION_CONFIG)
    .map((code) => ({ code, n: stories.filter((s) => s.region_code === code).length, unread: stories.filter((s) => s.region_code === code && !progress.read[s.id]).length }))
    .filter((r) => r.n > 0);

  return (
    <aside aria-label="Today at a glance" className="space-y-8">
      <div>
        <p className="smallcaps text-[12px] text-content-subtle">Today at a glance</p>
        <div className="mt-4 flex items-center gap-4">
          <Ring done={goal.done} total={goal.total} />
          <div>
            <p className="font-display text-[1.35rem] leading-tight text-content">
              {goal.met ? "Goal met" : `${goal.done} of ${goal.total}`}
              {streak > 0 && <span className="text-content-faint text-[1rem]"> · {streak}-day streak</span>}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-content-faint">{goalLine(goal.reads, goal.practice, goal.met)}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-edge border-y border-edge text-[14px]">
        <Link href="/brief" className="group flex items-center justify-between py-3 text-content-dim hover:text-content">
          <span>Brief me, then a quick quiz</span>
          <span className="text-accent transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
        <Link href="/recall" className="group flex items-center justify-between py-3 text-content-dim hover:text-content">
          <span>Review</span>
          <span className="text-content-faint">{due > 0 ? <span className="rounded-full bg-accent-bold px-2 text-[11px] font-semibold text-white">{due} due</span> : "all caught up"}</span>
        </Link>
        <Link href="/weekly" className="group flex items-center justify-between py-3 text-content-dim hover:text-content">
          <span>Weekly recap</span>
          <span className={recapDay ? "text-accent text-[12px]" : "text-content-faint text-[12px]"}>{recapDay ? "ready" : "10 questions"}</span>
        </Link>
      </div>

      <div>
        <p className="smallcaps text-[12px] text-content-subtle mb-3">By region</p>
        <ul className="space-y-1.5 text-[14px]">
          {counts.map((r) => (
            <li key={r.code}>
              <a href={`#${r.code}`} className="flex items-baseline justify-between gap-3 text-content-dim hover:text-content">
                <span>{REGION_CONFIG[r.code].label}</span>
                <span className="tabular-nums text-content-faint text-[13px]">
                  {r.unread < r.n ? `${r.unread} of ${r.n} left` : r.n}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
