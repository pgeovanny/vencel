from pathlib import Path

p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
old="setCloud('Alvo alcançado • abrindo interação…');if(!this.autoOpenLock){this.autoOpenLock=true;this.time.delayedCall(180,()=>{this.autoOpenLock=false;if(!blockedRef.current)primaryRef.current()})}"
new="setCloud('Alvo alcançado • abrindo interação…');if(!this.autoOpenLock){this.autoOpenLock=true;primaryRef.current();this.time.delayedCall(220,()=>{this.autoOpenLock=false})}"
if old not in s:
    raise RuntimeError('arrival auto-open anchor missing')
p.write_text(s.replace(old,new,1))
