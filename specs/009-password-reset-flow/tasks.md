---

description: "Task list for 009-password-reset-flow"
---

# Tasks: Fluxo de Recuperar Senha

**Input**: Design documents from `/specs/009-password-reset-flow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Verificação manual pelo `quickstart.md`.

**Organization**: Tarefas agrupadas por user story, para que cada uma possa ser implementada e verificada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: User story a que a tarefa pertence (US1, US2, US3, US4)
- Todo caminho de arquivo é explícito

## Path Conventions

- **Backend**: `packages/backend/src/`
- **Web**: `packages/web/src/`
- **Database**: `packages/backend/prisma/schema.prisma` — **não alterado nesta feature**
- **Generated (do not edit)**: `packages/backend/src/generated/`, `packages/web/src/lib/api/fetch-generated/`

> **Sem Orval, sem migração.** Nenhuma rota REST nova sob `/api` e nenhum model
> novo — os tokens usam `Verification`, que já existe. Ver `research.md` D9.

---

## ⚠️ Correção de premissa (leia antes de começar)

O contexto informado ao gerar estas tarefas dizia que *"o better-auth invalida
automaticamente os tokens anteriores, substituindo-os ou expirando-os após uma
nova solicitação ou redefinição bem-sucedida"*. **Isso não é verdade na versão
1.5.1 instalada neste repositório.** Verificado em:

- `node_modules/better-auth/dist/api/routes/password.mjs` — `requestPasswordReset`
  chama `createVerificationValue` com `identifier: reset-password:<token>`, que é
  **único por token**. Não há substituição nem remoção dos anteriores.
- `node_modules/better-auth/dist/db/internal-adapter.mjs:542` —
  `createVerificationValue` apenas insere uma linha nova.
- `node_modules/better-auth/dist/db/internal-adapter.mjs:601` —
  `deleteVerificationByIdentifier` apaga **somente** o identifier recebido, ou
  seja, apenas o token que acabou de ser usado.
- `internal-adapter.mjs:594` — a única limpeza em massa remove linhas com
  `expiresAt < now`, isto é, **coleta de lixo de tokens já vencidos**, não
  invalidação de tokens válidos anteriores.

**Consequência real**: dois links pedidos dentro da mesma hora ficam válidos ao
mesmo tempo, e usar o mais novo **não** derruba o mais antigo. Quem tiver o link
antigo consegue trocar a senha de novo dentro da janela — o que anula justamente
a remediação que FR-022 e FR-032 existem para oferecer (redefinir a senha para
expulsar um invasor).

Por isso **T025 implementa a invalidação de fato**, em vez de enfraquecer o Edge
Case da spec. A spec permanece correta como está escrita; `plan.md` e
`contracts/README.md` já foram alinhados a essa decisão.

> **Numeração**: T025 aparece na Phase 2 e T045 na Phase 5, ambos fora da ordem
> numérica — são reposicionamentos posteriores à geração. A ordem de execução é
> a das fases e da seção "Dependencies & Execution Order", não a dos IDs.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependências e configuração de ambiente

- [X] T001 Instalar dependências do backend: `npm i resend pino -w packages/backend` (resend >= 6.14.0; pino é promoção de dependência já transitiva do Fastify)
- [X] T002 Converter o schema em `packages/backend/src/config/env.ts` para união discriminada em `EMAIL_PROVIDER` (`console` | `resend`), espelhando o padrão já usado para `LLM_PROVIDER`; adicionar `EMAIL_FROM`, `EMAIL_SUPPORT_URL`, `AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN` (default 3600), `PASSWORD_RESET_RATE_LIMIT_MAX` (default 3), `PASSWORD_RESET_RATE_LIMIT_WINDOW` (default 900), e `RESEND_API_KEY` **apenas** no ramo `resend`
- [X] T003 [P] Documentar as variáveis novas em `packages/backend/.env.example`, com comentários em português no mesmo estilo dos existentes
- [X] T041 [P] Conferir que `specs/009-password-reset-flow/plan.md` (Fase D e árvore de arquivos) e `contracts/README.md` §6 já refletem que a invalidação de tokens anteriores é **implementada**, não contornada — leitura obrigatória antes de escrever código, para ninguém seguir a orientação antiga

**Checkpoint**: `npm run dev` no backend sobe com `EMAIL_PROVIDER=console` e sem `RESEND_API_KEY`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de log e de e-mail, exigida por todas as user stories

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase terminar

- [X] T004 Criar `packages/backend/src/lib/logger.ts` exportando uma instância pino única, com a configuração de transporte por ambiente hoje embutida em `lib/fastify.ts`
- [X] T005 Alterar `packages/backend/src/lib/fastify.ts` para consumir a instância de `lib/logger.ts` via `loggerInstance`, removendo a config duplicada de logger
- [X] T006 [P] Criar `packages/backend/src/emails/html.ts` com o helper de escape de HTML (`&`, `<`, `>`, `"`) aplicado a todo dado vindo do cadastro
- [X] T007 [P] Exportar a logo em PNG para `packages/web/public/logo-email.png` (170×78, fundo transparente) — **SVG não renderiza em Gmail/Outlook**, ver `research.md` D7
- [X] T008 Criar `packages/backend/src/lib/email.ts` com `sendEmail()` conforme `contracts/README.md` §2: dispatch por `EMAIL_PROVIDER`, retorno `{ ok, id, error }`, **nunca lança**. ⚠️ O SDK do Resend **devolve `{ data, error }` em vez de lançar** — é obrigatório `try/catch` (erros de rede) **e** guard clause checando `error` (erros de API)
- [X] T009 Criar `packages/backend/src/emails/reset-password.ts` com `buildResetPasswordEmail()` retornando `{ subject, html, text }`, portando o HTML de `Email - Redefinir Senha.html` (tabelas + estilos inline) e usando o escape de T006
- [X] T025 Criar `packages/backend/src/use-cases/auth/InvalidatePreviousResetTokens.ts` com `execute({ userId, keepToken? })`, apagando via Prisma as linhas de `verification` com `identifier` iniciado em `reset-password:` cujo `value` seja o `userId`, exceto o token preservado. **⚠️ Isto NÃO é feito pelo better-auth** — ver "Correção de premissa" no topo. Sem isso, um link antigo continua trocando a senha depois de uma redefinição, anulando FR-022. *(Fora da ordem numérica de propósito: é pré-requisito de T012.)*

**Checkpoint**: `sendEmail` imprime um e-mail completo no log em modo `console`

---

## Phase 3: User Story 1 - Solicitar o link de redefinição (Priority: P1) 🎯 MVP

**Goal**: O usuário sai do login, informa o e-mail e recebe a confirmação neutra "Verifique seu e-mail" — com o link efetivamente enviado a quem tem senha cadastrada.

**Independent Verification**: Abrir `/login`, clicar em "Esqueci minha senha", enviar um e-mail conhecido e ver o estado de confirmação; conferir no log que o e-mail foi gerado. Repetir com e-mail inexistente e com conta só-Google: mesma tela, nenhum e-mail.

### Implementation for User Story 1

- [X] T010 [US1] Criar `packages/backend/src/use-cases/auth/SendPasswordResetEmail.ts` com `execute({ userId, name, email, resetUrl, token })`: consulta `Account` com `providerId = 'credential'`; **sem credencial, registra e retorna sem enviar** (FR-006 / `research.md` D5); monta o template e envia com `idempotencyKey: password-reset/<userId>-<token.slice(0,8)>`
- [X] T011 [P] [US1] Criar `packages/backend/src/lib/password-reset-rate-limit.ts` com janela deslizante em `Map`, chaveada pelo e-mail normalizado (`trim().toLowerCase()`), limpeza preguiçosa de entradas vencidas e leitura de `PASSWORD_RESET_RATE_LIMIT_MAX`/`_WINDOW`
- [X] T012 [US1] Configurar `packages/backend/src/lib/auth.ts`: `emailAndPassword.sendResetPassword` delegando a `SendPasswordResetEmail`, regra `'/request-password-reset'` em `rateLimit.customRules` e `hooks.before` aplicando o limitador por e-mail apenas nesse path, respondendo `429`. Dentro do `sendResetPassword`, chamar `InvalidatePreviousResetTokens` (T025) preservando o token recém-emitido. ⚠️ O contador **incrementa sempre**, exista conta ou não — incrementar só para e-mails reais transformaria o limite num oráculo de enumeração (`research.md` D6)
- [X] T013 [US1] Registrar os eventos de solicitação, bloqueio por limite e falha de envio usando `lib/logger.ts`, **sem token, sem URL completa e sem senha** (FR-037 a FR-039)
- [X] T014 [US1] Separar em `packages/web/src/proxy.ts` o conjunto `publicRoutes` (login, signup, forgot-password, reset-password) do novo `authenticatedRedirectRoutes` (apenas login e signup), para que as telas do fluxo não redirecionem usuário autenticado (FR-002)
- [X] T015 [P] [US1] Criar `packages/web/src/app/(auth)/forgot-password/schemas.ts` com o schema Zod do e-mail, mensagens em pt-BR no mesmo estilo de `login/schemas.ts`
- [X] T016 [US1] Criar `packages/web/src/app/(auth)/forgot-password/use-forgot-password-form.ts` com react-hook-form + `zodResolver`, chamando `authClient.requestPasswordReset({ email, redirectTo: ${NEXT_PUBLIC_BASE_URL}/reset-password })`, expondo o estado `form | success` e tratando erro com `try/catch` + guard clause e toast (FR-034 — o `429` já é traduzido por `getAuthErrorMessage`)
- [X] T017 [US1] Criar `packages/web/src/app/(auth)/forgot-password/forgot-password-form.tsx` com `Field`, `FieldLabel`, `Input`, `FieldError` e `Button size="xl"` com estado de carregamento (FR-003, FR-004, FR-010). Incluir abaixo do formulário a linha "Lembrou a senha? Voltar ao login" com `Link href="/login"` (FR-024)
- [X] T018 [P] [US1] Criar `packages/web/src/app/(auth)/forgot-password/check-your-email.tsx` com o ícone circular, título "Verifique seu e-mail", botão "Voltar ao login" e a linha "Não recebeu? Verifique o spam ou tente outro e-mail" (FR-007, FR-008); anunciar a troca de estado a leitores de tela via região `aria-live` (FR-030)
- [X] T019 [US1] Criar `packages/web/src/app/(auth)/forgot-password/page.tsx` alternando entre formulário e confirmação, reaproveitando a moldura de `(auth)/layout.tsx`
- [X] T020 [US1] Em `packages/web/src/app/(auth)/login/sign-in-form.tsx`, trocar o `<span>` inerte "Esqueci minha senha" por `Link href="/forgot-password"` (FR-001), mantendo a posição do design
- [X] T021 [US1] Verificar US1 pelo `quickstart.md` §2.1 a §2.3 e §3.2

**Checkpoint**: US1 funciona ponta a ponta; o e-mail sai (visível no log) e a enumeração de contas é impossível

---

## Phase 4: User Story 2 - Receber o e-mail de redefinição (Priority: P1)

**Goal**: A mensagem que chega corresponde ao template do design, em português, legível mesmo sem imagens.

**Independent Verification**: Enviar de verdade com `EMAIL_PROVIDER=resend` para `delivered@resend.dev` ou caixa própria e comparar lado a lado com `Email - Redefinir Senha.html`.

### Implementation for User Story 2

- [X] T022 [US2] Completar a alternativa em texto puro (`text`) em `packages/backend/src/emails/reset-password.ts`, cobrindo saudação, prazo de 1 hora, link copiável e suporte (FR-016)
- [X] T023 [US2] Conferir a fidelidade do HTML em `packages/backend/src/emails/reset-password.ts` contra o design: cabeçalho azul com logo e título, corpo branco, botão, link em texto, avisos finais de spam/conta inexistente/envio automático, links de suporte e copyright (FR-011, FR-015)
- [X] T024 [US2] Verificar US2 pelo `quickstart.md` §4: abrir no Gmail e no Outlook (a logo precisa aparecer, é PNG), conferir com imagens bloqueadas e confirmar que todo o conteúdo está em pt-BR

**Checkpoint**: O e-mail recebido é indistinguível do design nos clientes principais

---

## Phase 5: User Story 3 - Definir a nova senha (Priority: P1)

**Goal**: O link abre a tela "Nova senha", a troca acontece, todas as sessões caem, o aviso é enviado e o usuário volta ao login.

**Independent Verification**: Abrir o link do e-mail, definir uma senha nova, confirmar o toast no login, entrar com a senha nova e comprovar que a antiga não funciona mais.

### Implementation for User Story 3

- [X] T026 [US3] Chamar `InvalidatePreviousResetTokens` (sem preservar nenhum token) dentro do `onPasswordReset` em `packages/backend/src/lib/auth.ts`, garantindo que nenhum link sobreviva a uma redefinição concluída — completa, junto com T012, o Edge Case "apenas o link mais recente conduz a uma redefinição bem-sucedida"
- [X] T027 [P] [US3] Criar `packages/backend/src/emails/password-changed.ts` com `buildPasswordChangedEmail()`, reaproveitando a identidade visual do template de redefinição, informando que todas as sessões foram encerradas e orientando a procurar o suporte. ⚠️ O tipo de entrada **não** aceita URL de redefinição nem token (FR-033)
- [X] T028 [US3] Criar `packages/backend/src/use-cases/auth/SendPasswordChangedEmail.ts` com `execute({ userId, name, email })` e `idempotencyKey: password-changed/<userId>-<timestamp>`
- [X] T029 [US3] Completar `packages/backend/src/lib/auth.ts` com `revokeSessionsOnPasswordReset: true`, `resetPasswordTokenExpiresIn: env.AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN`, `minPasswordLength: 8` e `onPasswordReset` disparando `SendPasswordChangedEmail` e o registro de conclusão (FR-022, FR-032, FR-037)
- [X] T045 [US3] Registrar a recusa de link inválido ou expirado em `packages/backend/src/lib/auth.ts` via `hooks.after` no path `/reset-password`, inspecionando o resultado do endpoint e logando o evento com `lib/logger.ts` quando o código for `INVALID_TOKEN` — sem o token e sem a senha (FR-037, FR-038, SC-013). A recusa é lançada dentro do `resetPassword` do better-auth, então não há como cobri-la a partir dos use-cases. *(Fora da ordem numérica de propósito: inserção posterior.)*
- [X] T030 [P] [US3] Adicionar `INVALID_TOKEN`, `PASSWORD_TOO_SHORT` e `PASSWORD_TOO_LONG` a `MESSAGE_BY_CODE` em `packages/web/src/helpers/auth-error-message.ts`, com textos em pt-BR
- [X] T031 [P] [US3] Criar `packages/web/src/app/(auth)/reset-password/schemas.ts` com senha de mínimo 8 caracteres e confirmação, usando `.refine` para a igualdade e apontando o erro ao campo de confirmação (FR-019)
- [X] T032 [US3] Criar `packages/web/src/app/(auth)/reset-password/use-reset-password-form.ts` chamando `authClient.resetPassword({ newPassword, token })` e, em caso de sucesso, `router.replace('/login?password-reset=success')` — **sem criar sessão** (FR-022)
- [X] T033 [US3] Criar `packages/web/src/app/(auth)/reset-password/reset-password-form.tsx` com dois `PasswordInput`, o aviso de mínimo de 8 caracteres junto ao primeiro campo e o botão "Salvar nova senha" (FR-017, FR-018). Incluir abaixo do formulário a linha "Lembrou a senha? Voltar ao login" com `Link href="/login"` (FR-024)
- [X] T034 [P] [US3] Criar `packages/web/src/app/(auth)/reset-password/invalid-link.tsx` com a mensagem de link inválido e caminho direto para `/forgot-password` (FR-021)
- [X] T035 [US3] Criar `packages/web/src/app/(auth)/reset-password/page.tsx` como Server Component que lê `searchParams`: `token` renderiza o formulário; `error=INVALID_TOKEN`, parâmetro ausente ou incompleto renderizam `invalid-link.tsx` **sem formulário** (FR-035). A validação de abertura já vem do redirect do better-auth — ver `contracts/README.md` §1
- [X] T036 [US3] Exibir em `packages/web/src/app/(auth)/login/page.tsx` o toast de senha alterada quando a URL trouxer `password-reset=success`, limpando o parâmetro em seguida
- [X] T037 [US3] Verificar US3 pelo `quickstart.md` §2.4 a §2.6 e §3.3, incluindo a checagem de que um link **anterior** deixa de funcionar depois de uma nova solicitação (T012/T026) e de que a recusa de link inválido aparece nos registros (T045)

**Checkpoint**: O fluxo fecha ponta a ponta e a remediação de conta comprometida realmente funciona

---

## Phase 6: User Story 4 - Apresentação nas duas larguras (Priority: P2)

**Goal**: As duas telas seguem a moldura de autenticação em mobile e desktop, com acessibilidade equivalente à do login.

**Independent Verification**: Abrir as duas telas em 402px e 1280px e comparar com as variantes `3a`/`3b` e `4a`/`4b` do design.

### Implementation for User Story 4

- [X] T038 [US4] Validar `/forgot-password` com o **chrome-devtools MCP** em 320, 402, 768, 1023, 1024 e 1280px, nos dois estados (formulário e confirmação): sem rolagem horizontal, sem sobreposição, sem erro no console, alvos de toque ≥ 44×44px (FR-025, FR-027, SC-008). Comparar o resultado em 402px e 1280px com as variantes `3a`/`3b` do arquivo de design em layout, tipografia, cores e espaçamento (SC-009)
- [X] T039 [US4] Validar `/reset-password` com o **chrome-devtools MCP** nas mesmas larguras, nos dois estados (formulário e link inválido), e conferir o rodapé de copyright e crédito (FR-026). Comparar o resultado em 402px e 1280px com as variantes `4a`/`4b` do design (SC-009)
- [X] T040 [US4] Percorrer o fluxo inteiro só pelo teclado, confirmando foco visível, rótulos associados, erros inline ligados aos campos e o anúncio da troca de estado da tela 3 (FR-029, FR-030, SC-010)

**Checkpoint**: As duas telas correspondem ao design e são operáveis por teclado

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T042 [P] Documentar em `docs/CODEBASE.md` a camada de e-mail (`lib/email.ts`, `emails/`, `EMAIL_PROVIDER`) e o fluxo de redefinição de senha
- [X] T043 Passar `npm run lint` nos dois pacotes e remover imports e código mortos
- [X] T044 Executar o roteiro completo do `quickstart.md`, incluindo §5 (fim a fim cronometrado, SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende da Phase 1 — **bloqueia todas as user stories**
- **US1 (Phase 3)**: depende da Phase 2
- **US2 (Phase 4)**: depende da Phase 2; a verificação prática usa o disparo de US1
- **US3 (Phase 5)**: depende da Phase 2; a verificação prática usa um link gerado por US1
- **US4 (Phase 6)**: depende de US1 e US3, porque valida as telas que elas criam
- **Polish (Phase 7)**: depende de tudo que se pretende entregar

### User Story Dependencies

- **US1 (P1)**: independente após a Phase 2 — é o MVP
- **US2 (P1)**: o código do template é independente; a conferência visual precisa de um envio, mais simples de obter por US1
- **US3 (P1)**: o backend é independente; na prática o token vem de US1
- **US4 (P2)**: depende das telas de US1 e US3

### Within Each User Story

- Use-case antes da configuração em `lib/auth.ts`
- Schema Zod antes do hook de formulário
- Hook antes do componente de formulário
- Componentes antes da página que os compõe
- **Nenhuma etapa de Orval** — nenhum contrato sob `/api` muda

### Parallel Opportunities

- T003 em paralelo com T002
- T006 e T007 em paralelo entre si na Phase 2
- T011 em paralelo com T010; T015 em paralelo com o backend de US1
- T027, T030, T031 e T034 em paralelo dentro de US3
- T003 e T041 em paralelo na Phase 1; T042 e T043 na Phase 7
- Com mais de uma pessoa: o backend de US3 (T026–T029, T045) pode andar junto com o front de US1 (T015–T020)

---

## Parallel Example: User Story 3

```bash
# Backend e front de US3 sem colisão de arquivos:
Task: "Criar packages/backend/src/emails/password-changed.ts"            # T027
Task: "Adicionar INVALID_TOKEN em packages/web/src/helpers/auth-error-message.ts"  # T030
Task: "Criar packages/web/src/app/(auth)/reset-password/schemas.ts"      # T031
Task: "Criar packages/web/src/app/(auth)/reset-password/invalid-link.tsx" # T034
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup
2. Phase 2: Foundational (**bloqueia tudo**)
3. Phase 3: US1
4. **PARE E VALIDE**: `quickstart.md` §2.1–§2.3 e §3.2
5. Nesse ponto quem esqueceu a senha já recebe o link — o pior cenário atual (perda definitiva de acesso) desaparece

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → verificar → o link chega ao usuário (MVP)
3. US3 → verificar → o fluxo fecha e a senha muda de verdade
4. US2 → verificar → o e-mail fica idêntico ao design
5. US4 → verificar → as telas ficam fiéis em todas as larguras

> Sugestão de ordem real: **US1 → US3 → US2 → US4**. US3 entrega mais valor que
> US2, porque sem ela o usuário recebe um link que não conclui nada; o refino
> visual do e-mail pode vir logo em seguida.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente
- A constituição proíbe testes automatizados — nenhuma tarefa de teste foi criada
- Commitar por tarefa ou por grupo lógico coerente
- Nenhum log pode conter token, URL completa do link ou senha (FR-038)
- Toda mudança de front exige validação com o chrome-devtools MCP antes de ser dada como concluída
