import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionEditor from '@/components/admin/mission-editor';

export default async function AdminMissions(){
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user) redirect('/');
  const {data:isAdmin}=await sb.rpc('is_admin');
  if(isAdmin!==true) redirect('/dashboard');
  const [{data:missions,error},{data:syllabi},{data:topics},{data:links}]=await Promise.all([
    sb.from('missions').select('id,syllabus_id,title,summary,status,difficulty,estimated_minutes,sequence_no,mission_json,updated_at').order('sequence_no'),
    sb.from('exam_syllabi').select('id,title,status').order('created_at',{ascending:false}),
    sb.from('syllabus_topics').select('id,syllabus_id,code,title,discipline,order_index').order('order_index'),
    sb.from('mission_topics').select('mission_id,topic_id,coverage_weight,is_primary')
  ]);
  if(error) throw new Error(error.message);
  return <MissionEditor missions={missions||[]} syllabi={syllabi||[]} topics={topics||[]} links={links||[]}/>;
}
