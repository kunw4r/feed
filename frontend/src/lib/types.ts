export interface Source {
  name: string;
  url: string;
}

/** A Wikipedia/Wikimedia image attached to a deep dive by scripts/add_learn_images.py */
export interface HeroImage {
  url: string;
  width: number;
  height: number;
  credit: string;
  source_url: string;
}


export interface Concept {
  term: string;
  definition: string;
  context: string;
}

export interface Quiz {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface Article {
  source: string;
  url: string;
  title: string;
  byline: string | null;
  paragraphs: string[];
  truncated?: boolean; // public builds keep only an excerpt
}

export interface Story {
  id: string;
  title: string;
  simplified_title: string;
  simplified_body: string;
  quick_summary: string;
  deep_analysis: string | null;
  why_it_matters: string | null;
  concepts: Concept[];
  region: string | null;
  region_code: string | null;
  description: string;
  tier: string;
  category: Category;
  impact_score: number;
  sources: Source[];
  source_count: number;
  confidence: number;
  related_story_ids: string[];
  created_at: string;
  published_date: string | null;
  image_url?: string | null;
  quiz?: Quiz | null;
  reading_minutes?: number;
  has_fulltext?: boolean;
  /** Plain-language primer for readers new to the topic (newer editions only) */
  background_beginner?: string | null;
}

/** A quiz question tied to the story it came from (brief quiz, weekly recap, review bank). */
export interface QuizItem {
  id: string;
  title: string;
  created_at: string;
  quiz: Quiz;
}

/** The fields cards, rails and the brief need; keeps full text out of listing pages' HTML. */
export type CardStory = Pick<
  Story,
  | "id"
  | "simplified_title"
  | "quick_summary"
  | "why_it_matters"
  | "image_url"
  | "category"
  | "region_code"
  | "impact_score"
  | "reading_minutes"
  | "created_at"
  | "published_date"
> & {
  /** How many stories (including this one) are in its developing-story thread */
  thread_size?: number;
};

export interface Edition {
  date: string;
  generated_at?: string;
  stories: CardStory[];
}

export interface Briefing {
  date: string;
  regions: Record<string, Story[]>;
  total_stories: number;
  generated_at?: string;
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

export const REGION_CONFIG: Record<
  string,
  { label: string; description: string }
> = {
  OCEANIA: {
    label: "Australia & Pacific",
    description: "Australia, New Zealand & Pacific Islands",
  },
  ASIA: {
    label: "Asia",
    description: "China, Japan, India, Southeast Asia & more",
  },
  EUROPE: {
    label: "Europe",
    description: "EU, UK, Russia-Ukraine & NATO",
  },
  MIDDLE_EAST_AFRICA: {
    label: "Middle East & Africa",
    description: "Conflicts, oil, development & transformation",
  },
  AMERICAS: {
    label: "Americas",
    description: "US politics, trade wars, Latin America",
  },
  GLOBAL_SYSTEMS: {
    label: "Global Systems",
    description: "Finance, international orgs & how the world works",
  },
  ADF: {
    label: "ADF & Defence",
    description: "Australian Defence Force, RAAF, AUKUS & military",
  },
  AI_TECH: {
    label: "AI & Tech",
    description: "AI models, autonomous vehicles, partnerships & innovation",
  },
};

export const CATEGORY_CONFIG: Record<
  Category,
  { label: string; colour: string; bg: string }
> = {
  POLITICS_POLICY: {
    label: "Politics",
    colour: "text-cat-politics",
    bg: "bg-cat-politics-bg",
  },
  ECONOMY_MARKETS: {
    label: "Economy",
    colour: "text-cat-economy",
    bg: "bg-cat-economy-bg",
  },
  SCIENCE_TECH: {
    label: "Science & Tech",
    colour: "text-cat-scitech",
    bg: "bg-cat-scitech-bg",
  },
  SOCIETY_CULTURE: {
    label: "Society",
    colour: "text-cat-society",
    bg: "bg-cat-society-bg",
  },
  ENVIRONMENT_CLIMATE: {
    label: "Environment",
    colour: "text-cat-environment",
    bg: "bg-cat-environment-bg",
  },
  CRIME_SAFETY: {
    label: "Crime",
    colour: "text-cat-crime",
    bg: "bg-cat-crime-bg",
  },
  HEALTH: {
    label: "Health",
    colour: "text-cat-health",
    bg: "bg-cat-health-bg",
  },
  UNCATEGORISED: {
    label: "General",
    colour: "text-cat-general",
    bg: "bg-cat-general-bg",
  },
};
