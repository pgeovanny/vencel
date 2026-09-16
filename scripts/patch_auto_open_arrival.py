from pathlib import Path

p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
old="const next:Near={type:t.type,id:t.id};this.lastNear=`${t.type}:${t.id}`;setNear(next);setDistance(null);if(!this.autoOpenLock){this.autoOpenLock=true;this.time.delayedCall(260,()=>{this.autoOpenLock=false;primaryRef.current()})}"
new="const next:Near={type:t.type,id:t.id};this.lastNear=`${t.type}:${t.id}`;nr.current=next;setNear(next);setDistance(null);setCloud('Alvo alcançado • abrindo interação…');if(!this.autoOpenLock){this.autoOpenLock=true;this.time.delayedCall(260,()=>{this.autoOpenLock=false;if(!blockedRef.current)primaryRef.current()})}"
if old not in s:
    raise RuntimeError('arrival auto-open pattern not found')
p.write_text(s.replace(old,new,1))
