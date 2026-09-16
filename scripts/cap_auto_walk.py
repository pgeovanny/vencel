from pathlib import Path
p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
old="const speed=Math.max(WALK_SPEED,Math.min(380,d/2.6));"
new="const speed=Math.max(320,Math.min(650,d/1.8));"
if old not in s: raise RuntimeError('auto walk speed anchor missing')
p.write_text(s.replace(old,new,1))
