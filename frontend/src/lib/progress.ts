"use client";

import { useSyncExternalStore } from "react";

// Per-browser reading progress: which stories were read, quiz answers, daily streak,
// the spaced-repetition schedule that powers /recall, and the daily goal.
// Everything lives in localStorage; /you can export it as a code to move between devices.
const KEY = "brainfeed-progress";
const TZ = "Australia/Brisbane";

export interface Progress {
  read: Record<string, string>; // storyId -> YYYY-MM-DD read
  readAt: Record<string, string>; // storyId -> ISO time read (powers "since you last read")
  quiz: Record<string, boolean>; // storyId -> answered correctly
  days: string[]; // dates (YYYY-MM-DD) with at least one story read
  practice: Record<string, number>; // YYYY-MM-DD -> quiz/review answers that day
  recall: Record<string, RecallCard>; // storyId -> review schedule
}

export interface RecallCard {
  box: number; // Leitner box: 0 = shaky ... 4 = solid
  due: string; // YYYY-MM-DD
}

// Days until the next review, by box. Right answers push a story further out.
const INTERVALS = [1, 3, 7, 14, 30];

/** Daily goal: read this many stories and answer at least one quiz or review question. */
export const GOAL_READS = 3;
export const GOAL_PRACTICE = 1;

const EMPTY: Progress = { read: {}, readAt: {}, quiz: {}, days: [], practice: {}, recall: {} };
const listeners = new Set<() => void>();
let cache: Progress | null = null;

function load(): Progress {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    cache = {
      ...EMPTY,
      ...saved,
      readAt: { ...(saved.readAt ?? {}) },
      practice: { ...(saved.practice ?? {}) },
      recall: { ...(saved.recall ?? {}) },
    };
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

/** Calendar date in Brisbane, so the day (and the streak) turns over at local midnight. */
export const dateKey = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const today = () => dateKey();

function addDays(n: number): string {
  return dateKey(new Date(Date.now() + n * 86_400_000));
}

function schedule(box: number): RecallCard {
  return { box, due: addDays(INTERVALS[box]) };
}

function withPractice(p: Progress): Progress["practice"] {
  const d = today();
  return { ...p.practice, [d]: (p.practice[d] ?? 0) + 1 };
}

export function markRead(id: string) {
  const p = load();
  if (p.read[id]) return;
  const d = today();
  save({
    ...p,
    read: { ...p.read, [id]: d },
    readAt: { ...p.readAt, [id]: new Date().toISOString() },
    days: p.days.includes(d) ? p.days : [...p.days, d].slice(-400),
    recall: p.recall[id] ? p.recall : { ...p.recall, [id]: schedule(0) },
  });
}

export function recordQuiz(id: string, correct: boolean) {
  const p = load();
  if (id in p.quiz) return;
  save({
    ...p,
    quiz: { ...p.quiz, [id]: correct },
    practice: withPractice(p),
    recall: { ...p.recall, [id]: schedule(correct ? 1 : 0) },
  });
}

/** Record a /recall answer and reschedule the story. */
export function reviewRecall(id: string, correct: boolean) {
  const p = load();
  const box = correct ? Math.min((p.recall[id]?.box ?? 0) + 1, INTERVALS.length - 1) : 0;
  save({ ...p, practice: withPractice(p), recall: { ...p.recall, [id]: schedule(box) } });
}

/** Brief and weekly quizzes: first answer counts as the story's quiz, later ones as a review. Misses return tomorrow. */
export function answerPractice(id: string, correct: boolean) {
  if (id in load().quiz) reviewRecall(id, correct);
  else recordQuiz(id, correct);
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
  let t = Date.now();
  // A streak survives until the end of today even if today isn't done yet
  if (!set.has(dateKey(new Date(t)))) t -= 86_400_000;
  let n = 0;
  while (set.has(dateKey(new Date(t)))) {
    n++;
    t -= 86_400_000;
  }
  return n;
}

/** Today's progress towards the daily goal. */
export function goalOf(p: Progress) {
  const d = today();
  const reads = Object.values(p.read).filter((day) => day === d).length;
  const practice = p.practice[d] ?? 0;
  const done = Math.min(reads, GOAL_READS) + Math.min(practice, GOAL_PRACTICE);
  return { reads, practice, done, total: GOAL_READS + GOAL_PRACTICE, met: reads >= GOAL_READS && practice >= GOAL_PRACTICE };
}

// ── Moving progress between devices ──────────────────────────────────────────
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** A copyable code holding all progress. "bf1." codes are gzipped, "bf0." plain (older browsers). */
export async function exportProgress(): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(load()));
  if (typeof CompressionStream !== "undefined") return "bf1." + b64url(await pipe(raw, new CompressionStream("gzip")));
  return "bf0." + b64url(raw);
}

export function progressSnapshot(): Progress {
  return load();
}

/** Merge progress from a code or backup into this browser. Returns how many stories were new here. */
export async function importProgress(input: string): Promise<number> {
  const text = input.trim();
  let incoming: Partial<Progress>;
  if (text.startsWith("{")) incoming = JSON.parse(text);
  else if (text.startsWith("bf1.")) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser can't open compressed codes");
    incoming = JSON.parse(new TextDecoder().decode(await pipe(fromB64url(text.slice(4)), new DecompressionStream("gzip"))));
  } else if (text.startsWith("bf0.")) incoming = JSON.parse(new TextDecoder().decode(fromB64url(text.slice(4))));
  else throw new Error("That doesn't look like a Brainfeed code");

  const p = load();
  const read = { ...p.read };
  let added = 0;
  for (const [id, d] of Object.entries(incoming.read ?? {})) {
    if (!read[id]) added++;
    if (!read[id] || d < read[id]) read[id] = d;
  }
  const recall = { ...p.recall };
  for (const [id, c] of Object.entries(incoming.recall ?? {})) {
    const mine = recall[id];
    if (!mine || c.box > mine.box || (c.box === mine.box && c.due > mine.due)) recall[id] = c;
  }
  const practice = { ...p.practice };
  for (const [d, n] of Object.entries(incoming.practice ?? {})) practice[d] = Math.max(practice[d] ?? 0, n);

  save({
    read,
    readAt: { ...(incoming.readAt ?? {}), ...p.readAt },
    quiz: { ...(incoming.quiz ?? {}), ...p.quiz },
    days: [...new Set([...p.days, ...(incoming.days ?? [])])].sort().slice(-400),
    practice,
    recall,
  });
  return added;
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
