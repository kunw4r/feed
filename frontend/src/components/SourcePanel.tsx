"use client";

import { Source } from "@/lib/types";

interface SourcePanelProps {
  sources: Source[];
  confidence: number;
  sourceCount: number;
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);

  const config =
    confidence >= 0.7
      ? { label: "Well verified", bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" }
      : confidence >= 0.5
        ? { label: "Partially verified", bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" }
        : { label: "Low confidence", bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={`text-[11px] font-medium ${config.text}`}>
        {config.label} ({percentage}%)
      </span>
    </div>
  );
}

export default function SourcePanel({
  sources,
  confidence,
  sourceCount,
}: SourcePanelProps) {
  const isSingleSource = sourceCount <= 1 && sources.length <= 1;

  return (
    <div className="mt-4 pt-4 border-t border-edge">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="text-[11px] font-semibold text-content-faint uppercase tracking-wider">
          Sources
        </span>
        <ConfidencePill confidence={confidence} />
      </div>

      {isSingleSource && (
        <div className="flex items-center gap-2 text-[13px] text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg mb-3">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span>Single source — treat with caution</span>
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-1">
          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[13px] text-content-dim hover:text-content transition-colors group"
            >
              <span className="w-1 h-1 rounded-full bg-content-faint group-hover:bg-content-dim transition-colors flex-shrink-0" />
              <span className="hover:underline underline-offset-2">{source.name}</span>
              <svg className="w-3 h-3 text-content-faint group-hover:text-content-dim transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
