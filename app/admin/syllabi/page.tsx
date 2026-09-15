import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSyllabus, setSyllabusStatus } from './actions';

export default async function AdminSyllabi(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) redirect('/dashboard');
  const [{data:syllabi},{data:topics},{data:missions},{data:links}]=await Promise.all([
    sb.from('exam_syllabi').select('*').order('created_at',{ascending:false}),
    sb.from('syllabus_topics').select('id,syllabus_id,discipline,weight'),
    sb.from('missions').select('id,syllabus_id,status'),
    sb.from('mission_topics').select('mission_id,topic_id')
  ]);
  return <main className="adminShell">
    <section className="adminHero"><div><div className="ey">EDITAIS E COBERTURA</div><h1>Gestão de Editais</h1><p>O edital é a raiz da campanha: tópicos → missões → decisões → revisão. O futuro agente de edital deve alimentar exatamente esta estrutura.</p></div><div className="adminHeroActions"><a className="btn" href="/admin">Voltar ao ADM</a></div></section>
    <section className="adminPanel"><div className="panelHead"><div><div className="ey">NOVO EDITAL</div><h2>Criar estrutura-base</h2></div></div><form action={createSyllabus} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
      <label>Título<input className="input" name="title" placeholder="Ex.: Polícia Civil GO — Agente 2026" required/></label>
      <label>Nome do concurso<input className="input" name="exam_name" placeholder="Concurso / edital"/></label>
      <label>Órgão<input className="input" name="agency" placeholder="Órgão"/></label>
      <label>Cargo<input className="input" name="position_name" placeholder="Cargo"/></label>
      <label>Ano<input className="input" name="exam_year" type="number" min="2020" max="2100"/></label>
      <label style={{gridColumn:'1/-1'}}>JSON-fonte do edital<textarea className="input" name="source_json" rows={6} placeholder='{"source":"upload","file_name":"edital.pdf"}'/></label>
      <div><button className="btn primary" type="submit">Criar edital em rascunho</button></div>
    </form></section>
    <section className="adminModules" style={{marginTop:12}}>{(syllabi||[]).map((s:any)=>{const topicIds=(topics||[]).filter((t:any)=>t.syllabus_id===s.id).map((t:any)=>t.id);const ms=(missions||[]).filter((m:any)=>m.syllabus_id===s.id);const linked=(links||[]).filter((l:any)=>topicIds.includes(l.topic_id));const disciplines=[...new Set((topics||[]).filter((t:any)=>t.syllabus_id===s.id).map((t:any)=>t.discipline))];return <div className="adminModule featured" key={s.id}><span className="moduleIcon">§</span><div style={{width:'100%'}}><small>{s.status.toUpperCase()}</small><h2>{s.title}</h2><p>{[s.agency,s.position_name,s.exam_name,s.exam_year].filter(Boolean).join(' • ')}</p><p><b>{topicIds.length}</b> tópicos • <b>{ms.length}</b> missões • <b>{linked.length}</b> vínculos tópico-missão • <b>{disciplines.length}</b> disciplinas</p><div className="row"><a className="btn" href={`/syllabus/${s.id}`}>Ver mapa</a><form action={setSyllabusStatus}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="status" value={s.status==='published'?'draft':'published'}/><button className="btn" type="submit">{s.status==='published'?'Voltar para rascunho':'Publicar edital'}</button></form></div></div></div>})}</section>
    <section className="adminPanel"><div className="panelHead"><div><div className="ey">CONTRATO DO AGENTE</div><h2>Como o edital vira jogo</h2></div></div><p>O agente de edital deve: 1) criar/atualizar <b>syllabus_topics</b>; 2) gerar as missões em <b>missions</b>; 3) vincular cada missão aos tópicos em <b>mission_topics</b> com peso de cobertura; 4) manter o <b>mission_json</b> validado pelo Editor de Missões. O aluno enxerga a cobertura automaticamente no Mapa do Edital.</p></section>
  </main>;
}
