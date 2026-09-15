export type CharacterProfile = {
  gender: 'male' | 'female';
  outfit: 'police' | 'formal' | 'civilian' | 'medical' | 'security' | 'robe';
  body: string;
  body2: string;
  pants: string;
  hair: string;
  skin: string;
  accent: string;
  hairStyle: 'crop' | 'side' | 'bob' | 'long' | 'ponytail' | 'wave';
  glasses?: boolean;
  badge?: boolean;
  cap?: 'police' | 'security';
  tie?: boolean;
};

export const PALETTES: Record<string, CharacterProfile> = {
  police: { gender:'male', outfit:'police', body:'#193654', body2:'#0c1c31', pants:'#101a28', hair:'#241d1b', skin:'#e5b086', accent:'#e1b94c', hairStyle:'crop', badge:true, cap:'police' },
  operational: { gender:'male', outfit:'police', body:'#173f63', body2:'#0c2036', pants:'#132235', hair:'#1c1b1f', skin:'#dca57f', accent:'#64d9ef', hairStyle:'crop', badge:true, cap:'police' },
  delegate: { gender:'male', outfit:'formal', body:'#29394a', body2:'#18232f', pants:'#18222d', hair:'#33251f', skin:'#ddb087', accent:'#d5b35f', hairStyle:'side', badge:true, tie:true },
  prosecutor: { gender:'male', outfit:'formal', body:'#26344b', body2:'#151d2c', pants:'#18202d', hair:'#27231f', skin:'#dfad85', accent:'#d6b55d', hairStyle:'side', tie:true },
  court_staff: { gender:'male', outfit:'formal', body:'#52636e', body2:'#313f48', pants:'#29333c', hair:'#382b25', skin:'#d8a67e', accent:'#7bd2df', hairStyle:'side', tie:true },
  investigator: { gender:'male', outfit:'civilian', body:'#3b6852', body2:'#263c31', pants:'#29382f', hair:'#342820', skin:'#d5a37b', accent:'#8ccf9f', hairStyle:'crop' },
  formal: { gender:'male', outfit:'formal', body:'#46525d', body2:'#29333b', pants:'#252d34', hair:'#2d2521', skin:'#d9a77f', accent:'#abc5cf', hairStyle:'side', tie:true },
  security: { gender:'male', outfit:'security', body:'#9a7b24', body2:'#554313', pants:'#2e322f', hair:'#221f1b', skin:'#d8a37b', accent:'#f0cb55', hairStyle:'crop', badge:true, cap:'security' },
  suspect: { gender:'male', outfit:'civilian', body:'#684b45', body2:'#3b2927', pants:'#2c2f35', hair:'#352720', skin:'#cb9871', accent:'#b78074', hairStyle:'crop' },
  civilian: { gender:'female', outfit:'civilian', body:'#92546f', body2:'#5f324a', pants:'#3e4d5c', hair:'#56382b', skin:'#e6b88f', accent:'#e4aecb', hairStyle:'long' },
  clerk: { gender:'female', outfit:'formal', body:'#425f70', body2:'#273f4d', pants:'#303c46', hair:'#613a2a', skin:'#e3b68e', accent:'#86d5e3', hairStyle:'bob', glasses:true },
  medic: { gender:'female', outfit:'medical', body:'#d84f5a', body2:'#8f2e39', pants:'#334950', hair:'#6a3b2d', skin:'#e6b58d', accent:'#ffffff', hairStyle:'ponytail' },
  judge: { gender:'female', outfit:'robe', body:'#23272d', body2:'#121519', pants:'#181c20', hair:'#3e343a', skin:'#e1b089', accent:'#d2b25d', hairStyle:'wave', glasses:true },
  analyst: { gender:'female', outfit:'formal', body:'#5a5681', body2:'#37334f', pants:'#312e43', hair:'#3b2d28', skin:'#ddab84', accent:'#cbc6ef', hairStyle:'bob', glasses:true },
};

function hairBack(p: CharacterProfile) {
  if (p.hairStyle === 'long') return `<path d="M54 78Q54 24 110 18q57 6 58 62l-10 87q-17 27-42 29l4-78q-48 17-88-3l7 78q-27-7-31-37z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  if (p.hairStyle === 'ponytail') return `<path d="M58 72q5-47 52-52q48 5 52 50q-19-12-40-9q-30 4-61-7z" fill="${p.hair}" stroke="#241915" stroke-width="5"/><path d="M155 52q35 4 39 37q3 37-34 58q14-28-2-48q-12-15-3-47z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  if (p.hairStyle === 'bob') return `<path d="M56 75q4-50 54-56q53 5 55 56l-10 48q-14 24-34 26l4-42q-45 18-72-2l4 43q-18-8-21-28z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  if (p.hairStyle === 'wave') return `<path d="M56 74q5-49 53-55q52 4 56 55l-8 47q-11 20-25 25q7-22-5-36q-35 13-70-4q-7 22-1 42q-17-6-22-29z" fill="${p.hair}" stroke="#241915" stroke-width="5"/>`;
  return '';
}

function hairFront(p: CharacterProfile) {
  if (p.hairStyle === 'side') return `<path d="M61 66q13-39 49-43q39 3 48 40q-30-16-61-2q-20 9-36 5z" fill="${p.hair}" stroke="#241915" stroke-width="5"/><path d="M72 50q32-26 69-6q-21 0-46 19z" fill="#fff" opacity=".05"/>`;
  if (p.hairStyle === 'crop') return `<path d="M59 66q8-43 50-47q45 4 49 46q-16-12-32-10q-31 4-65-8z" fill="${p.hair}" stroke="#241915" stroke-width="5"/><path d="M66 49l17-20l5 18l18-24l8 21l17-12l-4 24z" fill="${p.hair}"/>`;
  return `<path d="M58 69q12-40 51-45q42 4 51 43q-23-12-47-7q-27 7-55 9z" fill="${p.hair}"/>`;
}

function capSvg(p: CharacterProfile) {
  if (p.cap === 'police') return `<g><path d="M58 49q11-25 51-25q39 0 50 25l-7 15q-43-14-88 0z" fill="#101a2b" stroke="#080e17" stroke-width="5"/><path d="M97 32h24v21H97z" fill="#263c59"/><path d="M103 36h12v12h-12z" fill="${p.accent}"/><path d="M80 61q38-10 73 7H73z" fill="#080d14"/></g>`;
  if (p.cap === 'security') return `<g><path d="M60 49q10-23 49-23q39 0 49 23l-6 15q-43-13-87 0z" fill="#15191b" stroke="#090c0d" stroke-width="5"/><rect x="87" y="34" width="44" height="13" rx="4" fill="${p.accent}"/><path d="M79 61q38-9 73 7H73z" fill="#090b0c"/></g>`;
  return '';
}

function outfitSvg(p: CharacterProfile) {
  if (p.outfit === 'robe') return `<path d="M62 132q16-20 48-20q33 0 49 20l17 84q-66 28-132 0z" fill="url(#cloth)" stroke="#0a0d11" stroke-width="6"/><path d="M87 126l23 28l24-28" fill="none" stroke="${p.accent}" stroke-width="5"/>`;
  if (p.outfit === 'medical') return `<path d="M65 132q15-19 45-19q31 0 46 19l-8 72q-38 17-77 0z" fill="url(#cloth)" stroke="#35151a" stroke-width="6"/><rect x="101" y="145" width="20" height="7" rx="2" fill="#fff"/><rect x="107" y="139" width="7" height="20" rx="2" fill="#fff"/>`;
  return `<path d="M64 132q15-20 46-20q31 0 47 20l-7 73q-40 18-80 0z" fill="url(#cloth)" stroke="#0b1219" stroke-width="6"/>`;
}

export function chibiSvg(styleName = 'civilian', variant = 'npc') {
  const p = PALETTES[styleName] || PALETTES.civilian;
  const female = p.gender === 'female';
  const faceRx = female ? 47 : 46;
  const jawY = female ? 102 : 104;
  const eyeW = female ? 9 : 7.5;
  const shoulder = female ? 43 : 49;
  const legInset = female ? 70 : 66;
  const glow = variant === 'player' ? `<ellipse cx="110" cy="233" rx="67" ry="27" fill="none" stroke="#6ce5ff" stroke-width="4" opacity=".82"/><ellipse cx="110" cy="233" rx="79" ry="34" fill="none" stroke="#6ce5ff" stroke-width="2" opacity=".22"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="275" viewBox="0 0 220 275">
  <defs>
    <filter id="shadow" x="-40%" y="-35%" width="180%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#000" flood-opacity=".36"/></filter>
    <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.body}"/><stop offset="1" stop-color="${p.body2}"/></linearGradient>
    <radialGradient id="skin" cx="42%" cy="28%" r="75%"><stop offset="0" stop-color="#ffd6b4"/><stop offset=".72" stop-color="${p.skin}"/><stop offset="1" stop-color="#c68e69"/></radialGradient>
  </defs>
  <ellipse cx="110" cy="246" rx="54" ry="14" fill="#000" opacity=".24"/>
  <g filter="url(#shadow)">
    ${hairBack(p)}
    <path d="M${legInset} 194h28l-4 43H${legInset-6}z" fill="${p.pants}" stroke="#0d1319" stroke-width="5"/>
    <path d="M${220-legInset-28} 194h28l6 43h-34z" fill="${p.pants}" stroke="#0d1319" stroke-width="5"/>
    <path d="M${legInset-8} 235h39q5 0 6 10H${legInset-14}q0-10 6-10" fill="#090d12"/>
    <path d="M${220-legInset-30} 235h41q5 0 6 10h-52q0-10 5-10" fill="#090d12"/>
    ${outfitSvg(p)}
    <path d="M74 145l-24 43q-5 10 6 16q9 4 15-6l19-42" fill="${p.body}" stroke="#0b1219" stroke-width="6" stroke-linecap="round"/>
    <path d="M146 145l24 43q5 10-6 16q-9 4-15-6l-19-42" fill="${p.body}" stroke="#0b1219" stroke-width="6" stroke-linecap="round"/>
    ${female ? `<path d="M82 174q28 12 56 0l7 31q-36 18-71 0z" fill="${p.body2}" opacity=".52"/>` : ''}
    <ellipse cx="110" cy="96" rx="${faceRx}" ry="52" fill="url(#skin)" stroke="#5a3a2d" stroke-width="5"/>
    ${hairFront(p)}
    ${capSvg(p)}
    <ellipse cx="90" cy="96" rx="${eyeW}" ry="${female?11:9}" fill="#211919"/>
    <ellipse cx="130" cy="96" rx="${eyeW}" ry="${female?11:9}" fill="#211919"/>
    <ellipse cx="87" cy="92" rx="2.8" ry="3.4" fill="#fff"/><ellipse cx="127" cy="92" rx="2.8" ry="3.4" fill="#fff"/>
    <path d="M78 82q12-7 23 0M119 82q12-7 23 0" fill="none" stroke="#50342a" stroke-width="3.2" stroke-linecap="round"/>
    ${female ? `<path d="M99 ${jawY}q11 7 22 0" fill="none" stroke="#a6615b" stroke-width="3" stroke-linecap="round"/><circle cx="75" cy="111" r="7" fill="#d67f77" opacity=".18"/><circle cx="145" cy="111" r="7" fill="#d67f77" opacity=".18"/>` : `<path d="M101 ${jawY}q9 4 18 0" fill="none" stroke="#915b4d" stroke-width="3" stroke-linecap="round"/>`}
    ${p.glasses ? `<rect x="73" y="86" width="33" height="25" rx="8" fill="#bdeaf3" fill-opacity=".06" stroke="#18303b" stroke-width="4"/><rect x="114" y="86" width="33" height="25" rx="8" fill="#bdeaf3" fill-opacity=".06" stroke="#18303b" stroke-width="4"/><path d="M106 97h8" stroke="#18303b" stroke-width="4"/>` : ''}
    ${p.tie ? `<path d="M104 139h12l7 11l-13 27l-13-27z" fill="#8c2733" stroke="#351016" stroke-width="2"/>` : ''}
    ${p.badge ? `<path d="M132 151l10 5l-2 14l-8 7l-8-7l-2-14z" fill="${p.accent}" stroke="#fff0b4" stroke-width="2"/>` : ''}
    <path d="M78 142q24-13 64 0" fill="none" stroke="#fff" stroke-width="4" opacity=".08"/>
    ${glow}
  </g>
</svg>`;
}
