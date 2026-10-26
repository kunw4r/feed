// Publisher photos arrive at up to ~4000px. wsrv.nl (open-source image proxy/cache)
// resizes them to what the layout needs and serves WebP, without us re-hosting them.
// Plain module (no "use client") so server components can build URLs too.
export const WIDTHS = [480, 800, 1200, 1600];

// Wikimedia allows hotlinking and serves its own CDN renditions, and the proxy
// currently 404s on some wikimedia thumb URLs — so we build renditions directly.
// Thumbnails must use Wikimedia's fixed buckets (arbitrary widths are rejected).
const WIKIMEDIA = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;
const WIKI_BUCKETS = [330, 500, 960, 1280, 1920];

function wikimediaSize(url: string, w: number): string {
  const bucket = WIKI_BUCKETS.find((b) => b >= w) ?? 1920;
  // Already a rendered thumb (svg/pdf/djvu -> png/jpg): swap the size segment
  let m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/(?:commons|en)\/thumb\/[^/]+\/[^/]+\/)([^/]+)\/\d+px-(.+)$/);
  if (m) return `${m[1]}${m[2]}/${bucket}px-${m[3]}`;
  // Original file: insert the thumb path with the right rendered extension
  m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/(?:commons|en)\/)([^/]+\/[^/]+\/)([^/]+)$/);
  if (!m) return url;
  const ext = m[3].split(".").pop()?.toLowerCase();
  const suffix = ext === "svg" ? ".png" : ext === "pdf" || ext === "djvu" ? ".jpg" : "";
  return `${m[1]}thumb/${m[2]}${m[3]}/${bucket}px-${m[3]}${suffix}`;
}

export function proxied(url: string, w: number) {
  if (WIKIMEDIA.test(url)) return wikimediaSize(url, w);
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=78`;
}
