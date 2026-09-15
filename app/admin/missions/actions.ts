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

function lintMission(mj:any){
  const errors:string[]=[];
  if(mj?.schema!=='jurisquest.mission.v2')errors.push('schema deve ser jurisquest.mission.v2.');
  if(!Array.isArray(mj?.stages)||mj.stages.length===0)errors.push('A missão precisa ter pelo menos uma etapa.');
  if(!Array.isArray(mj?.decisions))errors.push('decisions precisa ser uma lista.');
  const stageIds=new Set<string>(),actorIds=new Set<string>(),objectIds=new Set<string>(),factIds=new Set<string>(),decisionIds=new Set<string>();
  for(const s of mj?.stages||[]){
    if(!s?.id)errors.push('Toda etapa precisa de id.');else if(stageIds.has(s.id))errors.push(`Etapa duplicada: ${s.id}.`);else stageIds.add(s.id);
    if(!s?.title)errors.push(`Etapa ${s?.id||'?'} sem título.`);
    for(const a of s?.actors||[]){if(a?.id){actorIds.add(a.id);if(a.fact?.id)factIds.add(a.fact.id)}}
    for(const o of s?.objects||[]){if(o?.id){objectIds.add(o.id);if(o.fact?.id)factIds.add(o.fact.id)}}
  }
  for(const d of mj?.decisions||[]){
    if(!d?.id)errors.push('Toda decisão precisa de id.');else if(decisionIds.has(d.id))errors.push(`Decisão duplicada: ${d.id}.`);else decisionIds.add(d.id);
    if(!Array.isArray(d?.choices)||d.choices.length<2)errors.push(`Decisão ${d?.id||'?'} precisa de pelo menos 2 alternativas.`);else if(d.choices.filter((c:any)=>c?.correct===true).length!==1)errors.push(`Decisão ${d.id} precisa ter exatamente 1 alternativa correta.`);
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
  const issues=lintMission(mj);if(issues.length)return{ok:false,error:'A missão contém inconsistências.',issues};

  const topicIds=[...new Set(parsed.data.topic_ids)];
  if(parsed.data.primary_topic_id&&!topicIds.includes(parsed.data.primary_topic_id))return{ok:false,error:'O tópico principal precisa estar entre os tópicos selecionados.'};
  const {data:topicRows,error:topicError}=topicIds.length?await sb.from('syllabus_topics').select('id,code,syllabus_id').in('id',topicIds):{data:[] as any[],error:null};
  if(topicError)return{ok:false,error:topicError.message};
  if((topicRows||[]).some((t:any)=>t.syllabus_id!==parsed.data.syllabus_id)||topicRows?.length!==topicIds.length)return{ok:false,error:'Há tópico que não pertence ao edital selecionado.'};

  mj.title=parsed.data.title;mj.summary=parsed.data.summary;mj.topic_codes=(topicRows||[]).map((t:any)=>t.code);
  const payload:any={title:parsed.data.title,summary:parsed.data.summary,status:parsed.data.status,difficulty:parsed.data.difficulty,estimated_minutes:parsed.data.estimated_minutes,sequence_no:parsed.data.sequence_no,syllabus_id:parsed.data.syllabus_id,mission_json:mj,schema_version:mj.schema,updated_at:new Date().toISOString(),published_at:parsed.data.status==='published'?new Date().toISOString():null};
  const {error}=await sb.from('missions').update(payload).eq('id',parsed.data.id);
  if(error)return{ok:false,error:error.message};
  const {error:mapError}=await sb.rpc('admin_set_mission_topics',{p_mission_id:parsed.data.id,p_syllabus_id:parsed.data.syllabus_id,p_topic_ids:topicIds,p_primary_topic_id:parsed.data.primary_topic_id||null});
  return mapError?{ok:false,error:`Missão salva, mas o vínculo com o edital falhou: ${mapError.message}`}:{ok:true,issues:[]};
}
