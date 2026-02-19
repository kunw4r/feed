import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, MessageCircle, HelpCircle } from "lucide-react";
import LearnInteractive from "@/components/LearnInteractive";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

const SLUGS = [
  "financial-crisis-2008",
  "the-great-depression",
  "cold-war",
  "covid-19-pandemic",
  "september-11",
  "brexit",
  "fall-of-the-berlin-wall",
  "climate-change",
];

export async function generateStaticParams() {
  if (!IS_STATIC) return [];
  return SLUGS.map((slug) => ({ slug }));
}

interface LearnEvent {
  slug: string;
  title: string;
  subtitle: string;
  sections: { heading: string; content: string }[];
  key_concepts: { term: string; definition: string; context: string }[];
  timeline: { date: string; event: string }[];
  why_it_still_matters: string;
  discussion_questions: string[];
}

async function getLearnEvent(slug: string): Promise<LearnEvent | null> {
  try {
    const data = await import(`../../../../public/data/learn-${slug}.json`);
    return { slug, ...data.default } as LearnEvent;
  } catch {
    return null;
  }
}

interface LearnPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LearnEventPage({ params }: LearnPageProps) {
  const { slug } = await params;
  const event = await getLearnEvent(slug);

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Topic Not Found
          </h1>
          <Link
            href="/learn"
            className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Back to Learn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LearnInteractive event={event}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Nav */}
        <nav className="flex items-center gap-2 mb-8 text-[13px]">
          <Link
            href="/learn"
            className="flex items-center gap-1 text-zinc-600 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft size={14} />
            Learn
          </Link>
        </nav>

        <article className="animate-in">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-violet-400" />
              <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">
                Learn
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight mb-2">
              {event.title}
            </h1>
            {event.subtitle && (
              <p className="text-[15px] text-zinc-400">{event.subtitle}</p>
            )}
          </div>

          {/* Why it matters today */}
          {event.why_it_still_matters && (
            <div className="bg-violet-500/10 rounded-xl px-5 py-4 mb-8 border border-violet-500/20">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider mb-1.5">
                Why this still matters today
              </p>
              <p className="text-[14px] text-zinc-300 leading-relaxed">
                {event.why_it_still_matters}
              </p>
            </div>
          )}

          {/* Timeline */}
          {event.timeline && event.timeline.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-zinc-600" />
                <h2 className="text-[13px] font-semibold text-zinc-600 uppercase tracking-wider">
                  Timeline
                </h2>
              </div>
              <div className="space-y-2">
                {event.timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-[12px] font-mono text-zinc-600 w-16 flex-shrink-0 pt-0.5 text-right">
                      {t.date}
                    </span>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-1.5" />
                      {i < event.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-white/[0.06] mt-1" />
                      )}
                    </div>
                    <p className="text-[13px] text-zinc-400 pb-3">
                      {t.event}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main content sections */}
          <div className="space-y-8 mb-8">
            {event.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-lg font-bold text-zinc-100 mb-3">
                  {section.heading}
                </h2>
                <div className="space-y-3">
                  {section.content.split("\n\n").map((para, j) => (
                    <p
                      key={j}
                      className="text-[15px] text-zinc-400 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Key concepts */}
          {event.key_concepts && event.key_concepts.length > 0 && (
            <div className="mb-8 bg-[#111111] rounded-xl px-5 py-4 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-violet-400" />
                <h2 className="text-[13px] font-semibold text-violet-400 uppercase tracking-wider">
                  Key Concepts
                </h2>
              </div>
              <div className="space-y-3">
                {event.key_concepts.map((c, i) => (
                  <div key={i} className="bg-black/50 rounded-lg px-3 py-2.5 border border-white/[0.04]">
                    <p className="text-[13px] font-semibold text-zinc-200">
                      {c.term}
                    </p>
                    <p className="text-[13px] text-zinc-400 leading-relaxed">
                      {c.definition}
                    </p>
                    {c.context && (
                      <p className="text-[12px] text-zinc-600 mt-1 italic">
                        {c.context}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussion questions */}
          {event.discussion_questions && event.discussion_questions.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle size={14} className="text-zinc-600" />
                <h2 className="text-[13px] font-semibold text-zinc-600 uppercase tracking-wider">
                  Think About
                </h2>
              </div>
              <div className="space-y-2">
                {event.discussion_questions.map((q, i) => (
                  <p
                    key={i}
                    className="text-[14px] text-zinc-400 pl-4 border-l-2 border-violet-500/30 py-1"
                  >
                    {q}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          <div className="text-center mt-8 pt-6 border-t border-white/[0.06]">
            <p className="text-[12px] text-zinc-600 flex items-center justify-center gap-1.5">
              <MessageCircle size={12} />
              Highlight any text to ask about it, or tap the chat button
            </p>
          </div>
        </article>
      </div>
    </LearnInteractive>
  );
}
