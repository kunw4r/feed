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

// Threads: stories linked by related_story_ids (in either direction) form a developing story.
let threadsCache: Promise<Map<string, Story[]>> | null = null;

function buildThreads(): Promise<Map<string, Story[]>> {
  threadsCache ??= (async () => {
    const stories = await fetchAllKnownStories();
    const byId = new Map(stories.map((s) => [s.id, s]));
    const adj = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!byId.has(a) || !byId.has(b) || a === b) return;
      (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
      (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
    };
    for (const s of stories) for (const r of s.related_story_ids ?? []) link(s.id, r);

    const threads = new Map<string, Story[]>();
    for (const start of adj.keys()) {
      if (threads.has(start)) continue;
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) for (const n of adj.get(queue.shift()!) ?? []) if (!seen.has(n)) (seen.add(n), queue.push(n));
      const ordered = [...seen].map((id) => byId.get(id)!).sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const id of seen) threads.set(id, ordered);
    }
    return threads;
  })();
  return threadsCache;
}

/** The developing story this story belongs to, oldest first (just the story itself if standalone). */
export async function fetchThread(id: string): Promise<CardStory[]> {
  const thread = (await buildThreads()).get(id);
  return thread ? thread.map((s) => toCard(s, thread.length)) : [];
}

export function toCard(s: Story, threadSize?: number): CardStory {
  return {
    thread_size: threadSize,
    published_date: s.published_date,
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
export async function toEdition(b: Briefing): Promise<Edition> {
  const threads = await buildThreads();
  return {
    date: b.date,
    generated_at: b.generated_at,
    stories: allStories(b).map((s) => toCard(s, threads.get(s.id)?.length)),
  };
}
