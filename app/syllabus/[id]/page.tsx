import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SyllabusPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');

  const [{data:syllabus},{data:topics},{data:links},{data:missions},{data:progress}]=await Promise.all([
    sb.from('exam_syllabi').select('id,title,exam_name,agency,position_name,exam_year,status').eq('id',id).eq('status','published').maybeSingle(),
    sb.from('syllabus_topics').select('id,code,title,discipline,order_index,weight,source_ref,metadata').eq('syllabus_id',id).order('order_index'),
    sb.from('mission_topics').select('mission_id,topic_id,coverage_weight,is_primary'),
    sb.from('missions').select('id,title,summary,sequence_no').eq('syllabus_id',id).eq('status','published').order('sequence_no'),
    sb.from('mission_progress').select('mission_id,status,progress_percent').eq('user_id',user.id)
  ]);
  if(!syllabus) notFound();
  const missionMap=new Map((missions||[]).map((m:any)=>[m.id,m]));
  const progressMap=new Map((progress||[]).map((p:any)=>[p.mission_id,p]));
  let weightedDone=0,weightedTotal=0;
  const rows=(topics||[]).map((t:any)=>{
    const linked=(links||[]).filter((x:any)=>x.topic_id===t.id&&missionMap.has(x.mission_id));
    const total=linked.length;
    const done=linked.filter((x:any)=>progressMap.get(x.mission_id)?.status==='completed').length;
    const ratio=total?done/total:0;
    const weight=Number(t.weight||1);
    weightedDone+=ratio*weight; weightedTotal+=weight;
    return{...t,linked,total,done,ratio};
  });
  const overall=weightedTotal?Math.round(weightedDone/weightedTotal*100):0;
  const disciplines=[...new Set(rows.map((r:any)=>r.discipline))];

  return <main className="shell">
    <section className="card">
      <div className="ey">MAPA DO EDITAL</div>
      <h1>{syllabus.title}</h1>
      <p className="muted">{[syllabus.agency,syllabus.position_name,syllabus.exam_name,syllabus.exam_year].filter(Boolean).join(' • ')}</p>
      <div style={{height:9,background:'#07161b',borderRadius:99,overflow:'hidden',margin:'18px 0 8px'}}><i style={{display:'block',height:'100%',width:`${overall}%`,background:'linear-gradient(90deg,#67d5dd,#e5bd58)'}}/></div>
      <p className="muted">Cobertura ponderada pelas missões concluídas: <b>{overall}%</b></p>
      <div className="row"><a className="btn" href="/dashboard">Voltar à campanha</a><a className="btn" href="/archive">Arquivo de Casos</a></div>
    </section>
    {disciplines.map((discipline:any)=><section className="card" style={{marginTop:12}} key={discipline}>
      <div className="ey">{discipline}</div>
      <h2>Conteúdo revisado por missões</h2>
      <div style={{display:'grid',gap:10}}>{rows.filter((r:any)=>r.discipline===discipline).map((r:any)=><article key={r.id} style={{border:'1px solid #274956',borderRadius:14,padding:14,background:'#071820'}}>
        <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'start',flexWrap:'wrap'}}><div><span className="tag">{r.code}</span><h3 style={{margin:'8px 0 4px'}}>{r.title}</h3>{r.source_ref&&<p className="muted" style={{fontSize:10,margin:0}}>Referência: {r.source_ref}</p>}</div><strong>{Math.round(r.ratio*100)}%</strong></div>
        <div style={{height:5,background:'#061116',borderRadius:99,overflow:'hidden',margin:'12px 0'}}><i style={{display:'block',height:'100%',width:`${Math.round(r.ratio*100)}%`,background:'linear-gradient(90deg,#67d5dd,#e5bd58)'}}/></div>
        <p className="muted" style={{fontSize:11}}>{r.done} de {r.total} missões relacionadas concluídas • peso {Number(r.weight).toFixed(1)}</p>
        <div className="row">{r.linked.map((l:any)=>{const m:any=missionMap.get(l.mission_id);const p:any=progressMap.get(l.mission_id);return <a className="btn" key={l.mission_id} href={p?.status==='completed'?`/game/${m.id}?mode=explore`:`/game/${m.id}`}>{p?.status==='completed'?'✓ ':p?.progress_percent>0?'↻ ':'→ '}{m.title}</a>})}</div>
      </article>)}</div>
    </section>)}
  </main>;
}
