# Contract — Autenticação consumida pelo frontend

**Feature**: `008-login-signup-redesign` | **Date**: 2026-07-28

Esta feature **não adiciona, remove nem altera nenhuma rota REST do produto**.
Consequentemente **não há regeneração do Orval** (ver research R12): as rotas
`/api/auth/*` são registradas com `schema: { hide: true }` e ficam fora do
`/openapi.json` que o Orval consome.

O contrato abaixo é o do **better-auth**, já montado em
`packages/backend/src/index.ts` e tipado no cliente por `createAuthClient`
(`packages/web/src/lib/auth.ts`). Está documentado aqui porque é a superfície
que as duas telas passam a exercer — e porque duas configurações do backend
mudam o comportamento dele.

Documentação viva: `http://localhost:3333/docs` → aba **Auth**.

---

## `POST /api/auth/sign-in/email`

Chamado por `authClient.signIn.email(...)`.

**Request**

```jsonc
{
  "email": "user@email.com",
  "password": "••••••••",
  "rememberMe": false   // ← o checkbox "Manter conectado" (FR-003)
}
```

**200 — sucesso**

Emite o cookie `training-manager.session_token`.

| `rememberMe` | `Set-Cookie` | Efeito |
|---|---|---|
| `false` | sem `Max-Age` | cookie de sessão — morre ao fechar o navegador |
| `true` / omitido | `Max-Age` = 30 dias | permanece por 30 dias |

**Erros**

| Status | `code` | Tratamento na UI |
|---|---|---|
| 401 | `INVALID_EMAIL_OR_PASSWORD` | toast "E-mail ou senha incorretos." — **mesma copy** para e-mail inexistente, senha errada e conta só-Google (SC-007) |
| 429 | — (`{ "message": "Too many requests..." }`) | toast genérico "Muitas tentativas. Aguarde alguns minutos e tente de novo." O header `X-Retry-After` existe mas **não é lido** (FR-025) |
| rede | sem `code` | toast "Não foi possível conectar..." |

---

## `POST /api/auth/sign-up/email`

Chamado por `authClient.signUp.email(...)`.

**Request**

```jsonc
{
  "name": "Jefferson",
  "email": "user@email.com",
  "password": "••••••••"   // ≥ 8 caracteres, validado no cliente antes de enviar
}
```

**200 — sucesso**: cria `User` + `Account(providerId: 'credential')` e já
inicia a sessão (`autoSignIn` default). A UI redireciona para `/onboarding`.

**Erros**

| Status | `code` | Tratamento na UI |
|---|---|---|
| 422 | `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` | toast "Esse e-mail já está em uso. Tente entrar." — **igual** se a conta existente for Google; nenhuma credencial é vinculada (FR-010, SC-009) |
| 429 | — | mesmo toast genérico do login |
| rede | sem `code` | toast de conexão |

---

## `POST /api/auth/sign-in/social` (Google)

Chamado por `authClient.signIn.social({ provider: 'google', callbackURL })`.
Comportamento **inalterado**; muda apenas o rótulo do botão por tela (FR-013)
e o `callbackURL` continua sendo `${NEXT_PUBLIC_BASE_URL}/`.

Cancelamento ou falha volta para a tela de origem — a UI exibe o toast de
falha genérico (edge case do spec).

---

## `GET /api/auth/get-session`

Já consumido por `packages/web/src/lib/dal.ts`. Inalterado.

O redirecionamento de usuário autenticado que abre `/login` ou `/signup`
(FR-015) **não** passa por aqui: acontece em `packages/web/src/proxy.ts`, que
inspeciona o cookie de sessão. A única mudança é registrar `/signup` como rota
pública.

---

## Mudanças de configuração no backend

Nenhuma altera formato de request/response. Ambas ficam em
`packages/backend/src/lib/auth.ts`, exceto onde indicado.

| # | Mudança | Requisito |
|---|---|---|
| 1 | `session: { expiresIn: env.AUTH_SESSION_EXPIRES_IN }` — padrão `2592000` (30 dias); era o default de 7 dias da lib | FR-003 |
| 2 | `rateLimit: { enabled: true, storage: 'memory', customRules: { '/sign-in/email': { max: env.AUTH_RATE_LIMIT_MAX, window: env.AUTH_RATE_LIMIT_WINDOW } } }` — padrões `10` e `300` | FR-024, FR-025 |
| 3 | Em `packages/backend/src/index.ts`, o handler catch-all de `/api/auth/*` passa a definir `x-forwarded-for` a partir de `request.ip` antes de montar o `Request` | FR-024 — sem isso o limite não é "por origem" (research R4) |

`emailAndPassword.enabled` já é `true` — nada a fazer (Assumption do spec
confirmada).
