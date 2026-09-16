'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const stageVisualSchema = z.object({
  preset: z.string().min(1).max(80),
  time: z.string().max(32).optional(),
  weather: z.string().max(32).optional(),
  density: z.enum(['clean','balanced','rich']).optional(),
  camera_zoom: z.number().min(.6).max(1.6).optional(),
});

const actorVisualSchema=z.object({
  archetype:z.string().min(1).max(80),
  facing:z.enum(['front','back','side']).optional(),
});

const inputSchema = z.object({
  missionId: z.string().uuid(),
  defaultPreset: z.string().min(1).max(80),
  uiTheme: z.string().min(1).max(80).default('anime_noir'),
  stageVisuals: z.record(z.string(), stageVisualSchema),
  actorVisuals: z.record(z.string(), z.record(z.string(),actorVisualSchema)).default({}),
});

export async function saveMissionVisual(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Configuração visual inválida.' };
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada.' };
  const { data: isAdmin } = await sb.rpc('is_admin');
  if (!isAdmin) return { ok: false, error: 'Acesso administrativo necessário.' };
  const { data: row, error: readError } = await sb.from('missions').select('mission_json').eq('id', parsed.data.missionId).maybeSingle();
  if (readError || !row) return { ok: false, error: 'Missão não encontrada.' };
  const mj: any = structuredClone(row.mission_json || {});
  mj.visual_theme = { ...(mj.visual_theme || {}), style:'anime_chibi_3q', ui:parsed.data.uiTheme, default_preset:parsed.data.defaultPreset, contract:'jurisquest.mission.v4-unified' };
  mj.stages = (mj.stages || []).map((stage: any) => {
    const visual = parsed.data.stageVisuals[stage.id];
    const actorVisuals=parsed.data.actorVisuals[stage.id]||{};
    const actors=(stage.actors||[]).map((actor:any)=>{
      const av=actorVisuals[actor.id];
      return av?{...actor,visual:{...(actor.visual||{}),...av}}:actor;
    });
    return { ...stage, ...(visual?{visual:{...(stage.visual||{}),...visual}}:{}), actors };
  });
  const { error } = await sb.from('missions').update({ mission_json: mj, updated_at: new Date().toISOString() }).eq('id', parsed.data.missionId);
  return error ? { ok:false, error:error.message } : { ok:true };
}

export async function saveRuntimeVisualDefaults(input: unknown) {
  const schema = z.object({ defaultPreset:z.string().min(1).max(80), rendererQuality:z.enum(['low','balanced','high']), mobileQuality:z.enum(['low','balanced','high']) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Configuração inválida.' };
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Sessão expirada.' };
  const { data: isAdmin } = await sb.rpc('is_admin');
  if (!isAdmin) return { ok: false, error: 'Acesso administrativo necessário.' };
  const { error } = await sb.from('game_runtime_settings').update({ default_preset:parsed.data.defaultPreset, renderer_quality:parsed.data.rendererQuality, mobile_quality:parsed.data.mobileQuality, updated_at:new Date().toISOString() }).eq('id',1);
  return error ? { ok:false, error:error.message } : { ok:true };
}
