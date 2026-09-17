# JurisQuest — instruções de continuidade

Este repositório contém a fonte real do JurisQuest. Se o trabalho for retomado em outro chat/agente, NÃO reconstrua o projeto do zero, NÃO restaure runtimes antigos e NÃO use V17/V18/V19 como base de produção.

## Fonte e branches
- Repositório: `pgeovanny/vencel`
- Produção/fonte pública atual: branch `jurisquest-next`
- Branch segura de evolução comercial: `jurisquest-commercial-20260916`
- Produção pública: `https://jurisquest-next.vercel.app`
- Supabase principal: `lgyayqdvsevbhyijbdqh`
- Leia também `docs/JURISQUEST_CONTINUATION.md` antes de alterar arquitetura.

## Estado arquitetural atual — preservar
- Next.js 16 + React 19 + TypeScript.
- Supabase SSR/PKCE/RLS.
- Runtime único vigente: `components/game-runtime-pro-v4.tsx`.
- Campanha e Plantão usam o mesmo Pro V4. Não recriar runtime paralelo para Plantão.
- Rota da Campanha: `app/game/[id]/page.tsx`.
- Plantão: `app/plantao/page.tsx` + RPCs server-authoritative.
- Navegação de produto compartilhada em Dashboard/Perfil/Revisão/Casos/Edital.
- Visual Studio altera o runtime real; assets externos possuem fallback procedural.

Arquivos centrais de jogo:
- `components/game-runtime-pro-v4.tsx`
- `lib/game/character-assets-v2.ts`
- `lib/game/character-directional-v3.ts`
- `lib/game/scene-assets-v3.ts`
- `lib/game/studio-assets.ts`
- `lib/game/studio-css.ts`
- `lib/game/visual-contract.ts`
- `lib/game/client-mission.ts`

## Segurança já implementada
O antigo P0 descrito nos handoffs iniciais NÃO é mais pendência:
- `correct`, `attempt_no`, `selected_text`, feedback, XP e conclusão não são confiados ao navegador;
- `secure_decision_attempt_before_insert()` normaliza tentativas no banco;
- `submit_decision_attempt_v1(...)` e `submit_patrol_answer(...)` são endpoints confiáveis;
- conclusão de missão e revisão são verificadas no servidor;
- `missions_client` entrega `mission_json` sanitizado;
- `missions_admin` expõe JSON bruto somente para admin;
- `20260916195000_commercial_security_hardening.sql` registra as views sanitizadas no repositório, usa `security_invoker` e remove grants anônimos desnecessários.

Não reintroduzir lógica baseada em `choice.correct` no cliente e não mandar answer keys/feedback pós-resposta no payload inicial do aluno.

## Regra operacional
1. Trabalhar primeiro na branch `jurisquest-commercial-20260916`.
2. Preservar a produção atual até haver preview da fonte correta testado.
3. Não substituir o Pro V4 por Pro V3, runtime simplificado ou protótipo.
4. Servidor decide correção, XP, revisão, progresso sensível, recompensas e acesso.
5. Validar schema e conteúdo antes de publicação.
6. Executar CI + preview + fluxo autenticado antes de qualquer promoção.
7. Produção só pode ser promovida com autorização explícita do usuário.

## ALERTA DE PREVIEW
O preview Vercel mais recente inspecionado em 2026-09-16 (`dpl_D1nN5uNa2PEHS5F74zMqbgEuZNrj`) está `READY`, porém o build restaurou o commit `95e1c69006d49a2d1036528f44a0a474d6ec82c9` via `bootstrap.cjs`. Esse commit ficou dezenas de commits atrás da branch comercial.

Portanto:
- NÃO usar esse preview como validação final;
- NÃO promovê-lo;
- criar um preview novo a partir do HEAD real da branch e confirmar no build log qual commit foi restaurado/compilado.

## Benchmark: Patrulha BR
Usar apenas princípios mecânicos: observar -> investigar/interagir -> decidir -> consequência -> feedback -> progressão/revisão. Não copiar arte, código, texto ou identidade.

No JurisQuest, o diferencial recorrente deve vir de:
- Plantões curtos adaptativos;
- revisões vencidas, erros e lacunas do edital;
- variedade de ocorrências;
- campanha narrativa;
- diagnóstico por tópico;
- conteúdo autoral/versionado;
- progressão legítima e sem farming.

## Próxima sequência
1. Confirmar CI verde no HEAD atual.
2. Gerar preview Vercel realmente baseado no HEAD atual.
3. Validar login, Dashboard, Campanha, Plantão, Revisão, Perfil, Edital, Arquivo e ADM/Visual Studio.
4. Validar ao menos um override externo de cenário e personagem com fallback SVG.
5. Fazer QA mobile/performance e monetização/paywall.
6. Somente na promoção final, retirar o `SELECT` legado amplo em `missions`, mantendo `missions_client` para aluno e `missions_admin` para admin.
