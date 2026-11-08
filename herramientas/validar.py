from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
import json,re,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'_site'
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[]
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if t in ['a','img','script','link','source','iframe']:self.links.append(a.get('href',a.get('src','')))
def validate():
    edition=json.loads((ROOT/'edicion.json').read_text(encoding='utf8'))
    assert edition['blocks'] and all(b.get('accepted') and b.get('source_sha256') and b.get('approval_date') for b in edition['blocks'])
    assert not any(p.name in ['revision','revisiones','aceptados','catalogo','originales'] for p in SITE.rglob('*'))
    parsed={};errors=[]
    for p in SITE.rglob('*.html'):
        text=p.read_text(encoding='utf8');a=Parser();a.feed(text);parsed[p.resolve()]=a
        assert len(a.ids)==len(set(a.ids)),(str(p),'duplicate IDs')
        assert not re.search(r'C:[/\\](?:Users|Program)',text,re.I),str(p)
    for p,a in parsed.items():
        for link in a.links:
            if not link or link.startswith(('http:','https:','data:','mailto:','tel:','javascript:')):continue
            url=urlsplit(link)
            if url.path.startswith('/'):continue
            target=(p.parent/unquote(url.path)).resolve() if url.path else p
            if target.is_dir():target/= 'index.html'
            if not target.exists():errors.append((str(p.relative_to(SITE)),link,'file'))
            elif url.fragment and target in parsed and unquote(url.fragment) not in parsed[target].ids:errors.append((str(p.relative_to(SITE)),link,'anchor'))
    assert not errors,errors[:30]
    chapter=parsed[(SITE/'es/introduccion.html').resolve()]
    assert set(edition['paragraph_ids'])<=set(chapter.ids),'Missing stable IDs'
    for p in SITE.rglob('*'):
        if p.is_file() and p.suffix in ['.json','.html','.js','.txt','.qmd','.bib']:
            raw=p.read_text(encoding='utf8',errors='replace')
            assert not re.search(r'C:[/\\](?:Users|Program)',raw,re.I),str(p)
            assert 'Comentarios del autor incorporados; B7 pendiente' not in raw
    report=dict(status='correcto',html_pages=len(parsed),accepted_blocks=len(edition['blocks']),stable_ids=len(edition['paragraph_ids']),local_links_checked=True,pending_blocks_not_exported=True,no_local_paths=True,scope=[b['id'] for b in edition['blocks']],files={str(p.relative_to(SITE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in SITE.rglob('*') if p.is_file()})
    (ROOT/'Verificacion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
if __name__=='__main__':validate()
