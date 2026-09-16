from pathlib import Path


def patch(path, pairs):
    p=Path(path)
    s=p.read_text()
    for old,new in pairs:
        if old not in s:
            raise RuntimeError(f'anchor missing in {path}: {old}')
        s=s.replace(old,new)
    p.write_text(s)

patch('components/game-runtime-pro-v4.tsx',[
    ('const WALK_SPEED=105;','const WALK_SPEED=230;'),
    ('const MANUAL_SPEED=125;','const MANUAL_SPEED=180;'),
    ('const speed=Math.max(135,Math.min(220,d/4.5));','const speed=Math.max(WALK_SPEED,Math.min(380,d/2.6));'),
])

patch('qa/user-flow.spec.mjs',[
    ("must(ms>=350&&ms<24000,'Clique gera caminhada perceptível'","must(ms>=250&&ms<10000,'Clique gera caminhada perceptível'"),
    ("must(ms>=350&&ms<24000,'Campanha usa a mesma caminhada do Plantão'","must(ms>=250&&ms<10000,'Campanha usa a mesma caminhada do Plantão'"),
])
