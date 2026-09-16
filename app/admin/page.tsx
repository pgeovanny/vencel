import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Admin(){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');
  const{data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true)redirect('/dashboard');
  const[{count:profiles},{count:attempts},{count:missions},{count:completed},{count:presets},{count:activeGrants},{count:pendingReviews},{count:syllabiCount},{count:patrolCompleted},{count:patrolActive},{data:first},{data:settings},{data:catalog}]=await Promise.all([
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

  const modules=[
    {href:'/admin/missions',code:'01',ey:'CONTEÚDO',title:'Missões',text:'Editar narrativa, objetivos, evidências, decisões e publicação.',hot:true},
    {href:'/admin/visual',code:'02',ey:'DIREÇÃO DE ARTE',title:'Visual Studio',text:'Cenários e personagens compartilhados entre Campanha e Plantão.',hot:true},
    {href:'/admin/plantao',code:'03',ey:'RETENÇÃO',title:'Plantão',text:'Telemetria dos turnos, precisão e origem adaptativa.'},
    {href:'/admin/syllabi',code:'04',ey:'EDITAIS',title:'Mapa de Conteúdo',text:'Tópicos, vínculos e cobertura real de cada concurso.'},
    {href:'/admin/users',code:'05',ey:'ACESSO',title:'Usuários',text:'Contas, grants, trial e revogação de acesso.'},
    {href:'/admin/commercial',code:'06',ey:'COMERCIAL',title:'Plano e Checkout',text:'Oferta, preço, trial e entitlement.'},
  ];

  return <main className="adm4">
    <header className="admTop"><a href="/admin" className="admBrand">JURIS<span>QUEST</span> <b>CONTROL</b></a><nav><a href="/dashboard">Área do aluno</a>{first&&<a href={`/game/${first.mission_id}`}>Testar runtime</a>}<a href="/plantao">Testar Plantão</a></nav></header>
    <div className="admBody">
      <aside className="admNav"><div className="navTitle"><small>CENTRAL ADMINISTRATIVA</small><strong>Sistema operacional</strong></div>{modules.map(m=><a key={m.href} href={m.href} className={m.hot?'hot':''}><span>{m.code}</span><div><small>{m.ey}</small><b>{m.title}</b><p>{m.text}</p></div><em>→</em></a>)}</aside>

      <section className="admDeck">
        <div className="deckGrid"><i/><i/><i/><i/></div>
        <header className="admHero"><div><small>JURISQUEST • COMMERCIAL BUILD</small><h1>Controle do produto</h1><p>Conteúdo, runtime, direção visual, retenção, acesso e telemetria trabalham sobre a mesma arquitetura.</p></div><div className="runtimeSeal"><i/> RUNTIME V4 UNIFICADO</div></header>

        <section className="systemMap">
          <div className="systemCore"><span>JQ</span><b>GAME RUNTIME</b><small>Campanha + Plantão</small></div>
          <a href="/admin/missions" className="node n1"><span>MISSÕES</span><b>{missions??0}</b></a>
          <a href="/admin/visual" className="node n2"><span>VISUAL</span><b>{presets??0}</b></a>
          <a href="/admin/plantao" className="node n3"><span>PLANTÕES</span><b>{patrolCompleted??0}</b></a>
          <a href="/admin/syllabi" className="node n4"><span>EDITAIS</span><b>{syllabiCount??0}</b></a>
          <a href="/admin/users" className="node n5"><span>USUÁRIOS</span><b>{profiles??0}</b></a>
          <div className="connector c1"/><div className="connector c2"/><div className="connector c3"/><div className="connector c4"/><div className="connector c5"/>
        </section>

        <section className="campaignTable"><header><div><small>CONTEÚDO PUBLICADO</small><h2>Campanha ativa</h2></div><b>{catalog?.length||0} casos</b></header><div>{(catalog||[]).map((m:any)=><article key={m.mission_id}><span>{String(m.sequence_no||0).padStart(2,'0')}</span><strong>{m.title}</strong><i>PUBLICADO</i><a href={`/game/${m.mission_id}`}>Jogar</a><a href="/admin/missions">Editar</a></article>)}</div></section>
      </section>

      <aside className="admIntel">
        <section><small>SAÚDE DO PRODUTO</small><div className="health"><i/> Operacional</div><p>Decisões e recompensas críticas são validadas no servidor.</p></section>
        <section><small>SESSÕES ATIVAS</small><strong>{patrolActive??0}</strong><p>Plantões em andamento agora usam o mesmo runtime da Campanha.</p></section>
        <section><small>ACESSOS ATIVOS</small><strong>{activeGrants??0}</strong><p>Entitlements válidos neste momento.</p></section>
        <section><small>REVISÕES PENDENTES</small><strong>{pendingReviews??0}</strong><p>Fila atual de recuperação ativa.</p></section>
        <section><small>TENTATIVAS</small><strong>{attempts??0}</strong><p>Decisões registradas.</p></section>
        <section><small>CONCLUSÕES</small><strong>{completed??0}</strong><p>Missões finalizadas pelos alunos.</p></section>
        <section className="engine"><small>ENGINE</small><p>Desktop <b>{settings?.renderer_quality||'high'}</b><br/>Mobile <b>{settings?.mobile_quality||'balanced'}</b><br/>UI <b>{settings?.ui_theme||'anime_noir'}</b></p><a href="/admin/visual">Abrir Visual Studio</a></section>
      </aside>
    </div>
    <style>{CSS}</style>
  </main>;
}

const CSS=`
.adm4{min-height:100vh;background:#03090c;color:#edf4f3;font-family:Inter,system-ui,sans-serif}.admTop{height:62px;display:flex;align-items:center;padding:0 22px;border-bottom:1px solid #203b43;background:#061116f4;position:sticky;top:0;z-index:30}.admBrand{font-weight:950;letter-spacing:1.8px}.admBrand span{color:#e1bb57}.admBrand b{margin-left:8px;font:850 8px ui-monospace;color:#6ed2dd;border:1px solid #35545c;border-radius:999px;padding:4px 6px}.admTop nav{margin-left:auto;display:flex;gap:6px}.admTop nav a{padding:8px 10px;border:1px solid #2c4952;border-radius:8px;color:#90a5aa;font-size:9px;font-weight:850}.admBody{display:grid;grid-template-columns:270px minmax(0,1fr) 260px;gap:11px;max-width:1720px;margin:auto;padding:14px 16px 28px}.admNav,.admIntel{align-self:start;display:grid;gap:7px}.navTitle{padding:13px 14px;border-bottom:1px solid #203b43;margin-bottom:2px}.navTitle small,.admHero small,.campaignTable header small,.admIntel section>small{display:block;font:900 8px ui-monospace;letter-spacing:.13em;color:#63d2de}.navTitle strong{display:block;font-size:16px;margin-top:4px}.admNav>a{min-height:82px;display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:start;padding:11px;border:1px solid #28464f;border-radius:12px;background:#07171c;color:#edf4f3;transition:.15s}.admNav>a:hover{border-color:#5b8590;background:#0a2026}.admNav>a.hot{border-color:#665a35;background:linear-gradient(90deg,#17180f,#07171c 68%)}.admNav>a>span{width:30px;height:30px;border-radius:8px;background:#15343d;display:grid;place-items:center;color:#e1bd59;font:900 8px ui-monospace}.admNav small,.admNav b,.admNav p{display:block}.admNav small{font:800 7px ui-monospace;color:#66d1dc}.admNav b{font-size:12px;margin:3px 0}.admNav p{font-size:8px;line-height:1.45;color:#758d92;margin:0}.admNav em{font-style:normal;color:#e0bd5a}.admDeck{min-height:calc(100vh - 92px);position:relative;overflow:hidden;border:1px solid #294851;border-radius:17px;background:radial-gradient(circle at 50% 2%,#16424d 0,transparent 30%),linear-gradient(180deg,#07191e,#040c0f);padding:18px;box-shadow:0 25px 80px #0006}.deckGrid{position:absolute;inset:0;opacity:.35;pointer-events:none}.deckGrid i{position:absolute;background:#2e58621a}.deckGrid i:nth-child(1){left:25%;top:0;bottom:0;width:1px}.deckGrid i:nth-child(2){left:50%;top:0;bottom:0;width:1px}.deckGrid i:nth-child(3){left:75%;top:0;bottom:0;width:1px}.deckGrid i:nth-child(4){left:0;right:0;top:52%;height:1px}.admHero{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:4px 4px 14px;border-bottom:1px solid #203c44}.admHero h1{font-size:29px;margin:5px 0}.admHero p{font-size:10px;color:#849b9f;max-width:620px;line-height:1.5}.runtimeSeal{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #395c4f;border-radius:999px;background:#0b211a;color:#7bd5a1;font:850 8px ui-monospace}.runtimeSeal i{width:7px;height:7px;border-radius:50%;background:#65dca1;box-shadow:0 0 14px #65dca1}.systemMap{height:390px;position:relative;margin-top:14px;border:1px solid #26454d;border-radius:14px;background:radial-gradient(circle at 50% 50%,#123741 0,transparent 28%),#051216;overflow:hidden}.systemCore{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:170px;height:170px;border-radius:50%;display:grid;place-items:center;align-content:center;border:2px solid #d7b757;background:radial-gradient(circle,#183d45,#07171b 68%);box-shadow:0 0 0 12px #d7b7570b,0 0 65px #52d1de1f;text-align:center;z-index:4}.systemCore span{font-size:35px;font-weight:950;color:#e2bd5c}.systemCore b{font-size:10px;margin-top:4px}.systemCore small{font:750 7px ui-monospace;color:#6e8b90;margin-top:3px}.node{position:absolute;width:120px;height:74px;border:1px solid #355660;border-radius:12px;background:#071a20;display:grid;place-items:center;align-content:center;z-index:4;box-shadow:0 14px 35px #0007}.node span{font:850 7px ui-monospace;color:#67d1dc}.node b{font-size:22px;margin-top:3px;color:#e4c25f}.n1{left:8%;top:12%}.n2{right:8%;top:12%}.n3{left:7%;bottom:12%}.n4{right:7%;bottom:12%}.n5{left:50%;transform:translateX(-50%);top:6%}.connector{position:absolute;height:1px;background:#45636b66;transform-origin:left center;z-index:1}.c1{left:21%;top:29%;width:31%;transform:rotate(18deg)}.c2{left:50%;top:29%;width:31%;transform:rotate(-18deg)}.c3{left:20%;top:70%;width:32%;transform:rotate(-18deg)}.c4{left:50%;top:70%;width:32%;transform:rotate(18deg)}.c5{left:50%;top:24%;width:1px;height:80px}.campaignTable{position:relative;z-index:2;margin-top:13px}.campaignTable header{display:flex;justify-content:space-between;align-items:end;padding-bottom:8px}.campaignTable h2{font-size:18px;margin:3px 0}.campaignTable header>b{font:800 8px ui-monospace;color:#859a9e}.campaignTable>div{display:grid;gap:5px}.campaignTable article{display:grid;grid-template-columns:34px 1fr auto auto auto;gap:8px;align-items:center;padding:8px 9px;border:1px solid #25434b;border-radius:9px;background:#061519}.campaignTable article>span{width:30px;height:28px;border-radius:7px;display:grid;place-items:center;background:#123039;color:#e0bd5b;font:900 8px ui-monospace}.campaignTable article strong{font-size:9px}.campaignTable article i{font-style:normal;font:750 7px ui-monospace;color:#6fd0a0}.campaignTable article a{font-size:8px;color:#78d0d9}.admIntel section{border:1px solid #294750;border-radius:12px;background:#07181d;padding:12px}.admIntel section>strong{display:block;font-size:26px;margin:5px 0 2px}.admIntel p{font-size:8px;line-height:1.5;color:#768e93;margin:4px 0}.health{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900;color:#82d5a7;margin-top:7px}.health i{width:7px;height:7px;border-radius:50%;background:#65d99f;box-shadow:0 0 13px #65d99f}.admIntel .engine{border-color:#655a37;background:linear-gradient(180deg,#17180f,#07171a)}.engine b{color:#e3c25e}.engine a{font-size:8px;color:#7bd3dd}@media(max-width:1200px){.admBody{grid-template-columns:240px 1fr}.admIntel{grid-column:1/-1;grid-template-columns:repeat(4,1fr)}}@media(max-width:900px){.admTop nav a:nth-child(2){display:none}.admBody{grid-template-columns:1fr;padding:8px}.admNav{grid-template-columns:repeat(2,1fr)}.navTitle{grid-column:1/-1}.systemMap{height:330px}.admIntel{grid-template-columns:repeat(2,1fr)}.campaignTable article{grid-template-columns:32px 1fr auto}.campaignTable article i,.campaignTable article a:first-of-type{display:none}}@media(max-width:580px){.admNav,.admIntel{grid-template-columns:1fr}.systemMap{height:300px}.node{width:92px;height:62px}.n1,.n3{left:3%}.n2,.n4{right:3%}.systemCore{width:135px;height:135px}.admHero{display:block}.runtimeSeal{margin-top:9px;width:max-content}}
`;
