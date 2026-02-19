"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Clock, ChevronRight, BookOpen, Filter } from "lucide-react";

interface HistoryEvent {
  year: string;
  title: string;
  slug: string;
  summary: string;
  era: string;
  significance: string;
  has_content: boolean;
}

const ERA_CONFIG: Record<string, { label: string; colour: string; bg: string; dot: string }> = {
  ANCIENT: { label: "Ancient", colour: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
  CLASSICAL: { label: "Classical", colour: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400" },
  MEDIEVAL: { label: "Medieval", colour: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
  RENAISSANCE: { label: "Renaissance", colour: "text-purple-400", bg: "bg-purple-500/10", dot: "bg-purple-400" },
  EARLY_MODERN: { label: "Early Modern", colour: "text-violet-400", bg: "bg-violet-500/10", dot: "bg-violet-400" },
  MODERN: { label: "Modern", colour: "text-blue-400", bg: "bg-blue-500/10", dot: "bg-blue-400" },
  CONTEMPORARY: { label: "Contemporary", colour: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
};

interface HistoryTimelineProps {
  events: HistoryEvent[];
}

export default function HistoryTimeline({ events }: HistoryTimelineProps) {
  const [query, setQuery] = useState("");
  const [activeEra, setActiveEra] = useState<string | null>(null);

  const eras = useMemo(() => {
    const seen = new Set<string>();
    return events
      .map((e) => e.era)
      .filter((era) => {
        if (seen.has(era)) return false;
        seen.add(era);
        return true;
      });
  }, [events]);

  const filtered = useMemo(() => {
    let result = events;
    if (activeEra) {
      result = result.filter((e) => e.era === activeEra);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.year.toLowerCase().includes(q) ||
          e.significance.toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, activeEra, query]);

  const withContentCount = events.filter((e) => e.has_content).length;

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest mb-1">
          General Knowledge
        </p>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
          100 Events That Shaped the World
        </h1>
        <p className="text-[14px] text-zinc-400 leading-relaxed">
          A chronological timeline of the most important events in human history.
          {withContentCount > 0 && (
            <span className="text-zinc-600">
              {" "}{withContentCount} events have full deep-dive articles.
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events... (e.g. revolution, war, 1969)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.06] text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 bg-[#111111] transition-colors"
        />
      </div>

      {/* Era filters */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setActiveEra(null)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
            !activeEra
              ? "bg-violet-600 text-white"
              : "bg-[#111111] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]"
          }`}
        >
          <Filter size={11} />
          All eras
        </button>
        {eras.map((era) => {
          const config = ERA_CONFIG[era] || ERA_CONFIG.MODERN;
          const count = events.filter((e) => e.era === era).length;
          return (
            <button
              key={era}
              onClick={() => setActiveEra(activeEra === era ? null : era)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                activeEra === era
                  ? "bg-violet-600 text-white"
                  : `bg-[#111111] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]`
              }`}
            >
              {config.label}
              <span className={activeEra === era ? "text-violet-200" : "text-zinc-600"}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {(query || activeEra) && (
        <p className="text-[12px] text-zinc-600 mb-4">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/[0.06]" />

        <div className="space-y-0">
          {filtered.map((event, i) => {
            const config = ERA_CONFIG[event.era] || ERA_CONFIG.MODERN;
            const showEraLabel =
              i === 0 || filtered[i - 1]?.era !== event.era;

            return (
              <div key={event.slug + i}>
                {/* Era divider */}
                {showEraLabel && (
                  <div className="flex items-center gap-3 py-3 relative">
                    <div className={`w-[47px] flex justify-center relative z-10`}>
                      <div className={`w-3 h-3 rounded-full ${config.dot} ring-4 ring-black`} />
                    </div>
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.colour}`}>
                      {config.label}
                    </span>
                  </div>
                )}

                {/* Event */}
                {event.has_content ? (
                  <Link
                    href={`/learn/${event.slug}`}
                    className="group flex items-start gap-3 py-2.5 pl-0 pr-2 relative hover:bg-white/[0.03] rounded-lg transition-colors -ml-1 pl-1"
                  >
                    <div className="w-[47px] flex-shrink-0 flex justify-center relative z-10">
                      <div className="w-2 h-2 rounded-full bg-zinc-100 ring-3 ring-black mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-medium text-zinc-600">{event.year}</span>
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-violet-400">
                          <BookOpen size={9} />
                          Deep dive
                        </span>
                      </div>
                      <h3 className="text-[14px] font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors leading-snug">
                        {event.title}
                      </h3>
                      <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5">
                        {event.summary}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-zinc-700 group-hover:text-violet-400 mt-2 flex-shrink-0 transition-colors" />
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 py-2.5 pl-0 pr-2 relative -ml-1 pl-1">
                    <div className="w-[47px] flex-shrink-0 flex justify-center relative z-10">
                      <div className="w-2 h-2 rounded-full bg-zinc-700 ring-3 ring-black mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-medium text-zinc-600">{event.year}</span>
                      </div>
                      <h3 className="text-[14px] font-medium text-zinc-300 leading-snug">
                        {event.title}
                      </h3>
                      <p className="text-[12px] text-zinc-400 leading-relaxed mt-0.5">
                        {event.summary}
                      </p>
                      <p className="text-[11px] text-zinc-600 italic mt-0.5">
                        {event.significance}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Clock size={24} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-400 text-[14px]">No events matching your search.</p>
        </div>
      )}
    </div>
  );
}
