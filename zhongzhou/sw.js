// Service Worker for 中轴漫步 PWA
var CACHE_NAME = 'zhongzhou-v3';
var ASSETS_TO_CACHE = [
  './文脉.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-brands-400.woff2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap'
];

// Install: cache main assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(function(err) {
        console.log('[SW] Some assets failed to cache (non-critical):', err.message);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', function(event) {
  // 不拦截 API 请求
  if (event.request.url.indexOf('api.deepseek.com') !== -1 ||
      event.request.url.indexOf('api.open-meteo.com') !== -1) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      // 成功响应：缓存副本
      if (response.status === 200) {
        var cloned = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, cloned);
        });
      }
      return response;
    }).catch(function() {
      // 网络失败：使用缓存
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // 对于导航请求，返回缓存的 HTML
        if (event.request.mode === 'navigate') {
          return caches.match('./文脉.html');
        }
        return new Response('离线模式 — 此内容需要网络连接', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
