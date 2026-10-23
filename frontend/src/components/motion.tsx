// Scroll-driven motion primitives, pure CSS (see globals.css). They render as plain
// markup, so they work in server components and collapse under prefers-reduced-motion.

/**
 * Fades + lifts + unblurs its children as they scroll into view. Pure CSS
 * (scroll-driven animation), so content is visible in the static HTML before
 * any JavaScript runs; browsers without support simply show it.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  as?: "div" | "p" | "section" | "li" | "h2" | "h3";
  /** Kept for call-site compatibility; scroll position now drives the timing. */
  delay?: number;
  className?: string;
}) {
  return <Tag className={`reveal ${className}`}>{children}</Tag>;
}

/**
 * Text whose words ink in, one after another, as it scrolls through the viewport.
 * CSS scroll timeline on the paragraph drives every word; no JS needed.
 */
export function InkText({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(/\s+/);
  return (
    <p className={`ink ${className}`} style={{ ["--n" as string]: words.length }}>
      {words.map((w, i) => (
        <span key={i} style={{ ["--i" as string]: i }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
