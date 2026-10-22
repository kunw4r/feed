"use client";

import { useSyncExternalStore } from "react";

// Per-browser reading progress: which stories were read, quiz answers, daily streak.
const KEY = "brainfeed-progress";

interface Progress {
  read: Record<string, string>; // storyId -> ISO date read
  quiz: Record<string, boolean>; // storyId -> answered correctly
  days: string[]; // dates (YYYY-MM-DD) with at least one story read
}

const EMPTY: Progress = { read: {}, quiz: {}, days: [] };
const listeners = new Set<() => void>();
let cache: Progress | null = null;

function load(): Progress {
  if (cache) return cache;
  try {
    cache = { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
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

export function markRead(id: string) {
  const p = load();
  if (p.read[id]) return;
  const d = today();
  save({
    ...p,
    read: { ...p.read, [id]: d },
    days: p.days.includes(d) ? p.days : [...p.days, d].slice(-400),
  });
}

export function recordQuiz(id: string, correct: boolean) {
  const p = load();
  if (id in p.quiz) return;
  save({ ...p, quiz: { ...p.quiz, [id]: correct } });
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
