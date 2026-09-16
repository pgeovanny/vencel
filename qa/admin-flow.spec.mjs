import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:3000';
const SUPA=process.env.QA_SUPABASE_URL;
const KEY=process.env.QA_SUPABASE_KEY;
if(!SUPA||!KEY)throw new Error('QA Supabase environment missing');
const run=String(process.env.GITHUB_RUN_ID||Date.now());
const email=`jq.admin.qa.${run}.${Date.now()}@example.com`;
const password=`${crypto.randomBytes(24).toString('base64url')}Aa1!`;
const report={email,startedAt:new Date().toISOString(),checks:[],screenshots:[]};
const log=(name,ok,detail='')=>{report.checks.push({name,ok,detail});console.log(`${ok?'✓':'✗'} ${name}${detail?` — ${detail}`:''}`)};
const must=(v,name,detail='')=>{log(name,!!v,detail);if(!v)throw new Error(`${name}: ${detail}`)};
async function shot(page,name){const path=`qa-admin-artifacts/${name}.png`;await page.screenshot({path,fullPage:true});report.screenshots.push(path)}
async function body(page){return(await page.locator('body').innerText()).replace(/\s+/g,' ').trim()}
async function rpcAdmin(access){const r=await fetch(`${SUPA}/rest/v1/rpc/is_admin`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:'{}'});if(!r.ok)return false;return (await r.json())===true}

await fs.mkdir('qa-admin-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:960}});
const page=await ctx.newPage();
try{
  await page.goto(`${BASE}/signup`,{waitUntil:'networkidle'});
  const inputs=page.locator('.field input');
  await inputs.nth(0).fill('QA Admin JurisQuest');
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(password);
  await inputs.nth(3).fill(password);
  await page.getByRole('button',{name:/Criar conta/i}).click();
  await page.waitForURL(/dashboard/,{timeout:30000});
  log('Conta administrativa QA criada e autenticada',true,email);

  const auth=await fetch(`${SUPA}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const session=await auth.json();
  must(auth.ok&&!!session.access_token,'Sessão administrativa QA válida');
  const access=session.access_token;

  console.log(`ADMIN_QA_WAITING ${email}`);
  let elevated=false;
  for(let i=0;i<50;i++){
    if(await rpcAdmin(access)){elevated=true;break}
    await new Promise(r=>setTimeout(r,3000));
  }
  must(elevated,'Elevação temporária em admin_users reconhecida');

  const routes=[
    ['/admin',/Controle do produto|CENTRAL ADMINISTRATIVA/i],
    ['/admin/missions',/Missões|MISSÕES|Conteúdo/i],
    ['/admin/visual',/Visual|Cenários|Personagens/i],
    ['/admin/plantao',/Plantão|PLANTÃO|turnos|telemetria/i],
    ['/admin/syllabi',/Edital|EDITAIS|Mapa|Tópicos/i],
    ['/admin/users',/Usuários|USUÁRIOS|Acesso|grants/i],
    ['/admin/commercial',/Comercial|COMERCIAL|Plano|Checkout|trial/i],
  ];
  let n=0;
  for(const [route,marker] of routes){
    await page.goto(`${BASE}${route}`,{waitUntil:'networkidle'});
    const path=new URL(page.url()).pathname;
    const txt=await body(page);
    must(path===route,`ADM não redireciona: ${route}`,path);
    must(!/Internal Server Error|Application error|500\s|Unhandled Runtime Error/i.test(txt),`ADM sem erro fatal: ${route}`);
    must(marker.test(txt),`ADM renderiza conteúdo: ${route}`);
    if(n<3)await shot(page,`0${++n}-${route.slice(1).replaceAll('/','-')}`);
  }

  const profiles=await fetch(`${SUPA}/rest/v1/profiles?select=id&limit=10`,{headers:{apikey:KEY,Authorization:`Bearer ${access}`,Accept:'application/json'}});
  const pdata=profiles.ok?await profiles.json():[];
  must(profiles.ok&&Array.isArray(pdata)&&pdata.length>1,'Administrador enxerga dados globais protegidos',String(pdata.length));

  await page.setViewportSize({width:390,height:844});
  await page.goto(`${BASE}/admin`,{waitUntil:'networkidle'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  must(overflow<=3,'Painel ADM sem overflow horizontal no mobile',`${overflow}px`);
  await shot(page,'09-admin-mobile');

  await ctx.clearCookies();
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.goto(`${BASE}/admin`,{waitUntil:'networkidle'});
  must(new URL(page.url()).pathname==='/', 'ADM bloqueia sessão encerrada',new URL(page.url()).pathname);
  log('Jornada administrativa concluída',true);
}catch(e){log('E2E ADM geral',false,e?.stack||String(e));try{await shot(page,'99-failure')}catch{}process.exitCode=1}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile('qa-admin-artifacts/report.json',JSON.stringify(report,null,2));await fs.writeFile('qa-admin-artifacts/admin-email.txt',email);await browser.close()}
