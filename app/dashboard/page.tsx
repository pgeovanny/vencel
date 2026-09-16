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
  const xp=Number(stats?.xp||0);
  const level=Math.max(1,Math.floor(xp/250)+1);
  const levelPct=Math.min(100,Math.round((xp%250)/250*100));
  const nextCampaignHref=nextMission?`/game/${nextMission.mission_id}`:'/archive';
  const patrolHref=activePatrol?.id?`/plantao?run=${activePatrol.id}`:'/plantao';

  return <main className="hq">
    <header className="hqTop">
      <a className="hqBrand" href="/dashboard">JURIS<span>QUEST</span></a>
      <nav><a className="active" href="/dashboard">Central</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a>{primarySyllabus&&<a href={`/syllabus/${primarySyllabus.id}`}>Edital</a>}</nav>
      <div className="hqUser"><div><b>{displayName}</b><span>{role}</span></div><img src={avatar} alt=""/><form action={logout}><button>Sair</button></form></div>
    </header>

    <div className="hqBody">
      <aside className="operatorRail">
        <div className="operatorScene"><div className="operatorGlow"/><img src={avatar} alt=""/><span className="operatorFloor"/></div>
        <div className="operatorIdentity"><small>OPERADOR ATIVO</small><h1>{displayName}</h1><p>{role}</p></div>
        <div className="rankLine"><span>NÍVEL {level}</span><b>{xp} XP</b></div><div className="rankBar"><i style={{width:`${levelPct}%`}}/></div>
        <div className="operatorStats"><div><small>SEQUÊNCIA</small><strong>{stats?.current_streak||0}</strong><span>dias</span></div><div><small>CASOS</small><strong>{completed}</strong><span>concluídos</span></div></div>
        {trial&&<div className="trialTag">ACESSO TESTE{trialDays!=null?` • ${trialDays} DIAS`:''}</div>}
        <a className="profileAction" href="/profile">Editar personagem</a>
      </aside>

      <section className="operationsDeck">
        <div className="deckAtmos"><i/><i/><i/><i/><i/></div>
        <div className="deckHead"><div><small>CENTRAL DE OPERAÇÕES</small><h2>Escolha como estudar agora</h2></div><div className="live"><i/> RUNTIME V4 • ONLINE</div></div>

        <div className="mainOps">
          <a href={patrolHref} className="opPortal patrolPortal">
            <div className="portalNoise"/><div className="portalIcon">⌁</div><div className="portalCopy"><small>SESSÃO CURTA • ADAPTATIVA</small><h3>{activePatrol?'Retomar Plantão':'Assumir Plantão'}</h3><p>{dueCount?`${dueCount} revisão${dueCount>1?'ões':''} vencida${dueCount>1?'s':''} entra${dueCount>1?'m':''} primeiro.`:errorCount?`${errorCount} ponto${errorCount>1?'s':''} fraco${errorCount>1?'s':''} pode${errorCount>1?'m':''} retornar.`:'O motor escolhe automaticamente o próximo conteúdo útil.'}</p><span>{activePatrol?`${activePatrol.answered_count}/${activePatrol.item_count} ocorrências concluídas`:'3–8 min • revisão + erro + lacuna'}</span></div><b>ENTRAR →</b>
          </a>

          <a href={nextCampaignHref} className="opPortal campaignPortal">
            <div className="portalIcon">◈</div><div className="portalCopy"><small>CASO NARRATIVO</small><h3>{nextMission?.title||'Arquivo de Casos'}</h3><p>{nextMission?.summary||'Abra o arquivo operacional e escolha um caso para investigar.'}</p><span>{inProgress?'caso em andamento':'investigação • decisões • evidências'}</span></div><b>{nextMission?'ABRIR CASO →':'VER ARQUIVO →'}</b>
          </a>
        </div>

        <section className="caseRoute">
          <div className="routeHead"><div><small>ROTA DA CAMPANHA</small><h3>Casos ativos</h3></div><a href="/archive">Abrir arquivo completo</a></div>
          <div className="routeTrack">{(catalog||[]).map((m:any)=>{const p:any=pmap.get(m.mission_id);const pct=p?.status==='completed'?100:Number(p?.progress_percent||0);const available=ok.has(m.mission_id);const done=p?.status==='completed';return <a key={m.mission_id} className={`routeCase ${done?'done':''} ${pct>0&&!done?'current':''}`} href={available?`/game/${m.mission_id}`:'/premium'}><span>{String(m.sequence_no||0).padStart(2,'0')}</span><div><b>{m.title}</b><small>{done?'CONCLUÍDO':pct?`${pct}% EM ANDAMENTO`:available?'DISPONÍVEL':'BLOQUEADO'}</small></div><i><em style={{width:`${pct}%`}}/></i></a>})}</div>
        </section>
      </section>

      <aside className="intelRail">
        <section className="intelBlock urgent"><header><span>RECUPERAÇÃO</span><b>{dueCount}</b></header><h3>{dueCount?'Revisões vencidas':'Memória em dia'}</h3><p>{dueCount?'Há conteúdo no ponto ideal de recuperação. O Plantão já prioriza isso automaticamente.':'Nenhuma revisão vencida agora.'}</p><a href="/review">Abrir Central de Revisão</a></section>
        {primarySyllabus&&<section className="intelBlock"><header><span>EDITAL ATIVO</span><b>§</b></header><h3>{primarySyllabus.title}</h3><p>{[primarySyllabus.agency,primarySyllabus.position_name].filter(Boolean).join(' • ')}</p><a href={`/syllabus/${primarySyllabus.id}`}>Mapa de domínio</a></section>}
        <section className="intelBlock"><header><span>DESEMPENHO</span><b>{level}</b></header><div className="miniStats"><div><strong>{xp}</strong><small>XP</small></div><div><strong>{errorCount}</strong><small>PONTOS FRACOS</small></div><div><strong>{completed}</strong><small>CASOS</small></div></div></section>
        <section className="intelBlock system"><header><span>SISTEMA</span><b>●</b></header><p>Campanha e Plantão agora usam o mesmo runtime de jogo. O modo muda a seleção do conteúdo; a experiência permanece.</p></section>
        {isAdmin===true&&<a className="adminLaunch" href="/admin"><span>ADMINISTRADOR</span><b>Abrir Central de Controle →</b></a>}
      </aside>
    </div>
    <style>{CSS}</style>
  </main>;
}

const CSS=`
.hq{min-height:100vh;background:#03090c;color:#edf4f3;font-family:Inter,system-ui,sans-serif}.hq:before{content:"";position:fixed;inset:64px 0 0;pointer-events:none;background:radial-gradient(circle at 52% 8%,#17404a40 0,transparent 34%),linear-gradient(90deg,#061116 1px,transparent 1px),linear-gradient(#061116 1px,transparent 1px);background-size:auto,58px 58px,58px 58px;opacity:.45}.hqTop{height:64px;position:sticky;top:0;z-index:30;display:flex;align-items:center;padding:0 24px;border-bottom:1px solid #203b43;background:#061116f2;backdrop-filter:blur(18px)}.hqBrand{font-weight:950;letter-spacing:2px;font-size:17px}.hqBrand span{color:#e1bb57}.hqTop nav{display:flex;gap:2px;margin-left:34px}.hqTop nav a{padding:9px 11px;border-radius:8px;color:#748d93;font-size:10px;font-weight:850}.hqTop nav a.active,.hqTop nav a:hover{color:#eef5f4;background:#0c2026}.hqUser{margin-left:auto;display:flex;align-items:center;gap:8px}.hqUser>div{display:grid;text-align:right}.hqUser b{font-size:10px}.hqUser span{font-size:8px;color:#71878d}.hqUser img{width:38px;height:44px;object-fit:contain}.hqUser button{border:1px solid #2f4b53;border-radius:8px;background:#0a1b20;color:#8fa3a7;padding:7px 8px;font-size:8px;cursor:pointer}.hqBody{position:relative;z-index:1;display:grid;grid-template-columns:250px minmax(0,1fr) 292px;gap:12px;max-width:1700px;margin:auto;padding:16px 18px 26px;min-height:calc(100vh - 64px)}.operatorRail,.intelRail{align-self:stretch}.operatorRail{border:1px solid #28474f;border-radius:18px;background:linear-gradient(180deg,#0b1e24,#061317);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 70px #0005}.operatorScene{height:270px;position:relative;display:flex;align-items:end;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 35%,#1d59664d,transparent 43%),linear-gradient(180deg,#0b2128,#07171b)}.operatorScene:before{content:"";position:absolute;left:10%;right:10%;bottom:32px;height:1px;background:#24444d}.operatorGlow{position:absolute;width:210px;height:210px;border-radius:50%;background:#2f9db03a;filter:blur(30px);bottom:12px}.operatorScene img{position:relative;z-index:2;max-height:240px;max-width:190px;filter:drop-shadow(0 24px 24px #000c)}.operatorFloor{position:absolute;bottom:22px;width:135px;height:34px;border:2px solid #66dbe9;border-radius:50%;box-shadow:0 0 30px #54dce84a}.operatorIdentity{padding:15px 17px 8px}.operatorIdentity small,.deckHead small,.portalCopy small,.routeHead small,.intelBlock header span{font:900 8px ui-monospace;letter-spacing:.13em;color:#62d3df}.operatorIdentity h1{font-size:24px;margin:4px 0 1px}.operatorIdentity p{font-size:10px;color:#83999e;margin:0}.rankLine{display:flex;justify-content:space-between;padding:8px 17px 5px;font:850 8px ui-monospace;color:#a1b2b5}.rankLine span{color:#e2bf5c}.rankBar{height:6px;margin:0 17px;border-radius:99px;background:#0d2931;overflow:hidden;border:1px solid #28464f}.rankBar i{display:block;height:100%;background:linear-gradient(90deg,#5fd5e2,#e1bb58)}.operatorStats{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin:14px 0 0;border-top:1px solid #213e46;border-bottom:1px solid #213e46;background:#213e46}.operatorStats div{padding:12px 14px;background:#08191e}.operatorStats small,.operatorStats strong,.operatorStats span{display:block}.operatorStats small{font:800 7px ui-monospace;color:#68828a}.operatorStats strong{font-size:20px;margin:2px 0}.operatorStats span{font-size:8px;color:#738a90}.trialTag{margin:12px 17px 0;padding:7px 9px;border:1px solid #705f37;border-radius:8px;background:#201c10;color:#e5c460;font:850 8px ui-monospace}.profileAction{margin:auto 17px 16px;padding:9px;border:1px solid #31505a;border-radius:9px;text-align:center;color:#a8bbbe;font-size:9px;font-weight:850}.operationsDeck{position:relative;min-height:calc(100vh - 106px);border:1px solid #294851;border-radius:19px;background:radial-gradient(circle at 52% 10%,#16424d 0,transparent 32%),linear-gradient(180deg,#08191e,#040c0f);overflow:hidden;box-shadow:0 30px 90px #0006;padding:20px}.deckAtmos{position:absolute;inset:0;pointer-events:none;opacity:.4}.deckAtmos i{position:absolute;width:1px;height:60%;top:20%;background:linear-gradient(transparent,#3b697420,transparent)}.deckAtmos i:nth-child(1){left:17%}.deckAtmos i:nth-child(2){left:34%}.deckAtmos i:nth-child(3){left:51%}.deckAtmos i:nth-child(4){left:68%}.deckAtmos i:nth-child(5){left:85%}.deckHead{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;padding-bottom:15px;border-bottom:1px solid #213e46}.deckHead h2{font-size:26px;margin:4px 0}.live{display:flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid #355a4d;border-radius:999px;background:#0b211a;color:#7ad29f;font:850 8px ui-monospace}.live i{width:7px;height:7px;border-radius:50%;background:#62dda0;box-shadow:0 0 15px #62dda0}.mainOps{position:relative;z-index:2;display:grid;grid-template-columns:1.1fr .9fr;gap:10px;margin-top:14px}.opPortal{min-height:250px;position:relative;overflow:hidden;border:1px solid #36545d;border-radius:17px;padding:24px;display:flex;flex-direction:column;justify-content:flex-end;color:#edf4f3;box-shadow:0 20px 55px #0005;transition:transform .18s,border-color .18s}.opPortal:hover{transform:translateY(-2px);border-color:#7ecbd4}.patrolPortal{background:radial-gradient(circle at 80% 15%,#926f1e32,transparent 27%),linear-gradient(145deg,#0c2d35,#081a20 55%,#17180f)}.campaignPortal{background:radial-gradient(circle at 80% 18%,#205c6d55,transparent 29%),linear-gradient(145deg,#0d252d,#071519)}.portalNoise{position:absolute;inset:0;opacity:.1;background:repeating-linear-gradient(0deg,transparent 0 4px,#fff 5px 6px)}.portalIcon{position:absolute;right:24px;top:18px;width:60px;height:60px;border:1px solid #4c6870;border-radius:50%;display:grid;place-items:center;font-size:28px;color:#e4c25c;background:#07181dbb}.portalCopy{position:relative;z-index:2}.portalCopy h3{font-size:29px;margin:6px 0 7px}.portalCopy p{font-size:11px;line-height:1.58;color:#9aadb0;max-width:600px;margin:0 0 10px}.portalCopy>span{font:800 8px ui-monospace;color:#d6bd70}.opPortal>b{position:relative;z-index:2;margin-top:16px;font-size:9px;letter-spacing:.08em;color:#f0d078}.caseRoute{position:relative;z-index:2;margin-top:16px}.routeHead{display:flex;justify-content:space-between;align-items:end;margin-bottom:8px}.routeHead h3{font-size:19px;margin:3px 0}.routeHead>a{font-size:9px;color:#7acbd5}.routeTrack{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.routeCase{min-height:96px;border:1px solid #294750;border-radius:12px;padding:10px;background:#07171c;display:grid;grid-template-columns:33px 1fr;gap:9px;align-items:start;transition:border-color .15s,background .15s}.routeCase:hover{border-color:#5b8791;background:#0a2026}.routeCase>span{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;background:#15343d;color:#e3bf5c;font:900 9px ui-monospace}.routeCase b,.routeCase small{display:block}.routeCase b{font-size:10px}.routeCase small{font:800 7px ui-monospace;color:#688188;margin-top:4px}.routeCase>i{grid-column:1/-1;height:4px;border-radius:99px;background:#0c2b33;overflow:hidden}.routeCase>i em{display:block;height:100%;background:#d5b34e}.routeCase.done{opacity:.72}.routeCase.done>span{background:#133227;color:#7cd7a8}.routeCase.current{border-color:#7a6534}.intelRail{display:grid;gap:9px;align-content:start}.intelBlock{border:1px solid #294750;border-radius:14px;background:#08191e;padding:14px;box-shadow:0 18px 55px #0004}.intelBlock header{display:flex;justify-content:space-between;align-items:center}.intelBlock header b{font-size:18px;color:#e0be5d}.intelBlock h3{font-size:16px;margin:8px 0 5px}.intelBlock p{font-size:9px;line-height:1.55;color:#7f969b;margin:0 0 11px}.intelBlock>a{font-size:9px;color:#7bd4de;font-weight:850}.intelBlock.urgent{border-color:#665b37;background:linear-gradient(180deg,#17190f,#0a1718)}.intelBlock.system{border-color:#31594b}.intelBlock.system header b{font-size:12px;color:#6bd99e}.miniStats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.miniStats div{padding:8px;border:1px solid #28464e;border-radius:9px;background:#061519}.miniStats strong,.miniStats small{display:block}.miniStats strong{font-size:16px}.miniStats small{font:750 6px ui-monospace;color:#6c8388;margin-top:3px}.adminLaunch{display:grid;gap:3px;border:1px solid #715e35;border-radius:12px;padding:12px;background:#201b0f;color:#efd071}.adminLaunch span{font:800 7px ui-monospace}.adminLaunch b{font-size:10px}@media(max-width:1200px){.hqBody{grid-template-columns:220px 1fr}.intelRail{grid-column:1/-1;grid-template-columns:repeat(4,1fr)}.adminLaunch{align-content:center}.operationsDeck{min-height:auto}}@media(max-width:900px){.hqTop nav{display:none}.hqBody{grid-template-columns:1fr;padding:8px}.operatorRail{display:grid;grid-template-columns:130px 1fr;min-height:180px}.operatorScene{height:180px;grid-row:1/5}.operatorScene img{max-height:160px}.operatorIdentity{padding:17px 14px 4px}.rankLine,.rankBar{margin-left:0;margin-right:14px}.operatorStats{margin:8px 14px 0 0}.trialTag,.profileAction{margin-left:0;margin-right:14px}.mainOps{grid-template-columns:1fr}.routeTrack{grid-template-columns:repeat(2,1fr)}.intelRail{grid-template-columns:repeat(2,1fr)}.operationsDeck{padding:12px}.deckHead h2{font-size:21px}.portalCopy h3{font-size:24px}}@media(max-width:560px){.hqUser>div{display:none}.operatorRail{display:block}.operatorScene{height:210px}.operatorStats{margin:10px 0 0}.trialTag,.profileAction{margin-left:14px;margin-right:14px}.rankLine{margin:0;padding-left:14px;padding-right:14px}.rankBar{margin:0 14px}.routeTrack,.intelRail{grid-template-columns:1fr}.deckHead{display:block}.live{margin-top:8px;width:max-content}.opPortal{min-height:210px;padding:18px}.portalIcon{width:48px;height:48px;font-size:21px}.portalCopy h3{font-size:22px}}
`;
