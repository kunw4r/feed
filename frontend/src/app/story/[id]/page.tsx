import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allStories, fetchAllKnownStories, fetchStoryById, fetchThread, fetchTodaysBriefing } from "@/lib/api";
import AskClaude from "@/components/AskClaude";
import DepthReader from "@/components/story/DepthReader";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await fetchAllKnownStories()).map((s) => ({ id: s.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const story = await fetchStoryById(id);
    return {
      title: story.simplified_title,
      description: story.quick_summary,
      openGraph: {
        title: story.simplified_title,
        description: story.quick_summary,
        type: "article",
        images: story.image_url ? [story.image_url] : undefined,
      },
      twitter: { card: "summary_large_image" },
    };
  } catch {
    return {};
  }
}

export default async function StoryPage({ params }: Props) {
  const { id } = await params;
  const story = await fetchStoryById(id).catch(() => null);
  if (!story) notFound();

  // "Up next" follows today's running order (highest impact first)
  const ordered = allStories(await fetchTodaysBriefing());
  const idx = ordered.findIndex((s) => s.id === story.id);
  const next = idx >= 0 && ordered.length > 1 ? ordered[(idx + 1) % ordered.length] : ordered[0] ?? null;

  return (
    <>
      <DepthReader story={story} next={next && next.id !== story.id ? next : null} thread={await fetchThread(story.id)} />
      <AskClaude
        subject={story.simplified_title}
        context={[
          `Headline: ${story.simplified_title}`,
          `Summary: ${story.quick_summary}`,
          story.why_it_matters ? `Why it matters: ${story.why_it_matters}` : "",
          `Source: ${story.sources.map((s) => `${s.name} (${s.url})`).join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n")}
      />
    </>
  );
}
