import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReviewSession from '@/components/review-session';

export default async function ReviewRun({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const sb=await createClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');
  const {data:review}=await sb.from('review_queue').select('id,user_id,mission_id,due_at,interval_days,reason,status').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(!review)notFound();
  if(review.status==='done')redirect('/review');
  if(review.status!=='pending')redirect('/review');
  if(new Date(review.due_at).getTime()>Date.now())redirect('/review');
  if(!review.mission_id)redirect('/review');
  const [{data:mission},{data:progress}]=await Promise.all([
    sb.from('missions_client').select('id,title,mission_json').eq('id',review.mission_id).eq('status','published').maybeSingle(),
    sb.from('mission_progress').select('mistakes,facts,decisions,status').eq('user_id',user.id).eq('mission_id',review.mission_id).maybeSingle(),
  ]);
  if(!mission)notFound();
  return <ReviewSession review={review as any} mission={mission as any} progress={progress||null} userId={user.id}/>;
}
