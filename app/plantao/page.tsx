import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PatrolMode from '@/components/patrol-mode-v4';

type Search={run?:string;error?:string};

export default async function PlantaoPage({searchParams}:{searchParams:Promise<Search>}){
  const query=await searchParams;
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');

  const now=new Date().toISOString();
  const[{data:stats},{data:dueReviews},{data:recentRuns}]=await Promise.all([
    sb.from('student_stats').select('xp,current_streak').eq('user_id',user.id).maybeSingle(),
    sb.from('review_queue').select('id').eq('user_id',user.id).eq('status','pending').lte('due_at',now),
    sb.from('patrol_runs').select('id,item_count,answered_count,correct_count,xp_earned,summary,started_at,completed_at,status').eq('user_id',user.id).eq('status','completed').order('started_at',{ascending:false}).limit(3),
  ]);

  const runId=query.run||'';
  if(!runId){
    const{data:active}=await sb.from('patrol_runs').select('id').eq('user_id',user.id).eq('status','active').order('started_at',{ascending:false}).limit(1).maybeSingle();
    if(active?.id)redirect(`/plantao?run=${active.id}`);
    return <PatrolMode view="landing" dueCount={dueReviews?.length||0} xp={Number(stats?.xp||0)} streak={Number(stats?.current_streak||0)} recentRuns={(recentRuns||[]) as any} error={query.error}/>;
  }

  const{data:run,error:runError}=await sb.from('patrol_runs').select('*').eq('id',runId).eq('user_id',user.id).maybeSingle();
  if(runError||!run)redirect('/plantao?error='+encodeURIComponent('Plantão não encontrado ou indisponível.'));

  if(run.status==='completed'){
    const{data:items}=await sb.from('patrol_items').select('id,sequence_no,mission_id,decision_id,priority_source,correct').eq('run_id',run.id).eq('user_id',user.id).order('sequence_no');
    const missionIds=[...new Set((items||[]).map((x:any)=>x.mission_id))];
    const{data:missions}=missionIds.length?await sb.from('missions').select('id,title,mission_json').in('id',missionIds):{data:[] as any[]};
    const mmap=new Map((missions||[]).map((m:any)=>[m.id,m]));
    const reportItems=(items||[]).map((item:any)=>{const mission:any=mmap.get(item.mission_id);const decision=(mission?.mission_json?.decisions||[]).find((d:any)=>d.id===item.decision_id);return{...item,missionTitle:mission?.title||'Ocorrência',decisionTitle:decision?.title||decision?.question||'Decisão'}});
    return <PatrolMode view="complete" run={run as any} reportItems={reportItems as any}/>;
  }
  if(run.status!=='active')redirect('/plantao');

  const{data:item}=await sb.from('patrol_items').select('*').eq('run_id',run.id).eq('user_id',user.id).is('answered_at',null).order('sequence_no').limit(1).maybeSingle();
  if(!item)redirect('/plantao?error='+encodeURIComponent('O turno ficou sem ocorrência pendente. Inicie um novo plantão.'));

  const{data:mission}=await sb.from('missions').select('id,title,summary,mission_json,syllabus_id,environment_theme').eq('id',item.mission_id).eq('status','published').maybeSingle();
  if(!mission)redirect('/plantao?error='+encodeURIComponent('A ocorrência selecionada não está mais publicada.'));

  const mj:any=mission.mission_json||{};
  const decision=(mj.decisions||[]).find((d:any)=>d.id===item.decision_id);
  if(!decision)redirect('/plantao?error='+encodeURIComponent('A decisão desta ocorrência não foi encontrada.'));

  const stages:any[]=[...(mj.stages||[])].sort((a:any,b:any)=>(a.order||0)-(b.order||0));
  const stage=stages.find((s:any)=>s.id===decision.stage)||stages.find((s:any)=>(s.objectives||[]).some((o:any)=>o.type==='decision'&&o.target===decision.id))||stages[0]||{};
  const required=new Set<string>(decision.requires_facts||[]);
  const entities:any[]=[];

  for(const actor of stage.actors||[]){const fact=actor.fact||{};entities.push({id:`actor:${actor.id}`,sourceId:actor.id,kind:'actor',name:actor.name||fact.title||'Pessoa',role:actor.role||'PESSOA',style:actor.visual?.archetype||actor.style||'civilian',factTitle:fact.title||actor.name||'Depoimento',factText:fact.text||actor.goal||'',interactionText:actor.goal||'Conversar',dialogue:Array.isArray(actor.dialogue)?actor.dialogue:[],required:!!fact.id&&required.has(fact.id),position:actor.position||{x:600,y:380}})}
  for(const object of stage.objects||[]){const fact=object.fact||{};entities.push({id:`object:${object.id}`,sourceId:object.id,kind:'object',objectKind:object.kind||'evidence',name:object.name||fact.title||'Evidência',role:object.role||'EVIDÊNCIA',factTitle:fact.title||object.name||'Evidência',factText:fact.text||object.interaction_text||'',interactionText:object.interaction_text||'Examinar',required:!!fact.id&&required.has(fact.id),position:object.position||{x:650,y:440}})}

  const [{data:character},{data:syllabus}]=await Promise.all([
    mission.syllabus_id?sb.from('student_characters').select('character_name,role_title,archetype').eq('user_id',user.id).eq('syllabus_id',mission.syllabus_id).maybeSingle():Promise.resolve({data:null}),
    mission.syllabus_id?sb.from('exam_syllabi').select('position_name').eq('id',mission.syllabus_id).maybeSingle():Promise.resolve({data:null}),
  ]);

  const occurrence={runId:run.id,itemId:item.id,sequence:Number(item.sequence_no||1),total:Number(run.item_count||1),prioritySource:item.priority_source||'gap',missionTitle:mission.title,summary:stage.intro||mission.summary||mj.briefing?.text||'Analise a ocorrência e tome a providência juridicamente adequada.',decisionTitle:decision.title||'Decisão',question:decision.question||'Qual providência é mais adequada diante dos fatos?',choices:(decision.choices||[]).map((c:any)=>String(c.text||'')),location:stage.location||'Ocorrência em andamento',sceneTitle:stage.title||mission.title,environment:stage.environment||mission.environment_theme||'parking_night',entities,playerSpawn:stage.player_spawn||{x:600,y:650},character:{name:character?.character_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Jogador',role:character?.role_title||syllabus?.position_name||'Candidato',archetype:character?.archetype||'operational'}};
  return <PatrolMode key={item.id} view="active" occurrence={occurrence}/>;
}
