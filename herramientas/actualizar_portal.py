from pathlib import Path
import json,html,re
ROOT=Path(__file__).resolve().parents[1]
def update():
    edition=json.loads((ROOT/'edicion.json').read_text(encoding='utf8'))
    home=ROOT/'portal/index.html';text=home.read_text(encoding='utf8');rows=[]
    for i,b in enumerate(edition['blocks'],1):
        rows.append('<li><span class="num">'+str(i).zfill(2)+'</span><a href="es/'+b.get('chapter_file','introduccion')+'.html#'+b['passages'][0]+'">'+html.escape(b['title'])+'</a><span class="pill">Disponible</span></li>')
    text,n=re.subn(r'<ol class="reading-list">.*?</ol>','<ol class="reading-list">'+''.join(rows)+'</ol>',text,count=1,flags=re.S);assert n==1
    home.write_text(text,encoding='utf8')
if __name__=='__main__':update()
