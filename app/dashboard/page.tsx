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
    sb.from('missions_client').select('id,syllabus_id').eq('status','published'),
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

  return <main className="opsRoot">
    <div className="opsBackdrop" aria-hidden="true"><i/><i/><i/><i/></div>
    <header className="opsTop">
      <a className="opsBrand" href="/dashboard">JURIS<span>QUEST</span></a>
      <nav><a className="active" href="/dashboard">Central</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a>{primarySyllabus&&<a href={`/syllabus/${primarySyllabus.id}`}>Edital</a>}</nav>
      <div className="opsTopStatus"><span className="onlineDot"/>RUNTIME V4</div>
      <a className="opsAvatar" href="/profile"><img src={avatar} alt=""/><span><b>{displayName}</b><small>{role}</small></span></a>
      <form action={logout}><button className="opsExit">Sair</button></form>
    </header>

    <section className="opsViewport">
      <div className="opsIntro">
        <span className="opsEy">CENTRAL DE OPERAÇÕES</span>
        <h1>Qual é a próxima missão?</h1>
        <p>O mesmo motor de jogo. Dois ritmos de estudo.</p>
      </div>

      <div className="modeDeck">
        <a href={patrolHref} className="modeGate patrolGate">
          <div className="gateScene" aria-hidden="true"><div className="radar"><i/><i/><i/></div><div className="street"><i/><i/><i/></div><div className="signal"><b>01</b><span>CHAMADO ATIVO</span></div></div>
          <div className="gateShade"/>
          <div className="gateContent">
            <div className="gateMeta"><span>PLANTÃO</span><b>{activePatrol?'EM ANDAMENTO':'ADAPTATIVO'}</b></div>
            <h2>{activePatrol?'Retomar o turno':'Assumir o Plantão'}</h2>
            <p>{dueCount?`${dueCount} revisão${dueCount>1?'ões':''} vencida${dueCount>1?'s':''} será${dueCount>1?'ão':''} priorizada${dueCount>1?'s':''}.`:errorCount?`${errorCount} ponto${errorCount>1?'s':''} fraco${errorCount>1?'s':''} pode${errorCount>1?'m':''} voltar em novas ocorrências.`:'Ocorrências curtas escolhidas pelo seu histórico e pelo edital.'}</p>
            <div className="gateFoot"><span>{activePatrol?`${activePatrol.answered_count}/${activePatrol.item_count} ocorrências`:'3–8 min • revisão • lacunas'}</span><strong>ENTRAR <i>→</i></strong></div>
          </div>
        </a>

        <a href={nextCampaignHref} className="modeGate campaignGate">
          <div className="gateScene" aria-hidden="true"><div className="caseTape">CASO {nextMission?.sequence_no?String(nextMission.sequence_no).padStart(2,'0'):'—'}</div><div className="evidence"><i/><i/><i/><i/></div><div className="caseLight"/></div>
          <div className="gateShade"/>
          <div className="gateContent">
            <div className="gateMeta"><span>CAMPANHA</span><b>{inProgress?'CASO ABERTO':'INVESTIGAÇÃO'}</b></div>
            <h2>{nextMission?.title||'Arquivo de Casos'}</h2>
            <p>{nextMission?.summary||'Escolha um dossiê e resolva a situação como quem exerce o cargo.'}</p>
            <div className="gateFoot"><span>narrativa • evidências • decisões</span><strong>{nextMission?'ABRIR CASO':'VER ARQUIVO'} <i>→</i></strong></div>
          </div>
        </a>
      </div>

      <section className="opsConsole">
        <div className="playerDock">
          <div className="playerPortrait"><div className="portraitHalo"/><img src={avatar} alt=""/><i/></div>
          <div className="playerData"><span className="opsEy">OPERADOR</span><h3>{displayName}</h3><p>{role}</p><div className="rank"><span>NÍVEL {level}</span><b>{xp} XP</b></div><div className="rankBar"><i style={{width:`${levelPct}%`}}/></div></div>
          <a href="/profile">PERSONAGEM →</a>
        </div>

        <div className="intelTicker">
          <a href="/review" className={dueCount?'urgent':''}><span>RECUPERAÇÃO</span><b>{dueCount}</b><small>{dueCount?'revisões vencidas':'memória em dia'}</small></a>
          <div><span>CASOS</span><b>{completed}</b><small>concluídos</small></div>
          <div><span>PONTOS FRACOS</span><b>{errorCount}</b><small>monitorados</small></div>
          {primarySyllabus&&<a href={`/syllabus/${primarySyllabus.id}`}><span>EDITAL ATIVO</span><b>§</b><small>{primarySyllabus.title}</small></a>}
          {trial&&<div className="trial"><span>ACESSO TESTE</span><b>{trialDays??'—'}</b><small>dias restantes</small></div>}
        </div>
      </section>

      <section className="campaignRail">
        <header><div><span className="opsEy">ROTA DA CAMPANHA</span><h3>Dossiês disponíveis</h3></div><a href="/archive">Arquivo completo →</a></header>
        <div className="caseStrip">{(catalog||[]).map((m:any)=>{const p:any=pmap.get(m.mission_id);const pct=p?.status==='completed'?100:Number(p?.progress_percent||0);const available=ok.has(m.mission_id);const done=p?.status==='completed';return <a key={m.mission_id} className={`caseNode ${done?'done':''} ${pct>0&&!done?'current':''}`} href={available?`/game/${m.mission_id}`:'/premium'}><span>{String(m.sequence_no||0).padStart(2,'0')}</span><div><b>{m.title}</b><small>{done?'CONCLUÍDO':pct?`${pct}% EM ANDAMENTO`:available?'DISPONÍVEL':'BLOQUEADO'}</small></div><i><em style={{width:`${pct}%`}}/></i></a>})}</div>
      </section>

      {isAdmin===true&&<a className="adminPortal" href="/admin"><span>CONTROLE DE OPERAÇÕES</span><b>Entrar no ADM</b><i>→</i></a>}
    </section>

    <nav className="mobileNav"><a className="active" href="/dashboard">Início</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a><a href="/profile">Perfil</a></nav>
    <style>{CSS}</style>
  </main>;
}

const CSS=`
.opsRoot{min-height:100vh;background:#03080b;color:#edf4f2;font-family:var(--jq-font);overflow-x:hidden;position:relative}.opsBackdrop{position:fixed;inset:0;pointer-events:none;overflow:hidden;background:radial-gradient(circle at 50% -8%,#174b574d 0,transparent 34%),linear-gradient(180deg,#071318,#03080b 58%)}.opsBackdrop:before{content:"";position:absolute;inset:0;background-image:linear-gradient(#16303822 1px,transparent 1px),linear-gradient(90deg,#16303822 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(180deg,#000,transparent 70%)}.opsBackdrop:after{content:"";position:absolute;left:-10%;right:-10%;bottom:-26%;height:55%;background:radial-gradient(ellipse at center,#12313a55,transparent 64%);transform:perspective(600px) rotateX(62deg)}.opsBackdrop>i{position:absolute;width:1px;height:180%;top:-40%;background:linear-gradient(transparent,#5bd4e326,transparent);transform:rotate(16deg)}.opsBackdrop>i:nth-child(1){left:18%}.opsBackdrop>i:nth-child(2){left:39%}.opsBackdrop>i:nth-child(3){left:67%}.opsBackdrop>i:nth-child(4){left:83%}.opsTop{height:72px;position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:18px;padding:0 clamp(16px,2.2vw,34px);border-bottom:1px solid #203840;background:#041015ef;backdrop-filter:blur(20px)}.opsBrand{font-size:18px;font-weight:950;letter-spacing:2.2px}.opsBrand span{color:#e2bc5a}.opsTop nav{display:flex;gap:3px}.opsTop nav a{padding:9px 11px;border-radius:9px;color:#74898e;font-size:10px;font-weight:850}.opsTop nav a:hover,.opsTop nav a.active{color:#f0f5f4;background:#0b2027}.opsTopStatus{margin-left:auto;display:flex;align-items:center;gap:7px;color:#6d858b;font:800 8px var(--jq-mono);letter-spacing:.08em}.onlineDot{width:7px;height:7px;border-radius:50%;background:#6fd39d;box-shadow:0 0 14px #6fd39d}.opsAvatar{display:flex;align-items:center;gap:8px;padding:5px 9px;border-left:1px solid #203941}.opsAvatar img{width:34px;height:38px;object-fit:contain}.opsAvatar span{display:grid}.opsAvatar b{font-size:9px}.opsAvatar small{font-size:7px;color:#71878c}.opsExit{border:1px solid #2e4850;border-radius:8px;background:#07161b;color:#81959a;padding:7px 9px;font-size:8px;cursor:pointer}.opsViewport{position:relative;z-index:2;width:min(1500px,calc(100% - 32px));margin:auto;padding:28px 0 48px}.opsIntro{display:grid;grid-template-columns:1fr auto;align-items:end;margin:0 2px 18px}.opsIntro .opsEy{grid-column:1}.opsIntro h1{grid-column:1;font-size:clamp(30px,3vw,46px);letter-spacing:-.045em;margin:5px 0 0}.opsIntro p{grid-column:2;grid-row:1/3;align-self:end;margin:0 0 5px;color:#6f858a;font-size:11px}.opsEy{font:900 8px var(--jq-mono);letter-spacing:.15em;color:#69d8e3}.modeDeck{display:grid;grid-template-columns:1fr 1fr;gap:14px;min-height:430px}.modeGate{position:relative;display:flex;align-items:end;overflow:hidden;border:1px solid #31505a;border-radius:24px;background:#08191e;box-shadow:0 28px 90px #0007;isolation:isolate;transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}.modeGate:hover{transform:translateY(-3px);border-color:#527783;box-shadow:0 34px 110px #0009}.gateScene{position:absolute;inset:0;overflow:hidden}.gateShade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 22%,#03101555 53%,#041116 88%);z-index:2}.gateContent{position:relative;z-index:3;width:100%;padding:28px 30px 26px}.gateMeta{display:flex;gap:8px;align-items:center}.gateMeta span,.gateMeta b{font:900 8px var(--jq-mono);letter-spacing:.12em}.gateMeta span{color:#6bd7e3}.gateMeta b{padding:5px 7px;border:1px solid #45606a;border-radius:999px;color:#adc1c4}.gateContent h2{font-size:clamp(28px,2.7vw,42px);letter-spacing:-.04em;margin:8px 0 9px}.gateContent p{max-width:600px;min-height:42px;margin:0;color:#9caeb1;font-size:12px;line-height:1.65}.gateFoot{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:22px;padding-top:16px;border-top:1px solid #2c464d}.gateFoot span{color:#6f858a;font:750 8px var(--jq-mono)}.gateFoot strong{font-size:10px;color:#f1d078;letter-spacing:.04em}.gateFoot strong i{font-style:normal;font-size:15px;margin-left:5px}.patrolGate{border-color:#365760}.patrolGate .gateScene{background:radial-gradient(circle at 72% 25%,#2ca7b84d,transparent 29%),linear-gradient(165deg,#0b2d37,#07151a 60%)}.radar{position:absolute;right:5%;top:-8%;width:320px;height:320px;border:1px solid #5cd5e43b;border-radius:50%;box-shadow:inset 0 0 70px #38b9ca16}.radar:before,.radar:after,.radar i{content:"";position:absolute;inset:15%;border:1px solid #5cd5e326;border-radius:50%}.radar:after{inset:31%}.radar i:nth-child(1){inset:47%;background:#65d8e3;border:0;box-shadow:0 0 34px #65d8e3}.radar i:nth-child(2){left:50%;top:50%;width:43%;height:1px;border:0;border-radius:0;background:linear-gradient(90deg,#69d8e3,transparent);transform-origin:left;animation:radarSpin 5s linear infinite}.radar i:nth-child(3){inset:0;border:0;background:conic-gradient(from 20deg,#69d8e329,transparent 20deg 360deg)}@keyframes radarSpin{to{transform:rotate(360deg)}}.street{position:absolute;left:-8%;right:-8%;bottom:10%;height:42%;background:linear-gradient(170deg,#15262c,#091217);transform:skewY(-4deg);border-top:1px solid #38515a}.street i{position:absolute;width:19%;height:4px;background:#f0cd7040;bottom:35%;transform:rotate(-4deg)}.street i:nth-child(1){left:8%}.street i:nth-child(2){left:38%}.street i:nth-child(3){left:68%}.signal{position:absolute;left:30px;top:28px;display:grid}.signal b{font-size:54px;line-height:.9;color:#e7c55d22;font-weight:950}.signal span{font:900 8px var(--jq-mono);color:#6dd9e4;letter-spacing:.15em}.campaignGate{border-color:#594d30}.campaignGate .gateScene{background:radial-gradient(circle at 28% 24%,#ce9e3f31,transparent 30%),linear-gradient(155deg,#2a2517,#091417 62%)}.caseTape{position:absolute;left:-6%;right:-6%;top:18%;padding:8px 0;border-top:1px solid #d6af4b47;border-bottom:1px solid #d6af4b47;color:#dfbd6052;font:950 13px var(--jq-mono);letter-spacing:.4em;transform:rotate(-3deg);text-align:center}.evidence{position:absolute;inset:12% 8% 28%;display:grid;grid-template-columns:1fr 1fr;gap:9% 12%;transform:rotate(2deg);opacity:.65}.evidence i{border:1px solid #5f5d4e;background:linear-gradient(135deg,#d9c48f12,#ffffff05);box-shadow:0 18px 35px #0007;transform:rotate(-2deg)}.evidence i:nth-child(2){transform:rotate(4deg)}.evidence i:nth-child(3){transform:rotate(2deg)}.evidence i:nth-child(4){transform:rotate(-5deg)}.caseLight{position:absolute;right:-8%;top:-18%;width:50%;height:70%;background:radial-gradient(circle,#f3cf6a25,transparent 58%)}.opsConsole{display:grid;grid-template-columns:minmax(360px, .8fr) 1.6fr;gap:12px;margin-top:12px}.playerDock{min-height:145px;display:grid;grid-template-columns:120px 1fr auto;align-items:center;gap:14px;padding:14px 18px;border:1px solid #294650;border-radius:18px;background:linear-gradient(120deg,#0b2026,#071419);box-shadow:0 16px 50px #0004}.playerPortrait{height:115px;position:relative;display:flex;align-items:end;justify-content:center}.playerPortrait img{position:relative;z-index:2;max-height:112px;filter:drop-shadow(0 12px 14px #0009)}.portraitHalo{position:absolute;width:110px;height:110px;border-radius:50%;background:#36a8b538;filter:blur(25px)}.playerPortrait>i{position:absolute;z-index:1;bottom:3px;width:76px;height:18px;border:1px solid #67d8e4;border-radius:50%;box-shadow:0 0 20px #67d8e43a}.playerData h3{font-size:21px;margin:4px 0 1px}.playerData p{margin:0;color:#dabb60;font-size:10px;font-weight:800}.rank{display:flex;justify-content:space-between;margin-top:12px;color:#879b9f;font:800 8px var(--jq-mono)}.rank span{color:#e1bd5e}.rankBar{height:5px;margin-top:5px;border-radius:99px;background:#0d2931;overflow:hidden}.rankBar i{display:block;height:100%;background:linear-gradient(90deg,#60d6e2,#e2bd5a)}.playerDock>a{align-self:end;margin-bottom:3px;color:#72ccd6;font-size:8px;font-weight:900}.intelTicker{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #294650;border-radius:18px;background:#071419;overflow:hidden}.intelTicker>a,.intelTicker>div{min-width:0;padding:19px 16px;border-right:1px solid #213b43;display:grid;align-content:center;gap:3px}.intelTicker>*:last-child{border-right:0}.intelTicker span{font:850 7px var(--jq-mono);color:#607b81;letter-spacing:.1em}.intelTicker b{font-size:28px;line-height:1}.intelTicker small{font-size:8px;color:#789095;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.intelTicker .urgent{background:#241d0f}.intelTicker .urgent b,.intelTicker .trial b{color:#e4bf5d}.campaignRail{margin-top:24px}.campaignRail>header{display:flex;justify-content:space-between;align-items:end;margin-bottom:9px}.campaignRail h3{font-size:18px;margin:4px 0 0}.campaignRail header>a{font-size:9px;color:#79ced7}.caseStrip{display:flex;gap:8px;overflow-x:auto;padding-bottom:5px;scrollbar-width:thin}.caseNode{flex:0 0 225px;display:grid;grid-template-columns:38px 1fr;gap:9px;padding:12px;border:1px solid #28454e;border-radius:13px;background:#07161b;transition:border-color .18s,transform .18s}.caseNode:hover{transform:translateY(-2px);border-color:#4b6e78}.caseNode>span{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:#102b33;color:#e2bd5a;font:900 9px var(--jq-mono)}.caseNode div{min-width:0}.caseNode b,.caseNode small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.caseNode b{font-size:10px}.caseNode small{font:750 7px var(--jq-mono);color:#6d858a;margin-top:4px}.caseNode>i{grid-column:1/3;height:3px;border-radius:99px;background:#102831;overflow:hidden}.caseNode>i em{display:block;height:100%;background:#e2bd5a}.caseNode.done{border-color:#35594a}.caseNode.done>span{color:#79d2a3}.caseNode.current{box-shadow:inset 0 0 0 1px #e2bd5a26}.adminPortal{margin-top:12px;min-height:52px;display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:0 16px;border:1px dashed #765f2e;border-radius:12px;background:#17140b;color:#e4c362}.adminPortal span{font:800 8px var(--jq-mono);letter-spacing:.12em}.adminPortal b{font-size:10px}.adminPortal i{font-style:normal}.mobileNav{display:none}
@media(max-width:1100px){.opsTopStatus{display:none}.opsViewport{width:min(100% - 20px,1200px)}.modeDeck{min-height:380px}.opsConsole{grid-template-columns:1fr}.intelTicker{min-height:110px}.opsIntro p{display:none}}
@media(max-width:760px){.opsTop{height:58px;padding:0 11px}.opsTop nav,.opsExit,.opsAvatar span{display:none}.opsAvatar{margin-left:auto;border:0}.opsAvatar img{width:32px}.opsViewport{width:100%;padding:16px 9px 82px}.opsIntro{display:block;padding:0 4px}.opsIntro h1{font-size:29px}.modeDeck{grid-template-columns:1fr;min-height:0}.modeGate{min-height:340px;border-radius:18px}.gateContent{padding:21px}.gateContent h2{font-size:30px}.opsConsole{margin-top:9px}.playerDock{grid-template-columns:85px 1fr;padding:10px 12px}.playerDock>a{display:none}.playerPortrait{height:92px}.playerPortrait img{max-height:88px}.intelTicker{grid-template-columns:repeat(2,1fr)}.intelTicker>*{min-height:86px}.campaignRail{margin-top:18px}.caseNode{flex-basis:205px}.mobileNav{position:fixed;z-index:60;display:grid;grid-template-columns:repeat(5,1fr);left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));border:1px solid #2e4b54;border-radius:14px;background:#061217ef;backdrop-filter:blur(16px);box-shadow:0 15px 45px #000a}.mobileNav a{text-align:center;padding:10px 3px;color:#718a90;font-size:8px;font-weight:850}.mobileNav a.active{color:#e4bd5d}}
@media(prefers-reduced-motion:reduce){.radar i:nth-child(2){animation:none}}
`;
