const CACHE_NAME = "orbimind-cache-v46";
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
  "js/main.js",
  "js/defaultSystems.js",
  "js/tutorial.js",
  "images/ciclo_carnot.png",
  "images/influencia_social.png",
  "images/timeline_arte.png",
  "images/mapa_roma.png",
  "images/red_neuronal.png",
  "images/kirchner.png",
  "images/nolde.png",
  "images/schmidt_rottluff.png",
  "images/picasso.png",
  "images/braque.png",
  "images/gris.png",
  "images/duchamp.png",
  "images/hoch.png",
  "images/tzara.png",
  "images/dali.png",
  "images/magritte.png",
  "images/miro.png",
  "images/pollock.png",
  "images/de_kooning.png",
  "images/kline.png"
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

// Responder utilizando estrategia Network-First para asegurar actualizaciones
self.addEventListener("fetch", (e) => {
  const isTargetUrl = e.request.url.startsWith(self.location.origin) || 
                      e.request.url.startsWith("https://cdn.jsdelivr.net");
  if (isTargetUrl) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request, { ignoreSearch: true });
        })
    );
  }
});
