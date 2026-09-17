from pathlib import Path
p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
old1='startedAt:this.time.now,duration'
new1='startedAt:performance.now(),duration'
old2='(time-t.startedAt)/Math.max(1,t.duration)'
new2='(performance.now()-t.startedAt)/Math.max(1,t.duration)'
if old1 not in s or old2 not in s:
    raise RuntimeError('wall-clock anchors missing')
p.write_text(s.replace(old1,new1,1).replace(old2,new2,1))
