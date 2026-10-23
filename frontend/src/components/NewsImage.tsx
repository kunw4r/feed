"use client";

import { useState } from "react";

// Publisher photos arrive at up to ~4000px. wsrv.nl (open-source image proxy/cache)
// resizes them to what the layout needs and serves WebP, without us re-hosting them.
// If the proxy fails we fall back to the original URL, then to the parent's fallback.
const WIDTHS = [480, 800, 1200, 1600];

export function proxied(url: string, w: number) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=78`;
}

interface NewsImageProps {
  src?: string | null;
  /** CSS sizes hint, e.g. "(min-width: 1024px) 66vw, 100vw" */
  sizes: string;
  className?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
}

export default function NewsImage({ src, sizes, className = "", priority, fallback = null }: NewsImageProps) {
  const [stage, setStage] = useState<"proxy" | "original" | "failed">("proxy");

  if (!src || stage === "failed") return <>{fallback}</>;

  const common = {
    alt: "",
    referrerPolicy: "no-referrer" as const,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
    decoding: "async" as const,
    className,
  };

  if (stage === "original") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...common} src={src} onError={() => setStage("failed")} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...common}
      src={proxied(src, 800)}
      srcSet={WIDTHS.map((w) => `${proxied(src, w)} ${w}w`).join(", ")}
      sizes={sizes}
      onError={() => setStage("original")}
    />
  );
}
