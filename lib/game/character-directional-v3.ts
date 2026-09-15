import { PALETTES, chibiSvg } from '@/lib/game/character-assets-v2';

export type Facing='front'|'back'|'side';

function base(styleName:string){return PALETTES[styleName]||PALETTES.civilian}

function capBack(p:any){
  if(p.cap==='police')return `<path d="M56 52q11-28 54-28q43 0 54 28l-8 18q-47-12-92 0z" fill="#101a2b" stroke="#080e17" stroke-width="5"/><path d="M69 64q42-8 82 2" fill="none" stroke="#31445d" stroke-width="5"/>`;
  if(p.cap==='security')return `<path d="M58 52q11-26 52-26q42 0 52 26l-7 17q-45-11-90 0z" fill="#15191b" stroke="#090c0d" stroke-width="5"/><path d="M73 61h74" stroke="${p.accent}" stroke-width="5"/>`;
  return '';
}

function hairBackShape(p:any){
  if(p.hairStyle==='long')return `<path d="M50 78q7-57 60-59q54 1 60 59l-10 110q-18 26-42 29l3-96q-42 12-83-2l5 100q-27-8-33-38z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  if(p.hairStyle==='ponytail')return `<path d="M55 76q7-52 55-56q49 3 55 56q-21-11-52-9q-29 2-58-9z" fill="${p.hair}" stroke="#241915" stroke-width="5"/><path d="M156 58q34 7 36 39q2 36-31 58q12-30-5-49q-9-11 0-48z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  if(p.hairStyle==='bob'||p.hairStyle==='wave')return `<path d="M53 77q6-53 57-57q52 3 57 57l-9 58q-15 20-35 25l3-50q-45 14-78-1l3 54q-22-8-26-30z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  return `<path d="M57 71q9-47 52-51q46 3 51 50q-22-10-51-9q-26 1-52 10z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
}

function torso(p:any){
  if(p.outfit==='robe')return `<path d="M60 132q18-20 50-20q34 0 50 20l18 84q-68 28-136 0z" fill="url(#cloth)" stroke="#0a0d11" stroke-width="6"/><path d="M79 138q31 15 62 0" fill="none" stroke="${p.accent}" stroke-width="4" opacity=".75"/>`;
  return `<path d="M63 132q16-20 47-20q33 0 48 20l-8 75q-40 17-80 0z" fill="url(#cloth)" stroke="#0b1219" stroke-width="6"/>`;
}

export function directionalChibiSvg(styleName='civilian',facing:Facing='front',variant='npc'){
  if(facing==='front')return chibiSvg(styleName,variant);
  const p:any=base(styleName),female=p.gender==='female',glow=variant==='player'?`<ellipse cx="110" cy="237" rx="67" ry="27" fill="none" stroke="#6ce5ff" stroke-width="4" opacity=".82"/><ellipse cx="110" cy="237" rx="79" ry="34" fill="none" stroke="#6ce5ff" stroke-width="2" opacity=".22"/>`:'';
  if(facing==='back')return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="275" viewBox="0 0 220 275"><defs><filter id="s" x="-40%" y="-35%" width="180%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#000" flood-opacity=".36"/></filter><linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.body}"/><stop offset="1" stop-color="${p.body2}"/></linearGradient></defs><ellipse cx="110" cy="246" rx="54" ry="14" fill="#000" opacity=".24"/><g filter="url(#s)">${hairBackShape(p)}<path d="M70 194h28l-4 44H64zM122 194h28l6 44h-34z" fill="${p.pants}" stroke="#0d1319" stroke-width="5"/>${torso(p)}<path d="M73 147l-24 43q-5 10 6 16q9 4 15-6l19-42M147 147l24 43q5 10-6 16q-9 4-15-6l-19-42" fill="${p.body}" stroke="#0b1219" stroke-width="6" stroke-linecap="round"/><ellipse cx="110" cy="95" rx="47" ry="52" fill="${p.skin}" stroke="#5a3a2d" stroke-width="5"/>${hairBackShape({...p,hairStyle:p.hairStyle==='crop'?'crop':p.hairStyle})}${capBack(p)}${p.outfit==='police'||p.outfit==='security'?`<path d="M86 148h48v18H86z" fill="#fff" opacity=".06"/><path d="M106 150h8v13h-8z" fill="${p.accent}" opacity=".9"/>`:''}${female?`<path d="M82 176q28 12 56 0l7 31q-36 18-71 0z" fill="${p.body2}" opacity=".5"/>`:''}${glow}</g></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="275" viewBox="0 0 220 275"><defs><filter id="s" x="-40%" y="-35%" width="180%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#000" flood-opacity=".36"/></filter><linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.body}"/><stop offset="1" stop-color="${p.body2}"/></linearGradient><radialGradient id="skin" cx="38%" cy="28%" r="75%"><stop offset="0" stop-color="#ffd6b4"/><stop offset=".72" stop-color="${p.skin}"/><stop offset="1" stop-color="#c68e69"/></radialGradient></defs><ellipse cx="110" cy="246" rx="54" ry="14" fill="#000" opacity=".24"/><g filter="url(#s)"><path d="M71 194h28l-4 43H65zM121 194h28l6 43h-34z" fill="${p.pants}" stroke="#0d1319" stroke-width="5"/>${torso(p)}<path d="M74 147l-24 42q-5 10 6 16q9 4 15-6l19-41M146 147l24 42q5 10-6 16q-9 4-15-6l-19-41" fill="${p.body}" stroke="#0b1219" stroke-width="6" stroke-linecap="round"/><ellipse cx="111" cy="96" rx="45" ry="52" fill="url(#skin)" stroke="#5a3a2d" stroke-width="5"/><path d="M64 69q15-44 51-48q41 4 48 43q-28-8-54-2q-21 5-45 7z" fill="${p.hair}" stroke="#241915" stroke-width="5"/><ellipse cx="135" cy="96" rx="8" ry="10" fill="#211919"/><ellipse cx="132" cy="92" rx="2.5" ry="3" fill="#fff"/><path d="M150 100q14 4 17 12q-9 3-17 1" fill="${p.skin}" stroke="#6a4334" stroke-width="3"/><path d="M132 117q10 5 19 0" fill="none" stroke="#9c5d54" stroke-width="3" stroke-linecap="round"/>${p.badge?`<path d="M132 152l10 5l-2 14l-8 7l-8-7l-2-14z" fill="${p.accent}"/>`:''}${glow}</g></svg>`;
}
