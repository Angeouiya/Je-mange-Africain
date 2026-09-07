const DEFAULT_ICON = "/brand/notification-icon-burgundy.png";
const DEFAULT_BADGE = "/brand/notification-badge.png";
const CACHE_NAME = "jma-shell-v5";
const PUBLIC_API_CACHE_NAME = "jma-public-api-v1";
const PUBLIC_API_CACHE_MAX_ENTRIES = 80;
const PUBLIC_API_DEFAULT_MAX_AGE_MS = 30 * 1000;
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/brand/app-icon-192-burgundy.png",
  "/brand/app-icon-512-burgundy.png",
  "/brand/logo-mark-burgundy.png",
];
const ACTIVE_CACHES = [CACHE_NAME, PUBLIC_API_CACHE_NAME];
const PUBLIC_API_ROUTES = [
  /^\/api\/advertisements$/,
  /^\/api\/brands$/,
  /^\/api\/catalog$/,
  /^\/api\/categories$/,
  /^\/api\/dishes$/,
  /^\/api\/platform$/,
  /^\/api\/search$/,
  /^\/api\/products\/[^/]+$/,
  /^\/api\/recipes$/,
  /^\/api\/recipes\/[^/]+$/,
];
const SAFE_NOTIFICATION_VIEWS = new Set([
  "home",
  "catalog",
  "wholesale",
  "product",
  "recipes",
  "recipe-config",
  "cart",
  "checkout",
  "order-confirmation",
  "orders",
  "order-tracking",
  "account",
  "info",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("jma-") && !ACTIVE_CACHES.includes(key)).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isLocalDevelopmentHost(url) && url.pathname.startsWith("/api/")) return;

  if (isPublicApiRequest(url)) {
    event.respondWith(publicApiResponse(event));
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
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

function isPublicApiRequest(url) {
  return PUBLIC_API_ROUTES.some((pattern) => pattern.test(url.pathname));
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return await caches.match(request)
      || await caches.match("/")
      || await caches.match(OFFLINE_URL)
      || new Response("Je mange Africain offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
  }
}

function isLocalDevelopmentHost(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
}

async function publicApiResponse(event) {
  const request = event.request;
  const cached = await caches.match(request);

  if (cached && isFreshPublicApiResponse(cached)) {
    event.waitUntil(refreshPublicApiResponse(request).catch(() => undefined));
    return cached;
  }

  try {
    return await refreshPublicApiResponse(request);
  } catch {
    return cached || Response.error();
  }
}

async function refreshPublicApiResponse(request) {
  const response = await fetch(request);
  if (isCacheablePublicApiResponse(response)) {
    const cache = await caches.open(PUBLIC_API_CACHE_NAME);
    await cache.put(request, await responseWithCachedAt(response));
    await trimPublicApiCache(cache);
  }
  return response;
}

function isCacheablePublicApiResponse(response) {
  return response.ok
    && response.status === 200
    && response.headers.get("content-type")?.includes("application/json")
    && !response.headers.get("cache-control")?.includes("no-store");
}

async function responseWithCachedAt(response) {
  const headers = new Headers(response.headers);
  headers.set("X-JMA-Cached-At", String(Date.now()));
  return new Response(await response.clone().arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isFreshPublicApiResponse(response) {
  const cachedAt = Number(response.headers.get("X-JMA-Cached-At") || 0);
  if (!cachedAt) return false;
  const maxAge = maxAgeMs(response.headers.get("cache-control"));
  return Date.now() - cachedAt < maxAge;
}

function maxAgeMs(cacheControl) {
  const match = cacheControl?.match(/(?:^|,\s*)max-age=(\d+)/i);
  return match ? Number(match[1]) * 1000 : PUBLIC_API_DEFAULT_MAX_AGE_MS;
}

async function trimPublicApiCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= PUBLIC_API_CACHE_MAX_ENTRIES) return;
  await Promise.all(keys.slice(0, keys.length - PUBLIC_API_CACHE_MAX_ENTRIES).map((key) => cache.delete(key)));
}

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
  const targetUrl = safeNotificationTargetUrl(event.notification.data?.url);

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

function safeNotificationTargetUrl(value) {
  try {
    const notificationUrl = new URL(value || "/", self.location.origin);
    if (notificationUrl.origin !== self.location.origin || notificationUrl.pathname !== "/") {
      return new URL("/", self.location.origin).href;
    }

    const view = notificationUrl.searchParams.get("view") || "home";
    if (!SAFE_NOTIFICATION_VIEWS.has(view)) return new URL("/", self.location.origin).href;
    if (view === "product" && !notificationUrl.searchParams.get("productId")) return new URL("/", self.location.origin).href;
    if (view === "recipe-config" && !notificationUrl.searchParams.get("recipeId")) return new URL("/", self.location.origin).href;
    if ((view === "order-tracking" || view === "order-confirmation") && !notificationUrl.searchParams.get("orderId")) return new URL("/", self.location.origin).href;
    return notificationUrl.href;
  } catch {
    return new URL("/", self.location.origin).href;
  }
}
