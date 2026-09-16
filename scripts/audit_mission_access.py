from pathlib import Path
import re

roots=[Path('app'),Path('components'),Path('lib')]
rows=[]
for root in roots:
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix not in {'.ts','.tsx','.js','.mjs'}: continue
        try:s=p.read_text()
        except: continue
        if "from('missions')" in s or 'from("missions")' in s or 'mission_json' in s:
            lines=s.splitlines()
            for i,line in enumerate(lines,1):
                if "from('missions')" in line or 'from("missions")' in line or 'mission_json' in line:
                    rows.append(f'{p}:{i}: {line.strip()}')
Path('docs/mission-access-audit.txt').write_text('\n'.join(rows)+'\n')
print('\n'.join(rows))
