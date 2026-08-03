# Implementation Plan: Fluxo de Recuperar Senha

**Branch**: `009-password-reset-flow` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-password-reset-flow/spec.md`

## Summary

Entregar as duas telas do fluxo de recuperação (seções 3 e 4 do design) e os dois
e-mails transacionais, reaproveitando ao máximo o que o `better-auth` já
implementa. A pesquisa de Fase 0 mostrou que a biblioteca resolve sozinha a
proteção contra enumeração, a expiração de 1 hora, o uso único do token, a
revogação de sessões e — via o redirect de `GET /api/auth/reset-password/:token`
— até a validação do link antes de a tela abrir.

O trabalho próprio se concentra em cinco pontos: (1) uma camada de envio de
e-mail com Resend e um modo `console` para desenvolvimento local; (2) dois
templates HTML derivados do design; (3) um bloqueio em `sendResetPassword` para
contas sem senha, porque **o padrão do better-auth é o oposto do que a spec
decidiu**; (4) um limitador por endereço de e-mail, que a biblioteca não oferece;
(5) as duas páginas em `packages/web`, montadas sobre a moldura de autenticação
já existente.

Sem migração Prisma e sem regeneração do Orval — ver `research.md` D9.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5 + Prisma 7 + better-auth 1.5.1 (backend);
Next.js 16 + React 19 + Tailwind 4 + shadcn + react-hook-form + Zod (web)

**New Dependencies**: `resend` (>= 6.14.0) e `pino` (promoção de dependência
transitiva) em `packages/backend` — justificadas em Complexity Tracking

**Storage**: PostgreSQL via Prisma. **Nenhuma migração** — os tokens usam o model
`Verification`, que já existe

**Testing**: **NONE** — Constitution Principle I forbids all automated tests.
Verificação manual pelo `quickstart.md` e pelo chrome-devtools MCP

**Target Platform**: Web responsivo (320px a 1280px+); API Node

**Project Type**: npm workspaces monorepo — `packages/backend` + `packages/web`

**Performance Goals**: `/request-password-reset` responde em < 200ms p95 — o
envio do e-mail **não** pode bloquear a resposta (o better-auth já embrulha
`sendResetPassword` em `runInBackgroundOrAwait`)

**Constraints**: dependências mínimas; colunas snake_case; nenhuma rota REST nova
sob `/api`, logo nenhum `npx orval`; nenhum log pode conter token ou senha

**Scale/Scope**: 2 telas novas + 1 link ativado na tela de login; 2 templates de
e-mail; 0 endpoints REST novos; 0 migrações

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: nenhuma tarefa de teste, nenhum framework. A
  verificação é o roteiro manual do `quickstart.md`
- [x] **Code Quality**: a decisão de negócio ("esta conta pode receber link?") fica
  em `use-cases/auth/SendPasswordResetEmail.ts`, não no callback do better-auth
  nem em componente; o front põe a lógica em `use-forgot-password-form.ts` e
  `use-reset-password-form.ts`, colocados junto das rotas como já fazem
  `login/` e `signup/`. Erros assíncronos com `try/catch` + guard clause
- [x] **UX Consistency**: reusa `Button`, `Input`, `PasswordInput`, `Field*`,
  `Link`, `sonner` e a moldura `(auth)/layout.tsx`. Erros inline no campo,
  erros de servidor em toast — mesma convenção do login
- [x] **Responsive Design**: as telas herdam a moldura de `(auth)/layout.tsx`, já
  validada em 320px e 1280px+; botões com `size="xl"` mantêm o alvo de 44px
- [x] **Minimal Dependencies**: `resend` é escolha explícita do autor; `pino` já
  está na árvore via Fastify. **React Email foi avaliado e rejeitado** — ver D3
- [x] **Performance**: nenhuma consulta nova em rota quente; a única consulta
  adicional (`Account` por `userId`) roda fora do caminho da resposta; o
  contador de limite é um `Map` em memória
- [x] **Package Rules**: backend e web nos pacotes corretos; **sem Orval**, porque
  nenhum contrato sob `/api` muda (D9)

**Re-check pós-Fase 1**: aprovado. O desenho não introduziu abstração nova além
das justificadas em Complexity Tracking, e a Fase 1 na verdade *reduziu* escopo
ao descobrir que FR-035 sai de graça do redirect do better-auth.

## Project Structure

### Documentation (this feature)

```text
specs/009-password-reset-flow/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — D1 a D10
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1 — roteiro de verificação manual
├── contracts/README.md  # Fase 1 — contratos consumidos e internos
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
packages/backend/src/
├── config/env.ts                                  # ~ EMAIL_PROVIDER (união discriminada)
├── lib/
│   ├── auth.ts                                    # ~ sendResetPassword, onPasswordReset, hooks
│   ├── email.ts                                   # + camada de envio (console | resend)
│   ├── logger.ts                                  # + instância pino compartilhada
│   ├── fastify.ts                                 # ~ usa loggerInstance
│   └── password-reset-rate-limit.ts               # + contador por endereço
├── emails/
│   ├── html.ts                                    # + escape de HTML
│   ├── reset-password.ts                          # + template do design
│   └── password-changed.ts                        # + template derivado
└── use-cases/auth/
    ├── SendPasswordResetEmail.ts                  # + regra da conta sem senha
    ├── SendPasswordChangedEmail.ts                # + aviso pós-troca
    └── InvalidatePreviousResetTokens.ts           # + só o link mais recente vale

packages/web/
├── public/logo-email.png                          # + PNG para o e-mail (SVG não renderiza)
└── src/
    ├── proxy.ts                                   # ~ separar rotas públicas de rotas com redirect
    ├── helpers/auth-error-message.ts              # ~ INVALID_TOKEN e afins
    └── app/(auth)/
        ├── login/
        │   ├── sign-in-form.tsx                   # ~ <span> vira <Link>
        │   └── page.tsx                           # ~ toast de senha redefinida
        ├── forgot-password/
        │   ├── page.tsx                           # +
        │   ├── schemas.ts                         # +
        │   ├── forgot-password-form.tsx           # +
        │   ├── check-your-email.tsx               # + estado de sucesso
        │   └── use-forgot-password-form.ts        # +
        └── reset-password/
            ├── page.tsx                           # + lê searchParams (token | error)
            ├── schemas.ts                         # +
            ├── reset-password-form.tsx            # +
            ├── invalid-link.tsx                   # + estado de link inválido
            └── use-reset-password-form.ts         # +
```

**Structure Decision**: monorepo npm workspaces. Os hooks de formulário ficam
colocados na pasta da rota conforme a regra de escopo da constituição
(§Monorepo Package Rules, v1.4.0): hook usado por uma única rota fica colocado
nela; hook importado por outra rota é promovido para `src/hooks/`.

## Implementation Phases

### Fase A — Infraestrutura de e-mail (backend, sem UI)

1. `npm i resend pino -w packages/backend`.
2. `config/env.ts`: transformar o schema numa união discriminada em
   `EMAIL_PROVIDER` (`console` | `resend`), espelhando o que já existe para
   `LLM_PROVIDER`. Novas variáveis: `EMAIL_FROM`, `EMAIL_SUPPORT_URL`,
   `RESEND_API_KEY` (só no ramo `resend`),
   `AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN` (3600),
   `PASSWORD_RESET_RATE_LIMIT_MAX` (3), `PASSWORD_RESET_RATE_LIMIT_WINDOW` (900).
   Atualizar `.env.example`.
3. `lib/logger.ts` + ajuste de `lib/fastify.ts` para `loggerInstance`.
4. `lib/email.ts` conforme o contrato — lembrar que o SDK do Resend **devolve**
   `{ data, error }` em vez de lançar.
5. `emails/reset-password.ts` e `emails/password-changed.ts`, com escape de
   `name`/`email`.
6. Exportar o PNG da logo para `packages/web/public/logo-email.png`.

**Verificável isoladamente**: com `EMAIL_PROVIDER=console`, o HTML gerado é
impresso no terminal ao disparar o fluxo da Fase B.

### Fase B — Fluxo de redefinição no better-auth (US1 + US2 + US3, backend)

7. `use-cases/auth/SendPasswordResetEmail.ts` — inclui o bloqueio de contas sem
   `Account.providerId = 'credential'` (D5).
8. `use-cases/auth/SendPasswordChangedEmail.ts`.
9. `lib/auth.ts`: `sendResetPassword`, `onPasswordReset`,
   `revokeSessionsOnPasswordReset: true`, `resetPasswordTokenExpiresIn`,
   `minPasswordLength: 8`, e a regra de `rateLimit` para
   `/request-password-reset`.
10. `lib/password-reset-rate-limit.ts` + `hooks.before` no path
    `/request-password-reset`. **Incrementar sempre**, exista conta ou não (D6).
11. Registro dos eventos de segurança (FR-037 a FR-039), sem token nem senha.

**Verificável isoladamente**: `curl` nos endpoints do better-auth conforme o
`quickstart.md`, seção 2.

### Fase C — Telas (US1 + US3 + US4, web)

12. `proxy.ts`: separar `publicRoutes` de `authenticatedRedirectRoutes`.
13. `sign-in-form.tsx`: `<span>` vira `<Link href="/forgot-password">`.
14. Rota `/forgot-password` completa, com os dois estados.
15. Rota `/reset-password` completa, com formulário e painel de link inválido.
16. `helpers/auth-error-message.ts`: mensagens de `INVALID_TOKEN` e afins.
17. `login/page.tsx`: toast ao chegar com `?password-reset=success`.

**Verificável isoladamente**: roteiro do `quickstart.md`, seção 3, com validação
obrigatória pelo chrome-devtools MCP em 402px e 1280px.

### Fase D — Invalidação dos tokens anteriores

18. Implementar a invalidação dos links anteriores a cada nova solicitação e
    após cada redefinição concluída. O `better-auth@1.5.1` **não** faz isso:
    cada token gera um `identifier` próprio (`reset-password:<token>`) e
    `deleteVerificationByIdentifier` remove apenas o token que acabou de ser
    usado. Sem essa implementação, um link antigo continua trocando a senha
    depois de uma redefinição, anulando a remediação de FR-022 e FR-032.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nova dependência `resend` | Escolha explícita do autor; é o canal de envio, e o produto não tinha nenhum | SMTP via Nodemailer exigiria administrar credenciais, filas e reputação por conta própria, sem painel de entregabilidade |
| `pino` promovido a dependência direta | `sendResetPassword` e `onPasswordReset` rodam fora de qualquer handler Fastify, sem `request.log`; FR-037 a FR-039 exigem log estruturado | `console.error` não tem níveis nem campos estruturados, inviabilizando SC-013. Injetar `app.log` criaria dependência circular com `lib/auth.ts`. **Custo real de instalação: zero** — pino já está na árvore via Fastify 5 |
| Limitador por e-mail escrito à mão (`lib/password-reset-rate-limit.ts`) | O `rateLimit` do better-auth só agrupa por IP; FR-009 exige também a dimensão por endereço | Redis ou tabela em Postgres trariam infraestrutura ou escrita por tentativa para um contador que vive minutos e cabe num `Map`, coerente com o `storage: 'memory'` já em uso |
| Divergir do padrão do better-auth em `sendResetPassword` (D5) | Sem o bloqueio, contas só-Google receberiam link e `resetPassword` **criaria** uma credencial de senha — exatamente o que a clarificação recusou | Aceitar o padrão contraria decisão registrada na spec; interceptar em `resetPassword` seria tarde demais, o e-mail já teria revelado que o endereço tem conta |
