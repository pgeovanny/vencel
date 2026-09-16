# JurisQuest — Handoff técnico/comercial

Atualizado em 2026-09-16 após consolidação do runtime e hardening de segurança.

## 1. Estado confiável

Fonte real:
- repo: `pgeovanny/vencel`
- produção/fonte pública atual: branch `jurisquest-next`
- branch segura de evolução comercial: `jurisquest-commercial-20260916`
- produção pública: `https://jurisquest-next.vercel.app`
- Supabase principal: `lgyayqdvsevbhyijbdqh`

Não usar V17/V18/V19 como substituto do Next. Não reconstruir o jogo. Não restaurar Pro V3 como runtime ativo.

Leia também:
- `AGENTS.md`
- `docs/JURISQUEST_CONTINUATION.md`

## 2. Runtime atual

O runtime único vigente é:
- `components/game-runtime-pro-v4.tsx`

Campanha e Plantão usam o mesmo motor. A rota `app/game/[id]/page.tsx` monta o Pro V4 e consome `missions_client`.

O Pro V4 preserva a base funcional do Pro V3 e adiciona a consolidação comercial já feita:
- personagem/chibi direcional;
- movimentação, colisões e auto-walk;
- cenários em camadas;
- NPCs, objetos e proximidade/interação;
- objetivos sequenciais;
- fatos/evidências;
- decisões e feedback técnico;
- transição de etapas, conclusão, replay e exploração;
- persistência de progresso;
- integração com revisão;
- modo Campanha e modo Plantão no mesmo runtime;
- Visual Studio aplicado ao runtime real;
- assets externos opcionais com fallback procedural.

Não criar um segundo runtime para Plantão.

## 3. Segurança — P0 concluído

O P0 antigo não é mais a próxima tarefa.

Já está implementado:
- `secure_decision_attempt_before_insert()` deriva no banco `correct`, `attempt_no`, `selected_text` e feedback confiável;
- `submit_decision_attempt_v1(...)` é o endpoint confiável para decisões de Campanha/Revisão;
- `submit_patrol_answer(...)` resolve decisões do Plantão no servidor;
- conclusão de missão é validada contra tentativas registradas no servidor;
- revisão só conclui/gera XP após respostas esperadas terem sido recuperadas;
- XP possui chaves idempotentes para impedir farming simples;
- payload inicial do aluno usa `missions_client`, com `mission_json` sanitizado;
- JSON bruto administrativo usa `missions_admin` com guarda de admin;
- `20260916195000_commercial_security_hardening.sql` versiona as views/função de sanitização, ativa `security_invoker`, fixa `search_path` e remove grants anônimos desnecessários.

Regra: não reintroduzir `choice.correct`, answer keys, feedback pós-resposta ou autoridade de XP/progresso no navegador.

## 4. Plantão adaptativo — implementado

O Plantão já existe como loop recorrente e usa o Pro V4.

Seleção server-side prioriza:
1. revisão vencida;
2. erro recente;
3. lacuna/conteúdo não concluído;
4. manutenção.

Há:
- `patrol_runs`;
- `patrol_items`;
- `start_patrol_run(...)`;
- `submit_patrol_answer(...)`;
- `abandon_patrol_run(...)`;
- relatório/XP ao final;
- erro alimentando recuperação/revisão;
- diversificação posterior de runs.

O objetivo comercial continua sendo sessão curta, repetível e adaptativa, sem sensação de questionário seco.

## 5. Visual Studio e assets

O Visual Studio altera o runtime real, incluindo preset, horário, clima, densidade, partículas, névoa, vignette e zoom de câmera.

A biblioteca administrativa permite overrides HTTPS:
- cenário: `config.background_url`;
- personagem: `front_url`, `side_url`, `back_url`, `portrait_url`.

O Pro V4 pré-carrega overrides e usa SVG procedural como fallback. A próxima camada visual deve elevar fidelidade sem sacrificar legibilidade e performance.

## 6. Produto/UX já consolidado

- Dashboard funciona como central do jogo.
- Perfil, Revisão, Casos e Edital compartilham navegação de produto.
- Plantão ativo não usa runtime duplicado.
- Admin existente inclui missões, usuários, edital, comercial, Plantão e Visual Studio.

Ainda precisa de QA final em mobile, performance, paywall/monetização e fluxo completo autenticado antes de produção.

## 7. ALERTA — preview Vercel inspecionado está obsoleto

O deployment de preview `dpl_D1nN5uNa2PEHS5F74zMqbgEuZNrj` ficou `READY`, mas o build log mostrou:

`JurisQuest commercial preview restored at 95e1c69006d49a2d1036528f44a0a474d6ec82c9`

Esse commit ficou dezenas de commits atrás da branch comercial. Logo:
- esse preview NÃO é validação do estado atual;
- não deve ser promovido;
- um preview novo precisa ser gerado a partir do HEAD atual e o build log deve confirmar a fonte/commit compilado.

A produção continua intocada até autorização explícita.

## 8. Banco e promoção

O `SELECT` amplo de `authenticated` sobre `missions` ainda é mantido temporariamente para compatibilidade com a produção antiga.

Somente na promoção da aplicação migrada:
- revogar acesso amplo legado a `missions`;
- manter aluno em `missions_client`;
- manter raw JSON administrativo em `missions_admin`;
- repetir security advisor/RLS/paywall tests.

Não antecipar esse revoke enquanto a produção antiga depender do contrato legado.

## 9. Benchmark — Patrulha BR

Usar somente princípios mecânicos:
- observar/patrulhar;
- investigar/interagir;
- decidir juridicamente;
- consequência imediata;
- feedback técnico;
- progressão e repetição.

Não copiar arte, código, textos ou identidade.

O JurisQuest deve fazer melhor em:
- adaptação por edital/cargo;
- revisão espaçada;
- priorização de erro/lacuna;
- diagnóstico por tópico;
- campanha narrativa;
- fundamentação jurídica;
- conteúdo autoral/versionado;
- servidor confiável;
- assinatura sustentada por adaptação + conteúdo novo.

## 10. Próxima sequência correta

1. Confirmar os workflows permanentes no HEAD atual: build, Security Audit e User E2E.
2. Corrigir qualquer regressão antes de deploy.
3. Gerar preview Vercel fresco realmente baseado no HEAD atual.
4. Confirmar no build log o commit/fonte compilado.
5. Executar fluxo autenticado real: login, Dashboard, Campanha, Plantão, Revisão, Perfil, Edital, Arquivo e ADM/Visual Studio.
6. Testar ao menos um override externo de cenário e um de personagem, garantindo fallback SVG.
7. Fazer QA mobile/performance e monetização/paywall.
8. Somente após aprovação explícita, promover para produção e retirar o `SELECT` legado em `missions`.

## 11. Critério para produção

Não promover sem:
- CI verde no HEAD que será implantado;
- preview correspondente ao mesmo HEAD;
- login real;
- missão completa com acerto/erro registrados corretamente;
- replay sem farming;
- Plantão completo;
- revisão funcionando;
- saída/pausa funcionando;
- admin protegido;
- paywall/RLS funcionando;
- teste mobile;
- rollback conhecido.

## 12. Texto para colar em outro chat

> Continue o JurisQuest. Abra o repo `pgeovanny/vencel`, branch `jurisquest-commercial-20260916`, e leia primeiro `AGENTS.md`, `JURISQUEST-HANDOFF.md` e `docs/JURISQUEST_CONTINUATION.md`. Trabalhe a partir da fonte real. Preserve o runtime único `components/game-runtime-pro-v4.tsx`; não restaure Pro V3 nem use V17/V18/V19 como base. O P0 server-authoritative e o Plantão já estão implementados. Primeiro confirme o CI no HEAD e gere um preview novo realmente baseado nesse HEAD; o preview `dpl_D1nN5uNa2PEHS5F74zMqbgEuZNrj` está obsoleto porque restaurou `95e1c690...`. Não altere nem promova produção sem preview autenticado aprovado.
