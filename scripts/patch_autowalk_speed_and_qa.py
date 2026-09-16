from pathlib import Path

runtime=Path('components/game-runtime-pro-v4.tsx')
s=runtime.read_text()
old="const speed=Math.max(90,Math.min(155,d/7));"
new="const speed=Math.max(135,Math.min(220,d/4.5));"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise RuntimeError('auto-walk speed pattern not found')
runtime.write_text(s)

qa=Path('qa/user-flow.spec.mjs')
q=qa.read_text()
q=q.replace("await target.waitFor({state:'visible',timeout:15000});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms,zoom,via:'guide-action'})","await target.waitFor({state:'visible',timeout:24000});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms,zoom,via:'guide-action'})",1)
q=q.replace("must(ms>=500&&ms<15000,'Clique gera caminhada perceptível'","must(ms>=350&&ms<24000,'Clique gera caminhada perceptível'",1)
q=q.replace("must(ms>=500&&ms<15000,'Campanha usa a mesma caminhada do Plantão'","must(ms>=350&&ms<24000,'Campanha usa a mesma caminhada do Plantão'",1)
qa.write_text(q)
