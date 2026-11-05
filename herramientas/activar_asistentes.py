from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
from urllib.error import HTTPError
import argparse,json
ROOT=Path(__file__).resolve().parents[1]
def activate(report_path):
    report=json.loads(report_path.read_text(encoding='utf-8'));origin=report['endpoint'].rstrip('/')
    parsed=urlparse(origin)
    assert parsed.scheme=='https' and parsed.hostname and not parsed.username and not parsed.password and parsed.path=='' and not parsed.query and not parsed.fragment,'Se necesita una dirección HTTPS pública válida'
    config=ROOT/'portal/asistentes/config.json';data=json.loads(config.read_text(encoding='utf-8'))
    with urlopen(origin+'/health',timeout=20) as response:health=json.load(response)
    assert health.get('service')=='paleobiologia-assistant' and health.get('book_fingerprint')==data['book_fingerprint'],'La biblioteca del equipo no coincide con el libro'
    if data.get('registry_fingerprint'):
        assert health.get('registry_fingerprint')==data['registry_fingerprint'],'Las fichas y fuentes de los tutores no coinciden con esta edición'
    blocked=False
    try:urlopen(origin+'/api/jobs/control',timeout=20)
    except HTTPError as error:blocked=error.code==401
    assert blocked,'La comprobación de acceso sin clave ha fallado'
    data.update(enabled=True,endpoint=origin);config.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'endpoint':origin,'enabled':True,'authentication_verified':True,'book_fingerprint':data['book_fingerprint']},ensure_ascii=False))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--informe',required=True,type=Path);activate(parser.parse_args().informe)
