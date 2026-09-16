import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VisualStudio from '@/components/admin/visual-studio';

export default async function VisualAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const { data: isAdmin } = await sb.rpc('is_admin');
  if (!isAdmin) redirect('/dashboard');

  const [{ data: presets }, { data: assets }, { data: missions }, { data: runtimeSettings }] = await Promise.all([
    sb.from('game_visual_presets').select('*').order('sort_order'),
    sb.from('game_asset_catalog').select('*').eq('active', true).order('sort_order'),
    sb.from('missions_admin').select('id,title,status,mission_json').in('status', ['draft','published']).order('created_at', { ascending: false }),
    sb.from('game_runtime_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  return <VisualStudio presets={presets || []} assets={assets || []} missions={missions || []} runtimeSettings={runtimeSettings || null} />;
}
