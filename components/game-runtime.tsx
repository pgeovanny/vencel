'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  missionId: string;
  mission: any;
  userId: string;
  initialCharacter?: any;
  initialProgress?: any;
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

type Modal =
  | { type: 'briefing' }
  | { type: 'fact'; fact: any }
  | { type: 'decision'; decision: any }
  | { type: 'feedback'; decision: any; choice: any; correct: boolean }
  | { type: 'transition'; nextStageId: string; transition: any }
  | { type: 'complete'; score: number }
  | null;

const COLORS: Record<string, number> = {
  police: 0x2f5f91, civilian: 0x9c5b7b, security: 0xb79535, suspect: 0x754a43,
  medic: 0xd95a5a, delegate: 0x3c5572, clerk: 0x5f6c75, prosecutor: 0x43536f,
  judge: 0x24282d, court_staff: 0x5b6570, operational: 0x315e82, default: 0x3d7179,
};

export default function GameRuntime({ missionId, mission, userId, initialCharacter, initialProgress }: Props) {
  const stages = useMemo(() => [...(mission.stages || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)), [mission]);
  const firstStageId = stages[0]?.id || '';
  const progressState = initialProgress?.runtime_state || {};
  const initial: Runtime = {
    stageId: progressState.stageId || initialProgress?.current_stage || firstStageId,
    facts: progressState.facts || initialProgress?.facts || [],
    decisions: progressState.decisions || [],
    wrong: progressState.wrong || initialProgress?.mistakes || [],
    attemptCounts: progressState.attemptCounts || initialProgress?.decisions || {},
    started: false,
    completed: initialProgress?.status === 'completed',
  };

  const [runtime, setRuntime] = useState<Runtime>(initial);
  const runtimeRef = useRef(runtime);
  const [near, setNear] = useState<Near>(null);
  const nearRef = useRef<Near>(null);
  const [modal, setModal] = useState<Modal>({ type: 'briefing' });
  const [dialogue, setDialogue] = useState<{ actor: any; index: number } | null>(null);
  const [notebook, setNotebook] = useState(false);
  const [cloud, setCloud] = useState('INICIANDO MOTOR…');
  const [engineError, setEngineError] = useState('');
  const [gameReady, setGameReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const moveRef = useRef({ x: 0, y: 0 });
  const supabaseRef = useRef(createClient());

  const character = initialCharacter || { character_name: 'Jogador', role_title: 'Candidato', archetype: 'operational' };
  const stage = stages.find((s: any) => s.id === runtime.stageId) || stages[0];

  useEffect(() => { runtimeRef.current = runtime; }, [runtime]);
  useEffect(() => { nearRef.current = near; }, [near]);

  function factHas(id: string, r = runtimeRef.current) { return r.facts.includes(id); }
  function decisionHas(id: string, r = runtimeRef.current) { return r.decisions.includes(id); }
  function getDecision(id: string) { return (mission.decisions || []).find((d: any) => d.id === id); }

  function objectiveDone(o: any, r = runtimeRef.current) {
    if (!o) return true;
    if (o.type === 'actor' || o.type === 'object') return factHas(o.target, r);
    if (o.type === 'decision') return decisionHas(o.target, r);
    if (o.type === 'advance') {
      const s = stages.find((x: any) => x.id === r.stageId);
      return (s?.objectives || []).filter((x: any) => x !== o && x.type !== 'advance').every((x: any) => objectiveDone(x, r));
    }
    return false;
  }

  function currentObjective(r = runtimeRef.current) {
    const s = stages.find((x: any) => x.id === r.stageId);
    return (s?.objectives || []).find((o: any) => !objectiveDone(o, r)) || null;
  }

  function decisionReady(d: any, r = runtimeRef.current) {
    return (d?.requires_facts || []).every((f: string) => factHas(f, r)) && (d?.depends_on || []).every((x: string) => decisionHas(x, r));
  }

  function progressPct(r = runtimeRef.current) {
    const objectives = stages.flatMap((s: any) => (s.objectives || []).filter((o: any) => o.type !== 'advance'));
    if (!objectives.length) return 0;
    const done = objectives.filter((o: any) => objectiveDone(o, r)).length;
    return Math.round(done / objectives.length * 100);
  }

  async function persist(next: Runtime, done = false, score: number | null = null) {
    setCloud('SALVANDO…');
    const sb = supabaseRef.current;
    const payload = {
      user_id: userId,
      mission_id: missionId,
      status: done ? 'completed' : 'in_progress',
      current_stage: next.stageId,
      progress_percent: done ? 100 : progressPct(next),
      score_first_try: done ? score : null,
      score_best: done ? score : null,
      mistakes: next.wrong,
      facts: next.facts,
      decisions: next.attemptCounts,
      runtime_state: next,
      started_at: initialProgress?.started_at || new Date().toISOString(),
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('mission_progress').upsert(payload, { onConflict: 'user_id,mission_id' });
    setCloud(error ? 'ERRO AO SALVAR' : 'PROGRESSO SALVO ✓');
    if (error) console.error('mission_progress', error);
  }

  function applyRuntime(next: Runtime, save = true) {
    runtimeRef.current = next;
    setRuntime(next);
    if (save) void persist(next);
  }

  function registerFact(fact: any) {
    if (!fact?.id || factHas(fact.id)) return;
    const next = { ...runtimeRef.current, facts: [...runtimeRef.current.facts, fact.id] };
    applyRuntime(next);
    setModal({ type: 'fact', fact });
  }

  function openNear() {
    const n = nearRef.current;
    if (!n) return;
    const s = stages.find((x: any) => x.id === runtimeRef.current.stageId);
    if (n.type === 'actor') {
      const actor = (s?.actors || []).find((a: any) => a.id === n.id);
      if (actor) setDialogue({ actor, index: 0 });
    } else {
      const obj = (s?.objects || []).find((o: any) => o.id === n.id);
      if (obj?.fact) registerFact(obj.fact);
    }
  }

  async function answerDecision(d: any, choiceIndex: number) {
    const choice = d.choices?.[choiceIndex];
    if (!choice) return;
    const r = runtimeRef.current;
    const attempt = (r.attemptCounts[d.id] || 0) + 1;
    const correct = !!choice.correct;
    const wrong = !correct && attempt === 1 && !r.wrong.includes(d.id) ? [...r.wrong, d.id] : r.wrong;
    const attempts = { ...r.attemptCounts, [d.id]: attempt };
    const nextBase = { ...r, wrong, attemptCounts: attempts };

    const { error } = await supabaseRef.current.from('decision_attempts').insert({
      user_id: userId,
      mission_id: missionId,
      decision_id: d.id,
      attempt_no: attempt,
      selected_index: choiceIndex,
      selected_text: choice.text,
      correct,
      mode: 'mission',
      feedback_snapshot: d.feedback || {},
    });
    if (error) console.error('decision_attempts', error);

    if (correct) {
      const next = { ...nextBase, decisions: nextBase.decisions.includes(d.id) ? nextBase.decisions : [...nextBase.decisions, d.id] };
      applyRuntime(next);
    } else {
      applyRuntime(nextBase);
    }
    setModal({ type: 'feedback', decision: d, choice, correct });
  }

  async function finishMission() {
    const r = runtimeRef.current;
    const total = Math.max(1, (mission.decisions || []).length);
    const score = Math.max(0, Math.round((total - r.wrong.length) / total * 100));
    const next = { ...r, completed: true };
    runtimeRef.current = next;
    setRuntime(next);
    await persist(next, true, score);

    const intervals = mission.review_plan?.interval_days || [1, 7, 30];
    const sb = supabaseRef.current;
    const { data: existing } = await sb.from('review_queue').select('interval_days').eq('user_id', userId).eq('mission_id', missionId).eq('status', 'pending');
    const have = new Set((existing || []).map((x: any) => x.interval_days));
    const rows = intervals.filter((d: number) => !have.has(d)).map((d: number) => ({
      user_id: userId,
      mission_id: missionId,
      due_at: new Date(Date.now() + d * 86400000).toISOString(),
      interval_days: d,
      reason: `Revisão de ${d} dia${d > 1 ? 's' : ''}: ${mission.title}`,
      status: 'pending',
    }));
    if (rows.length) {
      const { error } = await sb.from('review_queue').insert(rows);
      if (error) console.error('review_queue', error);
    }
    setModal({ type: 'complete', score });
  }

  function primaryAction() {
    const r = runtimeRef.current;
    const s = stages.find((x: any) => x.id === r.stageId);
    const o = currentObjective(r);
    if (o?.type === 'decision') {
      const d = getDecision(o.target);
      if (decisionReady(d, r)) setModal({ type: 'decision', decision: d });
      return;
    }
    if (o?.type === 'advance') {
      const i = stages.findIndex((x: any) => x.id === s?.id);
      const next = stages[i + 1];
      if (next) setModal({ type: 'transition', nextStageId: next.id, transition: s?.transition || {} });
      return;
    }
    if (!o && s?.final) { void finishMission(); return; }
    openNear();
  }

  function goStage(id: string) {
    const next = { ...runtimeRef.current, stageId: id };
    applyRuntime(next);
    setModal(null);
    sceneRef.current?.buildStage?.(stages.find((s: any) => s.id === id));
  }

  const objective = currentObjective(runtime);
  const actionText = (() => {
    if (!gameReady) return 'CARREGANDO MOTOR…';
    if (objective?.type === 'decision') return decisionReady(getDecision(objective.target), runtime) ? 'ABRIR ANÁLISE JURÍDICA' : 'COLETE OS FATOS NECESSÁRIOS';
    if (objective?.type === 'advance') return 'AVANÇAR PARA A PRÓXIMA ETAPA';
    if (!objective && stage?.final) return 'CONCLUIR MISSÃO';
    return near?.label || 'APROXIME-SE DO OBJETIVO';
  })();

  useEffect(() => {
    let cancelled = false;
    let game: any;
    (async () => {
      try {
        const mod: any = await import('phaser');
        if (cancelled || !hostRef.current) return;
        const Phaser: any = mod.default || mod;

        class MissionScene extends Phaser.Scene {
          player: any; actors: Record<string, any> = {}; objects: Record<string, any> = {};
          cursors: any; keys: any; frozen = true; lastNear = '';
          constructor() { super('mission'); }
          create() {
            sceneRef.current = this;
            this.cameras.main.setBackgroundColor('#142229');
            this.cursors = this.input.keyboard?.createCursorKeys();
            this.keys = this.input.keyboard?.addKeys('W,A,S,D,SHIFT,E');
            this.input.keyboard?.on('keydown-E', openNear);
            this.input.keyboard?.on('keydown-Q', primaryAction);
            this.buildStage(stages.find((s: any) => s.id === runtimeRef.current.stageId) || stages[0]);
            this.frozen = true;
            setGameReady(true);
            setCloud('NUVEM ATIVA ✓');
          }
          drawEnvironment(env: string) {
            const g = this.add.graphics();
            const w = 1200, h = 760;
            if (env === 'parking_night') {
              g.fillStyle(0x14252b).fillRect(0, 0, w, h);
              g.fillStyle(0x293338).fillRect(70, 105, 1060, 575);
              g.lineStyle(2, 0xe0d8ad, .28);
              for (let x = 135; x < 1080; x += 150) g.strokeRect(x, 190, 110, 175);
              g.fillStyle(0x173941).fillRect(0, 0, w, 92);
              this.add.text(48, 34, 'CENTRO COMERCIAL AURORA', { fontSize: '22px', fontStyle: 'bold', color: '#dbe5e2' });
              this.add.rectangle(260, 520, 155, 68, 0x345372).setAngle(-4);
              this.add.rectangle(980, 535, 175, 72, 0xe5e8e7).setAngle(3);
              this.add.text(927, 525, 'AMBULÂNCIA', { fontSize: '11px', fontStyle: 'bold', color: '#a23f3f' });
            } else if (env === 'police_station') {
              g.fillStyle(0x16282d).fillRect(0, 0, w, h);
              g.fillStyle(0xd2cec2).fillRect(65, 90, 1070, 600);
              g.fillStyle(0x324d57).fillRect(65, 90, 1070, 74);
              g.fillStyle(0x7d705d).fillRect(520, 305, 390, 105);
              g.fillStyle(0x56636b).fillRect(150, 305, 230, 125);
              this.add.text(90, 110, 'DELEGACIA REGIONAL', { fontSize: '24px', fontStyle: 'bold', color: '#eff2ee' });
            } else {
              g.fillStyle(0x252a2b).fillRect(0, 0, w, h);
              g.fillStyle(0xd5d0c2).fillRect(65, 80, 1070, 610);
              g.fillStyle(0x493a2d).fillRect(175, 255, 850, 82);
              g.fillStyle(0x3b3027).fillRect(465, 110, 290, 92);
              this.add.text(88, 100, 'FÓRUM • VARA DO JÚRI', { fontSize: '23px', fontStyle: 'bold', color: '#31383a' });
            }
          }
          makePerson(name: string, role: string, style: string, x: number, y: number, isPlayer = false) {
            const c = this.add.container(x, y);
            c.add(this.add.ellipse(0, 25, 36, 12, 0x000000, .25));
            c.add(this.add.rectangle(0, 15, 22, 25, 0x24343a));
            c.add(this.add.rectangle(0, -4, 31, 35, COLORS[style] || COLORS.default));
            c.add(this.add.circle(0, -31, 13, 0xd2a77f));
            this.physics.add.existing(c);
            const body: any = c.body; body.setSize(38, 58); body.setCollideWorldBounds(true);
            const label = this.add.container(x, y - 64);
            label.add(this.add.rectangle(0, 0, Math.max(98, name.length * 7 + 30), 34, 0x061318, .92).setStrokeStyle(1, isPlayer ? 0xb99b4b : 0x3f5d65));
            label.add(this.add.text(0, -6, isPlayer ? `${role}: ${name}` : name, { fontSize: '10px', fontStyle: 'bold', color: isPlayer ? '#ffe59c' : '#fff' }).setOrigin(.5));
            label.add(this.add.text(0, 8, isPlayer ? 'VOCÊ' : role, { fontSize: '7px', fontStyle: 'bold', color: '#74d0d7' }).setOrigin(.5));
            (c as any).jqLabel = label;
            return c;
          }
          makeObject(o: any) {
            const x = o.position?.x || 500, y = o.position?.y || 300;
            const c = this.add.container(x, y);
            if (o.kind === 'camera') { c.add(this.add.rectangle(0, 0, 36, 22, 0x17252b)); c.add(this.add.circle(10, 0, 7, 0x5fd3df)); }
            else if (o.kind === 'evidence') { c.add(this.add.rectangle(0, 0, 48, 8, 0x99938c).setAngle(-25)); c.add(this.add.rectangle(-20, 8, 18, 12, 0x563b2e).setAngle(-25)); }
            else { c.add(this.add.rectangle(0, 0, 46, 36, 0xe3ddc7).setStrokeStyle(2, 0x59646b)); }
            const label = this.add.container(x, y - 45);
            label.add(this.add.rectangle(0, 0, Math.max(105, String(o.name || '').length * 7 + 30), 31, 0x061318, .92).setStrokeStyle(1, 0x8b7638));
            label.add(this.add.text(0, -5, o.name || 'Objeto', { fontSize: '9px', fontStyle: 'bold', color: '#ffe9a0' }).setOrigin(.5));
            label.add(this.add.text(0, 8, o.role || 'EVIDÊNCIA', { fontSize: '7px', fontStyle: 'bold', color: '#74d0d7' }).setOrigin(.5));
            (c as any).jqLabel = label;
            return c;
          }
          buildStage(s: any) {
            if (!s) return;
            this.children.removeAll(true);
            this.actors = {}; this.objects = {}; this.lastNear = ''; setNear(null);
            this.physics.world.setBounds(0, 0, 1200, 760);
            this.drawEnvironment(s.environment);
            const spawn = s.player_spawn || { x: 600, y: 650 };
            this.player = this.makePerson(character.character_name || 'Jogador', character.role_title || 'Candidato', character.archetype || 'operational', spawn.x, spawn.y, true);
            for (const a of s.actors || []) this.actors[a.id] = { def: a, go: this.makePerson(a.name, a.role, a.style, a.position?.x || 400, a.position?.y || 350) };
            for (const o of s.objects || []) this.objects[o.id] = { def: o, go: this.makeObject(o) };
            this.cameras.main.startFollow(this.player, true, .1, .1);
            this.cameras.main.setZoom(window.innerWidth < 800 ? .78 : 1.05);
            this.cameras.main.setBounds(0, 0, 1200, 760);
          }
          update() {
            if (!this.player) return;
            const p: any = this.player;
            const speed = this.keys?.SHIFT?.isDown ? 220 : 150;
            const kbX = ((this.keys?.D?.isDown || this.cursors?.right?.isDown) ? 1 : 0) - ((this.keys?.A?.isDown || this.cursors?.left?.isDown) ? 1 : 0);
            const kbY = ((this.keys?.S?.isDown || this.cursors?.down?.isDown) ? 1 : 0) - ((this.keys?.W?.isDown || this.cursors?.up?.isDown) ? 1 : 0);
            const dx = kbX + moveRef.current.x, dy = kbY + moveRef.current.y, len = Math.hypot(dx, dy);
            if (!this.frozen && len) p.body.setVelocity(dx / len * speed, dy / len * speed); else p.body.setVelocity(0, 0);
            if (p.jqLabel) { p.jqLabel.x = p.x; p.jqLabel.y = p.y - 64; }
            for (const a of Object.values(this.actors) as any[]) if (a.go.jqLabel) { a.go.jqLabel.x = a.go.x; a.go.jqLabel.y = a.go.y - 64; }
            for (const o of Object.values(this.objects) as any[]) if (o.go.jqLabel) { o.go.jqLabel.x = o.go.x; o.go.jqLabel.y = o.go.y - 45; }
            let best: Near = null, bestD = 88;
            for (const a of Object.values(this.actors) as any[]) { const d = Phaser.Math.Distance.Between(p.x, p.y, a.go.x, a.go.y); if (d < bestD) { bestD = d; best = { type: 'actor', id: a.def.id, label: `Conversar com ${a.def.name}` }; } }
            for (const o of Object.values(this.objects) as any[]) { const d = Phaser.Math.Distance.Between(p.x, p.y, o.go.x, o.go.y); if (d < bestD) { bestD = d; best = { type: 'object', id: o.def.id, label: o.def.interaction_text || `Examinar ${o.def.name}` }; } }
            const key = best ? `${best.type}:${best.id}` : '';
            if (key !== this.lastNear) { this.lastNear = key; setNear(best); }
          }
        }

        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: '#142229',
          physics: { default: 'arcade', arcade: { debug: false } },
          scene: MissionScene,
          scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
          render: { antialias: true, pixelArt: false },
        });
        gameRef.current = game;
      } catch (e: any) {
        console.error(e);
        setEngineError(e?.message || 'Falha ao iniciar o motor gráfico.');
        setCloud('MOTOR INDISPONÍVEL');
      }
    })();
    return () => { cancelled = true; try { game?.destroy(true); } catch {} gameRef.current = null; sceneRef.current = null; };
  }, []);

  useEffect(() => { if (sceneRef.current) sceneRef.current.frozen = !!modal || !!dialogue || notebook || !runtime.started; }, [modal, dialogue, notebook, runtime.started]);

  const notebookFacts = runtime.facts.map((id) => stages.flatMap((s: any) => [...(s.actors || []), ...(s.objects || [])]).find((x: any) => x.fact?.id === id)?.fact).filter(Boolean);
  const notebookRules = runtime.decisions.map(id => getDecision(id)).filter(Boolean);
  const notebookErrors = runtime.wrong.map(id => getDecision(id)).filter(Boolean);

  return <main className="jqGameRoot">
    <div ref={hostRef} className="jqCanvas" />
    <div className="jqHud">
      <div className="jqTopbar">
        <div className="jqBrand">JURIS<span>QUEST</span></div>
        <div className="jqStageBox"><small>{stage?.title || 'MISSÃO'}</small><b>{mission.title}</b><span>{stage?.location || ''}</span></div>
        <div className="jqSpacer" />
        <div className={`jqCloud ${cloud.includes('ERRO') ? 'bad' : ''}`}>{cloud}</div>
        <a className="jqExit" href="/dashboard">SAIR</a>
      </div>

      <section className="jqObjective">
        <small>OBJETIVO ATUAL</small>
        <h3>{objective?.title || (stage?.final ? 'Etapa concluída' : 'Missão em andamento')}</h3>
        <p>{objective?.text || (stage?.final ? 'Finalize a missão.' : 'Avance para a próxima etapa.')}</p>
        {objective?.why && <p className="why">{objective.why}</p>}
      </section>

      <section className="jqCharacter"><div className="avatar">{String(character.character_name || 'JQ').slice(0, 2).toUpperCase()}</div><div><small>{character.role_title || 'CANDIDATO'}</small><b>{character.character_name || 'Jogador'}</b><span>Operação em andamento</span></div></section>

      <div className="jqActions"><button onClick={() => setNotebook(true)}>CADERNO</button><button className="primary" onClick={primaryAction} disabled={!gameReady}>{actionText}</button></div>
      <div className="jqProgress"><i style={{ width: `${progressPct(runtime)}%` }} /></div>

      <div className="jqDpad">
        <button onPointerDown={() => moveRef.current.y = -1} onPointerUp={() => moveRef.current.y = 0} onPointerCancel={() => moveRef.current.y = 0}>▲</button>
        <div><button onPointerDown={() => moveRef.current.x = -1} onPointerUp={() => moveRef.current.x = 0} onPointerCancel={() => moveRef.current.x = 0}>◀</button><button onPointerDown={openNear}>●</button><button onPointerDown={() => moveRef.current.x = 1} onPointerUp={() => moveRef.current.x = 0} onPointerCancel={() => moveRef.current.x = 0}>▶</button></div>
        <button onPointerDown={() => moveRef.current.y = 1} onPointerUp={() => moveRef.current.y = 0} onPointerCancel={() => moveRef.current.y = 0}>▼</button>
      </div>
    </div>

    {engineError && <div className="jqModal"><div className="jqSheet"><div className="jqEy">ERRO DO MOTOR</div><h2>Não foi possível iniciar o jogo</h2><p>{engineError}</p><a className="jqModalBtn" href="/dashboard">Voltar</a></div></div>}

    {modal?.type === 'briefing' && <div className="jqModal"><div className="jqSheet wide"><div className="jqEy">{mission.briefing?.eyebrow || 'MISSÃO'}</div><h2>{mission.title}</h2><p>{mission.briefing?.text || mission.summary}</p><div className="jqTopicGrid">{(mission.briefing?.topics || []).map((t: any) => <div key={t.title}><b>{t.title}</b><span>{t.subtitle}</span></div>)}</div><div className="jqFact"><small>OBJETIVO DE APRENDIZAGEM</small><b>{mission.briefing?.learning_goal}</b></div><button className="jqModalBtn" onClick={() => { setModal(null); const next = { ...runtimeRef.current, started: true }; runtimeRef.current = next; setRuntime(next); }}>INICIAR MISSÃO</button></div></div>}

    {dialogue && (() => {
      const line = dialogue.actor.dialogue?.[dialogue.index] || { text: 'Sem informação adicional.', choices: ['Encerrar'] };
      return <div className="jqModal"><div className="jqSheet wide"><div className="jqEy">{dialogue.actor.role}</div><h2>{dialogue.actor.name}</h2><p className="jqSpeech">{line.text}</p><div className="jqChoices">{(line.choices || ['Continuar']).map((c: string, i: number) => <button key={i} onClick={() => { if (dialogue.index < (dialogue.actor.dialogue?.length || 1) - 1) setDialogue({ ...dialogue, index: dialogue.index + 1 }); else { const f = dialogue.actor.fact; setDialogue(null); if (f) registerFact(f); } }}>{c}</button>)}</div><button className="jqClose" onClick={() => setDialogue(null)}>Fechar</button></div></div>;
    })()}

    {modal?.type === 'fact' && <div className="jqModal"><div className="jqSheet"><div className="jqEy">{modal.fact.kind || 'FATO REGISTRADO'}</div><h2>{modal.fact.title}</h2><p>{modal.fact.text}</p><button className="jqModalBtn" onClick={() => setModal(null)}>CONTINUAR</button></div></div>}

    {modal?.type === 'decision' && <div className="jqModal"><div className="jqSheet wide"><div className="jqEy">DECISÃO JURÍDICA</div><h2>{modal.decision.title}</h2><p className="jqQuestion">{modal.decision.question}</p><div className="jqChoices">{modal.decision.choices.map((c: any, i: number) => <button key={i} onClick={() => void answerDecision(modal.decision, i)}><b>{String.fromCharCode(65 + i)}.</b> {c.text}</button>)}</div><button className="jqClose" onClick={() => setModal(null)}>Fechar</button></div></div>}

    {modal?.type === 'feedback' && <div className="jqModal"><div className="jqSheet wide"><div className="jqEy">{modal.correct ? 'DECISÃO CORRETA' : 'REVISE O RACIOCÍNIO'}</div><h2>{modal.decision.title}</h2><div className="jqFeedback"><h4>{modal.correct ? 'RACIOCÍNIO COMPATÍVEL' : 'RACIOCÍNIO A REVER'}</h4><p>{modal.choice.feedback}</p><p><b>Regra:</b> {modal.decision.feedback?.rule}</p><p><b>Aplicação:</b> {modal.decision.feedback?.application}</p><p><b>Base legal:</b> {modal.decision.feedback?.legal_basis}</p><p><b>Pegadinha:</b> {modal.decision.feedback?.trap}</p><p><b>Memória:</b> {modal.decision.feedback?.memory}</p></div><button className="jqModalBtn" onClick={() => { if (modal.correct) setModal(null); else setModal({ type: 'decision', decision: modal.decision }); }}>{modal.correct ? 'CONSOLIDAR E CONTINUAR' : 'TENTAR NOVAMENTE'}</button></div></div>}

    {modal?.type === 'transition' && <div className="jqModal"><div className="jqSheet"><div className="jqEy">{modal.transition.label || 'TRANSIÇÃO'}</div><h2>{modal.transition.title || 'Próxima etapa'}</h2><p>{modal.transition.text || 'A missão avança.'}</p><button className="jqModalBtn" onClick={() => goStage(modal.nextStageId)}>CONTINUAR</button></div></div>}

    {modal?.type === 'complete' && <div className="jqModal"><div className="jqSheet wide"><div className="jqEy">MISSÃO CONCLUÍDA</div><h2>{mission.title}</h2><p>{mission.review_plan?.completion_text}</p><div className="jqResultGrid"><div><small>PROGRESSO</small><b>100%</b></div><div><small>1ª TENTATIVA</small><b>{modal.score}%</b></div><div><small>ERROS</small><b>{runtime.wrong.length}</b></div><div><small>REVISÕES</small><b>{(mission.review_plan?.interval_days || [1,7,30]).length}</b></div></div><a className="jqModalBtn" href="/dashboard">VOLTAR À CAMPANHA</a></div></div>}

    {notebook && <div className="jqModal"><div className="jqSheet wide"><div className="jqEy">CADERNO DE CAMPO</div><h2>Fatos, regras e erros</h2><h3>Fatos coletados</h3>{notebookFacts.length ? notebookFacts.map((f: any) => <div className="jqNote" key={f.id}><small>{f.kind}</small><b>{f.title}</b><p>{f.text}</p></div>) : <p>Nenhum fato registrado.</p>}<h3>Regras consolidadas</h3>{notebookRules.map((d: any) => <div className="jqNote" key={d.id}><small>{d.feedback?.legal_basis}</small><b>{d.title}</b><p>{d.feedback?.memory || d.feedback?.rule}</p></div>)}<h3>Erros para revisar</h3>{notebookErrors.length ? notebookErrors.map((d: any) => <div className="jqNote" key={d.id}><small>REVISAR</small><b>{d.title}</b><p>{d.feedback?.trap}</p></div>) : <p>Nenhum erro de primeira tentativa.</p>}<button className="jqModalBtn" onClick={() => setNotebook(false)}>FECHAR</button></div></div>}

    <style jsx global>{`
      body{overflow:hidden}.top{display:none!important}.jqGameRoot{position:fixed;inset:0;background:#071114;color:#eef3ef;font-family:Inter,system-ui,sans-serif}.jqCanvas{position:absolute;inset:0}.jqCanvas canvas{display:block!important}.jqHud{position:absolute;inset:0;z-index:5;pointer-events:none}.jqTopbar{position:absolute;left:16px;right:16px;top:14px;display:flex;gap:10px;align-items:flex-start}.jqBrand,.jqStageBox,.jqCloud,.jqObjective,.jqCharacter{background:#07161bea;border:1px solid #35515a;border-radius:13px;box-shadow:0 16px 50px #0009;backdrop-filter:blur(14px)}.jqBrand{padding:10px 13px;font:950 12px ui-monospace;letter-spacing:.08em}.jqBrand span{color:#e5bd58}.jqStageBox{padding:9px 12px;min-width:220px}.jqStageBox small,.jqObjective small,.jqCharacter small{display:block;color:#74cbd4;font:850 8px ui-monospace;letter-spacing:.12em}.jqStageBox b{display:block;font-size:12px;margin-top:3px}.jqStageBox span,.jqCharacter span{display:block;color:#81989e;font-size:9px;margin-top:3px}.jqSpacer{flex:1}.jqCloud{padding:9px 11px;color:#9ed1b0;font:800 9px ui-monospace}.jqCloud.bad{color:#f0a39d}.jqExit,.jqActions button,.jqDpad button{pointer-events:auto;border:1px solid #36535b;background:#10272d;color:#eef3ef;border-radius:10px;padding:10px 12px;font-weight:850;cursor:pointer;text-decoration:none}.jqObjective{position:absolute;left:16px;top:88px;width:min(380px,calc(100vw - 32px));padding:14px}.jqObjective h3{margin:6px 0 5px;font-size:14px}.jqObjective p{margin:0;color:#a5b4b6;font-size:10px;line-height:1.55}.jqObjective .why{margin-top:8px;padding-top:8px;border-top:1px solid #29434b;color:#718b91}.jqCharacter{position:absolute;right:16px;top:88px;padding:11px;min-width:195px;display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center}.jqCharacter .avatar{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#2a6771,#132e35);border:1px solid #48666d;font-weight:950}.jqCharacter b{font-size:11px}.jqActions{position:absolute;right:16px;bottom:24px;display:flex;gap:8px}.jqActions .primary{min-width:230px;border-color:#927a3d;background:linear-gradient(145deg,#6e581f,#403517);color:#fff0b4}.jqActions button:disabled{opacity:.55}.jqProgress{position:absolute;left:16px;right:16px;bottom:10px;height:4px;background:#06101488;border-radius:99px;overflow:hidden}.jqProgress i{display:block;height:100%;background:linear-gradient(90deg,#67d5dd,#69d18a,#e5bd58);transition:width .25s}.jqDpad{display:none;position:absolute;left:14px;bottom:34px;width:126px;text-align:center;pointer-events:auto}.jqDpad>button{display:block;margin:3px auto}.jqDpad div{display:flex;justify-content:center;gap:3px}.jqDpad button{width:39px;height:39px;padding:0;touch-action:none}.jqModal{position:fixed;inset:0;z-index:20;background:#02070acb;backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.jqSheet{width:min(600px,100%);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#10252b,#08171b);border:1px solid #385660;border-radius:18px;box-shadow:0 30px 90px #000d;padding:22px}.jqSheet.wide{width:min(820px,100%)}.jqEy{color:#67d5dd;font:900 9px ui-monospace;letter-spacing:.12em}.jqSheet h2{margin:6px 0 14px;font:950 24px ui-monospace}.jqSheet p{color:#aebdc0;line-height:1.65}.jqTopicGrid,.jqResultGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:14px 0}.jqTopicGrid>div,.jqResultGrid>div,.jqFact,.jqNote,.jqFeedback{padding:12px;border:1px solid #2f4b53;border-radius:11px;background:#091a1f}.jqTopicGrid b,.jqTopicGrid span,.jqNote b,.jqNote small,.jqResultGrid small,.jqResultGrid b{display:block}.jqTopicGrid span,.jqNote small,.jqResultGrid small{color:#80979c;font-size:10px}.jqResultGrid b{color:#f0da93;font-size:22px;margin-top:4px}.jqFact small,.jqNote small{color:#67d5dd;font:850 8px ui-monospace}.jqFact b,.jqNote b{display:block;color:#edf1e9;margin-top:5px}.jqModalBtn,.jqClose,.jqChoices button{border:1px solid #a68c45;background:linear-gradient(145deg,#745d21,#443719);color:#fff0b4;border-radius:10px;padding:11px 14px;font-weight:900;cursor:pointer;margin-top:14px;text-decoration:none;display:inline-block}.jqClose{background:#0b2026;border-color:#35515a;color:#dce6e4;margin-left:8px}.jqChoices{display:grid;gap:8px}.jqChoices button{margin:0;text-align:left;background:#0c2228;border-color:#35515a;color:#e6ecea}.jqChoices button:hover{border-color:#6c858b}.jqSpeech,.jqQuestion{font-size:15px!important;color:#e1e8e6!important}.jqFeedback h4{color:#f0d98c}.jqNote{margin:8px 0}.jqNote p{margin:5px 0 0}.jqSheet h3{margin:18px 0 8px;font-size:13px;color:#dce6e4}
      @media(max-width:800px){.jqStageBox,.jqCharacter{display:none}.jqTopbar{left:10px;right:10px}.jqObjective{left:10px;top:68px;width:calc(100vw - 20px)}.jqActions{right:10px;bottom:26px;flex-direction:column}.jqActions .primary{min-width:170px;max-width:210px}.jqDpad{display:block}.jqTopicGrid,.jqResultGrid{grid-template-columns:1fr 1fr}.jqCloud{display:none}.jqBrand{font-size:10px}.jqExit{padding:8px 10px}.jqSheet{padding:18px}}
    `}</style>
  </main>;
}
