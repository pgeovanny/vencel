from pathlib import Path


def replace(path, old, new, count=1, required=True):
    p=Path(path); s=p.read_text()
    if old not in s:
        if required: raise RuntimeError(f'anchor not found in {path}: {old[:90]!r}')
        return False
    s=s.replace(old,new,count)
    p.write_text(s)
    return True

# Dashboard: remove implementation language and make the first message useful on every return.
p='app/dashboard/page.tsx'
replace(p,
"  const patrolHref=activePatrol?.id?`/plantao?run=${activePatrol.id}`:'/plantao';\n",
"  const patrolHref=activePatrol?.id?`/plantao?run=${activePatrol.id}`:'/plantao';\n  const streak=Number(stats?.current_streak||0);\n  const dailyHeadline=dueCount?'Sua revisão chegou ao ponto certo.':activePatrol?'Seu turno está esperando por você.':inProgress?'Continue de onde parou.':errorCount?'Há pontos que vale reforçar hoje.':streak>0?`Mantenha sua sequência de ${streak} dia${streak===1?'':'s'}.`:nextMission?'Seu próximo caso está pronto.':'Escolha como avançar hoje.';\n  const dailyReason=dueCount?`${dueCount} revisão${dueCount===1?'':'ões'} pronta${dueCount===1?'':'s'} para recuperar agora.`:activePatrol?`${activePatrol.answered_count}/${activePatrol.item_count} ocorrências concluídas. Retome sem perder o contexto.`:inProgress?`O caso ${inProgress.title} continua aberto no ponto em que você deixou.`:errorCount?`O Plantão pode priorizar ${errorCount} ponto${errorCount===1?'':'s'} que ainda merece${errorCount===1?'':'m'} atenção.`:streak>0?'Uma sessão curta hoje mantém o ritmo e reforça o que você já estudou.':nextMission?`${nextMission.title} é a próxima situação da sua jornada.`:'Plantão, casos e revisão trabalham sobre o mesmo progresso.';\n")
replace(p,'<div className="opsTopStatus"><span className="onlineDot"/>RUNTIME V4</div>',"<div className=\"opsTopStatus\"><span className=\"onlineDot\"/>{streak?`${streak} DIA${streak===1?'':'S'} DE SEQUÊNCIA`:'PROGRESSO SALVO'}</div>")
replace(p,'<h1>Qual é a próxima missão?</h1>\n        <p>O mesmo motor de jogo. Dois ritmos de estudo.</p>', '<h1>{dailyHeadline}</h1>\n        <p>{dailyReason}</p>')
replace(p,"<div className=\"gateMeta\"><span>PLANTÃO</span><b>{activePatrol?'EM ANDAMENTO':'ADAPTATIVO'}</b></div>","<div className=\"gateMeta\"><span>PLANTÃO</span><b>{activePatrol?'EM ANDAMENTO':'FEITO PARA VOCÊ'}</b></div>")
replace(p,"'3–8 min • revisão • lacunas'","'3–8 min • foco no que mais importa'")
replace(p,'<div className="playerData"><span className="opsEy">OPERADOR</span>', '<div className="playerData"><span className="opsEy">SEU PERSONAGEM</span>')

# Login: product language instead of system/operator language.
p='app/page.tsx'
replace(p,'<div className="entryStatus"><i/> SISTEMA ONLINE</div>','<div className="entryStatus"><i/> TREINO PERSONALIZADO</div>')
replace(p,'<div className="entryModes"><div><b>01</b><span>PLANTÃO</span><small>sessões adaptativas</small></div><div><b>02</b><span>CASOS</span><small>campanha narrativa</small></div><div><b>03</b><span>REVISÃO</span><small>recuperação ativa</small></div></div>', '<div className="entryModes"><div><b>01</b><span>PLANTÃO</span><small>treino curto e personalizado</small></div><div><b>02</b><span>CASOS</span><small>situações completas</small></div><div><b>03</b><span>REVISÃO</span><small>erros no momento certo</small></div></div>')
replace(p,'<div className="accessHead"><span>IDENTIFICAÇÃO</span><b>ACESSO DO OPERADOR</b><p>Retome seu personagem, seus casos e sua memória de estudo.</p></div>', '<div className="accessHead"><span>SUA CONTA</span><b>CONTINUE SUA JORNADA</b><p>Retome seu personagem, seus casos e sua memória de estudo.</p></div>')

# Login error: useful and neutral; recovery link is already visible on the page.
p='app/actions.ts'
replace(p,"encodeURIComponent('E-mail ou senha inválidos.')","encodeURIComponent('Não foi possível entrar. Confira e-mail e senha ou use Recuperar senha.')")

# Shared navigation: user benefit, not platform status.
p='components/product-navigation.tsx'
replace(p,'<div className="jqProductState"><i/> JURISQUEST ONLINE</div>','<div className="jqProductState"><i/> PROGRESSO SALVO</div>')

# Profile copy.
p='app/profile/page.tsx'
replace(p,'Personagem atualizado. Dashboard, Plantão e Campanha usarão esta identidade.','Personagem atualizado. Sua identidade já está ativa no JurisQuest.')

# Review copy: less system-like and more pedagogical.
p='app/review/page.tsx'
replace(p,'O Plantão pode introduzir novos conteúdos e pontos fracos.','Novas decisões alimentam sua revisão automaticamente.')
replace(p,'<small>FILA DE RECUPERAÇÃO</small><h1>O que precisa voltar à memória</h1><p>O sistema prioriza o que chegou ao vencimento. Cada decisão precisa ser recuperada corretamente antes de a revisão ser encerrada.</p>', '<small>REVISÃO DE HOJE</small><h1>O que precisa voltar à memória</h1><p>As revisões aparecem no momento certo. Acerte novamente para consolidar o ponto antes de seguir.</p>')

# Archive wording that works across careers.
p='app/archive/page.tsx'
replace(p,'<div className="archiveEy">ARQUIVO OPERACIONAL</div>','<div className="archiveEy">ARQUIVO DE CASOS</div>')
replace(p,'<a href="/dashboard">Voltar à campanha</a>','<a href="/dashboard">Escolher um caso</a>')

# Runtime: reduce HUD noise, remove implementation language, refine feedback language.
p='components/game-runtime-pro-v4.tsx'
replace(p,".targetBadge{display:flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:#e5bd58;color:#181309;font:900 8px ui-monospace;letter-spacing:.08em;box-shadow:0 0 26px #e5bd5880;pointer-events:none}",".targetBadge{display:flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:#07191feb;color:#f0d171;border:1px solid #d7b55299;font:900 8px ui-monospace;letter-spacing:.08em;box-shadow:0 10px 30px #0009;pointer-events:none}")
replace(p,'.studioHud .keys{opacity:.36!important;transition:opacity .2s}.studioHud .keys:hover{opacity:1!important}', '.studioHud .keys{display:none!important}')
replace(p,"'PRÓXIMO PASSO • CLIQUE'","'OBJETIVO'")
replace(p,"setCloud('Motor indisponível')","setCloud('Não foi possível carregar a cena')")
replace(p,'eyebrow="ERRO DO MOTOR" title="Não foi possível iniciar"','eyebrow="CENA INDISPONÍVEL" title="Não foi possível carregar esta ocorrência"')
replace(p,"message:'Contexto do Plantão indisponível.'","message:'Não foi possível preparar esta ocorrência.'")
replace(p,"isPatrol?'CHAMADA DA CENTRAL'","isPatrol?'NOVO CHAMADO'")
replace(p,'<div><small>DECISÕES</small><b>{(mission.decisions||[]).length}</b></div>', '<div><small>RITMO</small><b>{isPatrol?\'Rápido\':\'Completo\'}</b></div>')
# Friendly reason for why this occurrence appeared.
anchor='  return <main className="studioGame">'
insert="  const priorityLabel=({review_due:'REVISÃO PRIORITÁRIA',error:'PONTO A REFORÇAR',gap:'CONTEÚDO A CONSOLIDAR',maintenance:'MANUTENÇÃO DO DOMÍNIO'} as Record<string,string>)[String(patrolContext?.prioritySource||'')]||'TREINO PERSONALIZADO';\n  return <main className=\"studioGame\">"
replace(p,anchor,insert)
replace(p,"{isPatrol&&<div className=\"patrolStrip\"><span className=\"priority\">{String(patrolContext?.prioritySource||'gap').replaceAll('_',' ').toUpperCase()}</span><span>Mesma mecânica da Campanha</span><span>Revisão integrada</span></div>}","{isPatrol&&<div className=\"patrolStrip\"><span className=\"priority\">{priorityLabel}</span><span>Escolhido pelo seu desempenho</span><span>3–8 min</span></div>}")
replace(p,"eyebrow={overlay.correct?'DECISÃO CORRETA':'DECISÃO INCORRETA'}","eyebrow={overlay.correct?'BOA DECISÃO':'REVISE ESTE PONTO'}")
replace(p,'<Info label="REGRA"','<Info label="REGRA APLICÁVEL"')
replace(p,'<Info label="APLICAÇÃO AO CASO"','<Info label="NO CASO"')
replace(p,'<Info label="PEGADINHA DE PROVA"','<Info label="ONDE A PROVA ENGANA"')
replace(p,'<Info label="MEMÓRIA DE PROVA"','<Info label="FIXE ISTO"')
# Non-target nameplates should recede instead of turning the scene into a labeled dashboard.
replace(p,'e.go.jqLabel.setAlpha(active?1:.55);e.go.jqLabel.setScale(active?1.03:.92)', 'e.go.jqLabel.setAlpha(active?1:(close?.55:.18));e.go.jqLabel.setScale(active?1.02:(close?.94:.86))', required=False)

# E2E follows the product copy, not old implementation labels.
p='qa/user-flow.spec.mjs'
replace(p,"hasText:/DECISÃO (CORRETA|INCORRETA)/","hasText:/BOA DECISÃO|REVISE ESTE PONTO/")
replace(p,"/REGRA|APLICAÇÃO AO CASO|BASE LEGAL|MEMÓRIA DE PROVA/","/REGRA APLICÁVEL|NO CASO|BASE LEGAL|FIXE ISTO/")

print('commercial polish applied')
