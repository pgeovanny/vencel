# JurisQuest — Handoff técnico/comercial

Atualizado em 2026-09-16.

## 1. Estado confiável

Fonte real recuperada em GitHub:
- repo: `pgeovanny/vencel`
- branch corrente: `jurisquest-next`
- branch de trabalho criada: `jurisquest-commercial-20260916`

Produção:
- `https://jurisquest-next.vercel.app`
- missão de referência: `https://jurisquest-next.vercel.app/game/22226ea7-dffd-4309-b919-223563c4a363`

Não usar V17/V18/V19 como substituto do Next. Esses artefatos podem servir de referência visual/mecânica apenas.

## 2. Runtime atual

A rota `app/game/[id]/page.tsx` monta `components/game-runtime-pro-v3.tsx`.

O Pro V3 já possui:
- personagem/chibi direcional;
- movimentação e colisões;
- cenários em camadas;
- NPCs e objetos;
- proximidade/interação;
- objetivos sequenciais;
- fatos/evidências;
- decisões;
- feedback detalhado;
- transição de etapas;
- conclusão;
- replay;
- exploração livre;
- persistência de progresso;
- histórico de tentativas;
- integração com revisão.

Arquivos principais do motor:
- `components/game-runtime-pro-v3.tsx`
- `lib/game/character-assets-v2.ts`
- `lib/game/character-directional-v3.ts`
- `lib/game/scene-assets-v3.ts`
- `lib/game/studio-assets.ts`
- `lib/game/studio-css.ts`
- `lib/game/visual-contract.ts`

## 3. Banco e segurança

Supabase principal: `lgyayqdvsevbhyijbdqh`.

Tabelas relevantes incluem:
- `missions`
- `mission_versions`
- `mission_progress`
- `decision_attempts`
- `review_queue`
- `student_stats`
- `xp_ledger`
- `exam_syllabi`
- `syllabus_topics`
- `mission_topics`
- `student_characters`
- `access_grants`
- `content_cycles`
- `cycle_missions`
- `game_runtime_settings`
- `game_visual_presets`
- `game_asset_catalog`

### Vulnerabilidade prioritária
O cliente do Pro V3 ainda:
1. calcula se a alternativa é correta;
2. calcula `attempt_no` consultando a tabela;
3. envia `correct`, `attempt_no` e `selected_text` ao inserir em `decision_attempts`.

O trigger de recompensa usa esses valores para conceder XP. Um cliente manipulado pode fabricar acerto/primeira tentativa.

### Correção-alvo
Criar RPC/contrato atômico do servidor, por exemplo `submit_decision_attempt(p_mission_id, p_decision_id, p_selected_index, p_mode, p_review_id?)`, que:
- usa `auth.uid()`;
- valida acesso à missão;
- carrega `mission_json` publicado/versão válida;
- localiza a decisão por ID;
- resolve alternativa correta pelo JSON armazenado no servidor;
- deriva texto, correção e próximo `attempt_no` no banco;
- insere a tentativa;
- deixa o trigger conceder XP somente a partir do registro calculado pelo servidor;
- retorna apenas feedback permitido e estado útil ao cliente;
- impede replay/challenge/review de gerar recompensas indevidas.

Depois alterar `game-runtime-pro-v3.tsx` e `review-session.tsx` para não inserir diretamente em `decision_attempts`.

## 4. Benchmark — Patrulha BR

Fontes públicas verificadas:
- site: `https://patrulhabr.com/`
- Google Play: app `com.patrulhabr.game`

Mecânica principal observada:
- dirigir/patrulhar;
- observar o fluxo;
- escolher quem merece abordagem;
- abordar;
- enquadrar juridicamente a situação;
- receber consequência imediata;
- ganhar pontos/progredir ou perder recurso;
- repetir em situações variadas.

O Google Play descreve o jogo como simulador educativo de fiscalização de trânsito, com dezenas de situações, artigos/classificações/medidas administrativas, patentes, skins e passe que libera mais situações.

### O que aproveitar sem copiar
- transformar item normativo em situação jogável curta;
- observação antes da pergunta jurídica;
- decisão contextual, não questão seca;
- consequência visual imediata;
- progressão persistente;
- grande variedade de microcenários;
- sessão curta com começo/fim claro;
- loop que convida a jogar novamente.

### O que fazer melhor no JurisQuest
- adaptação por edital/cargo;
- revisão espaçada real;
- priorização de erro e lacuna;
- diagnóstico por tópico;
- fundamentação jurídica após decisão;
- narrativa/campanha além do loop curto;
- servidor confiável;
- conteúdo autoral versionado;
- assinatura apoiada em conteúdo novo + adaptação contínua.

## 5. Modo Plantão

O Plantão deve ser um segundo loop, convivendo com a Campanha.

Entrada:
1. revisões vencidas;
2. erros recentes ainda não dominados;
3. lacunas do edital;
4. conteúdo novo elegível;
5. manutenção de temas já dominados.

Sessão de 3–8 minutos:
1. chamada/ocorrência;
2. cena curta;
3. observação/interação;
4. evidências/fatos;
5. decisão jurídica;
6. consequência;
7. feedback técnico;
8. registro de domínio;
9. próxima ocorrência ou encerramento do plantão.

Ao fim:
- relatório de turno;
- temas treinados;
- erros recuperados;
- lacunas reduzidas;
- XP legítimo;
- impacto no mapa do edital;
- revisões futuras agendadas.

## 6. Admin comercial

O admin precisa evoluir para pipeline de conteúdo:
- rascunho;
- validação de schema;
- preview jogável;
- validação pedagógica;
- publicação de versão imutável;
- rollback/versionamento.

Editor deve suportar:
- cenário;
- NPCs;
- objetos/evidências;
- diálogos;
- objetivos;
- decisões;
- alternativas;
- resposta correta;
- feedback por distrator;
- regra;
- aplicação;
- base legal;
- pegadinha;
- memória de prova;
- consequências;
- tópicos do edital e pesos;
- disponibilidade em Campanha/Plantão/Review.

## 7. UX desejada

Dashboard:
- navegação clara: Início | Casos | Revisão | Mapa do Edital;
- personagem/avatar visível;
- próxima operação como CTA principal;
- situação da campanha;
- progresso compacto;
- casos/dossiês;
- revisões e mapa;
- mobile com bottom nav.

Jogo:
- `Voltar ao painel` claro;
- menu de pausa com Continuar, Objetivos, Caderno, Configurações, Sair da missão e Sair da conta;
- não esconder saída;
- melhor hierarquia de objetivo e interação;
- manter o Pro V3 funcional.

## 8. Ordem de execução recomendada

P0 — Segurança e consistência
- corrigir submissão server-side de decisões;
- garantir idempotência/concorrência de tentativas;
- revisar XP, replay, review e missão;
- testar RLS e paywall.

P1 — Produto recorrente
- implementar Plantão adaptativo;
- conectar revisão + erros + lacunas;
- relatório de turno;
- mapa de domínio.

P2 — UX
- dashboard/nav/avatar;
- pausa/saída/caderno;
- mobile;
- acessibilidade.

P3 — Admin
- autoria completa;
- versionamento;
- validação;
- preview/publicação.

P4 — Visual e conteúdo
- elevar cenas e personagens sem sacrificar legibilidade/performance;
- adicionar variedade de situações;
- telemetria/capacidade do plano free.

## 9. Critério para produção

Não promover alteração ampla sem:
- build limpo;
- preview Vercel;
- login real;
- missão real completa;
- acerto e erro registrados corretamente;
- replay sem farm;
- revisão funcionando;
- saída do jogo funcionando;
- admin protegido;
- paywall/RLS funcionando;
- rollback conhecido.

## 10. Texto para colar em outro chat

> Continue o JurisQuest. Leia primeiro `AGENTS.md` e `JURISQUEST-HANDOFF.md` no repo `pgeovanny/vencel`, branch `jurisquest-commercial-20260916`. A fonte real está aí. A produção é `https://jurisquest-next.vercel.app`. Preserve `game-runtime-pro-v3.tsx`. Comece pelo P0 de segurança e siga o handoff; use Patrulha BR apenas como benchmark mecânico para o modo Plantão. Não reconstrua a partir de V17/V18/V19 e não altere produção sem preview/teste.