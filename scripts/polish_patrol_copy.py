from pathlib import Path

def patch(path, pairs):
    p=Path(path); s=p.read_text()
    for old,new in pairs:
        if old not in s: raise RuntimeError(f'anchor not found in {path}: {old[:100]}')
        s=s.replace(old,new,1)
    p.write_text(s)

patch('components/patrol-mode-v4.tsx',[
("const PRIORITY:Record<string,string>={review_due:'REVISÃO VENCIDA',error:'PONTO FRACO',gap:'LACUNA DO EDITAL',maintenance:'MANUTENÇÃO'};","const PRIORITY:Record<string,string>={review_due:'REVISÃO',error:'PONTO A REFORÇAR',gap:'CONTEÚDO A CONSOLIDAR',maintenance:'CONSOLIDAÇÃO'};"),
('<div className="dispatchSignal"><i/> CENTRAL ONLINE <span>•</span> FILA ADAPTATIVA PRONTA</div>','<div className="dispatchSignal"><i/> PRÓXIMO TURNO <span>•</span> PRONTO PARA COMEÇAR</div>'),
('<small className="dispatchEy">MODO RECORRENTE • SESSÃO DE 3–8 MIN</small>','<small className="dispatchEy">SESSÃO RÁPIDA • 3–8 MIN</small>'),
('<p>O próximo turno é montado pelo seu histórico real. Revisões vencidas entram primeiro; depois erros, lacunas do edital e manutenção.</p>','<p>O próximo turno combina revisões no prazo, pontos que você errou e conteúdos ainda pouco treinados. Entre e foque no que mais pode melhorar seu resultado agora.</p>'),
('<header><div><small>PRIORIDADE DO MOTOR</small><strong>Fila do próximo turno</strong></div><span className="radarLive"><i/> AO VIVO</span></header>','<header><div><small>FOCO DE HOJE</small><strong>O que pode entrar no turno</strong></div><span className="radarLive"><i/> PERSONALIZADO</span></header>'),
('<div className="radarNode error"><b>02</b><span>ERROS</span></div>','<div className="radarNode error"><b>02</b><span>REFORÇO</span></div>'),
('<div className="radarNode gap"><b>03</b><span>LACUNAS</span></div>','<div className="radarNode gap"><b>03</b><span>EDITAL</span></div>'),
('<div className="radarNode keep"><b>04</b><span>MANUT.</span></div>','<div className="radarNode keep"><b>04</b><span>CONSOLIDAR</span></div>'),
('<div className="radarCenter"><b>JQ</b><small>ADAPT</small></div>','<div className="radarCenter"><b>JQ</b><small>HOJE</small></div>'),
('<header><div><small>HISTÓRICO OPERACIONAL</small><h2>Últimos turnos</h2></div><p>Cada erro alimenta a recuperação ativa. O próximo Plantão muda com você.</p></header>','<header><div><small>SEUS ÚLTIMOS TURNOS</small><h2>Histórico recente</h2></div><p>O que você ainda erra volta a aparecer; o que já domina abre espaço para novos pontos do edital.</p></header>'),
('<header className="reportHero"><div><small>AFTER ACTION REPORT • TURNO ENCERRADO</small>','<header className="reportHero"><div><small>RESUMO DO TURNO</small>'),
('<p>O histórico foi atualizado. Decisões incorretas já entraram no circuito de recuperação e podem retornar com prioridade.</p>','<p>Seu desempenho foi atualizado. O que ainda precisa de reforço já ficou separado para reaparecer no momento certo.</p>'),
('<section className="reportTimeline"><header><small>REGISTRO DAS OCORRÊNCIAS</small><span>resultado • origem adaptativa • decisão</span></header>','<section className="reportTimeline"><header><small>REGISTRO DAS OCORRÊNCIAS</small><span>resultado • motivo • decisão</span></header>'),
])

patch('components/game-runtime-pro-v4.tsx',[
("setEngineError(e?.message||'Falha ao iniciar o motor gráfico.')","setEngineError(e?.message||'Falha ao carregar a cena.')"),
("exploreMode?(near?'Pressione E para conversar ou examinar.':'Clique em um personagem/evidência ou explore livremente.')","exploreMode?(near?'Clique em Interagir para conversar ou examinar.':'Clique em um personagem ou evidência para explorar livremente.')"),
])
print('Plantao copy polish applied')
