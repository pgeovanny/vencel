import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:3000';
const SUPA=process.env.QA_SUPABASE_URL;
const KEY=process.env.QA_SUPABASE_KEY;
if(!SUPA||!KEY) throw new Error('QA Supabase environment missing');
const token=String(process.env.GITHUB_RUN_ID||Date.now());
const email=`jq.qa.${token}.${Date.now()}@example.com`;
const password=`JqQA-${token.slice(-6)}-Aa91!`;
const report={email,startedAt:new Date().toISOString(),checks:[],screenshots:[],timings:{walks:[]}};
const log=(name,ok,detail='')=>{report.checks.push({name,ok,detail});console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`)};
const must=(v,name,detail='')=>{log(name,!!v,detail);if(!v)throw new Error(`${name}: ${detail}`)};
async function shot(page,name){const p=`qa-artifacts/${name}.png`;await page.screenshot({path:p,fullPage:true});report.screenshots.push(p)}
async function text(page){return(await page.locator('body').innerText()).replace(/\s+/g,' ').trim()}
async function rest(path,access){const r=await fetch(`${SUPA}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${access}`,Accept:'application/json'}});if(!r.ok)throw new Error(`REST ${r.status}: ${await r.text()}`);return r.json()}
function decisionStage(mj,id){const decision=(mj.decisions||[]).find(d=>d.id===id);const stages=[...(mj.stages||[])].sort((a,b)=>(a.order||0)-(b.order||0));const stage=stages.find(s=>s.id===decision?.stage)||stages.find(s=>(s.objectives||[]).some(o=>o.type==='decision'&&o.target===id))||stages[0];return{decision,stage}}
function entity(stage,o){return o.type==='actor'?(stage.actors||[]).find(x=>x.id===o.target):(stage.objects||[]).find(x=>x.id===o.target)}
function point(pos,w,h){const p=Math.max(34,w*.025),t=Math.max(84,h*.09),b=Math.max(86,h*.10);return{x:p+(Number(pos?.x||600)/1200)*(w-p*2),y:t+(Number(pos?.y||380)/760)*(h-t-b)}}
async function waitWorld(page){await page.locator('.modal .sheet').waitFor({state:'hidden',timeout:8000}).catch(()=>{});await page.waitForTimeout(120)}
async function worldClick(page,e,kind){await waitWorld(page);const vp=page.viewportSize(),p=point(e.position,vp.width,vp.height),start=Date.now();await page.mouse.click(p.x,kind==='actor'?p.y-34:p.y);await page.locator('.dialog, .infoCard').first().waitFor({state:'visible',timeout:15000});const ms=Date.now()-start;report.timings.walks.push({kind,name:e.name||e.id,ms});return ms}
async function consume(page){for(let i=0;i<10;i++){if(await page.locator('.dialog').count()){const b=page.locator('.dialog .choices button');if(await b.count()){await b.first().click();await page.waitForTimeout(180);continue}}const n=page.getByRole('button',{name:/Ir para o próximo objetivo|Voltar ao cenário/i});if(await n.count()){await n.first().click();await waitWorld(page);return}if(!(await page.locator('.modal .sheet').count()))return;await page.waitForTimeout(140)}throw new Error('interaction did not finish')}
async function decisionModal(page){await waitWorld(page);const b=page.locator('.guideBar button').filter({hasText:/Interagir/i});if(await b.count())await b.first().click();else await page.keyboard.press('e');await page.getByText('DECISÃO JURÍDICA',{exact:true}).waitFor({timeout:8000})}

await fs.mkdir('qa-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:960}});
const page=await ctx.newPage();
let access='';
try{
  await page.goto(`${BASE}/signup`,{waitUntil:'networkidle'});must((await text(page)).includes('Criar conta'),'Cadastro abre');
  const inputs=page.locator('.field input');await inputs.nth(0).fill('QA JurisQuest');await inputs.nth(1).fill(email);await inputs.nth(2).fill(password);await inputs.nth(3).fill(password);await page.getByRole('button',{name:/Criar conta/i}).click();await page.waitForTimeout(1200);
  if(!page.url().includes('/dashboard')){await page.goto(BASE,{waitUntil:'networkidle'});await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(password);await page.getByRole('button',{name:/Entrar no JurisQuest/i}).click()}
  await page.waitForURL(/dashboard/,{timeout:30000});log('Cadastro e login reais',true);await shot(page,'01-dashboard');
  const auth=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const session=await auth.json();must(auth.ok&&!!session.access_token,'Sessão QA válida',session?.msg||'');access=session.access_token;
  const grants=await rest(`access_grants?select=access_type,status&status=eq.active`,access);must(grants.length>0,'Novo aluno recebe acesso ativo',grants[0]?.access_type||'');

  const dash=await text(page);must(/Plantão/i.test(dash)&&/Casos/i.test(dash)&&/Revisão/i.test(dash),'Dashboard mostra os modos principais');
  await page.goto(`${BASE}/admin`,{waitUntil:'networkidle'});await page.waitForTimeout(400);must(page.url().includes('/dashboard'),'Aluno comum é bloqueado no ADM');

  await page.goto(`${BASE}/profile`,{waitUntil:'networkidle'});must((await text(page)).includes('MEU PERSONAGEM'),'Perfil do personagem abre');await page.locator('input[name=character_name]').fill('QA Operador');const radio=page.locator('input[name=archetype][value=investigator]');if(await radio.count())await radio.check();await page.getByRole('button',{name:/Salvar personagem/i}).click();await page.waitForURL(/saved=1/,{timeout:12000});log('Personagem persiste nome e arquétipo',true);await shot(page,'02-profile');
  await page.goto(`${BASE}/dashboard`,{waitUntil:'networkidle'});must((await text(page)).includes('QA Operador'),'Dashboard reutiliza personagem salvo');

  await page.goto(`${BASE}/plantao`,{waitUntil:'networkidle'});if(!page.url().includes('run=')){const s=page.getByRole('button',{name:/Iniciar.*Plantão|Começar.*Plantão|Iniciar turno/i});if(await s.count())await s.first().click();else await page.locator('form button').first().click();await page.waitForURL(/run=/,{timeout:15000})}
  const runId=new URL(page.url()).searchParams.get('run');must(runId,'Plantão cria um turno');await shot(page,'03-plantao');
  const run=(await rest(`patrol_runs?select=*&id=eq.${runId}`,access))[0];must(run?.status==='active','Turno nasce ativo no servidor');
  const items=await rest(`patrol_items?select=*&run_id=eq.${runId}&order=sequence_no.asc`,access);must(items.length>0,'Plantão possui ocorrências adaptativas',String(items.length));

  for(let turn=0;turn<Math.min(items.length,3);turn++){
    const pending=(await rest(`patrol_items?select=*&run_id=eq.${runId}&answered_at=is.null&order=sequence_no.asc&limit=1`,access))[0];if(!pending)break;
    const mission=(await rest(`missions?select=id,title,mission_json&id=eq.${pending.mission_id}`,access))[0];const {decision,stage}=decisionStage(mission.mission_json,pending.decision_id);must(decision&&stage,'Ocorrência resolve missão/cena',mission.title);
    const start=page.getByRole('button',{name:/Assumir ocorrência/i});if(await start.count()){await start.click();await waitWorld(page)}
    const required=new Set(decision.requires_facts||[]);const objectives=(stage.objectives||[]).filter(o=>{if(!['actor','object'].includes(o.type))return false;const e=entity(stage,o);return required.has(e?.fact?.id)});
    for(const o of objectives){const e=entity(stage,o);const ms=await worldClick(page,e,o.type);must(ms>=700&&ms<15000,'Clique gera caminhada perceptível',`${ms}ms`);await consume(page)}
    await decisionModal(page);const choices=decision.choices||[];let idx=turn===0?choices.findIndex(c=>!c.correct):choices.findIndex(c=>c.correct);if(idx<0)idx=0;await page.locator('.choices button').nth(idx).click();await page.locator('.modal .sheet').filter({hasText:turn===0?'DECISÃO INCORRETA':'DECISÃO CORRETA'}).waitFor({timeout:12000});must(/REGRA|APLICAÇÃO AO CASO|BASE LEGAL|MEMÓRIA DE PROVA/.test(await text(page)),'Feedback jurídico aparece estruturado');const next=page.getByRole('button',{name:/Próxima ocorrência|Ver relatório do Plantão/i});must(await next.count()>0,'Feedback libera continuação');await next.first().click();await page.waitForTimeout(900)
  }
  await shot(page,'04-plantao-feedback');

  const missions=await rest('missions?select=id,title,mission_json,sequence_no&status=eq.published&order=sequence_no.asc',access);must(missions.length>0,'Campanha tem missões publicadas',String(missions.length));
  for(const m of missions){await page.goto(`${BASE}/game/${m.id}`,{waitUntil:'networkidle'});must(!/404:/.test(await text(page)),`Caso abre: ${m.title}`)}
  const m=missions[0];await page.goto(`${BASE}/game/${m.id}`,{waitUntil:'networkidle'});const enter=page.getByRole('button',{name:/Entrar na ocorrência|Começar repetição/i});if(await enter.count()){await enter.first().click();await waitWorld(page)}let tested=false;for(const st of [...(m.mission_json.stages||[])].sort((a,b)=>(a.order||0)-(b.order||0))){for(const o of st.objectives||[]){if(!['actor','object'].includes(o.type))continue;const e=entity(st,o);if(!e)continue;const ms=await worldClick(page,e,o.type);must(ms>=700&&ms<15000,'Campanha usa a mesma caminhada do Plantão',`${ms}ms`);await consume(page);tested=true;break}if(tested)break}must(tested,'Campanha permite clique direto em NPC/evidência');await shot(page,'05-campaign');

  await page.goto(`${BASE}/archive`,{waitUntil:'networkidle'});must(/Arquivo|Casos/i.test(await text(page)),'Arquivo de Casos abre');await shot(page,'06-archive');
  await page.goto(`${BASE}/review`,{waitUntil:'networkidle'});must(/Revisão|memória/i.test(await text(page)),'Central de Revisão abre');await shot(page,'07-review');
  const syllabus=(await rest('exam_syllabi?select=id,title&status=eq.published&limit=1',access))[0];if(syllabus){await page.goto(`${BASE}/syllabus/${syllabus.id}`,{waitUntil:'networkidle'});must(/DOMÍNIO DO EDITAL|Mapa/i.test(await text(page)),'Mapa do Edital abre');await shot(page,'08-syllabus')}

  await page.goto(`${BASE}/dashboard`,{waitUntil:'networkidle'});const out=page.getByRole('button',{name:/Sair/i});if(await out.count())await out.first().click();else await page.locator('form button[title*=Sair]').first().click();await page.waitForURL(u=>new URL(u).pathname==='/',{timeout:10000});log('Logout encerra sessão',true);await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(password);await page.getByRole('button',{name:/Entrar no JurisQuest/i}).click();await page.waitForURL(/dashboard/,{timeout:15000});must((await text(page)).includes('QA Operador'),'Login recupera personagem/progresso');

  await page.setViewportSize({width:390,height:844});for(const route of ['/dashboard','/profile','/plantao','/review']){await page.goto(`${BASE}${route}`,{waitUntil:'networkidle'});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);must(overflow<=3,`Mobile sem overflow: ${route}`,`${overflow}px`)}await shot(page,'09-mobile');
  log('Jornada principal de aluno concluída',true);
}catch(e){log('E2E geral',false,e?.stack||String(e));try{await shot(page,'99-failure')}catch{}process.exitCode=1}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile('qa-artifacts/report.json',JSON.stringify(report,null,2));await fs.writeFile('qa-artifacts/test-user.json',JSON.stringify({email},null,2));await browser.close()}
