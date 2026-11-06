'use strict';
(() => {
  const script = document.currentScript;
  if (!script) return;
  const base = new URL('../', script.src);
  const isAppHome = !!document.querySelector('.mobile-app #published-blocks');
  const storageKey = 'paleobiologia:last-reading:' + base.pathname;
  let installPrompt = null;
  let installed = matchMedia('(display-mode: standalone)').matches;
  let workerRegistration;
  let offlineManifest;
  let savedState;
  let downloading = false;
  const $ = id => document.getElementById(id);
  const element = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  const sizeLabel = bytes => (bytes / 1048576).toLocaleString('es', {maximumFractionDigits: 1}) + ' MB';
  const safeURL = value => { try { const url = new URL(value, base); return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url : null; } catch { return null; } };

  function updateInstall() {
    document.querySelectorAll('[data-install-app]').forEach(button => {
      button.hidden = installed;
      button.textContent = installPrompt ? 'Instalar aplicación' : 'Instalar en mi móvil';
    });
    if (installed && $('install-status')) $('install-status').textContent = 'Estás usando tu aplicación de lectura.';
  }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; updateInstall(); });
  window.addEventListener('appinstalled', () => { installed = true; installPrompt = null; updateInstall(); });
  document.querySelectorAll('[data-install-app]').forEach(button => button.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if ($('install-status')) $('install-status').textContent = choice.outcome === 'accepted' ? 'Instalación confirmada. Encontrarás el icono entre tus aplicaciones.' : 'Puedes volver a instalarla desde el menú del navegador.';
      } catch { if ($('install-status')) $('install-status').textContent = 'Abre el menú del navegador para instalar la aplicación.'; }
    } else {
      const help = $('instalar');
      if (help) { help.open = true; help.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center'}); }
      if ($('install-status')) $('install-status').textContent = 'Abre el menú ⋮ de Chrome y busca «Instalar aplicación» o «Añadir a pantalla de inicio».';
    }
    updateInstall();
  }));
  updateInstall();
  document.querySelectorAll('a[href="#instalar"]').forEach(link => link.addEventListener('click', () => {
    const help = $('instalar'); if (help) help.open = true;
  }));

  function connectionNotice() {
    let notice = $('paleo-offline-notice');
    if (navigator.onLine) { notice?.remove(); return; }
    if (!notice) {
      notice = element('aside', undefined, 'paleo-offline-notice'); notice.id = 'paleo-offline-notice'; notice.setAttribute('role', 'status');
      notice.append(document.createTextNode('Estás sin conexión. Los tutores y los recursos externos necesitan Internet. '));
      const link = element('a', 'Abrir la lectura guardada'); link.href = new URL('app/', base); notice.append(link);
      (document.querySelector('main') || document.body).prepend(notice);
    }
  }
  window.addEventListener('online', connectionNotice); window.addEventListener('offline', connectionNotice); connectionNotice();

  function trackReading() {
    const passages = [...document.querySelectorAll('.pasaje[data-passage-id]')].filter(node => /^C\d-B\d{2}\.P\d{3}[a-z]?$/.test(node.id));
    if (!passages.length || !('IntersectionObserver' in window)) return;
    const visible = new Map(); let timer;
    const remember = () => {
      const node = [...visible.values()].filter(node => node.getBoundingClientRect().bottom > 90).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (!node) return;
      let title = node.querySelector('h2,h3,h4,h5')?.textContent;
      if (!title) {
        const headings = [...document.querySelectorAll('main h2,main h3,main h4,main h5')];
        title = headings.filter(h => h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.textContent;
      }
      title = (title || 'Continuar la lectura').replace(/Anchor\s*$/,'').trim().slice(0,160);
      const url = new URL(location.href); url.hash = node.id; url.search = '';
      try { localStorage.setItem(storageKey, JSON.stringify({href: url.pathname + url.hash, title, saved: Date.now()})); } catch {}
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) { if (entry.isIntersecting) visible.set(entry.target.id, entry.target); else visible.delete(entry.target.id); }
      clearTimeout(timer); timer = setTimeout(remember, 1200);
    }, {rootMargin: '-15% 0px -35% 0px', threshold: 0});
    passages.forEach(node => observer.observe(node));
    window.addEventListener('pagehide', remember);
  }
  trackReading();

  async function loadContents() {
    const response = await fetch(new URL('app/app-data.json', base), {cache: 'no-cache'});
    if (!response.ok) throw new Error('No se ha podido abrir el índice.');
    const data = await response.json();
    const list = $('published-blocks'); list.replaceChildren();
    for (const block of data.blocks) {
      const url = safeURL(block.href); if (!url) continue;
      const item = element('li'); const link = element('a', block.title); link.href = url; item.append(link); list.append(item);
    }
    $('edition-label').textContent = data.blocks.length + ' apartados disponibles';
    try {
      const resume = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const url = resume && safeURL(resume.href);
      if (url && url.pathname.includes('/es/') && /^#C\d-B\d{2}\.P\d{3}[a-z]?$/.test(url.hash)) {
        $('continue-reading').href = url; $('continue-reading').textContent = 'Continuar la lectura →';
        $('resume-title').textContent = resume.title || 'Vuelve a tu último apartado';
        $('resume-label').textContent = 'Donde lo dejaste'; $('resume-description').textContent = 'Tu punto de lectura está guardado en este dispositivo.';
      }
    } catch {}
  }

  function messageWorker(type, onProgress) {
    return new Promise((resolve, reject) => {
      const worker = workerRegistration?.active || navigator.serviceWorker?.controller;
      if (!worker) { reject(new Error('El guardado aún no está preparado. Espera unos segundos y vuelve a intentarlo.')); return; }
      const channel = new MessageChannel();
      let timer;
      const resetTimer = () => { clearTimeout(timer); timer = setTimeout(() => { channel.port1.close(); reject(new Error('No se ha podido completar el guardado. Puedes intentarlo de nuevo.')); }, 90000); };
      channel.port1.onmessage = event => {
        const data = event.data;
        if (!data || typeof data.type !== 'string') return;
        if (data.type === 'progress') { resetTimer(); onProgress?.(data); return; }
        clearTimeout(timer); channel.port1.close();
        if (data.type === 'error') reject(new Error(data.message)); else resolve(data);
      };
      resetTimer(); worker.postMessage({type}, [channel.port2]);
    });
  }

  function updateSavedUI() {
    if (!isAppHome || downloading) return;
    const ready = savedState?.saved;
    $('delete-reading').hidden = !ready;
    $('save-reading').disabled = !workerRegistration || !offlineManifest || !navigator.onLine;
    if (ready && savedState.version === offlineManifest?.version) {
      $('save-reading').textContent = 'Lectura guardada'; $('save-reading').disabled = true;
      $('offline-status').textContent = 'La lectura publicada está lista para abrirse sin conexión en este dispositivo.';
    } else if (ready) {
      $('save-reading').textContent = 'Actualizar lectura guardada';
      $('offline-status').textContent = navigator.onLine ? 'Hay una nueva edición disponible para guardar.' : 'Tu copia guardada sigue disponible. Podrás actualizarla cuando te conectes.';
    } else {
      $('save-reading').textContent = 'Guardar lectura';
      $('offline-status').textContent = navigator.onLine ? 'Puedes guardar la lectura antes de salir o viajar.' : 'Conéctate para guardar la lectura por primera vez.';
    }
  }

  async function refreshSaved() { savedState = await messageWorker('STATUS'); updateSavedUI(); }
  async function downloadBook() {
    if (downloading) return;
    downloading = true; $('save-reading').disabled = true; $('delete-reading').disabled = true; $('download-progress').hidden = false;
    $('offline-status').textContent = 'Guardando el texto y las ilustraciones…';
    try {
      savedState = await messageWorker('DOWNLOAD_BOOK', data => {
        $('download-progress').value = data.percent;
        $('offline-status').textContent = 'Guardando la lectura… ' + data.percent + ' %';
      });
      downloading = false; updateSavedUI();
    } catch (error) { downloading = false; $('offline-status').textContent = error.message; $('save-reading').disabled = !navigator.onLine; }
    finally { $('delete-reading').disabled = false; $('download-progress').hidden = true; }
  }

  async function prepareHome() {
    try { await loadContents(); } catch { $('edition-label').textContent = 'Abrir el libro publicado'; }
    try {
      const response = await fetch(new URL('app/offline-book.json', base), {cache: 'no-store'});
      if (!response.ok) throw new Error('No disponible');
      offlineManifest = await response.json();
      $('offline-size').textContent = 'Descarga aproximada: ' + sizeLabel(offlineManifest.bytes) + '. Incluye los ' + offlineManifest.blocks + ' apartados publicados y sus ilustraciones.';
    } catch { $('offline-size').textContent = 'El tamaño de la lectura se mostrará al conectarte.'; }
    $('save-reading').addEventListener('click', downloadBook);
    $('delete-reading').addEventListener('click', async () => {
      if (downloading) return;
      try { await messageWorker('REMOVE_BOOK'); savedState = {saved:false}; updateSavedUI(); $('offline-status').textContent = 'La copia sin conexión se ha eliminado de este dispositivo. Puedes volver a guardarla cuando quieras.'; }
      catch (error) { $('offline-status').textContent = error.message; }
    });
    window.addEventListener('online', updateSavedUI); window.addEventListener('offline', updateSavedUI);
    updateSavedUI();
  }

  if (isAppHome) prepareHome();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register(new URL('sw.js', base), {scope: base.pathname, updateViaCache:'none'})
      .then(() => navigator.serviceWorker.ready)
      .then(registration => { workerRegistration = registration; if (isAppHome) refreshSaved().catch(() => updateSavedUI()); })
      .catch(() => { if (isAppHome) $('offline-status').textContent = 'Este navegador permite leer el libro, pero no ha podido preparar el guardado. Abre la página en Chrome para Android.'; });
  } else if (isAppHome) $('offline-status').textContent = 'Para instalar y guardar la lectura, abre esta página en Chrome para Android.';
})();
