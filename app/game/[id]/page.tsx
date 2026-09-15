import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GameRuntime from '@/components/game-runtime-paid';

export default async function Game({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const [{ data: character }, { data: progress }, { data: presets }, { data: runtimeSettings }] = await Promise.all([
    missionRow.syllabus_id
      ? sb.from('student_characters').select('*').eq('user_id', user.id).eq('syllabus_id', missionRow.syllabus_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from('mission_progress').select('*').eq('user_id', user.id).eq('mission_id', id).maybeSingle(),
    sb.from('game_visual_presets').select('slug,name,description,category,config').eq('active', true).order('sort_order'),
    sb.from('game_runtime_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const initialCharacter = character || {
    character_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Jogador',
    role_title: 'Candidato',
    archetype: 'operational',
  };

  return <GameRuntime
    missionId={missionRow.id}
    mission={mission}
    userId={user.id}
    initialCharacter={initialCharacter}
    initialProgress={progress || null}
    visualPresets={presets || []}
    runtimeSettings={runtimeSettings || null}
  />;
}
