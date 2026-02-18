import { Briefing } from "./types";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "true";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${BACKEND_URL}/api`;

export async function fetchTodaysBriefing(): Promise<Briefing> {
  if (IS_STATIC) {
    // Static export: read baked-in JSON
    const { default: data } = await import("../../public/data/today.json");
    return data as Briefing;
  }

  const res = await fetch(`${API_BASE}/briefings/today`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch briefing: ${res.status}`);
  }

  return res.json();
}

export async function fetchBriefingByDate(date: string): Promise<Briefing> {
  const res = await fetch(`${API_BASE}/briefings/${date}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch briefing for ${date}: ${res.status}`);
  }

  return res.json();
}
