import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ArchivePage(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');

  const [{data:progress},{data:missions}]=await Promise.all([
    sb.from('mission_progress').select('mission_id,status,score_first_try,score_best,completed_at').eq('user_id',user.id).eq('status','completed').order('completed_at',{ascending:false}),
    sb.from('missions').select('id,title,summary,sequence_no,mission_json,syllabus_id').eq('status','published').order('sequence_no')
  ]);
  const done=new Map((progress||[]).map((p:any)=>[p.mission_id,p]));
  const completed=(missions||[]).filter((m:any)=>done.has(m.id));

  return <main className="shell">
    <section className="card">
      <div className="ey">ARQUIVO DE CASOS</div>
      <h1>Missões concluídas</h1>
      <p className="muted">Revisite qualquer cenário já concluído. No modo exploração você pode circular, conversar com NPCs e rever evidências sem alterar nota, XP ou conclusão.</p>
      <div className="row"><a className="btn" href="/dashboard">Voltar à campanha</a></div>
    </section>
    <section className="grid" style={{marginTop:12}}>
      {completed.length===0&&<article className="card"><h2>Nenhum caso arquivado</h2><p className="muted">Conclua sua primeira missão para liberar a exploração livre.</p></article>}
      {completed.map((m:any)=>{const p:any=done.get(m.id);const stages=[...(m.mission_json?.stages||[])].sort((a:any,b:any)=>(a.order||0)-(b.order||0));return <article className="card" key={m.id}>
        <span className="tag">CASO CONCLUÍDO</span>
        <h2 style={{marginTop:12}}>{m.title}</h2>
        <p className="muted">{m.summary}</p>
        <p className="muted" style={{fontSize:11}}>Primeira tentativa: {p?.score_first_try!=null?`${Number(p.score_first_try)}%`:'—'} • melhor resultado: {p?.score_best!=null?`${Number(p.score_best)}%`:'—'}</p>
        <div style={{display:'grid',gap:8,marginTop:14}}>{stages.map((s:any,i:number)=><a className="btn" key={s.id} href={`/game/${m.id}?mode=explore&stage=${encodeURIComponent(s.id)}`}><b>{i+1}. {s.title||s.location||`Cena ${i+1}`}</b>{s.location&&<span style={{marginLeft:8,opacity:.7}}>{s.location}</span>}</a>)}</div>
        <div className="row" style={{marginTop:12}}><a className="btn primary" href={`/game/${m.id}?mode=explore`}>Explorar missão</a><a className="btn" href={`/game/${m.id}?mode=replay`}>Refazer missão</a></div>
      </article>})}
    </section>
  </main>;
}
