'use client';

import { startPlantao } from '@/app/plantao/actions';
import { ProductHeader, ProductMobileNav } from '@/components/product-navigation';

type RunSummary={id:string;item_count:number;answered_count:number;correct_count:number;xp_earned:number;summary:any;started_at:string;completed_at?:string|null};
type ReportItem={id:string;sequence_no:number;correct:boolean|null;priority_source:string;missionTitle:string;decisionTitle:string};
type Props={
  view:'landing'|'active'|'complete';
  run?:RunSummary;
  reportItems?:ReportItem[];
  dueCount?:number;
  xp?:number;
  streak?:number;
  recentRuns?:RunSummary[];
  error?:string;
};

const PRIORITY:Record<string,string>={review_due:'REVISÃO VENCIDA',error:'PONTO FRACO',gap:'LACUNA DO EDITAL',maintenance:'MANUTENÇÃO'};

export default function PatrolModeV4(props:Props){
  if(props.view==='complete'&&props.run)return <Complete run={props.run} items={props.reportItems||[]}/>;
  return <Landing {...props}/>;
}

function Landing({dueCount=0,xp=0,streak=0,recentRuns=[],error}:Props){
  return <main className="dispatchRoot">
    <ProductHeader active="plantao"/>
    <section className="dispatchStage">
      <div className="dispatchGrid" aria-hidden="true"/>
      <div className="dispatchSweep" aria-hidden="true"/>

      <section className="dispatchMission">
        <div className="dispatchSignal"><i/> CENTRAL ONLINE <span>•</span> FILA ADAPTATIVA PRONTA</div>
        <small className="dispatchEy">MODO RECORRENTE • SESSÃO DE 3–8 MIN</small>
        <h1>Assuma o<br/><span>Plantão.</span></h1>
        <p>O próximo turno é montado pelo seu histórico real. Revisões vencidas entram primeiro; depois erros, lacunas do edital e manutenção.</p>
        {error&&<div className="dispatchError">{error}</div>}
        <form action={startPlantao} className="dispatchAction">
          <input type="hidden" name="size" value="5"/>
          <button type="submit"><b>ASSUMIR TURNO</b><span>5 ocorrências</span><i>→</i></button>
        </form>
        <div className="dispatchProtocol"><span><b>01</b> OBSERVE</span><i/><span><b>02</b> INVESTIGUE</span><i/><span><b>03</b> DECIDA</span><i/><span><b>04</b> RECUPERE</span></div>
      </section>

      <aside className="adaptiveRadar">
        <header><div><small>PRIORIDADE DO MOTOR</small><strong>Fila do próximo turno</strong></div><span className="radarLive"><i/> AO VIVO</span></header>
        <div className="radarCore">
          <div className="radarRings"><i/><i/><i/><i/></div>
          <div className="radarSweepLine"/>
          <div className={`radarNode due ${dueCount?'hot':''}`}><b>{dueCount}</b><span>REVISÃO</span></div>
          <div className="radarNode error"><b>02</b><span>ERROS</span></div>
          <div className="radarNode gap"><b>03</b><span>LACUNAS</span></div>
          <div className="radarNode keep"><b>04</b><span>MANUT.</span></div>
          <div className="radarCenter"><b>JQ</b><small>ADAPT</small></div>
        </div>
        <div className="radarLegend"><div><span>XP</span><b>{xp}</b></div><div><span>SEQUÊNCIA</span><b>{streak}</b></div><div className={dueCount?'warn':''}><span>VENCIDAS</span><b>{dueCount}</b></div></div>
      </aside>
    </section>

    <section className="shiftHistory">
      <header><div><small>HISTÓRICO OPERACIONAL</small><h2>Últimos turnos</h2></div><p>Cada erro alimenta a recuperação ativa. O próximo Plantão muda com você.</p></header>
      {recentRuns.length?<div className="shiftRows">{recentRuns.slice(0,3).map((r,i)=>{const acc=r.item_count?Math.round(r.correct_count/r.item_count*100):0;return <article key={r.id}><span className="shiftNo">{String(i+1).padStart(2,'0')}</span><div><small>{new Date(r.started_at).toLocaleDateString('pt-BR')}</small><b>{r.correct_count}/{r.item_count} decisões corretas</b></div><div className="shiftBar"><i style={{width:`${acc}%`}}/></div><strong>{acc}%</strong><em>+{r.xp_earned} XP</em></article>})}</div>:<div className="noShift">Seu primeiro relatório de turno aparecerá aqui.</div>}
    </section>
    <ProductMobileNav active="plantao"/>
    <style jsx global>{CSS}</style>
  </main>;
}

function Complete({run,items}:{run:RunSummary;items:ReportItem[]}){
  const accuracy=run.item_count?Math.round(run.correct_count/run.item_count*100):0;
  return <main className="dispatchRoot reportRoot">
    <ProductHeader active="plantao"/>
    <section className="afterAction">
      <header className="reportHero"><div><small>AFTER ACTION REPORT • TURNO ENCERRADO</small><h1>{accuracy>=80?'Operação concluída.':'Turno registrado.'}</h1><p>O histórico foi atualizado. Decisões incorretas já entraram no circuito de recuperação e podem retornar com prioridade.</p></div><div className="accuracySeal" style={{'--angle':`${accuracy*3.6}deg`} as React.CSSProperties}><div><strong>{accuracy}%</strong><span>PRECISÃO</span></div></div></header>

      <section className="reportMetrics"><article><small>OCORRÊNCIAS</small><b>{run.item_count}</b></article><article><small>ACERTOS</small><b>{run.correct_count}</b></article><article><small>RECUPERAR</small><b>{Math.max(0,run.item_count-run.correct_count)}</b></article><article className="xp"><small>XP DO TURNO</small><b>+{run.xp_earned}</b></article></section>

      <section className="reportTimeline"><header><small>REGISTRO DAS OCORRÊNCIAS</small><span>resultado • origem adaptativa • decisão</span></header>{items.map(i=><article key={i.id} className={i.correct?'ok':'bad'}><span className="eventNo">{String(i.sequence_no).padStart(2,'0')}</span><i/><div><small>{PRIORITY[i.priority_source]||'PLANTÃO'}</small><b>{i.missionTitle}</b><p>{i.decisionTitle}</p></div><strong>{i.correct?'CONSOLIDADA':'RECUPERAR'}</strong></article>)}</section>

      <div className="reportActions"><form action={startPlantao}><input type="hidden" name="size" value="5"/><button>ASSUMIR NOVO TURNO <b>→</b></button></form><a href="/review">Abrir recuperação</a><a href="/dashboard">Voltar à Central</a></div>
    </section>
    <ProductMobileNav active="plantao"/>
    <style jsx global>{CSS}</style>
  </main>;
}

const CSS=`
.dispatchRoot{min-height:100vh;background:#03090c;color:#edf4f3;font-family:var(--jq-font);overflow-x:hidden}.dispatchStage{position:relative;min-height:620px;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(420px,.92fr);gap:clamp(30px,5vw,90px);align-items:center;padding:clamp(38px,7vh,78px) clamp(24px,7vw,110px);overflow:hidden;background:radial-gradient(circle at 78% 43%,#16455052 0,transparent 28%),linear-gradient(180deg,#07171d,#03090c)}.dispatchGrid{position:absolute;inset:0;background-image:linear-gradient(#1a3a4224 1px,transparent 1px),linear-gradient(90deg,#1a3a4224 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(180deg,#000,transparent 82%)}.dispatchSweep{position:absolute;width:55vw;height:55vw;right:-13vw;top:-12vw;border-radius:50%;border:1px solid #65d4df12;box-shadow:0 0 0 8vw #65d4df08,0 0 0 17vw #65d4df05}.dispatchMission,.adaptiveRadar{position:relative;z-index:2}.dispatchSignal{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid #31555e;border-radius:999px;background:#06161b;color:#7f989d;font:850 7px var(--jq-mono);letter-spacing:.09em}.dispatchSignal i,.radarLive i{width:6px;height:6px;border-radius:50%;background:#6bd69e;box-shadow:0 0 13px #6bd69e}.dispatchSignal span{color:#3f5b62}.dispatchEy{display:block;margin-top:26px;color:#6ed4de;font:900 8px var(--jq-mono);letter-spacing:.14em}.dispatchMission h1{font-size:clamp(60px,7vw,108px);line-height:.83;letter-spacing:-.065em;margin:13px 0 22px}.dispatchMission h1 span{color:#e1bd5d}.dispatchMission>p{max-width:690px;margin:0;color:#8ea3a7;font-size:13px;line-height:1.72}.dispatchAction{margin-top:28px}.dispatchAction button{width:min(420px,100%);height:68px;border:1px solid #d2aa4c;border-radius:13px;background:linear-gradient(180deg,#edca69,#bd9138);color:#171208;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:14px;padding:0 17px;cursor:pointer;box-shadow:0 22px 55px #a77a2725;transition:.18s}.dispatchAction button:hover{transform:translateY(-2px);box-shadow:0 26px 70px #a77a2738}.dispatchAction b{font-size:11px;letter-spacing:.04em}.dispatchAction span{font-size:8px;color:#5e471e}.dispatchAction i{font-style:normal;font-size:23px}.dispatchProtocol{display:flex;align-items:center;gap:9px;margin-top:25px;color:#6e858a;font:800 7px var(--jq-mono)}.dispatchProtocol span{white-space:nowrap}.dispatchProtocol b{color:#dabb61;margin-right:3px}.dispatchProtocol>i{width:22px;height:1px;background:#345059}.dispatchError{margin-top:15px;padding:10px 12px;border:1px solid #7e4945;border-radius:9px;background:#251514;color:#e9aaa4;font-size:10px}
.adaptiveRadar{border:1px solid #2e4e57;border-radius:24px;background:#061419d9;box-shadow:0 35px 110px #0008;overflow:hidden}.adaptiveRadar>header{height:78px;padding:0 19px;display:flex;align-items:center;border-bottom:1px solid #223f47}.adaptiveRadar header div{display:grid}.adaptiveRadar header small{color:#67d2dc;font:850 7px var(--jq-mono);letter-spacing:.12em}.adaptiveRadar header strong{font-size:17px;margin-top:4px}.radarLive{margin-left:auto;display:flex;align-items:center;gap:6px;font:850 7px var(--jq-mono);color:#78c89b}.radarCore{height:390px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 50%,#123840 0,transparent 9%,transparent 19%,#173f4818 20%,transparent 21%,transparent 36%,#173f4818 37%,transparent 38%)}.radarRings i{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #4aaaba1d;border-radius:50%}.radarRings i:nth-child(1){width:110px;height:110px}.radarRings i:nth-child(2){width:210px;height:210px}.radarRings i:nth-child(3){width:310px;height:310px}.radarRings i:nth-child(4){width:410px;height:410px}.radarSweepLine{position:absolute;left:50%;top:50%;width:48%;height:1px;transform-origin:left;background:linear-gradient(90deg,#63dbe487,transparent);animation:radarSpin 5s linear infinite}@keyframes radarSpin{to{transform:rotate(360deg)}}.radarCenter{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;display:grid;place-items:center;align-content:center;border:1px solid #d6b252;background:#0a2025;box-shadow:0 0 35px #d6b25220}.radarCenter b{color:#e5c363;font-size:20px}.radarCenter small{font:800 6px var(--jq-mono);color:#75d2dc}.radarNode{position:absolute;width:72px;height:55px;border:1px solid #34545d;border-radius:10px;background:#07191e;display:grid;place-items:center;align-content:center;box-shadow:0 10px 30px #0007}.radarNode b{font-size:14px;color:#a5b5b7}.radarNode span{font:800 6px var(--jq-mono);color:#6d858a}.radarNode.hot{border-color:#d0aa4b;box-shadow:0 0 28px #d0aa4b22}.radarNode.hot b{color:#e6c563}.radarNode.due{left:16%;top:19%}.radarNode.error{right:14%;top:27%}.radarNode.gap{left:22%;bottom:16%}.radarNode.keep{right:20%;bottom:14%}.radarLegend{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #223f47}.radarLegend div{padding:13px 15px;border-right:1px solid #223f47}.radarLegend div:last-child{border-right:0}.radarLegend span,.radarLegend b{display:block}.radarLegend span{font:800 7px var(--jq-mono);color:#6d858a}.radarLegend b{font-size:19px;margin-top:3px}.radarLegend .warn b{color:#e3bd5d}.shiftHistory{max-width:1500px;margin:0 auto;padding:28px 28px 80px}.shiftHistory>header{display:flex;justify-content:space-between;gap:20px;align-items:end;border-bottom:1px solid #203b43;padding-bottom:13px}.shiftHistory header small,.reportHero small,.reportTimeline header small{font:900 8px var(--jq-mono);letter-spacing:.13em;color:#68d3de}.shiftHistory h2{font-size:23px;margin:4px 0}.shiftHistory header p{max-width:480px;color:#6f878c;font-size:9px}.shiftRows{display:grid;margin-top:9px}.shiftRows article{display:grid;grid-template-columns:36px minmax(180px,1fr) minmax(120px,.6fr) 55px 70px;align-items:center;gap:12px;padding:10px 7px;border-bottom:1px solid #173038}.shiftNo{font:900 8px var(--jq-mono);color:#dabb60}.shiftRows article div:nth-child(2){display:grid}.shiftRows small{font-size:7px;color:#6d8287}.shiftRows b{font-size:9px;margin-top:2px}.shiftBar{height:4px;border-radius:99px;background:#0b2228;overflow:hidden}.shiftBar i{display:block;height:100%;background:linear-gradient(90deg,#65d6df,#dec05e)}.shiftRows strong{font-size:11px}.shiftRows em{font-style:normal;color:#79c99e;font:850 8px var(--jq-mono)}.noShift{margin-top:10px;padding:18px;border:1px dashed #29464e;border-radius:11px;color:#71878c;font-size:9px}
.afterAction{max-width:1250px;margin:auto;padding:54px 24px 90px}.reportHero{display:grid;grid-template-columns:1fr 190px;gap:45px;align-items:center;padding-bottom:27px;border-bottom:1px solid #24424a}.reportHero h1{font-size:clamp(42px,5vw,72px);letter-spacing:-.055em;margin:7px 0 10px}.reportHero p{max-width:760px;color:#879da1;line-height:1.65}.accuracySeal{width:176px;height:176px;border-radius:50%;padding:10px;background:conic-gradient(#e0ba56 var(--angle),#10272e 0);box-shadow:0 0 60px #e0ba5613}.accuracySeal>div{width:100%;height:100%;border-radius:50%;background:#071419;display:grid;place-items:center;align-content:center;border:1px solid #2e4d55}.accuracySeal strong{font-size:38px}.accuracySeal span{font:850 7px var(--jq-mono);color:#78d2dc}.reportMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:13px 0}.reportMetrics article{padding:15px;border:1px solid #294850;border-radius:12px;background:#07171c}.reportMetrics small,.reportMetrics b{display:block}.reportMetrics small{font:850 7px var(--jq-mono);color:#6fd0da}.reportMetrics b{font-size:26px;margin-top:3px}.reportMetrics .xp{border-color:#665a34;background:#17180f}.reportMetrics .xp b{color:#e2bf5e}.reportTimeline{margin-top:20px}.reportTimeline>header{display:flex;justify-content:space-between;padding-bottom:9px}.reportTimeline header span{font-size:8px;color:#6d8388}.reportTimeline article{display:grid;grid-template-columns:38px 10px 1fr auto;gap:12px;align-items:center;padding:12px 8px;border-top:1px solid #203b43}.eventNo{font:900 9px var(--jq-mono);color:#9eb0b3}.reportTimeline article>i{width:8px;height:8px;border-radius:50%;background:#65937d;box-shadow:0 0 14px #6ec698}.reportTimeline article.bad>i{background:#c66f67;box-shadow:0 0 14px #c66f67}.reportTimeline article div{display:grid}.reportTimeline article small{font:800 7px var(--jq-mono);color:#68d0da}.reportTimeline article b{font-size:10px;margin-top:2px}.reportTimeline article p{margin:2px 0 0;color:#71878c;font-size:8px}.reportTimeline article>strong{font:850 7px var(--jq-mono);color:#78c59d}.reportTimeline article.bad>strong{color:#e08a80}.reportActions{display:flex;gap:8px;align-items:center;margin-top:24px;padding-top:18px;border-top:1px solid #213d45}.reportActions form{margin:0}.reportActions button,.reportActions a{height:42px;display:inline-flex;align-items:center;gap:12px;padding:0 14px;border:1px solid #35545d;border-radius:9px;background:#07191e;color:#9eb1b4;font-size:9px;font-weight:850;cursor:pointer}.reportActions button{border-color:#d2aa4d;background:linear-gradient(#e5c363,#bd9138);color:#171208}.reportActions button b{font-size:17px}
@media(max-width:980px){.dispatchStage{grid-template-columns:1fr;padding:36px 20px}.adaptiveRadar{max-width:680px;width:100%}.dispatchMission h1{font-size:70px}.shiftHistory{padding:20px 14px 80px}.reportHero{grid-template-columns:1fr}.accuracySeal{width:145px;height:145px}.reportMetrics{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.dispatchStage{padding:28px 14px 100px}.dispatchMission h1{font-size:54px}.dispatchMission>p{font-size:11px}.dispatchProtocol{display:grid;grid-template-columns:1fr 1fr}.dispatchProtocol>i{display:none}.radarCore{height:310px}.shiftRows article{grid-template-columns:30px 1fr auto}.shiftBar,.shiftRows article>em{display:none}.afterAction{padding:30px 13px 90px}.reportMetrics{grid-template-columns:repeat(2,1fr)}.reportTimeline article{grid-template-columns:32px 8px 1fr}.reportTimeline article>strong{grid-column:3}.reportActions{display:grid}.reportActions button,.reportActions a{width:100%;justify-content:center}}
@media(prefers-reduced-motion:reduce){.radarSweepLine{animation:none}.dispatchAction button{transition:none}}
`;
