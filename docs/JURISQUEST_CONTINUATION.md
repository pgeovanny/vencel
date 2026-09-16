# JurisQuest continuation state

Branch: `jurisquest-commercial-20260916`  
PR: `#1` against `jurisquest-next`  
Production authority: current Vercel production remains untouched until explicit promotion.

## Current architecture
- One gameplay runtime only: `components/game-runtime-pro-v4.tsx`.
- Campaign and Plantão both use V4; do not create or restore a second gameplay runtime.
- Decision verdicts and feedback are server-authoritative.
- Campaign uses `submitCampaignDecision`; Plantão uses `submitPlantaoAnswer`.
- Browser mission payloads are sanitized; initial payloads do not contain answer keys or post-answer feedback.
- Runtime feedback is cached only after the server returns the verdict; do not reintroduce `choice.correct`-based client logic.
- `missions_client` exists in Supabase and returns accessible missions with sanitized `mission_json`.
- `missions_admin` exposes raw mission JSON only when `is_admin()` is true.
- Student pages have been migrated from `missions` to `missions_client`.
- Admin raw mission reads use `missions_admin`; administrative writes still target `missions` under admin RLS.
- Broad authenticated `SELECT` on `missions` is temporarily retained only so the old production deployment keeps working during preview validation. Final revoke happens only with promotion of the migrated app.

## Security hardening completed on 2026-09-16
- Added and applied `supabase/migrations/20260916195000_commercial_security_hardening.sql`.
- `sanitize_mission_json_v1` now has an explicit safe `search_path`.
- `missions_client` and `missions_admin` use `security_invoker=true` plus the existing access/admin guards.
- Anonymous grants were removed from Plantão tables and authentication-required gameplay RPCs.
- Internal trigger helpers are no longer directly executable by API roles.
- Supabase security advisor no longer reports the previous `SECURITY DEFINER VIEW` error or mutable-search-path warning for the sanitizer.
- Keep the authenticated gameplay RPC grants that are intentionally part of the application contract.

## Runtime / visual state
- Visual Studio settings change the real V4 runtime: preset, time, weather, density, particles, fog, vignette and camera zoom.
- Runtime has movement game-feel polish: walk/idle motion, target pulse, arrival feedback and modal/feedback transitions.
- Visual Studio previews use real procedural scene and character assets.
- `components/admin/asset-library.tsx` lets the admin define HTTPS artwork overrides without code changes.
- Scene presets support `config.background_url`.
- Character catalog entries support `front_url`, `side_url`, `back_url` and `portrait_url`.
- V4 preloads these overrides and falls back to procedural SVGs if no external art is configured.
- External character sprites are scale-normalized so large source images do not explode in size.

## Navigation / product state
- Dashboard is the game command center.
- Perfil, Revisão, Casos and Edital use a shared product navigation shell.
- Plantão landing/report were simplified; active Plantão runs through V4.
- The old duplicate active Plantão runtime must not be reintroduced.

## Preview warning
The most recent Vercel preview inspected (`dpl_D1nN5uNa2PEHS5F74zMqbgEuZNrj`) is not a trustworthy final preview of this branch. Its build log ran `bootstrap.cjs` and reported:

`JurisQuest commercial preview restored at 95e1c69006d49a2d1036528f44a0a474d6ec82c9`

That commit is substantially behind the current commercial branch. Do not promote or sign off that deployment. A fresh preview must compile the current HEAD and its build log must prove that the expected source revision was restored/built.

## Immediate next sequence
1. Inspect permanent CI gates on the current HEAD: build, student journey and dependency/security audit.
2. Fix any regression before deployment; do not bypass failing gates.
3. Deploy a fresh Vercel preview from the current `jurisquest-commercial-20260916` HEAD and verify its actual source revision in build logs.
4. Validate authenticated flows: login, Dashboard, Campanha, Plantão, Revisão, Perfil, Edital, Arquivo and ADM Visual Studio/asset library.
5. Test external artwork override with at least one preset and one character, confirming SVG fallback still works.
6. Continue commercial polish: direct asset upload/storage workflow, higher-fidelity scene/character art, mobile interaction QA, performance and monetization gating.
7. At production promotion only, revoke broad authenticated `SELECT` on `missions` and grant only non-sensitive metadata columns. Keep `missions_client` for students and `missions_admin` for raw admin reads.

## Product rules
- Do not rebuild the game from zero unless explicitly requested.
- Do not regress working features into prototypes.
- Student UX should feel like a game, not a quiz wrapped in cards.
- Visual Studio must alter the actual runtime, not store inert configuration.
- Server decides correctness, XP, review scheduling and rewards.
- Production must not be changed without explicit approval.
