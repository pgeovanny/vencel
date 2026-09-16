import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PatrolAdmin(){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');
  const{data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true)redirect('/dashboard');

  const[{data:runs},{data:items},{count:active},{count:completed}]=await Promise.all([
    sb.from('patrol_runs').select('id,user_id,status,item_count,answered_count,correct_count,xp_earned,started_at,completed_at,summary').order('started_at',{ascending:false}).limit(100),
    sb.from('patrol_items').select('priority_source,correct,answered_at').order('created_at',{ascending:false}).limit(1000),
    sb.from('patrol_runs').select('*',{count:'exact',head:true}).eq('status','active'),
    sb.from('patrol_runs').select('*',{count:'exact',head:true}).eq('status','completed'),
  ]);

  const finished=(runs||[]).filter((r:any)=>r.status==='completed');
  const totalAnswered=finished.reduce((s:number,r:any)=>s+Number(r.answered_count||0),0);
  const totalCorrect=finished.reduce((s:number,r:any)=>s+Number(r.correct_count||0),0);
  const accuracy=totalAnswered?Math.round(totalCorrect/totalAnswered*100):0;
  const avgXp=finished.length?Math.round(finished.reduce((s:number,r:any)=>s+Number(r.xp_earned||0),0)/finished.length):0;
  const sources=['review_due','error','gap','maintenance'];
  const sourceLabels:any={review_due:'Revisão vencida',error:'Erro anterior',gap:'Lacuna do edital',maintenance:'Manutenção'};
  const sourceCounts=new Map(sources.map(s=>[s,(items||[]).filter((x:any)=>x.priority_source===s).length]));
  const totalSources=[...sourceCounts.values()].reduce((a,b)=>a+b,0)||1;

  return <main className="paRoot">
    <header className="paHero"><div><div className="ey">JURISQUEST CONTROL • RETENÇÃO</div><h1>Plantão Adaptativo</h1><p>Uso real, desempenho e composição das ocorrências selecionadas pelo motor.</p></div><div><a className="btn" href="/admin">← Painel ADM</a><a className="btn primary" href="/plantao">Testar como aluno</a></div></header>

    <section className="paMetrics">
      <article><small>TURNOS CONCLUÍDOS</small><strong>{completed||0}</strong><span>{active||0} em andamento</span></article>
      <article><small>PRECISÃO</small><strong>{accuracy}%</strong><span>{totalCorrect}/{totalAnswered} decisões</span></article>
      <article><small>XP MÉDIO</small><strong>{avgXp}</strong><span>por turno concluído</span></article>
      <article><small>AMOSTRA</small><strong>{items?.length||0}</strong><span>itens recentes analisados</span></article>
    </section>

    <section className="paGrid">
      <article className="paPanel"><div className="panelHead"><div><div className="ey">MOTOR ADAPTATIVO</div><h2>Por que as ocorrências entraram</h2></div></div><div className="sourceBars">{sources.map(s=>{const n=sourceCounts.get(s)||0;const pct=Math.round(n/totalSources*100);return <div key={s}><div><strong>{sourceLabels[s]}</strong><span>{n} • {pct}%</span></div><i><b style={{width:`${pct}%`}}/></i></div>})}</div><p className="paHelp">A ordem-alvo é revisão vencida → erro anterior → lacuna → manutenção. A distribuição real muda conforme o histórico dos alunos.</p></article>
      <article className="paPanel"><div className="ey">CRITÉRIO COMERCIAL</div><h2>O que acompanhar</h2><ul className="healthList"><li><b>Retorno</b><span>alunos iniciando novos turnos após concluir campanha.</span></li><li><b>Recuperação</b><span>erros voltando como revisão e depois sendo acertados.</span></li><li><b>Variedade</b><span>evitar sessões dominadas pelo mesmo caso ou decisão.</span></li><li><b>Duração</b><span>sessão curta o suficiente para uso diário.</span></li><li><b>Conversão</b><span>futuro: trial → assinatura por concurso.</span></li></ul></article>
    </section>

    <section className="paPanel recentRuns"><div className="panelHead"><div><div className="ey">TELEMETRIA</div><h2>Últimos turnos</h2></div><span className="adminBadge">ATÉ 100</span></div><div className="runRows">{(runs||[]).slice(0,30).map((r:any)=><div className="runRow" key={r.id}><span className={`status ${r.status}`}>{r.status==='completed'?'CONCLUÍDO':r.status==='active'?'ATIVO':'ABANDONADO'}</span><div><strong>{String(r.id).slice(0,8)}</strong><small>{new Date(r.started_at).toLocaleString('pt-BR')}</small></div><div><small>ACERTOS</small><strong>{r.correct_count}/{r.item_count}</strong></div><div><small>XP</small><strong>+{r.xp_earned||0}</strong></div><div><small>PROGRESSO</small><strong>{r.answered_count}/{r.item_count}</strong></div></div>)}</div></section>
    <style>{CSS}</style>
  </main>;
}

const CSS=`
.paRoot{max-width:1280px;margin:auto;padding:26px 18px 70px;color:#edf4f3}.paHero{display:flex;justify-content:space-between;gap:20px;align-items:end;padding:27px;border:1px solid #31505a;border-radius:21px;background:radial-gradient(circle at 83% 0,#3e351e55,transparent 29%),linear-gradient(135deg,#10262d,#08171b);box-shadow:0 25px 80px #0005}.paHero h1{font-size:34px;margin:7px 0}.paHero p{color:#8da2a7}.paHero>div:last-child{display:flex;gap:8px}.paMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:11px 0}.paMetrics article{padding:16px;border:1px solid #294750;border-radius:14px;background:#091a1f}.paMetrics small,.paMetrics strong,.paMetrics span{display:block}.paMetrics small{font:850 8px ui-monospace;color:#69ced8}.paMetrics strong{font-size:29px;margin:3px 0}.paMetrics span{font-size:9px;color:#758e93}.paGrid{display:grid;grid-template-columns:1.35fr .65fr;gap:10px}.paPanel{border:1px solid #2b4851;border-radius:16px;background:linear-gradient(180deg,#0d2127,#08181d);padding:20px}.paPanel h2{margin:5px 0 14px}.sourceBars{display:grid;gap:13px}.sourceBars>div>div{display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px}.sourceBars span{color:#758e93}.sourceBars i{display:block;height:7px;border-radius:99px;background:#10262d;overflow:hidden}.sourceBars b{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#60d3df,#d9b557)}.paHelp{font-size:9px;color:#748c91;line-height:1.5;margin:16px 0 0}.healthList{display:grid;gap:8px;padding:0;margin:0;list-style:none}.healthList li{padding:10px 11px;border:1px solid #29444c;border-radius:10px;background:#07171b}.healthList b,.healthList span{display:block}.healthList b{font-size:10px;color:#e3bd5d}.healthList span{font-size:9px;color:#789095;margin-top:3px}.recentRuns{margin-top:10px}.runRows{display:grid;gap:6px;margin-top:12px}.runRow{display:grid;grid-template-columns:100px 1.4fr repeat(3,.55fr);gap:10px;align-items:center;padding:10px;border:1px solid #263f47;border-radius:10px;background:#07171b}.runRow>div{display:grid}.runRow small{font:750 7px ui-monospace;color:#708b91}.runRow strong{font-size:10px}.status{font:850 7px ui-monospace;padding:5px 7px;border:1px solid #455c62;border-radius:99px;text-align:center;color:#8ca2a6}.status.completed{border-color:#427157;color:#7fc89d}.status.active{border-color:#887039;color:#e0bd63}.panelHead{display:flex;justify-content:space-between;align-items:center}@media(max-width:850px){.paHero{display:block}.paHero>div:last-child{margin-top:15px}.paMetrics{grid-template-columns:1fr 1fr}.paGrid{grid-template-columns:1fr}.runRow{grid-template-columns:90px 1fr 1fr}.runRow>div:nth-last-child(-n+2){display:none}}@media(max-width:520px){.paRoot{padding:12px 9px 60px}.paMetrics{grid-template-columns:1fr 1fr}.paHero{padding:19px}.paHero h1{font-size:28px}.runRow{grid-template-columns:80px 1fr}.runRow>div:nth-child(n+3){display:none}}
`;
