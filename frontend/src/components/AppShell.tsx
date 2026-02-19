"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Globe,
  Map,
  Landmark,
  Building2,
  Flag,
  TrendingUp,
  Cpu,
  Users,
  Leaf,
  Scale,
  Heart,
  BookOpen,
  Menu,
  X,
  Newspaper,
  Shield,
  Plane,
  Brain,
  Camera,
  Code,
  Dumbbell,
  Lightbulb,
  DollarSign,
  Clock,
} from "lucide-react";

const NEWS_REGIONS = [
  { code: "OCEANIA", label: "Australia & Pacific", icon: Map },
  { code: "ASIA", label: "Asia", icon: Globe },
  { code: "EUROPE", label: "Europe", icon: Landmark },
  { code: "MIDDLE_EAST_AFRICA", label: "Middle East & Africa", icon: Building2 },
  { code: "AMERICAS", label: "Americas", icon: Flag },
  { code: "GLOBAL_SYSTEMS", label: "How the World Works", icon: TrendingUp },
];

const SPECIAL_FEEDS = [
  { code: "ADF", label: "ADF & Defence", icon: Shield },
  { code: "AI_TECH", label: "AI & Tech", icon: Cpu },
];

const TOPICS = [
  { code: "POLITICS_POLICY", label: "Politics", icon: Landmark },
  { code: "ECONOMY_MARKETS", label: "Economy", icon: TrendingUp },
  { code: "SCIENCE_TECH", label: "Science & Tech", icon: Cpu },
  { code: "SOCIETY_CULTURE", label: "Society", icon: Users },
  { code: "ENVIRONMENT_CLIMATE", label: "Climate", icon: Leaf },
  { code: "CRIME_SAFETY", label: "Law & Crime", icon: Scale },
  { code: "HEALTH", label: "Health", icon: Heart },
];

const TRACKS = [
  { slug: "finance", label: "Finance", icon: DollarSign },
  { slug: "photography", label: "Photography", icon: Camera },
  { slug: "coding", label: "Coding", icon: Code },
  { slug: "gym", label: "Fitness", icon: Dumbbell },
  { slug: "psychology", label: "Psychology", icon: Brain },
  { slug: "writing", label: "Writing", icon: Lightbulb },
  { slug: "cooking", label: "Cooking", icon: Lightbulb },
  { slug: "music-theory", label: "Music Theory", icon: Lightbulb },
  { slug: "public-speaking", label: "Public Speaking", icon: Lightbulb },
  { slug: "mathematics", label: "Maths", icon: Lightbulb },
  { slug: "geography", label: "Geography", icon: Globe },
];

const LEARN = [
  { slug: "financial-crisis-2008", label: "2008 Financial Crisis" },
  { slug: "the-great-depression", label: "The Great Depression" },
  { slug: "cold-war", label: "The Cold War" },
  { slug: "covid-19-pandemic", label: "COVID-19 Pandemic" },
  { slug: "september-11", label: "September 11" },
  { slug: "brexit", label: "Brexit" },
  { slug: "fall-of-the-berlin-wall", label: "Fall of the Berlin Wall" },
  { slug: "climate-change", label: "Climate Change" },
];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";

  const isActive = (path: string) => {
    const [pathPart, queryPart] = path.split("?");
    const full = basePath + pathPart;

    // For paths with query params (like /?region=ASIA)
    if (queryPart) {
      const isOnRoot = pathname === full || pathname === basePath + "/";
      if (!isOnRoot) return false;
      const params = new URLSearchParams(queryPart);
      for (const [key, value] of params) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }

    return pathname === full || pathname.startsWith(full + "/");
  };

  const isExactActive = (path: string) => {
    const full = basePath + path;
    // Only active when on root with NO query params
    return pathname === full && !searchParams.get("region") && !searchParams.get("topic");
  };

  const navLink = (href: string, label: string, Icon: React.ComponentType<{ size?: number; className?: string }>, active?: boolean) => {
    const isCurrentlyActive = active ?? isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
          isCurrentlyActive
            ? "bg-violet-500/15 text-violet-400 font-medium"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
        }`}
      >
        <Icon size={15} className={isCurrentlyActive ? "text-violet-400" : "text-zinc-600"} />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const sectionHeader = (label: string) => (
    <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
      {label}
    </p>
  );

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="70" r="8" fill="white"/>
              <path d="M30 50 a20 20 0 0 1 20 20" stroke="white" strokeWidth="7" strokeLinecap="round"/>
              <path d="M30 32 a38 38 0 0 1 38 38" stroke="white" strokeWidth="7" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold text-zinc-100 leading-tight">Brainfeed</p>
            <p className="text-[11px] text-zinc-600 leading-tight">Feed your curiosity</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* All Stories */}
        {navLink("/", "All Stories", Newspaper, isExactActive("/"))}

        {/* Special Feeds */}
        <div>
          {sectionHeader("Feeds")}
          <div className="space-y-0.5">
            {SPECIAL_FEEDS.map((f) =>
              navLink(`/?region=${f.code}`, f.label, f.icon)
            )}
          </div>
        </div>

        {/* Regions */}
        <div>
          {sectionHeader("World")}
          <div className="space-y-0.5">
            {NEWS_REGIONS.map((r) =>
              navLink(`/?region=${r.code}`, r.label, r.icon)
            )}
          </div>
        </div>

        {/* Topics */}
        <div>
          {sectionHeader("Topics")}
          <div className="space-y-0.5">
            {TOPICS.map((t) =>
              navLink(`/?topic=${t.code}`, t.label, t.icon)
            )}
          </div>
        </div>

        {/* Learning Tracks */}
        <div>
          {sectionHeader("Train Your Brain")}
          <div className="space-y-0.5">
            {navLink("/tracks", "All Tracks", BookOpen)}
            {TRACKS.slice(0, 5).map((t) =>
              navLink(`/tracks/${t.slug}`, t.label, t.icon)
            )}
            {TRACKS.length > 5 && (
              <Link
                href="/tracks"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1 text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                +{TRACKS.length - 5} more tracks
              </Link>
            )}
            {navLink("/challenges", "Daily Challenges", Dumbbell)}
          </div>
        </div>

        {/* History & Learn */}
        <div>
          {sectionHeader("Deep Dives")}
          <div className="space-y-0.5">
            {navLink("/history", "100 Key Events", Clock)}
            {navLink("/learn", "Event Articles", BookOpen)}
            {LEARN.map((l) => (
              <Link
                key={l.slug}
                href={`/learn/${l.slug}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                  isActive(`/learn/${l.slug}`)
                    ? "bg-violet-500/15 text-violet-400 font-medium"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                }`}
              >
                <Lightbulb size={15} className={isActive(`/learn/${l.slug}`) ? "text-violet-400" : "text-zinc-600"} />
                <span className="truncate">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <p className="text-[11px] text-zinc-600">
          Feed your curiosity
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-shrink-0 bg-[#0a0a0a] border-r border-white/[0.06] flex-col fixed inset-y-0 left-0 z-20">
        {sidebar}
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="70" r="8" fill="white"/>
              <path d="M30 50 a20 20 0 0 1 20 20" stroke="white" strokeWidth="7" strokeLinecap="round"/>
              <path d="M30 32 a38 38 0 0 1 38 38" stroke="white" strokeWidth="7" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[14px] font-bold text-zinc-100">Brainfeed</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-zinc-400"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-30"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-[#0a0a0a] z-40 shadow-xl slide-in">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-[240px] pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
