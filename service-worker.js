const CACHE_NAME = 'iekei-ramen-map-v5';
const urlsToCache = [
  '/iekei-ramen-test/',
  '/iekei-ramen-test/index.html',
  '/iekei-ramen-test/manifest.json'
];

// インストール時
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
  // 新しいService Workerをすぐにアクティブ化
  self.skipWaiting();
});

// アクティベーション時
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // すべてのクライアントを即座に制御
  return self.clients.claim();
});

// フェッチ時（キャッシュ戦略）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 地図タイルはネットワーク優先
  if (url.hostname.includes('openstreetmap.org') || 
      url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // オフライン時は地図なしで動作
          return new Response('オフラインです', { status: 503 });
        })
    );
    return;
  }
  
  // その他のリソースはキャッシュ優先
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // なければネットワークから取得
        return fetch(event.request).then((response) => {
          // 有効なレスポンスかチェック
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // オフライン時の代替表示
          return new Response('オフラインです。キャッシュされたコンテンツのみ利用可能です。', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
