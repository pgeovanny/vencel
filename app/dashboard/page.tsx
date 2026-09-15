import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../actions';

export default async function Dashboard(){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');
  const now=new Date().toISOString();

  const[{data:catalog},{data:missions},{data:progress},{data:isAdmin},{data:syllabi},{data:stats},{data:dueReviews},{data:grants}]=await Promise.all([
    sb.from('mission_catalog').select('*').eq('status','published').order('sequence_no'),
    sb.from('missions').select('id,syllabus_id').eq('status','published'),
    sb.from('mission_progress').select('mission_id,status,progress_percent,score_best').eq('user_id',user.id),
    sb.rpc('is_admin'),
    sb.from('exam_syllabi').select('id,title,exam_name,agency,position_name').eq('status','published').order('created_at'),
    sb.from('student_stats').select('*').eq('user_id',user.id).maybeSingle(),
    sb.from('review_queue').select('id,mission_id,due_at').eq('user_id',user.id).eq('status','pending').lte('due_at',now).order('due_at'),
    sb.from('access_grants').select('access_type,status,starts_at,ends_at,syllabus_id').eq('user_id',user.id).eq('status','active').order('created_at',{ascending:false}),
  ]);

  const ok=new Set((missions||[]).map(x=>x.id));
  const pmap=new Map((progress||[]).map((p:any)=>[p.mission_id,p]));
  const displayName=user.user_metadata?.display_name||user.email?.split('@')[0]||'Aluno';
  const completed=(progress||[]).filter((p:any)=>p.status==='completed').length;
  const accessibleSyllabi=new Set((missions||[]).map((m:any)=>m.syllabus_id).filter(Boolean));
  const visibleSyllabi=(syllabi||[]).filter((s:any)=>accessibleSyllabi.has(s.id));
  const inProgress=(catalog||[]).find((m:any)=>ok.has(m.mission_id)&&pmap.get(m.mission_id)?.status==='in_progress');
  const nextFresh=(catalog||[]).find((m:any)=>ok.has(m.mission_id)&&!pmap.has(m.mission_id));
  const nextMission=inProgress||nextFresh;
  const dueCount=dueReviews?.length||0;
  const activeGrant=(grants||[]).find((g:any)=>!g.ends_at||new Date(g.ends_at).getTime()>Date.now());
  const trial=activeGrant?.access_type==='trial';
  const trialDays=trial&&activeGrant?.ends_at?Math.max(0,Math.ceil((new Date(activeGrant.ends_at).getTime()-Date.now())/86400000)):null;
  const dailyHref=dueCount?'/review':nextMission?`/game/${nextMission.mission_id}`:'/archive';
  const dailyTitle=dueCount?`${dueCount} revisão${dueCount>1?'ões':''} esperando`:nextMission?(inProgress?'Retome sua missão':'Comece a próxima missão'):'Explore seus casos concluídos';
  const dailyText=dueCount?'Recupere primeiro o conteúdo que está chegando ao ponto de esquecimento.':nextMission?`${nextMission.title} • ${Number(pmap.get(nextMission.mission_id)?.progress_percent||0)}% concluído`:'Revisite cenários, NPCs e evidências sem alterar sua pontuação.';

  return <main className="shell">
    <section className="card" style={{background:'radial-gradient(circle at 85% 0,#173d46 0,transparent 38%),#0a1c21'}}>
      <div className="ey">SESSÃO DE HOJE</div>
      <h1>{dailyTitle}</h1>
      <p className="muted">{dailyText}</p>
      <div className="row"><a className="btn primary" href={dailyHref}>{dueCount?'Revisar agora':nextMission?(inProgress?'Continuar missão':'Iniciar missão'):'Abrir Arquivo de Casos'}</a><a className="btn" href="/review">Central de Revisão</a><a className="btn" href="/archive">Arquivo de Casos</a>{visibleSyllabi.map((s:any)=><a className="btn" key={s.id} href={`/syllabus/${s.id}`}>Mapa do Edital</a>)}{trial&&<a className="btn" href="/premium">Ver Premium</a>}{isAdmin===true&&<a className="btn" href="/admin">ADM</a>}<form action={logout}><button className="btn">Sair</button></form></div>
      {trial&&<p className="muted" style={{marginBottom:0,fontSize:11}}>Acesso de teste ativo{trialDays!=null?` • ${trialDays} dia${trialDays===1?'':'s'} restante${trialDays===1?'':'s'}`:''}. O progresso fica salvo na sua conta.</p>}
    </section>

    <section className="adminMetrics" style={{marginTop:12}}>
      <div><small>XP</small><strong>{stats?.xp||0}</strong><span>aprendizado acumulado</span></div>
      <div><small>SEQUÊNCIA</small><strong>{stats?.current_streak||0}</strong><span>dias de atividade</span></div>
      <div><small>REVISÕES</small><strong>{stats?.reviews_completed||0}</strong><span>recuperações concluídas</span></div>
      <div><small>MISSÕES</small><strong>{completed}</strong><span>casos concluídos</span></div>
    </section>

    {dueCount>0&&<section className="card" style={{marginTop:12,borderColor:'#8b7139'}}><div className="ey">MEMÓRIA EM RISCO</div><h2>Não deixe a revisão acumular</h2><p className="muted">Você tem {dueCount} revisão{dueCount>1?'ões':''} vencida{dueCount>1?'s':''}. Elas priorizam decisões e pontos que você errou antes.</p><a className="btn primary" href="/review">Resolver revisões</a></section>}

    {visibleSyllabi.map((s:any)=><section className="card" style={{marginTop:12}} key={s.id}><div className="ey">EDITAL ATIVO</div><h2>{s.title}</h2><p className="muted">{[s.agency,s.position_name,s.exam_name].filter(Boolean).join(' • ')}</p><div className="row"><a className="btn primary" href={`/syllabus/${s.id}`}>Ver o que já foi revisado</a><span className="muted" style={{fontSize:11,alignSelf:'center'}}>Cada missão informa quais tópicos do edital está treinando.</span></div></section>)}

    <section className="grid" style={{marginTop:12}}>
      {(catalog||[]).map((m:any)=>{
        const p:any=pmap.get(m.mission_id);
        const pct=p?.status==='completed'?100:Number(p?.progress_percent||0);
        const available=ok.has(m.mission_id);
        const done=p?.status==='completed';
        return <article className="card" key={m.mission_id} style={nextMission?.mission_id===m.mission_id?{borderColor:'#7b7040'}:undefined}>
          <span className="tag">{available?(done?'CONCLUÍDA':pct>0?'EM ANDAMENTO':'DISPONÍVEL'):'PREMIUM'}</span>
          <h2 style={{marginTop:12}}>{m.title}</h2>
          <p className="muted">{m.summary}</p>
          <div style={{height:5,background:'#07161b',borderRadius:99,overflow:'hidden',margin:'16px 0 8px'}}><i style={{display:'block',height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#67d5dd,#e5bd58)'}}/></div>
          <p className="muted" style={{fontSize:11}}>{done?`Missão concluída${p?.score_best!=null?` • melhor resultado ${Number(p.score_best)}%`:''}`:pct>0?`${pct}% concluído`:'Pronta para iniciar'}</p>
          {available&&done?<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><a className="btn primary" href={`/game/${m.mission_id}?mode=replay`}>Refazer missão</a><a className="btn" href={`/game/${m.mission_id}?mode=explore`}>Explorar cenários</a><a className="btn" href="/review">Revisões</a></div>:available?<a className="btn primary" href={`/game/${m.mission_id}`}>{pct>0?'Continuar missão':'Jogar missão'}</a>:<div><a className="btn primary" href="/premium">Conhecer Premium</a><p className="muted" style={{fontSize:10}}>Libere a continuação da campanha, revisões e cobertura completa do edital.</p></div>}
        </article>;
      })}
    </section>
  </main>;
}
