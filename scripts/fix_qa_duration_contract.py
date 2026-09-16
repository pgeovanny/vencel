from pathlib import Path
p=Path('qa/user-flow.spec.mjs')
s=p.read_text()
old="must(/Math\\.max\\(320,Math\\.min\\(650,d\\/1\\.8\\)\\)/.test(runtimeSource),'Ritmo automático limitado para sessão de estudo',`<=${AUTO_WALK_MAX_EXPECTED_MS}ms esperados em viewport normal`);"
new="must(/duration=Math\\.max\\(560,Math\\.min\\(2200,620\\+travel\\*2\\.05\\)\\)/.test(runtimeSource),'Ritmo automático limitado para sessão de estudo',`<=${AUTO_WALK_MAX_EXPECTED_MS}ms esperados em viewport normal`);"
if old not in s: raise RuntimeError('duration contract anchor missing')
p.write_text(s.replace(old,new,1))
