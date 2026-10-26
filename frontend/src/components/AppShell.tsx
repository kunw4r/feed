"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Sun, Moon, Search, ChevronRight } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { REGION_CONFIG, CATEGORY_CONFIG } from "@/lib/types";
import { useProgress, dueForReview, goalOf, streakOf } from "@/lib/progress";

const BASE = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";

const SECTIONS: { title: string; collapsible?: boolean; links: { href: string; label: string }[] }[] = [
  {
    title: "Today",
    links: [
      { href: "/", label: "Today’s edition" },
      { href: "/brief", label: "The brief" },
      { href: "/recall", label: "Review" },
      { href: "/weekly", label: "Weekly recap" },
      { href: "/archive", label: "Archive" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/learn", label: "Deep dives" },
      { href: "/history", label: "100 key events" },
      { href: "/tracks", label: "Learning tracks" },
      { href: "/challenges", label: "Daily challenges" },
    ],
  },
  {
    title: "Regions",
    collapsible: true,
    links: Object.entries(REGION_CONFIG).map(([code, r]) => ({ href: `/region/${code}`, label: r.label })),
  },
  {
    title: "Topics",
    collapsible: true,
    links: Object.entries(CATEGORY_CONFIG)
      .filter(([code]) => code !== "UNCATEGORISED")
      .map(([code, c]) => ({ href: `/topic/${code}`, label: c.label })),
  },
];

function ThemeToggle({ size = 16 }: { size?: number }) {
  const { toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      className="p-2 rounded-full text-content-dim hover:text-content hover:bg-surface-hover transition-colors"
    >
      <Sun size={size} className="hidden [.dark_&]:block" />
      <Moon size={size} className="[.dark_&]:hidden" />
    </button>
  );
}

const GROUPS_KEY = "brainfeed-nav-open";

/** Which collapsible sidebar groups are open, remembered per browser (closed by default). */
function useOpenGroups() {
  const [groups, setGroups] = useState<string[]>([]);
  useEffect(() => {
    try {
      setGroups(JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]"));
    } catch {
      // storage unavailable: groups start closed
    }
  }, []);
  const toggle = (title: string, isOpen: boolean) =>
    setGroups((prev) => {
      const next = isOpen ? [...new Set([...prev, title])] : prev.filter((g) => g !== title);
      try {
        localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  return [groups, toggle] as const;
}

function GoalDot({ done, total }: { done: number; total: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="-rotate-90">
      <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" className="stroke-edge" />
      <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-accent transition-[stroke-dashoffset] duration-700" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const path = (pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname).replace(/(.)\/$/, "$1") || "/";
  const [openGroups, toggleGroup] = useOpenGroups();

  useEffect(() => setOpen(false), [pathname]);

  // "/" jumps to search from anywhere (unless you're typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      router.push("/search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const progress = useProgress();
  const dueCount = dueForReview(progress).length;
  const goal = goalOf(progress);
  const streak = streakOf(progress.days);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/");

  const nav = (
    <nav aria-label="Site" className="flex h-full flex-col">
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="block">
          <p className="font-display text-[22px] font-medium leading-none text-content">
            Brainfeed<span className="text-accent">.</span>
          </p>
          <p className="mt-1.5 font-read italic text-[13px] text-content-faint">Feed your curiosity</p>
        </Link>
      </div>

      <div className="px-3 pb-5">
        <Link
          href="/search"
          className="flex items-center gap-2.5 rounded-full border border-edge px-3.5 py-2 text-[13px] text-content-faint hover:text-content hover:border-content-faint transition-colors"
        >
          <Search size={14} />
          Search stories
          <kbd className="ml-auto rounded border border-edge px-1.5 text-[11px] leading-[1.4]">/</kbd>
        </Link>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6 space-y-6">
        {SECTIONS.map((section) => {
          const links = (
            <ul>
              {section.links.map((l) => {
                const on = isActive(l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={on ? "page" : undefined}
                      className={`relative flex items-center px-3 py-1 text-[13.5px] transition-colors ${
                        on ? "text-content" : "text-content-faint hover:text-content"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-accent transition-opacity ${
                          on ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {l.label}
                      {l.href === "/recall" && dueCount > 0 && (
                        <span className="ml-2 rounded-full bg-accent-bold px-1.5 text-[10px] font-semibold leading-[1.5] text-white">{dueCount}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          );
          if (!section.collapsible) {
            return (
              <div key={section.title}>
                <p className="px-3 mb-1.5 smallcaps text-[12px] text-content-subtle">{section.title}</p>
                {links}
              </div>
            );
          }
          const hasActive = section.links.some((l) => isActive(l.href));
          return (
            <details
              key={section.title}
              open={hasActive || openGroups.includes(section.title)}
              onToggle={(e) => toggleGroup(section.title, (e.currentTarget as HTMLDetailsElement).open)}
              className="group/nav"
            >
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 mb-1.5 smallcaps text-[12px] text-content-subtle hover:text-content-faint [&::-webkit-details-marker]:hidden">
                <ChevronRight size={12} className="transition-transform group-open/nav:rotate-90" />
                {section.title}
              </summary>
              {links}
            </details>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-edge px-5 py-3">
        <Link href="/you" className="group flex items-center gap-2.5 text-[12px] text-content-faint hover:text-content transition-colors" aria-label="Your progress">
          <GoalDot done={goal.done} total={goal.total} />
          <span>
            {streak > 0 ? `${streak}-day streak` : "Your progress"}
            <span className="block text-[11px] text-content-subtle">{goal.met ? "Goal met today" : `${goal.done}/${goal.total} today`}</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-content focus:px-4 focus:py-2 focus:text-surface">
        Skip to content
      </a>

      <aside className="hidden lg:flex w-[240px] flex-shrink-0 bg-surface border-r border-edge flex-col fixed inset-y-0 left-0 z-20">
        {nav}
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-edge bg-surface-header px-4 py-2.5 backdrop-blur-xl">
        <Link href="/" className="font-display text-[19px] font-medium text-content">
          Brainfeed<span className="text-accent">.</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle size={18} />
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="p-2 rounded-full text-content-dim hover:text-content hover:bg-surface-hover transition-colors"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-surface-overlay backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="lg:hidden slide-in fixed inset-y-0 left-0 z-40 w-[280px] bg-surface shadow-2xl">{nav}</aside>
        </>
      )}

      <main id="main" className="flex-1 min-w-0 lg:ml-[240px] pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
