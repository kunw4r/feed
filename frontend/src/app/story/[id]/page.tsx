import { fetchStoryById, fetchTodaysBriefing, fetchRelatedStories } from "@/lib/api";
import { CATEGORY_CONFIG, REGION_CONFIG } from "@/lib/types";
import ConceptHighlight from "@/components/ConceptHighlight";
import DeepAnalysisView from "@/components/DeepAnalysisView";
import SourcePanel from "@/components/SourcePanel";
import ShareButton from "@/components/ShareButton";
import StoryInteractive from "@/components/StoryInteractive";
import StoryThread from "@/components/StoryThread";
import WhyItMatters from "@/components/WhyItMatters";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageCircle } from "lucide-react";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";

export async function generateStaticParams() {
  if (!IS_STATIC) return [];
  try {
    const briefing = await fetchTodaysBriefing();
    const allStories = Object.values(briefing.regions).flat();
    return allStories.map((s) => ({ id: s.id }));
  } catch {
    return [];
  }
}

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  let story;
  let error = "";

  try {
    story = await fetchStoryById(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load story.";
  }

  let relatedStories: Awaited<ReturnType<typeof fetchRelatedStories>> = [];
  if (story) {
    try {
      relatedStories = await fetchRelatedStories(id);
    } catch {
      // Silently fail
    }
  }

  if (error || !story) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-content mb-2">
            Story Not Found
          </h1>
          <p className="text-content-dim text-[15px] mb-6">
            {error || "This story could not be found."}
          </p>
          <Link
            href="/"
            className="text-[13px] font-medium text-content-dim hover:text-content transition-colors"
          >
            Back to briefing
          </Link>
        </div>
      </div>
    );
  }

  const impactConfig =
    story.impact_score >= 75
      ? { colour: "text-red-400", bg: "bg-red-500/10" }
      : story.impact_score >= 50
        ? { colour: "text-amber-400", bg: "bg-amber-500/10" }
        : story.impact_score >= 25
          ? { colour: "text-emerald-400", bg: "bg-emerald-500/10" }
          : { colour: "text-content-dim", bg: "bg-surface-hover" };

  const concepts = story.concepts || [];
  const region = story.region;
  const regionCode = story.region_code || "";
  const regionConfig = REGION_CONFIG[regionCode];
  const catConfig = CATEGORY_CONFIG[story.category] || CATEGORY_CONFIG.UNCATEGORISED;

  return (
    <StoryInteractive story={story}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Nav */}
        <nav className="flex items-center gap-2 mb-8 text-[13px]">
          <Link
            href="/"
            className="flex items-center gap-1 text-content-faint hover:text-content transition-colors"
          >
            <ArrowLeft size={14} />
            Briefing
          </Link>
          {regionConfig && (
            <>
              <span className="text-content-faint">/</span>
              <span className="text-content-faint">{regionConfig.label}</span>
            </>
          )}
        </nav>

        <article className="animate-in">
          {/* Meta bar */}
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${catConfig.bg} ${catConfig.colour}`}
            >
              {catConfig.label}
            </span>
            {region && (
              <span className="text-[11px] text-content-faint uppercase tracking-wider">
                {region}
              </span>
            )}
            {story.impact_score > 0 && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${impactConfig.bg} ${impactConfig.colour}`}>
                Impact: {Math.round(story.impact_score)}/100
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold leading-tight text-content mb-3 tracking-tight">
            {story.simplified_title}
          </h1>

          {/* Date */}
          <p className="text-[13px] text-content-faint mb-8">
            {story.published_date
              ? new Date(story.published_date + "T00:00:00").toLocaleDateString(
                  "en-AU",
                  { weekday: "long", day: "numeric", month: "long", year: "numeric" }
                )
              : "Date unavailable"}
          </p>

          {/* Quick summary */}
          <div className="bg-surface-raised rounded-xl px-5 py-4 mb-6 border border-edge">
            <p className="text-[11px] font-semibold text-content-faint uppercase tracking-wider mb-1.5">
              In a nutshell
            </p>
            <p className="text-[15px] text-content-dim leading-relaxed">
              <ConceptHighlight text={story.quick_summary} concepts={concepts} />
            </p>
          </div>

          {/* Why it matters */}
          {story.why_it_matters && (
            <div className="mb-6">
              <WhyItMatters text={story.why_it_matters} />
            </div>
          )}

          {/* Full body */}
          <div className="mb-8 space-y-4">
            {story.simplified_body.split("\n\n").map((para, i) => (
              <p key={i} className="text-[15px] text-content-dim leading-relaxed">
                <ConceptHighlight text={para} concepts={concepts} />
              </p>
            ))}
          </div>

          {/* Concepts glossary */}
          {concepts.length > 0 && (
            <div className="mb-8 bg-surface-raised rounded-xl px-5 py-4 border border-edge">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-accent" />
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                  Key Concepts
                </span>
              </div>
              <div className="space-y-3">
                {concepts.map((c) => (
                  <div key={c.term} className="bg-surface rounded-lg px-3 py-2.5 border border-edge">
                    <p className="text-[13px] font-semibold text-content">
                      {c.term}
                    </p>
                    <p className="text-[13px] text-content-dim leading-relaxed">
                      {c.definition}
                    </p>
                    {c.context && (
                      <p className="text-[12px] text-content-faint mt-1 italic">
                        In this story: {c.context}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep analysis */}
          {story.deep_analysis && (
            <div className="mb-8">
              <DeepAnalysisView analysis={story.deep_analysis} />
            </div>
          )}

          {/* Source panel */}
          <SourcePanel
            sources={story.sources}
            confidence={story.confidence}
            sourceCount={story.source_count}
          />

          {/* Related stories */}
          {relatedStories.length > 0 && (
            <div className="mt-6 pt-4 border-t border-edge">
              <StoryThread
                currentStoryId={story.id}
                relatedStories={relatedStories}
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-4 border-t border-edge flex items-center gap-3">
            <ShareButton title={story.simplified_title} />
          </div>

          {/* Hint */}
          <div className="mt-6 text-center">
            <p className="text-[12px] text-content-faint flex items-center justify-center gap-1.5">
              <MessageCircle size={12} />
              Highlight any text to ask about it, or tap the chat button
            </p>
          </div>
        </article>
      </div>
    </StoryInteractive>
  );
}
