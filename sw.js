const CACHE_NAME = "orbimind-cache-v23";
const ASSETS = [
  "index.html",
  "style.css",
  "manifest.json",
  "three.min.js",
  "js/utils.js",
  "js/db.js",
  "js/particles.js",
  "js/shootingStar.js",
  "js/planetRenderer3D.js",
  "js/spaceEngine.js",
  "js/markdownParser.js",
  "js/voiceDictation.js",
  "js/sync.js",
  "js/main.js"
];

// Instalar Service Worker y almacenar en caché los recursos estáticos
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Responder desde caché o red
self.addEventListener("fetch", (e) => {
  // Interceptar peticiones locales o de la CDN de KaTeX
  const isTargetUrl = e.request.url.startsWith(self.location.origin) || 
                      e.request.url.startsWith("https://cdn.jsdelivr.net");
  if (isTargetUrl) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
