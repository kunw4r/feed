import { readFile } from "fs/promises";
import path from "path";
import { Briefing, CardStory, Edition, Story } from "./types";

// All pages are statically generated from the JSON the pipeline writes into public/data.
// These helpers run at build time (server components only).
const DATA = path.join(process.cwd(), "public", "data");

export interface ArchiveDay {
  date: string;
  total_stories: number;
  lead: Pick<Story, "id" | "simplified_title" | "image_url"> | null;
}

async function readJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA, rel), "utf8")) as T;
}

export function allStories(briefing: Briefing): Story[] {
  return Object.entries(briefing.regions)
    .flatMap(([code, stories]) => stories.map((s) => ({ ...s, region_code: s.region_code || code })))
    .sort((a, b) => b.impact_score - a.impact_score);
}

export async function fetchTodaysBriefing(): Promise<Briefing> {
  return readJson<Briefing>("today.json");
}

export async function fetchArchiveIndex(): Promise<ArchiveDay[]> {
  try {
    return await readJson<ArchiveDay[]>("archive/index.json");
  } catch {
    return [];
  }
}

export async function fetchEdition(date: string): Promise<Briefing | null> {
  try {
    return await readJson<Briefing>(`archive/${date}.json`);
  } catch {
    return null;
  }
}

/** Every story still reachable: today's plus anything in the archive (newest copy wins). */
export async function fetchAllKnownStories(): Promise<Story[]> {
  const seen = new Map<string, Story>();
  for (const s of allStories(await fetchTodaysBriefing())) seen.set(s.id, s);
  for (const day of await fetchArchiveIndex()) {
    const edition = await fetchEdition(day.date);
    if (!edition) continue;
    for (const s of allStories(edition)) if (!seen.has(s.id)) seen.set(s.id, s);
  }
  return [...seen.values()];
}

export async function fetchStoryById(id: string): Promise<Story> {
  const story = (await fetchAllKnownStories()).find((s) => s.id === id);
  if (!story) throw new Error("Story not found");
  return story;
}

export function toCard(s: Story): CardStory {
  return {
    id: s.id,
    simplified_title: s.simplified_title,
    quick_summary: s.quick_summary,
    why_it_matters: s.why_it_matters,
    image_url: s.image_url ?? null,
    category: s.category,
    region_code: s.region_code,
    impact_score: s.impact_score,
    reading_minutes: s.reading_minutes,
    created_at: s.created_at,
  };
}

/** A briefing reduced to what listing pages render, ordered by impact. */
export function toEdition(b: Briefing): Edition {
  return { date: b.date, generated_at: b.generated_at, stories: allStories(b).map(toCard) };
}
