// Service Worker — separate Caches: "shell" für die App-Dateien, "static" für Bilder.
// Strategie:
//   - HTML/JS/CSS: network-first mit Cache-Fallback (Updates kommen direkt an).
//   - Bilder/Icons: cache-first (selten Änderungen).
// Beim Versions-Bump unten wird der alte Shell-Cache entsorgt.
const VERSION = "v12";
const SHELL_CACHE = `gym-shell-${VERSION}`;
const STATIC_CACHE = `gym-static-${VERSION}`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./plan.js",
  "./exercises.js",
  "./manifest.json"
];
const STATIC_ASSETS = [
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL_ASSETS);
    const stat = await caches.open(STATIC_CACHE);
    await stat.addAll(STATIC_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE)
        .map((k) => caches.delete(k))
    );
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isImage = /\.(png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname);
  if (isImage) {
    e.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  e.respondWith(networkFirst(req, SHELL_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return new Response("", { status: 504 });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const hit = await cache.match(req);
    if (hit) return hit;
    // Letzter Fallback fürs SPA-Skeleton
    const fallback = await cache.match("./index.html");
    return fallback || new Response("Offline", { status: 504 });
  }
}
