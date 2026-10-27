"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORY_CONFIG, REGION_CONFIG, Category } from "@/lib/types";
import NewsImage from "./NewsImage";
import PageHeader from "./PageHeader";

const BASE = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";

interface Entry {
  id: string;
  t: string; // title
  g: string; // gist
  c: string[]; // concept terms
  r: string | null; // region code
  k: Category; // category
  d: string; // created_at
  i: string | null; // image
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });

/** The shared result row list: meta line, headline, gist, thumbnail. */
function ResultList({ entries }: { entries: Entry[] }) {
  return (
    <ol className="divide-y divide-edge border-y border-edge">
      {entries.map((e) => (
        <li key={e.id}>
          <Link prefetch={false} href={`/story/${e.id}`} className="group grid grid-cols-[1fr_72px] md:grid-cols-[1fr_96px] items-start gap-5 py-5">
            <div className="min-w-0">
              <p className="smallcaps text-[12px] text-content-faint">
                {dayOf(e.d)} · {(e.r && REGION_CONFIG[e.r]?.label) || ""} · {CATEGORY_CONFIG[e.k]?.label}
              </p>
              <p className="font-display mt-1 text-[1.25rem] leading-snug text-content group-hover:text-accent transition-colors">{e.t}</p>
              <p className="font-read mt-1 text-[1rem] leading-snug text-content-dim line-clamp-2">{e.g}</p>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-inset">
              <NewsImage src={e.i} sizes="96px" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Every query word must appear somewhere; title hits outrank concept hits outrank gist hits; newer breaks ties. */
function score(e: Entry, words: string[]): number {
  const title = norm(e.t);
  const concepts = norm(e.c.join(" "));
  const gist = norm(e.g);
  let total = 0;
  for (const w of words) {
    const wordStart = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    const s = wordStart.test(title) ? 6 : title.includes(w) ? 3 : wordStart.test(concepts) ? 3 : wordStart.test(gist) ? 2 : gist.includes(w) ? 1 : 0;
    if (!s) return 0;
    total += s;
  }
  return total;
}

export default function SearchClient() {
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    fetch(`${BASE}/search/index.json`)
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);

  const results = useMemo(() => {
    if (!index) return [];
    const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
    const pool = index.filter((e) => (!region || e.r === region) && (!topic || e.k === topic));
    if (!words.length) return region || topic ? pool.slice(0, 40) : [];
    return pool
      .map((e) => ({ e, s: score(e, words) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.e.d.localeCompare(a.e.d))
      .slice(0, 40)
      .map((x) => x.e);
  }, [index, q, region, topic]);

  // Idle state (nothing typed, no filter): the newest stories, as something to browse
  const latest = useMemo(
    () => (index ? [...index].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 9) : []),
    [index],
  );

  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1 text-[13px] transition-colors ${
      on ? "border-accent text-content bg-accent-soft" : "border-edge text-content-faint hover:text-content hover:border-content-faint"
    }`;
  const searching = q.trim().length > 1 || region || topic;

  return (
    <div className="max-w-4xl px-4 md:px-10 pb-24">
      <PageHeader kicker="Search" title="Find a story" standfirst="Everything from the last month: people, places, ideas." />

      <label className="block">
        <span className="sr-only">Search stories</span>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try “Strait of Hormuz”, “interest rates”, “AUKUS”…"
          className="w-full border-b border-edge bg-transparent pb-3 font-display text-[1.8rem] md:text-[2.4rem] text-content placeholder:text-content-subtle focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mt-5">
        {!searching && <p className="smallcaps mb-2 text-[12px] text-content-subtle">Browse by region</p>}
        <div className="no-scrollbar -mx-4 md:mx-0 px-4 md:px-0 flex gap-2 overflow-x-auto">
          {Object.entries(REGION_CONFIG).map(([code, r]) => (
            <button key={code} onClick={() => setRegion(region === code ? null : code)} className={chip(region === code)} aria-pressed={region === code}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="smallcaps mb-2 mt-4 text-[12px] text-content-subtle">Browse by topic</p>
        <div className="no-scrollbar -mx-4 md:mx-0 px-4 md:px-0 flex gap-2 overflow-x-auto">
          {Object.entries(CATEGORY_CONFIG)
            .filter(([code]) => code !== "UNCATEGORISED")
            .map(([code, c]) => (
              <button key={code} onClick={() => setTopic(topic === code ? null : code)} className={chip(topic === code)} aria-pressed={topic === code}>
                {c.label}
              </button>
            ))}
        </div>
      </div>

      <div className="mt-10" aria-live="polite">
        {index === null ? (
          <p className="font-read text-content-faint">Loading the archive…</p>
        ) : !searching ? (
          <>
            <p className="mb-6 text-[13px] text-content-faint">
              {index.length} stories searchable. Press <kbd className="rounded border border-edge px-1.5 text-[12px]">/</kbd> anywhere to jump here.
            </p>
            <p className="smallcaps mb-1 text-[13px] text-content-subtle">The latest</p>
            <ResultList entries={latest} />
          </>
        ) : results.length === 0 ? (
          <p className="font-read text-content-faint">Nothing matches that yet.</p>
        ) : (
          <ResultList entries={results} />
        )}
      </div>
    </div>
  );
}
