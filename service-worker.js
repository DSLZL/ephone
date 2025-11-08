// service-worker.js

// 缓存名称，当您想强制更新缓存时，请更改此版本号，例如 'dexie-cache-v2'
const CACHE_NAME = "dexie-cache-v1";
const DEXIE_URL = "https://cdn.jsdelivr.net/npm/dexie/dist/dexie.min.js";

// 1. 安装 Service Worker 并缓存 dexie.js
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching dexie.js");
      return cache.add(DEXIE_URL);
    })
    // 移除了此处的 .then(() => self.skipWaiting())
  );
});

// 新增：监听来自客户端的消息，以响应手动更新指令
self.addEventListener("message", (event) => {
  // 如果消息的 action 是 'skipWaiting'，则执行 skipWaiting()
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// 2. 激活 Service Worker 并清理旧缓存
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log("Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // 立即控制所有客户端
        return self.clients.claim();
      })
  );
});

// 3. 拦截网络请求，对 dexie.js 应用缓存策略
self.addEventListener("fetch", (event) => {
  // 只对 dexie.js 的请求应用此策略
  if (event.request.url === DEXIE_URL) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          // Stale-While-Revalidate 策略
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });

          // 立即返回缓存版本（如果存在），同时在后台请求新版本
          return response || fetchPromise;
        });
      })
    );
  }
  // 对于其他所有请求，不进行任何操作，浏览器将正常处理
});
