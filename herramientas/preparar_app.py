"""Prepare the installable reader without changing the approved manuscript."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import posixpath
import re

ROOT = Path(__file__).resolve().parents[1]
PORTAL = ROOT / 'portal'
ALLOWED = {'.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.png',
           '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.otf'}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def app_head(prefix):
    return '\n'.join([
        '<!-- paleo-app:start -->',
        f'<link rel="manifest" href="{prefix}manifest.webmanifest">',
        '<meta name="theme-color" content="#285d55">',
        f'<link rel="apple-touch-icon" href="{prefix}assets/app-icon-192.png">',
        f'<link rel="stylesheet" href="{prefix}assets/app.css">',
        f'<script src="{prefix}assets/app.js" defer></script>',
        '<!-- paleo-app:end -->',
    ])


def prepare():
    edition = json.loads((ROOT / 'edicion.json').read_text(encoding='utf8'))
    assert all(b.get('accepted') for b in edition['blocks'])
    fingerprint = hashlib.sha256(json.dumps([
        [b['id'], b['source_sha256']] for b in edition['blocks']
    ], separators=(',', ':')).encode()).hexdigest()
    write_json(PORTAL / 'manifest.webmanifest', {
        'id': './', 'name': 'Paleobiología Esencial', 'short_name': 'Paleobiología',
        'description': 'Libro abierto, tutores y actividades de paleobiología.',
        'lang': 'es', 'start_url': './app/', 'scope': './', 'display': 'standalone',
        'background_color': '#fcfbf7', 'theme_color': '#285d55',
        'prefer_related_applications': False,
        'icons': [
            {'src': 'assets/app-icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
            {'src': 'assets/app-icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
            {'src': 'assets/app-icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
        'shortcuts': [
            {'name': 'Leer el libro', 'url': './es/introduccion.html'},
            {'name': 'Tutores por temas', 'url': './asistentes/'},
            {'name': 'Explorar la deriva genética', 'url': './laboratorio/deriva.html'},
        ],
    })
    write_json(PORTAL / 'app/app-data.json', {
        'edition': edition['version'], 'book_fingerprint': fingerprint,
        'blocks': [{'id': b['id'], 'title': b['title'],
                    'href': f"es/{b['chapter_file']}.html#{b['passages'][0]}"}
                   for b in edition['blocks']],
    })
    for path in PORTAL.rglob('*.html'):
        prefix = '../' * len(path.relative_to(PORTAL).parts[:-1])
        text = path.read_text(encoding='utf8')
        text = re.sub(r'\s*<!-- paleo-app:start -->.*?<!-- paleo-app:end -->\s*', '', text, flags=re.S)
        # The app's own initial styles are now included by this common head.
        text = text.replace(f'<link rel="stylesheet" href="{prefix}assets/app.css">', '')
        text = text.replace('</head>', '\n' + app_head(prefix) + '\n</head>')
        if 'aria-label="Principal"' in text and f'href="{prefix}app/"' not in text:
            text = text.replace('</nav>', f'<a href="{prefix}app/">App móvil</a></nav>', 1)
        if path == PORTAL / 'descargas.html' and '<!-- app-download -->' not in text:
            card = ('<!-- app-download --><section class="section paleo-app-download">'
                    '<p class="eyebrow">En tu móvil</p><h2>Tu aplicación de lectura</h2>'
                    '<p>Instala Paleobiología desde esta web, con icono propio. Puedes guardar '
                    'la lectura publicada y sus ilustraciones para consultarlas sin conexión.</p>'
                    '<a class="button" href="app/">Abrir e instalar la aplicación →</a></section>')
            text = text.replace('</main>', card + '</main>')
        path.write_text(text, encoding='utf8')
    book = ROOT / 'ediciones/es'
    (book / 'app-head.html').write_text(app_head('../') + '\n', encoding='utf8')
    config_path = book / '_quarto.yml'
    config = config_path.read_text(encoding='utf8')
    if 'include-in-header: app-head.html' not in config:
        config = config.replace('    include-after-body: pasajes.html',
                                '    include-in-header: app-head.html\n    include-after-body: pasajes.html')
    if 'text: App móvil' not in config:
        config = config.replace('      - text: Descargas\n        href: ../descargas.html',
                                '      - text: Descargas\n        href: ../descargas.html\n'
                                '      - text: App móvil\n        href: ../app/')
    config_path.write_text(config, encoding='utf8')


class Dependencies(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attr in ('href', 'src', 'poster'):
            if attrs.get(attr):
                self.urls.append(attrs[attr])
        if attrs.get('srcset') and not attrs['srcset'].startswith('data:'):
            self.urls.extend(part.strip().split()[0] for part in attrs['srcset'].split(',') if part.strip())


def finalize(site):
    """An explicit, hash-checked offline snapshot; never private/API/PDF data."""
    site = site.resolve()
    queue = ['index.html', 'app/index.html', 'app/offline.html', 'app/app-data.json',
             'manifest.webmanifest', 'es/index.html', 'es/introduccion.html',
             'es/bibliografia.html', 'es/licencia.html', 'es/search.json', 'recursos.html', 'ejercicios.html',
             'descargas.html', 'creditos.html', 'asistentes/index.html',
             'asistentes/integracion.js', 'asistentes/integracion.css',
             'asistentes/tutores.json', 'asistentes/ammonite.svg', 'laboratorio/deriva.html',
             'assets/app-icon.svg', 'assets/app-icon-192.png', 'assets/app-icon-512.png',
             'assets/app-icon-maskable-512.png']
    found = set()
    while queue:
        name = queue.pop()
        if name in found or name in ('sw.js', 'app/offline-book.json', 'asistentes/config.json'):
            continue
        path = (site / name).resolve()
        if not path.is_relative_to(site) or path.suffix.lower() not in ALLOWED or not path.is_file():
            continue
        found.add(name)
        urls = []
        if path.suffix == '.html':
            parser = Dependencies()
            parser.feed(path.read_text(encoding='utf8'))
            urls = parser.urls
        elif path.suffix == '.css':
            css = path.read_text(encoding='utf8')
            urls = re.findall(r'url\(\s*[\'"]?([^\)\'"\s]+)', css)
            urls += re.findall(r'@import\s+[\'"]([^\'"]+)', css)
        for ref in urls:
            url = urlsplit(ref)
            if url.scheme or url.netloc or not url.path or url.path.startswith('/'):
                continue
            relative = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(url.path)))
            if (site / relative).is_dir():
                relative = posixpath.join(relative, 'index.html')
            queue.append(relative)
    files = [{'path': name, 'bytes': (site / name).stat().st_size,
              'sha256': hashlib.sha256((site / name).read_bytes()).hexdigest()} for name in sorted(found)]
    version = hashlib.sha256(json.dumps(files, separators=(',', ':')).encode()).hexdigest()
    data = json.loads((site / 'app/app-data.json').read_text(encoding='utf8'))
    write_json(site / 'app/offline-book.json', {
        'version': version, 'book_fingerprint': data['book_fingerprint'],
        'blocks': len(data['blocks']), 'bytes': sum(f['bytes'] for f in files), 'files': files,
    })
    worker = (PORTAL / 'sw.js').read_text(encoding='utf8')
    assert worker.count('__APP_BUILD_VERSION__') == 1
    (site / 'sw.js').write_text(worker.replace('__APP_BUILD_VERSION__', version), encoding='utf8')
    assert not any('config.json' == Path(f['path']).name or '/api/' in f['path'] for f in files)
    print(f"Aplicación preparada: {len(files)} recursos; {sum(f['bytes'] for f in files) / 1048576:.1f} MB de lectura opcional.")


if __name__ == '__main__':
    prepare()
