// Brainfeed service worker: instant repeat visits and offline reading of today's edition.
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const STATIC = "bf-static-v1"; // hashed build assets, safe to keep forever
const PAGES = "bf-pages-v2"; // HTML, RSC payloads, data JSON
const IMAGES = "bf-images-v1"; // resized photos from the image proxy
const MAX_IMAGES = 150;
const MAX_PAGES = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll([`${BASE}/`, `${BASE}/brief`, `${BASE}/recall`, `${BASE}/data/today.json`]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC, PAGES, IMAGES]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

// Offline: any saved size of the same photo beats no photo
async function anyRendition(url) {
  const source = url.searchParams.get("url");
  const cache = await caches.open(IMAGES);
  for (const key of await cache.keys()) {
    if (new URL(key.url).searchParams.get("url") === source) return cache.match(key);
  }
  return Response.error();
}

async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") (await caches.open(cacheName)).put(request, res.clone());
  return res;
}

// Fresh when online (editions update through the day), saved copy when not
async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(`${BASE}/`)) ||
      new Response("Offline", { status: 503 })
    );
  }
}

// Next adds a per-build ?_rsc= hash to page payloads; key them by path so the cache doesn't grow every build
function cacheKey(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith(".txt") ? url.origin + url.pathname : request;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(PAGES);
  const key = cacheKey(request);
  const hit = await cache.match(key);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(key, res.clone()).then(() => trim(PAGES, MAX_PAGES));
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname === "wsrv.nl") {
    event.respondWith(
      cacheFirst(request, IMAGES)
        .catch(() => anyRendition(url))
        .finally(() => trim(IMAGES, MAX_IMAGES)),
    );
    return;
  }
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE + "/")) return;

  if (url.pathname.startsWith(`${BASE}/_next/static/`)) event.respondWith(cacheFirst(request, STATIC));
  else if (request.mode === "navigate") event.respondWith(networkFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});

// Save today's stories (pages, original excerpts, lead photos) for offline reading.
// Runs once per edition; the page asks only when the connection isn't in data-saver mode.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "warm") return;
  event.waitUntil(
    (async () => {
      const res = await fetch(`${BASE}/data/today.json`, { cache: "no-store" });
      const edition = await res.clone().json();
      const pages = await caches.open(PAGES);
      const marker = `${BASE}/__warmed__/${edition.generated_at}`;
      if (await pages.match(marker)) return;
      await pages.put(`${BASE}/data/today.json`, res);

      const stories = Object.values(edition.regions).flat();
      const images = await caches.open(IMAGES);
      for (const s of stories) {
        await Promise.allSettled([
          pages.add(`${BASE}/story/${s.id}`),
          pages.add(`${BASE}/data/articles/${s.id}.json`),
          s.image_url &&
            images.add(`https://wsrv.nl/?url=${encodeURIComponent(s.image_url)}&w=800&output=webp&q=78`),
        ]);
      }
      await pages.put(marker, new Response("ok"));
      await trim(IMAGES, MAX_IMAGES);
    })(),
  );
});
