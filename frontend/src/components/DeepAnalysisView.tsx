"use client";

import { useState } from "react";
import { Clock, Users, Zap, Eye, ChevronDown } from "lucide-react";

interface DeepAnalysisViewProps {
  analysis: string;
  compact?: boolean;
}

interface Section {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  content: string;
}

const SECTION_CONFIG: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; accent: string }> = {
  "Historical Context": { icon: Clock, accent: "border-l-blue-400" },
  "Multiple Perspectives": { icon: Users, accent: "border-l-violet-400" },
  "Future Implications": { icon: Zap, accent: "border-l-amber-400" },
  "What to Watch": { icon: Eye, accent: "border-l-emerald-400" },
};

function parseAnalysis(raw: string): Section[] {
  const sections: Section[] = [];
  const parts = raw.split(/^## /m).filter(Boolean);

  for (const part of parts) {
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) continue;

    const title = part.slice(0, newlineIdx).trim();
    const content = part.slice(newlineIdx + 1).trim();
    if (!content) continue;

    const config = SECTION_CONFIG[title] || { icon: Eye, accent: "border-l-content-faint" };

    sections.push({
      title,
      icon: config.icon,
      accent: config.accent,
      content,
    });
  }

  return sections;
}

function SectionBlock({
  section,
  defaultOpen,
}: {
  section: Section;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = section.icon;

  return (
    <div className={`border-l-2 ${section.accent} rounded-r-lg bg-surface-raised`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-hover transition-colors rounded-r-lg"
      >
        <Icon size={14} className="text-content-faint" />
        <span className="text-[13px] font-semibold text-content flex-1">
          {section.title}
        </span>
        <ChevronDown
          size={14}
          className={`text-content-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 animate-in">
          <div className="text-[13px] text-content-dim leading-relaxed space-y-2 pl-7">
            {section.content.split("\n\n").map((para, i) => {
              const parts = para.split(/\*\*(.+?)\*\*/g);
              return (
                <p key={i}>
                  {parts.map((seg, j) =>
                    j % 2 === 1 ? <strong key={j} className="text-content">{seg}</strong> : <span key={j}>{seg}</span>
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeepAnalysisView({
  analysis,
  compact = false,
}: DeepAnalysisViewProps) {
  const sections = parseAnalysis(analysis);

  if (sections.length === 0) {
    return (
      <div className="text-content-dim text-[14px] leading-relaxed space-y-3">
        {analysis.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[13px] font-semibold text-content-faint uppercase tracking-wider mb-3">
        Deep Analysis
      </h2>
      <div className="space-y-1.5">
        {sections.map((section, i) => (
          <SectionBlock
            key={section.title}
            section={section}
            defaultOpen={compact ? false : i === 0}
          />
        ))}
      </div>
    </div>
  );
}
