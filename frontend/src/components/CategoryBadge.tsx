import { Category, CATEGORY_CONFIG } from "@/lib/types";

interface CategoryBadgeProps {
  category: Category;
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.UNCATEGORISED;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${config.bg} ${config.colour}`}
    >
      {config.label}
    </span>
  );
}
