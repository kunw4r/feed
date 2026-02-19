"use client";

import { useState } from "react";
import {
  Code,
  Brain,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Eye,
  EyeOff,
  Clock,
  Zap,
} from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  description: string;
  hints: string[];
  solution: string;
  language?: string;
  estimated_minutes: number;
}

interface ChallengesClientProps {
  challenges: Challenge[];
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; colour: string; bg: string }> = {
  coding: { label: "Coding", icon: Code, colour: "text-sky-400", bg: "bg-sky-500/10" },
  brain_teaser: { label: "Brain Teaser", icon: Brain, colour: "text-amber-400", bg: "bg-amber-500/10" },
  finance: { label: "Finance", icon: DollarSign, colour: "text-emerald-400", bg: "bg-emerald-500/10" },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; colour: string }> = {
  easy: { label: "Easy", colour: "text-green-400" },
  medium: { label: "Medium", colour: "text-amber-400" },
  hard: { label: "Hard", colour: "text-red-400" },
};

export default function ChallengesClient({ challenges }: ChallengesClientProps) {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});

  const filtered = activeType
    ? challenges.filter((c) => c.type === activeType)
    : challenges;

  const types = Array.from(new Set(challenges.map((c) => c.type)));

  const toggleHints = (id: string) => {
    setShowHints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolution = (id: string) => {
    setShowSolution((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest mb-1">
          Train Your Brain
        </p>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
          Daily Challenges
        </h1>
        <p className="text-[14px] text-zinc-400 leading-relaxed">
          Quick 5-10 minute exercises to sharpen your thinking. Try to solve them
          before revealing the solution.
        </p>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveType(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
            !activeType
              ? "bg-violet-600 text-white"
              : "bg-[#111111] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]"
          }`}
        >
          <Zap size={12} />
          All ({challenges.length})
        </button>
        {types.map((type) => {
          const config = TYPE_CONFIG[type] || TYPE_CONFIG.coding;
          const Icon = config.icon;
          const count = challenges.filter((c) => c.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveType(activeType === type ? null : type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                activeType === type
                  ? "bg-violet-600 text-white"
                  : "bg-[#111111] text-zinc-400 border border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              <Icon size={12} />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Challenges list */}
      <div className="space-y-3">
        {filtered.map((challenge) => {
          const typeConfig = TYPE_CONFIG[challenge.type] || TYPE_CONFIG.coding;
          const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty] || DIFFICULTY_CONFIG.easy;
          const TypeIcon = typeConfig.icon;
          const isExpanded = expandedId === challenge.id;

          return (
            <div
              key={challenge.id}
              className="bg-[#111111] rounded-2xl border border-white/[0.06] overflow-hidden transition-all"
            >
              {/* Challenge header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                  <TypeIcon size={16} className={typeConfig.colour} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-medium ${typeConfig.colour}`}>
                      {typeConfig.label}
                    </span>
                    <span className={`text-[11px] font-medium ${diffConfig.colour}`}>
                      {diffConfig.label}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-zinc-600">
                      <Clock size={10} />
                      {challenge.estimated_minutes} min
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-zinc-100">
                    {challenge.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-zinc-600 mt-1 flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-zinc-700 mt-1 flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0">
                  <div className="border-t border-white/[0.06] pt-4">
                    {/* Description */}
                    <p className="text-[14px] text-zinc-300 leading-relaxed mb-4">
                      {challenge.description}
                    </p>

                    {/* Hints */}
                    <div className="mb-4">
                      <button
                        onClick={() => toggleHints(challenge.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        <Lightbulb size={14} />
                        {showHints[challenge.id] ? "Hide hints" : "Show hints"}
                      </button>
                      {showHints[challenge.id] && (
                        <div className="mt-2 space-y-1.5 pl-1">
                          {challenge.hints.map((hint, i) => (
                            <p key={i} className="text-[13px] text-amber-300/80 bg-amber-500/10 rounded-lg px-3 py-2">
                              <span className="font-medium">Hint {i + 1}:</span> {hint}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Solution */}
                    <div>
                      <button
                        onClick={() => toggleSolution(challenge.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] transition-colors"
                      >
                        {showSolution[challenge.id] ? (
                          <><EyeOff size={14} /> Hide solution</>
                        ) : (
                          <><Eye size={14} /> Reveal solution</>
                        )}
                      </button>
                      {showSolution[challenge.id] && (
                        <div className="mt-2">
                          <pre className="bg-black text-zinc-200 rounded-lg px-4 py-3 text-[13px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap border border-white/[0.06]">
                            {challenge.solution}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
