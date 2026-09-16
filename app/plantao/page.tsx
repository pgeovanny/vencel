import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PatrolMode from '@/components/patrol-mode-v4';
import GameRuntime from '@/components/game-runtime-pro-v4';
import GameCommercialLayer from '@/components/game-commercial-layer';

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
    const reportItems=(items||[]).map((item:any)=>{
      const mission:any=mmap.get(item.mission_id);
      const decision=(mission?.mission_json?.decisions||[]).find((d:any)=>d.id===item.decision_id);
      return{...item,missionTitle:mission?.title||'Ocorrência',decisionTitle:decision?.title||decision?.question||'Decisão'};
    });
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
  const sourceStage=stages.find((s:any)=>s.id===decision.stage)||stages.find((s:any)=>(s.objectives||[]).some((o:any)=>o.type==='decision'&&o.target===decision.id))||stages[0]||{};
  const requiredFacts=new Set<string>(decision.requires_facts||[]);

  const runtimeActors=[...(sourceStage.actors||[])];
  const runtimeObjects=[...(sourceStage.objects||[])];
  const presentActorIds=new Set(runtimeActors.map((x:any)=>x.id));
  const presentObjectIds=new Set(runtimeObjects.map((x:any)=>x.id));

  for(const s of stages){
    for(const actor of s.actors||[]){if(actor?.fact?.id&&requiredFacts.has(actor.fact.id)&&!presentActorIds.has(actor.id)){runtimeActors.push(actor);presentActorIds.add(actor.id)}}
    for(const object of s.objects||[]){if(object?.fact?.id&&requiredFacts.has(object.fact.id)&&!presentObjectIds.has(object.id)){runtimeObjects.push(object);presentObjectIds.add(object.id)}}
  }

  const objectives:any[]=[];
  const objectiveKeys=new Set<string>();
  const addObjective=(o:any)=>{const key=`${o.type}:${o.target||o.title}`;if(!objectiveKeys.has(key)){objectiveKeys.add(key);objectives.push(o)}};

  for(const o of sourceStage.objectives||[]){
    if(o.type==='actor'){
      const actor=runtimeActors.find((x:any)=>x.id===o.target);if(actor?.fact?.id&&requiredFacts.has(actor.fact.id))addObjective(o);
    }else if(o.type==='object'){
      const object=runtimeObjects.find((x:any)=>x.id===o.target);if(object?.fact?.id&&requiredFacts.has(object.fact.id))addObjective(o);
    }else if(o.type==='decision'&&o.target===decision.id)addObjective(o);
  }

  for(const actor of runtimeActors){if(actor?.fact?.id&&requiredFacts.has(actor.fact.id))addObjective({type:'actor',target:actor.id,title:`Fale com ${actor.name||'a testemunha'}`,text:actor.goal||actor.fact?.title||'Colete o depoimento necessário para decidir.',why:'Esse fato é necessário para aplicar corretamente a regra jurídica.'})}
  for(const object of runtimeObjects){if(object?.fact?.id&&requiredFacts.has(object.fact.id))addObjective({type:'object',target:object.id,title:object.interaction_text||`Examine ${object.name||'a evidência'}`,text:object.fact?.title||'Registre a evidência necessária para decidir.',why:'Esse elemento altera o enquadramento jurídico da ocorrência.'})}
  addObjective({type:'decision',target:decision.id,title:decision.title||'Tome a decisão jurídica',text:decision.question||'Escolha a providência juridicamente adequada.',why:'A decisão consolida os fatos observados e a regra aplicável.'});

  const runtimeStage={
    ...sourceStage,
    id:`plantao-${sourceStage.id||'stage'}-${item.id}`,
    order:1,
    title:sourceStage.title||mission.title,
    location:sourceStage.location||'Ocorrência em andamento',
    environment:sourceStage.environment||mission.environment_theme||'parking_night',
    actors:runtimeActors,
    objects:runtimeObjects,
    objectives,
    final:true,
    player_spawn:sourceStage.player_spawn||{x:600,y:650},
  };

  const runtimeDecision={...decision,stage:runtimeStage.id,depends_on:[]};
  const runtimeMission={
    ...mj,
    title:mission.title,
    summary:mission.summary||mj.summary,
    stages:[runtimeStage],
    decisions:[runtimeDecision],
    estimated_minutes:5,
    briefing:{
      ...(mj.briefing||{}),
      eyebrow:'PLANTÃO ADAPTATIVO',
      text:sourceStage.intro||mission.summary||mj.briefing?.text||'Atenda a ocorrência, observe os fatos necessários e tome a providência adequada.',
      learning_goal:decision.feedback?.memory||decision.feedback?.rule||mj.briefing?.learning_goal,
    },
  };

  const[{data:character},{data:syllabus},{data:runtimeSettings},{data:visualPresets}]=await Promise.all([
    mission.syllabus_id?sb.from('student_characters').select('*').eq('user_id',user.id).eq('syllabus_id',mission.syllabus_id).maybeSingle():Promise.resolve({data:null}),
    mission.syllabus_id?sb.from('exam_syllabi').select('position_name').eq('id',mission.syllabus_id).maybeSingle():Promise.resolve({data:null}),
    sb.from('game_runtime_settings').select('*').eq('id',1).maybeSingle(),
    sb.from('game_visual_presets').select('slug,name,config').eq('active',true).order('sort_order'),
  ]);

  const initialCharacter=character||{
    character_name:user.user_metadata?.display_name||user.email?.split('@')[0]||'Jogador',
    role_title:syllabus?.position_name||'Candidato',
    archetype:'operational',
  };

  return <>
    <GameRuntime
      key={item.id}
      mode="patrol"
      missionId={mission.id}
      mission={runtimeMission}
      userId={user.id}
      initialCharacter={initialCharacter}
      initialProgress={null}
      runtimeSettings={runtimeSettings||null}
      visualPresets={visualPresets||[]}
      patrolContext={{runId:run.id,itemId:item.id,sequence:Number(item.sequence_no||1),total:Number(run.item_count||1),prioritySource:item.priority_source||'gap'}}
    />
    <GameCommercialLayer/>
  </>;
}
