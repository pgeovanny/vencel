import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSyllabus, createTopic, deleteTopic, setSyllabusStatus } from './actions';

export default async function AdminSyllabi(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/');
  const {data:isAdmin}=await sb.rpc('is_admin');if(isAdmin!==true)redirect('/dashboard');
  const [{data:syllabi},{data:topics},{data:missions},{data:links}]=await Promise.all([
    sb.from('exam_syllabi').select('*').order('created_at',{ascending:false}),
    sb.from('syllabus_topics').select('id,syllabus_id,code,title,discipline,weight,source_ref,order_index').order('order_index'),
    sb.from('missions').select('id,title,syllabus_id,status'),
    sb.from('mission_topics').select('mission_id,topic_id')
  ]);
  return <main className="adminShell">
    <section className="adminHero"><div><div className="ey">EDITAIS E COBERTURA</div><h1>Gestão de Editais</h1><p>O edital é a raiz da campanha: tópicos → missões → decisões → revisão. O agente de edital deve alimentar exatamente esta estrutura.</p></div><div className="adminHeroActions"><a className="btn" href="/admin">Voltar ao ADM</a><a className="btn" href="/admin/missions">Editor de Missões</a></div></section>

    <section className="adminPanel"><div className="panelHead"><div><div className="ey">NOVO EDITAL</div><h2>Criar estrutura-base</h2></div></div><form action={createSyllabus} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
      <label>Título<input className="input" name="title" placeholder="Ex.: Polícia Civil GO — Agente 2026" required/></label><label>Nome do concurso<input className="input" name="exam_name" placeholder="Concurso / edital"/></label><label>Órgão<input className="input" name="agency" placeholder="Órgão"/></label><label>Cargo<input className="input" name="position_name" placeholder="Cargo"/></label><label>Ano<input className="input" name="exam_year" type="number" min="2020" max="2100"/></label><label style={{gridColumn:'1/-1'}}>JSON-fonte do edital<textarea className="input" name="source_json" rows={5} placeholder='{"source":"upload","file_name":"edital.pdf"}'/></label><div><button className="btn primary" type="submit">Criar edital em rascunho</button></div>
    </form></section>

    <section className="adminModules" style={{marginTop:12}}>{(syllabi||[]).map((s:any)=>{
      const st=(topics||[]).filter((t:any)=>t.syllabus_id===s.id),topicIds=st.map((t:any)=>t.id),ms=(missions||[]).filter((m:any)=>m.syllabus_id===s.id),linked=(links||[]).filter((l:any)=>topicIds.includes(l.topic_id)),disciplines=[...new Set(st.map((t:any)=>t.discipline))];
      return <div className="adminModule featured" key={s.id}><span className="moduleIcon">§</span><div style={{width:'100%'}}><small>{s.status.toUpperCase()}</small><h2>{s.title}</h2><p>{[s.agency,s.position_name,s.exam_name,s.exam_year].filter(Boolean).join(' • ')}</p><p><b>{st.length}</b> tópicos • <b>{ms.length}</b> missões • <b>{linked.length}</b> vínculos • <b>{disciplines.length}</b> disciplinas</p><div className="row"><a className="btn" href={`/syllabus/${s.id}`}>Ver mapa</a><form action={setSyllabusStatus}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="status" value={s.status==='published'?'draft':'published'}/><button className="btn" type="submit">{s.status==='published'?'Voltar para rascunho':'Publicar edital'}</button></form></div>
      <details style={{marginTop:14}}><summary style={{cursor:'pointer',fontWeight:800}}>Gerenciar tópicos do edital</summary><form action={createTopic} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}><input type="hidden" name="syllabus_id" value={s.id}/><label>Disciplina<input className="input" name="discipline" placeholder="Direito Penal" required/></label><label>Código<input className="input" name="code" placeholder="PEN.TENTATIVA" required/></label><label style={{gridColumn:'1/-1'}}>Tópico<input className="input" name="title" placeholder="Tentativa" required/></label><label>Referência no edital<input className="input" name="source_ref" placeholder="Item 4.2"/></label><label>Peso<input className="input" name="weight" type="number" min="0.1" max="10" step="0.1" defaultValue="1"/></label><div><button className="btn primary" type="submit">Adicionar tópico</button></div></form>
      <div style={{display:'grid',gap:6,marginTop:12}}>{st.map((t:any)=>{const used=(links||[]).filter((l:any)=>l.topic_id===t.id).length;return <div key={t.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',padding:9,border:'1px solid #294950',borderRadius:10,background:'#07181d'}}><div><small>{t.discipline} • {t.code}</small><b style={{display:'block',marginTop:3}}>{t.title}</b><span style={{fontSize:10,opacity:.65}}>{used} missão(ões) • peso {Number(t.weight).toFixed(1)}{t.source_ref?` • ${t.source_ref}`:''}</span></div><form action={deleteTopic}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="syllabus_id" value={s.id}/><button className="btn" type="submit" disabled={used>0} title={used>0?'Remova os vínculos antes de excluir':'Excluir tópico'}>Excluir</button></form></div>})}{st.length===0&&<p style={{fontSize:11,opacity:.7}}>Nenhum tópico cadastrado. O agente de edital também poderá preencher esta lista automaticamente.</p>}</div></details>
      </div></div>})}</section>

    <section className="adminPanel"><div className="panelHead"><div><div className="ey">CONTRATO DO AGENTE</div><h2>Como um edital vira campanha</h2></div></div><p>1) extrair disciplinas e tópicos para <b>syllabus_topics</b>; 2) gerar missões em <b>missions</b>; 3) vincular cada missão aos tópicos em <b>mission_topics</b>; 4) gerar decisões e feedback no <b>mission_json</b>; 5) validar tudo no Editor de Missões. O aluno acompanha a cobertura automaticamente no Mapa do Edital e recebe revisões espaçadas após concluir cada caso.</p></section>
  </main>;
}
