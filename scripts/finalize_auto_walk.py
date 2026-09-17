from pathlib import Path
import re
p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
replacement="""    startAuto(type:'actor'|'object',id:string,go:any){
      if(!this.canClick(type,id))return;
      const dx=go.x-this.player.x,dy=go.y-this.player.y,d=Math.max(1,Math.hypot(dx,dy));
      const radius=Math.max(72,Number(runtimeSettings?.settings?.interaction_radius||120)*.78);
      const travel=Math.max(0,d-radius*.72);
      const duration=Math.max(560,Math.min(2200,620+travel*2.05));
      const ux=dx/d,uy=dy/d,destX=go.x-ux*radius*.72,destY=go.y-uy*radius*.72;
      this.autoTarget=null;this.autoOpenLock=false;this.player.body.setVelocity(0,0);
      if(this.jqAutoTween){try{this.jqAutoTween.stop()}catch{}}
      setCloud(`Indo até ${type==='actor'?'o personagem':'a evidência'}…`);setDistance(Math.max(1,Math.round(d/55)));
      this.jqAutoTween=this.tweens.add({targets:this.player,x:destX,y:destY,duration,ease:'Sine.easeInOut',
        onUpdate:()=>this.faceMove(destX-this.player.x,destY-this.player.y,performance.now()),
        onComplete:()=>{this.jqAutoTween=null;try{this.player.body.reset(destX,destY)}catch{}this.player.angle=0;const base=Number(this.player.jqBaseScale||this.player.scaleX||.5);this.player.setScale(base);const pulse=this.add.circle(go.x,go.y,24,0xe7c15c,.08).setStrokeStyle(3,0xe7c15c,.92).setDepth(1750);this.tweens.add({targets:pulse,scale:2.15,alpha:0,duration:420,ease:'Cubic.easeOut',onComplete:()=>pulse.destroy()});const next:Near={type,id};this.lastNear=`${type}:${id}`;nr.current=next;setNear(next);setDistance(null);setCloud('Alvo alcançado • abrindo interação…');if(!this.autoOpenLock){this.autoOpenLock=true;this.time.delayedCall(180,()=>{this.autoOpenLock=false;if(!blockedRef.current)primaryRef.current()})}}
      });
    }
"""
pat=r"    startAuto\(type:'actor'\|'object',id:string,go:any\)\{.*?\n    actor\("
m=re.search(pat,s,re.S)
if not m: raise RuntimeError('startAuto block not found')
s=s[:m.start()]+replacement+'    actor('+s[m.end():]
p.write_text(s)
