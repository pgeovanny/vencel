from pathlib import Path

STUDENT_FILES = [
    'app/profile/page.tsx',
    'app/dashboard/page.tsx',
    'app/plantao/page.tsx',
    'app/archive/page.tsx',
    'app/review/page.tsx',
    'app/syllabus/[id]/page.tsx',
    'app/game/[id]/page.tsx',
    'app/review/[id]/page.tsx',
]
ADMIN_FILES = [
    'app/admin/page.tsx',
    'app/admin/syllabi/page.tsx',
    'app/admin/missions/page.tsx',
    'app/admin/visual/page.tsx',
]

for name in STUDENT_FILES:
    p=Path(name)
    s=p.read_text()
    s2=s.replace(".from('missions')", ".from('missions_client')")
    if s2==s:
        print(f'no student replacement in {name}')
    p.write_text(s2)

for name in ADMIN_FILES:
    p=Path(name)
    s=p.read_text()
    s2=s.replace(".from('missions')", ".from('missions_admin')")
    if s2==s:
        print(f'no admin replacement in {name}')
    p.write_text(s2)

# Visual action reads raw mission JSON through the admin-only view, writes remain on the base table.
p=Path('app/admin/visual/actions.ts')
s=p.read_text()
s=s.replace("sb.from('missions').select('mission_json')", "sb.from('missions_admin').select('mission_json')")
p.write_text(s)

# Keep a machine-readable handoff inside the repository so work can resume safely in another chat/session.
p=Path('docs/JURISQUEST_CONTINUATION.md')
p.write_text('''# JurisQuest continuation state\n\nBranch: `jurisquest-commercial-20260916`\nProduction authority: current Vercel production remains untouched until explicit promotion.\n\n## Current architecture\n- One gameplay runtime only: `components/game-runtime-pro-v4.tsx`.\n- Campaign and Plantão both use V4.\n- Answer verdicts are server-authoritative.\n- Browser mission payloads are sanitized before render.\n- `missions_client` exists in Supabase and removes answer keys / post-answer feedback.\n- `missions_admin` exists for raw JSON, guarded by `is_admin()`.\n- Direct `missions` SELECT is temporarily retained only for compatibility with the old production deployment.\n\n## Next required sequence\n1. Finish migrating every student read from `missions` to `missions_client`.\n2. Verify admin raw reads use `missions_admin` and writes still use `missions`.\n3. Run build, student journey E2E, dependency audit, and inspect runtime for regressions.\n4. Deploy a fresh preview of this branch; production remains untouched.\n5. Validate preview manually/authenticated.\n6. At promotion time only: revoke broad authenticated SELECT on `missions` and grant only non-sensitive columns.\n7. Continue visual/commercial work: external/admin-replaceable assets, higher-fidelity scenes/characters, animation polish, mobile QA, monetization gating.\n\n## Product rules\n- Do not create a second game/runtime.\n- Do not regress working features into prototypes.\n- Student UX should feel like a game, not a quiz wrapped in cards.\n- Visual Studio must change the actual runtime.\n- Production must not be changed without explicit approval.\n''')
