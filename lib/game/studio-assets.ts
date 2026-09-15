export const PALETTES: Record<string, { body: string; trim: string; pants: string; hair: string; skin: string; accent: string }> = {
  police: { body: '#163b66', trim: '#7ce4ff', pants: '#0f223a', hair: '#2f231f', skin: '#e0aa82', accent: '#f4cf5e' },
  delegate: { body: '#2d3442', trim: '#e1c87a', pants: '#202631', hair: '#33251f', skin: '#ddb088', accent: '#d3b55b' },
  clerk: { body: '#425d6c', trim: '#b9dce5', pants: '#2d3b45', hair: '#5b3927', skin: '#e0b18a', accent: '#87d5e2' },
  civilian: { body: '#9a5477', trim: '#f0c0d2', pants: '#40515e', hair: '#5a392a', skin: '#e0b28c', accent: '#e4b9d1' },
  security: { body: '#9a7a22', trim: '#f1d27b', pants: '#2e312e', hair: '#2b251f', skin: '#d7a37c', accent: '#efcb58' },
  suspect: { body: '#6b4944', trim: '#aa7c72', pants: '#2a2c31', hair: '#2c221e', skin: '#ca9670', accent: '#c28b7d' },
  medic: { body: '#d84f59', trim: '#ffffff', pants: '#344a50', hair: '#4a3027', skin: '#e4b68e', accent: '#ffffff' },
  prosecutor: { body: '#263e5a', trim: '#c8ad62', pants: '#1f2834', hair: '#2e241f', skin: '#dcad86', accent: '#d6b75f' },
  judge: { body: '#25282d', trim: '#cfb464', pants: '#181c20', hair: '#72706a', skin: '#e0b08a', accent: '#d6b95e' },
  court_staff: { body: '#58636e', trim: '#a5c5cf', pants: '#30363d', hair: '#3a2b24', skin: '#d7a67e', accent: '#7ed4e0' },
  operational: { body: '#214f79', trim: '#78d8eb', pants: '#223444', hair: '#2d2420', skin: '#dba983', accent: '#73d9eb' },
  investigator: { body: '#3c6550', trim: '#a9d4b0', pants: '#26372e', hair: '#332820', skin: '#d6a47d', accent: '#8bd1a3' },
  analyst: { body: '#56517c', trim: '#c6c1ee', pants: '#302d42', hair: '#3a2c23', skin: '#ddac85', accent: '#c9c4ef' },
  formal: { body: '#45505b', trim: '#b8c5cb', pants: '#252c32', hair: '#2c2420', skin: '#d9a77f', accent: '#a9c7d2' },
};

export const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function chibiSvg(styleName = 'civilian', variant = 'npc') {
  const p = PALETTES[styleName] || PALETTES.civilian;
  const cap = styleName === 'police' || styleName === 'security' || styleName === 'operational';
  const medic = styleName === 'medic';
  const glasses = styleName === 'judge' || styleName === 'clerk';
  const badge = ['police','delegate','security','operational'].includes(styleName);
  const longHair = ['civilian','medic','clerk'].includes(styleName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="230" viewBox="0 0 180 230">
  <defs>
    <filter id="s" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity=".34"/></filter>
    <linearGradient id="u" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.body}"/><stop offset="1" stop-color="#101a22"/></linearGradient>
    <radialGradient id="f" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#f4c49b"/><stop offset="1" stop-color="${p.skin}"/></radialGradient>
  </defs>
  <ellipse cx="90" cy="205" rx="46" ry="13" fill="#000" opacity=".22"/>
  <g filter="url(#s)">
    <path d="M58 165 L75 165 L74 207 L54 207 Z" fill="${p.pants}" stroke="#10161b" stroke-width="5"/>
    <path d="M105 165 L122 165 L126 207 L106 207 Z" fill="${p.pants}" stroke="#10161b" stroke-width="5"/>
    <path d="M55 205 h22 q3 0 4 7 h-31 q0-7 5-7" fill="#10161b"/>
    <path d="M103 205 h25 q4 0 4 7 h-33 q0-7 4-7" fill="#10161b"/>
    <path d="M46 111 q10-18 44-18 q34 0 44 18 l-5 69 q-39 19-78 0z" fill="url(#u)" stroke="#10161b" stroke-width="6"/>
    <path d="M48 122 l-21 45 q-3 9 6 13 q8 3 12-5 l18-42" fill="${p.body}" stroke="#10161b" stroke-width="6" stroke-linecap="round"/>
    <path d="M132 122 l21 45 q3 9-6 13 q-8 3-12-5 l-18-42" fill="${p.body}" stroke="#10161b" stroke-width="6" stroke-linecap="round"/>
    <path d="M67 100 q23-10 46 0 l-4 19 q-19 9-38 0z" fill="${p.trim}" opacity=".28"/>
    <ellipse cx="90" cy="79" rx="44" ry="45" fill="url(#f)" stroke="#4a3329" stroke-width="5"/>
    ${longHair ? `<path d="M45 72 q0-47 45-52 q47 4 48 55 l-7 53 q-10 14-21 15 l4-39 q-44 15-68-2 l4 40 q-14-5-17-19z" fill="${p.hair}" stroke="#3a2822" stroke-width="5"/>` : `<path d="M47 69 q5-45 43-48 q41 3 45 48 q-16-16-32-13 q-24 3-52-5z" fill="${p.hair}" stroke="#3a2822" stroke-width="5"/>`}
    <path d="M58 64 q13-18 32-18 q22 0 33 19 q-17-9-32-8 q-18 0-33 7" fill="${p.hair}"/>
    <ellipse cx="73" cy="82" rx="7" ry="9" fill="#2a211d"/>
    <ellipse cx="108" cy="82" rx="7" ry="9" fill="#2a211d"/>
    <circle cx="71" cy="79" r="2" fill="#fff"/><circle cx="106" cy="79" r="2" fill="#fff"/>
    <path d="M82 101 q8 5 16 0" fill="none" stroke="#8a5948" stroke-width="3" stroke-linecap="round"/>
    <path d="M64 70 q10-5 18 0" fill="none" stroke="#4a3329" stroke-width="3" stroke-linecap="round"/>
    <path d="M99 70 q10-5 18 0" fill="none" stroke="#4a3329" stroke-width="3" stroke-linecap="round"/>
    ${glasses ? `<rect x="60" y="73" width="27" height="20" rx="7" fill="none" stroke="#1a2d35" stroke-width="4"/><rect x="94" y="73" width="27" height="20" rx="7" fill="none" stroke="#1a2d35" stroke-width="4"/><path d="M87 82 h7" stroke="#1a2d35" stroke-width="4"/>` : ''}
    ${cap ? `<path d="M49 46 q10-24 41-24 q32 0 42 25 l-6 14 q-37-14-73 0z" fill="${p.body}" stroke="#10161b" stroke-width="5"/><path d="M84 30 h14 v13 h-14z" fill="${p.accent}" opacity=".9"/><path d="M98 55 q25 0 32 10 h-47z" fill="#10212b"/>` : ''}
    ${badge ? `<path d="M108 130 l9 5 l-2 12 l-7 6 l-7-6 l-2-12z" fill="${p.accent}" stroke="#ffeab0" stroke-width="2"/>` : ''}
    ${medic ? `<rect x="80" y="127" width="20" height="8" rx="3" fill="#fff"/><rect x="86" y="121" width="8" height="20" rx="3" fill="#fff"/>` : ''}
    ${variant === 'player' ? `<circle cx="90" cy="173" r="51" fill="none" stroke="#71e5ff" stroke-width="5" opacity=".9"/><circle cx="90" cy="173" r="58" fill="none" stroke="#71e5ff" stroke-width="2" opacity=".25"/>` : ''}
  </g>
</svg>`;
}

export function objectSvg(kind = 'document') {
  if (kind === 'camera') return `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="100" viewBox="0 0 130 100"><defs><filter id="s"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-opacity=".35"/></filter></defs><g filter="url(#s)"><rect x="18" y="28" width="92" height="52" rx="13" fill="#17252d" stroke="#5e7d87" stroke-width="4"/><circle cx="78" cy="54" r="18" fill="#0b1318" stroke="#70dff0" stroke-width="5"/><circle cx="78" cy="54" r="8" fill="#8df0ff"/><rect x="26" y="37" width="24" height="12" rx="4" fill="#354a54"/></g></svg>`;
  if (kind === 'evidence') return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90"><defs><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-opacity=".4"/></filter></defs><g filter="url(#s)" transform="rotate(-18 80 45)"><path d="M18 42 h88 l28 10 l-28 10 h-88z" fill="#d9d7d0" stroke="#4b5257" stroke-width="4"/><rect x="13" y="37" width="38" height="30" rx="8" fill="#6d4634"/></g></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="120" viewBox="0 0 130 120"><defs><filter id="s"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-opacity=".28"/></filter></defs><g filter="url(#s)"><rect x="22" y="12" width="86" height="96" rx="7" fill="#eee8d8" stroke="#5f686d" stroke-width="4"/><path d="M39 35 h52 M39 49 h52 M39 63 h42 M39 77 h48" stroke="#7c898f" stroke-width="5" stroke-linecap="round"/><circle cx="65" cy="92" r="7" fill="#b5934f"/></g></svg>`;
}

export function sceneSvg(kind = 'parking_night') {
  if (kind === 'police_station') return stationSvg();
  if (kind === 'courtroom') return courtSvg();
  return parkingSvg();
}

function parkingSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2130"/><stop offset="1" stop-color="#08151e"/></linearGradient>
    <linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#273741"/><stop offset="1" stop-color="#182832"/></linearGradient>
    <radialGradient id="lamp"><stop offset="0" stop-color="#ffd985" stop-opacity=".55"/><stop offset="1" stop-color="#ffd985" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
    <pattern id="grain" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r="1.2" fill="#fff" opacity=".05"/><circle cx="19" cy="18" r="1" fill="#000" opacity=".16"/></pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect x="0" y="0" width="1600" height="180" fill="#17313d"/>
  <rect x="0" y="168" width="1600" height="7" fill="#58c9dc" opacity=".16"/>
  <rect x="505" y="10" width="590" height="145" rx="9" fill="#142830" stroke="#49636a" stroke-width="4"/>
  <rect x="545" y="45" width="510" height="86" rx="5" fill="#0c1a21"/>
  <g fill="#e6bc63"><path d="M780 42 l20-23 l20 23z"/><path d="M761 80 h78 v7 h-78z"/></g>
  <text x="800" y="108" text-anchor="middle" fill="#ddb45f" font-size="34" font-family="Georgia,serif" letter-spacing="9">AURORA</text>
  <g fill="#17323b" stroke="#274a55" stroke-width="3">${[55,200,345,1200,1345,1490].map(x=>`<rect x="${x}" y="54" width="94" height="66" rx="5"/>`).join('')}</g>
  <rect y="180" width="1600" height="720" fill="url(#as)"/><rect y="180" width="1600" height="720" fill="url(#grain)"/>
  <g stroke="#d9d9bb" stroke-width="5" opacity=".44">${Array.from({length:12},(_,i)=>`<line x1="${80+i*130}" y1="265" x2="${80+i*130}" y2="610"/>`).join('')}<line x1="30" y1="615" x2="1570" y2="615"/></g>
  <g stroke="#c7d8db" stroke-width="7" opacity=".22"><path d="M40 730 h90 M180 730 h90 M320 730 h90 M460 730 h90 M600 730 h90 M740 730 h90 M880 730 h90 M1020 730 h90 M1160 730 h90 M1300 730 h90 M1440 730 h90"/></g>
  <g opacity=".24" filter="url(#blur)"><ellipse cx="280" cy="490" rx="230" ry="100" fill="#3fb7ff"/><ellipse cx="1180" cy="440" rx="210" ry="100" fill="#ff725d"/></g>
  ${[180,520,1080,1430].map(x=>`<g><rect x="${x-6}" y="145" width="12" height="180" rx="5" fill="#15252b"/><circle cx="${x}" cy="150" r="17" fill="#ffd486"/><circle cx="${x}" cy="150" r="125" fill="url(#lamp)"/></g>`).join('')}
  <g transform="translate(100 330) rotate(-5 170 75)"><ellipse cx="180" cy="145" rx="195" ry="40" fill="#000" opacity=".24"/><rect x="5" y="45" width="350" height="105" rx="28" fill="#1e426b" stroke="#0b1721" stroke-width="7"/><rect x="70" y="55" width="175" height="50" rx="15" fill="#0b1d27"/><rect x="110" y="20" width="95" height="14" rx="5" fill="#1a2730"/><rect x="120" y="23" width="34" height="8" fill="#55c5ff"/><rect x="158" y="23" width="34" height="8" fill="#f05f5f"/><circle cx="82" cy="152" r="34" fill="#111b21"/><circle cx="287" cy="152" r="34" fill="#111b21"/><text x="250" y="125" fill="#a8c4d4" opacity=".7" font-size="26" font-family="Arial" font-weight="700">POLÍCIA</text></g>
  <g transform="translate(1110 330) rotate(3 160 65)"><ellipse cx="165" cy="132" rx="175" ry="36" fill="#000" opacity=".22"/><rect x="5" y="40" width="325" height="95" rx="24" fill="#e7ecee" stroke="#607078" stroke-width="6"/><rect x="35" y="55" width="150" height="44" rx="11" fill="#1c313d"/><rect x="204" y="52" width="95" height="50" rx="10" fill="#c9414b" opacity=".9"/><circle cx="80" cy="138" r="31" fill="#162128"/><circle cx="270" cy="138" r="31" fill="#162128"/></g>
  <g transform="translate(730 690)"><ellipse cx="100" cy="78" rx="110" ry="26" fill="#000" opacity=".2"/><rect x="0" y="10" width="200" height="75" rx="20" fill="#4e5a61" stroke="#1d262b" stroke-width="6"/><rect x="45" y="20" width="95" height="35" rx="9" fill="#14252d"/><circle cx="50" cy="88" r="25" fill="#111a1f"/><circle cx="160" cy="88" r="25" fill="#111a1f"/></g>
  <g fill="#2d594f">${[[65,760],[1520,760],[80,240],[1510,245]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="48"/><circle cx="${x+35}" cy="${y+7}" r="38"/>`).join('')}</g>
  <g stroke="#d7a53c" stroke-width="10" opacity=".85"><line x1="1260" y1="790" x2="1600" y2="700"/></g>
  <g fill="#ef7b2d" stroke="#8d431a" stroke-width="4">${[[90,790],[510,790],[1010,790],[1350,780]].map(([x,y])=>`<path d="M${x} ${y} l18-62 h22 l18 62z"/>`).join('')}</g>
  </svg>`;
}

function stationSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2ded2"/><stop offset="1" stop-color="#b8b6ae"/></linearGradient><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d7d78"/><stop offset="1" stop-color="#474f50"/></linearGradient><pattern id="tiles" width="90" height="90" patternUnits="userSpaceOnUse"><rect width="90" height="90" fill="#8b8a84"/><path d="M0 0h90v90" fill="none" stroke="#c6c5bd" stroke-opacity=".24" stroke-width="2"/></pattern><radialGradient id="glow"><stop offset="0" stop-color="#ffd892" stop-opacity=".35"/><stop offset="1" stop-color="#ffd892" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#wall)"/><rect y="195" width="1600" height="705" fill="url(#tiles)"/><rect y="0" width="1600" height="195" fill="#2c3c42"/><rect x="40" y="30" width="650" height="135" rx="12" fill="#d6d2c7"/><text x="90" y="82" font-family="Arial" font-size="35" font-weight="800" fill="#3a3d3b">DELEGACIA CENTRAL</text><text x="90" y="126" font-family="Arial" font-size="22" font-weight="700" fill="#4d5555">PLANTÃO POLICIAL</text><g fill="#c6b069"><circle cx="635" cy="93" r="33"/><path d="M635 66 l14 24 l-14 28 l-14-28z" fill="#2f4248"/></g><g>${[120,420,910,1220].map(x=>`<rect x="${x}" y="270" width="250" height="110" rx="12" fill="#7e624a" stroke="#3e3329" stroke-width="5"/><rect x="${x+60}" y="248" width="110" height="70" rx="8" fill="#1c2b31"/><rect x="${x+78}" y="260" width="74" height="44" fill="#0b1317"/><rect x="${x+180}" y="250" width="35" height="60" rx="5" fill="#d0c9b9"/>`).join('')}</g><g fill="#46545b">${[75,180,285].map(x=>`<rect x="${x}" y="590" width="85" height="54" rx="11"/><rect x="${x+10}" y="643" width="65" height="80" rx="8"/>`).join('')}</g><rect x="1260" y="250" width="285" height="420" rx="8" fill="#51585a" stroke="#303738" stroke-width="6"/>${[0,1,2,3,4].map(i=>`<line x1="1290" y1="${310+i*66}" x2="1510" y2="${310+i*66}" stroke="#d1c7ae" stroke-opacity=".46" stroke-width="4"/>`).join('')}<g fill="#547564">${[[1150,180],[1380,180],[720,190]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="42"/><rect x="${x-12}" y="${y+28}" width="24" height="75" fill="#6f5947"/>`).join('')}</g><g opacity=".38">${[320,800,1280].map(x=>`<circle cx="${x}" cy="160" r="160" fill="url(#glow)"/>`).join('')}</g></svg>`;
}

function courtSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4eee1"/><stop offset="1" stop-color="#d8c7ad"/></linearGradient><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5b39"/><stop offset="1" stop-color="#4d2e1d"/></linearGradient><linearGradient id="marble" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0eee8"/><stop offset="1" stop-color="#c8c2b9"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#ffe7a4" stop-opacity=".5"/><stop offset="1" stop-color="#ffe7a4" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#wall)"/><rect y="330" width="1600" height="570" fill="url(#marble)"/><rect x="0" y="0" width="1600" height="320" fill="#efe5d3"/><g fill="#b8d8df" opacity=".75">${[80,290,1210,1420].map(x=>`<rect x="${x}" y="30" width="160" height="250" rx="5"/>`).join('')}</g><g opacity=".4">${[160,1360].map(x=>`<circle cx="${x}" cy="180" r="230" fill="url(#sun)"/>`).join('')}</g><rect x="430" y="95" width="740" height="190" rx="8" fill="url(#wood)" stroke="#3e281a" stroke-width="8"/><rect x="540" y="135" width="520" height="85" rx="7" fill="#4b3020"/><text x="800" y="188" text-anchor="middle" fill="#e0b95e" font-family="Georgia" font-size="34" letter-spacing="4">FÓRUM DE JUSTIÇA</text><path d="M800 55 l28 45 h-56z" fill="#d7b65f"/><rect x="780" y="100" width="40" height="6" fill="#d7b65f"/><rect x="300" y="390" width="300" height="115" rx="8" fill="url(#wood)" stroke="#4a2c1a" stroke-width="6"/><rect x="1000" y="390" width="300" height="115" rx="8" fill="url(#wood)" stroke="#4a2c1a" stroke-width="6"/><rect x="625" y="465" width="350" height="130" rx="8" fill="url(#wood)" stroke="#4a2c1a" stroke-width="6"/><rect x="570" y="585" width="460" height="230" rx="30" fill="#8d3f2f" opacity=".35"/>${[0,1,2].map(r=>[0,1,2,3,4].map(c=>`<rect x="${150+c*270}" y="${625+r*80}" width="180" height="42" rx="7" fill="#6e4933" stroke="#402c21" stroke-width="4"/>`).join('')).join('')}<g fill="#557552">${[[410,120],[1180,120],[80,310],[1520,310]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="40"/><rect x="${x-10}" y="${y+25}" width="20" height="70" fill="#6a513e"/>`).join('')}</g></svg>`;
}
