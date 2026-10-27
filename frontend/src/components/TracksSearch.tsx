"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Brain, Calculator, Camera, ChefHat, Code, Dumbbell, Globe, LucideIcon, Mic, Music, PenTool, TrendingUp,
} from "lucide-react";
import NewsImage from "./NewsImage";
import { Reveal } from "./motion";
import { proxied } from "@/lib/images";
import { coverGradient, trackAccent } from "@/lib/tracks";

interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  lesson_count: number;
  minutes: number;
  cover_image?: { url: string; credit: string; source_url: string };
}

const ICONS: Record<string, LucideIcon> = {
  "trending-up": TrendingUp, camera: Camera, code: Code, dumbbell: Dumbbell, brain: Brain,
  "pen-tool": PenTool, "chef-hat": ChefHat, music: Music, mic: Mic, calculator: Calculator, globe: Globe,
};

const PROGRESS_KEY = "brainfeed-tracks";

/** Editorial tile artwork: the Wikipedia cover photo, or a stone gradient carrying the track's accent. */
function TileArt({ track, sizes }: { track: TrackMeta; sizes: string }) {
  if (!track.cover_image) {
    const Icon = ICONS[track.icon] ?? BookOpen;
    return (
      <div className="absolute inset-0" style={{ background: coverGradient(track.slug) }}>
        <Icon
          size={190}
          strokeWidth={0.7}
          className="absolute -bottom-8 -right-6 text-white/[0.07]"
          aria-hidden
        />
        <span className="absolute -bottom-7 left-4 font-display text-[8.5rem] italic leading-none text-white/10">
          {track.title.charAt(0)}
        </span>
      </div>
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={proxied(track.cover_image.url, 48)} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110" />
      <NewsImage
        src={track.cover_image.url}
        fade
        sizes={sizes}
        className="card-img absolute inset-0 h-full w-full object-cover"
        fallback={<div className="card-img absolute inset-0" style={{ background: coverGradient(track.slug) }} />}
      />
    </>
  );
}

export function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const complete = done >= total;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="-rotate-90">
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-edge" />
      <circle
        cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round"
        className="stroke-accent"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - (total ? done / total : 0))}
      />
      {complete && <circle cx="12" cy="12" r="2.4" className="fill-accent" />}
    </svg>
  );
}

export default function TracksSearch({ tracks }: { tracks: TrackMeta[] }) {
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});

  // Reading progress lives in localStorage (written by TrackLessonViewer); tiles
  // render without it first so the static HTML matches on hydration.
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      setProgress(Object.fromEntries(Object.entries(all).map(([slug, done]) => [slug, (done as number[]).length])));
    } catch {
      // storage unavailable: tiles just show no progress
    }
  }, []);

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
        className="mb-10 w-full border-b border-edge bg-transparent pb-3 font-read text-[1.2rem] text-content placeholder:text-content-faint focus:border-accent focus:outline-none transition-colors"
      />

      <ol className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t, i) => {
          const done = progress[t.slug] ?? 0;
          const started = done > 0;
          const complete = done >= t.lesson_count;
          return (
            <Reveal as="li" key={t.slug} className="flex">
              <Link href={`/tracks/${t.slug}`} className="group block flex-1">
                <div className="card-depth relative aspect-[4/3] overflow-hidden rounded-[22px] bg-surface-inset">
                  <TileArt track={t} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <span
                    className="absolute left-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-medium leading-[1.6] text-white/90 backdrop-blur-sm"
                    style={{ background: `${trackAccent(t.slug)}cc` }}
                  >
                    {t.lesson_count} lessons · ~{t.minutes} min
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-[1.5rem] leading-[1.12] text-white text-balance">{t.title}</h3>
                  </div>
                </div>
                <p className="mt-3 px-1 font-read text-[0.98rem] leading-[1.5] text-content-dim line-clamp-2">{t.description}</p>
                <p className="mt-2.5 flex items-center gap-2 px-1 text-[13px]">
                  <span className="flex items-center gap-2 text-content-faint">
                    {started && <ProgressRing done={done} total={t.lesson_count} />}
                    {complete ? "Completed" : started ? `${done} of ${t.lesson_count} done` : "Not started"}
                  </span>
                  <span className="ml-auto font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
                    {complete ? "Revisit →" : started ? `Continue · lesson ${Math.min(done + 1, t.lesson_count)} →` : "Start →"}
                  </span>
                </p>
              </Link>
            </Reveal>
          );
        })}
      </ol>

      {filtered.length === 0 && (
        <p className="py-12 font-read text-content-faint">No tracks match &ldquo;{query}&rdquo; yet.</p>
      )}
    </>
  );
}
