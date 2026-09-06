const CACHE = "folio-static-v14";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "i18n.js",
  "db.js",
  "import.js",
  "config.js",
  "pwa.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

function isSupabaseRequest(url) {
  return url.hostname.endsWith("supabase.co");
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isAppShell(url) {
  if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) return true;
  return /\.(js|css|webmanifest|html)$/i.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy));
  return response;
}

function fromCache(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match("index.html");
    return cached;
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSupabaseRequest(url) || !isSameOrigin(url)) return;

  if (isAppShell(url) || request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() => fromCache(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() => fromCache(request));
    })
  );
});
