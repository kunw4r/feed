import { Category, CATEGORY_CONFIG } from "@/lib/types";

interface CategoryBadgeProps {
  category: Category;
}

const COLOUR_MAP: Record<Category, string> = {
  POLITICS_POLICY: "bg-blue-500/15 text-blue-700",
  ECONOMY_MARKETS: "bg-green-500/15 text-green-700",
  SCIENCE_TECH: "bg-purple-500/15 text-purple-700",
  SOCIETY_CULTURE: "bg-orange-500/15 text-orange-700",
  ENVIRONMENT_CLIMATE: "bg-teal-500/15 text-teal-700",
  CRIME_SAFETY: "bg-red-500/15 text-red-700",
  HEALTH: "bg-pink-500/15 text-pink-700",
  UNCATEGORISED: "bg-neutral-500/15 text-neutral-600",
};

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.UNCATEGORISED;
  const colours = COLOUR_MAP[category] ?? COLOUR_MAP.UNCATEGORISED;

  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${colours}`}
    >
      {config.label}
    </span>
  );
}
