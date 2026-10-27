"use client";

import { useEffect, useMemo, useState } from "react";
import { useProgress, streakOf, goalOf, exportProgress, importProgress, progressSnapshot, dueForReview, dateKey, GOAL_READS, GOAL_PRACTICE } from "@/lib/progress";
import { CATEGORY_CONFIG, REGION_CONFIG, Category } from "@/lib/types";
import PageHeader from "./PageHeader";

const DAY = 86_400_000;
const WEEKS = 12; // heatmap span

// ── Date helpers (pure calendar math on Brisbane date strings, viewer-timezone independent) ──
const parts = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const weekdayOf = (dateStr: string) => parts(dateStr).getUTCDay(); // 0 Sun … 6 Sat
const shortDay = (dateStr: string) =>
  parts(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const mondayOf = (dateStr: string) => {
  const d = parts(dateStr);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

interface SearchEntry { id: string; k: Category; r: string | null; d: string }

/** 12-week reading heatmap, one column per week (Monday start), Brisbane days. */
function Heatmap({ readByDay, now }: { readByDay: Record<string, number>; now: number }) {
  const days: { date: string; count: number }[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const date = dateKey(new Date(now - i * DAY));
    days.push({ date, count: readByDay[date] ?? 0 });
  }
  // Pad the first column back to Monday so weekday rows line up
  const pad = (weekdayOf(days[0].date) + 6) % 7;
  const cells: ({ date: string; count: number } | null)[] = [...Array.from({ length: pad }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const columns: ({ date: string; count: number } | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  const level = (n: number) => (n >= 4 ? 4 : n);
  const fill = ["var(--t-edge)", "color-mix(in srgb, var(--t-accent) 30%, var(--t-surface))", "color-mix(in srgb, var(--t-accent) 55%, var(--t-surface))", "color-mix(in srgb, var(--t-accent) 78%, var(--t-surface))", "var(--t-accent)"];

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex">
        <div className="mr-1.5 text-[10px] leading-[14px] text-content-faint">
          <p className="h-[14px]">Mon</p>
          <p className="h-[20px]" />
          <p className="h-[14px]">Wed</p>
          <p className="h-[20px]" />
          <p className="h-[14px]">Fri</p>
        </div>
        <div>
          <div className="mb-1 flex gap-[3px]">
            {columns.map((col, ci) => {
              const first = col.find((c) => c);
              const prevFirst = ci > 0 ? columns[ci - 1].find((c) => c) : null;
              const month = first ? parts(first.date).toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }) : "";
              const prevMonth = prevFirst ? parts(prevFirst.date).toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }) : "";
              return (
                <p key={ci} className="relative h-3 w-[14px] text-[10px] leading-3 text-content-faint">
                  {month !== prevMonth && <span className="absolute left-0 whitespace-nowrap">{month}</span>}
                </p>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {columns.map((col, ci) => (
              <div key={ci} className="flex w-[14px] flex-col gap-[3px]">
                {col.map((cell, ri) =>
                  cell ? (
                    <div
                      key={ri}
                      title={cell.count > 0 ? `${cell.count} ${cell.count === 1 ? "story" : "stories"} on ${shortDay(cell.date)}` : shortDay(cell.date)}
                      className="h-[14px] w-[14px] rounded-[3px]"
                      style={{ backgroundColor: fill[level(cell.count)] }}
                    />
                  ) : (
                    <div key={ri} className="h-[14px] w-[14px] rounded-[3px] opacity-0" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1.5 pb-1 text-[11px] text-content-faint">
        Less
        {fill.map((f, i) => (
          <span key={i} className="h-[12px] w-[12px] rounded-[3px]" style={{ backgroundColor: f }} />
        ))}
        More
        <span className="ml-1 hidden sm:inline">· each square is a day</span>
      </p>
    </div>
  );
}

/** Labelled horizontal bars, tallest value = full width. */
function CoverageBars({ rows, unit }: { rows: { label: string; count: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[130px_1fr_2rem] items-center gap-3 text-[13px]">
          <span className="truncate text-content-dim" title={r.label}>{r.label}</span>
          <span className="h-[7px] overflow-hidden rounded-full bg-edge">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-700"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums text-content-faint">
            {r.count} <span className="sr-only">{unit}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Quiz accuracy per week, bucketed by the week each story was published. */
function AccuracyTrend({ buckets }: { buckets: { label: string; total: number; right: number }[] }) {
  return (
    <div className="flex items-end gap-4 sm:gap-6">
      {buckets.map((b) => {
        const pct = b.total ? Math.round((b.right / b.total) * 100) : null;
        return (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
            <p className="text-[12px] tabular-nums text-content-dim">{pct === null ? "—" : `${pct}%`}</p>
            <div className="flex h-24 w-full items-end rounded-lg bg-surface-inset px-2" title={b.total ? `${b.right} of ${b.total} right` : "No quizzes yet"}>
              <div
                className="w-full rounded-md bg-accent/80 transition-[height] duration-700"
                style={{ height: pct === null ? 0 : `${Math.max(pct, 6)}%` }}
              />
            </div>
            <p className="text-[11px] text-content-faint">{b.label}</p>
          </div>
        );
      })}
    </div>
  );
}

const MILESTONES = [
  { key: "read-1", label: "First story", desc: "Read your first story", test: (m: Metrics) => m.reads >= 1 },
  { key: "streak-3", label: "Hat-trick", desc: "Read on 3 days in a row", test: (m: Metrics) => m.streak >= 3 },
  { key: "quiz-1", label: "First answer", desc: "Answer your first quiz", test: (m: Metrics) => m.answered >= 1 },
  { key: "read-25", label: "25 stories", desc: "Get through 25 stories", test: (m: Metrics) => m.reads >= 25 },
  { key: "streak-7", label: "Full week", desc: "A 7-day reading streak", test: (m: Metrics) => m.streak >= 7 },
  { key: "sharp", label: "Sharp shooter", desc: "90% accuracy over 10+ quizzes", test: (m: Metrics) => m.answered >= 10 && m.accuracy >= 0.9 },
  { key: "memory-5", label: "In it for the long run", desc: "Push 5 stories into long-term review", test: (m: Metrics) => m.solid >= 5 },
  { key: "read-100", label: "Centurion", desc: "Read 100 stories", test: (m: Metrics) => m.reads >= 100 },
];

interface Metrics { reads: number; streak: number; answered: number; accuracy: number; solid: number }

export default function YouClient() {
  const progress = useProgress();
  const [code, setCode] = useState("");
  const [incoming, setIncoming] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [indexMap, setIndexMap] = useState<Map<string, SearchEntry> | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";
    fetch(`${base}/search/index.json`)
      .then((r) => r.json())
      .then((entries: SearchEntry[]) => setIndexMap(new Map(entries.map((e) => [e.id, e]))))
      .catch(() => setIndexMap(new Map()));
  }, []);

  // Stories read per Brisbane day, for the heatmap
  const readByDay = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const d of Object.values(progress.read)) byDay[d] = (byDay[d] ?? 0) + 1;
    return byDay;
  }, [progress.read]);

  const streak = streakOf(progress.days);
  const answered = Object.keys(progress.quiz).length;
  const right = Object.values(progress.quiz).filter(Boolean).length;
  const accuracy = answered ? right / answered : 0;
  const solid = Object.values(progress.recall).filter((c) => c.box >= 3).length;

  // Coverage of everything you've read, by region and topic (story metadata from the search index)
  const readIds = useMemo(() => Object.keys(progress.read), [progress.read]);
  const regionRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of readIds) {
      const r = indexMap?.get(id)?.r;
      if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Object.entries(REGION_CONFIG)
      .map(([code, cfg]) => ({ label: cfg.label, count: counts.get(code) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [readIds, indexMap]);
  const topicRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of readIds) {
      const k = indexMap?.get(id)?.k;
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Object.entries(CATEGORY_CONFIG)
      .filter(([code]) => code !== "UNCATEGORISED")
      .map(([code, cfg]) => ({ label: cfg.label, count: counts.get(code) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [readIds, indexMap]);

  // Accuracy by the week stories ran, so the trend moves as editions age
  const buckets = useMemo(() => {
    if (mounted === false) return [];
    const starts: string[] = [];
    const thisMonday = mondayOf(dateKey(new Date()));
    for (let i = 4; i >= 0; i--) starts.push(dateKey(new Date(new Date(thisMonday + "T12:00:00+10:00").getTime() - i * 7 * DAY)));
    const acc = starts.map((s) => ({ label: shortDay(s), total: 0, right: 0 }));
    for (const [id, ok] of Object.entries(progress.quiz)) {
      const d = indexMap?.get(id)?.d;
      if (!d) continue;
      const w = mondayOf(d.slice(0, 10));
      const bi = starts.indexOf(w);
      if (bi >= 0) {
        acc[bi].total++;
        if (ok) acc[bi].right++;
      }
    }
    return acc;
  }, [progress.quiz, indexMap, mounted]);

  const metrics: Metrics = { reads: readIds.length, streak, answered, accuracy, solid };

  const makeCode = async () => {
    setCode(await exportProgress());
    setStatus(null);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied. Paste it into Brainfeed on your other device.");
    } catch {
      setStatus("Couldn't copy automatically. Select the code and copy it.");
    }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(progressSnapshot(), null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `brainfeed-progress-${new Date().toLocaleDateString("en-CA")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (text: string) => {
    try {
      const added = await importProgress(text);
      setIncoming("");
      setStatus(`Merged. ${added} ${added === 1 ? "story" : "stories"} added from the other device; nothing here was lost.`);
    } catch (ex) {
      setStatus(ex instanceof Error ? ex.message : "That code didn't work.");
    }
  };

  const stats = [
    { n: streak, label: "day streak" },
    { n: readIds.length, label: "stories read" },
    { n: answered ? `${Math.round(accuracy * 100)}%` : "–", label: "quiz accuracy" },
    { n: dueForReview(progress).length, label: "due for review" },
  ];
  const goal = goalOf(progress);
  const hasData = readIds.length > 0 || answered > 0;

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-24 md:px-10">
      <PageHeader kicker="You" title="Your progress" standfirst="Everything here lives in this browser only — nothing is sent anywhere. Move it between devices with a code below." />

      {/* ── Stat strip ── */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-edge bg-edge md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-5">
            <dt className="text-[12px] text-content-faint">{s.label}</dt>
            <dd className="font-display mt-1 text-[2rem] leading-none text-content tabular-nums">{s.n}</dd>
          </div>
        ))}
      </dl>
      {mounted && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-content-dim">
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: goal.total }, (_, i) => (
              <span key={i} className={`h-[7px] w-5 rounded-full ${i < goal.done ? "bg-accent" : "bg-edge"}`} />
            ))}
          </span>
          Today: {goal.reads}/{GOAL_READS} stories read, {Math.min(goal.practice, 1)}/{GOAL_PRACTICE} quiz or review
          {goal.met && <span className="text-accent">· goal met</span>}
        </p>
      )}

      {/* ── Streak heatmap ── */}
      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[1.7rem] text-content">Reading days</h2>
          <p className="text-[12px] text-content-faint">{hasData ? "the last 12 weeks" : "a preview — it fills in as you read"}</p>
        </div>
        <div className="rounded-[20px] border border-edge bg-surface-raised p-5 md:p-6" style={{ boxShadow: "var(--t-shadow-card)" }}>
          {mounted ? <Heatmap readByDay={readByDay} now={Date.now()} /> : <div className="h-[128px]" aria-hidden />}
          {!hasData && (
            <p className="mt-3 text-[13px] text-content-dim">
              Read a story and today&apos;s square warms up. Three reads plus one quiz meets the daily goal.
            </p>
          )}
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[1.7rem] text-content">What you cover</h2>
          <p className="text-[12px] text-content-faint">{hasData ? "stories read, by region and topic" : "a preview — bars grow as you read"}</p>
        </div>
        <div className="grid gap-x-10 gap-y-8 rounded-[20px] border border-edge bg-surface-raised p-5 md:grid-cols-2 md:p-6" style={{ boxShadow: "var(--t-shadow-card)" }}>
          <div>
            <p className="smallcaps mb-4 text-[12px] text-content-subtle">Regions</p>
            <CoverageBars rows={regionRows} unit="stories" />
          </div>
          <div>
            <p className="smallcaps mb-4 text-[12px] text-content-subtle">Topics</p>
            <CoverageBars rows={topicRows} unit="stories" />
          </div>
        </div>
      </section>

      {/* ── Accuracy trend ── */}
      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[1.7rem] text-content">Quiz accuracy</h2>
          <p className="text-[12px] text-content-faint">by the week each story ran</p>
        </div>
        <div className="rounded-[20px] border border-edge bg-surface-raised p-5 md:p-6" style={{ boxShadow: "var(--t-shadow-card)" }}>
          {buckets.length > 0 ? <AccuracyTrend buckets={buckets} /> : <div className="h-24" aria-hidden />}
          {answered === 0 && (
            <p className="mt-3 text-[13px] text-content-dim">Answer a quick check after any story and your trend starts here.</p>
          )}
        </div>
      </section>

      {/* ── Milestones ── */}
      <section className="mt-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[1.7rem] text-content">Milestones</h2>
          <p className="text-[12px] text-content-faint">{MILESTONES.filter((m) => m.test(metrics)).length} of {MILESTONES.length} reached</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MILESTONES.map((m) => {
            const got = m.test(metrics);
            return (
              <li
                key={m.key}
                className={`rounded-[16px] border p-4 transition-colors ${
                  got ? "border-accent/40 bg-accent-soft" : "border-edge bg-surface-raised"
                }`}
              >
                <p className={`font-display text-[1.05rem] ${got ? "text-content" : "text-content-faint"}`}>
                  {got && <span className="mr-1.5 text-accent">✓</span>}
                  {m.label}
                </p>
                <p className={`mt-1 text-[12.5px] leading-snug ${got ? "text-content-dim" : "text-content-faint"}`}>{m.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Move between devices ── */}
      <section className="mt-14">
        <div className="grid gap-8 rounded-[20px] border border-edge bg-surface-raised p-6 md:grid-cols-2 md:p-8" style={{ boxShadow: "var(--t-shadow-card)" }}>
          <div>
            <h2 className="font-display text-[1.5rem] text-content">Take your progress with you</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-content-dim">
              Make a code here, then paste it into Brainfeed on the other device. Progress is merged, never overwritten.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={makeCode} className="rounded-full bg-content px-5 py-2.5 text-[14px] font-medium text-surface">Make my code</button>
              <button onClick={download} className="rounded-full border border-edge px-5 py-2.5 text-[14px] text-content-dim hover:text-content hover:border-content-faint transition-colors">
                Download backup
              </button>
            </div>
            {code && (
              <div className="mt-4">
                <textarea readOnly value={code} rows={3} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-edge bg-surface-inset p-3 font-mono text-[12px] text-content-dim break-all" />
                <button onClick={copy} className="mt-2 text-[14px] text-accent underline underline-offset-4">Copy code</button>
              </div>
            )}
          </div>
          <div className="md:border-l md:border-edge md:pl-8">
            <h2 className="font-display text-[1.5rem] text-content">Bring progress in</h2>
            <textarea
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              rows={3}
              placeholder="Paste a code starting with bf1. or bf0."
              className="mt-4 w-full rounded-xl border border-edge bg-surface-inset p-3 font-mono text-[12px] text-content placeholder:text-content-subtle focus:border-accent focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button disabled={!incoming.trim()} onClick={() => restore(incoming)} className="rounded-full bg-content px-5 py-2.5 text-[14px] font-medium text-surface disabled:opacity-40">
                Merge progress
              </button>
              <label className="cursor-pointer text-[14px] text-content-dim hover:text-content">
                or restore a backup file
                <input type="file" accept="application/json,.json" className="sr-only" onChange={async (e) => e.target.files?.[0] && restore(await e.target.files[0].text())} />
              </label>
            </div>
          </div>
        </div>
      </section>

      {status && (
        <p role="status" className="mt-8 rounded-xl border border-edge bg-surface-raised px-4 py-3 text-[14px] text-content">
          {status}
        </p>
      )}
    </div>
  );
}
