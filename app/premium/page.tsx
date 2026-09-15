import { createClient } from '@/lib/supabase/server';

export default async function PremiumPage(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  const {data:config}=await sb.rpc('product_public_config');
  const cfg:any=config||{};
  return <main className="shell">
    <section className="card center" style={{maxWidth:900,background:'radial-gradient(circle at 80% 0,#173d46 0,transparent 38%),#091b21'}}>
      <div className="ey">JURISQUEST PREMIUM</div>
      <h1>{cfg.sales_headline||'Estude o edital como uma campanha.'}</h1>
      <p className="muted">O acesso completo libera a campanha do edital, revisões espaçadas, Arquivo de Casos, exploração de cenários, Mapa do Edital e evolução do seu histórico de decisões.</p>
      {cfg.price_label&&<div style={{fontSize:34,fontWeight:900,color:'#ebca64',margin:'18px 0'}}>{cfg.price_label}</div>}
      <div className="grid" style={{margin:'22px 0',textAlign:'left'}}>
        <article className="card"><span className="tag">CAMPANHA</span><h2>Missões do edital</h2><p className="muted">Casos encadeados com NPCs, evidências e decisões jurídicas ligadas aos tópicos que você precisa dominar.</p></article>
        <article className="card"><span className="tag">MEMÓRIA</span><h2>Revisão que volta na hora certa</h2><p className="muted">Erros e decisões retornam em sessões curtas de recuperação ativa, com feedback e base legal.</p></article>
        <article className="card"><span className="tag">CONTROLE</span><h2>Mapa do Edital</h2><p className="muted">Veja o que já foi coberto, quais missões treinam cada tópico e onde sua campanha ainda está incompleta.</p></article>
        <article className="card"><span className="tag">REVISITA</span><h2>Arquivo de Casos</h2><p className="muted">Volte a cenários concluídos, converse com NPCs e reveja evidências sem perder seu resultado original.</p></article>
      </div>
      <div className="card" style={{textAlign:'left',borderColor:'#78683a'}}><div className="ey">TESTE</div><h2>{cfg.trial_days||7} dias • primeiras {cfg.trial_mission_limit||2} missões</h2><p className="muted">O que você concluir no período de teste fica registrado. As missões-demo já concluídas continuam disponíveis para revisita mesmo depois do fim do trial.</p></div>
      <div className="row" style={{justifyContent:'center',marginTop:18}}>
        {cfg.checkout_url?<a className="btn primary" href={cfg.checkout_url} target="_blank" rel="noopener noreferrer">Liberar campanha completa</a>:user?<a className="btn primary" href="/dashboard">Continuar meu acesso atual</a>:<a className="btn primary" href="/signup">Começar o teste</a>}
        {user?<a className="btn" href="/dashboard">Voltar à campanha</a>:<a className="btn" href="/">Já tenho conta</a>}
      </div>
      {!cfg.checkout_url&&<p className="muted" style={{fontSize:10,marginTop:14}}>O checkout comercial ainda não foi conectado pelo administrador. Seu progresso de teste continua salvo normalmente.</p>}
    </section>
  </main>;
}
