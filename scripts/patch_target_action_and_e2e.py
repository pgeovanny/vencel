from pathlib import Path

runtime=Path('components/game-runtime-pro-v4.tsx')
s=runtime.read_text()

anchor="const primaryEnabled=ready&&(exploreMode?!!near:(nearIsTarget||(objective?.type==='decision'&&decisionCanOpen)||objective?.type==='advance'||(!objective&&stage?.final)));"
insert=anchor+"\n  function goToCurrentTarget(){const o=currentObjective(rr.current);if(!o||(o.type!=='actor'&&o.type!=='object'))return;const scene=sceneRef.current;if(!scene)return;const entry=o.type==='actor'?scene.actors?.[o.target]:scene.objects?.[o.target];if(entry?.go)scene.startAuto(o.type,o.target,entry.go)}"
if 'function goToCurrentTarget()' not in s:
    if anchor not in s: raise RuntimeError('primaryEnabled anchor not found')
    s=s.replace(anchor,insert,1)

old="</span></div>{distance&&!exploreMode&&<div className=\"distance\">Distância: {distance} m</div>}{primaryEnabled&&<button onClick={primary}><kbd>E</kbd> Interagir</button>}"
new="</span></div>{!exploreMode&&!nearIsTarget&&(objective?.type==='actor'||objective?.type==='object')&&<button onClick={goToCurrentTarget}><span>Ir até</span></button>}{distance&&!exploreMode&&<div className=\"distance\">Distância: {distance} m</div>}{primaryEnabled&&<button onClick={primary}><kbd>E</kbd> Interagir</button>}"
if '<span>Ir até</span>' not in s:
    if old not in s: raise RuntimeError('guideBar action anchor not found')
    s=s.replace(old,new,1)
runtime.write_text(s)

qa=Path('qa/user-flow.spec.mjs')
q=qa.read_text()
old_fn="async function worldClick(page,e,kind,zoom=1){await waitWorld(page);await page.locator('.guideText b').filter({hasText:new RegExp(String(e.name||'').replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&'),'i')}).waitFor({state:'visible',timeout:8000}).catch(()=>{});const vp=page.viewportSize(),p=point(e.position,vp.width,vp.height,zoom),start=Date.now(),target=page.locator('.dialog, .infoCard').first(),offsets=kind==='actor'?[[0,-28],[0,-8],[-24,-20],[24,-20]]:[[0,0],[-24,0],[24,0],[0,-24],[0,24]];for(const[dx,dy]of offsets){await page.mouse.click(p.x+dx,p.y+dy);try{await target.waitFor({state:'visible',timeout:3200});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms,zoom});return ms}catch{}}throw new Error(`interaction target did not open: ${e.name||e.id}`)}"
new_fn="async function worldClick(page,e,kind,zoom=1){await waitWorld(page);const start=Date.now(),target=page.locator('.dialog, .infoCard').first(),go=page.locator('.guideBar button').filter({hasText:/Ir até/i});if(await go.count()){await go.first().click();await target.waitFor({state:'visible',timeout:15000});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms,zoom,via:'guide-action'});return ms}const vp=page.viewportSize(),p=point(e.position,vp.width,vp.height,zoom),offsets=kind==='actor'?[[0,-28],[0,-8],[-24,-20],[24,-20]]:[[0,0],[-24,0],[24,0],[0,-24],[0,24]];for(const[dx,dy]of offsets){await page.mouse.click(p.x+dx,p.y+dy);try{await target.waitFor({state:'visible',timeout:3200});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms,zoom,via:'canvas'});return ms}catch{}}throw new Error(`interaction target did not open: ${e.name||e.id}`)}"
if "via:'guide-action'" not in q:
    if old_fn not in q: raise RuntimeError('worldClick function not found')
    q=q.replace(old_fn,new_fn,1)
qa.write_text(q)
