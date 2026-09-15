import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../actions';

export default async function Dashboard(){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');

  const[{data:catalog},{data:missions},{data:progress},{data:isAdmin},{data:syllabi}]=await Promise.all([
    sb.from('mission_catalog').select('*').eq('status','published').order('sequence_no'),
    sb.from('missions').select('id,syllabus_id').eq('status','published'),
    sb.from('mission_progress').select('mission_id,status,progress_percent,score_best').eq('user_id',user.id),
    sb.rpc('is_admin'),
    sb.from('exam_syllabi').select('id,title,exam_name,agency,position_name').eq('status','published').order('created_at')
  ]);

  const ok=new Set((missions||[]).map(x=>x.id));
  const displayName=user.user_metadata?.display_name||user.email?.split('@')[0]||'Aluno';
  const completed=(progress||[]).filter((p:any)=>p.status==='completed').length;
  const accessibleSyllabi=new Set((missions||[]).map((m:any)=>m.syllabus_id).filter(Boolean));
  const visibleSyllabi=(syllabi||[]).filter((s:any)=>accessibleSyllabi.has(s.id));

  return <main className="shell">
    <section className="card">
      <div className="ey">CENTRAL DE OPERAÇÕES</div>
      <h1>Olá, {displayName}</h1>
      <p className="muted">Continue sua campanha. Cada missão transforma conteúdo do edital em investigação, decisão jurídica e revisão espaçada.</p>
      <div className="row">
        <a className="btn" href="/archive">Arquivo de Casos</a>
        {visibleSyllabi.map((s:any)=><a className="btn" key={s.id} href={`/syllabus/${s.id}`}>Mapa do Edital</a>)}
        {isAdmin===true&&<a className="btn" href="/admin">Painel administrativo</a>}
        <form action={logout}><button className="btn">Sair</button></form>
      </div>
      <p className="muted" style={{marginBottom:0}}>Concluídas: {completed} de {(catalog||[]).length}</p>
    </section>
    {visibleSyllabi.map((s:any)=><section className="card" style={{marginTop:12}} key={s.id}><div className="ey">EDITAL ATIVO</div><h2>{s.title}</h2><p className="muted">{[s.agency,s.position_name,s.exam_name].filter(Boolean).join(' • ')}</p><a className="btn primary" href={`/syllabus/${s.id}`}>Ver cobertura do edital</a></section>)}
    <section className="grid" style={{marginTop:12}}>
      {(catalog||[]).map((m:any)=>{
        const p=(progress||[]).find((x:any)=>x.mission_id===m.mission_id);
        const pct=p?.status==='completed'?100:Number(p?.progress_percent||0);
        const available=ok.has(m.mission_id);
        const done=p?.status==='completed';
        return <article className="card" key={m.mission_id}>
          <span className="tag">{available?(done?'CONCLUÍDA':pct>0?'EM ANDAMENTO':'DISPONÍVEL'):'PREMIUM'}</span>
          <h2 style={{marginTop:12}}>{m.title}</h2>
          <p className="muted">{m.summary}</p>
          <div style={{height:5,background:'#07161b',borderRadius:99,overflow:'hidden',margin:'16px 0 8px'}}><i style={{display:'block',height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#67d5dd,#e5bd58)'}}/></div>
          <p className="muted" style={{fontSize:11}}>{done?`Missão concluída${p?.score_best!=null?` • melhor resultado ${Number(p.score_best)}%`:''}`:pct>0?`${pct}% concluído`:'Pronta para iniciar'}</p>
          {available&&done?<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><a className="btn primary" href={`/game/${m.mission_id}?mode=replay`}>Refazer missão</a><a className="btn" href={`/game/${m.mission_id}?mode=explore`}>Explorar cenários</a><a className="btn" href={`/game/${m.mission_id}`}>Ver conclusão</a></div>:available?<a className="btn primary" href={`/game/${m.mission_id}`}>{pct>0?'Continuar missão':'Jogar missão'}</a>:<button className="btn" disabled>Conteúdo premium</button>}
          {available&&done&&<p className="muted" style={{fontSize:10,marginTop:8}}>Repetição preserva resultado/XP. Exploração livre não altera progresso nem pontuação.</p>}
        </article>;
      })}
    </section>
  </main>;
}
