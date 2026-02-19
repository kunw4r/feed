"use client";

import { Story, CATEGORY_CONFIG, REGION_CONFIG } from "@/lib/types";
import Link from "next/link";
import { ChevronRight, BookOpen, AlertTriangle } from "lucide-react";

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  const catConfig = CATEGORY_CONFIG[story.category] || CATEGORY_CONFIG.UNCATEGORISED;
  const regionConfig = story.region_code ? REGION_CONFIG[story.region_code] : null;
  const conceptCount = story.concepts?.length || 0;

  return (
    <Link
      href={`/story/${story.id}`}
      className="block group bg-[#111111] rounded-2xl border border-white/[0.06] hover:border-violet-500/20 hover:glow-violet transition-all duration-150 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${catConfig.bg} ${catConfig.colour}`}
            >
              {catConfig.label}
            </span>
            {regionConfig && (
              <span className="text-[11px] text-zinc-600">
                {regionConfig.label}
              </span>
            )}
            {story.impact_score >= 70 && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-400">
                <AlertTriangle size={10} />
                High impact
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-semibold leading-snug text-zinc-100 mb-1 group-hover:text-violet-300 transition-colors">
            {story.simplified_title}
          </h3>

          {/* Summary */}
          <p className="text-zinc-400 text-[13px] leading-relaxed line-clamp-2 mb-1.5">
            {story.quick_summary}
          </p>

          {/* Bottom meta */}
          <div className="flex items-center gap-3">
            {conceptCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-violet-400">
                <BookOpen size={11} />
                {conceptCount} concepts explained
              </span>
            )}
            {story.deep_analysis && (
              <span className="text-[11px] text-zinc-600">
                Deep analysis available
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={16}
          className="text-zinc-700 group-hover:text-violet-400 transition-colors mt-1 flex-shrink-0"
        />
      </div>
    </Link>
  );
}
