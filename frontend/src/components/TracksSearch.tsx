"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "./motion";

interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  lesson_count: number;
}

export default function TracksSearch({ tracks }: { tracks: TrackMeta[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? tracks.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q)) : tracks;

  return (
    <>
      <label htmlFor="track-search" className="sr-only">Search tracks</label>
      <input
        id="track-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tracks — gym, cooking, psychology…"
        className="mb-8 w-full border-b border-edge bg-transparent pb-3 font-read text-[1.2rem] text-content placeholder:text-content-faint focus:border-accent focus:outline-none transition-colors"
      />

      <ol className="grid gap-x-12 md:grid-cols-2 border-t border-edge">
        {filtered.map((t, i) => (
          <Reveal as="li" key={t.slug} delay={Math.min(i, 8) * 40} className="border-b border-edge">
            <Link href={`/tracks/${t.slug}`} className="group grid grid-cols-[2.4rem_1fr] gap-3 py-6">
              <span className="font-display italic text-[1.5rem] leading-none text-accent/80">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-display text-[1.4rem] leading-tight text-content group-hover:text-accent transition-colors">{t.title}</span>
                <span className="mt-1.5 block font-read text-[1.02rem] leading-snug text-content-dim line-clamp-2">{t.description}</span>
                <span className="mt-2 block text-[12px] text-content-faint">{t.lesson_count} lessons · ~{t.lesson_count * 7} min</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ol>

      {filtered.length === 0 && (
        <p className="py-12 font-read text-content-faint">No tracks match &ldquo;{query}&rdquo; yet.</p>
      )}
    </>
  );
}
