import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GameRuntime from '@/components/game-runtime-pro-v3';

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
    <nav className="gameEscapeDock" aria-label="Navegação rápida da missão">
      <a className="gameEscapePrimary" href="/dashboard"><span>←</span><b>Voltar ao painel</b></a>
      <a href="/plantao">Plantão</a>
      <a href="/review">Revisão</a>
    </nav>
    <style>{`
      .gameEscapeDock{position:fixed;z-index:10050;right:14px;bottom:14px;display:flex;gap:5px;align-items:center;padding:5px;border:1px solid #33515a;border-radius:13px;background:#041015e8;backdrop-filter:blur(16px);box-shadow:0 14px 45px #000a;font-family:Inter,system-ui,sans-serif}
      .gameEscapeDock a{display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:9px;color:#81999f;text-decoration:none;font-size:9px;font-weight:800;letter-spacing:.02em}
      .gameEscapeDock a:hover{background:#0d252d;color:#edf5f4}
      .gameEscapeDock .gameEscapePrimary{background:#13272d;color:#dce8e7;border:1px solid #3b5860}
      .gameEscapeDock .gameEscapePrimary span{color:#e4bd5d;font-size:13px}
      @media(max-width:700px){.gameEscapeDock{left:10px;right:10px;bottom:max(8px,env(safe-area-inset-bottom));justify-content:space-between}.gameEscapeDock a{padding:8px}.gameEscapeDock .gameEscapePrimary{flex:1}.gameEscapeDock .gameEscapePrimary b{display:inline}}
    `}</style>
  </>;
}
