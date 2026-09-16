'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { abandonPlantao, startPlantao, submitPlantaoAnswer } from '@/app/plantao/actions';
import { chibiSvg } from '@/lib/game/character-assets-v2';
import { svgUri } from '@/lib/game/studio-assets';

type Character={name:string;role:string;archetype:string};
type Evidence={id:string;label:string;detail:string;kind:string};
type Occurrence={
  runId:string;itemId:string;sequence:number;total:number;prioritySource:string;
  missionTitle:string;summary:string;decisionTitle:string;question:string;choices:string[];
  location:string;sceneTitle:string;environment:string;evidence:Evidence[];character:Character;
};
type RunSummary={id:string;item_count:number;answered_count:number;correct_count:number;xp_earned:number;summary:any;started_at:string;completed_at?:string|null};
type ReportItem={id:string;sequence_no:number;correct:boolean|null;priority_source:string;missionTitle:string;decisionTitle:string};
type Props={
  view:'landing'|'active'|'complete';
  occurrence?:Occurrence;
  run?:RunSummary;
  reportItems?:ReportItem[];
  dueCount?:number;
  xp?:number;
  streak?:number;
  recentRuns?:RunSummary[];
  error?:string;
};

const PRIORITY:Record<string,{label:string;why:string}>={
  review_due:{label:'REVISÃO VENCIDA',why:'Este conteúdo chegou ao ponto de recuperação ativa.'},
  error:{label:'PONTO FRACO',why:'Você já tropeçou nesta decisão. O Plantão trouxe o tema de volta.'},
  gap:{label:'LACUNA DO EDITAL',why:'Conteúdo ainda sem domínio consolidado na sua campanha.'},
  maintenance:{label:'MANUTENÇÃO',why:'Tema já visto, reapresentado para manter a regra disponível.'},
};

export default function PatrolMode(props:Props){
  if(props.view==='active'&&props.occurrence)return <Active occurrence={props.occurrence}/>;
  if(props.view==='complete'&&props.run)return <Complete run={props.run} items={props.reportItems||[]}/>;
  return <Landing {...props}/>;
}

function Landing({dueCount=0,xp=0,streak=0,recentRuns=[],error}:Props){
  return <main className="patrolRoot">
    <TopBar/>
    <section className="patrolLanding">
      <div className="dispatchHero">
        <div className="dispatchCopy">
          <div className="radioLine"><span className="radioDot"/> CENTRAL JURISQUEST • TURNO ADAPTATIVO</div>
          <h1>PLANTÃO</h1>
          <p>Ocorrências curtas escolhidas pelo seu histórico: primeiro o que está vencendo, depois o que você errou, em seguida as lacunas do edital.</p>
          <form action={startPlantao} className="startForm">
            <input type="hidden" name="size" value="5"/>
            <button className="patrolPrimary" type="submit"><span>▶</span> Assumir plantão</button>
            <small>5 ocorrências • aproximadamente 5–10 minutos</small>
          </form>
          {error&&<div className="patrolError">{error}</div>}
        </div>
        <div className="dispatchVisual" aria-hidden="true">
          <div className="dispatchGlow"/>
          <div className="dispatchBuilding"><i/><i/><i/><i/><i/><i/></div>
          <div className="dispatchRoad"><b/><b/><b/></div>
          <div className="dispatchCall"><span>CHAMADA</span><strong>Conteúdo adaptativo pronto</strong><small>Revisão • erros • edital</small></div>
        </div>
      </div>

      <section className="patrolStats">
        <article><small>XP TOTAL</small><strong>{xp}</strong><span>progressão acumulada</span></article>
        <article><small>SEQUÊNCIA</small><strong>{streak}</strong><span>dias de atividade</span></article>
        <article className={dueCount?'attention':''}><small>REVISÕES VENCIDAS</small><strong>{dueCount}</strong><span>{dueCount?'entram primeiro no turno':'memória sob controle'}</span></article>
      </section>

      <section className="howPatrol">
        <div className="sectionEy">COMO FUNCIONA</div>
        <div className="patrolFlow">
          <article><b>01</b><strong>Receba a ocorrência</strong><p>Contexto profissional curto, ligado ao seu cargo e ao conteúdo disponível.</p></article>
          <article><b>02</b><strong>Observe os elementos</strong><p>Leia a cena, identifique fatos relevantes e filtre o que realmente muda a decisão.</p></article>
          <article><b>03</b><strong>Decida</strong><p>A resposta é registrada no servidor e comparada com a regra da missão publicada.</p></article>
          <article><b>04</b><strong>Feche o turno</strong><p>Erros geram recuperação; acertos alimentam domínio e o relatório final.</p></article>
        </div>
      </section>

      {!!recentRuns.length&&<section className="recentPatrols"><div className="sectionEy">ÚLTIMOS TURNOS</div>{recentRuns.slice(0,3).map(r=><div className="recentRow" key={r.id}><span>{new Date(r.started_at).toLocaleDateString('pt-BR')}</span><b>{r.correct_count}/{r.item_count} corretas</b><strong>+{r.xp_earned} XP</strong></div>)}</section>}
    </section>
    <style jsx global>{CSS}</style>
  </main>
}

function Active({occurrence:o}:{occurrence:Occurrence}){
  const router=useRouter();
  const [phase,setPhase]=useState<'dispatch'|'scene'|'decision'|'feedback'>('dispatch');
  const [seen,setSeen]=useState<string[]>([]);
  const [selected,setSelected]=useState<number|null>(null);
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const priority=PRIORITY[o.prioritySource]||PRIORITY.gap;
  const allSeen=o.evidence.length===0||o.evidence.every(e=>seen.includes(e.id));
  const avatar=useMemo(()=>svgUri(chibiSvg(o.character.archetype||'operational','player')),[o.character.archetype]);

  function inspect(id:string){setSeen(v=>v.includes(id)?v:[...v,id])}
  async function answer(index:number){
    if(busy||phase!=='decision')return;
    setBusy(true);setError('');setSelected(index);
    const response=await submitPlantaoAnswer({runId:o.runId,itemId:o.itemId,index});
    if(!response.ok){setError(response.error||'Falha ao registrar decisão.');setBusy(false);return}
    setResult(response.data);setPhase('feedback');setBusy(false);
  }
  function next(){router.refresh()}

  const fb=result?.feedback||{};
  return <main className={`patrolRoot patrolScene env-${o.environment||'default'}`}>
    <TopBar compact/>
    <div className="patrolHud">
      <section className="hudOperator"><img src={avatar} alt=""/><div><small>{o.character.role}</small><strong>{o.character.name}</strong><span>Plantão em andamento</span></div></section>
      <section className="hudProgress"><small>OCORRÊNCIA</small><strong>{o.sequence}<span>/ {o.total}</span></strong><div><i style={{width:`${Math.max(4,((o.sequence-1)/o.total)*100)}%`}}/></div></section>
      <section className="hudPriority"><small>PRIORIDADE</small><strong>{priority.label}</strong><span>{priority.why}</span></section>
    </div>

    <section className="sceneViewport">
      <div className="sceneAtmosphere"><i/><i/><i/><i/></div>
      <div className="sceneArchitecture"><b/><b/><b/><b/><b/></div>
      <div className="sceneFloor"><i/><i/><i/></div>
      <div className="sceneCaption"><span>{o.location||'LOCAL DA OCORRÊNCIA'}</span><strong>{o.sceneTitle||o.missionTitle}</strong></div>
      <div className="sceneMissionStamp">{o.missionTitle}</div>
    </section>

    <section className="patrolConsole">
      {phase==='dispatch'&&<div className="consolePanel dispatchPanel">
        <div className="consoleEy"><span className="radioDot"/> CHAMADA DA CENTRAL</div>
        <h1>{o.missionTitle}</h1>
        <p>{o.summary}</p>
        <div className="callMeta"><span>{priority.label}</span><span>Ocorrência {o.sequence}/{o.total}</span></div>
        <button className="patrolPrimary" onClick={()=>setPhase('scene')}>Chegar ao local <b>→</b></button>
      </div>}

      {phase==='scene'&&<div className="consolePanel evidencePanel">
        <div className="consoleEy">OBSERVAÇÃO DA CENA</div>
        <h2>Identifique o que realmente importa</h2>
        <p className="consoleHint">Abra os elementos disponíveis antes de tomar a decisão. O objetivo não é decorar a resposta; é reconhecer os fatos que acionam a regra.</p>
        <div className="evidenceGrid">
          {o.evidence.length?o.evidence.map(e=><button key={e.id} className={seen.includes(e.id)?'seen':''} onClick={()=>inspect(e.id)}>
            <span>{e.kind==='actor'?'◉':'◇'}</span><div><small>{e.kind==='actor'?'PESSOA / DEPOIMENTO':'OBJETO / EVIDÊNCIA'}</small><strong>{e.label}</strong>{seen.includes(e.id)&&<p>{e.detail}</p>}</div><b>{seen.includes(e.id)?'ANALISADO':'EXAMINAR'}</b>
          </button>):<div className="noEvidence">A ocorrência já contém elementos suficientes para a decisão inicial.</div>}
        </div>
        <button className="patrolPrimary" disabled={!allSeen} onClick={()=>setPhase('decision')}>{allSeen?'Tomar decisão':'Analise todos os elementos'}</button>
      </div>}

      {phase==='decision'&&<div className="consolePanel decisionPanel">
        <div className="consoleEy">DECISÃO OPERACIONAL • {o.decisionTitle}</div>
        <h2>{o.question}</h2>
        <div className="patrolChoices">{o.choices.map((c,i)=><button key={i} disabled={busy} onClick={()=>void answer(i)}><span>{String.fromCharCode(65+i)}</span><strong>{c}</strong><i>Selecionar</i></button>)}</div>
        {error&&<div className="patrolError">{error}</div>}
      </div>}

      {phase==='feedback'&&<div className={`consolePanel feedbackPanel ${result?.correct?'correct':'wrong'}`}>
        <div className="feedbackVerdict"><span>{result?.correct?'✓':'!'}</span><div><small>{result?.correct?'DECISÃO CORRETA':'DECISÃO INCORRETA'}</small><h2>{result?.correct?'Providência confirmada':'Erro encaminhado para recuperação'}</h2></div></div>
        <div className="selectedAnswer"><small>SUA DECISÃO</small><strong>{selected!=null?o.choices[selected]:''}</strong></div>
        <div className="feedbackGrid">
          {fb.choice_feedback&&<Info title="POR QUE" text={fb.choice_feedback}/>} 
          {fb.rule&&<Info title="REGRA" text={fb.rule}/>} 
          {fb.application&&<Info title="APLICAÇÃO AO CASO" text={fb.application}/>} 
          {fb.legal_basis&&<Info title="BASE LEGAL" text={fb.legal_basis}/>} 
          {fb.trap&&<Info title="PEGADINHA" text={fb.trap}/>} 
          {fb.memory&&<Info title="MEMÓRIA DE PROVA" text={fb.memory} wide/>}
        </div>
        <div className="feedbackFooter"><div><small>TURNO</small><strong>{result?.answered_count||o.sequence}/{result?.item_count||o.total}</strong></div><div><small>ACERTOS</small><strong>{result?.correct_count||0}</strong></div>{result?.complete&&<div><small>RECOMPENSA</small><strong>+{result?.xp||0} XP</strong></div>}<button className="patrolPrimary" onClick={next}>{result?.complete?'Ver relatório do turno':'Próxima ocorrência'} <b>→</b></button></div>
      </div>}
    </section>

    <form action={abandonPlantao} className="leavePatrol"><input type="hidden" name="run_id" value={o.runId}/><button type="submit">Encerrar plantão e voltar ao painel</button></form>
    <style jsx global>{CSS}</style>
  </main>
}

function Complete({run,items}:{run:RunSummary;items:ReportItem[]}){
  const accuracy=run.item_count?Math.round((run.correct_count/run.item_count)*100):0;
  return <main className="patrolRoot">
    <TopBar/>
    <section className="patrolReport">
      <div className="reportHeader"><div className="sectionEy">RELATÓRIO DE TURNO</div><h1>Plantão encerrado</h1><p>Seu histórico foi atualizado. Erros deste turno já foram enviados para recuperação e podem voltar com prioridade.</p></div>
      <section className="reportScore"><div className="accuracyRing" style={{'--p':`${accuracy*3.6}deg`} as any}><strong>{accuracy}%</strong><span>precisão</span></div><article><small>OCORRÊNCIAS</small><strong>{run.item_count}</strong></article><article><small>ACERTOS</small><strong>{run.correct_count}</strong></article><article><small>XP DO TURNO</small><strong>+{run.xp_earned}</strong></article></section>
      <section className="reportList">{items.map(i=><article key={i.id} className={i.correct?'ok':'bad'}><span>{String(i.sequence_no).padStart(2,'0')}</span><div><small>{PRIORITY[i.priority_source]?.label||'PLANTÃO'}</small><strong>{i.missionTitle}</strong><p>{i.decisionTitle}</p></div><b>{i.correct?'CORRETA':'REVISAR'}</b></article>)}</section>
      <div className="reportActions"><form action={startPlantao}><input type="hidden" name="size" value="5"/><button className="patrolPrimary" type="submit">Iniciar novo plantão</button></form><a href="/review" className="patrolSecondary">Central de revisão</a><a href="/dashboard" className="patrolSecondary">Voltar ao painel</a></div>
    </section>
    <style jsx global>{CSS}</style>
  </main>
}

function Info({title,text,wide=false}:{title:string;text:string;wide?:boolean}){return <article className={wide?'wide':''}><small>{title}</small><p>{text}</p></article>}
function TopBar({compact=false}:{compact?:boolean}){return <header className={`patrolTop ${compact?'compact':''}`}><a href="/dashboard" className="patrolBrand">JURIS<span>QUEST</span></a><nav><a href="/dashboard">Início</a><a className="active" href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a></nav><a className="backDash" href="/dashboard">← Painel</a></header>}

const CSS=`
*{box-sizing:border-box}.patrolRoot{min-height:100vh;background:#050d11;color:#edf4f3;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.patrolTop{height:68px;display:flex;align-items:center;gap:28px;padding:0 clamp(18px,4vw,58px);border-bottom:1px solid #17313a;background:#071217eF;backdrop-filter:blur(18px);position:relative;z-index:30}.patrolTop.compact{position:absolute;inset:0 0 auto;height:60px;background:linear-gradient(180deg,#061116f5,#061116bb)}.patrolBrand{font-size:17px;letter-spacing:2.2px;font-weight:950;color:#fff;text-decoration:none}.patrolBrand span{color:#e7bd59}.patrolTop nav{display:flex;gap:6px}.patrolTop nav a,.backDash{color:#8fa4a8;text-decoration:none;font-size:12px;font-weight:750;padding:9px 12px;border-radius:9px}.patrolTop nav a:hover,.patrolTop nav a.active{background:#0c222a;color:#edf5f5}.backDash{margin-left:auto;border:1px solid #29434b}.patrolLanding{max-width:1280px;margin:auto;padding:38px clamp(18px,4vw,52px) 70px}.dispatchHero{min-height:420px;border:1px solid #29464f;border-radius:24px;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.85fr);background:radial-gradient(circle at 18% 25%,#123642 0,transparent 38%),linear-gradient(135deg,#0b2027,#071317 60%);box-shadow:0 34px 120px #0008}.dispatchCopy{padding:clamp(34px,5vw,68px);align-self:center;position:relative;z-index:2}.radioLine,.consoleEy,.sectionEy{font:850 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.6px;color:#70dce8}.radioDot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#61e2b6;box-shadow:0 0 0 5px #61e2b618,0 0 18px #61e2b6;margin-right:8px}.dispatchCopy h1{font-size:clamp(58px,8vw,104px);line-height:.92;margin:20px 0 18px;letter-spacing:-5px}.dispatchCopy>p{max-width:650px;color:#a6b8ba;line-height:1.7;font-size:15px}.startForm{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:28px}.startForm small{color:#6f858a}.patrolPrimary{border:1px solid #d6ad4d;background:linear-gradient(180deg,#f0cd72,#c99d3e);color:#19160d;border-radius:12px;padding:13px 18px;font-weight:900;cursor:pointer;box-shadow:0 10px 30px #d8ad4140}.patrolPrimary:hover{filter:brightness(1.06);transform:translateY(-1px)}.patrolPrimary:disabled{filter:grayscale(1);opacity:.45;cursor:not-allowed;transform:none}.patrolSecondary{display:inline-flex;align-items:center;border:1px solid #35535d;border-radius:12px;padding:12px 16px;color:#c8d5d6;text-decoration:none;font-weight:750;font-size:12px;background:#0a1c22}.dispatchVisual{position:relative;min-height:420px;overflow:hidden;background:linear-gradient(180deg,#0a252e 0,#07171d 53%,#050a0d 54%)}.dispatchGlow{position:absolute;width:460px;height:460px;border-radius:50%;background:#1e86943a;filter:blur(40px);right:-100px;top:-180px}.dispatchBuilding{position:absolute;left:11%;right:9%;top:14%;height:44%;border:1px solid #31545c;background:linear-gradient(180deg,#102f38,#091c22);clip-path:polygon(7% 0,93% 0,100% 100%,0 100%);display:grid;grid-template-columns:repeat(3,1fr);gap:12%;padding:12% 17%}.dispatchBuilding i{background:#d9b55f25;border:1px solid #e0bd6540;box-shadow:0 0 22px #e0bd6520}.dispatchRoad{position:absolute;inset:58% 0 0;background:linear-gradient(165deg,#10181b,#070b0d);transform:skewY(-5deg);border-top:1px solid #2c4349}.dispatchRoad b{position:absolute;width:17%;height:4px;background:#d7bd6a55;bottom:36%;transform:rotate(-6deg)}.dispatchRoad b:nth-child(1){left:10%}.dispatchRoad b:nth-child(2){left:41%}.dispatchRoad b:nth-child(3){left:72%}.dispatchCall{position:absolute;left:8%;right:8%;bottom:7%;padding:15px 16px;border:1px solid #3a5b64;border-radius:13px;background:#061116e8;backdrop-filter:blur(10px);display:grid;gap:3px}.dispatchCall span{font:800 9px ui-monospace;color:#e9c463;letter-spacing:1.4px}.dispatchCall strong{font-size:13px}.dispatchCall small{color:#789096}.patrolStats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.patrolStats article{padding:18px 20px;border:1px solid #203b43;background:#08181e;border-radius:15px;display:grid;gap:3px}.patrolStats small{font:800 9px ui-monospace;color:#719099}.patrolStats strong{font-size:29px}.patrolStats span{font-size:11px;color:#71898f}.patrolStats .attention{border-color:#806a36;background:#211d12}.howPatrol,.recentPatrols{margin-top:34px}.patrolFlow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}.patrolFlow article{min-height:170px;padding:20px;border:1px solid #203a42;border-radius:16px;background:linear-gradient(180deg,#0a1d23,#071519)}.patrolFlow b{font:900 25px ui-monospace;color:#e1bb5c}.patrolFlow strong{display:block;margin:18px 0 7px}.patrolFlow p{font-size:12px;line-height:1.55;color:#81979c;margin:0}.recentRow{display:grid;grid-template-columns:1fr 2fr auto;gap:18px;padding:13px 16px;border-bottom:1px solid #1a3037;color:#83999e}.recentRow b{color:#c9d5d6}.recentRow strong{color:#e4bd5c}.patrolScene{height:100vh;overflow:hidden;position:relative;background:#071217}.sceneViewport{position:absolute;inset:0 0 0;background:radial-gradient(circle at 70% 22%,#2b6f7930 0,transparent 35%),linear-gradient(180deg,#102d35 0,#0c2026 48%,#091317 49%);overflow:hidden}.env-parking_night .sceneViewport{background:radial-gradient(circle at 78% 14%,#d8a84620 0,transparent 22%),radial-gradient(circle at 28% 25%,#1c667535 0,transparent 28%),linear-gradient(180deg,#0b2530,#07151a 48%,#080c0e 49%)}.env-police_station .sceneViewport{background:radial-gradient(circle at 55% 6%,#9ee7ef25 0,transparent 24%),linear-gradient(180deg,#12313a,#0b2026 50%,#0a1417 51%)}.env-courtroom .sceneViewport{background:radial-gradient(circle at 55% 3%,#e0b76818 0,transparent 24%),linear-gradient(180deg,#322b22,#191815 50%,#0f1112 51%)}.sceneAtmosphere{position:absolute;inset:0;opacity:.42}.sceneAtmosphere i{position:absolute;width:1px;height:90px;background:linear-gradient(180deg,transparent,#bcebf2,transparent);transform:rotate(12deg);animation:rain 2s linear infinite}.sceneAtmosphere i:nth-child(1){left:12%;top:10%}.sceneAtmosphere i:nth-child(2){left:39%;top:3%;animation-delay:-.7s}.sceneAtmosphere i:nth-child(3){left:69%;top:15%;animation-delay:-1.3s}.sceneAtmosphere i:nth-child(4){left:88%;top:1%;animation-delay:-.2s}.sceneArchitecture{position:absolute;left:8%;right:8%;top:14%;height:40%;display:flex;gap:3%;align-items:end;opacity:.85}.sceneArchitecture b{flex:1;height:64%;background:#0b2026;border:1px solid #26434b;box-shadow:inset 0 0 40px #0008}.sceneArchitecture b:nth-child(2){height:92%}.sceneArchitecture b:nth-child(3){height:75%}.sceneArchitecture b:nth-child(4){height:100%}.sceneArchitecture b:nth-child(5){height:82%}.sceneFloor{position:absolute;left:-10%;right:-10%;top:53%;bottom:-20%;background:linear-gradient(165deg,#10191b,#05090b);transform:perspective(500px) rotateX(55deg);transform-origin:top;border-top:1px solid #35515a}.sceneFloor i{position:absolute;left:0;right:0;height:1px;background:#46616a40}.sceneFloor i:nth-child(1){top:18%}.sceneFloor i:nth-child(2){top:44%}.sceneFloor i:nth-child(3){top:72%}.sceneCaption{position:absolute;left:4vw;top:90px;display:grid;gap:4px;text-shadow:0 3px 16px #000}.sceneCaption span{font:800 9px ui-monospace;color:#78dce8;letter-spacing:1.4px}.sceneCaption strong{font-size:18px}.sceneMissionStamp{position:absolute;right:4vw;top:94px;border:1px solid #40565b;padding:7px 10px;border-radius:8px;background:#061116aa;color:#8ea4a8;font:800 9px ui-monospace;letter-spacing:1px}.patrolHud{position:absolute;z-index:10;top:78px;left:50%;transform:translateX(-50%);width:min(92vw,1120px);display:grid;grid-template-columns:1.1fr .8fr 1.3fr;gap:8px}.patrolHud>section{min-height:70px;border:1px solid #2d4d56;background:#061116df;backdrop-filter:blur(12px);border-radius:13px;padding:10px 13px}.hudOperator{display:flex;align-items:center;gap:10px}.hudOperator img{width:50px;height:56px;object-fit:contain;filter:drop-shadow(0 5px 8px #0008)}.hudOperator div{display:grid}.hudOperator small,.hudProgress small,.hudPriority small{font:800 8px ui-monospace;color:#6eced9;letter-spacing:1px}.hudOperator strong{font-size:13px}.hudOperator span,.hudPriority span{font-size:9px;color:#789096}.hudProgress strong{font-size:22px;color:#e5c05f}.hudProgress strong span{font-size:10px;color:#799096}.hudProgress div{height:4px;border-radius:99px;background:#10252b;margin-top:8px;overflow:hidden}.hudProgress i{display:block;height:100%;background:linear-gradient(90deg,#55d4df,#e5bd58)}.hudPriority{display:grid;gap:3px}.hudPriority strong{font-size:11px;color:#e3bd5d}.patrolConsole{position:absolute;z-index:11;left:50%;transform:translateX(-50%);bottom:36px;width:min(92vw,940px)}.consolePanel{max-height:54vh;overflow:auto;padding:20px 22px;border:1px solid #365a64;border-radius:18px;background:linear-gradient(180deg,#07171deb,#050e12f5);backdrop-filter:blur(18px);box-shadow:0 24px 70px #000a}.consolePanel h1{font-size:28px;margin:8px 0}.consolePanel h2{font-size:21px;margin:7px 0 11px}.consolePanel>p{color:#9aadb0;line-height:1.6;font-size:12px}.callMeta{display:flex;gap:8px;margin:15px 0}.callMeta span{padding:6px 8px;border:1px solid #35545c;border-radius:99px;color:#8fa4a8;font:750 9px ui-monospace}.consoleHint{max-width:760px}.evidenceGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.evidenceGrid button{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:start;text-align:left;border:1px solid #294852;border-radius:12px;background:#091b21;color:#dbe5e4;padding:12px;cursor:pointer}.evidenceGrid button:hover,.evidenceGrid button.seen{border-color:#58b8c3;background:#0b242c}.evidenceGrid button>span{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:#12343e;color:#77dce8}.evidenceGrid small{font:750 8px ui-monospace;color:#6f9299}.evidenceGrid strong{display:block;font-size:12px;margin-top:2px}.evidenceGrid p{font-size:10px;line-height:1.45;color:#9db0b3;margin:6px 0 0}.evidenceGrid button>b{font:800 8px ui-monospace;color:#d8b65b}.noEvidence{grid-column:1/-1;padding:17px;border:1px dashed #35525b;border-radius:12px;color:#81989c}.patrolChoices{display:grid;gap:8px;margin-top:15px}.patrolChoices button{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:11px;text-align:left;padding:12px;border:1px solid #2d4e58;border-radius:12px;background:#0a1d23;color:#e9f0ef;cursor:pointer}.patrolChoices button:hover{border-color:#64cdd9;background:#0d2931}.patrolChoices span{width:35px;height:35px;display:grid;place-items:center;border-radius:9px;background:#123540;color:#e5c05f;font-weight:900}.patrolChoices strong{font-size:12px}.patrolChoices i{font-style:normal;color:#6e8c92;font-size:9px}.feedbackPanel.correct{border-color:#3f8162}.feedbackPanel.wrong{border-color:#89524d}.feedbackVerdict{display:flex;gap:12px;align-items:center}.feedbackVerdict>span{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#123d2b;color:#83e0ad;font-size:25px;font-weight:900}.feedbackPanel.wrong .feedbackVerdict>span{background:#482523;color:#f09b92}.feedbackVerdict small{font:850 9px ui-monospace;color:#7cd8a6}.feedbackPanel.wrong .feedbackVerdict small{color:#eca099}.feedbackVerdict h2{margin:2px 0}.selectedAnswer{margin:12px 0;padding:10px 12px;border-left:3px solid #d4b355;background:#0c1c20;display:grid;gap:3px}.selectedAnswer small{font:800 8px ui-monospace;color:#8ea2a6}.selectedAnswer strong{font-size:11px}.feedbackGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.feedbackGrid article{padding:10px;border:1px solid #29464e;border-radius:10px;background:#061418}.feedbackGrid article.wide{grid-column:1/-1}.feedbackGrid small{font:800 8px ui-monospace;color:#65d4df}.feedbackGrid p{font-size:10px;line-height:1.45;color:#b0c0c2;margin:5px 0 0}.feedbackFooter{display:flex;gap:18px;align-items:end;margin-top:13px;border-top:1px solid #1e343a;padding-top:12px}.feedbackFooter>div{display:grid}.feedbackFooter small{font:800 8px ui-monospace;color:#708d93}.feedbackFooter strong{font-size:17px}.feedbackFooter .patrolPrimary{margin-left:auto}.leavePatrol{position:absolute;z-index:14;right:20px;bottom:12px}.leavePatrol button{border:0;background:none;color:#5f777d;font-size:9px;cursor:pointer}.leavePatrol button:hover{color:#d5e0e0}.patrolError{margin-top:12px;padding:10px 12px;border:1px solid #844c47;border-radius:10px;background:#2a1716;color:#ecaaa4;font-size:11px}.patrolReport{max-width:950px;margin:auto;padding:50px 20px 80px}.reportHeader{text-align:center;max-width:650px;margin:0 auto 28px}.reportHeader h1{font-size:44px;margin:8px 0}.reportHeader p{color:#8ea3a7;line-height:1.6}.reportScore{display:grid;grid-template-columns:180px repeat(3,1fr);gap:10px;align-items:stretch}.reportScore>article,.accuracyRing{border:1px solid #29464f;border-radius:16px;background:#091a20;min-height:150px;display:grid;place-items:center;align-content:center;gap:4px}.reportScore article small{font:800 8px ui-monospace;color:#789198}.reportScore article strong{font-size:29px}.accuracyRing{width:170px;height:170px;border-radius:50%;margin:auto;background:conic-gradient(#e3bd5c var(--p),#102329 0);position:relative}.accuracyRing:after{content:"";position:absolute;inset:12px;border-radius:50%;background:#071519}.accuracyRing strong,.accuracyRing span{position:relative;z-index:1}.accuracyRing strong{font-size:35px}.accuracyRing span{font-size:9px;color:#83999e}.reportList{display:grid;gap:8px;margin-top:22px}.reportList article{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid #29434b;border-radius:12px;background:#08171c}.reportList article.ok{border-left:3px solid #4c9a70}.reportList article.bad{border-left:3px solid #a05a53}.reportList>article>span{font:900 15px ui-monospace;color:#d9b75d}.reportList small{font:800 8px ui-monospace;color:#6b8c92}.reportList strong{display:block;font-size:12px}.reportList p{margin:2px 0 0;color:#789095;font-size:10px}.reportList>article>b{font:850 9px ui-monospace;color:#72c99a}.reportList article.bad>b{color:#e09289}.reportActions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:22px}@keyframes rain{from{transform:translateY(-130px) rotate(12deg)}to{transform:translateY(900px) rotate(12deg)}}
@media(max-width:820px){.patrolTop nav{display:none}.patrolTop{height:58px;padding:0 14px}.dispatchHero{grid-template-columns:1fr}.dispatchVisual{min-height:230px}.dispatchCopy{padding:28px}.dispatchCopy h1{font-size:58px;letter-spacing:-3px}.patrolStats,.patrolFlow{grid-template-columns:1fr 1fr}.patrolScene{height:auto;min-height:100svh;overflow:auto}.sceneViewport{position:fixed}.patrolHud{top:70px;grid-template-columns:1fr 1fr;width:calc(100vw - 22px)}.hudPriority{grid-column:1/-1;min-height:52px!important}.patrolConsole{position:relative;left:auto;transform:none;bottom:auto;width:auto;margin:220px 11px 55px}.consolePanel{max-height:none}.sceneCaption{top:160px;left:18px}.sceneMissionStamp{display:none}.evidenceGrid,.feedbackGrid{grid-template-columns:1fr}.feedbackGrid article.wide{grid-column:auto}.feedbackFooter{flex-wrap:wrap}.feedbackFooter .patrolPrimary{margin-left:0;width:100%}.leavePatrol{position:fixed;bottom:6px;right:8px}.reportScore{grid-template-columns:1fr 1fr}.accuracyRing{grid-row:span 2}.reportHeader h1{font-size:35px}}
@media(max-width:520px){.patrolStats,.patrolFlow{grid-template-columns:1fr}.dispatchCopy>p{font-size:13px}.patrolHud{grid-template-columns:1fr}.hudProgress{display:none}.hudPriority{grid-column:auto}.patrolConsole{margin-top:238px}.consolePanel{padding:16px}.consolePanel h2{font-size:18px}.patrolChoices button{grid-template-columns:34px 1fr}.patrolChoices i{display:none}.reportScore{grid-template-columns:1fr 1fr}.accuracyRing{grid-column:1/-1;grid-row:auto}.reportList article{grid-template-columns:34px 1fr}.reportList>article>b{grid-column:2}.recentRow{grid-template-columns:1fr auto}.recentRow b{grid-column:1/-1}}
`;
