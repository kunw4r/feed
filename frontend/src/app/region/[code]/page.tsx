import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTodaysBriefing, toEdition } from "@/lib/api";
import { REGION_CONFIG } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(REGION_CONFIG).map((code) => ({ code }));
}

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: REGION_CONFIG[code]?.label, description: REGION_CONFIG[code]?.description };
}

export default async function RegionPage({ params }: Props) {
  const { code } = await params;
  if (!REGION_CONFIG[code]) notFound();
  return <Dashboard briefing={toEdition(await fetchTodaysBriefing())} region={code} />;
}
