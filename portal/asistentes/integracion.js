'use strict';
(async () => {
  const script = document.currentScript || [...document.scripts].find(s => new URL(s.src, location.href).pathname.endsWith('/asistentes/integracion.js'));
  if (!script || document.getElementById('paleo-mascota')) return;
  const assets = new URL('.', script.src);
  let config, registry;
  try {
    const results = await Promise.all([fetch(new URL('config.json', assets), {cache: 'no-store'}), fetch(new URL('tutores.json', assets), {cache: 'no-cache'})]);
    if (results.some(r => !r.ok)) return;
    [config, registry] = await Promise.all(results.map(r => r.json()));
  } catch { return; }
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('integracion.css', assets); document.head.append(css);
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const docs = new Map(registry.documents.map(d => [d.key, d]));
  let endpoint;
  try { if (config.endpoint) { endpoint = new URL(config.endpoint); if (endpoint.protocol !== 'https:') endpoint = null; } } catch {}
  function information(tutor) {
    const footer = make('aside', 'paleo-information');
    footer.append(make('p', '', 'Este tutor utiliza inteligencia artificial. Contrasta sus respuestas con el manual y las fuentes citadas.'));
    const details = make('details'); details.append(make('summary', '', 'Leer más sobre este tutor'));
    for (const text of [
      'Este asistente acompaña tu estudio de la paleobiología y te ayuda a explorar conceptos, relacionar ideas y encontrar lecturas pertinentes.',
      'Utiliza un modelo de lenguaje ejecutado mediante Ollama. Su adaptación a la asignatura combina instrucciones docentes con la consulta de fragmentos del manual publicado y de los documentos habilitados para este tema. La selección de esos documentos no modifica el entrenamiento previo del modelo. El alcance de las respuestas depende de los materiales incorporados y de los fragmentos que consigue recuperar.',
      'Puede cometer errores, omitir matices, confundir conceptos o atribuir a una fuente algo que esta no sostiene. Una explicación convincente, extensa o acompañada de citas puede contener inexactitudes. Las respuestas se generan durante la conversación y requieren contraste con las fuentes originales.',
      'Úsalo como herramienta de apoyo y exploración. Para preparar el examen o elaborar trabajos, fundamenta tus conclusiones en el manual, las lecturas y las orientaciones del profesorado. Comprueba los pasajes originales, especialmente las fechas, las atribuciones y las cuestiones discutidas. Si detectas una respuesta dudosa, consúltala con el profesorado.',
      'Este recurso forma parte de PaleoBot-UV, proyecto de innovación educativa PIEE-4422537 de la Universitat de València, desarrollado en el marco de la convocatoria del Rectorado para el curso 2026–2027. Agradecemos al Servei de Formació Permanent i Innovació Educativa su labor de impulso y apoyo a la innovación docente.',
    ]) details.append(make('p', '', text));
    const references = make('details'); references.append(make('summary', '', 'Fuentes bibliográficas de este tutor'));
    references.append(make('p', '', registry.book_citation));
    if (tutor) {
      for (const [title, keys] of [['Lecturas principales del tema', tutor.priority_readings], ['Bibliografía complementaria', tutor.secondary_references], ['Libros generales de apoyo', tutor.background_documents]]) {
        if (!keys.length) continue;
        references.append(make('h4', '', title));
        for (const key of keys) { const doc = docs.get(key); if (doc) references.append(make('p', 'paleo-reference', doc.citation)); }
      }
      references.append(make('p', 'paleo-small', 'Biblioteca preparada para esta edición. El servicio debe confirmar la misma versión para permitir la conversación. Las referencias de una respuesta corresponden a los fragmentos recuperados en esa consulta.'));
    } else references.append(make('p', '', 'La mascota consulta el manual publicado. Los tutores temáticos añaden sus lecturas específicas.'));
    footer.append(details, references); return footer;
  }
  function frame(scope) {
    const holder = make('div', 'paleo-frame-holder');
    const status = make('p', 'paleo-status', 'Conectando con el asistente…'); holder.append(status);
    if (!config.enabled || !endpoint) { status.textContent = 'La conversación está pendiente de conexión con el equipo de oficina. Puedes consultar las fuentes y continuar leyendo.'; return holder; }
    const iframe = make('iframe'); iframe.title = scope === 'general' ? 'Asistente general de Paleobiología' : 'Tutor ' + scope;
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups'); iframe.referrerPolicy = 'no-referrer';
    const url = new URL('/embed.html', endpoint); url.searchParams.set('scope', scope); url.searchParams.set('book', config.book_fingerprint); url.searchParams.set('registry', config.registry_fingerprint); if (scope !== 'general') url.searchParams.set('embedded', '1'); iframe.src = url.href; iframe.hidden = true;
    const listener = event => {
      if (event.origin !== endpoint.origin || event.source !== iframe.contentWindow || event.data?.type !== 'paleo-ready') return;
      clearTimeout(timer);
      if (event.data.book_fingerprint !== config.book_fingerprint || event.data.registry_fingerprint !== config.registry_fingerprint) { status.textContent = 'El equipo de oficina necesita actualizar la biblioteca de esta edición antes de activar este tutor.'; return; }
      status.hidden = true; iframe.hidden = false; window.removeEventListener('message', listener);
    };
    const timer = setTimeout(() => { status.textContent = 'El asistente no está disponible o necesita actualizarse. Puedes continuar leyendo y consultar las fuentes del tutor.'; window.removeEventListener('message', listener); }, 20000);
    window.addEventListener('message', listener); holder.append(iframe); return holder;
  }
  for (const tutor of registry.tutors) {
    const last = document.getElementById(tutor.after_passage); if (!last) continue;
    const section = make('section', 'paleo-tutor'); section.id = 'tutor-' + tutor.id;
    if (tutor.id === 'C1-T01') { const alias = make('span'); alias.id = 'tutor-C1-B01'; section.append(alias); }
    const details = make('details'); details.append(make('summary', '', 'Conversar sobre este tema · ' + tutor.title));
    details.append(make('p', 'paleo-intro', tutor.id + ' · ' + tutor.block + ' · Consulta el tema y sus lecturas. Puedes continuar la conversación o pedir una explicación más extensa. Acceso con la clave de aula.'));
    const footer = information(tutor); details.append(footer); let loaded = false;
    details.addEventListener('toggle', () => { if (details.open && !loaded) { loaded = true; footer.before(frame(tutor.id)); } });
    section.append(details); last.insertAdjacentElement('afterend', section);
    if (location.hash === '#' + section.id || (tutor.id === 'C1-T01' && location.hash === '#tutor-C1-B01')) { details.open = true; requestAnimationFrame(() => section.scrollIntoView({block: 'start'})); }
  }
  const toggle = make('button', 'paleo-mascota'); toggle.id = 'paleo-mascota'; toggle.type = 'button'; toggle.setAttribute('aria-label', 'Abrir el asistente del libro'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'paleo-panel');
  const icon = make('img'); icon.src = new URL('ammonite.svg', assets); icon.alt = ''; toggle.append(icon, make('span', '', 'Pregunta al libro'));
  const panel = make('section', 'paleo-panel'); panel.id = 'paleo-panel'; panel.setAttribute('aria-label', 'Asistente del libro'); panel.hidden = true;
  const bar = make('div', 'paleo-panel-bar'); bar.append(make('span', '', 'Tu acompañante de lectura'));
  const close = make('button', '', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Cerrar el asistente del libro'); bar.append(close); panel.append(bar); let loaded = false;
  function open(value) { panel.hidden = !value; toggle.setAttribute('aria-expanded', String(value)); if (value && !loaded) { loaded = true; panel.append(frame('general')); } if (value) close.focus(); else toggle.focus(); }
  toggle.addEventListener('click', () => open(panel.hidden)); close.addEventListener('click', () => open(false)); document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) open(false); }); document.body.append(panel, toggle);
})();
