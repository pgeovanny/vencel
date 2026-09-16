import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Admin() {
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) redirect('/dashboard');
  const [{count:profiles},{count:attempts},{count:missions},{count:completed},{count:presets},{count:activeGrants},{count:pendingReviews},{count:syllabiCount},{count:patrolCompleted},{count:patrolActive},{data:first},{data:settings},{data:catalog}]=await Promise.all([
    sb.from('profiles').select('*',{count:'exact',head:true}),
    sb.from('decision_attempts').select('*',{count:'exact',head:true}),
    sb.from('missions').select('*',{count:'exact',head:true}).eq('status','published'),
    sb.from('mission_progress').select('*',{count:'exact',head:true}).eq('status','completed'),
    sb.from('game_visual_presets').select('*',{count:'exact',head:true}).eq('active',true),
    sb.from('access_grants').select('*',{count:'exact',head:true}).eq('status','active'),
    sb.from('review_queue').select('*',{count:'exact',head:true}).eq('status','pending'),
    sb.from('exam_syllabi').select('*',{count:'exact',head:true}),
    sb.from('patrol_runs').select('*',{count:'exact',head:true}).eq('status','completed'),
    sb.from('patrol_runs').select('*',{count:'exact',head:true}).eq('status','active'),
    sb.from('mission_catalog').select('mission_id,title').eq('status','published').order('sequence_no').limit(1).maybeSingle(),
    sb.from('game_runtime_settings').select('*').eq('id',1).maybeSingle(),
    sb.from('mission_catalog').select('mission_id,title,sequence_no,status').eq('status','published').order('sequence_no').limit(12)
  ]);
  return <main className="adminShell">
    <section className="adminHero"><div><div className="ey">JURISQUEST CONTROL • COMMERCIAL BUILD</div><h1>Painel de Operações</h1><p>Conteúdo, editais, usuários, direção visual, acesso, retenção e telemetria em uma única camada administrativa.</p></div><div className="adminHeroActions">{first&&<a className="btn primary" href={`/game/${first.mission_id}`}>Testar runtime</a>}<a className="btn" href="/plantao">Testar Plantão</a><a className="btn" href="/dashboard">Área do aluno</a></div></section>
    <section className="adminMetrics"><div><small>USUÁRIOS</small><strong>{profiles??0}</strong><span>perfis registrados</span></div><div><small>MISSÕES</small><strong>{missions??0}</strong><span>publicadas</span></div><div><small>PLANTÕES</small><strong>{patrolCompleted??0}</strong><span>{patrolActive??0} em andamento</span></div><div><small>CONCLUSÕES</small><strong>{completed??0}</strong><span>campanhas finalizadas</span></div></section>
    <section className="adminModules">
      <a className="adminModule featured" href="/admin/missions"><span className="moduleIcon">✦</span><div><small>CONTEÚDO</small><h2>Editor de Missões</h2><p>Edite conteúdo, sequência e cobertura do edital com validação estrutural antes de publicar.</p><b>Abrir editor →</b></div></a>
      <a className="adminModule featured" href="/admin/plantao"><span className="moduleIcon">⌁</span><div><small>RETENÇÃO</small><h2>Plantão Adaptativo</h2><p>{patrolCompleted??0} turnos concluídos. Acompanhe precisão, origem das ocorrências, XP e sessões ativas.</p><b>Abrir telemetria →</b></div></a>
      <a className="adminModule featured" href="/admin/syllabi"><span className="moduleIcon">§</span><div><small>EDITAIS</small><h2>Mapa de Conteúdo</h2><p>{syllabiCount??0} estruturas de edital. Cadastre tópicos e conecte-os às missões que realmente os revisam.</p><b>Gerenciar editais →</b></div></a>
      <a className="adminModule featured" href="/admin/users"><span className="moduleIcon">◎</span><div><small>ACESSO</small><h2>Usuários</h2><p>{activeGrants??0} grants ativos. Crie contas, conceda assinatura manual e revogue acesso.</p><b>Gerenciar usuários →</b></div></a>
      <a className="adminModule featured" href="/admin/commercial"><span className="moduleIcon">$</span><div><small>CONVERSÃO</small><h2>Plano e Checkout</h2><p>Configure oferta, trial, preço exibido e URL do checkout sem alterar o código do produto.</p><b>Configurar comercial →</b></div></a>
      <a className="adminModule" href="/admin/visual"><span className="moduleIcon">◇</span><div><small>DIREÇÃO DE ARTE</small><h2>Visual Studio</h2><p>{presets??0} presets ativos. Controle noite, dia, chuva, interiores, personagens e qualidade do renderer.</p><b>Abrir sistema visual →</b></div></a>
      <div className="adminModule"><span className="moduleIcon">↻</span><div><small>REVISÕES</small><h2>Recuperação Ativa</h2><p>{pendingReviews??0} revisões pendentes. A qualidade e o XP agora são derivados no servidor após recuperação real.</p><a href="/review">Abrir central →</a></div></div>
      <div className="adminModule"><span className="moduleIcon">✓</span><div><small>SEGURANÇA</small><h2>Server Authority</h2><p>Decisões, número de tentativas, correção, conclusão e XP são validados no banco antes de recompensar o aluno.</p><b>{attempts??0} tentativas registradas</b></div></div>
      <div className="adminModule"><span className="moduleIcon">◫</span><div><small>RUNTIME</small><h2>Engine Settings</h2><p>Desktop <b>{settings?.renderer_quality||'high'}</b> • mobile <b>{settings?.mobile_quality||'balanced'}</b> • UI <b>{settings?.ui_theme||'anime_noir'}</b>.</p><a href="/admin/visual">Ajustar renderer →</a></div></div>
      <div className="adminModule"><span className="moduleIcon">AI</span><div><small>GERAÇÃO DE CONTEÚDO</small><h2>Mission Agent</h2><p>Contrato preparado para transformar edital em tópicos, vínculos e missões; o editor valida o JSON antes da publicação.</p><b>{settings?.agent_schema_version||'jurisquest.mission.v3-visual'}</b></div></div>
    </section>
    <section className="adminPanel"><div className="panelHead"><div><div className="ey">CONTEÚDO ATIVO</div><h2>Campanha publicada</h2></div><span className="adminBadge">{catalog?.length||0} MISSÕES</span></div><div className="missionRows">{(catalog||[]).map((m:any)=><div className="missionRow" key={m.mission_id}><span className="seq">{String(m.sequence_no||0).padStart(2,'0')}</span><strong>{m.title}</strong><div/><a href={`/game/${m.mission_id}`}>Jogar</a><a href="/admin/missions">Editar</a></div>)}</div></section>
  </main>;
}
