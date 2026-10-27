"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CardStory } from "@/lib/types";

/**
 * Slim "Developing" strip under the masthead: headlines from stories that keep
 * growing (a thread_size above 1 means later editions added follow-ups). The
 * marquee pauses on hover/focus and becomes a plain scrollable row under
 * prefers-reduced-motion (see globals.css).
 */
export default function DevelopingTicker({ stories }: { stories: CardStory[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    // One copy of the list scrolls past per loop; ~55px/s keeps it readable
    const half = el.scrollWidth / 2;
    setDuration(Math.min(120, Math.max(30, Math.round(half / 55))));
  }, [stories]);

  if (!stories.length) return null;

  const item = (s: CardStory) => (
    <Link
      key={s.id}
      href={`/story/${s.id}`}
      className="group flex shrink-0 items-baseline gap-2.5 whitespace-nowrap text-[13px] text-content-dim transition-colors hover:text-content"
    >
      <span className="h-1 w-1 translate-y-[-2px] rounded-full bg-accent" aria-hidden />
      {s.simplified_title}
      {(s.thread_size ?? 0) > 2 && (
        <span className="text-content-faint/80">· thread of {s.thread_size}</span>
      )}
    </Link>
  );

  return (
    <section aria-label="Developing stories" className="ticker border-y border-edge bg-surface/60">
      <div className="flex items-stretch">
        <p className="smallcaps flex shrink-0 items-center gap-2 py-2.5 pl-4 pr-5 text-[12px] text-accent md:pl-10">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Developing
        </p>
        <div className="min-w-0 flex-1">
          <div
            ref={track}
            className="ticker-track flex w-max items-center gap-10 py-2.5 pr-10"
            style={{ ["--ticker-duration" as string]: `${duration}s` }}
          >
            <div className="flex items-center gap-10">{stories.map(item)}</div>
            <div className="flex items-center gap-10" aria-hidden>
              {stories.map(item)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
