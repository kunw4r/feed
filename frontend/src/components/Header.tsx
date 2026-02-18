"use client";

interface HeaderProps {
  date: string;
  storyCount: number;
}

export default function Header({ date, storyCount }: HeaderProps) {
  const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="border-b-2 border-neutral-900 pb-6 mb-10">
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-2">
          {formatted}
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3">
          The Daily Briefing
        </h1>
        <p className="text-sm md:text-base text-neutral-500 font-sans">
          {storyCount} stories &middot; 3 perspectives &middot; Zero jargon.
        </p>
      </div>
    </header>
  );
}
