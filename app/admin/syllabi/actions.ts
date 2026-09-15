'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function slugify(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}

export async function createSyllabus(formData:FormData){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) throw new Error('Sessão necessária.');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) throw new Error('Acesso administrativo necessário.');
  const title=String(formData.get('title')||'').trim();
  const examName=String(formData.get('exam_name')||'').trim();
  const agency=String(formData.get('agency')||'').trim();
  const position=String(formData.get('position_name')||'').trim();
  const yearRaw=String(formData.get('exam_year')||'').trim();
  const sourceRaw=String(formData.get('source_json')||'').trim();
  if(title.length<3) throw new Error('Informe um título para o edital.');
  let source:any={source:'manual',created_at:new Date().toISOString()};
  if(sourceRaw){try{source=JSON.parse(sourceRaw)}catch{throw new Error('source_json inválido.')}}
  const slug=`${slugify(title)}-${Date.now().toString(36)}`;
  const {error}=await sb.from('exam_syllabi').insert({slug,title,exam_name:examName||null,agency:agency||null,position_name:position||null,exam_year:yearRaw?Number(yearRaw):null,status:'draft',schema_version:'jurisquest.syllabus.v1',source_json:source,created_by:user.id});
  if(error) throw new Error(error.message);
  revalidatePath('/admin/syllabi');
}

export async function setSyllabusStatus(formData:FormData){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) throw new Error('Sessão necessária.');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) throw new Error('Acesso administrativo necessário.');
  const id=String(formData.get('id')||'');
  const status=String(formData.get('status')||'draft');
  if(!['draft','published','archived'].includes(status)) throw new Error('Status inválido.');
  const {error}=await sb.from('exam_syllabi').update({status,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id);
  if(error) throw new Error(error.message);
  revalidatePath('/admin/syllabi');
  revalidatePath('/dashboard');
}
