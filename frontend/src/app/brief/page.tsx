import type { Metadata } from "next";
import { allStories, fetchTodaysBriefing, spreadQuiz, toEdition } from "@/lib/api";
import BriefDeck from "@/components/BriefDeck";

export const metadata: Metadata = { title: "The Brief" };

export default async function BriefPage() {
  const briefing = await fetchTodaysBriefing();
  return <BriefDeck stories={(await toEdition(briefing)).stories} quiz={spreadQuiz(allStories(briefing), 5)} />;
}
