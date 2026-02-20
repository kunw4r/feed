"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Briefing, Story, REGION_CONFIG, CATEGORY_CONFIG } from "@/lib/types";
import StoryCard from "./StoryCard";
import {
  Filter,
  X,
  TrendingUp,
  Globe,
  Map,
  Landmark,
  Building2,
  Flag,
  Cpu,
  Shield,
  Users,
  Leaf,
  Scale,
  Heart,
} from "lucide-react";

const REGION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  OCEANIA: Map,
  ASIA: Globe,
  EUROPE: Landmark,
  MIDDLE_EAST_AFRICA: Building2,
  AMERICAS: Flag,
  GLOBAL_SYSTEMS: TrendingUp,
  ADF: Shield,
  AI_TECH: Cpu,
};

const TOPIC_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  POLITICS_POLICY: Landmark,
  ECONOMY_MARKETS: TrendingUp,
  SCIENCE_TECH: Cpu,
  SOCIETY_CULTURE: Users,
  ENVIRONMENT_CLIMATE: Leaf,
  CRIME_SAFETY: Scale,
  HEALTH: Heart,
  DEFENCE: Shield,
};

interface DashboardProps {
  briefing: Briefing;
}

export default function Dashboard({ briefing }: DashboardProps) {
  const searchParams = useSearchParams();
  const urlRegion = searchParams.get("region");
  const urlTopic = searchParams.get("topic");

  const [activeRegion, setActiveRegion] = useState<string | null>(urlRegion);
  const [activeTopic, setActiveTopic] = useState<string | null>(urlTopic);

  useEffect(() => {
    setActiveRegion(urlRegion);
    setActiveTopic(urlTopic);
  }, [urlRegion, urlTopic]);

  const allStories = useMemo(() => {
    return Object.entries(briefing.regions).flatMap(([code, stories]) =>
      stories.map((s) => ({ ...s, region_code: s.region_code || code }))
    );
  }, [briefing]);

  const filteredStories = useMemo(() => {
    let result = allStories;
    if (activeRegion) {
      result = result.filter((s) => s.region_code === activeRegion);
    }
    if (activeTopic) {
      if (activeTopic === "DEFENCE") {
        result = result.filter(
          (s) =>
            s.region_code === "ADF" ||
            (s.category === "POLITICS_POLICY" &&
              (s.simplified_title.toLowerCase().includes("defence") ||
                s.simplified_title.toLowerCase().includes("defense") ||
                s.simplified_title.toLowerCase().includes("military") ||
                s.simplified_title.toLowerCase().includes("nato") ||
                s.simplified_title.toLowerCase().includes("aukus") ||
                s.simplified_title.toLowerCase().includes("army") ||
                s.simplified_title.toLowerCase().includes("war") ||
                s.simplified_body.toLowerCase().includes("defence") ||
                s.simplified_body.toLowerCase().includes("military") ||
                s.simplified_body.toLowerCase().includes("nato")))
        );
      } else {
        result = result.filter((s) => s.category === activeTopic);
      }
    }
    return result.sort((a, b) => b.impact_score - a.impact_score);
  }, [allStories, activeRegion, activeTopic]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of allStories) {
      const code = s.region_code || "UNKNOWN";
      counts[code] = (counts[code] || 0) + 1;
    }
    return counts;
  }, [allStories]);

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const source = activeRegion
      ? allStories.filter((s) => s.region_code === activeRegion)
      : allStories;
    for (const s of source) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [allStories, activeRegion]);

  const clearFilters = () => {
    setActiveRegion(null);
    setActiveTopic(null);
  };

  const hasFilters = activeRegion || activeTopic;

  const formatted = new Date(briefing.date + "T00:00:00").toLocaleDateString(
    "en-AU",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium text-content-faint uppercase tracking-widest mb-1">
          {formatted}
        </p>
        <h1 className="text-2xl font-bold text-content tracking-tight mb-1">
          {activeRegion
            ? REGION_CONFIG[activeRegion]?.label || "Stories"
            : activeTopic
              ? (CATEGORY_CONFIG[activeTopic as keyof typeof CATEGORY_CONFIG]?.label || activeTopic)
              : "Today's Feed"}
        </h1>
        <p className="text-[14px] text-content-dim">
          {filteredStories.length} stories
          {hasFilters ? " matching your filters" : ` across ${Object.keys(briefing.regions).length} regions`}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        <Filter size={14} className="text-content-faint flex-shrink-0" />

        {Object.keys(REGION_CONFIG).map((code) => {
          const config = REGION_CONFIG[code];
          const Icon = REGION_ICONS[code] || Globe;
          const count = regionCounts[code] || 0;
          if (count === 0) return null;
          const isActive = activeRegion === code;

          return (
            <button
              key={code}
              onClick={() => setActiveRegion(isActive ? null : code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-accent-bold text-white"
                  : "bg-surface-raised text-content-dim border border-edge hover:border-edge-accent hover:text-content"
              }`}
            >
              <Icon size={12} />
              <span>{config.label}</span>
            </button>
          );
        })}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] text-content-faint hover:text-content-dim transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Topic sub-filters */}
      {!activeTopic && (
        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {Object.entries(CATEGORY_CONFIG).map(([code, config]) => {
            const count = topicCounts[code] || 0;
            if (count === 0) return null;
            const Icon = TOPIC_ICONS[code] || Globe;

            return (
              <button
                key={code}
                onClick={() => setActiveTopic(code)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap bg-surface-raised text-content-dim border border-edge hover:border-edge-accent hover:text-content transition-all"
              >
                <Icon size={11} />
                {config.label}
                <span className="text-content-faint">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeTopic && (
        <button
          onClick={() => setActiveTopic(null)}
          className="flex items-center gap-1.5 mb-6 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-accent-bold text-white"
        >
          {CATEGORY_CONFIG[activeTopic as keyof typeof CATEGORY_CONFIG]?.label || activeTopic}
          <X size={12} />
        </button>
      )}

      {/* Stories */}
      <div className="space-y-2">
        {filteredStories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>

      {filteredStories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-content-faint text-[14px] mb-2">
            No stories match these filters.
          </p>
          <button
            onClick={clearFilters}
            className="text-[13px] text-content-dim hover:text-content underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
