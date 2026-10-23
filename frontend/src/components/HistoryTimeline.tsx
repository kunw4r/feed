"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "./PageHeader";
import { Reveal } from "./motion";

interface HistoryEvent {
  year: string;
  title: string;
  slug: string;
  summary: string;
  era: string;
  significance: string;
  has_content: boolean;
}

const ERA_LABEL: Record<string, string> = {
  ANCIENT: "Ancient",
  CLASSICAL: "Classical",
  MEDIEVAL: "Medieval",
  RENAISSANCE: "Renaissance",
  EARLY_MODERN: "Early modern",
  MODERN: "Modern",
  CONTEMPORARY: "Contemporary",
};

export default function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  const [query, setQuery] = useState("");
  const [era, setEra] = useState<string | null>(null);

  const eras = useMemo(() => [...new Set(events.map((e) => e.era))], [events]);
  const q = query.trim().toLowerCase();
  const filtered = events.filter(
    (e) =>
      (!era || e.era === era) &&
      (!q || `${e.title} ${e.summary} ${e.year} ${e.significance}`.toLowerCase().includes(q)),
  );
  const grouped = eras
    .map((code) => ({ code, events: filtered.filter((e) => e.era === code) }))
    .filter((g) => g.events.length);
  const deepDives = events.filter((e) => e.has_content).length;

  const tab = (on: boolean) =>
    `whitespace-nowrap pb-1 border-b transition-colors ${on ? "text-content border-accent" : "text-content-faint border-transparent hover:text-content"}`;

  return (
    <div className="max-w-5xl px-4 md:px-10 pb-24">
      <PageHeader
        kicker="General knowledge"
        title={<>100 events that <span className="italic text-accent">shaped</span> the world</>}
        standfirst={<>From the pyramids to the pandemic, in order. {deepDives} of them have full deep-dive articles.</>}
      />

      <label htmlFor="history-search" className="sr-only">Search events</label>
      <input
        id="history-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search — revolution, war, 1969…"
        className="w-full border-b border-edge bg-transparent pb-3 font-read text-[1.2rem] text-content placeholder:text-content-faint focus:border-accent focus:outline-none transition-colors"
      />
      <nav aria-label="Eras" className="no-scrollbar mt-5 mb-12 flex gap-6 overflow-x-auto text-[14px]">
        <button onClick={() => setEra(null)} className={tab(!era)}>All eras</button>
        {eras.map((code) => (
          <button key={code} onClick={() => setEra(era === code ? null : code)} className={tab(era === code)}>
            {ERA_LABEL[code] ?? code}
          </button>
        ))}
      </nav>

      {grouped.map((g) => (
        <section key={g.code} className="mb-16">
          <Reveal className="mb-2 flex items-baseline gap-4 border-b border-edge pb-3">
            <h2 className="font-display italic text-[2rem] md:text-[2.6rem] leading-none text-content">{ERA_LABEL[g.code] ?? g.code}</h2>
            <span className="text-[13px] text-content-faint">{g.events.length} events</span>
          </Reveal>
          <ol>
            {g.events.map((e) => {
              const body = (
                <>
                  <span className="font-display text-[1.4rem] md:text-[1.7rem] leading-none text-accent/90 tabular-nums">{e.year}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-[1.3rem] leading-tight text-content group-hover:text-accent transition-colors">
                      {e.title}
                      {e.has_content && <span className="ml-2 align-middle smallcaps text-[12px] text-accent">read the deep dive →</span>}
                    </span>
                    <span className="mt-2 block font-read text-[1.05rem] leading-[1.55] text-content-dim">{e.summary}</span>
                    <span className="mt-2 block font-read italic text-[0.98rem] leading-[1.5] text-content-faint">{e.significance}</span>
                  </span>
                </>
              );
              const cls = "group grid gap-2 md:grid-cols-[150px_1fr] md:gap-8 py-7 border-b border-edge";
              return (
                <Reveal as="li" key={e.slug}>
                  {e.has_content ? (
                    <Link href={`/learn/${e.slug}`} className={cls}>{body}</Link>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </Reveal>
              );
            })}
          </ol>
        </section>
      ))}

      {filtered.length === 0 && <p className="py-12 font-read text-content-faint">Nothing matches &ldquo;{query}&rdquo;.</p>}
    </div>
  );
}
