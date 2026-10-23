import type { Metadata } from "next";
import { readFile } from "fs/promises";
import path from "path";
import HistoryTimeline from "@/components/HistoryTimeline";

export const metadata: Metadata = { title: "100 events that shaped the world" };

export default async function HistoryPage() {
  const events = JSON.parse(await readFile(path.join(process.cwd(), "public/data/history-index.json"), "utf8"));
  return <HistoryTimeline events={events} />;
}
