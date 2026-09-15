'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function slugify(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}
async function adminClient(){const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('Sessão necessária.');const {data:isAdmin}=await sb.rpc('is_admin');if(isAdmin!==true)throw new Error('Acesso administrativo necessário.');return{sb,user}}

export async function createSyllabus(formData:FormData){
  const {sb,user}=await adminClient();
  const title=String(formData.get('title')||'').trim(),examName=String(formData.get('exam_name')||'').trim(),agency=String(formData.get('agency')||'').trim(),position=String(formData.get('position_name')||'').trim(),yearRaw=String(formData.get('exam_year')||'').trim(),sourceRaw=String(formData.get('source_json')||'').trim();
  if(title.length<3)throw new Error('Informe um título para o edital.');
  let source:any={source:'manual',created_at:new Date().toISOString()};if(sourceRaw){try{source=JSON.parse(sourceRaw)}catch{throw new Error('source_json inválido.')}}
  const slug=`${slugify(title)}-${Date.now().toString(36)}`;
  const {error}=await sb.from('exam_syllabi').insert({slug,title,exam_name:examName||null,agency:agency||null,position_name:position||null,exam_year:yearRaw?Number(yearRaw):null,status:'draft',schema_version:'jurisquest.syllabus.v1',source_json:source,created_by:user.id});
  if(error)throw new Error(error.message);revalidatePath('/admin/syllabi');
}

export async function setSyllabusStatus(formData:FormData){
  const {sb}=await adminClient();const id=String(formData.get('id')||''),status=String(formData.get('status')||'draft');
  if(!['draft','published','archived'].includes(status))throw new Error('Status inválido.');
  const {error}=await sb.from('exam_syllabi').update({status,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw new Error(error.message);revalidatePath('/admin/syllabi');revalidatePath('/dashboard');
}

export async function createTopic(formData:FormData){
  const {sb}=await adminClient();
  const syllabusId=String(formData.get('syllabus_id')||''),discipline=String(formData.get('discipline')||'').trim(),code=String(formData.get('code')||'').trim().toUpperCase(),title=String(formData.get('title')||'').trim(),sourceRef=String(formData.get('source_ref')||'').trim(),weight=Math.max(.1,Math.min(10,Number(formData.get('weight')||1)));
  if(!syllabusId||discipline.length<2||code.length<2||title.length<3)throw new Error('Preencha edital, disciplina, código e título do tópico.');
  const {data:last}=await sb.from('syllabus_topics').select('order_index').eq('syllabus_id',syllabusId).order('order_index',{ascending:false}).limit(1).maybeSingle();
  const {error}=await sb.from('syllabus_topics').insert({syllabus_id:syllabusId,discipline,code,title,source_ref:sourceRef||null,weight,order_index:Number(last?.order_index||0)+1,metadata:{source:'admin_manual'}});if(error)throw new Error(error.message);
  revalidatePath('/admin/syllabi');revalidatePath(`/syllabus/${syllabusId}`);
}

export async function deleteTopic(formData:FormData){
  const {sb}=await adminClient();const id=String(formData.get('id')||''),syllabusId=String(formData.get('syllabus_id')||'');if(!id)throw new Error('Tópico inválido.');
  const {count}=await sb.from('mission_topics').select('*',{count:'exact',head:true}).eq('topic_id',id);if((count||0)>0)throw new Error('Este tópico está vinculado a missão. Remova o vínculo antes de excluir.');
  const {error}=await sb.from('syllabus_topics').delete().eq('id',id);if(error)throw new Error(error.message);revalidatePath('/admin/syllabi');if(syllabusId)revalidatePath(`/syllabus/${syllabusId}`);
}
