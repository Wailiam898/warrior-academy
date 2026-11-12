/* Whisker Academy: offline support.
   - The game page is fetched from the network first (so a player online always gets the newest version) and the last good
     copy is kept; with no internet, or a very slow one, the kept copy opens instead.
   - The icon and manifest are kept too, and refreshed quietly whenever there is internet.
   - Only this game's own files are touched. Cloud saves (supabase.co), fonts and anything else on another website go straight
     to the network, so saving, signing in and the Hall of Fame behave exactly as before (the game queues saves while offline).
   Whisker Academy and Warrior Academy share a website but live in different folders. This worker's scope is its own folder, and
   its cache name is built from that folder, so two copies of this file can never read or delete each other's files. */
const SCOPE = new URL(self.registration.scope).pathname;           // e.g. /whisker-academy/
const CACHE = 'wa-offline:' + SCOPE + ':v1';                        // bump v1 only if the list of files below changes
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-512.png'];
const SLOW_MS = 4000;                                              // online but slower than this: use the kept copy if there is one

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('wa-offline:' + SCOPE + ':') && k !== CACHE) await caches.delete(k);   // only our own old caches
    }
    await self.clients.claim();
  })());
});

const keep = async (req, res) => {
  if (res && res.ok && res.type === 'basic') { try { await (await caches.open(CACHE)).put(req, res.clone()) } catch (e) {} }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname === SCOPE + 'sw.js') return;

  if (req.mode === 'navigate') {            // the game page: newest if we can get it, last copy if not
    e.respondWith((async () => {
      const key = new Request(new URL('index.html', self.registration.scope).href);
      const net = fetch(req.url, { cache: 'no-cache' }).then(res => { keep(key, res.clone()); return res; });   // 'no-cache' = ask the server whether the page changed, so a stale browser cache can't hide a new version
      const cached = () => caches.match(key, { ignoreSearch: true });
      try {
        const have = await cached();
        if (!have) return await net;
        return await Promise.race([net, new Promise((_, no) => setTimeout(no, SLOW_MS))]);
      } catch (err) {
        net.catch(() => {});
        return (await cached()) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {              // icon, manifest: kept copy now, refreshed in the background
    const have = await caches.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then(res => keep(req, res)).catch(() => null);
    if (have) { net.catch(() => {}); return have; }
    return (await net) || Response.error();
  })());
});
