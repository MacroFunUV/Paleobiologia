/* Exercise the real worker with browser-compatible Request/Response and Cache mocks. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const assert = require('node:assert/strict');
const base = 'https://macrofunuv.github.io/Paleobiologia/';
const prefix = 'paleobiologia:/Paleobiologia/:';
const stores = new Map();
const key = value => typeof value === 'string' ? value : value.url;
const caches = {
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async put(request, response) { entries.set(key(request), response.clone()); },
      async match(request, options = {}) {
        const target = new URL(key(request));
        for (const [url, response] of entries) {
          const candidate = new URL(url);
          if (candidate.href === target.href || (options.ignoreSearch && candidate.origin + candidate.pathname === target.origin + target.pathname)) return response.clone();
        }
      },
    };
  },
};
let net = new Map(); let offline = false;
const events = {};
const self = {location:{href:base+'sw.js'}, addEventListener(type, fn) { events[type] = fn; }, skipWaiting:async()=>{}, clients:{claim:async()=>{}}};
const fetch = async request => {
  if (offline) throw new TypeError('offline');
  const url = key(request);
  if (!net.has(url)) return new Response('missing', {status:404});
  return new Response(net.get(url));
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../portal/sw.js'), 'utf8'), {self, URL, caches, fetch, Response, crypto:webcrypto, Date, console, Set, Map, Uint8Array, Promise});
async function lifecycle(type) { let work; events[type]({waitUntil:p=>work=p}); await work; }
async function message(type, source=base+'app/') {
  const received = []; let work;
  events.message({data:{type}, ports:[{postMessage:value=>received.push(value)}], source:{url:source}, waitUntil:p=>work=p});
  await work; return received.at(-1);
}
async function fetchEvent(url, method='GET', mode='cors') {
  let response;
  events.fetch({request:{url,method,mode},respondWith:p=>response=p});
  return response;
}
async function manifestFor(entries, versionSeed='') {
  const files = [];
  for (const [name, text] of Object.entries(entries)) {
    const body = new TextEncoder().encode(text);
    const sha256 = Buffer.from(await webcrypto.subtle.digest('SHA-256',body)).toString('hex');
    files.push({path:name,bytes:body.length,sha256}); net.set(base+name,text);
  }
  const version = Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(files)+versionSeed))).toString('hex');
  const manifest = {version,files,blocks:7,bytes:files.reduce((sum,f)=>sum+f.bytes,0),book_fingerprint:'approved'};
  net.set(base+'app/offline-book.json',JSON.stringify(manifest)); return manifest;
}
(async () => {
  // Small installation, no automatic book/PDF or remote endpoint caching.
  const coreNames = ['app/','app/index.html','app/offline.html','app/app-data.json','app/offline-book.json','assets/app.js','assets/app.css','assets/app-icon.svg','assets/app-icon-192.png','assets/app-icon-512.png','assets/app-icon-maskable-512.png','manifest.webmanifest'];
  for (const name of coreNames) net.set(base+name, name==='app/offline.html'?'OFFLINE HELP':'CORE');
  stores.set('another-site:cache',new Map()); stores.set(prefix+'core:old',new Map());
  await lifecycle('install'); await lifecycle('activate');
  assert(stores.has('another-site:cache')); assert(!stores.has(prefix+'core:old'));
  assert(![...stores.values()].some(c=>c.has(base+'es/introduccion.html')));
  assert.equal(await message('STATUS','https://example.com/'), undefined);
  for (const [url, method] of [[base+'api/jobs','GET'],[base+'asistentes/config.json','GET'],[base+'descargas/book.pdf','GET'],[base+'query','POST'],['https://private.example/api/chat','GET']]) assert.equal(await fetchEvent(url,method),undefined);
  const first = await manifestFor({'es/introduccion.html':'APPROVED TEXT','es/assets/example.png':'ILLUSTRATION','laboratorio/deriva.html':'SIMULATION'});
  const saved = await message('DOWNLOAD_BOOK'); assert.equal(saved.saved,true); assert.equal(saved.files,3);
  offline=true;
  assert.equal((await (await fetchEvent(base+'app/offline-book.json')).json()).version,first.version);
  assert.equal(await (await fetchEvent(base+'es/introduccion.html?version=2','GET','navigate')).text(),'APPROVED TEXT');
  assert.equal(await (await fetchEvent(base+'es/assets/example.png')).text(),'ILLUSTRATION');
  assert.equal(await (await fetchEvent(base+'app/','GET','navigate')).text(),'CORE');
  assert.equal(await (await fetchEvent(base+'not-saved.html','GET','navigate')).text(),'OFFLINE HELP');
  offline=false;
  // A corrupt/interrupted update must never replace the complete previous copy.
  const next = await manifestFor({'es/introduccion.html':'NEW EDITION','es/assets/example.png':'NEW IMAGE'},'new');
  net.set(base+'es/assets/example.png','TRUNCATED');
  assert.equal((await message('DOWNLOAD_BOOK')).type,'error');
  assert.equal((await message('STATUS')).version,first.version);
  assert(!stores.has(prefix+'book:'+next.version));
  // A manifest cannot escape the project or pull private/PDF data into a cache.
  for (const badPath of ['../another-project/index.html','https://example.com/a.html','asistentes/config.json','book.pdf']) {
    net.set(base+'app/offline-book.json',JSON.stringify({...next,files:[{...next.files[0],path:badPath}]}));
    assert.equal((await message('DOWNLOAD_BOOK')).type,'error');
    assert.equal((await message('STATUS')).version,first.version);
  }
  const final = await manifestFor({'es/introduccion.html':'NEW EDITION','es/assets/example.png':'NEW IMAGE'},'complete');
  assert.equal((await message('DOWNLOAD_BOOK')).version,final.version);
  assert(!stores.has(prefix+'book:'+first.version));
  await lifecycle('activate'); assert.equal((await message('STATUS')).saved,true);
  await message('REMOVE_BOOK'); assert.equal((await message('STATUS')).saved,false);
  assert(stores.has('another-site:cache'));
  console.log('PWA: instalación ligera, alcance privado, lectura sin conexión, integridad, actualización interrumpida y borrado aislado: correctos.');
})().catch(error=>{console.error(error);process.exitCode=1;});
