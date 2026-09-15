import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../actions';

export default async function Dashboard(){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');

  const[{data:catalog},{data:missions},{data:progress},{data:isAdmin}]=await Promise.all([
    sb.from('mission_catalog').select('*').eq('status','published').order('sequence_no'),
    sb.from('missions').select('id').eq('status','published'),
    sb.from('mission_progress').select('mission_id,status,progress_percent').eq('user_id',user.id),
    sb.rpc('is_admin')
  ]);

  const ok=new Set((missions||[]).map(x=>x.id));
  const displayName=user.user_metadata?.display_name||user.email?.split('@')[0]||'Aluno';
  const completed=(progress||[]).filter((p:any)=>p.status==='completed').length;

  return <main className="shell">
    <section className="card">
      <div className="ey">CENTRAL DE OPERAÇÕES</div>
      <h1>Olá, {displayName}</h1>
      <p className="muted">Continue sua campanha. Cada missão transforma conteúdo de prova em decisão, investigação e revisão espaçada.</p>
      <div className="row">
        {isAdmin===true&&<a className="btn" href="/admin">Painel administrativo</a>}
        <form action={logout}><button className="btn">Sair</button></form>
      </div>
      <p className="muted" style={{marginBottom:0}}>Concluídas: {completed} de {(catalog||[]).length}</p>
    </section>
    <section className="grid" style={{marginTop:12}}>
      {(catalog||[]).map((m:any)=>{
        const p=(progress||[]).find((x:any)=>x.mission_id===m.mission_id);
        const pct=p?.status==='completed'?100:Number(p?.progress_percent||0);
        const available=ok.has(m.mission_id);
        return <article className="card" key={m.mission_id}>
          <span className="tag">{available?(pct>0?'EM ANDAMENTO':'DISPONÍVEL'):'PREMIUM'}</span>
          <h2 style={{marginTop:12}}>{m.title}</h2>
          <p className="muted">{m.summary}</p>
          <div style={{height:5,background:'#07161b',borderRadius:99,overflow:'hidden',margin:'16px 0 8px'}}><i style={{display:'block',height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#67d5dd,#e5bd58)'}}/></div>
          <p className="muted" style={{fontSize:11}}>{pct===100?'Missão concluída':pct>0?`${pct}% concluído`:'Pronta para iniciar'}</p>
          {available?<a className="btn primary" href={`/game/${m.mission_id}`}>{pct>0&&pct<100?'Continuar missão':'Jogar missão'}</a>:<button className="btn" disabled>Conteúdo premium</button>}
        </article>;
      })}
    </section>
  </main>;
}
