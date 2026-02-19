import { Briefing, Story } from "./types";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${BACKEND_URL}/api`;

function getAllStories(briefing: Briefing): Story[] {
  return Object.values(briefing.regions).flat();
}

export async function fetchTodaysBriefing(): Promise<Briefing> {
  if (IS_STATIC) {
    const { default: data } = await import("../../public/data/today.json");
    return data as unknown as Briefing;
  }

  const res = await fetch(`${API_BASE}/briefings/today`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch briefing: ${res.status}`);
  }

  return res.json();
}

export async function fetchStoryById(id: string): Promise<Story> {
  if (IS_STATIC) {
    const { default: data } = await import("../../public/data/today.json");
    const briefing = data as unknown as Briefing;
    const allStories = getAllStories(briefing);
    const story = allStories.find((s) => s.id === id);
    if (story) return story;
    throw new Error("Story not found");
  }

  const res = await fetch(`${API_BASE}/stories/${id}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch story: ${res.status}`);
  }

  return res.json();
}

export async function fetchRelatedStories(storyId: string): Promise<Story[]> {
  if (IS_STATIC) {
    const { default: data } = await import("../../public/data/today.json");
    const briefing = data as unknown as Briefing;
    const allStories = getAllStories(briefing);
    const story = allStories.find((s) => s.id === storyId);
    if (!story || !story.related_story_ids || story.related_story_ids.length === 0) {
      return [];
    }
    return allStories.filter((s) => story.related_story_ids.includes(s.id));
  }

  const story = await fetchStoryById(storyId);
  if (!story.related_story_ids || story.related_story_ids.length === 0) {
    return [];
  }

  const related: Story[] = [];
  for (const relId of story.related_story_ids) {
    try {
      const relStory = await fetchStoryById(relId);
      related.push(relStory);
    } catch {
      // Skip stories that can't be fetched
    }
  }
  return related;
}

export async function fetchStoriesByRegion(regionCode: string): Promise<Story[]> {
  if (IS_STATIC) {
    const { default: data } = await import("../../public/data/today.json");
    const briefing = data as unknown as Briefing;
    return briefing.regions[regionCode] || [];
  }

  const res = await fetch(`${API_BASE}/stories/region/${regionCode}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];
  return res.json();
}
