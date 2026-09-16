from pathlib import Path


def once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing pattern: {label}')
    return text.replace(old, new, 1)

p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()

old="img.setScale(scale);img.body.setSize(74,46);img.body.setCollideWorldBounds(true);"
new="img.setScale(scale);(img as any).jqBaseScale=scale;img.body.setSize(74,46);img.body.setCollideWorldBounds(true);"
s=once(s,old,new,'store character base scale')

old="faceMove(dx:number,dy:number,time:number){const f:Facing=Math.abs(dy)>=Math.abs(dx)?(dy<0?'back':'front'):'side';this.setFacing(this.player,character.archetype||'operational',f,dx<0,true);this.player.angle=Math.sin(time/115)*.7}"
new="faceMove(dx:number,dy:number,time:number){const f:Facing=Math.abs(dy)>=Math.abs(dx)?(dy<0?'back':'front'):'side';this.setFacing(this.player,character.archetype||'operational',f,dx<0,true);const base=Number(this.player.jqBaseScale||this.player.scaleX||.5),step=Math.sin(time/82),lift=Math.abs(step);this.player.angle=step*1.05;this.player.setScale(base*(1+lift*.018),base*(1-lift*.028));}"
s=once(s,old,new,'walk cycle')

old="else{this.player.body.setVelocity(0,0);this.player.angle=0}"
new="else{this.player.body.setVelocity(0,0);this.player.angle=0;const base=Number(this.player.jqBaseScale||this.player.scaleX||.5),breath=Math.sin(time/720)*.006;this.player.setScale(base*(1+breath),base*(1-breath*.55))}"
s=once(s,old,new,'idle cycle')

old="this.player.body.setVelocity(0,0);this.player.angle=0;this.autoTarget=null;const next:Near={type:t.type,id:t.id};"
new="this.player.body.setVelocity(0,0);this.player.angle=0;const base=Number(this.player.jqBaseScale||this.player.scaleX||.5);this.player.setScale(base);this.autoTarget=null;const pulse=this.add.circle(t.go.x,t.go.y,24,0xe7c15c,.08).setStrokeStyle(3,0xe7c15c,.92).setDepth(1750);this.tweens.add({targets:pulse,scale:2.15,alpha:0,duration:420,ease:'Cubic.easeOut',onComplete:()=>pulse.destroy()});const next:Near={type:t.type,id:t.id};"
s=once(s,old,new,'arrival pulse')

old="if(targetGo){this.beacon.setVisible(true);this.beacon.x=targetGo.x;"
new="if(targetGo){this.beacon.setVisible(true);this.beacon.setScale(1+Math.sin(time/250)*.08);this.beacon.x=targetGo.x;"
s=once(s,old,new,'target pulse')

p.write_text(s)

p=Path('lib/game/studio-css.ts')
s=p.read_text()
old=".modal{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 38%,#0b273044,transparent 40%),#020609d4;backdrop-filter:blur(10px)}.sheet{"
new="@keyframes jqModalFade{from{opacity:0}to{opacity:1}}@keyframes jqSheetRise{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes jqPortraitIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}@keyframes jqFeedbackGlow{0%{box-shadow:0 0 0 transparent}45%{box-shadow:0 0 42px #70cf9926}100%{box-shadow:0 0 0 transparent}}\n.modal{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 38%,#0b273044,transparent 40%),#020609d4;backdrop-filter:blur(10px);animation:jqModalFade .16s ease-out}.sheet{animation:jqSheetRise .22s cubic-bezier(.2,.8,.2,1);"
s=once(s,old,new,'modal animation')

old=".dialog>img{width:250px;height:330px;object-fit:contain;"
new=".dialog>img{width:250px;height:330px;object-fit:contain;animation:jqPortraitIn .26s ease-out;"
s=once(s,old,new,'dialog portrait animation')

old=".feedback.ok{border-color:#3f7256;background:#0a2118}.feedback.ok:before{background:#70cf99}.feedback.warn{border-color:#7e4945;background:#251514}.feedback.warn:before{background:#df766d}"
new=".feedback.ok{border-color:#3f7256;background:#0a2118;animation:jqFeedbackGlow .6s ease-out}.feedback.ok:before{background:#70cf99}.feedback.warn{border-color:#7e4945;background:#251514;box-shadow:0 0 36px #df766d16}.feedback.warn:before{background:#df766d}"
s=once(s,old,new,'feedback response')

old="@media(prefers-reduced-motion:reduce){.topActions button,.choices button{transition:none}}"
new="@media(prefers-reduced-motion:reduce){.topActions button,.choices button{transition:none}.modal,.sheet,.dialog>img,.feedback.ok{animation:none!important}}"
s=once(s,old,new,'reduced motion')
p.write_text(s)
