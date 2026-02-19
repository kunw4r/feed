import { fetchTodaysBriefing } from "@/lib/api";
import Link from "next/link";

export default async function ArchivePage() {
  let date = "";

  try {
    const briefing = await fetchTodaysBriefing();
    date = briefing.date;
  } catch {
    // ignore
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-8 md:py-12">
      <nav className="flex items-center gap-3 mb-8 text-[13px]">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-100 transition-colors"
        >
          ← Feed
        </Link>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">
          Archive
        </h1>
        <p className="text-[15px] text-zinc-400">
          Past feeds. Currently only today&apos;s feed is available.
        </p>
      </div>

      {date && (
        <Link
          href={`/archive/${date}`}
          className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-all duration-150 group"
        >
          <span className="text-[15px] font-medium text-zinc-300 group-hover:text-zinc-100">
            {new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <svg
            className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors"
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
      )}

      <footer className="text-center text-[12px] text-zinc-600 py-8 mt-8">
        <p>Powered by AI · Sourced from trusted outlets</p>
      </footer>
    </main>
  );
}
