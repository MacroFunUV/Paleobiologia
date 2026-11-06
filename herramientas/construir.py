from pathlib import Path
import argparse,shutil,subprocess,json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]

def build(html_only=False):
    from preparar_asistentes import prepare
    prepare()
    from actualizar_portal import update
    update()
    from preparar_app import prepare as prepare_app
    prepare_app()
    book=ROOT/'ediciones/es';quarto=shutil.which('quarto')
    assert quarto,'Instalar Quarto 1.9.31 o compatible'
    formats=['html'] if html_only else ['html','typst','epub']
    for fmt in formats:
        subprocess.run([quarto,'render','--to',fmt,'--no-clean'],cwd=book,check=True)
    out=ROOT/'_site';out.mkdir(exist_ok=True)
    for p in (ROOT/'portal').rglob('*'):
        if p.is_file():q=out/p.relative_to(ROOT/'portal');q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
    for folder in ['materiales']:
        if (ROOT/folder).exists():shutil.copytree(ROOT/folder,out/folder,dirs_exist_ok=True)
    for name in ['edicion.json','creditos_recursos.json','recursos_docentes.json']:shutil.copy2(ROOT/name,out/name)
    downloads=out/'descargas';downloads.mkdir(exist_ok=True)
    for ext in ['pdf','epub']:
        p=out/'es'/('paleobiologia-esencial-es-parcial.'+ext)
        if p.exists():shutil.copy2(p,downloads/p.name)
    from preparar_app import finalize as finalize_app
    finalize_app(out)
    subprocess.run([__import__('sys').executable,str(ROOT/'herramientas/validar.py')],cwd=ROOT,check=True)
    print('Sitio listo: '+str(out/'index.html'))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--solo-html',action='store_true');build(p.parse_args().solo_html)
