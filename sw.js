// Service worker: ทำให้ติดตั้งลงหน้าจอได้ + เล่นออฟไลน์ได้ (แคชไฟล์เกม)
const CACHE = 'marble-4.1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.ico', './favicon-32.png',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
];
// โฮสต์ของ Firebase/Google — ต้องผ่านตรงไปเน็ตเวิร์กเสมอ (ห้ามแคช ไม่งั้นข้อมูลเรียลไทม์ค้าง)
const BYPASS = /(^|\.)(firebaseio\.com|firebasedatabase\.app|googleapis\.com|google\.com|gstatic\.com)$/i;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' }))))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  let host = '';
  try { host = new URL(e.request.url).hostname; } catch (err) { }
  // ปล่อยคำขอ Firebase/Google ผ่านตรงทั้งหมด — รวม gstatic (SDK) ด้วย
  // (ห้ามแคช SDK: เคยทำให้ได้ของค้าง/เวอร์ชันไม่ตรงกันตอนอัพเดต แล้วต่อฐานข้อมูลไม่ได้)
  if (BYPASS.test(host)) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {}); return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
