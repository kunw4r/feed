import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

interface LearnEvent {
  slug: string;
  title: string;
  subtitle: string;
}

async function getLearnIndex(): Promise<LearnEvent[]> {
  try {
    const { default: data } = await import("../../../public/data/learn-index.json");
    return data as LearnEvent[];
  } catch {
    return [];
  }
}

export default async function LearnPage() {
  const events = await getLearnIndex();

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={20} className="text-violet-400" />
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Learn
          </h1>
        </div>
        <p className="text-[14px] text-zinc-400 leading-relaxed">
          Major world events explained from scratch. Each topic is written so anyone can
          follow — no prior knowledge needed. Tap any event to start learning.
        </p>
      </div>

      <div className="space-y-2">
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/learn/${event.slug}`}
            className="flex items-center gap-4 bg-[#111111] rounded-2xl border border-white/[0.06] hover:border-violet-500/20 hover:glow-violet transition-all duration-150 px-5 py-4 group"
          >
            <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/15 transition-colors">
              <BookOpen size={16} className="text-zinc-400 group-hover:text-violet-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
                {event.title}
              </h3>
              {event.subtitle && (
                <p className="text-[13px] text-zinc-400 line-clamp-1">
                  {event.subtitle}
                </p>
              )}
            </div>
            <ChevronRight
              size={16}
              className="text-zinc-700 group-hover:text-violet-400 transition-colors flex-shrink-0"
            />
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-600 text-[14px]">
            Learn content is being generated. Check back soon.
          </p>
        </div>
      )}
    </div>
  );
}
