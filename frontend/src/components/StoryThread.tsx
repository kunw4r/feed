"use client";

import Link from "next/link";
import { Story } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

interface StoryThreadProps {
  currentStoryId: string;
  relatedStories: Story[];
}

export default function StoryThread({
  currentStoryId,
  relatedStories,
}: StoryThreadProps) {
  if (relatedStories.length === 0) {
    return (
      <div>
        <p className="text-[11px] font-semibold text-content-faint uppercase tracking-wider mb-2">
          Related Stories
        </p>
        <p className="text-[13px] text-content-faint italic">
          No connected stories in today&apos;s briefing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-semibold text-content-faint uppercase tracking-wider mb-3">
        Connected Stories
      </p>
      <div className="space-y-2">
        {relatedStories.map((story) => (
          <Link
            key={story.id}
            href={`/story/${story.id}`}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-all duration-150 group -mx-3"
          >
            {/* Thread line indicator */}
            <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-content-faint group-hover:bg-accent transition-colors" />
              <div className="w-px h-full bg-edge mt-1" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryBadge category={story.category} />
                <span className="text-[11px] text-content-faint uppercase tracking-wider">
                  {story.tier}
                </span>
              </div>
              <p className="text-[14px] font-medium text-content-dim group-hover:text-content transition-colors leading-snug mb-0.5">
                {story.simplified_title}
              </p>
              <p className="text-[12px] text-content-faint line-clamp-1">
                {story.quick_summary}
              </p>
            </div>

            <svg
              className="w-4 h-4 text-content-faint group-hover:text-accent transition-colors mt-2 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
