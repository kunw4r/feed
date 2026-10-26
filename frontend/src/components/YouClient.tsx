"use client";

import { useState } from "react";
import { useProgress, streakOf, goalOf, exportProgress, importProgress, progressSnapshot, dueForReview } from "@/lib/progress";
import PageHeader from "./PageHeader";

export default function YouClient() {
  const progress = useProgress();
  const [code, setCode] = useState("");
  const [incoming, setIncoming] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const streak = streakOf(progress.days);
  const goal = goalOf(progress);
  const answered = Object.keys(progress.quiz).length;
  const right = Object.values(progress.quiz).filter(Boolean).length;

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
    { n: streak, label: streak === 1 ? "day streak" : "day streak" },
    { n: Object.keys(progress.read).length, label: "stories read" },
    { n: answered ? `${Math.round((right / answered) * 100)}%` : "–", label: "quiz accuracy" },
    { n: dueForReview(progress).length, label: "due for review" },
  ];

  return (
    <div className="max-w-3xl px-4 md:px-10 pb-24">
      <PageHeader kicker="You" title="Your progress" standfirst="Kept in this browser only. Move it to another device with a code; nothing is sent anywhere." />

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-edge bg-edge">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface p-5">
            <dt className="text-[12px] text-content-faint">{s.label}</dt>
            <dd className="font-display mt-1 text-[2rem] leading-none text-content tabular-nums">{s.n}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[14px] text-content-dim">
        Today: {goal.reads}/3 stories read, {Math.min(goal.practice, 1)}/1 quiz or review {goal.met && <span className="text-accent">· goal met</span>}
      </p>

      <section className="mt-14">
        <h2 className="font-display text-[1.7rem] text-content">Move to another device</h2>
        <p className="font-read mt-2 text-[1.05rem] text-content-dim">Make a code here, then paste it below on the other device. Progress is merged, never overwritten.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={makeCode} className="rounded-full bg-content px-5 py-2.5 text-[14px] font-medium text-surface">Make my code</button>
          <button onClick={download} className="rounded-full border border-edge px-5 py-2.5 text-[14px] text-content-dim hover:text-content hover:border-content-faint transition-colors">
            Download backup
          </button>
        </div>
        {code && (
          <div className="mt-5">
            <textarea readOnly value={code} rows={3} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-edge bg-surface-inset p-3 font-mono text-[12px] text-content-dim break-all" />
            <button onClick={copy} className="mt-2 text-[14px] text-accent underline underline-offset-4">Copy code</button>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-[1.7rem] text-content">Bring progress in</h2>
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
      </section>

      {status && (
        <p role="status" className="mt-8 rounded-xl border border-edge bg-surface-raised px-4 py-3 text-[14px] text-content">
          {status}
        </p>
      )}
    </div>
  );
}
