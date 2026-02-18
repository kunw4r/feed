import { Story, TIER_LABELS } from "@/lib/types";
import BriefingCard from "./BriefingCard";

interface TierSectionProps {
  tier: string;
  stories: Story[];
}

export default function TierSection({ tier, stories }: TierSectionProps) {
  const labels = TIER_LABELS[tier] ?? { title: tier, subtitle: "" };

  if (stories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-baseline gap-3 mb-1 border-b-2 border-neutral-900 pb-2">
        <h2 className="text-2xl font-bold">{labels.title}</h2>
        <span className="text-sm text-neutral-400 font-sans">
          {labels.subtitle}
        </span>
      </div>
      <div>
        {stories.map((story) => (
          <BriefingCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}
