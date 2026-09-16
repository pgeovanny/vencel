# JurisQuest continuation state

Branch: `jurisquest-commercial-20260916`
Production authority: current Vercel production remains untouched until explicit promotion.

## Current architecture
- One gameplay runtime only: `components/game-runtime-pro-v4.tsx`.
- Campaign and Plantão both use V4.
- Answer verdicts are server-authoritative.
- Browser mission payloads are sanitized before render.
- `missions_client` exists in Supabase and removes answer keys / post-answer feedback.
- `missions_admin` exists for raw JSON, guarded by `is_admin()`.
- Direct `missions` SELECT is temporarily retained only for compatibility with the old production deployment.

## Next required sequence
1. Finish migrating every student read from `missions` to `missions_client`.
2. Verify admin raw reads use `missions_admin` and writes still use `missions`.
3. Run build, student journey E2E, dependency audit, and inspect runtime for regressions.
4. Deploy a fresh preview of this branch; production remains untouched.
5. Validate preview manually/authenticated.
6. At promotion time only: revoke broad authenticated SELECT on `missions` and grant only non-sensitive columns.
7. Continue visual/commercial work: external/admin-replaceable assets, higher-fidelity scenes/characters, animation polish, mobile QA, monetization gating.

## Product rules
- Do not create a second game/runtime.
- Do not regress working features into prototypes.
- Student UX should feel like a game, not a quiz wrapped in cards.
- Visual Studio must change the actual runtime.
- Production must not be changed without explicit approval.
