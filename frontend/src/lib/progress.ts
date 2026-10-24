"use client";

import { useSyncExternalStore } from "react";

// Per-browser reading progress: which stories were read, quiz answers, daily streak,
// and the spaced-repetition schedule that powers /recall.
const KEY = "brainfeed-progress";

interface Progress {
  read: Record<string, string>; // storyId -> ISO date read
  quiz: Record<string, boolean>; // storyId -> answered correctly
  days: string[]; // dates (YYYY-MM-DD) with at least one story read
  recall: Record<string, RecallCard>; // storyId -> review schedule
}

export interface RecallCard {
  box: number; // Leitner box: 0 = shaky ... 4 = solid
  due: string; // YYYY-MM-DD
}

// Days until the next review, by box. Right answers push a story further out.
const INTERVALS = [1, 3, 7, 14, 30];

const EMPTY: Progress = { read: {}, quiz: {}, days: [], recall: {} };
const listeners = new Set<() => void>();
let cache: Progress | null = null;

function load(): Progress {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    cache = { ...EMPTY, ...saved, recall: { ...(saved.recall ?? {}) } };
    // Stories read before /recall existed join the schedule as due now
    for (const id of Object.keys(cache!.read)) cache!.recall[id] ??= { box: 0, due: cache!.read[id] };
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

function save(next: Progress) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked — progress lives for this session only
  }
  listeners.forEach((l) => l());
}

const today = () => new Date().toLocaleDateString("en-CA");

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

function schedule(box: number): RecallCard {
  return { box, due: addDays(INTERVALS[box]) };
}

export function markRead(id: string) {
  const p = load();
  if (p.read[id]) return;
  const d = today();
  save({
    ...p,
    read: { ...p.read, [id]: d },
    days: p.days.includes(d) ? p.days : [...p.days, d].slice(-400),
    recall: p.recall[id] ? p.recall : { ...p.recall, [id]: schedule(0) },
  });
}

export function recordQuiz(id: string, correct: boolean) {
  const p = load();
  if (id in p.quiz) return;
  save({ ...p, quiz: { ...p.quiz, [id]: correct }, recall: { ...p.recall, [id]: schedule(correct ? 1 : 0) } });
}

/** Record a /recall answer and reschedule the story. */
export function reviewRecall(id: string, correct: boolean) {
  const p = load();
  const box = correct ? Math.min((p.recall[id]?.box ?? 0) + 1, INTERVALS.length - 1) : 0;
  save({ ...p, recall: { ...p.recall, [id]: schedule(box) } });
}

/** Drop schedules for stories that have left the archive (they can't be asked any more). */
export function pruneRecall(known: Set<string>) {
  const p = load();
  const kept = Object.fromEntries(Object.entries(p.recall).filter(([id]) => known.has(id)));
  if (Object.keys(kept).length !== Object.keys(p.recall).length) save({ ...p, recall: kept });
}

/** Story ids whose review is due today or earlier, most overdue first. */
export function dueForReview(p: Progress): string[] {
  const t = today();
  return Object.entries(p.recall)
    .filter(([, c]) => c.due <= t)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}

export function streakOf(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  // A streak survives until the end of today even if today isn't done yet
  if (!set.has(d.toLocaleDateString("en-CA"))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toLocaleDateString("en-CA"))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => EMPTY,
  );
}
