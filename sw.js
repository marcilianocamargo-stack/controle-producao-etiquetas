const CACHE_NAME = 'prime-producao-etiquetas-v4';

const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1) A programação NUNCA é cacheada — sempre rede (garante os dados do dia).
  if (url.pathname.endsWith('programacao-hoje.xlsx')) {
    return; // deixa o fetch original (com no-store) buscar direto da rede
  }

  // 2) index.html / navegação: REDE PRIMEIRO (app sempre atualizado),
  //    cache só como reserva quando estiver offline.
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3) Demais arquivos (bibliotecas, manifest, ícones): cache primeiro.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
