const CACHE = 'arium-dash-v3';
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

  // 화면(HTML) → network-first.
  // 예전엔 화면까지 cache-first라, 새 버전을 올려도 이미 설치·방문한 사람은
  // 옛 화면을 계속 봤다. 화면은 늘 최신을 받고, 오프라인일 때만 캐시를 쓴다.
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)
          .then(r => r || caches.match('/aritech-approval-dashboard/index.html')))
    );
    return;
  }

  // 나머지(라이브러리·글꼴·아이콘) → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
