import { fetchStoryById, fetchTodaysBriefing } from "@/lib/api";
import StoryInteractive from "@/components/StoryInteractive";
import DepthReader from "@/components/story/DepthReader";
import Link from "next/link";

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

  if (error || !story) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-32 text-center">
        <h1 className="font-display text-3xl text-content mb-3">Story not found</h1>
        <p className="text-content-dim text-[15px] mb-8">{error || "This story could not be found."}</p>
        <Link href="/" className="text-[14px] text-content-dim underline underline-offset-4 hover:text-content">
          Back to today&apos;s edition
        </Link>
      </div>
    );
  }

  // "Up next" follows the edition's running order (highest impact first)
  let next = null;
  try {
    const ordered = Object.values((await fetchTodaysBriefing()).regions)
      .flat()
      .sort((a, b) => b.impact_score - a.impact_score);
    const idx = ordered.findIndex((s) => s.id === story.id);
    next = ordered[(idx + 1) % ordered.length] ?? null;
  } catch {
    // no next story
  }

  return (
    <StoryInteractive story={story}>
      <DepthReader story={story} next={next && next.id !== story.id ? next : null} />
    </StoryInteractive>
  );
}
