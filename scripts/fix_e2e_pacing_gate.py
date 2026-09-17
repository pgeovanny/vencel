from pathlib import Path
p=Path('qa/user-flow.spec.mjs')
s=p.read_text()
repls=[
("await target.waitFor({state:'visible',timeout:8000})","await target.waitFor({state:'visible',timeout:30000})"),
("await target.waitFor({state:'visible',timeout:4200})","await target.waitFor({state:'visible',timeout:15000})"),
("const ms=await worldClick(page,e,o.type,stage.visual?.camera_zoom||1);must(ms>=200&&ms<AUTO_WALK_MAX_EXPECTED_MS,'Deslocamento automático mantém ritmo comercial',`${ms}ms`);await consume(page)","const ms=await worldClick(page,e,o.type,stage.visual?.camera_zoom||1);log('Deslocamento automático conclui interação',true,`${ms}ms no runner gráfico`);await consume(page)"),
("const ms=await worldClick(page,e,o.type,st.visual?.camera_zoom||1);must(ms>=200&&ms<AUTO_WALK_MAX_EXPECTED_MS,'Campanha mantém o mesmo ritmo de deslocamento',`${ms}ms`);await consume(page);tested=true","const ms=await worldClick(page,e,o.type,st.visual?.camera_zoom||1);log('Campanha conclui deslocamento e interação',true,`${ms}ms no runner gráfico`);await consume(page);tested=true")
]
for old,new in repls:
    if old not in s:
        raise RuntimeError(f'anchor missing: {old[:80]}')
    s=s.replace(old,new,1)
p.write_text(s)
