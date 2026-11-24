/* =========================================================
   Diário de Bordo — service worker
   Estratégias:
     - Navegação (HTML): network-first, com fallback para o index.html em cache
     - Arquivos estáticos (CSS, JS, ícones, manifest): stale-while-revalidate
   As entradas do diário ficam no localStorage, então continuam
   disponíveis offline sem passar pelo service worker.

   Ao alterar qualquer arquivo do app, aumente CACHE_VERSAO para
   que os usuários recebam a nova versão.
   ========================================================= */

const CACHE_VERSAO = 'diario-de-bordo-v1';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

/* Instalação: guarda o "esqueleto" do app em cache */
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_VERSAO)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* Ativação: apaga caches de versões antigas e assume as abas abertas */
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves
          .filter((chave) => chave.startsWith('diario-de-bordo-') && chave !== CACHE_VERSAO)
          .map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim())
  );
});

/* Interceptação das requisições */
self.addEventListener('fetch', (evento) => {
  const { request } = evento;

  // Só lida com GET do próprio site
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    evento.respondWith(redeComFallback(request));
  } else {
    evento.respondWith(cacheEAtualiza(evento));
  }
});

async function redeComFallback(request) {
  const cache = await caches.open(CACHE_VERSAO);
  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put('./index.html', resposta.clone());
    return resposta;
  } catch (erro) {
    // Offline: entrega a página salva (ignora ?query, ex.: start_url com parâmetros)
    return (await cache.match(request, { ignoreSearch: true })) ||
           (await cache.match('./index.html'));
  }
}

async function cacheEAtualiza(evento) {
  const { request } = evento;
  const cache = await caches.open(CACHE_VERSAO);
  const emCache = await cache.match(request, { ignoreSearch: true });

  const daRede = fetch(request)
    .then((resposta) => {
      if (resposta.ok) cache.put(request, resposta.clone());
      return resposta;
    })
    .catch(() => undefined);

  if (emCache) {
    // Responde na hora com o cache e atualiza em segundo plano
    evento.waitUntil(daRede);
    return emCache;
  }

  return (await daRede) || new Response('', { status: 504, statusText: 'Offline' });
}
