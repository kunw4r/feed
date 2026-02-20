"use client";

interface HeaderProps {
  date: string;
  storyCount: number;
  regionCount: number;
}

export default function Header({ date, storyCount, regionCount }: HeaderProps) {
  const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="pb-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-content tracking-tight">
          Brainfeed
        </span>
      </div>

      <p className="text-xs font-medium text-content-faint uppercase tracking-widest mb-2">
        {formatted}
      </p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-content mb-2">
        What&apos;s Happening in the World
      </h1>
      <p className="text-content-dim text-[15px]">
        {storyCount} stories across {regionCount} regions — simplified so you actually understand what&apos;s going on.
      </p>
    </header>
  );
}
