import type { Metadata } from "next";
import { fetchRecentStories, spreadQuiz } from "@/lib/api";
import WeeklyRecap from "@/components/WeeklyRecap";

export const metadata: Metadata = {
  title: "Weekly recap",
  description: "Ten questions on the week's biggest stories.",
};

export default async function WeeklyPage() {
  const stories = await fetchRecentStories(7);
  return <WeeklyRecap items={spreadQuiz(stories, 10)} storyCount={stories.length} />;
}
