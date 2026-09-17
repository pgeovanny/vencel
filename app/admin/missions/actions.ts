'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const inputSchema=z.object({
  id:z.string().uuid(),
  syllabus_id:z.string().uuid(),
  topic_ids:z.array(z.string().uuid()).max(100).default([]),
  primary_topic_id:z.string().uuid().nullable().optional(),
  title:z.string().min(2).max(140),
  summary:z.string().max(1000),
  status:z.enum(['draft','published','archived']),
  difficulty:z.number().int().min(1).max(5),
  estimated_minutes:z.number().int().min(3).max(120),
  sequence_no:z.number().int().min(1).max(9999),
  mission_json:z.string().min(2).max(250000),
});

function lintMission(mj:any,publishing=false){
  const errors:string[]=[];
  if(mj?.schema!=='jurisquest.mission.v2')errors.push('schema deve ser jurisquest.mission.v2.');
  if(!Array.isArray(mj?.stages)||mj.stages.length===0)errors.push('A missão precisa ter pelo menos uma etapa.');
  if(!Array.isArray(mj?.decisions)||mj.decisions.length===0)errors.push('decisions precisa conter pelo menos uma decisão.');
  if(publishing&&!mj?.briefing?.learning_goal)errors.push('Missão publicada precisa declarar briefing.learning_goal.');
  const stageIds=new Set<string>(),actorIds=new Set<string>(),objectIds=new Set<string>(),factIds=new Set<string>(),decisionIds=new Set<string>();
  for(const s of mj?.stages||[]){
    if(!s?.id)errors.push('Toda etapa precisa de id.');else if(stageIds.has(s.id))errors.push(`Etapa duplicada: ${s.id}.`);else stageIds.add(s.id);
    if(!s?.title)errors.push(`Etapa ${s?.id||'?'} sem título.`);
    if(!Array.isArray(s?.objectives)||s.objectives.length===0)errors.push(`Etapa ${s?.id||'?'} precisa ter objetivos.`);
    for(const a of s?.actors||[]){
      if(!a?.id){errors.push(`Etapa ${s?.id||'?'} contém ator sem id.`);continue}
      if(actorIds.has(a.id))errors.push(`Ator duplicado: ${a.id}.`);else actorIds.add(a.id);
      if(publishing&&!a?.name)errors.push(`Ator ${a.id} precisa de nome.`);
      if(a.fact?.id){if(factIds.has(a.fact.id))errors.push(`Fato duplicado: ${a.fact.id}.`);else factIds.add(a.fact.id)}
    }
    for(const o of s?.objects||[]){
      if(!o?.id){errors.push(`Etapa ${s?.id||'?'} contém objeto sem id.`);continue}
      if(objectIds.has(o.id))errors.push(`Objeto duplicado: ${o.id}.`);else objectIds.add(o.id);
      if(o.fact?.id){if(factIds.has(o.fact.id))errors.push(`Fato duplicado: ${o.fact.id}.`);else factIds.add(o.fact.id)}
    }
  }
  for(const d of mj?.decisions||[]){
    if(!d?.id)errors.push('Toda decisão precisa de id.');else if(decisionIds.has(d.id))errors.push(`Decisão duplicada: ${d.id}.`);else decisionIds.add(d.id);
    if(!d?.title)errors.push(`Decisão ${d?.id||'?'} sem título.`);
    if(!d?.question)errors.push(`Decisão ${d?.id||'?'} sem pergunta contextual.`);
    if(!Array.isArray(d?.choices)||d.choices.length<2)errors.push(`Decisão ${d?.id||'?'} precisa de pelo menos 2 alternativas.`);
    else {
      if(d.choices.filter((c:any)=>c?.correct===true).length!==1)errors.push(`Decisão ${d.id} precisa ter exatamente 1 alternativa correta.`);
      d.choices.forEach((c:any,i:number)=>{if(!String(c?.text||'').trim())errors.push(`Decisão ${d.id}: alternativa ${i+1} sem texto.`);if(publishing&&!String(c?.feedback||'').trim())errors.push(`Decisão ${d.id}: alternativa ${i+1} precisa de feedback específico.`)});
    }
    if(publishing){
      const fb=d?.feedback||{};
      for(const key of ['rule','application','legal_basis','trap','memory'])if(!String(fb[key]||'').trim())errors.push(`Decisão ${d?.id||'?'}: feedback.${key} é obrigatório para publicação.`);
    }
  }
  for(const s of mj?.stages||[])for(const o of s?.objectives||[]){
    if(o?.type==='actor'&&!actorIds.has(o.target))errors.push(`Objetivo ${o.title||o.target}: ator ${o.target} não existe.`);
    if(o?.type==='object'&&!objectIds.has(o.target))errors.push(`Objetivo ${o.title||o.target}: objeto ${o.target} não existe.`);
    if(o?.type==='decision'&&!decisionIds.has(o.target))errors.push(`Objetivo ${o.title||o.target}: decisão ${o.target} não existe.`);
    if(!['actor','object','decision','advance'].includes(o?.type))errors.push(`Objetivo ${o?.title||'?'} tem tipo inválido.`);
  }
  for(const d of mj?.decisions||[]){
    for(const f of d?.requires_facts||[])if(!factIds.has(f))errors.push(`Decisão ${d.id}: fato obrigatório ${f} não existe.`);
    for(const dep of d?.depends_on||[])if(!decisionIds.has(dep))errors.push(`Decisão ${d.id}: dependência ${dep} não existe.`);
  }
  return [...new Set(errors)];
}

export async function saveMissionAdmin(input:unknown){
  const parsed=inputSchema.safeParse(input);
  if(!parsed.success)return{ok:false,error:'Campos administrativos inválidos.',issues:parsed.error.issues.map(i=>i.message)};
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return{ok:false,error:'Sessão expirada.'};
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true)return{ok:false,error:'Acesso administrativo necessário.'};
  let mj:any;try{mj=JSON.parse(parsed.data.mission_json)}catch{return{ok:false,error:'O mission_json não é um JSON válido.'}}
  const issues=lintMission(mj,parsed.data.status==='published');if(issues.length)return{ok:false,error:'A missão contém inconsistências.',issues};

  const topicIds=[...new Set(parsed.data.topic_ids)];
  if(parsed.data.status==='published'&&topicIds.length===0)return{ok:false,error:'Missão publicada precisa estar vinculada a pelo menos um tópico do edital.'};
  if(parsed.data.primary_topic_id&&!topicIds.includes(parsed.data.primary_topic_id))return{ok:false,error:'O tópico principal precisa estar entre os tópicos selecionados.'};
  const {data:topicRows,error:topicError}=topicIds.length?await sb.from('syllabus_topics').select('id,code,syllabus_id').in('id',topicIds):{data:[] as any[],error:null};
  if(topicError)return{ok:false,error:topicError.message};
  if((topicRows||[]).some((t:any)=>t.syllabus_id!==parsed.data.syllabus_id)||topicRows?.length!==topicIds.length)return{ok:false,error:'Há tópico que não pertence ao edital selecionado.'};

  const{data:current}=await sb.from('missions').select('id,status,published_at').eq('id',parsed.data.id).maybeSingle();
  if(!current)return{ok:false,error:'Missão não encontrada.'};

  mj.title=parsed.data.title;
  mj.summary=parsed.data.summary;
  mj.difficulty=parsed.data.difficulty;
  mj.estimated_minutes=parsed.data.estimated_minutes;
  mj.topic_codes=(topicRows||[]).map((t:any)=>t.code);
  const publishedAt=parsed.data.status==='published'?(current.status==='published'&&current.published_at?current.published_at:new Date().toISOString()):null;
  const payload:any={title:parsed.data.title,summary:parsed.data.summary,status:parsed.data.status,difficulty:parsed.data.difficulty,estimated_minutes:parsed.data.estimated_minutes,sequence_no:parsed.data.sequence_no,syllabus_id:parsed.data.syllabus_id,mission_json:mj,schema_version:mj.schema,updated_at:new Date().toISOString(),published_at:publishedAt};
  const {error}=await sb.from('missions').update(payload).eq('id',parsed.data.id);
  if(error)return{ok:false,error:error.message};

  const {error:mapError}=await sb.rpc('admin_set_mission_topics',{p_mission_id:parsed.data.id,p_syllabus_id:parsed.data.syllabus_id,p_topic_ids:topicIds,p_primary_topic_id:parsed.data.primary_topic_id||null});
  if(mapError)return{ok:false,error:`Missão salva, mas o vínculo com o edital falhou: ${mapError.message}`};

  if(parsed.data.status==='published'){
    const{data:last}=await sb.from('mission_versions').select('version_no').eq('mission_id',parsed.data.id).order('version_no',{ascending:false}).limit(1).maybeSingle();
    let versionNo=Number(last?.version_no||0)+1;
    let versionError:any=null;
    for(let attempt=0;attempt<2;attempt++){
      const r=await sb.from('mission_versions').insert({mission_id:parsed.data.id,version_no:versionNo,payload:mj,created_by:user.id});
      versionError=r.error;
      if(!versionError)break;
      if(String(versionError.code)==='23505')versionNo+=1;else break;
    }
    if(versionError)return{ok:false,error:`Missão publicada, mas o snapshot de versão falhou: ${versionError.message}`};
    return{ok:true,issues:[],version:versionNo};
  }

  return{ok:true,issues:[]};
}
