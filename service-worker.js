const CACHE_NAME = 'iekei-ramen-map-v4.3.1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/map-discovery-v2.css?v=4.3.1',
  '/map-discovery-v2.js?v=4.3.1'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith('iekei-ramen-map-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 地図タイルと外部APIはブラウザ本来の通信に任せる。
  if (url.origin !== self.location.origin) return;

  // HTMLは常にネットワークを優先し、オフライン時だけ保存済み画面を使う。
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // バージョン付きJS/CSSなどはキャッシュを利用する。
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
