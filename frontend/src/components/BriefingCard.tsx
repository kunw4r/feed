"use client";

import { useState } from "react";
import { Depth, Story } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";
import DepthToggle from "./DepthToggle";

interface BriefingCardProps {
  story: Story;
}

function ImpactDot({ score }: { score: number }) {
  if (score <= 0) return null;

  const colour =
    score >= 75
      ? "bg-red-500"
      : score >= 50
        ? "bg-amber-500"
        : score >= 25
          ? "bg-emerald-500"
          : "bg-neutral-300";

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colour}`} title={`Impact: ${Math.round(score)}/100`} />
  );
}

function SourceIndicator({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="text-xs text-neutral-400">
      {count === 1 ? "1 source" : `${count} sources`}
    </span>
  );
}

export default function BriefingCard({ story }: BriefingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [depth, setDepth] = useState<Depth>("quick");

  const renderContent = () => {
    switch (depth) {
      case "quick":
        return (
          <p className="text-neutral-600 text-sm leading-relaxed">
            {story.quick_summary}
          </p>
        );
      case "standard":
        return (
          <div className="text-neutral-700 text-sm leading-relaxed space-y-3">
            {story.simplified_body.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        );
      case "deep":
        return (
          <p className="text-neutral-400 text-sm italic">
            Deep analysis coming soon.
          </p>
        );
    }
  };

  return (
    <article
      className="group border-b border-neutral-200 py-5 last:border-0 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <CategoryBadge category={story.category} />
            <ImpactDot score={story.impact_score} />
            <SourceIndicator count={story.sources.length} />
          </div>

          <h3 className="font-serif text-lg font-semibold leading-snug mb-2 group-hover:text-neutral-600 transition-colors">
            {story.simplified_title}
          </h3>

          {!expanded && (
            <p className="text-neutral-500 text-sm leading-relaxed line-clamp-2">
              {story.quick_summary}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 mt-1">
          <svg
            className={`w-4 h-4 text-neutral-300 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 ml-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <DepthToggle current={depth} onChange={setDepth} />
          </div>
          {renderContent()}
          {story.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-400 mb-1">Sources</p>
              <div className="flex flex-wrap gap-2">
                {story.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {source.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
