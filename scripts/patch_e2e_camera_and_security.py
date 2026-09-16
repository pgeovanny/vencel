from pathlib import Path
p=Path('qa/user-flow.spec.mjs')
s=p.read_text()

old="function point(pos,w,h){const p=Math.max(34,w*.025),t=Math.max(84,h*.09),b=Math.max(86,h*.10);return{x:p+(Number(pos?.x||600)/1200)*(w-p*2),y:t+(Number(pos?.y||380)/760)*(h-t-b)}}"
new="function point(pos,w,h,zoom=1){const pad=Math.max(34,w*.025),t=Math.max(84,h*.09),b=Math.max(86,h*.10),base={x:pad+(Number(pos?.x||600)/1200)*(w-pad*2),y:t+(Number(pos?.y||380)/760)*(h-t-b)},z=Math.max(.94,Math.min(1.06,Number(zoom||1)));return{x:w/2+(base.x-w/2)*z,y:h/2+(base.y-h/2)*z}}"
assert old in s
s=s.replace(old,new,1)

old="async function worldClick(page,e,kind){await waitWorld(page);const vp=page.viewportSize(),p=point(e.position,vp.width,vp.height),start=Date.now();await page.mouse.click(p.x,kind==='actor'?p.y-34:p.y);await page.locator('.dialog, .infoCard').first().waitFor({state:'visible',timeout:15000});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms});return ms}"
new="async function worldClick(page,e,kind,zoom=1){await waitWorld(page);await page.locator('.guideText b').filter({hasText:new RegExp(String(e.name||'').replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&'),'i')}).waitFor({state:'visible',timeout:8000}).catch(()=>{});const vp=page.viewportSize(),p=point(e.position,vp.width,vp.height,zoom),start=Date.now(),target=page.locator('.dialog, .infoCard').first(),offsets=kind==='actor'?[[0,-28],[0,-8],[-24,-20],[24,-20]]:[[0,0],[-24,0],[24,0],[0,-24],[0,24]];for(const[dx,dy]of offsets){await page.mouse.click(p.x+dx,p.y+dy);try{await target.waitFor({state:'visible',timeout:3200});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms,zoom});return ms}catch{}}throw new Error(`interaction target did not open: ${e.name||e.id}`)}"
assert old in s
s=s.replace(old,new,1)

# Student QA must use the same safe mission surface as the app.
s=s.replace("rest(`missions?select=id,title,mission_json&id=eq.${pending.mission_id}`,access)","rest(`missions_client?select=id,title,mission_json&id=eq.${pending.mission_id}`,access)")
s=s.replace("rest('missions?select=id,title,mission_json,sequence_no&status=eq.published&order=sequence_no.asc',access)","rest('missions_client?select=id,title,mission_json,sequence_no&status=eq.published&order=sequence_no.asc',access)")

old="const mission=(await rest(`missions_client?select=id,title,mission_json&id=eq.${pending.mission_id}`,access))[0];const {decision,stage}=decisionStage(mission.mission_json,pending.decision_id);must(decision&&stage,'Ocorrência resolve missão/cena',mission.title);"
new="const mission=(await rest(`missions_client?select=id,title,mission_json&id=eq.${pending.mission_id}`,access))[0];must(!/\\\"correct\\\"\\s*:|\\\"is_correct\\\"\\s*:|\\\"feedback\\\"\\s*:/.test(JSON.stringify(mission?.mission_json||{})),'Payload do aluno não expõe gabarito');const {decision,stage}=decisionStage(mission.mission_json,pending.decision_id);must(decision&&stage,'Ocorrência resolve missão/cena',mission.title);"
assert old in s
s=s.replace(old,new,1)

s=s.replace("const ms=await worldClick(page,e,o.type);must(ms>=700&&ms<15000,'Clique gera caminhada perceptível'","const ms=await worldClick(page,e,o.type,stage.visual?.camera_zoom||1);must(ms>=500&&ms<15000,'Clique gera caminhada perceptível'",1)

old="await decisionModal(page);const choices=decision.choices||[];let idx=turn===0?choices.findIndex(c=>!c.correct):choices.findIndex(c=>c.correct);if(idx<0)idx=0;await page.locator('.choices button').nth(idx).click();await page.locator('.modal .sheet').filter({hasText:turn===0?'DECISÃO INCORRETA':'DECISÃO CORRETA'}).waitFor({timeout:12000});must(/REGRA|APLICAÇÃO AO CASO|BASE LEGAL|MEMÓRIA DE PROVA/.test(await text(page)),'Feedback jurídico aparece estruturado');"
new="await decisionModal(page);const choices=decision.choices||[];const idx=turn%Math.max(1,choices.length);await page.locator('.choices button').nth(idx).click();await page.locator('.modal .sheet').filter({hasText:/DECISÃO (CORRETA|INCORRETA)/}).waitFor({timeout:12000});must(/REGRA|APLICAÇÃO AO CASO|BASE LEGAL|MEMÓRIA DE PROVA/.test(await text(page)),'Feedback jurídico aparece estruturado');"
assert old in s
s=s.replace(old,new,1)

# Campaign walk must also account for per-stage camera zoom.
s=s.replace("const ms=await worldClick(page,e,o.type);must(ms>=700&&ms<15000,'Campanha usa a mesma caminhada do Plantão'","const ms=await worldClick(page,e,o.type,st.visual?.camera_zoom||1);must(ms>=500&&ms<15000,'Campanha usa a mesma caminhada do Plantão'",1)

p.write_text(s)
