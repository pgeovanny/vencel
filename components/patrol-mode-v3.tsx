'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LegacyPatrolMode from '@/components/patrol-mode';
import { submitPlantaoAnswer } from '@/app/plantao/actions';
import { directionalChibiSvg, type Facing } from '@/lib/game/character-directional-v3';
import { chibiSvg } from '@/lib/game/character-assets-v2';
import { objectSvg, svgUri } from '@/lib/game/studio-assets';
import { sceneSvg } from '@/lib/game/scene-assets-v3';

type Character={name:string;role:string;archetype:string};
type DialogueLine={text?:string;choices?:string[]};
type SceneEntity={
  id:string;sourceId:string;kind:'actor'|'object';objectKind?:string;name:string;role?:string;style?:string;
  factTitle?:string;factText?:string;interactionText?:string;dialogue?:DialogueLine[];required:boolean;
  position:{x:number;y:number};
};
type Occurrence={
  runId:string;itemId:string;sequence:number;total:number;prioritySource:string;
  missionTitle:string;summary:string;decisionTitle:string;question:string;choices:string[];
  location:string;sceneTitle:string;environment:string;character:Character;entities:SceneEntity[];
  playerSpawn?:{x:number;y:number};
};
type Props={view:'landing'|'active'|'complete';occurrence?:Occurrence;[k:string]:any};

type FocusState={entity:SceneEntity;dialogIndex:number}|null;

const PRIORITY:Record<string,{label:string;why:string}>={
  review_due:{label:'REVISÃO VENCIDA',why:'Conteúdo no ponto de recuperação ativa.'},
  error:{label:'PONTO FRACO',why:'Tema que já gerou erro e voltou ao seu turno.'},
  gap:{label:'LACUNA DO EDITAL',why:'Conteúdo ainda sem domínio consolidado.'},
  maintenance:{label:'MANUTENÇÃO',why:'Tema já visto, reapresentado para retenção.'},
};

const WORLD={w:1200,h:760};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const pctX=(x:number)=>`${clamp(x/WORLD.w*100,2.5,97.5)}%`;
const pctY=(y:number)=>`${clamp(y/WORLD.h*100,7,93)}%`;

export default function PatrolModeV3(props:Props){
  if(props.view!=='active'||!props.occurrence)return <LegacyPatrolMode {...props as any}/>;
  return <Active occurrence={props.occurrence}/>;
}

function Active({occurrence:o}:{occurrence:Occurrence}){
  const router=useRouter();
  const timerRef=useRef<number|null>(null);
  const keysRef=useRef<Set<string>>(new Set());
  const posRef=useRef(o.playerSpawn||{x:600,y:650});
  const [phase,setPhase]=useState<'dispatch'|'scene'|'decision'|'feedback'>('dispatch');
  const [seen,setSeen]=useState<string[]>([]);
  const [focus,setFocus]=useState<FocusState>(null);
  const [playerPos,setPlayerPos]=useState(posRef.current);
  const [moving,setMoving]=useState(false);
  const [autoMoving,setAutoMoving]=useState(false);
  const [facing,setFacing]=useState<Facing>('front');
  const [flip,setFlip]=useState(false);
  const [moveMs,setMoveMs]=useState(900);
  const [selected,setSelected]=useState<number|null>(null);
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const priority=PRIORITY[o.prioritySource]||PRIORITY.gap;
  const required=o.entities.filter(e=>e.required);
  const seenRequired=seen.filter(id=>required.some(e=>e.id===id)).length;
  const allSeen=required.length===0||seenRequired===required.length;
  const progress=required.length?Math.round(seenRequired/required.length*100):100;
  const background=useMemo(()=>svgUri(sceneSvg(o.environment||'parking_night')),[o.environment]);
  const playerSprite=useMemo(()=>svgUri(directionalChibiSvg(o.character.archetype||'operational',facing,'player')),[o.character.archetype,facing]);

  function orient(from:{x:number;y:number},to:{x:number;y:number}){
    const dx=to.x-from.x,dy=to.y-from.y;
    if(Math.abs(dy)>Math.abs(dx)*1.1){setFacing(dy<0?'back':'front');setFlip(false)}
    else{setFacing('side');setFlip(dx<0)}
  }

  function walkTo(e:SceneEntity){
    if(phase!=='scene'||focus||autoMoving)return;
    const from=posRef.current;
    const target={x:clamp(e.position.x-48,45,1155),y:clamp(e.position.y+78,95,705)};
    const distance=Math.hypot(target.x-from.x,target.y-from.y);
    const duration=Math.round(clamp(distance*2.2,780,1850));
    orient(from,target);
    setMoveMs(duration);setMoving(true);setAutoMoving(true);
    posRef.current=target;setPlayerPos(target);
    if(timerRef.current)window.clearTimeout(timerRef.current);
    timerRef.current=window.setTimeout(()=>{
      setMoving(false);setAutoMoving(false);setFacing('front');setFlip(false);
      setFocus({entity:e,dialogIndex:0});
    },duration+80);
  }

  function registerEntity(e:SceneEntity){
    setSeen(v=>v.includes(e.id)?v:[...v,e.id]);
    setFocus(null);
  }

  function advanceDialogue(){
    if(!focus)return;
    const lines=focus.entity.dialogue||[];
    if(focus.dialogIndex<Math.max(0,lines.length-1))setFocus({...focus,dialogIndex:focus.dialogIndex+1});
    else registerEntity(focus.entity);
  }

  useEffect(()=>{
    const down=(ev:KeyboardEvent)=>{
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(ev.key.toLowerCase())){
        keysRef.current.add(ev.key.toLowerCase());
        if(phase==='scene'&&!focus&&!autoMoving)ev.preventDefault();
      }
    };
    const up=(ev:KeyboardEvent)=>keysRef.current.delete(ev.key.toLowerCase());
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)};
  },[phase,focus,autoMoving]);

  useEffect(()=>{
    if(phase!=='scene'||focus||autoMoving)return;
    let raf=0,last=performance.now();
    const loop=(now:number)=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      const keys=keysRef.current;
      let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      if(dx||dy){
        const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
        const p=posRef.current,next={x:clamp(p.x+dx*215*dt,35,1165),y:clamp(p.y+dy*215*dt,90,715)};
        orient(p,next);posRef.current=next;setPlayerPos(next);setMoveMs(70);setMoving(true);
      }else if(moving){setMoving(false);setFacing('front');setFlip(false)}
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
  },[phase,focus,autoMoving,moving]);

  useEffect(()=>()=>{if(timerRef.current)window.clearTimeout(timerRef.current)},[]);

  async function answer(index:number){
    if(busy||phase!=='decision')return;
    setBusy(true);setError('');setSelected(index);
    const response=await submitPlantaoAnswer({runId:o.runId,itemId:o.itemId,index});
    if(!response.ok){setError(response.error||'Falha ao registrar decisão.');setBusy(false);return}
    setResult(response.data);setPhase('feedback');setBusy(false);
  }
  function next(){router.refresh()}
  const fb=result?.feedback||{};

  return <main className="pgGame">
    <div className="pgScene">
      <img className="pgBackdrop" src={background} alt=""/>
      <div className="pgVignette"/><div className="pgAtmosphere" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i}/>)}</div>

      {o.entities.map((e,i)=>{
        const done=seen.includes(e.id);
        return <button key={e.id} type="button" className={`pgEntity ${e.kind} ${e.required?'required':'ambient'} ${done?'done':''}`}
          style={{left:pctX(e.position.x),top:pctY(e.position.y),zIndex:100+Math.round(e.position.y)}}
          onClick={()=>walkTo(e)} disabled={phase!=='scene'||!!focus||autoMoving}>
          {e.kind==='actor'
            ?<img src={svgUri(chibiSvg(e.style||'civilian'))} alt=""/>
            :<img className="pgObject" src={svgUri(objectSvg(e.objectKind||'evidence'))} alt=""/>}
          <span className="pgTag"><b>{e.name}</b><small>{done?'REGISTRADO':e.role||'EVIDÊNCIA'}</small></span>
          {e.required&&!done&&<span className="pgPulse"/>}
        </button>;
      })}

      <div className={`pgPlayer ${moving?'walking':''}`} style={{left:pctX(playerPos.x),top:pctY(playerPos.y),zIndex:1900,'--walk-ms':`${moveMs}ms`} as React.CSSProperties}>
        <img src={playerSprite} alt="" style={{transform:flip?'scaleX(-1)':'none'}}/>
        <span>{o.character.name}</span>
      </div>

      <header className="pgHud">
        <a className="pgLogo" href="/dashboard">JURIS<span>QUEST</span></a>
        <div className="pgMission"><small>PLANTÃO • {o.sequence}/{o.total}</small><strong>{o.sceneTitle}</strong><span>{o.location}</span></div>
        <div className="pgProgress"><small>{priority.label}</small><b>{progress}%</b><div><i style={{width:`${progress}%`}}/></div></div>
        <a className="pgExit" href="/dashboard">Sair</a>
      </header>

      {phase==='scene'&&<section className="pgObjective">
        <div><small>OBJETIVO</small><strong>{allSeen?'Elementos suficientes para decidir':`Reconstrua a ocorrência • ${seenRequired}/${required.length}`}</strong><span>{autoMoving?'Indo até o ponto selecionado…':moving?'Movimente-se com WASD / setas.':allSeen?'A decisão jurídica foi liberada.':'Clique no personagem/evidência ou aproxime-se pelo cenário.'}</span></div>
        <button disabled={!allSeen||autoMoving} onClick={()=>{setFocus(null);setPhase('decision')}}>{allSeen?'Formular decisão':'Investigue a cena'}</button>
      </section>}

      {focus&&phase==='scene'&&<Interaction focus={focus} onAdvance={advanceDialogue} onRegister={()=>registerEntity(focus.entity)} onClose={()=>setFocus(null)}/>} 

      {phase==='dispatch'&&<section className="pgDispatch">
        <div className="pgRadio"><i/> CENTRAL • CHAMADA RECEBIDA</div><span className="pgCode">{String(o.sequence).padStart(2,'0')}</span>
        <h1>{o.missionTitle}</h1><p>{o.summary}</p><div className="pgMeta"><span>{priority.label}</span><span>{o.location}</span></div>
        <button onClick={()=>setPhase('scene')}>Assumir ocorrência <b>→</b></button>
      </section>}

      {phase==='decision'&&<section className="pgDecision">
        <button className="pgBack" onClick={()=>setPhase('scene')}>← Voltar à cena</button><small>DECISÃO OPERACIONAL • {o.decisionTitle}</small>
        <h2>{o.question}</h2><div className="pgEvidenceChips">{required.filter(e=>seen.includes(e.id)).map(e=><span key={e.id}>{e.factTitle||e.name}</span>)}</div>
        <div className="pgChoices">{o.choices.map((c,i)=><button key={i} disabled={busy} onClick={()=>void answer(i)}><span>{String.fromCharCode(65+i)}</span><b>{c}</b><small>CONFIRMAR</small></button>)}</div>
        {error&&<div className="pgError">{error}</div>}
      </section>}

      {phase==='feedback'&&<section className={`pgFeedback ${result?.correct?'ok':'bad'}`}>
        <div className="pgVerdict">{result?.correct?'✓':'!'}</div><div><small>{result?.correct?'DECISÃO CORRETA':'DECISÃO INCORRETA'}</small><h2>{result?.correct?'Providência confirmada':'Erro enviado para recuperação'}</h2><p>{selected!=null?o.choices[selected]:''}</p></div>
        <div className="pgFeedbackBody">{fb.choice_feedback&&<Info title="POR QUE" text={fb.choice_feedback}/>} {fb.rule&&<Info title="REGRA" text={fb.rule}/>} {fb.application&&<Info title="APLICAÇÃO" text={fb.application}/>} {fb.legal_basis&&<Info title="BASE LEGAL" text={fb.legal_basis}/>} {fb.trap&&<Info title="PEGADINHA" text={fb.trap}/>} {fb.memory&&<Info title="MEMÓRIA" text={fb.memory}/>}</div>
        <div className="pgFeedbackAction"><span>{result?.correct_count||0} acertos • {result?.answered_count||o.sequence}/{result?.item_count||o.total}</span><button onClick={next}>{result?.complete?'Ver relatório':'Próxima ocorrência'} →</button></div>
      </section>}
    </div>
    <style jsx global>{CSS}</style>
  </main>;
}

function Interaction({focus,onAdvance,onRegister,onClose}:{focus:FocusState;onAdvance:()=>void;onRegister:()=>void;onClose:()=>void}){
  if(!focus)return null;
  const e=focus.entity,lines=e.dialogue||[],line=lines[focus.dialogIndex];
  const last=lines.length===0||focus.dialogIndex>=lines.length-1;
  const visual=e.kind==='actor'?svgUri(chibiSvg(e.style||'civilian')):svgUri(objectSvg(e.objectKind||'evidence'));
  return <aside className={`pgInteraction ${e.kind}`}>
    <button className="pgClose" onClick={onClose}>×</button>
    <div className="pgInteractionVisual"><img src={visual} alt=""/><span>{e.role||'EVIDÊNCIA'}</span></div>
    <div className="pgInteractionCopy"><small>{e.kind==='actor'?'INTERAÇÃO • DEPOIMENTO':'INTERAÇÃO • EVIDÊNCIA'}</small><h2>{e.name}</h2>
      {e.kind==='actor'&&line?<><p className="pgSpeech">“{line.text||e.factText||e.interactionText}”</p><div className="pgDialogueChoices">{(line.choices?.length?line.choices:['Continuar']).map((c,i)=><button key={i} onClick={last?onRegister:onAdvance}><span>{String.fromCharCode(65+i)}</span>{last?'Registrar depoimento':c}</button>)}</div></>:<><p>{e.factText||e.interactionText||'Analise o elemento encontrado.'}</p><button className="pgRegister" onClick={onRegister}>Registrar evidência</button></>}
      <div className="pgFact"><small>O QUE ENTRA NO CADERNO</small><b>{e.factTitle||e.name}</b><p>{e.factText||e.interactionText}</p></div>
    </div>
  </aside>;
}

function Info({title,text}:{title:string;text:string}){return <article><small>{title}</small><p>{text}</p></article>}

const CSS=`
body{overflow:hidden!important}.top{display:none!important}.pgGame{position:fixed;inset:0;background:#02070a;color:#edf4f4;font-family:Inter,system-ui,sans-serif}.pgScene{position:absolute;inset:0;overflow:hidden;isolation:isolate}.pgBackdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;transform:scale(1.018)}.pgVignette{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 44%,transparent 46%,#01050777 78%,#010405e8 100%);box-shadow:inset 0 0 110px #0008}.pgAtmosphere{position:absolute;inset:0;z-index:3;pointer-events:none}.pgAtmosphere i{position:absolute;top:-15%;width:1px;height:80px;background:linear-gradient(transparent,#c8f2f577,transparent);transform:rotate(12deg);animation:pgRain 4.4s linear infinite}.pgAtmosphere i:nth-child(1){left:6%;animation-delay:-1s}.pgAtmosphere i:nth-child(2){left:14%;animation-delay:-2s}.pgAtmosphere i:nth-child(3){left:23%;animation-delay:-.5s}.pgAtmosphere i:nth-child(4){left:31%;animation-delay:-3s}.pgAtmosphere i:nth-child(5){left:41%;animation-delay:-1.7s}.pgAtmosphere i:nth-child(6){left:49%;animation-delay:-.2s}.pgAtmosphere i:nth-child(7){left:57%;animation-delay:-2.6s}.pgAtmosphere i:nth-child(8){left:65%;animation-delay:-1.1s}.pgAtmosphere i:nth-child(9){left:73%;animation-delay:-3.5s}.pgAtmosphere i:nth-child(10){left:81%;animation-delay:-.8s}.pgAtmosphere i:nth-child(11){left:88%;animation-delay:-2.2s}.pgAtmosphere i:nth-child(12){left:94%;animation-delay:-3.7s}.pgAtmosphere i:nth-child(13){left:37%;animation-delay:-4s}.pgAtmosphere i:nth-child(14){left:69%;animation-delay:-1.4s}.pgHud{position:absolute;z-index:3000;left:12px;right:12px;top:12px;display:grid;grid-template-columns:auto minmax(260px,1fr) 220px auto;gap:10px;pointer-events:none}.pgHud>*{pointer-events:auto}.pgLogo,.pgMission,.pgProgress,.pgExit{min-height:54px;border:1px solid #294d59;border-radius:13px;background:#041117e8;box-shadow:0 15px 45px #0008;backdrop-filter:blur(14px)}.pgLogo{display:flex;align-items:center;padding:0 15px;color:#fff;text-decoration:none;font-weight:950;letter-spacing:1.5px}.pgLogo span{color:#e5bc59}.pgMission{padding:7px 12px}.pgMission small,.pgMission strong,.pgMission span{display:block}.pgMission small{font:850 8px ui-monospace;color:#62dce8}.pgMission strong{font-size:13px;margin-top:2px}.pgMission span{font-size:8px;color:#789097;margin-top:2px}.pgProgress{padding:7px 10px;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 8px;gap:5px}.pgProgress small{font:850 8px ui-monospace;color:#e4bd5c}.pgProgress b{font-size:12px}.pgProgress div{grid-column:1/-1;border:1px solid #31505a;border-radius:99px;overflow:hidden}.pgProgress i{display:block;height:100%;background:linear-gradient(90deg,#49ccd9,#e6bd5b);transition:width .3s}.pgExit{display:grid;place-items:center;padding:0 15px;color:#9fb0b4;text-decoration:none;font-size:9px;font-weight:800}.pgEntity{position:absolute;transform:translate(-50%,-78%);border:0;background:transparent;padding:0;color:#fff;cursor:pointer;outline:0;transition:filter .18s,transform .18s}.pgEntity.actor>img{width:clamp(86px,7.6vw,122px);filter:drop-shadow(0 14px 10px #0009);animation:pgIdle 2.7s ease-in-out infinite}.pgEntity.object>.pgObject{width:clamp(58px,5vw,82px);height:auto;filter:drop-shadow(0 14px 12px #000b);animation:pgFloat 2.1s ease-in-out infinite}.pgEntity:hover:not(:disabled){filter:brightness(1.18);transform:translate(-50%,-82%) scale(1.06)}.pgEntity:disabled{cursor:default}.pgEntity.ambient{opacity:.72}.pgEntity.done{filter:saturate(.72) brightness(.85)}.pgTag{position:absolute;left:50%;top:-3px;transform:translate(-50%,-100%);min-width:112px;padding:5px 8px;border:1px solid #3d6873;border-radius:8px;background:#041117e8;text-align:center;white-space:nowrap;box-shadow:0 8px 24px #0009}.pgTag b,.pgTag small{display:block}.pgTag b{font-size:9px}.pgTag small{font:800 6px ui-monospace;color:#68d9e7;margin-top:2px}.pgPulse{position:absolute;left:50%;bottom:5%;width:62px;height:20px;transform:translateX(-50%);border:2px solid #e7c25a;border-radius:50%;box-shadow:0 0 20px #e7c25a99;animation:pgPulse 1.25s ease-out infinite}.pgPlayer{position:absolute;transform:translate(-50%,-78%);transition:left var(--walk-ms) linear,top var(--walk-ms) linear;pointer-events:none}.pgPlayer img{width:clamp(92px,8.2vw,130px);filter:drop-shadow(0 16px 12px #000b);transform-origin:center bottom}.pgPlayer.walking img{animation:pgWalk .22s ease-in-out infinite}.pgPlayer>span{position:absolute;left:50%;bottom:-4px;transform:translate(-50%,100%);padding:4px 7px;border:1px solid #2e5a68;border-radius:7px;background:#041118e0;color:#8fe5f1;font:800 7px ui-monospace}.pgObjective{position:absolute;z-index:2400;left:50%;bottom:16px;transform:translateX(-50%);width:min(720px,70vw);display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid #356573;border-radius:15px;background:#031117e8;box-shadow:0 20px 60px #000b;backdrop-filter:blur(15px)}.pgObjective small,.pgObjective strong,.pgObjective span{display:block}.pgObjective small{font:850 7px ui-monospace;color:#e3bd5d}.pgObjective strong{font-size:12px;margin-top:2px}.pgObjective span{font-size:8px;color:#8ba0a5;margin-top:2px}.pgObjective button,.pgDispatch button,.pgRegister,.pgFeedbackAction button{border:1px solid #d2aa4c;border-radius:10px;background:linear-gradient(180deg,#eccb71,#bc9035);color:#171208;padding:10px 14px;font-weight:950;cursor:pointer}.pgObjective button:disabled{filter:grayscale(1);opacity:.42}.pgInteraction{position:absolute;z-index:3400;right:20px;bottom:20px;width:min(620px,52vw);min-height:330px;display:grid;grid-template-columns:220px 1fr;border:1px solid #3b6874;border-radius:21px;overflow:hidden;background:radial-gradient(circle at 100% 0,#164553 0,transparent 35%),linear-gradient(180deg,#071b24f8,#041117f8);box-shadow:0 35px 100px #000e;backdrop-filter:blur(18px);animation:pgPanel .22s ease-out}.pgInteractionVisual{position:relative;display:grid;place-items:center;background:radial-gradient(circle at 50% 44%,#194a5a 0,#07151b 66%);border-right:1px solid #2c5662}.pgInteractionVisual img{max-width:90%;max-height:270px;object-fit:contain;filter:drop-shadow(0 18px 16px #000b)}.pgInteractionVisual span{position:absolute;left:14px;right:14px;bottom:12px;padding:6px;border:1px solid #355967;border-radius:8px;background:#041118dd;color:#77dce8;text-align:center;font:850 7px ui-monospace}.pgInteractionCopy{padding:24px 24px 20px}.pgInteractionCopy>small{font:900 8px ui-monospace;color:#66dbe8;letter-spacing:.1em}.pgInteractionCopy h2{font-size:24px;margin:7px 0 12px}.pgInteractionCopy>p,.pgSpeech{font-size:13px;line-height:1.6;color:#d3dede}.pgSpeech{padding:13px 14px;border-left:3px solid #e0bd59;background:#0a2027;border-radius:0 10px 10px 0}.pgDialogueChoices{display:grid;gap:7px;margin-top:13px}.pgDialogueChoices button{display:grid;grid-template-columns:28px 1fr;gap:9px;align-items:center;text-align:left;padding:9px;border:1px solid #365d68;border-radius:10px;background:#0a2029;color:#edf5f5;cursor:pointer}.pgDialogueChoices button:hover{border-color:#6dd8e7;background:#0c2b35}.pgDialogueChoices span{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;background:#12343e;color:#e6bf5d;font-weight:900}.pgFact{margin-top:15px;padding:10px 11px;border:1px solid #2e4d57;border-radius:10px;background:#071820}.pgFact small{font:850 7px ui-monospace;color:#e0b95a}.pgFact b{display:block;font-size:10px;margin-top:4px}.pgFact p{font-size:9px;line-height:1.45;color:#8fa5aa;margin:4px 0 0}.pgClose{position:absolute;right:10px;top:9px;z-index:3;width:28px;height:28px;border-radius:50%;border:1px solid #45636b;background:#0b242c;color:#dbe7e8;cursor:pointer}.pgRegister{width:100%;margin-top:12px}.pgDispatch,.pgDecision,.pgFeedback{position:absolute;z-index:3600;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 40px));padding:29px 32px;border:1px solid #3a6270;border-radius:22px;background:radial-gradient(circle at 90% 0,#174755 0,transparent 32%),linear-gradient(180deg,#071c25f8,#041117f8);box-shadow:0 45px 140px #000f;backdrop-filter:blur(18px)}.pgRadio{font:900 8px ui-monospace;color:#69dce8}.pgRadio i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5ee0b7;box-shadow:0 0 15px #5ee0b7;margin-right:7px}.pgCode{position:absolute;right:26px;top:18px;font:950 60px ui-monospace;color:#70dce814}.pgDispatch h1{font-size:34px;margin:16px 0 8px}.pgDispatch p{font-size:13px;line-height:1.65;color:#b8c7c9}.pgMeta,.pgEvidenceChips{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0}.pgMeta span,.pgEvidenceChips span{padding:5px 8px;border:1px solid #3c5849;border-radius:999px;background:#151b12;color:#e2c15d;font:800 7px ui-monospace}.pgBack{border:0;background:transparent;color:#76cfda;padding:0 0 12px;cursor:pointer}.pgDecision>small,.pgFeedback>div>small{font:900 8px ui-monospace;color:#69dbe7}.pgDecision h2{font-size:27px;line-height:1.22;margin:8px 0 12px}.pgChoices{display:grid;gap:8px}.pgChoices button{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;text-align:left;padding:11px;border:1px solid #355b67;border-radius:12px;background:#081b23;color:#edf4f4;cursor:pointer}.pgChoices button:hover{border-color:#72d8e8;background:#0d2b35;transform:translateX(3px)}.pgChoices button>span{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:#12333d;color:#e6bf5c;font-weight:950}.pgChoices button>b{font-size:11px}.pgChoices button>small{font:800 7px ui-monospace;color:#617c83}.pgError{margin-top:9px;padding:9px;border:1px solid #8b4c49;border-radius:9px;background:#291615;color:#f0aba7;font-size:9px}.pgFeedback{display:grid;grid-template-columns:52px 1fr;gap:13px}.pgFeedback.ok{border-color:#4b8e6e}.pgFeedback.bad{border-color:#9b5a55}.pgVerdict{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;font-size:26px;font-weight:950;background:#112d25;color:#81e2b8;border:1px solid #4f9274}.pgFeedback.bad .pgVerdict{background:#321918;color:#f0a09a;border-color:#9b5c57}.pgFeedback h2{margin:4px 0;font-size:23px}.pgFeedback>div>p{margin:0;color:#92a7ac;font-size:9px}.pgFeedbackBody{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:7px}.pgFeedbackBody article{padding:10px;border:1px solid #2e4d57;border-radius:10px;background:#071820}.pgFeedbackBody small{font:850 7px ui-monospace;color:#69d8e5}.pgFeedbackBody p{font-size:9px;line-height:1.5;color:#becacd}.pgFeedbackAction{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px}.pgFeedbackAction>span{font-size:8px;color:#81989d}.pgError{margin-top:9px}.pgFeedbackAction button{min-width:160px}@keyframes pgWalk{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-5px) rotate(1.2deg)}}@keyframes pgIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes pgFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes pgPulse{0%{transform:translateX(-50%) scale(.75);opacity:1}100%{transform:translateX(-50%) scale(1.45);opacity:0}}@keyframes pgPanel{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}@keyframes pgRain{from{transform:translateY(-100px) rotate(12deg)}to{transform:translateY(115vh) rotate(12deg)}}@media(max-width:900px){.pgHud{left:7px;right:7px;top:7px;grid-template-columns:auto 1fr auto}.pgLogo,.pgMission,.pgExit{min-height:47px}.pgLogo{padding:0 9px;font-size:10px}.pgMission{padding:6px 8px}.pgMission strong{font-size:10px}.pgMission span,.pgProgress{display:none}.pgExit{padding:0 9px}.pgEntity.actor>img{width:78px}.pgPlayer img{width:84px}.pgTag{min-width:88px}.pgObjective{left:7px;right:7px;bottom:max(7px,env(safe-area-inset-bottom));width:auto;transform:none}.pgInteraction{left:7px;right:7px;bottom:82px;width:auto;min-height:260px;grid-template-columns:118px 1fr}.pgInteractionVisual img{max-height:180px}.pgInteractionCopy{padding:17px}.pgInteractionCopy h2{font-size:19px}.pgDispatch,.pgDecision,.pgFeedback{width:calc(100vw - 14px);max-height:88vh;overflow:auto;padding:19px}.pgFeedbackBody{grid-template-columns:1fr}.pgChoices button{grid-template-columns:32px 1fr}.pgChoices button>small{display:none}}@media(prefers-reduced-motion:reduce){.pgAtmosphere i,.pgEntity img,.pgPulse,.pgPlayer.walking img{animation:none!important}}
`;
