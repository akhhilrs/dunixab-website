/* Dunixab service worker. Its only job is the offline page: pages always load from the network as normal,
   and when that fails (the visitor has no connection) /offline.html is shown instead. Nothing else is cached.
   Change CACHE whenever offline.html changes, so visitors' browsers pick up the new copy. */
const CACHE = 'dunixab-offline-1';
const PAGE = '/offline.html';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(new Request(PAGE, {cache: 'reload'}))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;   // images, CSS and scripts are left to the browser
  e.respondWith(fetch(e.request).catch(() => caches.match(PAGE)));
});
