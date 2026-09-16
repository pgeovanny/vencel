from pathlib import Path


def once(s,old,new,label):
    if old not in s:
        raise RuntimeError(f'missing pattern: {label}')
    return s.replace(old,new,1)

# Runtime
p=Path('components/game-runtime-pro-v4.tsx')
s=p.read_text()
s=once(s,"  visualPresets?:any[];\n","  visualPresets?:any[];\n  visualAssets?:any[];\n",'props visual assets')
s=once(s,"export default function GameRuntimeProV4({missionId,mission,userId,initialCharacter,initialProgress,runtimeSettings,visualPresets=[],replayMode=false,exploreMode=false,exploreStage=null,mode='campaign',patrolContext=null}:Props){",
       "export default function GameRuntimeProV4({missionId,mission,userId,initialCharacter,initialProgress,runtimeSettings,visualPresets=[],visualAssets=[],replayMode=false,exploreMode=false,exploreStage=null,mode='campaign',patrolContext=null}:Props){",
       'runtime signature')
s=once(s,"  const stages=useMemo(()=>[...(mission.stages||[])].sort((a:any,b:any)=>(a.order||0)-(b.order||0)),[mission]);",
       "  const stages=useMemo(()=>[...(mission.stages||[])].sort((a:any,b:any)=>(a.order||0)-(b.order||0)),[mission]);\n  const visualAssetMap=useMemo(()=>new Map((visualAssets||[]).filter((a:any)=>a?.kind==='character').map((a:any)=>[a.config?.style||a.slug,a.config||{}])),[visualAssets]);\n  const portraitSrc=(style:string)=>{const cfg:any=visualAssetMap.get(style)||{};return cfg.portrait_url||cfg.front_url||svgUri(chibiSvg(style));};",
       'runtime asset map')
old="preload(){this.load.image('bg-parking',svgUri(sceneSvg('parking_night')));this.load.image('bg-station',svgUri(sceneSvg('police_station')));this.load.image('bg-court',svgUri(sceneSvg('courtroom')));for(const k of Object.keys(CHARACTERS)){for(const f of ['front','back','side'] as Facing[])this.load.image(`char-${k}-${f}`,svgUri(directionalChibiSvg(k,f)))}for(const f of ['front','back','side'] as Facing[])this.load.image(`char-player-${f}`,svgUri(directionalChibiSvg(character.archetype||'operational',f,'player')));this.load.image('obj-camera',svgUri(objectSvg('camera')));this.load.image('obj-evidence',svgUri(objectSvg('evidence')));this.load.image('obj-document',svgUri(objectSvg('document')))}"
new="preload(){this.load.image('bg-parking',svgUri(sceneSvg('parking_night')));this.load.image('bg-station',svgUri(sceneSvg('police_station')));this.load.image('bg-court',svgUri(sceneSvg('courtroom')));for(const p of visualPresets||[]){const u=p?.config?.background_url;if(typeof u==='string'&&u.startsWith('https://'))this.load.image(`preset-bg-${p.slug}`,u)}for(const k of Object.keys(CHARACTERS)){const cfg:any=visualAssetMap.get(k)||{};for(const f of ['front','back','side'] as Facing[]){const u=cfg[`${f}_url`];this.load.image(`char-${k}-${f}`,typeof u==='string'&&u.startsWith('https://')?u:svgUri(directionalChibiSvg(k,f)))}}const pcfg:any=visualAssetMap.get(character.archetype||'operational')||{};for(const f of ['front','back','side'] as Facing[]){const u=pcfg[`${f}_url`];this.load.image(`char-player-${f}`,typeof u==='string'&&u.startsWith('https://')?u:svgUri(directionalChibiSvg(character.archetype||'operational',f,'player')))}this.load.image('obj-camera',svgUri(objectSvg('camera')));this.load.image('obj-evidence',svgUri(objectSvg('evidence')));this.load.image('obj-document',svgUri(objectSvg('document')))}"
s=once(s,old,new,'runtime preload overrides')
s=once(s,"    bgKey(s:any){return s.environment==='police_station'?'bg-station':s.environment==='courtroom'?'bg-court':'bg-parking'}",
       "    bgKey(s:any){const custom=`preset-bg-${this.visual(s)?.slug||''}`;if(this.textures.exists(custom))return custom;return s.environment==='police_station'?'bg-station':s.environment==='courtroom'?'bg-court':'bg-parking'}",
       'background key override')
old="actor(def:any,isPlayer=false){const x=this.mapX(def.position?.x||600),y=this.mapY(def.position?.y||650),style=def.visual?.archetype||def.style||'civilian',facing=(def.visual?.facing||'front') as Facing,img=this.physics.add.image(x,y,isPlayer?`char-player-${facing}`:`char-${style}-${facing}`).setOrigin(.5,.84),scale=Math.max(.4,Math.min(.6,this.worldH/1580));img.setScale(scale);(img as any).jqBaseScale=scale;"
new="actor(def:any,isPlayer=false){const x=this.mapX(def.position?.x||600),y=this.mapY(def.position?.y||650),style=def.visual?.archetype||def.style||'civilian',facing=(def.visual?.facing||'front') as Facing,img=this.physics.add.image(x,y,isPlayer?`char-player-${facing}`:`char-${style}-${facing}`).setOrigin(.5,.84),cfg:any=visualAssetMap.get(style)||{},external=!!cfg[`${facing}_url`],scale=external?Math.max(.08,Math.min(.55,(this.worldH*.19)/Math.max(1,img.height||512))):Math.max(.4,Math.min(.6,this.worldH/1580));img.setScale(scale);(img as any).jqBaseScale=scale;"
s=once(s,old,new,'external character scale')
old="<div className=\"dialog\"><img src={svgUri(chibiSvg(dialog.actor.visual?.archetype||dialog.actor.style||'civilian'))} alt=\"\"/><div>"
new="<div className=\"dialog\"><img src={portraitSrc(dialog.actor.visual?.archetype||dialog.actor.style||'civilian')} alt=\"\"/><div>"
s=once(s,old,new,'dialog external portrait')
p.write_text(s)

# Campaign page
p=Path('app/game/[id]/page.tsx')
s=p.read_text()
s=once(s,"  const [{ data: character }, { data: progress }, { data: runtimeSettings }, { data: visualPresets }] = await Promise.all([",
       "  const [{ data: character }, { data: progress }, { data: runtimeSettings }, { data: visualPresets }, { data: visualAssets }] = await Promise.all([",
       'campaign promise destructure')
s=once(s,"    sb.from('game_visual_presets').select('slug,name,config').eq('active',true).order('sort_order'),\n  ]);",
       "    sb.from('game_visual_presets').select('slug,name,config').eq('active',true).order('sort_order'),\n    sb.from('game_asset_catalog').select('slug,kind,config').eq('active',true).eq('kind','character').order('sort_order'),\n  ]);",
       'campaign visual assets query')
s=once(s,"      visualPresets={visualPresets || []}\n","      visualPresets={visualPresets || []}\n      visualAssets={visualAssets || []}\n",'campaign visual assets prop')
p.write_text(s)

# Plantao page
p=Path('app/plantao/page.tsx')
s=p.read_text()
s=once(s,"  const[{data:character},{data:syllabus},{data:runtimeSettings},{data:visualPresets}]=await Promise.all([",
       "  const[{data:character},{data:syllabus},{data:runtimeSettings},{data:visualPresets},{data:visualAssets}]=await Promise.all([",
       'patrol promise destructure')
s=once(s,"    sb.from('game_visual_presets').select('slug,name,config').eq('active',true).order('sort_order'),\n  ]);",
       "    sb.from('game_visual_presets').select('slug,name,config').eq('active',true).order('sort_order'),\n    sb.from('game_asset_catalog').select('slug,kind,config').eq('active',true).eq('kind','character').order('sort_order'),\n  ]);",
       'patrol assets query')
s=once(s,"      visualPresets={visualPresets||[]}\n","      visualPresets={visualPresets||[]}\n      visualAssets={visualAssets||[]}\n",'patrol assets prop')
p.write_text(s)
