"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  TrendingUp,
  Camera,
  Code,
  BookOpen,
  Dumbbell,
  Brain,
  PenTool,
  ChefHat,
  Music,
  Mic,
  Calculator,
  Globe,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "trending-up": TrendingUp,
  camera: Camera,
  code: Code,
  book: BookOpen,
  dumbbell: Dumbbell,
  brain: Brain,
  "pen-tool": PenTool,
  "chef-hat": ChefHat,
  music: Music,
  mic: Mic,
  calculator: Calculator,
  globe: Globe,
};

interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  lesson_count: number;
}

interface TracksSearchProps {
  tracks: TrackMeta[];
}

export default function TracksSearch({ tracks }: TracksSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase())
      )
    : tracks;

  return (
    <>
      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks... (e.g. gym, cooking, psychology)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.06] text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 bg-[#111111] transition-colors"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((track) => {
          const Icon = ICON_MAP[track.icon] || BookOpen;
          return (
            <Link
              key={track.slug}
              href={`/tracks/${track.slug}`}
              className="group block bg-[#111111] rounded-2xl border border-white/[0.06] hover:border-violet-500/20 hover:glow-violet transition-all duration-150 px-5 py-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] group-hover:bg-violet-500/15 transition-colors flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-zinc-100 mb-0.5 group-hover:text-violet-300 transition-colors">
                    {track.title}
                  </h2>
                  <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-2 mb-1.5">
                    {track.description}
                  </p>
                  <span className="text-[11px] font-medium text-zinc-600">
                    {track.lesson_count} lessons
                  </span>
                </div>
                <ArrowRight
                  size={14}
                  className="text-zinc-700 group-hover:text-violet-400 transition-colors mt-1 flex-shrink-0"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && query && (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-[14px] mb-1">
            No tracks matching &ldquo;{query}&rdquo;
          </p>
          <p className="text-zinc-600 text-[13px]">
            More tracks are being added regularly.
          </p>
        </div>
      )}
    </>
  );
}
