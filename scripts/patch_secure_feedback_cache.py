from pathlib import Path

p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()

def once(old,new,label):
    global s
    if old not in s:
        raise RuntimeError(f'missing pattern: {label}')
    s=s.replace(old,new,1)

once("  const [ready,setReady]=useState(false); const [cloud,setCloud]=useState(exploreMode?'Exploração livre':isPatrol?'Plantão pronto':'Sincronizando…'); const [engineError,setEngineError]=useState(''); const [distance,setDistance]=useState<number|null>(null);",
     "  const [ready,setReady]=useState(false); const [cloud,setCloud]=useState(exploreMode?'Exploração livre':isPatrol?'Plantão pronto':'Sincronizando…'); const [engineError,setEngineError]=useState(''); const [distance,setDistance]=useState<number|null>(null); const [feedbackCache,setFeedbackCache]=useState<Record<string,any>>({});",
     'feedback cache state')

old="  function specificDistractor(d:any,index:number){const wrongIndexes=(d?.choices||[]).map((c:any,i:number)=>!c.correct?i:-1).filter((i:number)=>i>=0);const pos=wrongIndexes.indexOf(index);return pos>=0?d?.feedback?.distractors?.[pos]:null}\n\n"
s=s.replace(old,'')

once("        const mergedDecision={...d,feedback:{...(d.feedback||{}),...(pr.feedback||{})}};\n        setOverlay({type:'feedback',d:mergedDecision,choice:c,choiceIndex:i,correct,next,saved:true,patrolResult:pr});",
     "        const mergedFeedback={...(d.feedback||{}),...(pr.feedback||{})};setFeedbackCache(v=>({...v,[d.id]:mergedFeedback}));const mergedDecision={...d,feedback:mergedFeedback};\n        setOverlay({type:'feedback',d:mergedDecision,choice:{...c,feedback:mergedFeedback.choice_feedback||''},choiceIndex:i,correct,next,saved:true,patrolResult:pr});",
     'patrol feedback cache')

once("      const serverDecision={...d,feedback:server.feedback||{}},serverChoice={...c,text:server.selectedText||c.text,feedback:server.feedback?.choice_feedback};",
     "      const resolvedFeedback=server.feedback||{};setFeedbackCache(v=>({...v,[d.id]:resolvedFeedback}));const serverDecision={...d,feedback:resolvedFeedback},serverChoice={...c,text:server.selectedText||c.text,feedback:resolvedFeedback.choice_feedback};",
     'campaign feedback cache')

old="{overlay?.type==='feedback'&&<ModalBox eyebrow={overlay.correct?'DECISÃO CORRETA':'DECISÃO INCORRETA'} title={overlay.d.title} wide><div className={`feedback ${overlay.correct?'ok':'warn'}`}><b>{overlay.correct?'Você reconheceu corretamente o ponto jurídico central.':'A providência escolhida não resolve corretamente esta situação.'}</b><p>{overlay.choice.feedback||specificDistractor(overlay.d,overlay.choiceIndex)||'Use a explicação abaixo para reconstruir a regra antes de seguir.'}</p></div>{!overlay.correct&&specificDistractor(overlay.d,overlay.choiceIndex)&&<div className=\"decisionStatus bad\">POR QUE A ALTERNATIVA FALHA • {specificDistractor(overlay.d,overlay.choiceIndex)}</div>}<div className=\"feedbackGrid\">"
new="{overlay?.type==='feedback'&&<ModalBox eyebrow={overlay.correct?'DECISÃO CORRETA':'DECISÃO INCORRETA'} title={overlay.d.title} wide><div className={`feedback ${overlay.correct?'ok':'warn'}`}><b>{overlay.correct?'Você reconheceu corretamente o ponto jurídico central.':'A providência escolhida não resolve corretamente esta situação.'}</b><p>{overlay.choice.feedback||overlay.d.feedback?.choice_feedback||'Use a explicação abaixo para reconstruir a regra antes de seguir.'}</p></div>{!overlay.correct&&overlay.d.feedback?.trap&&<div className=\"decisionStatus bad\">PONTO DE ATENÇÃO • {overlay.d.feedback.trap}</div>}<div className=\"feedbackGrid\">"
once(old,new,'feedback overlay server-only')

once("{rules.map((d:any)=><Note key={d.id} title={d.title} text={d.feedback?.memory||d.feedback?.rule}/>)}",
     "{rules.map((d:any)=><Note key={d.id} title={d.title} text={feedbackCache[d.id]?.memory||feedbackCache[d.id]?.rule||'Regra recuperada nesta sessão.'}/>)}",
     'notebook rules cache')

once("{errors.length?errors.map((d:any)=><Note key={d.id} title={d.title} text={d.feedback?.trap}/>):<p>Nenhum erro de primeira tentativa.</p>}",
     "{errors.length?errors.map((d:any)=><Note key={d.id} title={d.title} text={feedbackCache[d.id]?.trap||feedbackCache[d.id]?.choice_feedback||'Revise esta decisão na Central de Revisão.'}/>):<p>Nenhum erro de primeira tentativa.</p>}",
     'notebook errors cache')

p.write_text(s)
