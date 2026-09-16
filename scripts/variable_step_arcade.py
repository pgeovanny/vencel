from pathlib import Path
p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
old="physics:{default:'arcade',arcade:{debug:false}},scene:Scene"
new="physics:{default:'arcade',arcade:{debug:false,fps:60,fixedStep:false}},scene:Scene"
if old not in s:
    raise RuntimeError('physics config anchor missing')
p.write_text(s.replace(old,new,1))
