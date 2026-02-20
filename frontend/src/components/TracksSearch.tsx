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
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks... (e.g. gym, cooking, psychology)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-edge text-[14px] text-content placeholder:text-content-faint focus:outline-none focus:border-edge-focus focus:ring-1 focus:ring-edge-accent bg-surface-raised transition-colors"
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
              className="group block bg-surface-raised rounded-2xl border border-edge hover:border-edge-accent hover:glow-card transition-all duration-150 px-5 py-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-hover group-hover:bg-nav-active transition-colors flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-content-dim group-hover:text-accent transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-content mb-0.5 group-hover:text-accent-hover transition-colors">
                    {track.title}
                  </h2>
                  <p className="text-[12px] text-content-dim leading-relaxed line-clamp-2 mb-1.5">
                    {track.description}
                  </p>
                  <span className="text-[11px] font-medium text-content-faint">
                    {track.lesson_count} lessons
                  </span>
                </div>
                <ArrowRight
                  size={14}
                  className="text-content-faint group-hover:text-accent transition-colors mt-1 flex-shrink-0"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && query && (
        <div className="text-center py-12">
          <p className="text-content-dim text-[14px] mb-1">
            No tracks matching &ldquo;{query}&rdquo;
          </p>
          <p className="text-content-faint text-[13px]">
            More tracks are being added regularly.
          </p>
        </div>
      )}
    </>
  );
}
