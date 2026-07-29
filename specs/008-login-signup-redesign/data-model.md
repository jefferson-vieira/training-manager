# Phase 1 — Data Model: Login e Criar Conta com Banner

**Feature**: `008-login-signup-redesign` | **Date**: 2026-07-28

> **Nenhuma migration Prisma faz parte desta feature.** Todas as entidades
> persistidas abaixo já existem em `packages/backend/prisma/schema.prisma`,
> criadas pelo better-auth. Esta seção documenta os campos que a feature passa
> a **usar**, para deixar claro que nada precisa ser adicionado.

---

## Entidades persistidas (existentes — sem alteração)

### `User`

Identidade do praticante. Já criada tanto pelo fluxo Google quanto pelo de
e-mail/senha.

| Campo | Uso nesta feature |
|---|---|
| `name` | Preenchido pelo campo "Nome" do cadastro (FR-008) |
| `email` | Identidade única; colisão dispara FR-010 |
| `emailVerified` | **Não** exigido para concluir o cadastro (Assumption do spec) |

Regra de unicidade: `email` é único. Uma tentativa de `signUp.email` com
e-mail existente é recusada com `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`,
**sem** vincular credencial à conta existente (FR-010, SC-009).

### `Account`

Vínculo entre `User` e um método de autenticação. Uma linha com
`providerId: 'credential'` guarda o hash da senha; uma com
`providerId: 'google'` guarda o vínculo OAuth.

Esta feature **não cria** um segundo `Account` para um `User` existente — é
exatamente o account linking recusado na clarificação de 2026-07-28.

### `Session`

Vínculo autenticado entre visitante e conta.

| Campo | Uso nesta feature |
|---|---|
| `expiresAt` | Passa a ser `agora + 30 dias` (era 7, o default do better-auth) |
| `ipAddress` | Passa a ser preenchido de verdade — ver R4 (repasse de `x-forwarded-for`) |

**Duração** (FR-003):

| "Manter conectado" | Cookie | Registro `Session` |
|---|---|---|
| Desmarcado | Sem `maxAge` → expira ao fechar o navegador | `expiresAt` = +30d (o cookie é o limite efetivo) |
| Marcado | `maxAge` = 30 dias | `expiresAt` = +30d |
| Cadastro / Google | `maxAge` = 30 dias (`rememberMe` default `true`) | `expiresAt` = +30d |

### Estado do rate limit

Mantido **em memória** pelo better-auth (`rateLimit.storage: 'memory'`).
Não é uma entidade Prisma e **não gera migration** — ver R3. Zera a cada
restart do processo, o que é aceitável para instância única.

---

## Modelos de formulário (frontend, não persistidos)

Schemas Zod em `packages/web/src/helpers/auth-schemas.ts`, ligados ao
react-hook-form pelo `zodResolver` de `@hookform/resolvers/zod` (que reconhece
Zod 4 em runtime — research R1). São a fonte das mensagens inline
(FR-005, FR-023).

### `signInSchema`

| Campo | Tipo | Regra | Mensagem inline (pt-BR) |
|---|---|---|---|
| `email` | string | obrigatório, formato de e-mail | "Informe seu e-mail." / "Informe um e-mail válido." |
| `password` | string | obrigatório | "Informe sua senha." |
| `rememberMe` | boolean | default `false` | — |

Nota: o login **não** valida tamanho mínimo de senha. Fazer isso vazaria a
política de senha e criaria um caminho de erro diferente para senha curta vs.
senha errada, contrariando SC-007.

### `signUpSchema`

| Campo | Tipo | Regra | Mensagem inline (pt-BR) |
|---|---|---|---|
| `name` | string | obrigatório, `trim`, ≥ 1 | "Informe seu nome." |
| `email` | string | obrigatório, formato de e-mail | "Informe seu e-mail." / "Informe um e-mail válido." |
| `password` | string | obrigatório, ≥ 8 caracteres | "A senha precisa ter pelo menos 8 caracteres." |

O mínimo de 8 caracteres também aparece como texto de apoio permanente sob o
campo (`FieldDescription`), não só como erro — é o que o design entrega
("Mínimo de 8 caracteres.") e o que o FR-008 exige.

---

## Estado de UI (por tela)

Gerido pelo **react-hook-form**, instanciado dentro dos hooks
`packages/web/src/hooks/use-sign-in-form.ts` e `use-sign-up-form.ts` — nunca no
componente (Princípio II). Cada hook devolve `{ form, onSubmit }`.

```ts
const form = useForm<z.infer<typeof signInSchema>>({
  resolver: zodResolver(signInSchema),
  defaultValues: { email: '', password: '', rememberMe: false },
  mode: 'onSubmit',
  reValidateMode: 'onChange',
});
```

| Estado do RHF | Papel |
|---|---|
| `form.control` | consumido por `Controller` em cada campo |
| `fieldState.error` / `fieldState.invalid` | erro inline via `FieldError` + `aria-invalid` (FR-005, FR-023) |
| `formState.isSubmitting` | alimenta `Button loading` → desabilita e mostra Spinner (FR-016) |
| valores do formulário | não controlados; sobrevivem à troca de layout em 1024px porque o componente não desmonta (cenário 4 da história 4) |

`handleSubmit` já ignora reenvios enquanto a promise do `onSubmit` não resolve
— o FR-016 não precisa de guarda manual.

Erros vindos do servidor **não** entram no `formState`: vão para `toast()` via
o helper de R6 (FR-006, FR-025). Usar `setError` colocaria a mensagem sob um
campo, contrariando a clarificação de 2026-07-27 e, no caso de credencial
inválida, revelando qual campo está errado (SC-007).

---

## Transições de estado

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
   editando ──submit──> validando ──inválido──> editando + fieldErrors
                            │
                         válido
                            │
                            v
                       enviando (isSubmitting = true, botões travados)
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
     sucesso            erro do servidor      rede/429
        │                   │                    │
        v                   v                    v
   redireciona        editando + toast     editando + toast
   (login → /)        (nada travado)       (nada travado)
   (cadastro →
    /onboarding)
```

Em todos os caminhos de erro o formulário volta **editável** com os valores
preservados, sem recarregar a página — é o que os edge cases de rede e de
limite de tentativas exigem.

---

## Destinos após sucesso

| Fluxo | Destino | Por quê |
|---|---|---|
| Login (e-mail/senha) | `/` | A home redireciona para `/onboarding` sozinha se não houver plano ativo (regra existente do produto) |
| Login com Google | `/` | Comportamento atual, preservado |
| Cadastro | `/onboarding` | FR-009 — usuário novo nunca tem plano ativo |
| Cadastro com Google | `/` | Mesmo callback do login; a home resolve o desvio para onboarding |
