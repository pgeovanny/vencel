import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ReviewPage(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');
  const now=new Date().toISOString();
  const [{data:due},{data:upcoming},{data:stats}]=await Promise.all([
    sb.from('review_queue').select('id,mission_id,due_at,interval_days,reason,status').eq('user_id',user.id).eq('status','pending').lte('due_at',now).order('due_at').limit(20),
    sb.from('review_queue').select('id,mission_id,due_at,interval_days,reason,status').eq('user_id',user.id).eq('status','pending').gt('due_at',now).order('due_at').limit(6),
    sb.from('student_stats').select('*').eq('user_id',user.id).maybeSingle(),
  ]);
  const ids=[...new Set([...(due||[]),...(upcoming||[])].map((r:any)=>r.mission_id).filter(Boolean))];
  const {data:missions}=ids.length?await sb.from('missions').select('id,title,summary').in('id',ids):{data:[] as any[]};
  const mm=new Map((missions||[]).map((m:any)=>[m.id,m]));
  return <main className="shell">
    <section className="card">
      <div className="ey">CENTRAL DE REVISÃO</div>
      <h1>O que precisa voltar à memória hoje</h1>
      <p className="muted">As revisões vencidas têm prioridade. Você responde decisões da missão, recebe feedback imediato e só conclui quando recuperar a regra corretamente.</p>
      <div className="row"><a className="btn" href="/dashboard">Campanha</a><a className="btn" href="/archive">Arquivo de Casos</a></div>
    </section>
    <section className="adminMetrics" style={{marginTop:12}}>
      <div><small>VENCIDAS</small><strong>{due?.length||0}</strong><span>prontas para revisar</span></div>
      <div><small>XP</small><strong>{stats?.xp||0}</strong><span>experiência acumulada</span></div>
      <div><small>SEQUÊNCIA</small><strong>{stats?.current_streak||0}</strong><span>dias de atividade</span></div>
      <div><small>REVISÕES</small><strong>{stats?.reviews_completed||0}</strong><span>concluídas</span></div>
    </section>
    <section className="card" style={{marginTop:12}}>
      <div className="ey">AGORA</div><h2>Revisões devidas</h2>
      <div style={{display:'grid',gap:10}}>{(due||[]).map((r:any)=>{const m:any=mm.get(r.mission_id);return <article key={r.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'center',padding:14,border:'1px solid #31505a',borderRadius:14,background:'#081a20'}}><div><span className="tag">{r.interval_days} DIAS</span><h3 style={{margin:'8px 0 4px'}}>{m?.title||'Missão'}</h3><p className="muted" style={{margin:0,fontSize:11}}>{r.reason||'Revisão programada'}</p></div><a className="btn primary" href={`/review/${r.id}`}>Revisar agora</a></article>})}{(!due||due.length===0)&&<div style={{padding:16,border:'1px solid #2d4d56',borderRadius:14,background:'#08191f'}}><h3 style={{marginTop:0}}>Nada vencido</h3><p className="muted">Você está em dia. Continue uma missão ou explore um caso concluído.</p><a className="btn primary" href="/dashboard">Continuar campanha</a></div>}</div>
    </section>
    <section className="card" style={{marginTop:12}}><div className="ey">PRÓXIMAS</div><h2>Agenda de memória</h2><div style={{display:'grid',gap:8}}>{(upcoming||[]).map((r:any)=>{const m:any=mm.get(r.mission_id);return <div key={r.id} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #203940'}}><span><b>{m?.title||'Missão'}</b><small className="muted" style={{display:'block'}}>Revisão {r.interval_days}d</small></span><time className="muted">{new Date(r.due_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</time></div>})}{(!upcoming||upcoming.length===0)&&<p className="muted">Nenhuma revisão futura agendada.</p>}</div></section>
  </main>;
}
