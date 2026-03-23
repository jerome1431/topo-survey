const CACHE = 'topo-survey-v1';

// Tous les assets à mettre en cache au démarrage
const PRECACHE = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap',
  'https://fonts.gstatic.com/s/dmmono/v14/aFTR7PB1QTsUX8KYvrGyIYSnbKX9Zl8.woff2',
  'https://fonts.gstatic.com/s/dmmono/v14/aFTR7PB1QTsUX8KYth-QIYSnbKX9Zl8.woff2',
  'https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => {
        // Précache les ressources locales, ignore les erreurs réseau pour les fonts
        return Promise.allSettled(PRECACHE.map(url => c.add(url).catch(()=>{})));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Stratégie Cache First pour les fonts Google
  if(url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')){
    e.respondWith(
      caches.match(e.request).then(cached => {
        if(cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Stratégie Cache First pour index.html (mode hors-ligne)
  if(url.endsWith('/') || url.endsWith('/index.html') || url.endsWith('.html')){
    e.respondWith(
      caches.match(e.request).then(cached => {
        // Essaie le réseau, retombe sur le cache si hors-ligne
        return fetch(e.request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
          })
          .catch(() => cached || caches.match('/index.html'));
      })
    );
    return;
  }

  // Pour tout le reste : réseau avec fallback cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
