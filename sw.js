// Keeps the site installable, opens it instantly from the phone's own copy,
// and shows pop-ups that carry only the app name (never message text).
const C = "sam-v9";
const PRE = ["./", "index.html", "logo.png", "favicon.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(
  caches.open(C).then(c => c.addAll(PRE).catch(() => {})).then(() => self.skipWaiting())
));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => clients.claim())
));
// open from the saved copy at once, refresh it quietly in the background.
// The refresh skips the browser's own HTTP cache, so a new deploy is always seen.
async function swr(e, nav) {
  const r = e.request, c = await caches.open(C), key = nav ? new Request(self.registration.scope) : r;
  const hit = await c.match(key, { ignoreSearch: nav });
  const net = fetch(r.url, { cache: "no-cache", credentials: "same-origin" })
    .then(x => { if (x && !x.redirected && x.ok) c.put(key, x.clone()); return x; })
    .catch(() => hit || Response.error());
  e.waitUntil(net.catch(() => {}));
  return hit || net;
}
// files that never change (versioned libraries, font files): saved copy first
async function cf(r) {
  const c = await caches.open(C), hit = await c.match(r);
  if (hit) return hit;
  const x = await fetch(r);
  if (x && (x.ok || x.type === "opaque")) c.put(r, x.clone());
  return x;
}
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (u.pathname.endsWith("version.json")) return; // always asked live, so the update prompt works
    e.respondWith(swr(e, r.mode === "navigate"));
  } else if (u.hostname === "cdnjs.cloudflare.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(cf(r));
  } else if (u.hostname === "fonts.googleapis.com") {
    e.respondWith(swr(e, false));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});
// Used when real background push is added later. Never shows message text.
self.addEventListener('push', e => e.waitUntil(
  self.registration.showNotification('Samhima book', { body: 'Tap to open', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'sh' })
));
