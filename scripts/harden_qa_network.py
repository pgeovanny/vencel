from pathlib import Path
p=Path('qa/user-flow.spec.mjs')
s=p.read_text()
old="async function rest(path,access){const r=await fetch(`${SUPA}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${access}`,Accept:'application/json'}});if(!r.ok)throw new Error(`REST ${r.status}: ${await r.text()}`);return r.json()}"
new="async function rest(path,access){let last;for(let attempt=0;attempt<4;attempt++){try{const r=await fetch(`${SUPA}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${access}`,Accept:'application/json'}});if(r.ok)return r.json();const body=await r.text();if(r.status<500)throw new Error(`REST ${r.status}: ${body}`);last=new Error(`REST ${r.status}: ${body}`)}catch(e){last=e;if(String(e?.message||e).startsWith('REST 4'))throw e}if(attempt<3)await new Promise(r=>setTimeout(r,500*(attempt+1)))}throw last||new Error('REST indisponível')}"
if old not in s:
    raise RuntimeError('REST helper anchor missing')
p.write_text(s.replace(old,new,1))
