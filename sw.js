/* Service Worker für Klassenraum-Jeopardy:
   speichert die Seite, Töne und die Formel-Bibliothek, damit das Spiel
   auch ohne (stabiles) Internet im Klassenraum läuft.
   Bei Änderungen an index.html die Versionsnummer erhöhen. */
const CACHE = 'jeopardy-v4.1.0';
const CORE = ['./', './index.html', './richtig.wav', './falsch.mp3', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && url.hostname !== 'cdn.jsdelivr.net') return;

  // Seite selbst: zuerst Netz (damit Updates ankommen), sonst Zwischenspeicher
  if (sameOrigin && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Alles andere (Töne, Icons, MathJax): zuerst Zwischenspeicher
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.status === 200 || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
