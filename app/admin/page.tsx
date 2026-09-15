import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Admin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const { data: isAdmin } = await sb.rpc('is_admin');
  if (!isAdmin) redirect('/dashboard');

  const [
    { count: profiles }, { count: attempts }, { count: missions }, { count: completed },
    { count: presets }, { data: first }, { data: settings }, { data: catalog },
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('decision_attempts').select('*', { count: 'exact', head: true }),
    sb.from('missions').select('*', { count: 'exact', head: true }).eq('status','published'),
    sb.from('mission_progress').select('*', { count: 'exact', head: true }).eq('status','completed'),
    sb.from('game_visual_presets').select('*', { count: 'exact', head: true }).eq('active',true),
    sb.from('mission_catalog').select('mission_id,title').eq('status', 'published').order('sequence_no').limit(1).maybeSingle(),
    sb.from('game_runtime_settings').select('*').eq('id',1).maybeSingle(),
    sb.from('mission_catalog').select('mission_id,title,sequence_no,status').eq('status','published').order('sequence_no').limit(6),
  ]);

  return <main className="adminShell">
    <section className="adminHero">
      <div><div className="ey">JURISQUEST CONTROL • COMMERCIAL BUILD</div><h1>Painel de Operações</h1><p>Conteúdo, direção visual, acesso e telemetria em uma única camada administrativa.</p></div>
      <div className="adminHeroActions">{first && <a className="btn primary" href={`/game/${first.mission_id}`}>Testar runtime</a>}<a className="btn" href="/dashboard">Área do aluno</a><a className="btn" href="/reset-password">Minha senha</a></div>
    </section>

    <section className="adminMetrics">
      <div><small>USUÁRIOS</small><strong>{profiles ?? 0}</strong><span>perfis registrados</span></div>
      <div><small>MISSÕES</small><strong>{missions ?? 0}</strong><span>publicadas</span></div>
      <div><small>TENTATIVAS</small><strong>{attempts ?? 0}</strong><span>decisões respondidas</span></div>
      <div><small>CONCLUSÕES</small><strong>{completed ?? 0}</strong><span>missões finalizadas</span></div>
    </section>

    <section className="adminModules">
      <a className="adminModule featured" href="/admin/visual"><span className="moduleIcon">◇</span><div><small>DIREÇÃO DE ARTE</small><h2>Visual Studio</h2><p>{presets ?? 0} presets ativos. Controle noite, dia, chuva, interiores, personagens e qualidade do renderer.</p><b>Abrir sistema visual →</b></div></a>
      <div className="adminModule"><span className="moduleIcon">✦</span><div><small>GERAÇÃO DE CONTEÚDO</small><h2>Mission Agent</h2><p>Contrato visual V3 já preparado para o agente que vai transformar edital em missões. A interface de ingestão será a próxima camada.</p><b>Schema: {settings?.agent_schema_version || 'jurisquest.mission.v3-visual'}</b></div></div>
      <div className="adminModule"><span className="moduleIcon">⌁</span><div><small>RUNTIME</small><h2>Engine Settings</h2><p>Desktop <b>{settings?.renderer_quality || 'high'}</b> • mobile <b>{settings?.mobile_quality || 'balanced'}</b> • UI <b>{settings?.ui_theme || 'anime_noir'}</b>.</p><a href="/admin/visual">Ajustar renderer →</a></div></div>
      <div className="adminModule"><span className="moduleIcon">◎</span><div><small>ACESSO E PLANOS</small><h2>Usuários</h2><p>RLS e grants continuam controlando quem pode acessar missões, trial e conteúdo premium.</p><span className="adminBadge">PROTEGIDO NO BANCO</span></div></div>
    </section>

    <section className="adminPanel">
      <div className="panelHead"><div><div className="ey">CONTEÚDO ATIVO</div><h2>Campanha publicada</h2></div><span className="adminBadge">{catalog?.length || 0} NO PAINEL</span></div>
      <div className="missionRows">{(catalog || []).map((m:any)=><div className="missionRow" key={m.mission_id}><span className="seq">{String(m.sequence_no || 0).padStart(2,'0')}</span><strong>{m.title}</strong><div/><a href={`/game/${m.mission_id}`}>Jogar</a></div>)}</div>
    </section>

    <style jsx global>{`
      .adminShell{max-width:1250px;margin:auto;padding:28px 18px 70px}.adminHero{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;padding:28px;border:1px solid #314d56;border-radius:22px;background:radial-gradient(circle at 80% 0,#1b4957,transparent 30%),linear-gradient(135deg,#10262c,#08171b);box-shadow:0 24px 70px #0005}.adminHero h1{font-size:35px;margin:7px 0}.adminHero p{max-width:720px;color:#91a6aa}.adminHeroActions{display:flex;gap:8px;flex-wrap:wrap}.adminMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.adminMetrics>div,.adminModule,.adminPanel{border:1px solid #2d4850;background:linear-gradient(180deg,#0e2228,#09181c);border-radius:16px;box-shadow:0 16px 50px #0003}.adminMetrics>div{padding:16px}.adminMetrics small,.adminMetrics strong,.adminMetrics span{display:block}.adminMetrics small{font:850 8px ui-monospace;color:#6ed0da;letter-spacing:.12em}.adminMetrics strong{font-size:29px;margin:4px 0}.adminMetrics span{font-size:10px;color:#81989d}.adminModules{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.adminModule{display:grid;grid-template-columns:54px 1fr;gap:12px;padding:19px;color:inherit;text-decoration:none}.adminModule.featured{border-color:#8a733a;background:radial-gradient(circle at 0 0,#3d351d66,transparent 32%),linear-gradient(180deg,#13262a,#0a191c)}.moduleIcon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#16333b;border:1px solid #3c5961;color:#e7c76c;font-size:22px}.adminModule small{font:850 8px ui-monospace;color:#6ed0da}.adminModule h2{margin:5px 0 6px}.adminModule p{color:#8ea3a8;font-size:11px;line-height:1.55}.adminModule b,.adminModule a{font-size:10px;color:#ead077;text-decoration:none}.adminBadge{display:inline-flex;border:1px solid #45606a;border-radius:999px;padding:5px 8px;font:800 8px ui-monospace;color:#a9c2c6}.adminPanel{padding:20px;margin-top:14px}.panelHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.panelHead h2{margin:5px 0}.missionRows{display:grid;gap:7px;margin-top:12px}.missionRow{display:grid;grid-template-columns:42px auto 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid #29434b;background:#08191e;border-radius:11px}.missionRow .seq{width:36px;height:30px;border-radius:8px;display:grid;place-items:center;background:#15323a;color:#ddc26c;font:900 10px ui-monospace}.missionRow a{color:#7bd5df;text-decoration:none;font-size:10px;font-weight:800}@media(max-width:820px){.adminHero{display:block}.adminHeroActions{margin-top:16px}.adminMetrics{grid-template-columns:repeat(2,1fr)}.adminModules{grid-template-columns:1fr}.adminShell{padding:16px 10px 60px}.adminHero{padding:20px}.adminHero h1{font-size:28px}}
    `}</style>
  </main>;
}
