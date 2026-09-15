'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveMissionAdmin } from '@/app/admin/missions/actions';

type Props={missions:any[]};

export default function MissionEditor({missions}:Props){
  const [selected,setSelected]=useState(missions[0]?.id||'');
  const row=useMemo(()=>missions.find(m=>m.id===selected)||missions[0], [selected,missions]);
  const [draft,setDraft]=useState(()=>toDraft(row));
  const [pending,startTransition]=useTransition();
  const [message,setMessage]=useState('');
  const [issues,setIssues]=useState<string[]>([]);

  function toDraft(m:any){return {id:m?.id||'',title:m?.title||'',summary:m?.summary||'',status:m?.status||'draft',difficulty:Number(m?.difficulty||2),estimated_minutes:Number(m?.estimated_minutes||12),sequence_no:Number(m?.sequence_no||1),mission_json:JSON.stringify(m?.mission_json||{},null,2)}}
  function changeMission(id:string){const m=missions.find(x=>x.id===id);setSelected(id);setDraft(toDraft(m));setMessage('');setIssues([])}
  function patch(k:string,v:any){setDraft(d=>({...d,[k]:v}))}
  function save(){startTransition(async()=>{setMessage('');setIssues([]);const r=await saveMissionAdmin(draft);if(r.ok){setMessage('Missão validada e salva.');}else{setMessage(r.error||'Falha ao salvar.');setIssues((r as any).issues||[])}})}

  return <div className="meWrap">
    <section className="meHero"><div><span className="meKicker">MISSION CONTROL</span><h1>Editor de Missões</h1><p>Edite conteúdo, estrutura e publicação com validação antes de gravar.</p></div><div className="meActions"><a className="btn" href="/admin">Voltar ao ADM</a>{selected&&<a className="btn primary" href={`/game/${selected}`}>Pré-visualizar</a>}</div></section>
    <section className="meGrid">
      <aside className="meSidebar"><label>Missão<select value={selected} onChange={e=>changeMission(e.target.value)}>{missions.map(m=><option key={m.id} value={m.id}>{String(m.sequence_no).padStart(2,'0')} • {m.title}</option>)}</select></label><div className="meStatus"><span>ID</span><code>{selected}</code></div><div className="meStatus"><span>Atualizado</span><b>{row?.updated_at?new Date(row.updated_at).toLocaleString('pt-BR'):'—'}</b></div></aside>
      <main className="mePanel">
        <div className="meTwo"><label>Título<input value={draft.title} onChange={e=>patch('title',e.target.value)}/></label><label>Status<select value={draft.status} onChange={e=>patch('status',e.target.value)}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></label></div>
        <label>Resumo<textarea rows={3} value={draft.summary} onChange={e=>patch('summary',e.target.value)}/></label>
        <div className="meThree"><label>Dificuldade<input type="number" min={1} max={5} value={draft.difficulty} onChange={e=>patch('difficulty',Number(e.target.value))}/></label><label>Tempo estimado<input type="number" min={3} max={120} value={draft.estimated_minutes} onChange={e=>patch('estimated_minutes',Number(e.target.value))}/></label><label>Sequência<input type="number" min={1} value={draft.sequence_no} onChange={e=>patch('sequence_no',Number(e.target.value))}/></label></div>
        <div className="meJsonHead"><div><span className="meKicker">RUNTIME CONTRACT</span><h2>mission_json</h2></div><span className="meBadge">VALIDAÇÃO OBRIGATÓRIA</span></div>
        <textarea className="meJson" spellCheck={false} value={draft.mission_json} onChange={e=>patch('mission_json',e.target.value)}/>
        {message&&<div className={`meMessage ${issues.length?'bad':'ok'}`}><b>{message}</b>{issues.length>0&&<ul>{issues.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>}
        <div className="meFooter"><button className="btn primary" disabled={pending||!selected} onClick={save}>{pending?'Validando e salvando…':'Validar e salvar missão'}</button><span>Publicação é bloqueada se o contrato estiver inconsistente.</span></div>
      </main>
    </section>
    <style jsx global>{`.meWrap{max-width:1400px;margin:auto;padding:24px 18px 70px}.meHero{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;padding:24px;border:1px solid #2e4c55;border-radius:20px;background:linear-gradient(135deg,#10252b,#08171b);box-shadow:0 24px 70px #0005}.meHero h1{margin:6px 0;font-size:32px}.meHero p{margin:0;color:#8fa4a8}.meKicker{font:900 9px ui-monospace;letter-spacing:.14em;color:#6fd3dc}.meActions{display:flex;gap:8px}.meGrid{display:grid;grid-template-columns:280px 1fr;gap:14px;margin-top:14px}.meSidebar,.mePanel{border:1px solid #2e4b54;border-radius:16px;background:#0a1c21;padding:16px}.meSidebar label,.mePanel label{display:block;color:#9ab0b4;font-size:10px;margin-bottom:12px}.meSidebar select,.mePanel input,.mePanel select,.mePanel textarea{width:100%;box-sizing:border-box;margin-top:6px;background:#061419;border:1px solid #35545d;border-radius:9px;color:#edf3f1;padding:10px}.meStatus{padding:11px 0;border-top:1px solid #233b42}.meStatus span,.meStatus b,.meStatus code{display:block}.meStatus span{font:800 8px ui-monospace;color:#6fcbd4}.meStatus b,.meStatus code{margin-top:4px;font-size:10px;word-break:break-all}.meTwo,.meThree{display:grid;gap:10px}.meTwo{grid-template-columns:1.5fr .5fr}.meThree{grid-template-columns:repeat(3,1fr)}.meJsonHead{display:flex;justify-content:space-between;align-items:center;margin:8px 0}.meJsonHead h2{margin:4px 0}.meBadge{font:800 8px ui-monospace;border:1px solid #49636b;border-radius:999px;padding:5px 8px;color:#b7c7ca}.meJson{min-height:560px;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.meMessage{margin:12px 0;padding:12px;border-radius:10px}.meMessage.ok{background:#102a20;border:1px solid #4e8464}.meMessage.bad{background:#2a1818;border:1px solid #8b5550}.meMessage ul{margin:8px 0 0;padding-left:20px}.meFooter{display:flex;align-items:center;gap:12px}.meFooter span{font-size:10px;color:#7f969b}@media(max-width:900px){.meGrid{grid-template-columns:1fr}.meHero{display:block}.meActions{margin-top:14px}.meTwo,.meThree{grid-template-columns:1fr}.meJson{min-height:420px}}`}</style>
  </div>
}
