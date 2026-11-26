// Only the public offline editor and its build assets belong in this cache.
const CACHE =
  "noteworthy-editor-v1-" + (new URL(self.location.href).searchParams.get("build") || "local");
const SHELL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(SHELL, { cache: "reload", credentials: "omit" });
      if (!response.ok || response.redirected) throw new Error("Offline editor unavailable");
      const html = await response.clone().text();
      const assets = new Set(
        [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((match) =>
          match[1].replaceAll("&amp;", "&"),
        ),
      );
      if (!assets.size) throw new Error("Offline editor assets unavailable");
      const cache = await caches.open(CACHE);
      await cache.addAll([...assets]);
      await cache.put(SHELL, response);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("noteworthy-editor-") && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => (await cache.match(request)) || fetch(request)),
    );
  } else if (
    request.mode === "navigate" &&
    (/^\/notes(?:\/|$)/.test(url.pathname) || ["/", SHELL].includes(url.pathname))
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        if (url.pathname !== SHELL) {
          const target = new URL(SHELL, url);
          if (url.pathname.startsWith("/notes/"))
            target.searchParams.set("note", url.pathname.slice(7));
          return Response.redirect(target);
        }
        return (await (await caches.open(CACHE)).match(SHELL)) || Response.error();
      }),
    );
  }
});
