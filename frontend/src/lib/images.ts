// Publisher photos arrive at up to ~4000px. wsrv.nl (open-source image proxy/cache)
// resizes them to what the layout needs and serves WebP, without us re-hosting them.
// Plain module (no "use client") so server components can build URLs too.
export const WIDTHS = [480, 800, 1200, 1600];

export function proxied(url: string, w: number) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=78`;
}
