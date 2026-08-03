# Phase 1 — Contracts: Fluxo de Recuperar Senha

**Feature**: `009-password-reset-flow` | **Date**: 2026-07-30

> **Nenhum contrato REST novo é criado.** O fluxo inteiro usa endpoints que o
> `better-auth` já expõe sob `/api/auth/*` — rota registrada em
> `packages/backend/src/index.ts` com `schema: { hide: true }` e consumida no
> front pelo `authClient`, não pelo cliente gerado pelo Orval.
>
> **Consequência prática: `npx orval` NÃO precisa rodar nesta feature**, e nada
> entra em `packages/backend/src/dtos/` ou `src/schemas/`.

---

## 1. Contratos HTTP consumidos (better-auth)

### `POST /api/auth/request-password-reset`

Chamado por `authClient.requestPasswordReset({ email, redirectTo })`.

**Request**

```jsonc
{
  "email": "voce@email.com",
  "redirectTo": "http://localhost:3000/reset-password" // ${CLIENT_ORIGIN}/reset-password
}
```

**Response `200`** — idêntica exista ou não a conta (FR-006, SC-004):

```jsonc
{
  "status": true,
  "message": "If this email exists in our system, check your email for the reset link"
}
```

**Response `429`** — limite por origem (nativo) ou por endereço (nosso hook).
O front traduz pelo `status`, não pela mensagem — `getAuthErrorMessage` já
converte `429` em "Muitas tentativas. Aguarde alguns minutos e tente de novo."

⚠️ **A mensagem do corpo nunca é exibida ao usuário**: é texto em inglês, gerado
pela biblioteca. Toda a interface fica em português (FR-028).

---

### `GET /api/auth/reset-password/:token?callbackURL=<encoded>`

Alvo do botão do e-mail. **Não é chamado por código nosso** — o usuário chega
nele clicando no link. Valida o token e redireciona:

| Situação | Redireciona para |
|---|---|
| Token válido e no prazo | `<callbackURL>?token=<token>` |
| Ausente, expirado ou desconhecido | `<callbackURL>?error=INVALID_TOKEN` |

É este redirect que satisfaz **FR-035** (validar ao abrir a tela) sem nenhuma
requisição adicional do front.

⚠️ `callbackURL` passa por `originCheck` do better-auth: precisa bater com
`trustedOrigins`, onde `CLIENT_ORIGIN` já está declarado.

---

### `POST /api/auth/reset-password`

Chamado por `authClient.resetPassword({ newPassword, token })`.

**Request**

```jsonc
{ "newPassword": "novasenha123", "token": "<token da URL>" }
```

**Response `200`**: `{ "status": true }` — sem sessão criada; o usuário segue
para o login (FR-022).

**Erros relevantes** (`code` em `error`):

| `code` | Quando | Mensagem em pt-BR |
|---|---|---|
| `INVALID_TOKEN` | Token ausente, expirado ou já usado | "Este link não é mais válido. Solicite um novo." |
| `PASSWORD_TOO_SHORT` | Menos de 8 caracteres | Barrado antes por Zod; rede de segurança |
| `PASSWORD_TOO_LONG` | Mais de 128 caracteres | Barrado antes por Zod |

Estes códigos entram em `MESSAGE_BY_CODE` de
`packages/web/src/helpers/auth-error-message.ts`.

---

## 2. Contrato interno — `sendEmail`

`packages/backend/src/lib/email.ts`

```ts
type EmailMessage = { subject: string; html: string; text: string };

type SendEmailInput = EmailMessage & {
  to: string;
  idempotencyKey: string;
};

type EmailSendResult = {
  ok: boolean;
  id: string | null;
  error: string | null;
};

// Nunca lança. Uma falha de envio não pode derrubar a resposta neutra ao usuário.
export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult>;
```

**Comportamento por `EMAIL_PROVIDER`**:

| Valor | Efeito |
|---|---|
| `console` | Escreve assunto, destinatário e HTML no logger; devolve `{ ok: true, id: null, error: null }`. Zero rede. |
| `resend` | `resend.emails.send({ from: EMAIL_FROM, to, subject, html, text }, { idempotencyKey })` |

⚠️ **Gotcha do SDK**: `resend.emails.send` **devolve `{ data, error }` em vez de
lançar**. A implementação precisa de duas guardas: `try/catch` para falhas de
rede/runtime (exigido pela constituição) **e** uma checagem explícita de `error`
logo em seguida. Só um `try/catch` deixaria passar toda falha de API silenciosa.

---

## 3. Contrato interno — templates

`packages/backend/src/emails/reset-password.ts`

```ts
type ResetPasswordEmailInput = {
  name: string;
  email: string;
  resetUrl: string;
  supportUrl: string;
  logoUrl: string;
};

export function buildResetPasswordEmail(i: ResetPasswordEmailInput): EmailMessage;
```

`packages/backend/src/emails/password-changed.ts`

```ts
type PasswordChangedEmailInput = {
  name: string;
  email: string;
  supportUrl: string;
  logoUrl: string;
};

export function buildPasswordChangedEmail(i: PasswordChangedEmailInput): EmailMessage;
```

⚠️ **Invariante (FR-033)**: `PasswordChangedEmailInput` **não tem** campo de URL
de redefinição. O tipo é a garantia — não há como um token vazar para o aviso.

**Assuntos**:
- redefinição: `Redefinir sua senha — FIT.AI` (do `<title>` do design)
- aviso: `Sua senha foi alterada — FIT.AI`

**Escape obrigatório**: `name` e `email` vêm do cadastro e entram em HTML.
Precisam ser escapados (`&`, `<`, `>`, `"`) antes da interpolação, senão um nome
com `<` quebra o layout e abre espaço para injeção no corpo da mensagem.

---

## 4. Contrato interno — use-cases

`packages/backend/src/use-cases/auth/SendPasswordResetEmail.ts`

```ts
class SendPasswordResetEmail {
  execute(input: {
    userId: string;
    name: string;
    email: string;
    resetUrl: string;
    token: string;
  }): Promise<void>;
}
```

Responsabilidades, nesta ordem:
1. Consultar `Account` com `providerId = 'credential'` para o `userId`.
2. **Sem credencial → registra o evento e retorna sem enviar** (FR-006, D5).
3. Montar o template e chamar `sendEmail` com
   `idempotencyKey: \`password-reset/${userId}-${token.slice(0, 8)}\``.
4. Registrar sucesso ou falha (FR-037, FR-039).

`packages/backend/src/use-cases/auth/SendPasswordChangedEmail.ts`

```ts
class SendPasswordChangedEmail {
  execute(input: { userId: string; name: string; email: string }): Promise<void>;
}
```

Chamado por `onPasswordReset`. `idempotencyKey`:
`password-changed/${userId}-${Date.now()}`.

---

## 5. Contrato de rotas (web)

| Rota | Tipo | Proteção |
|---|---|---|
| `/forgot-password` | Server Component + form client | Pública, **sem** redirecionar usuário autenticado (FR-002) |
| `/reset-password` | Server Component lendo `searchParams` | Pública, **sem** redirecionar usuário autenticado (FR-002) |
| `/login?password-reset=success` | Já existe | Exibe o toast de sucesso ao chegar da redefinição |

⚠️ **Mudança em `packages/web/src/proxy.ts`**: hoje `publicRoutes` acumula dois
papéis — "não exige sessão" e "manda o autenticado para a home". As duas telas
novas precisam do primeiro sem o segundo. O conjunto tem de ser dividido em
`publicRoutes` (login, signup, forgot-password, reset-password) e
`authenticatedRedirectRoutes` (apenas login e signup).

---

## 6. Divergências conhecidas em relação à spec

| Item da spec | Comportamento real | Encaminhamento |
|---|---|---|
| Edge Case "apenas o link mais recente conduz a uma redefinição bem-sucedida" | O better-auth cria um `Verification` por solicitação e **não invalida os anteriores**: cada token gera um `identifier` próprio (`reset-password:<token>`), `deleteVerificationByIdentifier` remove só o token usado, e a única limpeza em massa apaga linhas com `expiresAt < now` — coleta de lixo de tokens já vencidos, não invalidação | **Implementado por nós** em `use-cases/auth/InvalidatePreviousResetTokens.ts`, chamado no `sendResetPassword` (preservando o token recém-emitido) e no `onPasswordReset` (sem preservar nenhum). O Edge Case da spec permanece válido **como está escrito**. Sem isso, um link antigo continuaria trocando a senha após uma redefinição, anulando a remediação de FR-022 e FR-032 |
| Endereço `app.fit.ai/redefinir-senha?token=` no template | O link real aponta para `${BETTER_AUTH_URL}/api/auth/reset-password/<token>?callbackURL=…`, que redireciona para `/reset-password` | Já previsto na Assumption da spec ("o endereço do design é ilustrativo") |
