const DEFAULT_ICON = "/brand/notification-icon.png";
const DEFAULT_BADGE = "/brand/notification-badge.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
