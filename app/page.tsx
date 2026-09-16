import { login } from './actions';

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
  const p=await searchParams;
  return <main className="entryRoot">
    <section className="entryWorld" aria-hidden="true">
      <div className="entrySky"/>
      <div className="cityGlow"/>
      <div className="hqBuilding"><div className="hqSign"><small>CENTRO DE OPERAÇÕES</small><b>AURORA</b></div>{Array.from({length:10},(_,i)=><i key={i}/>)}</div>
      <div className="street"><span/><span/><span/><span/></div>
      <div className="scanLine"/>
    </section>

    <header className="entryHeader"><div className="entryBrand">JURIS<span>QUEST</span></div><div className="entryStatus"><i/> TREINO PERSONALIZADO</div></header>

    <section className="entryBrief">
      <div className="entryEy">SIMULAÇÃO PROFISSIONAL PARA CONCURSOS</div>
      <h1>Entre no caso.<br/><span>Aprenda decidindo.</span></h1>
      <p>Seu edital vira ocorrências, investigações e decisões. Cada erro volta no momento certo até deixar de ser ponto fraco.</p>
      <div className="entryModes"><div><b>01</b><span>PLANTÃO</span><small>treino curto e personalizado</small></div><div><b>02</b><span>CASOS</span><small>situações completas</small></div><div><b>03</b><span>REVISÃO</span><small>erros no momento certo</small></div></div>
    </section>

    <section className="accessRail">
      <div className="accessHead"><span>SUA CONTA</span><b>CONTINUE SUA JORNADA</b><p>Retome seu personagem, seus casos e sua memória de estudo.</p></div>
      {p.error&&<div className="accessError">{p.error}</div>}
      <form action={login}>
        <label><span>E-mail</span><input name="email" type="email" required autoComplete="email" placeholder="seu@email.com"/></label>
        <label><span>Senha</span><input name="password" type="password" required autoComplete="current-password" placeholder="••••••••"/></label>
        <button className="accessPrimary"><span>ENTRAR NO JURISQUEST</span><b>→</b></button>
      </form>
      <div className="accessLinks"><a href="/signup">Criar conta</a><a href="/forgot-password">Recuperar senha</a></div>
      <footer><i/> Progresso sincronizado e retomado automaticamente.</footer>
    </section>
    <style>{CSS}</style>
  </main>;
}

const CSS=`
.entryRoot{position:relative;min-height:100vh;overflow:hidden;background:#02070a;color:#edf4f2;font-family:var(--jq-font);display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,460px)}.entryWorld{position:absolute;inset:0;overflow:hidden;pointer-events:none}.entrySky{position:absolute;inset:0;background:radial-gradient(circle at 28% 14%,#1b596849 0,transparent 27%),linear-gradient(180deg,#061922,#061116 48%,#02070a 49%)}.cityGlow{position:absolute;width:520px;height:520px;left:18%;top:5%;border-radius:50%;background:#2da7b71c;filter:blur(70px)}.hqBuilding{position:absolute;left:5%;right:34%;top:14%;height:48%;clip-path:polygon(5% 0,95% 0,100% 100%,0 100%);border:1px solid #2f4a52;background:linear-gradient(180deg,#0b242d,#07161b);display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);gap:7% 5%;padding:16% 10% 8%;opacity:.86}.hqBuilding>i{border:1px solid #4e5550;background:linear-gradient(180deg,#d6b04d15,#ffffff03);box-shadow:inset 0 0 32px #d6b04d08}.hqSign{position:absolute;left:50%;top:8%;transform:translateX(-50%);display:grid;text-align:center;white-space:nowrap}.hqSign small{font:800 8px var(--jq-mono);letter-spacing:.28em;color:#65d8e3}.hqSign b{font:500 clamp(34px,4.5vw,68px) Georgia,serif;letter-spacing:.22em;color:#d7b154;margin-top:5px}.street{position:absolute;left:-4%;right:-4%;top:61%;bottom:-5%;background:linear-gradient(168deg,#111d22,#020609);border-top:1px solid #2c4148;transform:skewY(-2deg)}.street span{position:absolute;bottom:34%;width:14%;height:4px;background:#d9bd5b3b;transform:rotate(-4deg)}.street span:nth-child(1){left:5%}.street span:nth-child(2){left:27%}.street span:nth-child(3){left:49%}.street span:nth-child(4){left:71%}.scanLine{position:absolute;left:0;right:34%;top:-15%;height:18%;background:linear-gradient(transparent,#63d7e40b,transparent);animation:scan 7s linear infinite}@keyframes scan{to{transform:translateY(750%)}}.entryHeader{position:absolute;z-index:5;top:0;left:0;right:0;height:72px;display:flex;align-items:center;padding:0 clamp(22px,4vw,58px);border-bottom:1px solid #1a333b;background:linear-gradient(180deg,#041015db,transparent)}.entryBrand{font-size:19px;font-weight:950;letter-spacing:2.4px}.entryBrand span{color:#e2bc5a}.entryStatus{margin-left:auto;margin-right:min(500px,28vw);display:flex;align-items:center;gap:7px;color:#6e858b;font:800 8px var(--jq-mono);letter-spacing:.12em}.entryStatus i{width:6px;height:6px;border-radius:50%;background:#6fd39d;box-shadow:0 0 13px #6fd39d}.entryBrief{position:relative;z-index:3;align-self:end;padding:0 clamp(30px,6vw,96px) clamp(45px,7vh,82px);max-width:900px}.entryEy{font:900 9px var(--jq-mono);letter-spacing:.17em;color:#67d8e3}.entryBrief h1{font-size:clamp(50px,6.7vw,96px);line-height:.91;letter-spacing:-.062em;margin:16px 0 20px;max-width:800px}.entryBrief h1 span{color:#dfbd60}.entryBrief>p{max-width:670px;color:#91a5a9;font-size:14px;line-height:1.7;margin:0}.entryModes{display:flex;gap:28px;margin-top:29px}.entryModes div{display:grid;grid-template-columns:26px auto;column-gap:9px;align-items:center}.entryModes b{grid-row:1/3;color:#e1bd5c;font:900 18px var(--jq-mono)}.entryModes span{font:900 8px var(--jq-mono);letter-spacing:.12em;color:#c9d4d4}.entryModes small{font-size:8px;color:#667d82}.accessRail{position:relative;z-index:6;grid-column:2;align-self:stretch;display:flex;flex-direction:column;justify-content:center;padding:clamp(30px,4vw,58px);border-left:1px solid #2b4650;background:radial-gradient(circle at 100% 0,#17465142 0,transparent 28%),linear-gradient(180deg,#07171deb,#041015f5);backdrop-filter:blur(22px);box-shadow:-30px 0 90px #0008}.accessHead>span{font:900 8px var(--jq-mono);letter-spacing:.16em;color:#68d6e1}.accessHead>b{display:block;font-size:25px;letter-spacing:-.03em;margin:8px 0 5px}.accessHead>p{margin:0 0 25px;color:#80979c;font-size:11px;line-height:1.55}.accessRail form{display:grid;gap:14px}.accessRail label>span{display:block;margin-bottom:6px;color:#9eb0b3;font-size:9px;font-weight:850}.accessRail input{width:100%;height:50px;padding:0 14px;border:1px solid #35535d;border-radius:11px;background:#031015;color:#fff;outline:none;transition:border-color .18s,box-shadow .18s}.accessRail input:focus{border-color:#69d8e3;box-shadow:0 0 0 3px #69d8e313}.accessPrimary{height:52px;margin-top:3px;border:1px solid #d4aa49;border-radius:11px;background:linear-gradient(180deg,#efcd70,#c89b3d);color:#171207;font-weight:950;cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:0 16px;box-shadow:0 15px 35px #b8892b22;transition:transform .18s,box-shadow .18s}.accessPrimary:hover{transform:translateY(-1px);box-shadow:0 18px 42px #b8892b38}.accessPrimary span{font-size:10px;letter-spacing:.04em}.accessPrimary b{font-size:18px}.accessLinks{display:flex;justify-content:space-between;margin-top:16px}.accessLinks a{font-size:9px;color:#77cbd5}.accessRail footer{margin-top:28px;padding-top:15px;border-top:1px solid #243f47;color:#667d82;font-size:8px}.accessRail footer i{display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:#6fd39d;box-shadow:0 0 13px #6fd39d}.accessError{margin-bottom:13px;padding:10px 11px;border:1px solid #844b47;border-radius:10px;background:#291615;color:#efaaa4;font-size:10px}
@media(max-width:900px){.entryRoot{display:block;padding-top:70px}.entryWorld{opacity:.55}.hqBuilding{left:-30%;right:-12%;top:8%;height:42%}.scanLine{right:0}.entryHeader{height:64px;padding:0 16px}.entryStatus{margin-right:0}.entryBrief{padding:40px 18px 36px;min-height:52vh;display:flex;flex-direction:column;justify-content:end}.entryBrief h1{font-size:54px}.entryBrief>p{font-size:12px}.entryModes{gap:14px;flex-wrap:wrap}.accessRail{border-left:0;border-top:1px solid #294650;padding:26px 18px 34px}.accessHead>b{font-size:23px}}
@media(max-width:520px){.entryBrief h1{font-size:43px}.entryModes{display:grid;grid-template-columns:1fr 1fr}.entryStatus{display:none}}
@media(prefers-reduced-motion:reduce){.scanLine{animation:none}}
`;
