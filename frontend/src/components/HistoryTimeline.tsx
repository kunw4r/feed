"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeroImage } from "@/lib/types";
import PageHeader from "./PageHeader";
import NewsImage from "./NewsImage";
import { Reveal } from "./motion";

export interface HistoryEvent {
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

const eraVar = (code: string) => `var(--color-era-${code.toLowerCase()})`;

export default function HistoryTimeline({ events, thumbs = {} }: { events: HistoryEvent[]; thumbs?: Record<string, HeroImage> }) {
  const [query, setQuery] = useState("");
  const [era, setEra] = useState<string | null>(null);
  const [activeEra, setActiveEra] = useState<string | null>(null);

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
  const maxDensity = Math.max(...grouped.map((g) => g.events.length), 1);

  // Minimap scroll-spy: which era is under the reading line
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveEra(e.target.id.replace("era-", ""))),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    grouped.forEach((g) => {
      const el = document.getElementById(`era-${g.code}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [grouped]);

  const jump = (code: string) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`era-${code}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const tab = (on: boolean) =>
    `whitespace-nowrap pb-1 border-b transition-colors ${on ? "text-content border-accent" : "text-content-faint border-transparent hover:text-content"}`;

  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-24 md:px-10">
      <PageHeader
        kicker="General knowledge"
        title={<>100 events that <span className="italic text-accent">shaped</span> the world</>}
        standfirst={<>From the pyramids to the pandemic, in order. {deepDives} of them have full deep-dive articles.</>}
      />

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-16">
        <div className="min-w-0">
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
            <section key={g.code} id={`era-${g.code}`} className="mb-14 scroll-mt-16 xl:grid xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-14">
              <div className="xl:sticky xl:top-24 xl:self-start">
                <Reveal className="mb-2 flex items-baseline gap-4 border-b border-edge pb-3 xl:mb-0 xl:block xl:border-none xl:pb-0">
                  <h2 className="font-display text-[2rem] italic leading-none md:text-[2.4rem]" style={{ color: eraVar(g.code) }}>
                    {ERA_LABEL[g.code] ?? g.code}
                  </h2>
                  <span className="text-[13px] text-content-faint xl:mt-3 xl:block">{g.events.length} events</span>
                </Reveal>
              </div>
              <ol>
                {g.events.map((e) => {
                  const body = (
                    <>
                      <span className="font-display text-[1.35rem] md:text-[1.6rem] leading-none text-accent/90 tabular-nums">{e.year}</span>
                      <span className="min-w-0">
                        <span className="block font-display text-[1.3rem] leading-tight text-content group-hover:text-accent transition-colors">
                          {e.title}
                          {e.has_content && (
                            <span className="ml-2 inline-block translate-y-[-2px] rounded-full border border-edge-accent bg-accent-soft px-2.5 py-0.5 align-middle smallcaps text-[11px] text-accent">
                              Deep dive
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block font-read text-[1.05rem] leading-[1.55] text-content-dim">{e.summary}</span>
                        <span className="mt-2 block font-read italic text-[0.98rem] leading-[1.5] text-content-faint">{e.significance}</span>
                      </span>
                      {thumbs[e.slug] && (
                        <span className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-inset sm:block md:h-24 md:w-36">
                          <NewsImage
                            src={thumbs[e.slug].url}
                            sizes="144px"
                            className="absolute inset-0 h-full w-full object-cover"
                            fallback={<div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950" />}
                          />
                        </span>
                      )}
                    </>
                  );
                  const hasThumb = Boolean(thumbs[e.slug]);
                  const cls = `group grid items-start gap-2 border-b border-edge py-7 md:gap-8 ${
                    hasThumb ? "md:grid-cols-[130px_minmax(0,1fr)_144px]" : "md:grid-cols-[130px_minmax(0,1fr)]"
                  }`;
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

        {/* ── Era minimap: density + jump + scroll-spy (xl+) ── */}
        <aside className="hidden xl:block">
          <nav aria-label="Era minimap" className="sticky top-24">
            <p className="smallcaps mb-4 text-[12px] text-content-subtle">The span</p>
            <ul className="space-y-4">
              {grouped.map((g) => {
                const on = activeEra === g.code;
                return (
                  <li key={g.code}>
                    <button type="button" onClick={() => jump(g.code)} className="group w-full text-left">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`text-[13px] transition-colors ${on ? "text-content" : "text-content-faint group-hover:text-content-dim"}`}>
                          {ERA_LABEL[g.code] ?? g.code}
                        </span>
                        <span className="text-[11px] tabular-nums text-content-faint">{g.events.length}</span>
                      </span>
                      <span className="mt-1.5 block h-[3px] w-full rounded-full bg-edge" aria-hidden>
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{ width: `${(g.events.length / maxDensity) * 100}%`, backgroundColor: eraVar(g.code) }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 border-t border-edge pt-4 text-[11.5px] leading-relaxed text-content-faint">
              {deepDives} events link to full deep dives. Click an era to jump.
            </p>
          </nav>
        </aside>
      </div>
    </div>
  );
}
