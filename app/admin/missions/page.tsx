import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionEditor from '@/components/admin/mission-editor';

export default async function AdminMissions(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) redirect('/dashboard');
  const {data:missions,error}=await sb.from('missions').select('id,title,summary,status,difficulty,estimated_minutes,sequence_no,mission_json,updated_at').order('sequence_no');
  if(error) throw new Error(error.message);
  return <MissionEditor missions={missions||[]}/>;
}
