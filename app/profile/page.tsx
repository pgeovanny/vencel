import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { chibiSvg } from '@/lib/game/character-assets-v2';
import { svgUri } from '@/lib/game/studio-assets';
import { saveCharacter } from './actions';
import { ProductHeader, ProductMobileNav } from '@/components/product-navigation';

type Search={saved?:string;error?:string};
const ARCHETYPES=[
  {id:'operational',label:'Operacional',desc:'Presença de campo, investigação e resposta rápida.'},
  {id:'investigator',label:'Investigador',desc:'Visual civil e foco em coleta de elementos e entrevistas.'},
  {id:'analyst',label:'Analista',desc:'Perfil técnico para decisões, documentos e análise institucional.'},
  {id:'formal',label:'Institucional',desc:'Visual formal para tribunais, controle e áreas administrativas.'},
];

export default async function ProfilePage({searchParams}:{searchParams:Promise<Search>}){
  const query=await searchParams;
  const sb=await createClient();
  const{data:{user}}=await sb.auth.getUser();
  if(!user)redirect('/');

  const[{data:missions},{data:syllabi},{data:characters},{data:stats}]=await Promise.all([
    sb.from('missions').select('syllabus_id').eq('status','published'),
    sb.from('exam_syllabi').select('id,title,agency,position_name,exam_name,status').eq('status','published').order('created_at'),
    sb.from('student_characters').select('*').eq('user_id',user.id),
    sb.from('student_stats').select('xp,current_streak,missions_completed,reviews_completed').eq('user_id',user.id).maybeSingle(),
  ]);
  const accessible=new Set((missions||[]).map((m:any)=>m.syllabus_id).filter(Boolean));
  const available=(syllabi||[]).filter((s:any)=>accessible.has(s.id));
  if(!available.length)redirect('/dashboard');
  const active=available[0];
  const current=(characters||[]).find((c:any)=>c.syllabus_id===active.id);
  const name=current?.character_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Jogador';
  const archetype=ARCHETYPES.some(a=>a.id===current?.archetype)?current.archetype:'operational';
  const role=current?.role_title||active.position_name||'Candidato';

  return <main className="profileRoot">
    <ProductHeader active="profile" syllabusId={active.id}/>
    <section className="profileWrap">
      <section className="profileHero">
        <div className="profilePortrait"><div className="portraitGlow"/><img src={svgUri(chibiSvg(archetype,'player'))} alt=""/></div>
        <div className="profileIdentity"><div className="pEy">IDENTIDADE OPERACIONAL</div><h1>{name}</h1><p>{role}</p><div className="identityMeta"><span>{active.agency||'Órgão'}</span><span>{active.exam_name||active.title}</span></div><div className="profileStats"><div><small>XP</small><strong>{stats?.xp||0}</strong></div><div><small>SEQUÊNCIA</small><strong>{stats?.current_streak||0}</strong></div><div><small>CASOS</small><strong>{stats?.missions_completed||0}</strong></div><div><small>REVISÕES</small><strong>{stats?.reviews_completed||0}</strong></div></div></div>
      </section>

      <form action={saveCharacter} className="characterEditor">
        <input type="hidden" name="syllabus_id" value={active.id}/>
        <div className="editorHead"><div><div className="pEy">MEU PERSONAGEM</div><h2>Configure como você aparece no JurisQuest</h2><p>O cargo é determinado pelo edital. Nome e arquétipo visual podem ser alterados sem perder progresso.</p></div><span className="serverTag">SALVO NA CONTA</span></div>
        <label className="nameField"><span>Nome do personagem</span><input name="character_name" defaultValue={name} minLength={2} maxLength={40} required/></label>
        <div className="roleLock"><small>CARGO DO EDITAL</small><strong>{active.position_name||'Candidato'}</strong><span>{active.title}</span></div>
        <div className="archetypeLabel"><span>Arquétipo visual</span><small>Escolha a identidade que melhor combina com sua função.</small></div>
        <div className="archetypeGrid">{ARCHETYPES.map(a=><label className="archetypeCard" key={a.id}>
          <input type="radio" name="archetype" value={a.id} defaultChecked={archetype===a.id}/>
          <div className="avatarStage"><img src={svgUri(chibiSvg(a.id,'player'))} alt=""/></div>
          <div className="archCopy"><strong>{a.label}</strong><p>{a.desc}</p></div><span className="check">✓</span>
        </label>)}</div>
        {query.saved&&<div className="profileNotice ok">Personagem atualizado. Dashboard, Plantão e Campanha usarão esta identidade.</div>}
        {query.error&&<div className="profileNotice bad">Não foi possível salvar. Confira o nome e tente novamente.</div>}
        <div className="profileActions"><button type="submit">Salvar personagem</button><a href="/dashboard">Cancelar</a></div>
      </form>
    </section>
    <ProductMobileNav active="profile" syllabusId={active.id}/>
    <style>{CSS}</style>
  </main>;
}

const CSS=`
.profileRoot{min-height:100vh;background:radial-gradient(circle at 24% -5%,#173d47 0,transparent 30%),#050d11;color:#edf4f3;font-family:Inter,system-ui,sans-serif}.profileTop{height:68px;display:flex;align-items:center;gap:28px;padding:0 clamp(18px,4vw,58px);border-bottom:1px solid #1d353d;background:#071216ec;backdrop-filter:blur(18px)}.profileBrand{font-size:18px;font-weight:950;letter-spacing:2.2px}.profileBrand span{color:#e3bb58}.profileTop nav{display:flex;gap:4px}.profileTop nav a,.profileBack{padding:9px 11px;border-radius:9px;color:#81979b;text-decoration:none;font-size:11px;font-weight:800}.profileTop nav a:hover{background:#0d2229;color:#edf4f3}.profileBack{margin-left:auto;border:1px solid #2c4951}.profileWrap{max-width:1120px;margin:auto;padding:26px 18px 85px}.profileHero{min-height:310px;display:grid;grid-template-columns:310px 1fr;border:1px solid #34515a;border-radius:22px;overflow:hidden;background:radial-gradient(circle at 17% 35%,#23809035 0,transparent 28%),linear-gradient(135deg,#0c252d,#08171b 64%);box-shadow:0 30px 100px #0006}.profilePortrait{position:relative;display:flex;align-items:end;justify-content:center;overflow:hidden}.portraitGlow{position:absolute;width:310px;height:310px;border-radius:50%;background:#38a4b027;filter:blur(38px);bottom:-120px}.profilePortrait img{height:285px;max-width:270px;object-fit:contain;position:relative;z-index:2;filter:drop-shadow(0 20px 24px #000a)}.profileIdentity{padding:46px 40px 32px;align-self:center}.pEy{font:850 9px ui-monospace;color:#68d5df;letter-spacing:1.5px}.profileIdentity h1{font-size:43px;letter-spacing:-2px;margin:8px 0 2px}.profileIdentity>p{font-size:14px;color:#d8b85e;margin:0 0 12px;font-weight:800}.identityMeta{display:flex;gap:7px;flex-wrap:wrap}.identityMeta span{border:1px solid #35525a;border-radius:99px;padding:5px 8px;font-size:8px;color:#849ba0}.profileStats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:26px}.profileStats div{padding:10px 12px;border:1px solid #29464e;border-radius:11px;background:#07161b}.profileStats small,.profileStats strong{display:block}.profileStats small{font:800 7px ui-monospace;color:#698d95}.profileStats strong{font-size:19px;margin-top:3px}.characterEditor{margin-top:12px;border:1px solid #29474f;border-radius:20px;background:#08191e;padding:24px}.editorHead{display:flex;justify-content:space-between;gap:20px}.editorHead h2{font-size:25px;margin:6px 0}.editorHead p{font-size:11px;color:#84999e}.serverTag{height:max-content;padding:6px 8px;border:1px solid #42604f;border-radius:99px;color:#79cda1;background:#0c2119;font:800 8px ui-monospace}.nameField{display:grid;gap:6px;margin-top:22px;max-width:520px}.nameField span,.archetypeLabel span{font-size:10px;font-weight:850;color:#c7d3d3}.nameField input{background:#061419;border:1px solid #35545d;border-radius:11px;padding:12px 13px;color:#fff;outline:none}.nameField input:focus{border-color:#61d2dd;box-shadow:0 0 0 3px #61d2dd10}.roleLock{margin-top:12px;max-width:520px;display:grid;gap:2px;padding:11px 13px;border:1px solid #354b50;border-radius:11px;background:#0b1518}.roleLock small{font:800 7px ui-monospace;color:#6f8d93}.roleLock strong{font-size:12px;color:#e1bd60}.roleLock span{font-size:9px;color:#72898e}.archetypeLabel{display:grid;gap:2px;margin-top:25px}.archetypeLabel small{color:#71898f;font-size:9px}.archetypeGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:10px}.archetypeCard{position:relative;cursor:pointer;border:1px solid #29464f;border-radius:15px;background:linear-gradient(180deg,#0c2026,#071419);overflow:hidden}.archetypeCard input{position:absolute;opacity:0}.avatarStage{height:190px;display:flex;align-items:end;justify-content:center;background:radial-gradient(circle at 50% 65%,#1d68732b 0,transparent 47%)}.avatarStage img{max-height:178px;max-width:155px;object-fit:contain;filter:drop-shadow(0 12px 14px #0009)}.archCopy{padding:11px 12px 14px;border-top:1px solid #213b42}.archCopy strong{font-size:12px}.archCopy p{font-size:9px;line-height:1.4;color:#71888d;margin:5px 0 0;min-height:38px}.check{position:absolute;right:8px;top:8px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#0a171b;border:1px solid #37545c;color:#567079;font-size:11px}.archetypeCard:has(input:checked){border-color:#d0aa4c;box-shadow:0 0 0 1px #d0aa4c35}.archetypeCard:has(input:checked) .check{background:#e4bd5c;border-color:#e4bd5c;color:#17130b}.profileNotice{margin-top:14px;padding:11px 12px;border-radius:10px;font-size:10px}.profileNotice.ok{border:1px solid #427859;background:#0e281d;color:#a7e6bd}.profileNotice.bad{border:1px solid #83504a;background:#2a1716;color:#edaaa4}.profileActions{display:flex;gap:8px;margin-top:18px}.profileActions button,.profileActions a{padding:11px 14px;border-radius:10px;font-size:10px;font-weight:900}.profileActions button{border:1px solid #d5ac4b;background:linear-gradient(180deg,#e9c665,#c99d3e);color:#17130a;cursor:pointer}.profileActions a{border:1px solid #35515a;color:#9eb0b3}.profileMobileNav{display:none}
@media(max-width:850px){.profileTop nav{display:none}.profileHero{grid-template-columns:230px 1fr}.profilePortrait img{height:240px}.profileStats{grid-template-columns:1fr 1fr}.archetypeGrid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.profileTop{height:58px;padding:0 12px}.profileWrap{padding:12px 9px 78px}.profileHero{grid-template-columns:1fr;min-height:auto}.profilePortrait{height:230px}.profilePortrait img{height:225px}.profileIdentity{padding:20px}.profileIdentity h1{font-size:31px}.characterEditor{padding:16px}.editorHead{display:block}.serverTag{display:inline-flex;margin-top:5px}.archetypeGrid{grid-template-columns:1fr 1fr}.avatarStage{height:155px}.avatarStage img{max-height:146px}.profileMobileNav{position:fixed;z-index:50;display:grid;grid-template-columns:repeat(5,1fr);left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));border:1px solid #2e4b54;border-radius:14px;background:#061217ef;backdrop-filter:blur(16px);box-shadow:0 15px 45px #000a}.profileMobileNav a{text-align:center;padding:10px 3px;color:#718a90;font-size:8px;font-weight:850}.profileMobileNav a.active{color:#e4bd5d}}
`;
