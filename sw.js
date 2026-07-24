// Bump this whenever you change any cached file, so returning visitors get
// the update instead of a stale cached copy.
const CACHE_NAME = "siraa-land-v2";

const APP_SHELL = [
  "./index.html",
  "./admin.html",
  "./manifest.json",
  "./config.js",
  "./main.js",
  "./admin.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Never cache calls to the Apps Script backend — listings and enquiries
  // must always be fresh, not served from cache.
  if (url.hostname.includes("script.google.com")) {
    return;
  }

  // App shell: cache-first, falling back to network, so the site still
  // opens (though listings won't load) with no connection.
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (event.request.method === "GET" && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
