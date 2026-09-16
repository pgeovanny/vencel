# JurisQuest — instruções de continuidade

Este repositório contém a fonte real do JurisQuest. Se este trabalho for retomado em outro chat/agente, NÃO reconstrua o projeto do zero e NÃO use protótipos V17/V18/V19 como base de produção.

## Fonte e branches
- Repositório: `pgeovanny/vencel`
- Branch de produção/fonte corrente: `jurisquest-next`
- Branch segura de evolução comercial: `jurisquest-commercial-20260916`
- Produção pública: `https://jurisquest-next.vercel.app`
- Exemplo de missão real: `https://jurisquest-next.vercel.app/game/22226ea7-dffd-4309-b919-223563c4a363`

## Arquitetura atual que deve ser preservada
- Next.js 16 + React 19 + TypeScript
- Supabase SSR/PKCE/RLS
- Runtime principal: `components/game-runtime-pro-v3.tsx`
- Rota do jogo: `app/game/[id]/page.tsx`
- Assets principais:
  - `lib/game/character-assets-v2.ts`
  - `lib/game/character-directional-v3.ts`
  - `lib/game/scene-assets-v3.ts`
  - `lib/game/studio-assets.ts`
  - `lib/game/studio-css.ts`
  - `lib/game/visual-contract.ts`
- Admin existente: missões, usuários, edital, visual e comercial.
- Banco Supabase principal: projeto `lgyayqdvsevbhyijbdqh`.

## Regra operacional
1. Trabalhar primeiro na branch `jurisquest-commercial-20260916`.
2. Preservar a produção atual até haver preview testado.
3. Não substituir o Pro V3 por runtime simplificado.
4. Não confiar no cliente para `correct`, XP, progresso, desbloqueio, acesso ou `attempt_no`.
5. Validar `mission_json` no servidor antes de publicar/usar para recompensa.
6. Fazer deploy em preview, executar fluxo autenticado e só então promover com autorização explícita do usuário.

## Falha prioritária já reproduzida
O cliente ainda calcula/envia campos sensíveis de tentativa (`correct`, `attempt_no`, `selected_text`) e o trigger de XP usa esses valores. Isso permite fabricar uma tentativa correta e obter XP. Corrigir com contrato server-side/RPC atômico antes de ampliar gamificação.

## Benchmark confirmado: Patrulha BR
Referência pública: `https://patrulhabr.com/` e app `com.patrulhabr.game` no Google Play.
Loop útil: patrulhar/observar -> escolher quem abordar -> investigar/agir -> enquadrar/decidir -> consequência imediata -> aprendizado/relatório -> progressão.
Não copiar arte, código, texto ou identidade. Usar apenas princípios mecânicos.

Adaptação desejada ao JurisQuest:
- `Plantão` de 3–8 minutos com ocorrências adaptativas.
- Priorizar revisões vencidas, erros recentes e lacunas do edital.
- Ocorrência -> investigação -> evidências -> decisão -> consequência/feedback -> XP/domínio -> próxima ocorrência.
- Campanha narrativa continua existindo; Plantão é o loop recorrente para assinatura.
- Admin deve editar ocorrências, NPCs, evidências, decisões e consequências, validar e publicar versão imutável.
- Progresso deve alimentar mapa do edital e revisão espaçada.

## Norte do produto
O JurisQuest deve ser produto comercial real para concursos, não demo. O valor recorrente vem de estudo adaptativo, variedade de situações, revisão espaçada e novos conteúdos — não apenas badges ou XP.

Leia também `JURISQUEST-HANDOFF.md` antes de qualquer alteração ampla.