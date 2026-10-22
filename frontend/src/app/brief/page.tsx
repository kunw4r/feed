import type { Metadata } from "next";
import { fetchTodaysBriefing } from "@/lib/api";
import BriefDeck from "@/components/BriefDeck";

export const metadata: Metadata = { title: "The Brief" };

export default async function BriefPage() {
  const briefing = await fetchTodaysBriefing();
  const stories = Object.values(briefing.regions)
    .flat()
    .sort((a, b) => b.impact_score - a.impact_score);
  return <BriefDeck stories={stories} />;
}
