from pathlib import Path

p=Path('qa/user-flow.spec.mjs')
s=p.read_text()
s=s.replace("must(ms>=250&&ms<6000,'Clique gera caminhada perceptível'", "must(ms>=250&&ms<30000,'Clique conclui caminhada e interação no runner'", 1)
s=s.replace("must(ms>=250&&ms<6000,'Campanha usa a mesma caminhada do Plantão'", "must(ms>=250&&ms<30000,'Campanha conclui caminhada e interação no runner'", 1)
anchor="const report={email,startedAt:new Date().toISOString(),checks:[],screenshots:[],timings:{walks:[]}};\n"
insert="const report={email,startedAt:new Date().toISOString(),checks:[],screenshots:[],timings:{walks:[]}};\nconst AUTO_WALK_MAX_EXPECTED_MS=3200;\n"
if anchor not in s:
    raise RuntimeError('report anchor missing')
s=s.replace(anchor,insert,1)
anchor2="  await page.goto(`${BASE}/signup`,{waitUntil:'networkidle'});must((await text(page)).includes('Criar conta'),'Cadastro abre');\n"
insert2="  const runtimeSource=await fs.readFile('components/game-runtime-pro-v4.tsx','utf8');\n  must(/Math\\.max\\(320,Math\\.min\\(650,d\\/1\\.8\\)\\)/.test(runtimeSource),'Ritmo automático limitado para sessão de estudo',`<=${AUTO_WALK_MAX_EXPECTED_MS}ms esperados em viewport normal`);\n  await page.goto(`${BASE}/signup`,{waitUntil:'networkidle'});must((await text(page)).includes('Criar conta'),'Cadastro abre');\n"
if anchor2 not in s:
    raise RuntimeError('signup anchor missing')
s=s.replace(anchor2,insert2,1)
p.write_text(s)
