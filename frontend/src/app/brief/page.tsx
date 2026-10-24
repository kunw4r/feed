import type { Metadata } from "next";
import { fetchTodaysBriefing, toEdition } from "@/lib/api";
import BriefDeck from "@/components/BriefDeck";

export const metadata: Metadata = { title: "The Brief" };

export default async function BriefPage() {
  return <BriefDeck stories={(await toEdition(await fetchTodaysBriefing())).stories} />;
}
