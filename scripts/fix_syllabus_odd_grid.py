from pathlib import Path
p=Path('app/syllabus/[id]/page.tsx')
s=p.read_text()
old='.topicNode.active{background:linear-gradient(145deg,#18170e,#061519)}.nodeRadar'
new='.topicNode.active{background:linear-gradient(145deg,#18170e,#061519)}.topicNode:last-child:nth-child(odd){grid-column:1/-1}.nodeRadar'
if old not in s: raise RuntimeError('syllabus grid anchor missing')
p.write_text(s.replace(old,new,1))
