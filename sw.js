const CACHE = 'arium-dash-v2';
const SHELL = [
  '/aritech-approval-dashboard/',
  '/aritech-approval-dashboard/index.html',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API 요청 → network-first (오프라인 시 캐시)
  // POST·PDF·ZIP은 캐시하지 않음 (Cache.put은 GET만 허용 + 대용량 방지)
  if (url.hostname.includes('railway.app')) {
    const cacheable = e.request.method === 'GET'
      && !url.pathname.includes('/pdf');
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (cacheable) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 앱 셸 → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
