"use client";

import { useEffect, useRef, useState } from "react";
import { proxied, WIDTHS } from "@/lib/images";

interface NewsImageProps {
  src?: string | null;
  /** CSS sizes hint, e.g. "(min-width: 1024px) 66vw, 100vw" */
  sizes: string;
  className?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
  /** Fade in once decoded so a placeholder underneath shows instead of a black flash */
  fade?: boolean;
}

export default function NewsImage({ src, sizes, className = "", priority, fallback = null, fade }: NewsImageProps) {
  const [stage, setStage] = useState<"proxy" | "original" | "failed">("proxy");
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Cached images can finish before hydration attaches onLoad
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true);
  }, [stage]);

  if (!src || stage === "failed") return <>{fallback}</>;

  const common = {
    alt: "",
    referrerPolicy: "no-referrer" as const,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
    decoding: "async" as const,
    className: fade ? `${className} transition-opacity duration-700 ${loaded ? "opacity-100" : "!opacity-0"}` : className,
    ref,
    onLoad: () => setLoaded(true),
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
