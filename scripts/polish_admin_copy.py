from pathlib import Path

def patch(path,pairs):
 p=Path(path);s=p.read_text()
 for old,new in pairs:
  if old not in s: raise RuntimeError(f'anchor missing {path}: {old[:80]}')
  s=s.replace(old,new,1)
 p.write_text(s)

patch('app/admin/page.tsx',[
("<a href=\"/admin\" className=\"admBrand\">JURIS<span>QUEST</span> <b>CONTROL</b></a>","<a href=\"/admin\" className=\"admBrand\">JURIS<span>QUEST</span> <b>ADMIN</b></a>"),
("{first&&<a href={`/game/${first.mission_id}`}>Testar runtime</a>}","{first&&<a href={`/game/${first.mission_id}`}>Testar caso</a>}"),
("<div className=\"navTitle\"><small>CENTRAL ADMINISTRATIVA</small><strong>Sistema operacional</strong></div>","<div className=\"navTitle\"><small>CENTRAL ADMINISTRATIVA</small><strong>Gestão do produto</strong></div>"),
("text:'Cenários e personagens compartilhados entre Campanha e Plantão.'","text:'Cenários, personagens, atmosfera e identidade visual do jogo.'"),
("text:'Telemetria dos turnos, precisão e origem adaptativa.'","text:'Telemetria dos turnos, precisão, revisão e recorrência.'"),
("text:'Contas, grants, trial e revogação de acesso.'","text:'Contas, acessos, períodos de teste e revogações.'"),
("<div><small>JURISQUEST • COMMERCIAL BUILD</small><h1>Controle do produto</h1><p>Conteúdo, runtime, direção visual, retenção, acesso e telemetria trabalham sobre a mesma arquitetura.</p></div><div className=\"runtimeSeal\"><i/> RUNTIME V4 UNIFICADO</div>","<div><small>JURISQUEST • ADMINISTRAÇÃO</small><h1>Controle do produto</h1><p>Conteúdo, experiência, direção visual, retenção, acesso e telemetria em um só lugar.</p></div><div className=\"runtimeSeal\"><i/> PUBLICAÇÃO SEGURA</div>"),
("<div className=\"systemCore\"><span>JQ</span><b>GAME RUNTIME</b><small>Campanha + Plantão</small></div>","<div className=\"systemCore\"><span>JQ</span><b>PRODUTO</b><small>Casos + Plantão</small></div>"),
("<p>Plantões em andamento agora usam o mesmo runtime da Campanha.</p>","<p>Plantões em andamento neste momento.</p>"),
("<p>Entitlements válidos neste momento.</p>","<p>Contas com acesso válido neste momento.</p>"),
("<section className=\"engine\"><small>ENGINE</small><p>Desktop <b>{settings?.renderer_quality||'high'}</b><br/>Mobile <b>{settings?.mobile_quality||'balanced'}</b><br/>UI <b>{settings?.ui_theme||'anime_noir'}</b></p>","<section className=\"engine\"><small>EXPERIÊNCIA VISUAL</small><p>Desktop <b>{settings?.renderer_quality||'high'}</b><br/>Mobile <b>{settings?.mobile_quality||'balanced'}</b><br/>Tema <b>{settings?.ui_theme||'anime_noir'}</b></p>"),
])
patch('app/dashboard/page.tsx',[("<span>CONTROLE DE OPERAÇÕES</span><b>Entrar no ADM</b>","<span>ADMINISTRAÇÃO</span><b>Gerenciar JurisQuest</b>")])
patch('components/patrol-mode-v4.tsx',[("{accuracy>=80?'Operação concluída.':'Turno registrado.'}","{accuracy>=80?'Turno concluído com consistência.':'Turno concluído.'}")])
print('admin copy polish applied')
