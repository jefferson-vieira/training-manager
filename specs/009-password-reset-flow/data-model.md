# Phase 1 — Data Model: Fluxo de Recuperar Senha

**Feature**: `009-password-reset-flow` | **Date**: 2026-07-30

> **Nenhuma migração Prisma é necessária.** Todas as entidades persistidas já
> existem no `schema.prisma`. Este documento mapeia as entidades da spec para o
> que está no banco e define as estruturas em memória que a feature acrescenta.

---

## Entidades persistidas (já existentes)

### `Verification` → Solicitação de redefinição

Model já presente em `packages/backend/prisma/schema.prisma`, reaproveitado pelo
better-auth para os tokens de redefinição. **Não alterar.**

| Campo | Uso nesta feature |
|---|---|
| `identifier` | `reset-password:<token>` — o prefixo é o que distingue estes registros de outros usos de verificação |
| `value` | `user.id` do dono da solicitação |
| `expiresAt` | Instante da criação + `AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN` (3600s) |

**Ciclo de vida** (conduzido inteiramente pelo better-auth):

```
criado em POST /api/auth/request-password-reset
   │
   ├── GET /api/auth/reset-password/:token  → lê, não consome
   │      ├─ válido   → redirect para CLIENT_ORIGIN/reset-password?token=…
   │      └─ inválido → redirect para CLIENT_ORIGIN/reset-password?error=INVALID_TOKEN
   │
   ├── POST /api/auth/reset-password → revalida e **apaga** o registro (uso único)
   │
   └── expirado → recusado na leitura; permanece até ser sobrescrito
```

**Regras derivadas**:
- **Uso único** (FR-020): garantido por `deleteVerificationByIdentifier` após a
  troca.
- **Só o link mais recente vale**: cada solicitação cria um `identifier` novo; os
  anteriores continuam válidos até expirar. ⚠️ Isso **diverge** do Edge Case
  "apenas o link mais recente conduz a uma redefinição bem-sucedida" — ver
  `contracts/README.md`, seção "Divergências conhecidas".

### `Account` → Credencial de senha

Consultado (nunca escrito por nós) para decidir se o link deve ser enviado.

| Campo | Uso |
|---|---|
| `providerId` | `'credential'` identifica a conta com senha; `'google'` identifica a social |
| `userId` | Chave da consulta |

**Regra de negócio (FR-006 / D5)**: usuário sem `Account` com
`providerId = 'credential'` **não recebe link**. A verificação acontece em
`sendResetPassword`, antes de qualquer envio.

### `Session` → Sessões encerradas

Apagadas em massa por `deleteSessions(userId)` quando
`revokeSessionsOnPasswordReset: true` (FR-022). Nenhum campo novo.

### `User` → Nome e e-mail do destinatário

`user.name` alimenta a saudação do e-mail (FR-012); `user.email` é o destinatário
e aparece no rodapé.

---

## Estruturas em memória (novas)

### `PasswordResetAttemptWindow`

Contador do limite por endereço de e-mail (FR-009, D6). Vive em
`packages/backend/src/lib/password-reset-rate-limit.ts`.

| Campo | Tipo | Descrição |
|---|---|---|
| `key` | `string` | E-mail normalizado: `trim()` + `toLowerCase()` |
| `count` | `number` | Solicitações dentro da janela corrente |
| `windowStartedAt` | `number` | Epoch em ms do início da janela |

**Regras**:
- Janela e teto vêm de `PASSWORD_RESET_RATE_LIMIT_WINDOW` (900s) e
  `PASSWORD_RESET_RATE_LIMIT_MAX` (3).
- A janela reinicia quando `now - windowStartedAt > window`.
- **Incrementa sempre**, exista conta ou não (D6) — incrementar só para e-mails
  reais transformaria o limite num oráculo de enumeração.
- Entradas expiradas são descartadas de forma preguiçosa, na leitura, para o
  `Map` não crescer sem limite.
- Estado por processo, perdido no restart — aceito, igual ao `storage: 'memory'`
  que o `rateLimit` do better-auth já usa.

### `EmailMessage`

Retorno das funções de template em `packages/backend/src/emails/`.

| Campo | Tipo | Descrição |
|---|---|---|
| `subject` | `string` | Assunto |
| `html` | `string` | Corpo em HTML, tabelas + estilos inline |
| `text` | `string` | Alternativa em texto puro (FR-016) |

### `EmailSendResult`

Retorno de `sendEmail()` em `packages/backend/src/lib/email.ts`. Nunca lança —
uma falha de envio não pode derrubar a resposta neutra ao usuário (FR-006).

| Campo | Tipo | Descrição |
|---|---|---|
| `ok` | `boolean` | Envio aceito pelo provedor |
| `id` | `string \| null` | Id da mensagem no Resend, quando houver |
| `error` | `string \| null` | Mensagem de falha, para o log (FR-039) |

---

## Dados dos templates

### `reset-password`

| Variável | Origem |
|---|---|
| `name` | `user.name` |
| `email` | `user.email` |
| `resetUrl` | Parâmetro `url` de `sendResetPassword` |
| `supportUrl` | `EMAIL_SUPPORT_URL` |
| `logoUrl` | `EMAIL_LOGO_URL` |

### `password-changed`

| Variável | Origem |
|---|---|
| `name` | `user.name` |
| `email` | `user.email` |
| `supportUrl` | `EMAIL_SUPPORT_URL` |
| `logoUrl` | `EMAIL_LOGO_URL` |

⚠️ **Invariante de segurança (FR-033)**: o template `password-changed` **não
recebe** `resetUrl` nem qualquer token. Um e-mail de aviso que carregasse um link
capaz de trocar a senha anularia o propósito do aviso.

---

## Estado de tela (web)

### `/forgot-password`

Máquina de dois estados, espelhando as variantes `3a`/`3b` do design:

```
form ──(envio aceito)──> success
  ^                         │
  └────("tente outro e-mail")┘
```

Estado local do componente (`useState`), sem URL nem persistência: recarregar a
página volta ao formulário, o que é o comportamento correto para uma tela
pública.

### `/reset-password`

Estado derivado dos search params, resolvido no Server Component:

| Search params | Renderiza |
|---|---|
| `?token=<t>` | Formulário de nova senha (variantes `4a`/`4b`) |
| `?error=INVALID_TOKEN` | Painel de link inválido + caminho para `/forgot-password` |
| nenhum / incompleto | Painel de link inválido (mesmo tratamento) |
