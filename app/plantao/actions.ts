'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function startPlantao(formData: FormData) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const size = Math.max(3, Math.min(8, Number(formData.get('size') || 5)));
  const { data, error } = await sb.rpc('start_patrol_run', { p_size: size });
  if (error || !data) redirect('/plantao?error=' + encodeURIComponent(error?.message || 'Não foi possível iniciar o plantão.'));
  redirect(`/plantao?run=${data}`);
}

export async function submitPlantaoAnswer(input: { runId: string; itemId: string; index: number }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada.' };
  const { data, error } = await sb.rpc('submit_patrol_answer', {
    p_run_id: input.runId,
    p_item_id: input.itemId,
    p_selected_index: input.index,
  });
  if (error) return { ok: false, error: error.message || 'Não foi possível registrar a decisão.' };
  return { ok: true, data };
}

export async function abandonPlantao(formData: FormData) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const runId = String(formData.get('run_id') || '');
  if (runId) await sb.rpc('abandon_patrol_run', { p_run_id: runId });
  redirect('/dashboard');
}
