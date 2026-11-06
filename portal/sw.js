'use strict';
const BUILD_VERSION = '__APP_BUILD_VERSION__';
const BASE = new URL('./', self.location.href);
const PREFIX = 'paleobiologia:' + BASE.pathname + ':';
const CORE_PREFIX = PREFIX + 'core:';
const BOOK_PREFIX = PREFIX + 'book:';
const CORE_CACHE = CORE_PREFIX + BUILD_VERSION;
const READY = new URL('app/.saved-reading', BASE).href;
const CORE_FILES = ['app/','app/index.html','app/offline.html','app/app-data.json','app/offline-book.json','assets/app.js','assets/app.css','assets/app-icon.svg','assets/app-icon-192.png','assets/app-icon-512.png','assets/app-icon-maskable-512.png','manifest.webmanifest'];
const allowedExtensions = /\.(?:html|js|css|json|webmanifest|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot|otf)$/i;
let saving = false;

function localURL(path) {
  const url = new URL(path, BASE);
  const decoded = decodeURIComponent(url.pathname);
  if (url.origin !== BASE.origin || !decoded.startsWith(BASE.pathname) || decoded.includes('\\') || url.search || url.hash) throw new Error('Ruta fuera de la lectura autorizada.');
  return url;
}
function forbidden(url) {
  const path = decodeURIComponent(url.pathname).toLowerCase();
  return path.endsWith('/asistentes/config.json') || path.includes('/api/') || /\.(?:pdf|epub|zip|docx|pptx|mp4|mp3)$/i.test(path);
}

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CORE_CACHE);
  for (const path of CORE_FILES) {
    const url = localURL(path);
    const response = await fetch(url.href, {cache:'reload'});
    if (!response.ok || response.type === 'opaque') throw new Error('No se ha podido preparar la aplicación.');
    await cache.put(url.href, response);
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(CORE_PREFIX) && name !== CORE_CACHE) await caches.delete(name);
  // Las copias del libro se conservan hasta completar una actualización solicitada.
  await self.clients.claim();
})()));

async function savedBooks() {
  const books = [];
  for (const name of await caches.keys()) {
    if (!name.startsWith(BOOK_PREFIX)) continue;
    const cache = await caches.open(name); const marker = await cache.match(READY);
    if (marker) { try { books.push({name, cache, metadata:await marker.json()}); } catch {} }
  }
  return books.sort((a,b) => b.metadata.saved_at - a.metadata.saved_at);
}
async function offlineResponse(request) {
  for (const book of await savedBooks()) {
    const match = await book.cache.match(request, {ignoreSearch:true}); if (match) return match;
    const url = new URL(request.url);
    if (url.pathname.endsWith('/')) { const index = await book.cache.match(url.origin + url.pathname + 'index.html'); if (index) return index; }
  }
  const core = await caches.open(CORE_CACHE);
  const match = await core.match(request, {ignoreSearch:true});
  if (match) return match;
  if (request.mode === 'navigate') return (await core.match(new URL('app/offline.html', BASE).href)) || new Response('Sin conexión.', {status:503});
  return new Response('Este recurso necesita conexión.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname) || forbidden(url)) return;
  event.respondWith((async () => {
    try { return await fetch(request); }
    catch { return offlineResponse(request); }
  })());
});

async function currentStatus() {
  const books = await savedBooks();
  return books.length ? {type:'status', saved:true, ...books[0].metadata, saving} : {type:'status',saved:false,saving};
}
async function downloadBook(port) {
  if (saving) throw new Error('La lectura ya se está guardando en otra ventana. Espera a que termine.');
  saving = true; let cacheName; let hadCompleteCopy = false;
  try {
    const response = await fetch(new URL('app/offline-book.json', BASE).href, {cache:'no-store'});
    if (!response.ok) throw new Error('Necesitas conexión para guardar la lectura.');
    const manifest = await response.json();
    if (!/^[a-f0-9]{64}$/.test(manifest.version) || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 2000) throw new Error('La edición no se ha podido comprobar.');
    const files = manifest.files.map(file => {
      const url = localURL(file.path);
      if (!allowedExtensions.test(url.pathname) || forbidden(url) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Un recurso no pertenece a la lectura autorizada.');
      return {...file,url:url.href};
    });
    if (new Set(files.map(f => f.url)).size !== files.length) throw new Error('La edición contiene recursos duplicados.');
    cacheName = BOOK_PREFIX + manifest.version;
    let cache = await caches.open(cacheName);
    hadCompleteCopy = !!(await cache.match(READY));
    if (hadCompleteCopy) {
      await cache.put(new URL('app/offline-book.json',BASE).href,new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
      return currentStatus();
    }
    await caches.delete(cacheName); cache = await caches.open(cacheName);
    let next = 0; let completed = 0; let bytes = 0;
    const work = async () => {
      while (next < files.length) {
        const file = files[next++];
        const item = await fetch(file.url, {cache:'reload'});
        if (!item.ok || item.type === 'opaque') throw new Error('No se ha podido descargar toda la lectura. Puedes intentarlo de nuevo.');
        const body = await item.clone().arrayBuffer();
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',body))].map(v => v.toString(16).padStart(2,'0')).join('');
        if (digest !== file.sha256 || body.byteLength !== file.bytes) throw new Error('La web se está actualizando. Espera un momento y vuelve a guardar la lectura.');
        await cache.put(file.url,item); completed++; bytes += file.bytes;
        port.postMessage({type:'progress',completed,total:files.length,percent:Math.round(completed/files.length*100)});
      }
    };
    const results = await Promise.allSettled(Array.from({length:Math.min(3,files.length)},work));
    const failed = results.find(result => result.status==='rejected'); if (failed) throw failed.reason;
    const metadata = {version:manifest.version,book_fingerprint:manifest.book_fingerprint,files:completed,bytes,saved_at:Date.now()};
    // Keep the snapshot's own metadata with it, so offline status cannot use an older core manifest.
    await cache.put(new URL('app/offline-book.json',BASE).href,new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
    await cache.put(READY,new Response(JSON.stringify(metadata),{headers:{'Content-Type':'application/json'}}));
    for (const name of await caches.keys()) if (name.startsWith(BOOK_PREFIX) && name !== cacheName) await caches.delete(name);
    return {type:'saved',saved:true,...metadata};
  } catch (error) {
    if (cacheName && !hadCompleteCopy) await caches.delete(cacheName);
    if (error.name === 'QuotaExceededError') throw new Error('No hay espacio suficiente para guardar la lectura en este dispositivo.');
    throw error;
  } finally { saving = false; }
}
self.addEventListener('message', event => {
  const port = event.ports?.[0]; if (!port) return;
  let source;
  try { source = new URL(event.source.url); } catch { return; }
  if (source.origin !== BASE.origin || !source.pathname.startsWith(BASE.pathname)) return;
  event.waitUntil((async () => {
    try {
      const type = event.data?.type;
      if (type === 'STATUS') port.postMessage(await currentStatus());
      else if (type === 'DOWNLOAD_BOOK') port.postMessage(await downloadBook(port));
      else if (type === 'REMOVE_BOOK') {
        if (saving) throw new Error('Espera a que termine el guardado antes de eliminar la copia.');
        for (const name of await caches.keys()) if (name.startsWith(BOOK_PREFIX)) await caches.delete(name);
        port.postMessage({type:'removed',saved:false});
      } else throw new Error('Operación no disponible.');
    } catch (error) { port.postMessage({type:'error',message:error.message || 'No se ha podido completar la operación.'}); }
  })());
});
