import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchArchiveIndex, fetchEdition, toEdition } from "@/lib/api";
import Dashboard from "@/components/Dashboard";

export const dynamicParams = false;

export async function generateStaticParams() {
  const days = await fetchArchiveIndex();
  // Static export needs at least one param; a placeholder renders the not-found page
  return days.length ? days.map((d) => ({ date: d.date })) : [{ date: "none" }];
}

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const label = new Date(date + "T12:00:00+10:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Brisbane",
  });
  return { title: `${label} edition` };
}

export default async function ArchiveDatePage({ params }: Props) {
  const { date } = await params;
  const edition = await fetchEdition(date);
  if (!edition) notFound();
  return <Dashboard briefing={toEdition(edition)} archived />;
}
