// Offline cache for Bookshelf. Bump VERSION when you change any file.
const VERSION = 'bookshelf-v56';
const CORE = ['./', './index.html', './jszip.min.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache so we never store an old copy
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (fresh when online, cached copy when offline)
function networkFirst(req, cacheKey) {
  return fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(cacheKey || req, copy)); }
    return r;
  }).catch(() => caches.match(cacheKey || req, { ignoreSearch: true }));
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // The app page and its install settings (manifest) are always checked online first
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './index.html')); return; }
  if (url.origin === location.origin && url.pathname.endsWith('manifest.webmanifest')) { e.respondWith(networkFirst(req, './manifest.webmanifest')); return; }
  // Everything else (fonts, icons, libraries): cache first, saved for offline use
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
