"use client";

import { useMemo, useState } from "react";
import { Reveal } from "@/components/motion";

interface TimelineItem {
  date: string;
  event: string;
}

const yearOf = (d: string) => {
  const m = d.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
};

/**
 * Interactive timeline: a draggable/arrow-key scrubber with per-event ticks on
 * desktop (the active event shows as a card above the track), a plain vertical
 * rail on small screens. The scrubber is a native range input, so keyboard and
 * touch behaviour come for free.
 */
export default function TimelineScrubber({ items }: { items: TimelineItem[] }) {
  const [idx, setIdx] = useState(0);
  const n = items.length;
  const pct = n > 1 ? (idx / (n - 1)) * 100 : 0;

  // With many events, label only every stride-th tick so years never collide
  const stride = Math.max(1, Math.ceil(n / 7));

  const span = useMemo(() => {
    const years = items.map((t) => yearOf(t.date)).filter((y): y is number => y !== null);
    if (!years.length) return null;
    return `${Math.min(...years)}–${Math.max(...years)}`;
  }, [items]);

  if (n === 0) return null;

  if (n < 3) {
    // A scrubber needs room to move; two events read better as a simple list
    return (
      <ol className="space-y-5">
        {items.map((t, i) => (
          <Reveal as="li" key={i} className="grid grid-cols-[5.5rem_1fr] gap-4">
            <span className="font-display text-[1.05rem] text-accent tabular-nums">{t.date}</span>
            <span className="font-read text-[1.05rem] leading-snug text-content-dim">{t.event}</span>
          </Reveal>
        ))}
      </ol>
    );
  }

  const active = items[idx];

  return (
    <div>
      {/* ── Mobile: vertical rail ── */}
      <ol className="relative lg:hidden">
        <span className="absolute left-[5px] top-2 bottom-2 w-px bg-edge" aria-hidden />
        {items.map((t, i) => (
          <Reveal as="li" key={i} className="relative pl-8 pb-7 last:pb-0">
            <span className="absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 border-accent bg-surface" aria-hidden />
            <p className="font-display text-[1.05rem] text-accent tabular-nums">{t.date}</p>
            <p className="mt-1 font-read text-[1.05rem] leading-[1.55] text-content-dim">{t.event}</p>
          </Reveal>
        ))}
      </ol>

      {/* ── Desktop: scrubber ── */}
      <div className="hidden lg:block">
        <div className="relative min-h-[132px] rounded-2xl border border-edge bg-surface-raised px-7 py-6 card-depth" style={{ boxShadow: "var(--t-shadow-card)" }}>
          <p key={`d${idx}`} className="animate-in font-display text-[1.35rem] leading-none text-accent tabular-nums">
            {active.date}
            <span className="ml-3 align-middle smallcaps text-[12px] text-content-faint">event {idx + 1} of {n}</span>
          </p>
          <p key={`e${idx}`} className="animate-in mt-3 font-read text-[1.18rem] leading-[1.6] text-content text-pretty">
            {active.event}
          </p>
        </div>

        <div className="relative mt-8 px-1">
          {/* Ticks */}
          <div className="pointer-events-none absolute inset-x-1 top-[15px] h-4" aria-hidden>
            {items.map((t, i) => {
              const left = n > 1 ? (i / (n - 1)) * 100 : 0;
              const on = i === idx;
              return (
                <span
                  key={i}
                  className={`absolute top-0 w-px -translate-x-1/2 transition-all duration-300 ${on ? "h-4 bg-accent" : "h-2.5 bg-edge"}`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={0}
            max={n - 1}
            step={1}
            value={idx}
            onChange={(e) => setIdx(parseInt(e.target.value, 10))}
            className="scrub relative z-10"
            aria-label="Scrub through the timeline"
            aria-valuetext={`${active.date}: ${active.event.slice(0, 80)}`}
            style={{ ["--fill" as string]: `${pct}%` }}
          />
          {/* Clickable year labels under every stride-th tick */}
          <div className="relative mt-1 h-5" aria-hidden>
            {items.map((t, i) => {
              if (i % stride !== 0 && i !== n - 1) return null;
              const y = yearOf(t.date);
              const left = n > 1 ? (i / (n - 1)) * 100 : 0;
              return (
                <span
                  key={i}
                  className={`absolute -translate-x-1/2 text-[11px] tabular-nums transition-colors ${i === idx ? "text-accent" : "text-content-faint"}`}
                  style={{ left: `${left}%` }}
                >
                  {y ?? t.date}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            aria-label="Previous event"
            className="rounded-full border border-edge px-3 py-1.5 text-[13px] text-content-dim transition-colors hover:border-edge-accent hover:text-content disabled:opacity-30 disabled:hover:border-edge"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(n - 1, i + 1))}
            disabled={idx === n - 1}
            aria-label="Next event"
            className="rounded-full border border-edge px-3 py-1.5 text-[13px] text-content-dim transition-colors hover:border-edge-accent hover:text-content disabled:opacity-30 disabled:hover:border-edge"
          >
            →
          </button>
          <p className="text-[12px] text-content-faint">
            Drag the marker, click a tick, or use the arrow keys{span ? <> · events span {span}</> : null}
          </p>
        </div>
      </div>
    </div>
  );
}
