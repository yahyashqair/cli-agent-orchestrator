const CACHE_NAME = 'cao-ui-cache-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-1024.png',
  '/icons/output.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const requestURL = new URL(request.url)
  if (requestURL.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        event.waitUntil(
          fetch(request)
            .then((networkResponse) => {
              if (!networkResponse || networkResponse.status !== 200) {
                return
              }
              return caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone())
              })
            })
            .catch(() => {
              // Ignore network errors during background refresh
            }),
        )
        return cachedResponse
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque'
          ) {
            return networkResponse
          }

          const clonedResponse = networkResponse.clone()
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clonedResponse))
            .catch(() => {
              // Ignore cache write errors
            })
          return networkResponse
        })
        .catch(() => caches.match('/index.html'))
    }),
  )
})
