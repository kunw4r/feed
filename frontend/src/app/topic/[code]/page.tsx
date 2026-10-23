import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTodaysBriefing } from "@/lib/api";
import { CATEGORY_CONFIG, Category } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(CATEGORY_CONFIG).map((code) => ({ code }));
}

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: CATEGORY_CONFIG[code as Category]?.label };
}

export default async function TopicPage({ params }: Props) {
  const { code } = await params;
  if (!CATEGORY_CONFIG[code as Category]) notFound();
  return <Dashboard briefing={await fetchTodaysBriefing()} topic={code} />;
}
