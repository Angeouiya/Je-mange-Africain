const DEFAULT_ICON = "/brand/notification-icon.png";
const DEFAULT_BADGE = "/brand/notification-badge.png";
const CACHE_NAME = "jma-shell-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/brand/app-icon-192.png",
  "/brand/app-icon-512.png",
  "/brand/logo-mark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("jma-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put("/", response.clone());
      }
      return response;
    }).catch(() => caches.match("/").then((cached) => cached || Response.error())));
    return;
  }

  if (/\.(?:png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname) || url.pathname === "/manifest.json") {
    event.respondWith(caches.match(request).then((cached) => {
      const network = fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    }));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Je mange Africain", body: event.data.text() };
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visibleWindow = windows.find((client) => client.visibilityState === "visible");

    if ("setAppBadge" in self.navigator) {
      await self.navigator.setAppBadge(payload.badgeCount || 1).catch(() => undefined);
    }

    if (visibleWindow) {
      windows.forEach((client) => client.postMessage({ type: "JMA_PUSH_RECEIVED", payload }));
      return;
    }

    await self.registration.showNotification(payload.title || "Je mange Africain", {
      body: payload.body || "Une nouvelle information vous attend.",
      icon: payload.icon || DEFAULT_ICON,
      badge: DEFAULT_BADGE,
      image: payload.image,
      tag: payload.tag || "jma-update",
      renotify: true,
      vibrate: [180, 80, 180],
      timestamp: Date.now(),
      data: { url: payload.url || "/", type: payload.type || "system" },
      actions: [
        { action: "open", title: "Voir" },
        { action: "dismiss", title: "Fermer" },
      ],
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
