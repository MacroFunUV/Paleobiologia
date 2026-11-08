from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
def prepare():
    config=ROOT/'portal/asistentes/config.json'
    if not config.exists():return
    edition=json.loads((ROOT/'edicion.json').read_text(encoding='utf-8'))
    pairs=[(b['id'],b['source_sha256']) for b in edition['blocks']]
    digest=hashlib.sha256(json.dumps(pairs,separators=(',',':')).encode()).hexdigest()
    data=json.loads(config.read_text(encoding='utf-8'))
    if data.get('book_fingerprint')!=digest:
        data.update(enabled=False,endpoint='',book_fingerprint=digest)
        data.pop('transition',None)
    transition=data.get('transition')
    if transition:
        covered=transition['covered_blocks']
        prefix=pairs[:len(covered)]
        previous=hashlib.sha256(json.dumps(prefix,separators=(',',':')).encode()).hexdigest()
        if not covered or covered!=[key for key,_ in prefix] or previous!=transition['book_fingerprint']:
            data.pop('transition',None)
    config.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    include=ROOT/'ediciones/es/pasajes.html';text=include.read_text(encoding='utf-8')
    # La conexión temporal puede cambiar aunque no cambie el texto del libro.
    asset_version=hashlib.sha256((json.dumps(data,sort_keys=True)+(ROOT/'portal/asistentes/integracion.js').read_text(encoding='utf8')).encode()).hexdigest()[:12]
    marker='<script src="../asistentes/integracion.js?v='+asset_version+'" defer></script>'
    pattern=r'<script src="\.\./asistentes/integracion\.js(?:\?[^\"]*)?" defer></script>'
    if re.search(pattern,text):updated=re.sub(pattern,lambda match:marker,text)
    else:updated=text+'\n'+marker+'\n'
    if updated!=text:include.write_text(updated,encoding='utf-8')
