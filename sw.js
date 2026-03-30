// ═══════════════════════════════════════════════════════════
// sw.js — Service Worker for How Ardently PWA
// Caches all game files for offline play
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'how-ardently-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/game.js',
  '/events.js',
  '/actions.js',
  '/assets.js',
  '/titles.js',
  '/will.js',
  '/education.js',
  '/debut.js',
  '/lessons.js',
  '/schoolmates.js',
  '/schooling_ui.js',
  '/finance.js',
  '/pregnancy.js',
  '/wedding.js',
  '/people.js',
  '/ui.js',
  '/manifest.json',
  '/icons/launchericon-192x192.png',
  '/icons/launchericon-512x512.png',
];

// Install: cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
