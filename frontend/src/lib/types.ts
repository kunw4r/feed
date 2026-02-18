export interface Source {
  name: string;
  url: string;
}

export interface Story {
  id: string;
  title: string;
  simplified_title: string;
  simplified_body: string;
  quick_summary: string;
  deep_analysis: string | null;
  description: string;
  tier: "LOCAL" | "NATIONAL" | "GLOBAL";
  category: Category;
  impact_score: number;
  sources: Source[];
  source_count: number;
  confidence: number;
  created_at: string;
  published_date: string | null;
}

export interface Briefing {
  date: string;
  local_stories: Story[];
  national_stories: Story[];
  global_stories: Story[];
  total_stories: number;
}

export type Category =
  | "POLITICS_POLICY"
  | "ECONOMY_MARKETS"
  | "SCIENCE_TECH"
  | "SOCIETY_CULTURE"
  | "ENVIRONMENT_CLIMATE"
  | "CRIME_SAFETY"
  | "HEALTH"
  | "UNCATEGORISED";

export type Depth = "quick" | "standard" | "deep";

export const CATEGORY_CONFIG: Record<
  Category,
  { label: string; colour: string; bg: string }
> = {
  POLITICS_POLICY: {
    label: "Politics",
    colour: "text-politics",
    bg: "bg-politics",
  },
  ECONOMY_MARKETS: {
    label: "Economy",
    colour: "text-economy",
    bg: "bg-economy",
  },
  SCIENCE_TECH: {
    label: "Science & Tech",
    colour: "text-science",
    bg: "bg-science",
  },
  SOCIETY_CULTURE: {
    label: "Society",
    colour: "text-society",
    bg: "bg-society",
  },
  ENVIRONMENT_CLIMATE: {
    label: "Environment",
    colour: "text-environment",
    bg: "bg-environment",
  },
  CRIME_SAFETY: {
    label: "Crime",
    colour: "text-crime",
    bg: "bg-crime",
  },
  HEALTH: {
    label: "Health",
    colour: "text-health",
    bg: "bg-health",
  },
  UNCATEGORISED: {
    label: "General",
    colour: "text-uncategorised",
    bg: "bg-uncategorised",
  },
};

export const TIER_LABELS: Record<string, { title: string; subtitle: string }> =
  {
    LOCAL: {
      title: "Local",
      subtitle: "Brisbane & Queensland",
    },
    NATIONAL: {
      title: "National",
      subtitle: "Australia",
    },
    GLOBAL: {
      title: "Global",
      subtitle: "Around the World",
    },
  };
