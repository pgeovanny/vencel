'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resolveVisualConfig, type RuntimeSettings, type VisualPreset } from '@/lib/game/visual-contract';

type Props = {
  missionId: string;
  mission: any;
  userId: string;
  initialCharacter?: any;
  initialProgress?: any;
  visualPresets?: VisualPreset[];
  runtimeSettings?: RuntimeSettings | null;
};

type Runtime = {
  stageId: string;
  facts: string[];
  decisions: string[];
  wrong: string[];
  attemptCounts: Record<string, number>;
  started: boolean;
  completed: boolean;
};

type Near = { type: 'actor' | 'object'; id: string; label: string } | null;

type Overlay =
  | null
  | { type: 'brief' }
  | { type: 'fact'; fact: any }
  | { type: 'decision'; d: any }
  | { type: 'feedback'; d: any; choice: any; correct: boolean }
  | { type: 'transition'; next: string; data: any }
  | { type: 'complete'; score: number };

const DESIGN_W = 1200;
const DESIGN_H = 760;

const CHAR: Record<string, any> = {
  police: { body: 0x315f8d, trim: 0x9be8f6, pants: 0x1d3149, hair: 0x2e251f, skin: 0xdba985, cap: true, badge: true },
  delegate: { body: 0x303947, trim: 0xe2c572, pants: 0x222a34, hair: 0x38291f, skin: 0xd8a982, badge: true },
  clerk: { body: 0x536b79, trim: 0xc2dbe2, pants: 0x34414a, hair: 0x5b3a27, skin: 0xe0b28c },
  civilian: { body: 0x9b5d7c, trim: 0xf0c3d5, pants: 0x405362, hair: 0x57382a, skin: 0xe0b18a },
  security: { body: 0x8c7431, trim: 0xe9d48e, pants: 0x34352f, hair: 0x2b251f, skin: 0xd3a17a, badge: true },
  suspect: { body: 0x6b4944, trim: 0xad8278, pants: 0x292b31, hair: 0x2e241f, skin: 0xca9670 },
  medic: { body: 0xc84f58, trim: 0xffffff, pants: 0x354f55, hair: 0x4b3027, skin: 0xe4b68e, medic: true },
  prosecutor: { body: 0x39445f, trim: 0xc3a55f, pants: 0x222937, hair: 0x31251f, skin: 0xdcad86, folder: true },
  judge: { body: 0x24282d, trim: 0xc3a55f, pants: 0x1b1e22, hair: 0x443229, skin: 0xe0b08a, judge: true },
  court_staff: { body: 0x5b6570, trim: 0xa4bec9, pants: 0x30363d, hair: 0x3a2b24, skin: 0xd7a67e },
  operational: { body: 0x315e82, trim: 0x75d0e5, pants: 0x253544, hair: 0x2d2420, skin: 0xdba983, badge: true },
  investigator: { body: 0x486a55, trim: 0xa7d2ad, pants: 0x26372e, hair: 0x332820, skin: 0xd6a47d },
  analyst: { body: 0x57527d, trim: 0xc5c1ef, pants: 0x302d42, hair: 0x3a2c23, skin: 0xddac85 },
  formal: { body: 0x46515b, trim: 0xb9c6cc, pants: 0x252c32, hair: 0x2c2420, skin: 0xd9a77f },
};

const PALETTES: Record<string, any> = {
  urban_blue: { sky: 0x06121a, ground: 0x26353c, ground2: 0x2d3d44, wall: 0x183843, light: 0xffd487, cool: 0x61d8ef, green: 0x355b50, wood: 0x725846, accent: 0x69d8e4 },
  rain_blue: { sky: 0x041018, ground: 0x192a34, ground2: 0x223741, wall: 0x102e3b, light: 0xffc774, cool: 0x65cfff, green: 0x294b45, wood: 0x5d4d43, accent: 0x73d6ff },
  day_clean: { sky: 0x8ec8df, ground: 0xb8b8b0, ground2: 0xc9c7bf, wall: 0xe1e8e5, light: 0xffefb5, cool: 0x45b9cf, green: 0x6d9b6d, wood: 0x8b7158, accent: 0x45bccb },
  sunset_warm: { sky: 0xd78a6f, ground: 0x8c8278, ground2: 0xa5968a, wall: 0xcf9e77, light: 0xffbe68, cool: 0x72bdd6, green: 0x64745b, wood: 0x75513e, accent: 0xf0a95e },
  station_cool: { sky: 0x10232b, ground: 0xaeb5b5, ground2: 0xc5cac9, wall: 0xdfe6e4, light: 0xecfbff, cool: 0x67d6e2, green: 0x59786c, wood: 0x796a5b, accent: 0x60cbd5 },
  station_warm: { sky: 0x0e1d23, ground: 0xa9a49b, ground2: 0xbdb8ae, wall: 0xd9d1c2, light: 0xffdda0, cool: 0x6fcbd3, green: 0x61745e, wood: 0x7d6652, accent: 0xe1bd72 },
  court_warm: { sky: 0x1c2024, ground: 0xcfc7b8, ground2: 0xe2dacb, wall: 0xefe8db, light: 0xffe5ac, cool: 0x6db7c8, green: 0x6c8468, wood: 0x77533d, accent: 0xd7b56a },
  court_evening: { sky: 0x171b22, ground: 0xb9aa99, ground2: 0xd2c3b0, wall: 0xdfc7aa, light: 0xffc36f, cool: 0x789db7, green: 0x63725d, wood: 0x684636, accent: 0xe3b56b },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function GameRuntimePaid({
  missionId,
  mission,
  userId,
  initialCharacter,
  initialProgress,
  visualPresets = [],
  runtimeSettings = null,
}: Props) {
  const stages = useMemo(
    () => [...(mission.stages || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    [mission],
  );
  const resume = initialProgress?.runtime_state || {};
  const first = stages[0]?.id || '';
  const initial: Runtime = {
    stageId: resume.stageId || initialProgress?.current_stage || first,
    facts: resume.facts || initialProgress?.facts || [],
    decisions: resume.decisions || [],
    wrong: resume.wrong || initialProgress?.mistakes || [],
    attemptCounts: resume.attemptCounts || initialProgress?.decisions || {},
    started: resume.started ?? !!initialProgress,
    completed: initialProgress?.status === 'completed',
  };

  const [runtime, setRuntime] = useState(initial);
  const runtimeRef = useRef(initial);
  const [near, setNear] = useState<Near>(null);
  const nearRef = useRef<Near>(null);
  const [overlay, setOverlay] = useState<Overlay>(initial.started ? null : { type: 'brief' });
  const [dialog, setDialog] = useState<any>(null);
  const [notebook, setNotebook] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState('Sincronizando');
  const [engineError, setEngineError] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const move = useRef({ x: 0, y: 0 });
  const supabase = useRef(createClient());

  const character = initialCharacter || {
    character_name: 'Jogador',
    role_title: 'Candidato',
    archetype: 'operational',
  };
  const stage = stages.find((s: any) => s.id === runtime.stageId) || stages[0];
  const stageIndex = Math.max(0, stages.findIndex((s: any) => s.id === stage?.id));

  useEffect(() => { runtimeRef.current = runtime; }, [runtime]);
  useEffect(() => { nearRef.current = near; }, [near]);

  const hasFact = (id: string, r = runtimeRef.current) => r.facts.includes(id);
  const hasDecision = (id: string, r = runtimeRef.current) => r.decisions.includes(id);
  const getDecision = (id: string) => (mission.decisions || []).find((d: any) => d.id === id);

  const objectiveDone = (o: any, r = runtimeRef.current) => {
    if (!o) return true;
    if (o.type === 'actor' || o.type === 'object') return hasFact(o.target, r);
    if (o.type === 'decision') return hasDecision(o.target, r);
    return false;
  };

  const currentObjective = (r = runtimeRef.current) => {
    const currentStage = stages.find((x: any) => x.id === r.stageId);
    return (currentStage?.objectives || []).find((o: any) => o.type === 'advance' || !objectiveDone(o, r)) || null;
  };

  const decisionReady = (d: any, r = runtimeRef.current) =>
    (d?.requires_facts || []).every((f: string) => hasFact(f, r)) &&
    (d?.depends_on || []).every((x: string) => hasDecision(x, r));

  const progress = (r = runtimeRef.current) => {
    const objectives = stages.flatMap((s: any) => (s.objectives || []).filter((o: any) => o.type !== 'advance'));
    if (!objectives.length) return 0;
    return Math.round((objectives.filter((o: any) => objectiveDone(o, r)).length / objectives.length) * 100);
  };

  const objective = currentObjective(runtime);
  const targetEntity = useMemo(() => {
    if (!objective || !stage) return null;
    if (objective.type === 'actor') return (stage.actors || []).find((x: any) => x.id === objective.target) || null;
    if (objective.type === 'object') return (stage.objects || []).find((x: any) => x.id === objective.target) || null;
    return null;
  }, [objective, stage]);

  useEffect(() => { setWhyOpen(false); }, [runtime.stageId, objective?.target, objective?.type]);

  async function save(next: Runtime, complete = false, score: number | null = null) {
    setCloud('Salvando…');
    const { error } = await supabase.current.from('mission_progress').upsert({
      user_id: userId, mission_id: missionId, status: complete ? 'completed' : 'in_progress', current_stage: next.stageId,
      progress_percent: complete ? 100 : progress(next), score_first_try: complete ? score : null, score_best: complete ? score : null,
      mistakes: next.wrong, facts: next.facts, decisions: next.attemptCounts, runtime_state: next,
      started_at: initialProgress?.started_at || new Date().toISOString(), completed_at: complete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,mission_id' });
    setCloud(error ? 'Falha ao salvar' : 'Progresso salvo');
    if (error) console.error(error);
  }

  function apply(next: Runtime, persist = true) { runtimeRef.current = next; setRuntime(next); if (persist) void save(next); }
  function registerFact(fact: any) { if (!fact?.id || hasFact(fact.id)) { setOverlay(null); return; } const next = { ...runtimeRef.current, facts: [...runtimeRef.current.facts, fact.id] }; apply(next); setOverlay({ type: 'fact', fact }); }
  function interactNear() { const n = nearRef.current; if (!n) return; const currentStage = stages.find((x: any) => x.id === runtimeRef.current.stageId); if (n.type === 'actor') { const actor = (currentStage?.actors || []).find((x: any) => x.id === n.id); if (actor) setDialog({ actor, index: 0 }); } else { const object = (currentStage?.objects || []).find((x: any) => x.id === n.id); if (object?.fact) registerFact(object.fact); } }

  async function answer(d: any, index: number) {
    const choice = d.choices?.[index]; if (!choice) return;
    const r = runtimeRef.current; const attempt = (r.attemptCounts[d.id] || 0) + 1; const correct = !!choice.correct;
    const wrong = !correct && attempt === 1 && !r.wrong.includes(d.id) ? [...r.wrong, d.id] : r.wrong;
    const base = { ...r, wrong, attemptCounts: { ...r.attemptCounts, [d.id]: attempt } };
    const { error } = await supabase.current.from('decision_attempts').insert({ user_id: userId, mission_id: missionId, decision_id: d.id, attempt_no: attempt, selected_index: index, selected_text: choice.text, correct, mode: 'mission', feedback_snapshot: d.feedback || {} });
    if (error) console.error(error);
    const next = correct ? { ...base, decisions: base.decisions.includes(d.id) ? base.decisions : [...base.decisions, d.id] } : base;
    apply(next); setOverlay({ type: 'feedback', d, choice, correct });
  }

  async function finish() {
    const r = runtimeRef.current; const total = Math.max(1, (mission.decisions || []).length); const score = Math.max(0, Math.round(((total - r.wrong.length) / total) * 100));
    const next = { ...r, completed: true }; runtimeRef.current = next; setRuntime(next); await save(next, true, score);
    const intervals = mission.review_plan?.interval_days || [1, 7, 30];
    const { data: existing } = await supabase.current.from('review_queue').select('interval_days').eq('user_id', userId).eq('mission_id', missionId).eq('status', 'pending');
    const have = new Set((existing || []).map((x: any) => x.interval_days));
    const rows = intervals.filter((d: number) => !have.has(d)).map((d: number) => ({ user_id: userId, mission_id: missionId, due_at: new Date(Date.now() + d * 86400000).toISOString(), interval_days: d, reason: `Revisão ${d}d: ${mission.title}`, status: 'pending' }));
    if (rows.length) await supabase.current.from('review_queue').insert(rows); setOverlay({ type: 'complete', score });
  }

  function primary() {
    const r = runtimeRef.current; const currentStage = stages.find((x: any) => x.id === r.stageId); const o = currentObjective(r);
    if (o?.type === 'actor' || o?.type === 'object') { const n = nearRef.current; if (n && n.type === o.type && n.id === o.target) interactNear(); return; }
    if (o?.type === 'decision') { const d = getDecision(o.target); if (decisionReady(d, r)) setOverlay({ type: 'decision', d }); return; }
    if (o?.type === 'advance') { const i = stages.findIndex((x: any) => x.id === currentStage?.id); const next = stages[i + 1]; if (next) setOverlay({ type: 'transition', next: next.id, data: currentStage?.transition || {} }); return; }
    if (!o && currentStage?.final) void finish();
  }

  function goStage(id: string) { const next = { ...runtimeRef.current, stageId: id }; apply(next); setOverlay(null); sceneRef.current?.buildStage?.(stages.find((s: any) => s.id === id)); }

  const nearIsTarget = !!(objective && (objective.type === 'actor' || objective.type === 'object') && near && near.type === objective.type && near.id === objective.target);
  const objectiveDecisionReady = objective?.type === 'decision' ? decisionReady(getDecision(objective.target), runtime) : false;
  const primaryEnabled = ready && (nearIsTarget || (objective?.type === 'decision' && objectiveDecisionReady) || objective?.type === 'advance' || (!objective && stage?.final));
  const targetName = targetEntity?.name || objective?.title || '';
  const guidanceText = !ready ? 'Preparando o cenário' : objective?.type === 'actor' ? (nearIsTarget ? `Fale com ${targetName}` : `Vá até ${targetName}`) : objective?.type === 'object' ? (nearIsTarget ? (targetEntity?.interaction_text || `Examine ${targetName}`) : `Localize ${targetName}`) : objective?.type === 'decision' ? (objectiveDecisionReady ? objective.title : 'Complete os passos anteriores') : objective?.type === 'advance' ? (objective.title || 'Avance para a próxima etapa') : (!objective && stage?.final) ? 'Concluir missão' : 'Explore o cenário';
  const primaryText = !ready ? 'Carregando cenário…' : objective?.type === 'actor' ? (nearIsTarget ? `Falar com ${targetName}` : `Siga o marcador até ${targetName}`) : objective?.type === 'object' ? (nearIsTarget ? (targetEntity?.interaction_text || `Examinar ${targetName}`) : `Siga o marcador até ${targetName}`) : objective?.type === 'decision' ? (objectiveDecisionReady ? 'Abrir decisão jurídica' : 'Colete os fatos necessários') : objective?.type === 'advance' ? 'Continuar para a próxima etapa' : (!objective && stage?.final) ? 'Concluir missão' : 'Explore o cenário';

  useEffect(() => {
    let game: any; let cancelled = false;
    (async () => {
      try {
        const mod: any = await import('phaser'); if (cancelled || !host.current) return; const P: any = mod.default || mod;
        class PremiumDesktopScene extends P.Scene {
          player: any; actors: Record<string, any> = {}; objects: Record<string, any> = {}; cursors: any; keys: any; frozen = true; lastNear = ''; visual: any = {}; pal: any = {}; worldW = DESIGN_W; worldH = DESIGN_H; isDesktop = true; objectiveBeacon: any = null; focusRing: any = null; resizeTimer: any = null;
          constructor() { super('premiumDesktop'); }
          create() { sceneRef.current = this; this.cursors = this.input.keyboard?.createCursorKeys(); this.keys = this.input.keyboard?.addKeys('W,A,S,D,SHIFT,E,ENTER'); this.input.keyboard?.on('keydown-E', () => { if (nearRef.current) interactNear(); else primary(); }); this.input.keyboard?.on('keydown-ENTER', primary); this.ensureTextures(); this.buildStage(stages.find((x: any) => x.id === runtimeRef.current.stageId) || stages[0]); this.scale.on('resize', this.handleResize, this); setReady(true); setCloud('Progresso salvo'); }
          handleResize() { clearTimeout(this.resizeTimer); this.resizeTimer = setTimeout(() => this.buildStage(stages.find((x: any) => x.id === runtimeRef.current.stageId) || stages[0]), 100); }
          ensureTextures() {
            if (!this.textures.exists('jq-asphalt')) { const g = this.make.graphics({ x: 0, y: 0, add: false }); g.fillStyle(0x26343b, 1).fillRect(0, 0, 128, 128); for (let i = 0; i < 90; i++) { const x = (i * 47) % 128, y = (i * 79) % 128; g.fillStyle(i % 2 ? 0xffffff : 0x000000, i % 2 ? 0.035 : 0.05); g.fillCircle(x, y, 1 + (i % 2)); } g.lineStyle(1, 0x10181c, 0.2); g.lineBetween(18, 92, 49, 79); g.lineBetween(49, 79, 71, 91); g.generateTexture('jq-asphalt', 128, 128); g.destroy(); }
            if (!this.textures.exists('jq-tile')) { const g = this.make.graphics({ x: 0, y: 0, add: false }); g.fillStyle(0xb8b8b0, 1).fillRect(0, 0, 96, 96); g.lineStyle(1, 0xffffff, 0.12).strokeRect(0, 0, 96, 96); g.fillStyle(0xffffff, 0.035).fillRect(7, 9, 32, 2); g.generateTexture('jq-tile', 96, 96); g.destroy(); }
            if (!this.textures.exists('jq-wood')) { const g = this.make.graphics({ x: 0, y: 0, add: false }); g.fillStyle(0x75543f, 1).fillRect(0, 0, 128, 64); g.lineStyle(2, 0x3c2b21, 0.22); g.lineBetween(0, 32, 128, 32); for (let x = 0; x <= 128; x += 32) g.lineBetween(x, 0, x, 64); g.lineStyle(1, 0xd2a87d, 0.08); g.lineBetween(10, 15, 55, 15); g.lineBetween(68, 46, 116, 46); g.generateTexture('jq-wood', 128, 64); g.destroy(); }
          }
          mapX(x: number) { const pad = this.isDesktop ? Math.max(42, this.worldW * 0.025) : 0; return this.isDesktop ? pad + (x / DESIGN_W) * (this.worldW - pad * 2) : x; }
          mapY(y: number) { const top = this.isDesktop ? Math.max(86, this.worldH * 0.09) : 0; const bottom = this.isDesktop ? Math.max(78, this.worldH * 0.09) : 0; return this.isDesktop ? top + (y / DESIGN_H) * (this.worldH - top - bottom) : y; }
          configureWorld() { const vw = this.scale.width, vh = this.scale.height; this.isDesktop = vw >= 900; if (this.isDesktop) { this.worldW = vw; this.worldH = vh; this.physics.world.setBounds(0, 0, this.worldW, this.worldH); this.cameras.main.stopFollow(); this.cameras.main.setZoom(1); this.cameras.main.setScroll(0, 0); this.cameras.main.setBounds(0, 0, this.worldW, this.worldH); } else { this.worldW = DESIGN_W; this.worldH = DESIGN_H; this.physics.world.setBounds(0, 0, DESIGN_W, DESIGN_H); this.cameras.main.setBounds(0, 0, DESIGN_W, DESIGN_H); } }
          textureFloor(key: string, tint: number, alpha = 1) { const floor = this.add.tileSprite(0, 0, this.worldW, this.worldH, key).setOrigin(0).setDepth(-50).setAlpha(alpha); floor.setTint(tint); return floor; }
          lamp(x: number, y: number) { const pole = this.add.rectangle(x, y, 8, 92, 0x17242a).setDepth(y - 5); pole.setOrigin(0.5, 1); const bulb = this.add.circle(x, y - 92, 9, this.pal.light).setDepth(y - 4); const halo = this.add.circle(x, y - 92, 78, this.pal.light, 0.075).setBlendMode(P.BlendModes.ADD).setDepth(-5); return { pole, bulb, halo }; }
          car(x: number, y: number, color: number, angle = 0, emergency = false) { const c = this.add.container(x, y).setRotation(P.Math.DegToRad(angle)).setDepth(y); c.add(this.add.ellipse(6, 18, 118, 34, 0x000000, 0.24)); c.add(this.add.rectangle(0, 0, 112, 46, color).setStrokeStyle(2, 0x10181d, 0.65)); c.add(this.add.rectangle(0, -9, 59, 20, 0x12232c, 0.96)); c.add(this.add.rectangle(-43, 20, 23, 8, 0x111719)); c.add(this.add.rectangle(43, 20, 23, 8, 0x111719)); c.add(this.add.rectangle(-52, -2, 5, 17, 0xe9c56b, 0.85)); c.add(this.add.rectangle(52, -2, 5, 17, 0xbf3940, 0.85)); if (emergency) { c.add(this.add.rectangle(0, -29, 36, 8, 0x25363e)); c.add(this.add.rectangle(-9, -29, 14, 5, 0x55bce8)); c.add(this.add.rectangle(9, -29, 14, 5, 0xe45454)); } return c; }
          tree(x: number, y: number) { const c = this.add.container(x, y).setDepth(y); c.add(this.add.ellipse(0, 24, 72, 20, 0x000000, 0.16)); c.add(this.add.rectangle(0, 13, 12, 42, 0x674b37)); c.add(this.add.circle(-18, -10, 28, this.pal.green)); c.add(this.add.circle(14, -15, 31, this.pal.green)); c.add(this.add.circle(0, -34, 27, this.pal.green)); return c; }
          desk(x: number, y: number, w = 170) { const c = this.add.container(x, y).setDepth(y); c.add(this.add.ellipse(0, 30, w + 12, 23, 0x000000, 0.15)); c.add(this.add.rectangle(0, 0, w, 55, this.pal.wood).setStrokeStyle(2, 0x3b3027, 0.6)); c.add(this.add.rectangle(0, -12, 62, 30, 0x23343b)); c.add(this.add.rectangle(0, -13, 50, 20, 0x0e171b)); return c; }
          environment(stageDef: any) {
            this.visual = resolveVisualConfig(stageDef, mission, visualPresets, runtimeSettings || undefined); this.pal = PALETTES[this.visual.palette] || PALETTES.urban_blue; this.cameras.main.setBackgroundColor(this.pal.sky); const w = this.worldW, h = this.worldH;
            if (stageDef.environment === 'parking_night' || stageDef.environment === 'parking_day') { this.textureFloor('jq-asphalt', this.pal.ground, 1); this.add.rectangle(w / 2, h * 0.08, w, h * 0.16, this.pal.wall).setDepth(-45); this.add.rectangle(w / 2, h * 0.155, w, 3, this.pal.cool, 0.18).setDepth(-44); for (let x = w * 0.05; x < w * 0.96; x += w * 0.085) this.add.rectangle(x, h * 0.075, w * 0.045, h * 0.038, 0x0f252d).setStrokeStyle(1, this.pal.cool, 0.14).setDepth(-43); const lotTop = h * 0.25, lotBottom = h * 0.64; this.add.rectangle(w / 2, lotBottom, w * 0.95, 4, this.pal.light, 0.36).setDepth(-35); const slots = 12; for (let i = 0; i <= slots; i++) { const x = w * 0.04 + (i / slots) * w * 0.92; this.add.rectangle(x, (lotTop + lotBottom) / 2, 3, lotBottom - lotTop, 0xe7dfb5, 0.28).setDepth(-34); } for (let i = 0; i < 3; i++) this.lamp(w * (0.18 + i * 0.32), h * 0.27); this.car(w * 0.16, h * 0.43, 0x315c8f, -5); this.car(w * 0.77, h * 0.45, 0xe6ecee, 3, true); this.car(w * 0.61, h * 0.78, 0x555f66, 2); this.tree(w * 0.045, h * 0.82); this.tree(w * 0.92, h * 0.82); this.add.text(w * 0.04, h * 0.115, 'CENTRO COMERCIAL AURORA', { fontFamily: 'Inter, sans-serif', fontSize: `${clamp(h * 0.022, 16, 24)}px`, fontStyle: 'bold', color: '#dce8e5' }).setDepth(-40); if (this.visual.weather === 'rain') for (let i = 0; i < 110; i++) { const x = (i * 137) % w, y = (i * 79) % h; const line = this.add.line(0, 0, x, y, x - 7, y + 22, 0x91d8ff, 0.2).setOrigin(0).setDepth(900); this.tweens.add({ targets: line, y: 26, x: -8, duration: 600 + (i % 5) * 90, repeat: -1 }); }
            } else if (stageDef.environment === 'police_station') { this.textureFloor('jq-tile', this.pal.ground, 1); this.add.rectangle(w / 2, h * 0.105, w, h * 0.21, this.pal.wall).setDepth(-45); this.add.rectangle(w / 2, h * 0.205, w, 4, this.pal.cool, 0.16).setDepth(-44); for (let i = 0; i < 6; i++) this.add.rectangle(w * (0.12 + i * 0.15), h * 0.08, w * 0.075, h * 0.075, 0x173943).setStrokeStyle(2, this.pal.cool, 0.18).setDepth(-43); this.add.text(w * 0.04, h * 0.12, 'DELEGACIA REGIONAL • PLANTÃO', { fontFamily: 'Inter, sans-serif', fontSize: `${clamp(h * 0.023, 16, 24)}px`, fontStyle: 'bold', color: '#eef3ef' }).setDepth(-40); this.desk(w * 0.29, h * 0.48, w * 0.2); this.desk(w * 0.67, h * 0.48, w * 0.24); this.add.rectangle(w * 0.88, h * 0.48, w * 0.11, h * 0.34, 0x5b625f).setStrokeStyle(3, 0x38403f).setDepth(-20); for (let i = 0; i < 4; i++) this.add.rectangle(w * 0.88, h * (0.35 + i * 0.08), w * 0.085, 3, 0xc4bda8, 0.42).setDepth(-19); this.add.rectangle(w * 0.12, h * 0.48, w * 0.13, h * 0.28, 0x40505a).setStrokeStyle(3, 0x2e3940).setDepth(-20); this.add.rectangle(w * 0.12, h * 0.38, w * 0.085, h * 0.07, 0x101b20).setDepth(-19);
            } else { this.textureFloor('jq-wood', this.pal.wood, 1); this.add.rectangle(w / 2, h * 0.1, w, h * 0.2, this.pal.wall).setDepth(-45); for (let i = 0; i < 7; i++) this.add.rectangle(w * (0.08 + i * 0.14), h * 0.09, w * 0.075, h * 0.09, 0xb8e2ee, 0.3).setStrokeStyle(2, 0x6c8790, 0.42).setDepth(-43); this.add.rectangle(w / 2, h * 0.63, w * 0.52, h * 0.35, 0x8b2f33, 0.22).setDepth(-30); this.add.rectangle(w / 2, h * 0.29, w * 0.38, h * 0.09, this.pal.wood).setStrokeStyle(3, 0x3b2b23, 0.55).setDepth(-20); for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) { const bx = w * 0.22 + col * w * 0.14, by = h * 0.52 + row * h * 0.095; this.add.rectangle(bx, by, w * 0.095, h * 0.045, 0x6c4b38).setStrokeStyle(2, 0x3a2921, 0.5).setDepth(-15); } this.add.text(w * 0.04, h * 0.13, 'FÓRUM • VARA DO JÚRI', { fontFamily: 'Inter, sans-serif', fontSize: `${clamp(h * 0.023, 16, 24)}px`, fontStyle: 'bold', color: this.visual.time === 'day' ? '#263136' : '#f0ede4' }).setDepth(-40); }
            if (this.visual.time === 'night' || this.visual.time === 'sunset') this.add.rectangle(w / 2, h / 2, w, h, this.visual.time === 'night' ? 0x07151d : 0x46261b, this.visual.time === 'night' ? 0.16 : 0.08).setDepth(800);
            if (this.visual.vignette) { const top = this.add.rectangle(w / 2, 0, w, h * 0.12, 0x000000, this.visual.vignette * 0.28).setOrigin(0.5, 0).setDepth(850); const bottom = this.add.rectangle(w / 2, h, w, h * 0.12, 0x000000, this.visual.vignette * 0.3).setOrigin(0.5, 1).setDepth(850); top.setScrollFactor(0); bottom.setScrollFactor(0); }
          }
          nameplate(name: string, role: string, target = false) { const c = this.add.container(0, 0).setDepth(1200); const width = clamp(Math.max(name.length * 7.4 + 30, target ? 128 : 92), 92, 190); const bg = this.add.rectangle(0, 0, width, target ? 38 : 30, 0x06151a, target ? 0.97 : 0.82).setStrokeStyle(target ? 2 : 1, target ? this.pal.accent : 0x36535b, target ? 0.85 : 0.5); const t = this.add.text(0, target ? -7 : -2, name, { fontFamily: 'Inter, sans-serif', fontSize: target ? '12px' : '10px', fontStyle: 'bold', color: target ? '#ffffff' : '#dbe4e2' }).setOrigin(0.5); c.add([bg, t]); if (target) c.add(this.add.text(0, 9, role, { fontFamily: 'Inter, sans-serif', fontSize: '8px', fontStyle: 'bold', color: '#75d6df' }).setOrigin(0.5)); return c; }
          chibi(name: string, role: string, styleName: string, x: number, y: number, isPlayer = false) { const style = CHAR[styleName] || CHAR.civilian; const scale = this.isDesktop ? clamp(this.worldH / 900, 0.9, 1.12) : 1; const c = this.add.container(x, y).setScale(scale); c.add(this.add.ellipse(0, 31, 54, 17, 0x000000, 0.2)); const legs = this.add.container(0, 18); const l1 = this.add.rectangle(-10, 10, 12, 31, style.pants).setStrokeStyle(2, 0x172127, 0.55); const l2 = this.add.rectangle(10, 10, 12, 31, style.pants).setStrokeStyle(2, 0x172127, 0.55); legs.add([l1, l2]); const torso = this.add.rectangle(0, -7, 48, 47, style.body).setStrokeStyle(3, 0x172127, 0.62); const chestLight = this.add.rectangle(-15, -14, 6, 26, style.trim, 0.34); const a1 = this.add.rectangle(-30, -5, 12, 38, style.body).setStrokeStyle(2, 0x172127, 0.5); const a2 = this.add.rectangle(30, -5, 12, 38, style.body).setStrokeStyle(2, 0x172127, 0.5); const neck = this.add.rectangle(0, -32, 13, 11, style.skin); const head = this.add.circle(0, -54, 25, style.skin).setStrokeStyle(3, 0x51352a, 0.55); const ear1 = this.add.circle(-24, -52, 5, style.skin); const ear2 = this.add.circle(24, -52, 5, style.skin); const hair = this.add.ellipse(0, -69, 49, 24, style.hair); const fringe = this.add.rectangle(-7, -64, 29, 9, style.hair).setAngle(-8); const eye1 = this.add.circle(-9, -54, 2.2, 0x2a211d); const eye2 = this.add.circle(9, -54, 2.2, 0x2a211d); const mouth = this.add.rectangle(0, -43, 8, 1.8, 0x714a3c, 0.8); c.add([legs, a1, a2, torso, chestLight, neck, ear1, ear2, head, hair, fringe, eye1, eye2, mouth]); if (style.cap) { c.add(this.add.rectangle(0, -72, 45, 9, 0x172939)); c.add(this.add.rectangle(10, -66, 30, 5, 0x172939)); } if (style.badge) c.add(this.add.circle(12, -12, 5, 0xd9bd5f).setStrokeStyle(1, 0xffe7a1)); if (style.medic) { c.add(this.add.rectangle(0, -8, 18, 6, 0xffffff)); c.add(this.add.rectangle(0, -8, 6, 18, 0xffffff)); } if (isPlayer) c.add(this.add.circle(0, 40, 28, this.pal.accent, 0.08).setStrokeStyle(2, this.pal.accent, 0.72)); this.physics.add.existing(c); const body: any = c.body; body.setSize(36, 30); body.setOffset(-18, 8); body.setCollideWorldBounds(true); (c as any).anim = { l1, l2, a1, a2 }; if (!isPlayer) (c as any).jqLabel = this.nameplate(name, role, false); return c; }
          prop(def: any, x: number, y: number) { const c = this.add.container(x, y).setDepth(y); const glow = this.add.circle(0, 0, 46, this.pal.accent, 0).setBlendMode(P.BlendModes.ADD); c.add(glow); if (def.kind === 'camera') { c.add(this.add.rectangle(0, 0, 46, 26, 0x18262c).setStrokeStyle(2, 0x63838c)); c.add(this.add.circle(13, 0, 9, this.pal.cool)); c.add(this.add.rectangle(-15, 0, 8, 13, 0x30464e)); } else if (def.kind === 'evidence') { c.add(this.add.rectangle(0, 0, 58, 9, 0xa5a09a).setAngle(-25)); c.add(this.add.rectangle(-25, 9, 22, 14, 0x5c3c2d).setAngle(-25)); } else { c.add(this.add.rectangle(0, 0, 58, 42, 0xe3ddc7).setStrokeStyle(3, 0x59646b)); c.add(this.add.rectangle(0, -9, 40, 4, 0x718087)); c.add(this.add.rectangle(0, 1, 40, 4, 0x718087)); c.add(this.add.rectangle(0, 11, 31, 3, 0x9aa4a8)); } (c as any).glow = glow; (c as any).jqLabel = this.nameplate(def.name || 'Objeto', def.role || 'EVIDÊNCIA', true); (c as any).jqLabel.setVisible(false); return c; }
          questBeacon() { const c = this.add.container(0, 0).setDepth(1400); const beam = this.add.rectangle(0, 28, 3, 62, this.pal.accent, 0.25).setOrigin(0.5, 1); const ring = this.add.circle(0, 0, 18, this.pal.accent, 0.08).setStrokeStyle(2, this.pal.accent, 0.9); const diamond = this.add.rectangle(0, 0, 12, 12, this.pal.accent).setRotation(Math.PI / 4); c.add([beam, ring, diamond]); this.tweens.add({ targets: ring, scale: 1.5, alpha: 0.02, duration: 900, yoyo: true, repeat: -1 }); this.tweens.add({ targets: diamond, y: -7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); return c; }
          focusTarget(x: number, y: number) { if (this.focusRing) this.focusRing.destroy(); this.focusRing = this.add.ellipse(x, y + 30, 74, 28, this.pal.accent, 0.05).setStrokeStyle(2, this.pal.accent, 0.75).setDepth(1300); this.tweens.add({ targets: this.focusRing, scaleX: 1.18, scaleY: 1.18, alpha: 0.01, duration: 750, yoyo: true, repeat: -1 }); }
          buildStage(stageDef: any) { if (!stageDef) return; this.children.removeAll(true); this.actors = {}; this.objects = {}; this.lastNear = ''; this.objectiveBeacon = null; this.focusRing = null; setNear(null); this.configureWorld(); this.environment(stageDef); const spawn = stageDef.player_spawn || { x: 600, y: 650 }; this.player = this.chibi(character.character_name || 'Jogador', character.role_title || 'Candidato', character.archetype || 'operational', this.mapX(spawn.x), this.mapY(spawn.y), true); for (const actor of stageDef.actors || []) { const go = this.chibi(actor.name, actor.role, actor.visual?.archetype || actor.style || 'civilian', this.mapX(actor.position?.x || 400), this.mapY(actor.position?.y || 350), false); this.actors[actor.id] = { def: actor, go }; } for (const object of stageDef.objects || []) { const go = this.prop(object, this.mapX(object.position?.x || 500), this.mapY(object.position?.y || 300)); this.objects[object.id] = { def: object, go }; } this.objectiveBeacon = this.questBeacon(); if (!this.isDesktop) { const zoom = Number(runtimeSettings?.settings?.camera_zoom_mobile || 0.86); this.cameras.main.startFollow(this.player, true, 0.12, 0.12); this.cameras.main.setZoom(zoom); } }
          update(time: number) { if (!this.player) return; const p: any = this.player; const speed = this.keys?.SHIFT?.isDown ? 270 : 185; const kx = ((this.keys?.D?.isDown || this.cursors?.right?.isDown) ? 1 : 0) - ((this.keys?.A?.isDown || this.cursors?.left?.isDown) ? 1 : 0); const ky = ((this.keys?.S?.isDown || this.cursors?.down?.isDown) ? 1 : 0) - ((this.keys?.W?.isDown || this.cursors?.up?.isDown) ? 1 : 0); const dx = kx + move.current.x, dy = ky + move.current.y, len = Math.hypot(dx, dy), moving = !this.frozen && len > 0.05; if (moving) p.body.setVelocity((dx / len) * speed, (dy / len) * speed); else p.body.setVelocity(0, 0); if (p.anim) { const q = moving ? Math.sin(time / 90) : 0; p.anim.l1.y = 10 + q * 3; p.anim.l2.y = 10 - q * 3; p.anim.a1.angle = q * 9; p.anim.a2.angle = -q * 9; } p.setDepth(p.y + 20); const o = currentObjective(runtimeRef.current); const targetId = o && (o.type === 'actor' || o.type === 'object') ? o.target : null; const targetType = o?.type; let targetGo: any = null; for (const [id, entry] of Object.entries(this.actors) as any[]) { entry.go.setDepth(entry.go.y + 10); if (entry.go.jqLabel) { entry.go.jqLabel.x = entry.go.x; entry.go.jqLabel.y = entry.go.y - 98; entry.go.jqLabel.setAlpha(id === targetId ? 1 : 0.56); entry.go.jqLabel.setScale(id === targetId ? 1.04 : 0.9); } if (targetType === 'actor' && id === targetId) targetGo = entry.go; } for (const [id, entry] of Object.entries(this.objects) as any[]) { entry.go.setDepth(entry.go.y + 5); entry.go.jqLabel.x = entry.go.x; entry.go.jqLabel.y = entry.go.y - 62; const isTarget = targetType === 'object' && id === targetId; entry.go.jqLabel.setVisible(isTarget); entry.go.glow.setAlpha(isTarget ? 0.22 + Math.sin(time / 180) * 0.08 : 0); if (isTarget) targetGo = entry.go; } if (targetGo && this.objectiveBeacon) { this.objectiveBeacon.setVisible(true); this.objectiveBeacon.x = targetGo.x; this.objectiveBeacon.y = targetGo.y - 118 + Math.sin(time / 230) * 4; } else if (this.objectiveBeacon) this.objectiveBeacon.setVisible(false); let best: Near = null; let bestD = Number(runtimeSettings?.settings?.interaction_radius || 110); for (const entry of Object.values(this.actors) as any[]) { const d = P.Math.Distance.Between(p.x, p.y, entry.go.x, entry.go.y); if (d < bestD) { bestD = d; best = { type: 'actor', id: entry.def.id, label: `Conversar com ${entry.def.name}` }; } } for (const entry of Object.values(this.objects) as any[]) { const d = P.Math.Distance.Between(p.x, p.y, entry.go.x, entry.go.y); if (d < bestD) { bestD = d; best = { type: 'object', id: entry.def.id, label: entry.def.interaction_text || `Examinar ${entry.def.name}` }; } } const key = best ? `${best.type}:${best.id}` : ''; if (key !== this.lastNear) { this.lastNear = key; setNear(best); if (best) { const entity = best.type === 'actor' ? this.actors[best.id]?.go : this.objects[best.id]?.go; if (entity) this.focusTarget(entity.x, entity.y); } else if (this.focusRing) { this.focusRing.destroy(); this.focusRing = null; } } }
        }
        game = new P.Game({ type: P.AUTO, parent: host.current, width: window.innerWidth, height: window.innerHeight, backgroundColor: '#061116', physics: { default: 'arcade', arcade: { debug: false } }, scene: PremiumDesktopScene, scale: { mode: P.Scale.RESIZE, autoCenter: P.Scale.CENTER_BOTH }, render: { antialias: true, pixelArt: false, powerPreference: 'high-performance', roundPixels: false } });
      } catch (error: any) { console.error(error); setEngineError(error?.message || 'Falha ao iniciar o motor gráfico.'); setCloud('Motor indisponível'); }
    })();
    return () => { cancelled = true; try { game?.destroy(true); } catch {} sceneRef.current = null; };
  }, []);

  useEffect(() => { if (sceneRef.current) sceneRef.current.frozen = !!overlay || !!dialog || notebook || !runtime.started; }, [overlay, dialog, notebook, runtime.started]);

  const notes = runtime.facts.map((id) => stages.flatMap((s: any) => [...(s.actors || []), ...(s.objects || [])]).find((x: any) => x.fact?.id === id)?.fact).filter(Boolean);
  const rules = runtime.decisions.map((id) => getDecision(id)).filter(Boolean);
  const errors = runtime.wrong.map((id) => getDecision(id)).filter(Boolean);

  return <main className="jqGameRoot"><div ref={host} className="jqCanvas"/><div className="jqHud"><header className="jqTopbar"><div className="jqBrandBlock"><div className="jqBrand">JURIS<span>QUEST</span></div><div className="jqMissionMeta"><small>ETAPA {stageIndex + 1} DE {stages.length}</small><strong>{mission.title}</strong><span>{stage?.location || stage?.title}</span></div></div><div className="jqTopRight"><div className={`jqSync ${cloud.includes('Falha') ? 'bad' : ''}`}><i/>{cloud}</div><button onClick={() => setNotebook(true)} className="jqGhostButton">Caderno</button><a href="/dashboard" className="jqGhostButton">Sair</a></div></header><section className="jqQuestCard"><div className="jqQuestHead"><span className="jqDot"/>OBJETIVO ATUAL <b>{progress(runtime)}%</b></div><h2>{objective?.title || 'Etapa concluída'}</h2><p>{objective?.text || (stage?.final ? 'Finalize a missão.' : 'Avance para a próxima etapa.')}</p>{targetName && (objective?.type === 'actor' || objective?.type === 'object') && <div className={`jqGuide ${nearIsTarget ? 'ready' : ''}`}><span>{nearIsTarget ? 'ALVO EM ALCANCE' : 'PRÓXIMO PASSO'}</span><strong>{guidanceText}</strong></div>}{objective?.why && <button className="jqWhy" onClick={() => setWhyOpen(v => !v)}>{whyOpen ? 'Ocultar contexto' : 'Por que isso importa?'}</button>}{whyOpen && <div className="jqWhyText">{objective?.why}</div>}</section><section className="jqPlayerCard"><div className="jqAvatar">{String(character.character_name || 'JQ').slice(0, 2).toUpperCase()}</div><div><small>{character.role_title || 'CANDIDATO'}</small><b>{character.character_name || 'Jogador'}</b><span>Missão em andamento</span></div></section><div className="jqActionDock"><div className="jqActionHint"><kbd>{primaryEnabled ? 'E' : 'WASD'}</kbd><div><small>{primaryEnabled ? 'AÇÃO' : 'NAVEGAÇÃO'}</small><b>{primaryText}</b></div></div><button className="jqPrimaryAction" disabled={!primaryEnabled} onClick={primary}>{primaryEnabled ? 'Executar' : 'Aproxime-se'}</button></div>{near && !nearIsTarget && <button className="jqNearPrompt" onClick={interactNear}><kbd>E</kbd><span>{near.label}</span></button>}<div className="jqKeyboardHelp"><span>WASD</span> mover <i/> <span>SHIFT</span> correr <i/> <span>E</span> interagir</div><div className="jqProgressTrack"><i style={{width:`${progress(runtime)}%`}}/></div><div className="jqDpad"><button onPointerDown={() => { move.current.y = -1; }} onPointerUp={() => { move.current.y = 0; }}>▲</button><div><button onPointerDown={() => { move.current.x = -1; }} onPointerUp={() => { move.current.x = 0; }}>◀</button><button onClick={interactNear}>●</button><button onPointerDown={() => { move.current.x = 1; }} onPointerUp={() => { move.current.x = 0; }}>▶</button></div><button onPointerDown={() => { move.current.y = 1; }} onPointerUp={() => { move.current.y = 0; }}>▼</button></div></div>
  {engineError&&<ModalBox eyebrow="ERRO DO MOTOR" title="Não foi possível iniciar o jogo"><p>{engineError}</p><a className="mBtn" href="/dashboard">Voltar à campanha</a></ModalBox>}
  {overlay?.type==='brief'&&<ModalBox eyebrow={mission.briefing?.eyebrow||'MISSÃO INVESTIGATIVA'} title={mission.title} wide><div className="briefLead">{mission.briefing?.text||mission.summary}</div><div className="briefStats"><div><small>ETAPAS</small><b>{stages.length}</b></div><div><small>DECISÕES</small><b>{(mission.decisions||[]).length}</b></div><div><small>TEMPO</small><b>~{mission.estimated_minutes||15} min</b></div></div><div className="topicGrid">{(mission.briefing?.topics||[]).map((t:any)=><div key={t.title}><b>{t.title}</b><span>{t.subtitle}</span></div>)}</div><div className="factCard"><small>OBJETIVO DE APRENDIZAGEM</small><b>{mission.briefing?.learning_goal}</b></div><button className="mBtn primary" onClick={()=>{setOverlay(null);const next={...runtimeRef.current,started:true};runtimeRef.current=next;setRuntime(next);void save(next)}}>Entrar na ocorrência</button></ModalBox>}
  {dialog&&(()=>{const line=dialog.actor.dialogue?.[dialog.index]||{text:'Sem informação adicional.',choices:['Encerrar']};return <ModalBox eyebrow={dialog.actor.role} title={dialog.actor.name} wide><div className="dialogLayout"><Portrait styleName={dialog.actor.visual?.archetype||dialog.actor.style}/><div className="dialogContent"><p className="speech">{line.text}</p><div className="choices">{(line.choices||['Continuar']).map((choice:string,i:number)=><button key={i} onClick={()=>{if(dialog.index<(dialog.actor.dialogue?.length||1)-1)setDialog({...dialog,index:dialog.index+1});else{const fact=dialog.actor.fact;setDialog(null);if(fact)registerFact(fact)}}><span>{String.fromCharCode(65+i)}</span>{choice}</button>)}</div><button className="closeBtn" onClick={()=>setDialog(null)}>Encerrar conversa</button></div></div></ModalBox>})()}
  {overlay?.type==='fact'&&<ModalBox eyebrow={overlay.fact.kind||'FATO REGISTRADO'} title={overlay.fact.title}><div className="factCard large"><small>{overlay.fact.kind}</small><b>{overlay.fact.title}</b><p>{overlay.fact.text}</p></div><button className="mBtn primary" onClick={()=>setOverlay(null)}>Continuar investigação</button></ModalBox>}
  {overlay?.type==='decision'&&<ModalBox eyebrow="DECISÃO JURÍDICA" title={overlay.d.title} wide><p className="question">{overlay.d.question}</p><div className="choices decisionChoices">{overlay.d.choices.map((choice:any,i:number)=><button key={i} onClick={()=>void answer(overlay.d,i)}><span>{String.fromCharCode(65+i)}</span>{choice.text}</button>)}</div></ModalBox>}
  {overlay?.type==='feedback'&&<ModalBox eyebrow={overlay.correct?'DECISÃO CORRETA':'REVISE O RACIOCÍNIO'} title={overlay.d.title} wide><div className={`feedbackLead ${overlay.correct?'ok':'bad'}`}>{overlay.choice.feedback}</div><div className="feedbackGrid"><FeedbackItem label="REGRA" text={overlay.d.feedback?.rule}/><FeedbackItem label="APLICAÇÃO" text={overlay.d.feedback?.application}/><FeedbackItem label="BASE LEGAL" text={overlay.d.feedback?.legal_basis}/><FeedbackItem label="PEGADINHA" text={overlay.d.feedback?.trap}/><FeedbackItem label="MEMÓRIA" text={overlay.d.feedback?.memory} wide/></div><button className="mBtn primary" onClick={()=>overlay.correct?setOverlay(null):setOverlay({type:'decision',d:overlay.d})}>{overlay.correct?'Consolidar e continuar':'Tentar novamente'}</button></ModalBox>}
  {overlay?.type==='transition'&&<ModalBox eyebrow={overlay.data.label||'TRANSIÇÃO'} title={overlay.data.title||'Próxima etapa'}><p>{overlay.data.text||'A missão avança.'}</p><button className="mBtn primary" onClick={()=>goStage(overlay.next)}>Seguir para a próxima cena</button></ModalBox>}
  {overlay?.type==='complete'&&<ModalBox eyebrow="MISSÃO CONCLUÍDA" title={mission.title} wide><p>{mission.review_plan?.completion_text}</p><div className="resultGrid"><div><small>PROGRESSO</small><b>100%</b></div><div><small>1ª TENTATIVA</small><b>{overlay.score}%</b></div><div><small>ERROS</small><b>{runtime.wrong.length}</b></div></div><a className="mBtn primary" href="/dashboard">Voltar à campanha</a></ModalBox>}
  {notebook&&<ModalBox eyebrow="CADERNO DE CAMPO" title="O que você já consolidou" wide><div className="notebookCols"><section><h3>Fatos coletados</h3>{notes.length?notes.map((f:any)=><Note key={f.id} kicker={f.kind} title={f.title} text={f.text}/>):<p>Nenhum fato registrado.</p>}</section><section><h3>Regras consolidadas</h3>{rules.length?rules.map((d:any)=><Note key={d.id} kicker={d.feedback?.legal_basis} title={d.title} text={d.feedback?.memory||d.feedback?.rule}/>):<p>Nenhuma regra consolidada ainda.</p>}</section></div><h3>Erros para revisar</h3>{errors.length?errors.map((d:any)=><Note key={d.id} kicker="REVISAR" title={d.title} text={d.feedback?.trap}/>):<p>Nenhum erro de primeira tentativa.</p>}<button className="mBtn" onClick={()=>setNotebook(false)}>Fechar caderno</button></ModalBox>}
  <style jsx global>{CSS}</style></main>;
}

function ModalBox({eyebrow,title,children,wide=false}:{eyebrow:string;title:string;children?:any;wide?:boolean}){return <div className="modal"><section className={`sheet ${wide?'wide':''}`}><span className="ey">{eyebrow}</span><h2>{title}</h2>{children}</section></div>}
function Note({kicker,title,text}:{kicker:string;title:string;text:string;key?:any}){return <div className="note"><small>{kicker}</small><b>{title}</b><p>{text}</p></div>}
function FeedbackItem({label,text,wide=false}:{label:string;text?:string;wide?:boolean}){if(!text)return null;return <div className={`feedbackItem ${wide?'wide':''}`}><small>{label}</small><p>{text}</p></div>}
function Portrait({styleName='civilian'}:{styleName?:string}){return <div className={`portrait ${styleName}`}><div className="portraitGlow"/><div className="hair"/><div className="face"><i/><i/><b/></div><div className="uniform"><em/></div></div>}

const CSS=`body{overflow:hidden}.top{display:none!important}.jqGameRoot{position:fixed;inset:0;background:#061116;color:#eef3f1;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.jqCanvas{position:absolute;inset:0}.jqCanvas canvas{display:block!important;width:100%!important;height:100%!important}.jqHud{position:absolute;inset:0;z-index:5;pointer-events:none}.jqTopbar{position:absolute;top:14px;left:16px;right:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.jqBrandBlock{display:flex;align-items:stretch;min-width:390px;background:#06161beb;border:1px solid #34515a;border-radius:16px;box-shadow:0 18px 55px #0008;backdrop-filter:blur(16px);overflow:hidden}.jqBrand{padding:13px 15px;display:grid;place-items:center;font:950 12px ui-monospace;letter-spacing:.08em;border-right:1px solid #2c4850}.jqBrand span{color:#e3c26a}.jqMissionMeta{padding:10px 14px;min-width:280px}.jqMissionMeta small,.jqQuestHead,.jqPlayerCard small,.factCard small,.feedbackItem small,.note small{font:850 8px ui-monospace;letter-spacing:.11em;color:#74d4dd}.jqMissionMeta strong{display:block;margin-top:2px;font-size:14px}.jqMissionMeta span{display:block;margin-top:3px;font-size:9px;color:#8da3a8}.jqTopRight{display:flex;gap:8px;align-items:center}.jqSync,.jqGhostButton{pointer-events:auto;border:1px solid #33505a;background:#07181dbd;color:#dfe9e7;border-radius:999px;padding:9px 12px;font-size:9px;font-weight:800;text-decoration:none;backdrop-filter:blur(14px);box-shadow:0 10px 35px #0005}.jqSync{display:flex;align-items:center;gap:7px;color:#a9d9b6}.jqSync i{width:6px;height:6px;border-radius:50%;background:#74cf91;box-shadow:0 0 12px #74cf91}.jqSync.bad{color:#f3aaa4}.jqSync.bad i{background:#e86c65}.jqGhostButton{cursor:pointer}.jqGhostButton:hover{border-color:#5c7b84;background:#0b2026}.jqQuestCard{position:absolute;left:16px;top:96px;width:min(380px,calc(100vw - 32px));padding:16px 17px;border:1px solid #36555f;border-radius:17px;background:linear-gradient(180deg,#081b20ef,#071419e8);box-shadow:0 22px 65px #0008;backdrop-filter:blur(16px)}.jqQuestHead{display:flex;align-items:center;gap:7px}.jqQuestHead b{margin-left:auto;color:#d6bd72;font:900 9px ui-monospace}.jqDot{width:7px;height:7px;border-radius:50%;background:#e2c66c;box-shadow:0 0 15px #e2c66c}.jqQuestCard h2{font-size:18px;margin:7px 0 6px}.jqQuestCard>p{margin:0;color:#b3c1c3;font-size:11px;line-height:1.55}.jqGuide{margin-top:12px;padding:10px 11px;border-radius:11px;background:#0a252c;border:1px solid #31515a}.jqGuide span,.jqGuide strong{display:block}.jqGuide span{font:850 8px ui-monospace;color:#6fcbd4}.jqGuide strong{margin-top:3px;font-size:11px}.jqGuide.ready{border-color:#a28745;background:#282414}.jqGuide.ready span{color:#e7ca75}.jqWhy{pointer-events:auto;border:0;background:transparent;color:#72ccd6;padding:10px 0 0;font-size:9px;cursor:pointer}.jqWhyText{margin-top:7px;padding-top:9px;border-top:1px solid #29434b;color:#8fa5a9;font-size:10px;line-height:1.5}.jqPlayerCard{position:absolute;left:16px;bottom:20px;display:grid;grid-template-columns:45px 1fr;align-items:center;gap:10px;padding:9px 12px;border:1px solid #35535c;border-radius:14px;background:#06161bea;box-shadow:0 16px 48px #0008;backdrop-filter:blur(16px)}.jqAvatar{width:45px;height:45px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#315e82,#17313a);border:1px solid #5a7881;font-weight:950;color:#f6faf8}.jqPlayerCard b,.jqPlayerCard span{display:block}.jqPlayerCard b{font-size:11px;margin-top:2px}.jqPlayerCard span{font-size:8px;color:#81989d;margin-top:2px}.jqActionDock{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #36555f;border-radius:16px;background:#06161bf0;box-shadow:0 20px 65px #000a;backdrop-filter:blur(18px);min-width:min(620px,calc(100vw - 280px))}.jqActionHint{display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center;flex:1;padding-left:4px}.jqActionHint kbd,.jqNearPrompt kbd{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#102a31;border:1px solid #43636c;color:#e2c66c;font:900 12px ui-monospace;box-shadow:inset 0 0 18px #0003}.jqActionHint small,.jqActionHint b{display:block}.jqActionHint small{font:850 8px ui-monospace;color:#6dcbd4}.jqActionHint b{font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jqPrimaryAction{pointer-events:auto;border:1px solid #a28745;border-radius:11px;background:linear-gradient(180deg,#8b7337,#59491f);color:#fff1ba;padding:12px 19px;min-width:130px;font-weight:900;cursor:pointer;box-shadow:inset 0 1px #ffffff24,0 8px 22px #0005}.jqPrimaryAction:hover:not(:disabled){filter:brightness(1.09)}.jqPrimaryAction:disabled{opacity:.48;cursor:default;border-color:#42545a;background:#15262a;color:#8ca1a4}.jqNearPrompt{pointer-events:auto;position:absolute;left:50%;bottom:84px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;border:1px solid #3d5b63;border-radius:12px;background:#07191ee8;color:#e8eeec;padding:7px 10px;box-shadow:0 14px 45px #0008;cursor:pointer}.jqNearPrompt kbd{width:30px;height:30px}.jqNearPrompt span{font-size:10px;font-weight:800}.jqKeyboardHelp{position:absolute;right:18px;bottom:25px;color:#789095;font-size:8px}.jqKeyboardHelp span{color:#b2c1c4;font-weight:850}.jqKeyboardHelp i{display:inline-block;width:3px;height:3px;border-radius:50%;background:#52676d;margin:0 7px 2px}.jqProgressTrack{position:absolute;left:16px;right:16px;bottom:7px;height:3px;border-radius:99px;background:#07101488;overflow:hidden}.jqProgressTrack i{display:block;height:100%;background:linear-gradient(90deg,#58cbd8,#8bd5a2,#e1c36b);transition:width .35s ease}.jqDpad{display:none;position:absolute;left:14px;bottom:30px;pointer-events:auto}.jqDpad>button{display:block;margin:3px auto}.jqDpad div{display:flex;gap:3px}.jqDpad button{width:42px;height:42px;border:1px solid #3f5d65;border-radius:10px;background:#0b2026dc;color:#e8eeec}.modal{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:24px;background:#02080bd2;backdrop-filter:blur(10px)}.sheet{width:min(620px,100%);max-height:88vh;overflow:auto;padding:24px;border:1px solid #3a5962;border-radius:20px;background:radial-gradient(circle at 80% 0,#193b45 0,transparent 28%),linear-gradient(180deg,#10262c,#08171b);box-shadow:0 35px 110px #000e}.sheet.wide{width:min(920px,100%)}.sheet>.ey{display:block;font:900 9px ui-monospace;letter-spacing:.13em;color:#6ed3dd}.sheet h2{margin:7px 0 16px;font-size:26px}.sheet p{color:#afbdc0;line-height:1.65}.briefLead{font-size:15px;line-height:1.65;color:#dce5e3}.briefStats,.resultGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:15px 0}.briefStats>div,.resultGrid>div{padding:12px;border:1px solid #2f4b53;border-radius:12px;background:#081a1f}.briefStats small,.briefStats b,.resultGrid small,.resultGrid b{display:block}.briefStats small,.resultGrid small{font:850 8px ui-monospace;color:#75cdd6}.briefStats b,.resultGrid b{font-size:18px;margin-top:4px;color:#f0d98c}.topicGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 0}.topicGrid>div{padding:12px;border:1px solid #2e4850;border-radius:11px;background:#091a1f}.topicGrid b,.topicGrid span{display:block}.topicGrid span{font-size:10px;color:#83999d;margin-top:3px}.factCard,.note,.feedbackItem{padding:13px;border:1px solid #2e4951;border-radius:12px;background:#081a1f}.factCard b,.factCard small,.note b,.note small{display:block}.factCard b,.note b{margin-top:4px}.factCard.large p{margin-bottom:0}.dialogLayout{display:grid;grid-template-columns:190px 1fr;gap:22px;align-items:start}.dialogContent{min-width:0}.speech,.question{font-size:16px!important;color:#e4ebe9!important;line-height:1.65!important}.choices{display:grid;gap:9px}.choices button{display:grid;grid-template-columns:32px 1fr;gap:10px;align-items:center;text-align:left;border:1px solid #35525b;border-radius:12px;background:#0a2026;color:#e7edeb;padding:11px 12px;cursor:pointer}.choices button:hover{border-color:#69909a;background:#0d2930}.choices button span{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:#132f36;color:#e2c66d;font:900 10px ui-monospace}.decisionChoices button{font-size:13px}.mBtn,.closeBtn{display:inline-flex;align-items:center;justify-content:center;margin-top:14px;padding:11px 15px;border:1px solid #526a72;border-radius:10px;background:#0b2026;color:#edf3f1;font-weight:900;text-decoration:none;cursor:pointer}.mBtn.primary{border-color:#a28846;background:linear-gradient(180deg,#826c36,#54451f);color:#fff0b1}.closeBtn{font-size:10px}.feedbackLead{padding:13px 14px;border-radius:12px;border:1px solid #3e5961;background:#0a1d22;color:#e4ecea;line-height:1.6}.feedbackLead.ok{border-color:#4d8061;background:#0d251b}.feedbackLead.bad{border-color:#865a57;background:#291817}.feedbackGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.feedbackItem.wide{grid-column:1/-1}.feedbackItem small{display:block;margin-bottom:5px}.feedbackItem p{margin:0;font-size:11px}.notebookCols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.note{margin:8px 0}.note p{margin:5px 0 0;font-size:10px}.portrait{height:250px;border-radius:18px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 35%,#214a55,#0b1b20 70%);border:1px solid #35535b}.portraitGlow{position:absolute;width:150px;height:150px;border-radius:50%;background:#66d0dc22;left:20px;top:20px}.portrait .face{position:absolute;width:104px;height:104px;border-radius:48% 48% 46% 46%;background:#dba982;left:43px;top:40px;border:4px solid #4d352c}.portrait .hair{position:absolute;width:112px;height:62px;border-radius:55% 55% 30% 30%;background:#38291f;left:39px;top:24px;z-index:2}.portrait .face i{position:absolute;top:48px;width:8px;height:8px;border-radius:50%;background:#2c211d}.portrait .face i:first-child{left:27px}.portrait .face i:nth-child(2){right:27px}.portrait .face b{position:absolute;width:22px;height:3px;background:#815548;left:37px;bottom:22px}.portrait .uniform{position:absolute;width:142px;height:106px;left:24px;bottom:-15px;border-radius:34px 34px 0 0;background:#4f6877;border:4px solid #26373e}.portrait.police .uniform{background:#315f8d}.portrait.security .uniform{background:#8c7431}.portrait.medic .uniform{background:#c84f58}.portrait.delegate .uniform{background:#303947}.portrait.prosecutor .uniform{background:#39445f}.portrait.judge .uniform{background:#24282d}.portrait.suspect .uniform{background:#6b4944}.portrait .uniform em{position:absolute;width:14px;height:14px;border-radius:50%;background:#d6b85b;right:31px;top:24px}.jqCanvas:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 140px #0008}@media(max-width:899px){.jqBrandBlock{min-width:auto}.jqMissionMeta{min-width:0}.jqTopbar{left:10px;right:10px}.jqTopRight .jqSync{display:none}.jqQuestCard{left:10px;top:86px;width:calc(100vw - 20px);padding:13px}.jqQuestCard h2{font-size:15px}.jqActionDock{left:auto;right:10px;bottom:23px;transform:none;min-width:0;width:min(54vw,270px);display:block}.jqActionHint{grid-template-columns:34px 1fr;padding:0}.jqActionHint kbd{width:32px;height:32px}.jqPrimaryAction{width:100%;margin-top:7px}.jqPlayerCard,.jqKeyboardHelp{display:none}.jqNearPrompt{bottom:112px}.jqDpad{display:block}.dialogLayout{grid-template-columns:1fr}.portrait{display:none}.topicGrid,.briefStats,.resultGrid,.feedbackGrid,.notebookCols{grid-template-columns:1fr}.jqBrand{padding:10px}.jqMissionMeta strong{font-size:11px}.jqMissionMeta span{max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jqGhostButton{padding:8px 9px}.sheet{padding:18px}.sheet h2{font-size:22px}}`;