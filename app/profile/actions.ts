'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const ALLOWED=new Set(['operational','investigator','analyst','institutional']);

export async function saveCharacter(formData:FormData){
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');

  const syllabusId=String(formData.get('syllabus_id')||'');
  const characterName=String(formData.get('character_name')||'').trim().slice(0,40);
  const archetype=String(formData.get('archetype')||'operational');
  if(!syllabusId||characterName.length<2||!ALLOWED.has(archetype))redirect('/profile?error=1');

  const{data:syllabus}=await sb.from('exam_syllabi').select('id,position_name,status').eq('id',syllabusId).eq('status','published').maybeSingle();
  if(!syllabus)redirect('/profile?error=1');

  const{error}=await sb.from('student_characters').upsert({
    user_id:user.id,
    syllabus_id:syllabus.id,
    character_name:characterName,
    role_title:syllabus.position_name||'Candidato',
    archetype,
    appearance_json:{version:1,archetype},
    updated_at:new Date().toISOString(),
  },{onConflict:'user_id,syllabus_id'});

  if(error)redirect('/profile?error=1');
  redirect('/profile?saved=1');
}
