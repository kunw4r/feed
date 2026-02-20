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
  coding: { label: "Coding", icon: Code, colour: "text-cat-scitech", bg: "bg-cat-scitech-bg" },
  brain_teaser: { label: "Brain Teaser", icon: Brain, colour: "text-cat-society", bg: "bg-cat-society-bg" },
  finance: { label: "Finance", icon: DollarSign, colour: "text-cat-economy", bg: "bg-cat-economy-bg" },
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
        <p className="text-[11px] font-medium text-content-faint uppercase tracking-widest mb-1">
          Train Your Brain
        </p>
        <h1 className="text-2xl font-bold text-content tracking-tight mb-2">
          Daily Challenges
        </h1>
        <p className="text-[14px] text-content-dim leading-relaxed">
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
              ? "bg-accent-bold text-white"
              : "bg-surface-raised text-content-dim border border-edge hover:border-edge-accent"
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
                  ? "bg-accent-bold text-white"
                  : "bg-surface-raised text-content-dim border border-edge hover:border-edge-accent"
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
              className="bg-surface-raised rounded-2xl border border-edge overflow-hidden transition-all"
            >
              {/* Challenge header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-surface-hover transition-colors"
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
                    <span className="flex items-center gap-0.5 text-[11px] text-content-faint">
                      <Clock size={10} />
                      {challenge.estimated_minutes} min
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-content">
                    {challenge.title}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-content-faint mt-1 flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-content-faint mt-1 flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0">
                  <div className="border-t border-edge pt-4">
                    {/* Description */}
                    <p className="text-[14px] text-content-dim leading-relaxed mb-4">
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
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium bg-surface-hover text-content-dim hover:text-content transition-colors"
                      >
                        {showSolution[challenge.id] ? (
                          <><EyeOff size={14} /> Hide solution</>
                        ) : (
                          <><Eye size={14} /> Reveal solution</>
                        )}
                      </button>
                      {showSolution[challenge.id] && (
                        <div className="mt-2">
                          <pre className="bg-code-bg text-content rounded-lg px-4 py-3 text-[13px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap border border-edge">
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
