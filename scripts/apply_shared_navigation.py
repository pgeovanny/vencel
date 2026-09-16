from pathlib import Path

GLOBAL_CSS = r'''

/* JQ_PRODUCT_NAV_V1 */
.jqProductTop{height:68px;position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:22px;padding:0 clamp(14px,3vw,42px);border-bottom:1px solid var(--jq-line);background:#051116f2;backdrop-filter:blur(20px);box-shadow:0 10px 35px #0004}
.jqProductBrand{font-size:18px;font-weight:950;letter-spacing:2.1px;white-space:nowrap}.jqProductBrand span{color:var(--jq-gold)}
.jqProductTop nav{display:flex;gap:3px}.jqProductTop nav a{padding:9px 11px;border-radius:9px;color:#758c91;font-size:10px;font-weight:850;transition:.16s}.jqProductTop nav a:hover,.jqProductTop nav a.active{color:#f1f6f4;background:#0d2228}.jqProductTop nav a.active{box-shadow:inset 0 -2px 0 var(--jq-gold)}
.jqProductState{margin-left:auto;display:flex;align-items:center;gap:7px;color:#6f858b;font:800 8px var(--jq-mono);letter-spacing:.08em;white-space:nowrap}.jqProductState i{width:6px;height:6px;border-radius:50%;background:var(--jq-green);box-shadow:0 0 12px var(--jq-green)}
.jqProductBack{padding:8px 10px;border:1px solid #2d4b54;border-radius:9px;color:#9bb0b4;font-size:9px;font-weight:850;white-space:nowrap}.jqProductBack:hover{border-color:#55747d;color:#eef5f4;background:#0a2026}
.jqProductMobileNav{display:none}
@media(max-width:900px){.jqProductTop nav{display:none}.jqProductState{display:none}.jqProductTop{height:60px;padding:0 12px}.jqProductBack{margin-left:auto}.jqProductMobileNav{position:fixed;z-index:80;display:grid;grid-template-columns:repeat(5,1fr);left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));border:1px solid #2d4b54;border-radius:14px;background:#061217f2;backdrop-filter:blur(18px);box-shadow:0 16px 50px #000a;overflow:hidden}.jqProductMobileNav a{text-align:center;padding:11px 3px;color:#71888e;font-size:8px;font-weight:850}.jqProductMobileNav a.active{color:#f0ce71;background:#102027}}
'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'missing pattern: {label}')
    return text.replace(old, new, 1)


g = Path('app/globals.css')
css = g.read_text()
if '/* JQ_PRODUCT_NAV_V1 */' not in css:
    g.write_text(css + GLOBAL_CSS)

p = Path('app/profile/page.tsx')
s = p.read_text()
if 'product-navigation' not in s:
    s = replace_once(s, "import { saveCharacter } from './actions';", "import { saveCharacter } from './actions';\nimport { ProductHeader, ProductMobileNav } from '@/components/product-navigation';", 'profile import')
s = s.replace('    <header className="profileTop"><a href="/dashboard" className="profileBrand">JURIS<span>QUEST</span></a><nav><a href="/dashboard">Início</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a></nav><a className="profileBack" href="/dashboard">← Painel</a></header>', '    <ProductHeader active="profile" syllabusId={active.id}/>')
s = s.replace('    <nav className="profileMobileNav"><a href="/dashboard">Início</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a><a className="active" href="/profile">Perfil</a></nav>', '    <ProductMobileNav active="profile" syllabusId={active.id}/>')
p.write_text(s)

p = Path('app/review/page.tsx')
s = p.read_text()
if 'product-navigation' not in s:
    s = replace_once(s, "import { createClient } from '@/lib/supabase/server';", "import { createClient } from '@/lib/supabase/server';\nimport { ProductHeader, ProductMobileNav } from '@/components/product-navigation';", 'review import')
s = s.replace('    <header className="memoryTop"><a href="/dashboard" className="memoryBrand">JURIS<span>QUEST</span></a><nav><a href="/dashboard">Central</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a className="active" href="/review">Revisão</a></nav><div className="memoryStatus"><i/> SISTEMA DE MEMÓRIA ATIVO</div></header>', '    <ProductHeader active="review"/>')
if '<ProductMobileNav active="review"/>' not in s:
    s = replace_once(s, '    </div>\n    <style>{CSS}</style>', '    </div>\n    <ProductMobileNav active="review"/>\n    <style>{CSS}</style>', 'review mobile nav')
p.write_text(s)

p = Path('app/archive/page.tsx')
s = p.read_text()
if 'product-navigation' not in s:
    s = replace_once(s, "import { createClient } from '@/lib/supabase/server';", "import { createClient } from '@/lib/supabase/server';\nimport { ProductHeader, ProductMobileNav } from '@/components/product-navigation';", 'archive import')
s = s.replace('    <header className="archiveTop"><a href="/dashboard" className="archiveBrand">JURIS<span>QUEST</span></a><nav><a href="/dashboard">Início</a><a href="/plantao">Plantão</a><a className="active" href="/archive">Casos</a><a href="/review">Revisão</a></nav><a className="archiveBack" href="/dashboard">← Painel</a></header>', '    <ProductHeader active="cases"/>')
if '<ProductMobileNav active="cases"/>' not in s:
    s = replace_once(s, '    </section>\n    <style>{CSS}</style>', '    </section>\n    <ProductMobileNav active="cases"/>\n    <style>{CSS}</style>', 'archive mobile nav')
p.write_text(s)

p = Path('app/syllabus/[id]/page.tsx')
s = p.read_text()
if 'product-navigation' not in s:
    s = replace_once(s, "import { createClient } from '@/lib/supabase/server';", "import { createClient } from '@/lib/supabase/server';\nimport { ProductHeader, ProductMobileNav } from '@/components/product-navigation';", 'syllabus import')
s = s.replace('    <header className="territoryTop"><a href="/dashboard" className="territoryBrand">JURIS<span>QUEST</span></a><nav><a href="/dashboard">Central</a><a href="/plantao">Plantão</a><a href="/archive">Casos</a><a href="/review">Revisão</a><a className="active" href={`/syllabus/${id}`}>Edital</a></nav><a className="back" href="/dashboard">← Central</a></header>', '    <ProductHeader active="syllabus" syllabusId={id}/>')
if '<ProductMobileNav active="syllabus"' not in s:
    s = replace_once(s, '    <style>{CSS}</style>\n  </main>;', '    <ProductMobileNav active="syllabus" syllabusId={id}/>\n    <style>{CSS}</style>\n  </main>;', 'syllabus mobile nav')
p.write_text(s)
