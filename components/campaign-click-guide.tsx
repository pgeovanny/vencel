'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props={mission:any;disabled?:boolean};
type Target={stage:any;objective:any;entity:any}|null;
const DW=1200,DH=760;

const keyMap:Record<string,{key:string;code:string,keyCode:number}>={up:{key:'w',code:'KeyW',keyCode:87},down:{key:'s',code:'KeyS',keyCode:83},left:{key:'a',code:'KeyA',keyCode:65},right:{key:'d',code:'KeyD',keyCode:68},interact:{key:'e',code:'KeyE',keyCode:69}};
function fire(name:keyof typeof keyMap,type:'keydown'|'keyup'){
  const k=keyMap[name];
  const ev=new KeyboardEvent(type,{key:k.key,code:k.code,bubbles:true,cancelable:true});
  try{Object.defineProperty(ev,'keyCode',{get:()=>k.keyCode});Object.defineProperty(ev,'which',{get:()=>k.keyCode})}catch{}
  window.dispatchEvent(ev);document.dispatchEvent(ev);
}
function mapPoint(p:{x:number;y:number},w:number,h:number){const pad=Math.max(34,w*.025),top=Math.max(84,h*.09),bottom=Math.max(86,h*.1);return{x:pad+(p.x/DW)*(w-pad*2),y:top+(p.y/DH)*(h-top-bottom)}}

export default function CampaignClickGuide({mission,disabled=false}:Props){
  const stages=useMemo(()=>[...(mission?.stages||[])].sort((a:any,b:any)=>(a.order||0)-(b.order||0)),[mission]);
  const [objectiveTitle,setObjectiveTitle]=useState('');
  const [moving,setMoving]=useState(false);
  const [dims,setDims]=useState({w:1200,h:760});
  const timer=useRef<number|null>(null);
  const stageRef=useRef<string>('');
  const posRef=useRef<{x:number;y:number}>({x:600,y:650});

  useEffect(()=>{const resize=()=>setDims({w:window.innerWidth,h:window.innerHeight});resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);
  useEffect(()=>{
    if(disabled)return;
    const read=()=>setObjectiveTitle(document.querySelector('.objectiveCard h2')?.textContent?.trim()||'');
    read();
    const root=document.querySelector('.studioGame')||document.body;
    const obs=new MutationObserver(read);obs.observe(root,{subtree:true,childList:true,characterData:true});
    return()=>obs.disconnect();
  },[disabled]);

  const target:Target=useMemo(()=>{
    if(disabled||!objectiveTitle)return null;
    for(const stage of stages){for(const objective of stage.objectives||[]){if(String(objective.title||'').trim()!==objectiveTitle)continue;if(objective.type==='actor'){const entity=(stage.actors||[]).find((x:any)=>x.id===objective.target);if(entity)return{stage,objective,entity}}if(objective.type==='object'){const entity=(stage.objects||[]).find((x:any)=>x.id===objective.target);if(entity)return{stage,objective,entity}}}}
    return null;
  },[disabled,objectiveTitle,stages]);

  useEffect(()=>{if(!target)return;if(stageRef.current!==target.stage.id){stageRef.current=target.stage.id;posRef.current=target.stage.player_spawn||{x:600,y:650}}},[target?.stage?.id]);
  useEffect(()=>()=>{if(timer.current)window.clearTimeout(timer.current)},[]);

  function go(){
    if(!target||moving)return;
    const from=posRef.current,to={x:Math.max(45,Math.min(1155,Number(target.entity.position?.x||600)-50)),y:Math.max(95,Math.min(705,Number(target.entity.position?.y||380)+74))};
    const dx=to.x-from.x,dy=to.y-from.y;
    const keys:(keyof typeof keyMap)[]=[];
    if(dx>20)keys.push('right'); else if(dx<-20)keys.push('left');
    if(dy>20)keys.push('down'); else if(dy<-20)keys.push('up');
    if(!keys.length){fire('interact','keydown');setTimeout(()=>fire('interact','keyup'),70);return}
    const a=mapPoint(from,dims.w,dims.h),b=mapPoint(to,dims.w,dims.h),distance=Math.hypot(b.x-a.x,b.y-a.y);
    const duration=Math.max(900,Math.min(3600,Math.round(distance/185*1000)));
    setMoving(true);keys.forEach(k=>fire(k,'keydown'));
    if(timer.current)window.clearTimeout(timer.current);
    timer.current=window.setTimeout(()=>{keys.forEach(k=>fire(k,'keyup'));posRef.current=to;setMoving(false);window.setTimeout(()=>{fire('interact','keydown');window.setTimeout(()=>fire('interact','keyup'),80)},180)},duration);
  }

  if(!target)return null;
  const p=mapPoint(target.entity.position||{x:600,y:380},dims.w,dims.h);
  return <button type="button" className={`campaignClickTarget ${moving?'moving':''}`} style={{left:p.x,top:p.y}} onClick={go} disabled={moving} aria-label={`Ir até ${target.entity.name||target.objective.title}`}>
    <span className="campaignClickPulse"/><span className="campaignClickArrow">⌄</span><b>{moving?'INDO ATÉ O ALVO':'CLIQUE PARA IR'}</b><small>{target.entity.name||target.objective.title}</small>
    <style jsx>{`
      .campaignClickTarget{position:fixed;z-index:9000;transform:translate(-50%,-82%);display:grid;place-items:center;min-width:126px;padding:0 8px 60px;border:0;background:transparent;color:#fff;cursor:pointer;filter:drop-shadow(0 12px 18px #000b);font-family:Inter,system-ui,sans-serif}.campaignClickTarget:disabled{cursor:wait}.campaignClickTarget b{position:absolute;top:-29px;padding:5px 8px;border-radius:999px;background:#e5bd58;color:#181309;font:950 7px ui-monospace;letter-spacing:.09em;white-space:nowrap;box-shadow:0 0 24px #e5bd5880}.campaignClickTarget small{position:absolute;top:-7px;padding:4px 8px;border:1px solid #4b6b73;border-radius:8px;background:#041118e8;color:#dfe9e8;font:850 9px ui-monospace;white-space:nowrap;backdrop-filter:blur(8px)}.campaignClickPulse{position:absolute;bottom:3px;width:82px;height:30px;border-radius:50%;border:3px solid #e7c15c;box-shadow:0 0 24px #e7c15caa;animation:pulse 1.35s ease-out infinite}.campaignClickArrow{position:absolute;bottom:33px;color:#f2ce69;font-size:28px;animation:bob .9s ease-in-out infinite}.campaignClickTarget.moving{opacity:.72}@keyframes pulse{0%{transform:scale(.65);opacity:1}100%{transform:scale(1.45);opacity:0}}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}@media(max-width:899px){.campaignClickTarget{display:none}}@media(prefers-reduced-motion:reduce){.campaignClickPulse,.campaignClickArrow{animation:none}}
    `}</style>
  </button>;
}
