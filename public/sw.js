// Minimal offline service worker for the Eden of Cyrene SPA.
//
// Strategy:
//   - navigations  -> network-first, fall back to cached app shell (offline)
//   - same-origin GET assets (hashed, immutable) -> cache-first
// Vault data never travels over the network (it lives in IndexedDB), so there
// is nothing sensitive to cache here — only the static app shell.

const CACHE = "eden-shell-v1";

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
			);
			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	if (new URL(request.url).origin !== self.location.origin) return;

	if (request.mode === "navigate") {
		event.respondWith(
			(async () => {
				try {
					const fresh = await fetch(request);
					const cache = await caches.open(CACHE);
					cache.put(request, fresh.clone());
					return fresh;
				} catch {
					const cache = await caches.open(CACHE);
					return (
						(await cache.match(request)) ||
						(await cache.match("/index.html")) ||
						(await cache.match("/")) ||
						Response.error()
					);
				}
			})(),
		);
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cached = await cache.match(request);
			if (cached) return cached;
			try {
				const fresh = await fetch(request);
				if (fresh.ok) cache.put(request, fresh.clone());
				return fresh;
			} catch {
				return cached || Response.error();
			}
		})(),
	);
});
