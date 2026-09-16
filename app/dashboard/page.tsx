import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../actions';
import { chibiSvg } from '@/lib/game/character-assets-v2';
import { svgUri } from '@/lib/game/studio-assets';

export default async function Dashboard(){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');
  const now=new Date().toISOString();

  const[{data:catalog},{data:missions},{data:progress},{data:isAdmin},{data:syllabi},{data:stats},{data:dueReviews},{data:grants},{data:characters},{data:activePatrol}]=await Promise.all([
    sb.from('mission_catalog').select('*').eq('status','published').order('sequence_no'),
    sb.from('missions').select('id,syllabus_id').eq('status','published'),
    sb.from('mission_progress').select('mission_id,status,progress_percent,score_best,mistakes').eq('user_id',user.id),
    sb.rpc('is_admin'),
    sb.from('exam_syllabi').select('id,title,exam_name,agency,position_name').eq('status','published').order('created_at'),
    sb.from('student_stats').select('*').eq('user_id',user.id).maybeSingle(),
    sb.from('review_queue').select('id,mission_id,due_at').eq('user_id',user.id).eq('status','pending').lte('due_at',now).order('due_at'),
    sb.from('access_grants').select('access_type,status,starts_at,ends_at,syllabus_id').eq('user_id',user.id).eq('status','active').order('created_at',{ascending:false}),
    sb.from('student_characters').select('syllabus_id,character_name,role_title,archetype').eq('user_id',user.id),
    sb.from('patrol_runs').select('id,answered_count,item_count').eq('user_id',user.id).eq('status','active').order('started_at',{ascending:false}).limit(1).maybeSingle(),
  ]);

  const ok=new Set((missions||[]).map((x:any)=>x.id));
  const pmap=new Map((progress||[]).map((p:any)=>[p.mission_id,p]));
  const completed=(progress||[]).filter((p:any)=>p.status==='completed').length;
  const accessibleSyllabi=new Set((missions||[]).map((m:any)=>m.syllabus_id).filter(Boolean));
  const visibleSyllabi=(syllabi||[]).filter((s:any)=>accessibleSyllabi.has(s.id));
  const inProgress=(catalog||[]).find((m:any)=>ok.has(m.mission_id)&&pmap.get(m.mission_id)?.status==='in_progress');
  const nextFresh=(catalog||[]).find((m:any)=>ok.has(m.mission_id)&&!pmap.has(m.mission_id));
  const nextMission=inProgress||nextFresh;
  const dueCount=dueReviews?.length||0;
  const errorCount=(progress||[]).reduce((sum:number,p:any)=>sum+(Array.isArray(p.mistakes)?p.mistakes.length:0),0);
  const activeGrant=(grants||[]).find((g:any)=>!g.ends_at||new Date(g.ends_at).getTime()>Date.now());
  const trial=activeGrant?.access_type==='trial';
  const trialDays=trial&&activeGrant?.ends_at?Math.max(0,Math.ceil((new Date(activeGrant.ends_at).getTime()-Date.now())/86400000)):null;
  const primarySyllabus=visibleSyllabi[0];
  const character=(characters||[]).find((c:any)=>c.syllabus_id===primarySyllabus?.id)||(characters||[])[0];
  const displayName=character?.character_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Aluno';
  const role=character?.role_title||primarySyllabus?.position_name||'Candidato';
  const archetype=character?.archetype||'operational';
  const avatar=svgUri(chibiSvg(archetype,'player'));
  const nextCampaignHref=nextMission?`/game/${nextMission.mission_id}`:'/archive';
  const patrolHref=activePatrol?.id?`/plantao?run=${activePatrol.id}`:'/plantao';

  return <main className="jqDash">
    <header className="jqTop">
      <a className="jqBrand" href="/dashboard">JURIS<span>QUEST</span></a>
      <nav><a className="active" href="/dashboard">Início</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a>{primarySyllabus&&<a href={`/syllabus/${primarySyllabus.id}`}>Mapa do Edital</a>}</nav>
      <div className="jqProfile"><div className="jqProfileMeta"><strong>{displayName}</strong><span>{role}</span></div><img src={avatar} alt=""/><form action={logout}><button title="Sair da conta">Sair</button></form></div>
    </header>

    <section className="jqContent">
      <section className="commandGrid">
        <article className="operatorCard">
          <div className="opGlow"/><div className="opAvatar"><img src={avatar} alt=""/></div>
          <div className="opCopy"><div className="dashEy">OPERADOR ATIVO</div><h1>{displayName}</h1><p>{role}</p><div className="opBadges"><span>NÍVEL {Math.max(1,Math.floor(Number(stats?.xp||0)/250)+1)}</span><span>{Number(stats?.xp||0)} XP</span>{trial&&<span>ACESSO TESTE{trialDays!=null?` • ${trialDays}D`:''}</span>}</div></div>
        </article>

        <article className="nextOperation">
          <div className="dashEy">PRÓXIMA OPERAÇÃO</div>
          <div className="operationHead"><div><h2>{activePatrol?'Plantão em andamento':'Assuma o Plantão'}</h2><p>{dueCount?`${dueCount} revisão${dueCount>1?'ões':''} vencida${dueCount>1?'s':''} entra${dueCount>1?'m':''} primeiro.`:errorCount?`${errorCount} ponto${errorCount>1?'s':''} fraco${errorCount>1?'s':''} pode${errorCount>1?'m':''} voltar neste turno.`:'O motor escolhe revisão, erro, lacuna e manutenção automaticamente.'}</p></div><div className="signal"><i/><span>ADAPTATIVO</span></div></div>
          <div className="operationActions"><a className="launch" href={patrolHref}>{activePatrol?`Retomar ${activePatrol.answered_count}/${activePatrol.item_count}`:'▶ Iniciar Plantão'}</a>{nextMission&&<a className="secondary" href={nextCampaignHref}>{inProgress?'Continuar campanha':'Abrir campanha'}</a>}</div>
          <div className="operationStrip"><span>3–8 min</span><span>Servidor confiável</span><span>Revisão integrada</span><span>Baseado no edital</span></div>
        </article>
      </section>

      <section className="dashMetrics">
        <article><small>XP</small><strong>{stats?.xp||0}</strong><span>progressão acumulada</span></article>
        <article><small>SEQUÊNCIA</small><strong>{stats?.current_streak||0}</strong><span>dias de atividade</span></article>
        <article className={dueCount?'warn':''}><small>REVISÕES</small><strong>{dueCount}</strong><span>{dueCount?'vencidas agora':'nenhuma vencida'}</span></article>
        <article><small>CASOS</small><strong>{completed}</strong><span>campanhas concluídas</span></article>
      </section>

      <section className="modeGrid">
        <article className="modeCard patrolMode"><div><div className="dashEy">MODO RECORRENTE</div><h2>Plantão Adaptativo</h2><p>Microcasos que retornam conforme seu histórico. O aluno não “zera”: o conteúdo muda com memória, erros e lacunas.</p></div><a href={patrolHref}>Entrar no Plantão →</a></article>
        <article className="modeCard campaignMode"><div><div className="dashEy">CAMPANHA</div><h2>{nextMission?.title||'Arquivo de Casos'}</h2><p>{nextMission?.summary||'Revisite os casos já concluídos, NPCs e evidências sem alterar o resultado original.'}</p></div><a href={nextCampaignHref}>{nextMission?(inProgress?'Continuar caso →':'Iniciar caso →'):'Abrir arquivo →'}</a></article>
        <article className="modeCard reviewMode"><div><div className="dashEy">RECUPERAÇÃO ATIVA</div><h2>Central de Revisão</h2><p>Reforce decisões já vividas. Erros do Plantão e da Campanha alimentam a recuperação.</p></div><a href="/review">Revisar agora →</a></article>
      </section>

      {primarySyllabus&&<section className="syllabusBand"><div><div className="dashEy">EDITAL ATIVO</div><h2>{primarySyllabus.title}</h2><p>{[primarySyllabus.agency,primarySyllabus.position_name,primarySyllabus.exam_name].filter(Boolean).join(' • ')}</p></div><a href={`/syllabus/${primarySyllabus.id}`}>Abrir mapa de domínio</a></section>}

      <section className="casesHead"><div><div className="dashEy">ARQUIVO OPERACIONAL</div><h2>Casos da campanha</h2></div><a href="/archive">Ver arquivo completo</a></section>
      <section className="caseGrid">
        {(catalog||[]).map((m:any)=>{
          const p:any=pmap.get(m.mission_id);const pct=p?.status==='completed'?100:Number(p?.progress_percent||0);const available=ok.has(m.mission_id);const done=p?.status==='completed';
          return <article className={`caseCard ${done?'done':''}`} key={m.mission_id}>
            <div className="caseTop"><span>{String(m.sequence_no||'').padStart(2,'0')}</span><b>{available?(done?'CONCLUÍDO':pct>0?'EM ANDAMENTO':'DISPONÍVEL'):'PREMIUM'}</b></div>
            <h3>{m.title}</h3><p>{m.summary}</p>
            <div className="caseProgress"><i style={{width:`${pct}%`}}/></div><small>{done?`Melhor resultado ${Number(p?.score_best||0)}%`:pct?`${pct}% concluído`:'Não iniciado'}</small>
            <div className="caseActions">{available&&done?<><a href={`/game/${m.mission_id}?mode=replay`}>Refazer</a><a href={`/game/${m.mission_id}?mode=explore`}>Explorar</a></>:available?<a className="primary" href={`/game/${m.mission_id}`}>{pct?'Continuar':'Jogar caso'}</a>:<a href="/premium">Desbloquear</a>}</div>
          </article>;
        })}
      </section>
      {isAdmin===true&&<a className="adminDock" href="/admin">Abrir Central Administrativa</a>}
    </section>
    <style>{DASH_CSS}</style>
  </main>;
}

const DASH_CSS=`
.jqDash{min-height:100vh;background:radial-gradient(circle at 78% -10%,#163d46 0,transparent 32%),#050d11;color:#edf4f3}.jqTop{height:68px;position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:28px;padding:0 clamp(18px,4vw,58px);border-bottom:1px solid #1c353d;background:#071216ed;backdrop-filter:blur(18px)}.jqBrand{font-size:18px;font-weight:950;letter-spacing:2.2px}.jqBrand span{color:#e3bb58}.jqTop nav{display:flex;gap:4px}.jqTop nav a{padding:9px 11px;border-radius:9px;color:#7e959a;font-size:11px;font-weight:800}.jqTop nav a:hover,.jqTop nav a.active{color:#eef5f4;background:#0d2229}.jqProfile{margin-left:auto;display:flex;align-items:center;gap:9px}.jqProfile img{width:39px;height:45px;object-fit:contain;filter:drop-shadow(0 4px 6px #0008)}.jqProfileMeta{display:grid;text-align:right}.jqProfileMeta strong{font-size:10px}.jqProfileMeta span{font-size:8px;color:#738c92}.jqProfile form button{border:1px solid #2d4850;background:#0b1b20;color:#82989d;border-radius:8px;padding:7px 9px;font-size:9px;cursor:pointer}.jqContent{max-width:1320px;margin:auto;padding:22px clamp(14px,3vw,38px) 70px}.commandGrid{display:grid;grid-template-columns:minmax(300px,.75fr) minmax(480px,1.55fr);gap:12px}.operatorCard,.nextOperation,.modeCard,.syllabusBand,.caseCard{border:1px solid #27444d;background:linear-gradient(180deg,#0c2026,#071519);border-radius:18px;box-shadow:0 20px 65px #0004}.operatorCard{min-height:245px;position:relative;overflow:hidden;display:grid;grid-template-columns:180px 1fr;align-items:end}.opGlow{position:absolute;width:320px;height:320px;border-radius:50%;background:#1e87933c;filter:blur(45px);left:-90px;top:-130px}.opAvatar{height:220px;display:flex;align-items:end;justify-content:center;position:relative;z-index:2}.opAvatar img{max-width:165px;max-height:205px;object-fit:contain;filter:drop-shadow(0 18px 22px #000b)}.opCopy{padding:26px 24px 28px 4px;position:relative;z-index:2}.dashEy{font:850 9px ui-monospace,SFMono-Regular,Menlo,monospace;color:#67d5df;letter-spacing:1.35px}.opCopy h1{font-family:Inter,system-ui,sans-serif;font-size:27px;letter-spacing:-1px;margin:7px 0 2px}.opCopy p{color:#8da1a5;margin:0 0 15px;font-size:11px}.opBadges{display:flex;flex-wrap:wrap;gap:5px}.opBadges span{border:1px solid #35525b;border-radius:99px;padding:5px 7px;color:#9eb2b5;font:750 8px ui-monospace}.nextOperation{padding:28px;min-height:245px;background:radial-gradient(circle at 90% 10%,#6a552527 0,transparent 29%),radial-gradient(circle at 5% 0,#164754 0,transparent 35%),linear-gradient(135deg,#0d232a,#08171c);border-color:#53613c}.operationHead{display:flex;gap:20px;align-items:start;justify-content:space-between}.operationHead h2{font-size:31px;margin:8px 0 6px}.operationHead p{color:#8ca2a6;max-width:660px;line-height:1.55;font-size:12px}.signal{display:flex;align-items:center;gap:7px;border:1px solid #3d5a50;background:#0a211a;border-radius:99px;padding:7px 9px;color:#82d1a2;font:800 8px ui-monospace;white-space:nowrap}.signal i{width:7px;height:7px;border-radius:50%;background:#68d9a0;box-shadow:0 0 13px #68d9a0}.operationActions{display:flex;gap:8px;margin-top:20px}.operationActions a{padding:12px 15px;border-radius:11px;font-size:11px;font-weight:900}.operationActions .launch{background:linear-gradient(180deg,#efca6a,#c79b3d);color:#17140c;border:1px solid #e1b957;box-shadow:0 10px 30px #d4a63f33}.operationActions .secondary{border:1px solid #35515a;background:#0a1c22;color:#d0dddd}.operationStrip{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid #243b42}.operationStrip span{font:750 8px ui-monospace;color:#769096}.dashMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:10px}.dashMetrics article{border:1px solid #213b43;border-radius:14px;background:#08171c;padding:14px 16px;display:grid;gap:2px}.dashMetrics small{font:850 8px ui-monospace;color:#668d95}.dashMetrics strong{font-size:26px}.dashMetrics span{font-size:9px;color:#6e878c}.dashMetrics article.warn{border-color:#765f31;background:#1b1810}.modeGrid{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:10px;margin-top:10px}.modeCard{min-height:205px;padding:20px;display:flex;flex-direction:column;justify-content:space-between}.modeCard h2{font-size:21px;margin:7px 0}.modeCard p{font-size:11px;color:#82999e;line-height:1.55}.modeCard>a{font-size:10px;font-weight:900;color:#e7c664}.patrolMode{border-color:#765f31;background:radial-gradient(circle at 15% 0,#3a321b70,transparent 40%),linear-gradient(180deg,#13262a,#09181d)}.syllabusBand{margin-top:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}.syllabusBand h2{font-size:18px;margin:5px 0 2px}.syllabusBand p{font-size:10px;color:#779096;margin:0}.syllabusBand>a{border:1px solid #37545d;border-radius:10px;padding:10px 12px;font-size:9px;font-weight:850}.casesHead{display:flex;justify-content:space-between;align-items:end;margin:30px 2px 10px}.casesHead h2{margin:4px 0 0}.casesHead>a{font-size:9px;color:#79cbd5}.caseGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.caseCard{padding:17px}.caseCard.done{border-color:#35564b}.caseTop{display:flex;justify-content:space-between;align-items:center}.caseTop span{font:900 17px ui-monospace;color:#d6b45a}.caseTop b{font:850 7px ui-monospace;color:#6f9197;border:1px solid #34515a;border-radius:99px;padding:4px 6px}.caseCard h3{font-size:16px;margin:13px 0 6px}.caseCard>p{font-size:10px;line-height:1.5;color:#7f969b;min-height:45px}.caseProgress{height:4px;border-radius:99px;background:#102228;overflow:hidden;margin-top:14px}.caseProgress i{display:block;height:100%;background:linear-gradient(90deg,#5ed4de,#e0b958)}.caseCard>small{display:block;color:#6e878c;font-size:8px;margin:6px 0 12px}.caseActions{display:flex;gap:6px}.caseActions a{border:1px solid #34515a;border-radius:9px;padding:8px 10px;font-size:9px;font-weight:850}.caseActions a.primary{background:#604d1e;border-color:#987b36;color:#f5dfa0}.adminDock{position:fixed;right:18px;bottom:18px;border:1px solid #496069;background:#091a20;padding:9px 12px;border-radius:10px;color:#85cbd4;font-size:9px;font-weight:850;box-shadow:0 10px 30px #0008}
@media(max-width:980px){.jqTop nav{display:none}.commandGrid{grid-template-columns:1fr}.modeGrid{grid-template-columns:1fr 1fr}.patrolMode{grid-column:1/-1}.caseGrid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.jqTop{height:58px;padding:0 11px}.jqProfileMeta{display:none}.jqContent{padding:11px 9px 70px}.operatorCard{grid-template-columns:130px 1fr;min-height:190px}.opAvatar{height:180px}.opAvatar img{max-width:120px;max-height:165px}.opCopy{padding:20px 12px 20px 0}.opCopy h1{font-size:21px}.nextOperation{padding:20px}.operationHead{display:block}.operationHead h2{font-size:25px}.signal{display:inline-flex;margin-top:4px}.operationActions{flex-direction:column}.operationActions a{text-align:center}.dashMetrics{grid-template-columns:1fr 1fr}.modeGrid,.caseGrid{grid-template-columns:1fr}.patrolMode{grid-column:auto}.syllabusBand{display:block}.syllabusBand>a{display:inline-flex;margin-top:12px}.casesHead{align-items:center}.casesHead h2{font-size:18px}}
`;
