/* service-worker.js
   Updated for AQA Psychology app – clean cache and correct precache paths
*/
const CACHE_NAME = "aqa-psychology-v2";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-192-maskable.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./header-bg.jpg",
  "./background-bg.jpg"
];

// Install: pre-cache core assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        console.error("[SW] Precaching failed:", err);
        throw err;
      })
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

// Allow page to trigger immediate activation
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Fetch: stale-while-revalidate for same-origin GET
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Always prefer fresh HTML for page navigations so latest app changes appear immediately.
      if (req.mode === "navigate") {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200 && fresh.type === "basic") {
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const fallback = await cache.match(req, { ignoreSearch: false });
          return fallback || Response.error();
        }
      }

      const cached = await cache.match(req, { ignoreSearch: false });

      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        fetchPromise; // update in background
        return cached;
      }
      const net = await fetchPromise;
      return net || Response.error();
    })()
  );
});
