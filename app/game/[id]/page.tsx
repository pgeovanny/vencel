import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GameRuntime from '@/components/game-runtime-pro-v4';
import GameCommercialLayer from '@/components/game-commercial-layer';

export default async function Game({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string; stage?: string }> }) {
  const { id } = await params;
  const { mode, stage } = await searchParams;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');

  const { data: missionRow, error } = await sb
    .from('missions')
    .select('id,title,summary,mission_json,syllabus_id')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !missionRow) notFound();
  const mission: any = missionRow.mission_json;
  if (!mission || mission.schema !== 'jurisquest.mission.v2') notFound();

  const [{ data: character }, { data: progress }, { data: runtimeSettings }] = await Promise.all([
    missionRow.syllabus_id
      ? sb.from('student_characters').select('*').eq('user_id', user.id).eq('syllabus_id', missionRow.syllabus_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from('mission_progress').select('*').eq('user_id', user.id).eq('mission_id', id).maybeSingle(),
    sb.from('game_runtime_settings').select('*').eq('id', 1).maybeSingle(),
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
      mission={mission}
      userId={user.id}
      initialCharacter={initialCharacter}
      initialProgress={progress || null}
      runtimeSettings={runtimeSettings || null}
      replayMode={replayMode}
      exploreMode={exploreMode}
      exploreStage={exploreMode ? stage || null : null}
    />
    <GameCommercialLayer/>
  </>;
}
