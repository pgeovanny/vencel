'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LegacyPatrolMode from '@/components/patrol-mode';
import { submitPlantaoAnswer } from '@/app/plantao/actions';
import { chibiSvg } from '@/lib/game/character-assets-v2';
import { sceneSvg } from '@/lib/game/scene-assets-v3';
import { svgUri } from '@/lib/game/studio-assets';

type Character={name:string;role:string;archetype:string};
type SceneEntity={
  id:string;
  sourceId:string;
  kind:'actor'|'object';
  name:string;
  role?:string;
  style?:string;
  factTitle?:string;
  factText?:string;
  interactionText?:string;
  required:boolean;
  position:{x:number;y:number};
};
type Occurrence={
  runId:string;itemId:string;sequence:number;total:number;prioritySource:string;
  missionTitle:string;summary:string;decisionTitle:string;question:string;choices:string[];
  location:string;sceneTitle:string;environment:string;character:Character;
  entities:SceneEntity[];
  playerSpawn?:{x:number;y:number};
};
type Props={view:'landing'|'active'|'complete';occurrence?:Occurrence;[k:string]:any};

const PRIORITY:Record<string,{label:string;why:string}>={
  review_due:{label:'REVISÃO VENCIDA',why:'Conteúdo no ponto de recuperação ativa.'},
  error:{label:'PONTO FRACO',why:'Tema que já gerou erro e voltou ao seu turno.'},
  gap:{label:'LACUNA DO EDITAL',why:'Conteúdo ainda sem domínio consolidado.'},
  maintenance:{label:'MANUTENÇÃO',why:'Tema já visto, reapresentado para retenção.'},
};

const WORLD={w:1200,h:760};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const pctX=(x:number)=>`${clamp(x/WORLD.w*100,3,97)}%`;
const pctY=(y:number)=>`${clamp(y/WORLD.h*100,7,92)}%`;

export default function PatrolModeV2(props:Props){
  if(props.view!=='active'||!props.occurrence)return <LegacyPatrolMode {...props as any}/>;
  return <Active occurrence={props.occurrence}/>;
}

function Active({occurrence:o}:{occurrence:Occurrence}){
  const router=useRouter();
  const timerRef=useRef<number|null>(null);
  const [phase,setPhase]=useState<'dispatch'|'scene'|'decision'|'feedback'>('dispatch');
  const [seen,setSeen]=useState<string[]>([]);
  const [focus,setFocus]=useState<SceneEntity|null>(null);
  const [playerPos,setPlayerPos]=useState(o.playerSpawn||{x:600,y:650});
  const [moving,setMoving]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const priority=PRIORITY[o.prioritySource]||PRIORITY.gap;
  const required=o.entities.filter(e=>e.required);
  const allSeen=required.length===0||required.every(e=>seen.includes(e.id));
  const progress=required.length?Math.round(seen.filter(id=>required.some(e=>e.id===id)).length/required.length*100):100;
  const player=useMemo(()=>svgUri(chibiSvg(o.character.archetype||'operational','player')),[o.character.archetype]);
  const background=useMemo(()=>svgUri(sceneSvg(o.environment||'parking_night')),[o.environment]);

  function inspect(e:SceneEntity){
    if(moving||phase!=='scene')return;
    const target={x:clamp(e.position.x-55,50,1150),y:clamp(e.position.y+85,90,700)};
    setFocus(null);setMoving(true);setPlayerPos(target);
    if(timerRef.current)window.clearTimeout(timerRef.current);
    timerRef.current=window.setTimeout(()=>{
      setSeen(v=>v.includes(e.id)?v:[...v,e.id]);
      setFocus(e);setMoving(false);
    },460);
  }

  async function answer(index:number){
    if(busy||phase!=='decision')return;
    setBusy(true);setError('');setSelected(index);
    const response=await submitPlantaoAnswer({runId:o.runId,itemId:o.itemId,index});
    if(!response.ok){setError(response.error||'Falha ao registrar decisão.');setBusy(false);return}
    setResult(response.data);setPhase('feedback');setBusy(false);
  }

  function next(){router.refresh()}
  const fb=result?.feedback||{};

  return <main className="plantaoGame">
    <div className="plantaoScene" aria-label={o.location}>
      <img className="plantaoBackdrop" src={background} alt=""/>
      <div className="plantaoVignette"/>
      <div className="plantaoScan"/>
      <div className="plantaoAmbient" aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i}/>)}</div>
      <div className="plantaoBeacon beaconA"/><div className="plantaoBeacon beaconB"/>

      {o.entities.map((e,i)=>{
        const isSeen=seen.includes(e.id),isRequired=e.required;
        return <button
          key={e.id}
          type="button"
          className={`worldEntity ${e.kind} ${isRequired?'required':'ambient'} ${isSeen?'seen':''}`}
          style={{left:pctX(e.position.x),top:pctY(e.position.y),zIndex:30+Math.round(e.position.y)}}
          onClick={()=>inspect(e)}
          disabled={moving||phase!=='scene'}
          aria-label={`${e.interactionText||'Examinar'} ${e.name}`}
        >
          {e.kind==='actor'?<img src={svgUri(chibiSvg(e.style||'civilian'))} alt=""/>:<span className="evidenceGlyph">{i%2?'◆':'◇'}</span>}
          <span className="entityTag"><b>{e.name}</b><small>{isSeen?'REGISTRADO':e.role||'EVIDÊNCIA'}</small></span>
          {isRequired&&!isSeen&&<span className="entityPulse"/>}
        </button>
      })}

      <div className={`worldPlayer ${moving?'moving':''}`} style={{left:pctX(playerPos.x),top:pctY(playerPos.y),zIndex:900}}>
        <img src={player} alt=""/><span>{o.character.name}</span>
      </div>

      <header className="plantaoHudTop">
        <a className="plantaoLogo" href="/dashboard">JURIS<span>QUEST</span></a>
        <div className="hudMission"><small>PLANTÃO • OCORRÊNCIA {o.sequence}/{o.total}</small><strong>{o.sceneTitle}</strong><span>{o.location}</span></div>
        <div className="hudPriority"><small>{priority.label}</small><b>{progress}%</b><div><i style={{width:`${progress}%`}}/></div></div>
        <a className="hudExit" href="/dashboard">Sair</a>
      </header>

      {phase==='scene'&&<div className="sceneObjective">
        <div><small>OBJETIVO</small><strong>{allSeen?'Elementos suficientes para decidir':`Reconstrua a ocorrência • ${seen.filter(id=>required.some(e=>e.id===id)).length}/${required.length}`}</strong><span>{moving?'Deslocando para o ponto selecionado…':allSeen?'A decisão jurídica foi liberada.':'Clique nos pontos destacados dentro da cena.'}</span></div>
        <button disabled={!allSeen||moving} onClick={()=>{setFocus(null);setPhase('decision')}}>{allSeen?'Formular decisão':'Investigue a cena'}</button>
      </div>}

      {focus&&phase==='scene'&&<aside className="intelPanel">
        <button className="intelClose" onClick={()=>setFocus(null)}>×</button>
        <div className="intelKicker">{focus.kind==='actor'?'DEPOIMENTO REGISTRADO':'EVIDÊNCIA REGISTRADA'}</div>
        <h2>{focus.factTitle||focus.name}</h2>
        <p>{focus.factText||focus.interactionText||'Elemento registrado para análise.'}</p>
        <div className="intelMeta"><span>{focus.name}</span><span>{focus.role||'EVIDÊNCIA'}</span></div>
        <button className="intelContinue" onClick={()=>setFocus(null)}>Continuar investigação</button>
      </aside>}

      {phase==='dispatch'&&<section className="dispatchOverlay">
        <div className="dispatchRadio"><i/> CENTRAL • CHAMADA RECEBIDA</div>
        <div className="dispatchCode">{String(o.sequence).padStart(2,'0')}</div>
        <h1>{o.missionTitle}</h1>
        <p>{o.summary}</p>
        <div className="dispatchMeta"><span>{priority.label}</span><span>{o.location}</span></div>
        <button onClick={()=>setPhase('scene')}>Assumir ocorrência <b>→</b></button>
      </section>}

      {phase==='decision'&&<section className="decisionOverlay">
        <button className="overlayBack" onClick={()=>setPhase('scene')}>← Voltar à cena</button>
        <div className="decisionKicker">DECISÃO OPERACIONAL • {o.decisionTitle}</div>
        <h2>{o.question}</h2>
        <div className="decisionEvidence">{required.filter(e=>seen.includes(e.id)).slice(0,6).map(e=><span key={e.id}>{e.factTitle||e.name}</span>)}</div>
        <div className="decisionChoices">{o.choices.map((c,i)=><button key={i} disabled={busy} onClick={()=>void answer(i)}><span>{String.fromCharCode(65+i)}</span><b>{c}</b><small>CONFIRMAR</small></button>)}</div>
        {error&&<div className="gameError">{error}</div>}
      </section>}

      {phase==='feedback'&&<section className={`feedbackOverlay ${result?.correct?'ok':'bad'}`}>
        <div className="verdictIcon">{result?.correct?'✓':'!'}</div>
        <div className="verdictCopy"><small>{result?.correct?'DECISÃO CORRETA':'DECISÃO INCORRETA'}</small><h2>{result?.correct?'Providência confirmada':'Ocorrência enviada para recuperação'}</h2><p>{selected!=null?o.choices[selected]:''}</p></div>
        <div className="feedbackBody">
          {fb.choice_feedback&&<Info title="POR QUE" text={fb.choice_feedback}/>} 
          {fb.rule&&<Info title="REGRA" text={fb.rule}/>} 
          {fb.application&&<Info title="APLICAÇÃO" text={fb.application}/>} 
          {fb.legal_basis&&<Info title="BASE LEGAL" text={fb.legal_basis}/>} 
          {fb.trap&&<Info title="PEGADINHA" text={fb.trap}/>} 
          {fb.memory&&<Info title="MEMÓRIA DE PROVA" text={fb.memory}/>} 
        </div>
        <div className="feedbackAction"><span>{result?.correct_count||0} acertos • {result?.answered_count||o.sequence}/{result?.item_count||o.total}</span><button onClick={next}>{result?.complete?'Ver relatório':'Próxima ocorrência'} →</button></div>
      </section>}
    </div>
    <style jsx global>{CSS}</style>
  </main>
}

function Info({title,text}:{title:string;text:string}){return <article><small>{title}</small><p>{text}</p></article>}

const CSS=`
body{overflow:hidden!important}.top{display:none!important}.plantaoGame{position:fixed;inset:0;background:#02070a;color:#edf4f4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.plantaoScene{position:absolute;inset:0;overflow:hidden;isolation:isolate}.plantaoBackdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;transform:scale(1.025);animation:cameraBreathe 12s ease-in-out infinite alternate}.plantaoVignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 45%,transparent 40%,#02070a55 72%,#010507d9 100%);box-shadow:inset 0 0 110px #000a}.plantaoScan{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:.16;background:repeating-linear-gradient(180deg,transparent 0 3px,#bcecf20a 4px 5px)}.plantaoAmbient{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}.plantaoAmbient i{position:absolute;left:calc((var(--i,1))*6%);top:-10%;width:2px;height:90px;background:linear-gradient(180deg,transparent,#a9e8f288,transparent);transform:rotate(12deg);animation:weatherDrop 4s linear infinite}.plantaoAmbient i:nth-child(1){left:7%;animation-delay:-1s}.plantaoAmbient i:nth-child(2){left:14%;animation-delay:-2.3s}.plantaoAmbient i:nth-child(3){left:22%;animation-delay:-.6s}.plantaoAmbient i:nth-child(4){left:31%;animation-delay:-3.1s}.plantaoAmbient i:nth-child(5){left:39%;animation-delay:-1.8s}.plantaoAmbient i:nth-child(6){left:47%;animation-delay:-.3s}.plantaoAmbient i:nth-child(7){left:55%;animation-delay:-2.7s}.plantaoAmbient i:nth-child(8){left:62%;animation-delay:-1.2s}.plantaoAmbient i:nth-child(9){left:69%;animation-delay:-3.6s}.plantaoAmbient i:nth-child(10){left:75%;animation-delay:-.9s}.plantaoAmbient i:nth-child(11){left:81%;animation-delay:-2.1s}.plantaoAmbient i:nth-child(12){left:86%;animation-delay:-3.3s}.plantaoAmbient i:nth-child(13){left:90%;animation-delay:-.5s}.plantaoAmbient i:nth-child(14){left:94%;animation-delay:-2.8s}.plantaoAmbient i:nth-child(15){left:34%;animation-delay:-4.1s}.plantaoAmbient i:nth-child(16){left:58%;animation-delay:-1.5s}.plantaoBeacon{position:absolute;z-index:5;width:180px;height:70px;filter:blur(25px);opacity:.16;mix-blend-mode:screen;pointer-events:none}.beaconA{left:8%;top:45%;background:#29a9ff;animation:beacon 1.2s steps(1) infinite}.beaconB{left:13%;top:45%;background:#ff314b;animation:beacon 1.2s .6s steps(1) infinite}.plantaoHudTop{position:absolute;z-index:2000;left:18px;right:18px;top:16px;height:76px;display:grid;grid-template-columns:auto minmax(260px,1fr) 250px auto;gap:12px;align-items:center;pointer-events:none}.plantaoHudTop>*{pointer-events:auto}.plantaoLogo{height:58px;display:flex;align-items:center;padding:0 17px;border:1px solid #294c58;border-radius:14px;background:#041118e8;color:#fff;text-decoration:none;font-weight:950;letter-spacing:1.7px;box-shadow:0 20px 55px #0008;backdrop-filter:blur(14px)}.plantaoLogo span{color:#e6bc59}.hudMission{height:58px;padding:9px 15px;border:1px solid #294c58;border-radius:14px;background:#041118dd;box-shadow:0 20px 55px #0007;backdrop-filter:blur(14px);overflow:hidden}.hudMission small,.hudMission strong,.hudMission span{display:block}.hudMission small{font:850 8px ui-monospace;letter-spacing:.11em;color:#64dce7}.hudMission strong{font-size:14px;margin-top:2px}.hudMission span{font-size:9px;color:#789197;margin-top:2px}.hudPriority{height:58px;padding:8px 12px;border:1px solid #294c58;border-radius:14px;background:#041118dd;box-shadow:0 20px 55px #0007;backdrop-filter:blur(14px);display:grid;grid-template-columns:1fr auto;grid-template-rows:1fr 8px;gap:5px 10px}.hudPriority small{font:850 8px ui-monospace;color:#e3bb58;letter-spacing:.08em}.hudPriority b{font-size:13px}.hudPriority div{grid-column:1/-1;border:1px solid #2c4c55;border-radius:99px;background:#061014;overflow:hidden}.hudPriority i{display:block;height:100%;background:linear-gradient(90deg,#44c8d8,#e5bd5c);transition:width .35s ease}.hudExit{height:58px;display:grid;place-items:center;padding:0 16px;border:1px solid #3b5057;border-radius:14px;background:#041118dd;color:#9fb1b5;text-decoration:none;font-size:10px;font-weight:800;backdrop-filter:blur(14px)}.worldEntity{position:absolute;transform:translate(-50%,-78%);border:0;background:transparent;color:#fff;padding:0;cursor:pointer;transition:filter .18s,transform .18s;outline:0}.worldEntity.actor img{width:clamp(86px,8vw,126px);height:auto;display:block;filter:drop-shadow(0 15px 10px #0009);animation:npcIdle 2.8s ease-in-out infinite}.worldEntity:nth-of-type(2n) img{animation-delay:-1.1s}.worldEntity.object{width:70px;height:70px;border-radius:50%;display:grid;place-items:center}.worldEntity:hover:not(:disabled){transform:translate(-50%,-82%) scale(1.055);filter:brightness(1.12)}.worldEntity:disabled{cursor:default}.worldEntity.ambient{opacity:.7}.worldEntity.seen{filter:saturate(.7) brightness(.85)}.evidenceGlyph{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#071a22dd;border:2px solid #5fd5e7;color:#e8c25f;font-size:22px;box-shadow:0 0 0 7px #4fd9ee12,0 16px 35px #000b;animation:objectFloat 2.2s ease-in-out infinite}.entityTag{position:absolute;left:50%;top:-4px;transform:translate(-50%,-100%);min-width:120px;padding:6px 9px;border:1px solid #3f6772;border-radius:8px;background:#041118e8;box-shadow:0 10px 30px #0009;backdrop-filter:blur(8px);text-align:center;white-space:nowrap}.entityTag b,.entityTag small{display:block}.entityTag b{font-size:10px}.entityTag small{font:800 7px ui-monospace;color:#6cd9e7;margin-top:2px}.entityPulse{position:absolute;left:50%;bottom:5%;width:62px;height:20px;transform:translateX(-50%);border-radius:50%;border:2px solid #e9c45c;box-shadow:0 0 18px #e9c45c99;animation:targetPulse 1.35s ease-out infinite}.worldPlayer{position:absolute;transform:translate(-50%,-78%);transition:left .46s cubic-bezier(.2,.8,.2,1),top .46s cubic-bezier(.2,.8,.2,1);pointer-events:none}.worldPlayer img{width:clamp(92px,8.4vw,132px);filter:drop-shadow(0 16px 12px #000b)}.worldPlayer.moving img{animation:playerWalk .24s steps(2) infinite}.worldPlayer>span{position:absolute;left:50%;bottom:-4px;transform:translate(-50%,100%);padding:5px 8px;border-radius:7px;background:#041118d9;border:1px solid #2d5b69;color:#8fe6f2;font:800 8px ui-monospace;white-space:nowrap}.sceneObjective{position:absolute;z-index:2100;left:50%;bottom:20px;transform:translateX(-50%);width:min(760px,70vw);min-height:76px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:12px 14px;border:1px solid #356573;border-radius:17px;background:#031117e8;box-shadow:0 24px 70px #000c;backdrop-filter:blur(16px)}.sceneObjective small,.sceneObjective strong,.sceneObjective span{display:block}.sceneObjective small{font:850 8px ui-monospace;color:#e3bd5d;letter-spacing:.1em}.sceneObjective strong{font-size:13px;margin-top:3px}.sceneObjective span{font-size:9px;color:#8ba0a5;margin-top:3px}.sceneObjective button,.dispatchOverlay button,.intelContinue,.feedbackAction button{border:1px solid #d4ad4f;border-radius:11px;background:linear-gradient(180deg,#e9c66b,#bc9137);color:#171209;padding:11px 15px;font-weight:950;cursor:pointer}.sceneObjective button:disabled{filter:grayscale(1);opacity:.42;cursor:not-allowed}.intelPanel{position:absolute;z-index:2300;right:24px;bottom:24px;width:min(420px,38vw);padding:22px;border:1px solid #3d6874;border-radius:19px;background:radial-gradient(circle at 100% 0,#18434d 0,transparent 35%),#061820f5;box-shadow:0 30px 90px #000e;backdrop-filter:blur(18px);animation:panelIn .24s ease-out}.intelClose{position:absolute;right:11px;top:9px;width:30px;height:30px;border-radius:50%;border:1px solid #45626a;background:#0c252d;color:#dbe7e8;cursor:pointer}.intelKicker,.decisionKicker{font:900 8px ui-monospace;letter-spacing:.12em;color:#65dce8}.intelPanel h2{font-size:22px;margin:9px 0}.intelPanel p{font-size:12px;line-height:1.62;color:#c4d0d2}.intelMeta{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}.intelMeta span,.decisionEvidence span{padding:5px 8px;border:1px solid #345560;border-radius:999px;background:#0a2028;color:#91a8ad;font-size:8px}.intelContinue{width:100%}.dispatchOverlay,.decisionOverlay,.feedbackOverlay{position:absolute;z-index:3000;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 40px));border:1px solid #3b6270;border-radius:24px;background:radial-gradient(circle at 90% 0,#174756 0,transparent 32%),linear-gradient(180deg,#071c25f7,#041117f7);box-shadow:0 45px 140px #000f;backdrop-filter:blur(18px);animation:panelIn .3s ease-out}.dispatchOverlay{padding:30px 34px}.dispatchRadio{font:900 9px ui-monospace;letter-spacing:.12em;color:#68dfeb}.dispatchRadio i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;background:#5ce1b5;box-shadow:0 0 18px #5ce1b5;animation:radioPulse 1.2s infinite}.dispatchCode{position:absolute;right:28px;top:22px;font:950 64px/1 ui-monospace;color:#6ed8e814}.dispatchOverlay h1{font-size:36px;margin:18px 0 10px}.dispatchOverlay p{font-size:14px;line-height:1.68;color:#b9c8ca;max-width:650px}.dispatchMeta{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.dispatchMeta span{padding:6px 9px;border:1px solid #4c5d46;border-radius:999px;background:#171d12;color:#e5c65d;font:800 8px ui-monospace}.decisionOverlay{padding:28px 30px}.overlayBack{border:0;background:transparent;color:#7fcfda;padding:0 0 14px;cursor:pointer}.decisionOverlay h2{font-size:28px;line-height:1.22;margin:9px 0 15px}.decisionEvidence{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px}.decisionChoices{display:grid;gap:9px}.decisionChoices button{display:grid;grid-template-columns:38px 1fr auto;gap:12px;align-items:center;text-align:left;padding:12px;border:1px solid #355b67;border-radius:13px;background:#081b23;color:#edf4f4;cursor:pointer;transition:.16s}.decisionChoices button:hover{border-color:#72d8e8;background:#0d2b35;transform:translateX(4px)}.decisionChoices button>span{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:#12333d;color:#e6bf5c;font-weight:950}.decisionChoices button>b{font-size:12px}.decisionChoices button>small{font:800 7px ui-monospace;color:#617c83}.gameError{margin-top:10px;padding:10px;border:1px solid #8b4c49;border-radius:10px;background:#291615;color:#f0aba7;font-size:10px}.feedbackOverlay{padding:28px 30px;display:grid;grid-template-columns:58px 1fr;gap:14px}.feedbackOverlay.ok{border-color:#4b8e6e}.feedbackOverlay.bad{border-color:#9b5a55}.verdictIcon{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:28px;font-weight:950;background:#112d25;color:#81e2b8;border:1px solid #4f9274}.feedbackOverlay.bad .verdictIcon{background:#321918;color:#f0a09a;border-color:#9b5c57}.verdictCopy small{font:900 8px ui-monospace;letter-spacing:.12em;color:#72dce8}.verdictCopy h2{margin:5px 0 4px;font-size:24px}.verdictCopy p{margin:0;color:#93a8ad;font-size:10px}.feedbackBody{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5px}.feedbackBody article{padding:11px;border:1px solid #2e4d57;border-radius:11px;background:#071820}.feedbackBody small{font:850 7px ui-monospace;color:#69d8e5}.feedbackBody p{font-size:10px;line-height:1.5;color:#becacd;margin:5px 0 0}.feedbackAction{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px}.feedbackAction>span{font-size:9px;color:#81989d}.feedbackAction button{min-width:170px}@keyframes cameraBreathe{from{transform:scale(1.025) translate3d(0,0,0)}to{transform:scale(1.055) translate3d(-.5%,.3%,0)}}@keyframes npcIdle{0%,100%{transform:translateY(0) rotate(-.25deg)}50%{transform:translateY(-4px) rotate(.25deg)}}@keyframes objectFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes targetPulse{0%{transform:translateX(-50%) scale(.75);opacity:1}100%{transform:translateX(-50%) scale(1.45);opacity:0}}@keyframes playerWalk{0%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-4px) rotate(1deg)}}@keyframes panelIn{from{opacity:0;transform:translate(-50%,-46%) scale(.975)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}@keyframes radioPulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes beacon{0%,49%{opacity:.26}50%,100%{opacity:.04}}@keyframes weatherDrop{from{transform:translateY(-120px) rotate(12deg)}to{transform:translateY(110vh) rotate(12deg)}}@media(max-width:900px){.plantaoHudTop{left:8px;right:8px;top:8px;height:auto;grid-template-columns:auto 1fr auto}.plantaoLogo{height:48px;padding:0 10px;font-size:11px}.hudMission{height:48px;padding:7px 9px}.hudMission strong{font-size:11px}.hudMission span,.hudPriority{display:none}.hudExit{height:48px;padding:0 10px}.worldEntity.actor img{width:82px}.worldPlayer img{width:88px}.entityTag{min-width:92px;padding:4px 6px}.entityTag b{font-size:8px}.sceneObjective{left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));width:auto;transform:none;min-height:68px;padding:9px 10px}.sceneObjective strong{font-size:11px}.sceneObjective span{font-size:8px}.sceneObjective button{padding:10px;font-size:10px}.intelPanel{left:8px;right:8px;bottom:86px;width:auto}.dispatchOverlay,.decisionOverlay,.feedbackOverlay{width:calc(100vw - 16px);max-height:88vh;overflow:auto;padding:20px}.dispatchOverlay h1{font-size:28px}.decisionOverlay h2{font-size:22px}.decisionChoices button{grid-template-columns:34px 1fr}.decisionChoices button>small{display:none}.feedbackBody{grid-template-columns:1fr}.feedbackAction{align-items:stretch;flex-direction:column}.feedbackAction button{width:100%}}@media(prefers-reduced-motion:reduce){.plantaoBackdrop,.plantaoAmbient i,.worldEntity.actor img,.evidenceGlyph,.entityPulse,.worldPlayer.moving img,.plantaoBeacon{animation:none!important}.worldPlayer{transition:none!important}}`;
