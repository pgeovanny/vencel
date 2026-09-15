'use client';

import { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props={
  review:{id:string;interval_days:number;reason?:string|null};
  mission:{id:string;title:string;mission_json:any};
  progress?:any;
  userId:string;
};

type Phase='question'|'feedback'|'complete';

export default function ReviewSession({review,mission,progress,userId}:Props){
  const sb=useRef(createClient());
  const weak=new Set<string>(Array.isArray(progress?.mistakes)?progress.mistakes:[]);
  const questions=useMemo(()=>{
    const all=[...(mission.mission_json?.decisions||[])];
    all.sort((a:any,b:any)=>Number(weak.has(b.id))-Number(weak.has(a.id)));
    return all.slice(0,5);
  },[mission.mission_json]);
  const [index,setIndex]=useState(0);
  const [phase,setPhase]=useState<Phase>('question');
  const [choice,setChoice]=useState<any>(null);
  const [choiceIndex,setChoiceIndex]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [firstMisses,setFirstMisses]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [xp,setXp]=useState(0);
  const q=questions[index];

  async function nextAttempt(decisionId:string){
    const {data,error}=await sb.current.from('decision_attempts').select('attempt_no').eq('user_id',userId).eq('mission_id',mission.id).eq('decision_id',decisionId).order('attempt_no',{ascending:false}).limit(1).maybeSingle();
    if(error) throw error;
    return Number(data?.attempt_no||0)+1;
  }

  async function answer(i:number){
    if(busy||!q)return;
    setBusy(true);setError('');
    try{
      const c=q.choices?.[i];
      if(!c)return;
      const attempt=await nextAttempt(q.id);
      const {error:insertError}=await sb.current.from('decision_attempts').insert({
        user_id:userId,mission_id:mission.id,decision_id:q.id,attempt_no:attempt,
        selected_index:i,selected_text:c.text,correct:!!c.correct,mode:'review',
        feedback_snapshot:{...(q.feedback||{}),choice_feedback:c.feedback,review_id:review.id}
      });
      if(insertError)throw insertError;
      if(!c.correct&&!firstMisses.includes(q.id))setFirstMisses(v=>[...v,q.id]);
      setChoice(c);setChoiceIndex(i);setPhase('feedback');
    }catch(e:any){setError(e?.message||'Não foi possível registrar a resposta. Tente novamente.');}
    finally{setBusy(false)}
  }

  async function advance(){
    if(!choice)return;
    if(!choice.correct){setChoice(null);setChoiceIndex(null);setPhase('question');return;}
    if(index<questions.length-1){setIndex(v=>v+1);setChoice(null);setChoiceIndex(null);setPhase('question');return;}
    setBusy(true);setError('');
    try{
      const quality=firstMisses.length===0?5:firstMisses.length===1?4:3;
      const {data,error}=await sb.current.rpc('complete_review',{p_review_id:review.id,p_quality:quality});
      if(error)throw error;
      setXp(Number(data?.xp||0));setPhase('complete');
    }catch(e:any){setError(e?.message||'A revisão foi respondida, mas não foi possível concluí-la.');}
    finally{setBusy(false)}
  }

  if(!questions.length)return <main className="shell"><section className="card center"><div className="ey">REVISÃO</div><h1>Sem decisões nesta missão</h1><p className="muted">Esta missão ainda não possui decisões compatíveis com a revisão rápida.</p><a className="btn" href="/review">Voltar</a></section></main>;

  if(phase==='complete')return <main className="shell"><section className="card center reviewDone"><div className="ey">REVISÃO CONCLUÍDA</div><h1>Conteúdo recuperado</h1><p className="muted">Você recuperou ativamente as regras desta missão. A revisão foi registrada no seu histórico.</p><div className="reviewReward"><strong>+{xp} XP</strong><span>{firstMisses.length===0?'Revisão perfeita':`${firstMisses.length} ponto(s) precisaram de nova tentativa`}</span></div><div className="row"><a className="btn primary" href="/review">Próxima revisão</a><a className="btn" href="/dashboard">Voltar à campanha</a></div></section><style jsx global>{CSS}</style></main>;

  const wrong=phase==='feedback'&&!choice?.correct;
  const feedback=q.feedback||{};
  return <main className="reviewShell">
    <header className="reviewTop"><div><div className="ey">REVISÃO {review.interval_days}D • ACTIVE RECALL</div><h1>{mission.title}</h1></div><div className="reviewCounter">{index+1}<span>/ {questions.length}</span></div></header>
    <section className="reviewProgress"><i style={{width:`${((index+(phase==='feedback'&&choice?.correct?1:0))/questions.length)*100}%`}}/></section>
    <section className="reviewCard">
      {weak.has(q.id)&&<span className="weakTag">PONTO FRACO PRIORIZADO</span>}
      <div className="ey">{q.title||'DECISÃO'}</div>
      <h2>{q.question}</h2>
      <p className="recallHint">Tente formular a resposta mentalmente antes de olhar para o gabarito.</p>
      {phase==='question'&&<div className="reviewChoices">{(q.choices||[]).map((c:any,i:number)=><button key={i} disabled={busy} onClick={()=>void answer(i)}><span>{String.fromCharCode(65+i)}</span><b>{c.text}</b></button>)}</div>}
      {phase==='feedback'&&<>
        <div className={`reviewFeedback ${choice?.correct?'ok':'bad'}`}><strong>{choice?.correct?'Correto. Consolide o raciocínio.':'Ainda não. O erro virou material de revisão.'}</strong><p>{choice?.feedback||'Revise a regra abaixo.'}</p></div>
        <div className="reviewExplain">
          {feedback.rule&&<Info title="REGRA" text={feedback.rule}/>} 
          {feedback.application&&<Info title="APLICAÇÃO" text={feedback.application}/>} 
          {feedback.legal_basis&&<Info title="BASE LEGAL" text={feedback.legal_basis}/>} 
          {feedback.trap&&<Info title="PEGADINHA" text={feedback.trap}/>} 
          {feedback.memory&&<Info title="MEMÓRIA DE PROVA" text={feedback.memory} wide/>}
        </div>
        <button className="btn primary" disabled={busy} onClick={()=>void advance()}>{choice?.correct?(index===questions.length-1?'Concluir revisão':'Próxima questão'):'Tentar novamente'}</button>
      </>}
      {error&&<p className="error" style={{marginTop:12}}>{error}</p>}
    </section>
    <footer className="reviewFoot"><span>Erros nesta sessão: {firstMisses.length}</span><a href="/review">Sair da revisão</a></footer>
    <style jsx global>{CSS}</style>
  </main>;
}

function Info({title,text,wide=false}:{title:string;text:string;wide?:boolean}){return <article className={wide?'wide':''}><small>{title}</small><p>{text}</p></article>}

const CSS=`
.reviewShell{min-height:100vh;background:radial-gradient(circle at 70% 0,#12313b 0,transparent 38%),#061116;color:#eef5f4;padding:28px;box-sizing:border-box;font-family:Inter,system-ui,sans-serif}.reviewTop{max-width:900px;margin:0 auto;display:flex;justify-content:space-between;align-items:end}.reviewTop h1{margin:5px 0 0;font-size:30px}.reviewCounter{font-size:30px;font-weight:900;color:#edc95f}.reviewCounter span{font-size:14px;color:#82969b}.reviewProgress{max-width:900px;height:7px;margin:16px auto 20px;border-radius:99px;background:#0b2027;overflow:hidden}.reviewProgress i{display:block;height:100%;background:linear-gradient(90deg,#56d6e7,#e6c35c);transition:width .25s}.reviewCard{max-width:900px;margin:auto;padding:28px;border:1px solid #31545f;border-radius:22px;background:linear-gradient(180deg,#0c222a,#08191f);box-shadow:0 30px 100px #0008}.reviewCard h2{font-size:25px;line-height:1.3;margin:8px 0}.recallHint{color:#8ea4a8;font-size:12px}.weakTag{float:right;border:1px solid #9b7a3d;border-radius:99px;padding:5px 8px;color:#f0d579;font:800 9px ui-monospace}.reviewChoices{display:grid;gap:10px;margin-top:20px}.reviewChoices button{display:grid;grid-template-columns:42px 1fr;gap:12px;align-items:center;text-align:left;padding:14px;border:1px solid #335864;border-radius:14px;background:#0a2630;color:#eef5f4;cursor:pointer}.reviewChoices button:hover{border-color:#6bddeb;background:#0d303b}.reviewChoices span{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#113a47;color:#efca60;font-weight:900}.reviewFeedback{margin:18px 0;padding:16px;border-radius:14px}.reviewFeedback.ok{background:#0c2b1e;border:1px solid #4d8b68}.reviewFeedback.bad{background:#2c1918;border:1px solid #97534f}.reviewFeedback p{margin:7px 0 0;color:#d3dddd}.reviewExplain{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px}.reviewExplain article{padding:13px;border:1px solid #2d4e59;border-radius:12px;background:#071920}.reviewExplain article.wide{grid-column:1/-1}.reviewExplain small{color:#69d9e9;font:850 9px ui-monospace}.reviewExplain p{font-size:12px;line-height:1.55;margin:6px 0 0;color:#c8d3d4}.reviewFoot{max-width:900px;margin:14px auto;display:flex;justify-content:space-between;color:#7f959a;font-size:11px}.reviewFoot a{color:#80d9e4}.reviewDone{max-width:620px}.reviewReward{display:grid;gap:4px;margin:18px 0;padding:18px;border:1px solid #826e35;border-radius:14px;background:#262214}.reviewReward strong{font-size:30px;color:#efca60}.reviewReward span{color:#aebabc}@media(max-width:700px){.reviewShell{padding:16px}.reviewCard{padding:18px}.reviewExplain{grid-template-columns:1fr}.reviewExplain article.wide{grid-column:auto}.reviewTop h1{font-size:23px}}
`;