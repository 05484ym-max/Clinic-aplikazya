// גרסת הקאש - כל פעם שמעדכנים קבצים באתר, כדאי לשנות את המספר הזה
// כדי לוודא שהמשתמשים מקבלים את הגרסה החדשה ולא נתקעים על גרסה ישנה שמורה
const CACHE_VERSION = 'v1';
const CACHE_NAME = `miriam-omisi-${CACHE_VERSION}`;

// קבצי "השלד" של האפליקציה - נשמרים בקאש מיד בהתקנה כדי שהאתר ייפתח מהר וגם אופליין
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './offline.html',
  './potos.jpg',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// התקנה - שומרים את קבצי השלד בקאש
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// הפעלה - מנקים קאש ישן מגרסאות קודמות
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// יירוט בקשות רשת
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // רק בקשות GET נשמרות בקאש
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // בקשות ל-Google Apps Script (קביעת תורים, מחירון, זמינות) - תמיד מהרשת,
  // כי זה מידע חי שחייב להיות מעודכן. אם אין רשת - נכשל בבירור, לא מציגים מידע ישן/שגוי.
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(req));
    return;
  }

  // ניווט לדף (למשל פתיחת האפליקציה) - מנסים רשת קודם, ואם אין - קאש, ואם אין - דף אופליין
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // שאר הקבצים הסטטיים (עיצוב, תמונות, אייקונים) - קאש קודם, ורק אם חסר פונים לרשת
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
