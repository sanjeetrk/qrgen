
const CACHE_NAME = "auto-qr-generator-v2";

const APP_FILES = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./qrcode.min.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ─── Install ────────────────────────────────────────────────────────────────
// Pre-cache all app shell files so the app works on first offline visit.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_FILES);
      // Activate immediately without waiting for old SW to be released.
      await self.skipWaiting();
    })
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────
// Delete any caches from previous versions of this app.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith("auto-qr-generator-") && name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );
      // Take control of all open clients without a reload.
      await self.clients.claim();
    })
  );
});

// ─── Fetch – Stale-While-Revalidate ─────────────────────────────────────────
// Strategy:
//   1. Respond with the cached version IMMEDIATELY (instant load, works offline).
//   2. In the background, fetch the network version and update the cache.
//   3. On the NEXT request the freshest version is served.
//
// Only handles same-origin GET requests; all others pass through untouched.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Pass through non-GET requests (POST, etc.)
  if (request.method !== "GET") return;

  // Only intercept requests from this app's own origin.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Stale-While-Revalidate helper.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fire a background fetch to refresh the cache regardless.
  const networkFetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        // Store a clone; the original is returned (or discarded if cache hit).
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null); // Network unavailable – that's fine, we have cache.

  // If we have a cached copy, return it immediately and let the
  // network fetch update the cache silently in the background.
  if (cachedResponse) {
    return cachedResponse;
  }

  // No cache hit yet (first-ever visit or cache cleared):
  // wait for the network and cache the result.
  const networkResponse = await networkFetchPromise;
  if (networkResponse) return networkResponse;

  // Both cache and network failed – return a friendly offline page.
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>BB QR – Offline</title>
  <style>
    body{margin:0;min-height:100dvh;display:flex;align-items:center;
         justify-content:center;flex-direction:column;gap:12px;
         background:#0b0f19;color:#f8fafc;font-family:system-ui,sans-serif;
         text-align:center;padding:24px;}
    h1{font-size:1.4rem;margin:0;}
    p{color:#94a3b8;font-size:0.9rem;margin:0;}
    button{margin-top:8px;padding:10px 24px;border-radius:8px;border:none;
           background:#2563eb;color:#fff;font-size:0.9rem;cursor:pointer;}
  </style>
</head>
<body>
  <h1>📶 You're offline</h1>
  <p>The page isn't cached yet. Connect and reload once to enable offline use.</p>
  <button onclick="location.reload()">Retry</button>
</body>
</html>`,
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
