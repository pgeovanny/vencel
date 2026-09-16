import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GameRuntime from '@/components/game-runtime-pro-v4';
import GameCommercialLayer from '@/components/game-commercial-layer';
import { missionForClient } from '@/lib/game/client-mission';

export default async function Game({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string; stage?: string }> }) {
  const { id } = await params;
  const { mode, stage } = await searchParams;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');

  const { data: missionRow, error } = await sb
    .from('missions_client')
    .select('id,title,summary,mission_json,syllabus_id')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !missionRow) notFound();
  const mission: any = missionRow.mission_json;
  if (!mission || mission.schema !== 'jurisquest.mission.v2') notFound();
  const clientMission=missionForClient(mission);

  const [{ data: character }, { data: progress }, { data: runtimeSettings }, { data: visualPresets }, { data: visualAssets }] = await Promise.all([
    missionRow.syllabus_id
      ? sb.from('student_characters').select('*').eq('user_id', user.id).eq('syllabus_id', missionRow.syllabus_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from('mission_progress').select('*').eq('user_id', user.id).eq('mission_id', id).maybeSingle(),
    sb.from('game_runtime_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('game_visual_presets').select('slug,name,config').eq('active',true).order('sort_order'),
    sb.from('game_asset_catalog').select('slug,kind,config').eq('active',true).eq('kind','character').order('sort_order'),
  ]);

  const initialCharacter = character || {
    character_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Jogador',
    role_title: 'Candidato',
    archetype: 'operational',
  };

  const completed = progress?.status === 'completed';
  const replayMode = mode === 'replay' && completed;
  const exploreMode = mode === 'explore' && completed;

  return <>
    <GameRuntime
      mode="campaign"
      missionId={missionRow.id}
      mission={clientMission}
      userId={user.id}
      initialCharacter={initialCharacter}
      initialProgress={progress || null}
      runtimeSettings={runtimeSettings || null}
      visualPresets={visualPresets || []}
      visualAssets={visualAssets || []}
      replayMode={replayMode}
      exploreMode={exploreMode}
      exploreStage={exploreMode ? stage || null : null}
    />
    <GameCommercialLayer/>
  </>;
}
