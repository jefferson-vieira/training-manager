# Phase 0 — Research: Login e Criar Conta com Banner

**Feature**: `008-login-signup-redesign` | **Date**: 2026-07-28

Todas as incógnitas do Technical Context foram resolvidas. Nenhum
`NEEDS CLARIFICATION` permanece.

---

## R1 — Validação de formulário com react-hook-form

> **Decisão do autor da feature** (2026-07-28), substituindo a versão anterior
> desta pesquisa, que havia escolhido hooks próprios com Zod puro. A alternativa
> descartada continua registrada abaixo para quem revisitar.

**Decision**: Usar **react-hook-form** com o **zodResolver**, envolvido em hooks
dedicados em `packages/web/src/hooks/`. Os schemas Zod permanecem em
`packages/web/src/helpers/auth-schemas.ts` (regra de domínio: mínimo de 8
caracteres, formato de e-mail, campos obrigatórios).

**Dependências novas** (ambas em `packages/web`, nunca na raiz):

| Pacote | Versão | Peso aprox. (gzip) |
|---|---|---|
| `react-hook-form` | `7.83.0` | ~9 kB |
| `@hookform/resolvers` | `5.5.7` | ~1 kB |

**Compatibilidade verificada**: `@hookform/resolvers@5.5.7` declara peer
`zod: "^3.25.0 || ^4.0.0"` e `react-hook-form: "^7.55.0"`. O projeto já tem
`zod@4.3.6`, então o `zodResolver` de `@hookform/resolvers/zod` detecta o
schema Zod 4 em runtime e infere `z4.input`/`z4.output` — **nenhum pacote extra**
(`@standard-schema/spec` não é necessário) e nenhum upgrade de Zod.

**Justificativa exigida pelo Princípio V** (novo pacote precisa declarar o
problema, por que o stack atual não resolve, e o custo):

- *Problema*: estado por campo, `dirty`/`touched`, revalidação após o primeiro
  erro, foco no primeiro campo inválido e trava de reenvio durante o submit.
- *Por que o stack atual não basta*: dá para escrever isso à mão com `useState`,
  mas seriam ~80 linhas de orquestração de estado duplicadas entre dois
  formulários — exatamente o tipo de código que o Princípio II manda evitar. O
  RHF também mantém o formulário **não controlado**, evitando um re-render por
  tecla digitada, o que se alinha ao Princípio VI.
- *Custo*: ~10 kB gzip somados, em duas rotas públicas que não fazem parte do
  bundle da área autenticada. Biblioteca madura, mantida e sem árvore transitiva
  pesada (`react-hook-form` tem zero dependências em runtime).

**Padrão de composição**: o shadcn atual integra RHF via `Controller` +
`Field`/`FieldGroup`/`FieldLabel`/`FieldError`/`FieldDescription` — **não** pelo
componente legado `form.tsx`. Ver R7.

**Divisão de responsabilidade** (Princípio II — lógica fora do componente):

- `helpers/auth-schemas.ts` — as regras e as mensagens em pt-BR.
- `hooks/use-sign-in-form.ts` / `use-sign-up-form.ts` — chamam `useForm`,
  ligam o `zodResolver`, executam a chamada ao better-auth, traduzem erros de
  servidor para toast e fazem o redirect. Devolvem `{ form, onSubmit }`.
- O componente `.tsx` só compõe `Controller` + `Field` e renderiza.

**Alternatives considered**:

- **Hooks próprios com Zod puro, zero dependências** — era a decisão anterior.
  Descartada por escolha explícita do autor; o ganho era não somar ~10 kB, o
  custo era reimplementar validação, revalidação e estado de submissão à mão.
- `@shadcn/form` (`FormField`/`FormItem`/`FormControl`/`FormMessage`) — o
  registry declara `radix-ui` como dependência, e o projeto é Base UI. O padrão
  `Controller` + `Field` entrega o mesmo com os primitivos que já teremos. Ver R7.
- `@tanstack/react-form` / `formisch` — também suportados pelo shadcn, mas o
  pedido foi react-hook-form, que é o mais estabelecido dos três.
- Server Actions com `useActionState` — o `authClient` do better-auth é um
  cliente de browser (`better-auth/react`) e grava o cookie de sessão na
  resposta; passar por uma Server Action exigiria reencaminhar `Set-Cookie`
  manualmente. Rejeitado por complexidade sem ganho.
- Validação só pelo `required`/`type=email` nativos — não atende FR-023
  (erro associado programaticamente) nem o texto em pt-BR do FR-021.

---

## R2 — Duração de sessão e "Manter conectado"

**Decision**: Em `packages/backend/src/lib/auth.ts`, definir
`session: { expiresIn: 60 * 60 * 24 * 30 }` (30 dias). No cliente, chamar
`authClient.signIn.email({ ..., rememberMe })` com o valor do checkbox.

**Rationale**: Confirmado no código do better-auth 1.5.x: em
`setSessionCookie`, `maxAge = dontRememberMe ? undefined : sessionConfig.expiresIn`.
Ou seja, `rememberMe: false` emite um **cookie de sessão de navegador** (expira
ao fechar), e `rememberMe: true` usa `expiresIn`. Isso satisfaz o FR-003
exatamente com a configuração de biblioteca, sem código próprio de expiração.
O default de `expiresIn` é 7 dias — precisa ser alterado para 30.

**Consequência para os outros fluxos**: `signUp.email` e `signIn.social`
(Google) não enviam `rememberMe`, e o default do campo no schema do better-auth
é `true`. Logo ambos herdam os 30 dias, que é o comportamento descrito nas
Assumptions do spec.

**Alternatives considered**:

- Dois valores de `expiresIn` por chamada — não é suportado pela API; o
  `expiresIn` é global à instância.
- Implementar expiração própria em cima do cookie — reimplementaria o que a
  lib já faz. Rejeitado.

---

## R3 — Limite de tentativas (FR-024 / FR-025)

**Decision**: Usar o **rate limiter embutido do better-auth**, ativado
explicitamente:

```ts
rateLimit: {
  enabled: true,
  storage: 'memory',
  customRules: {
    '/sign-in/email': {
      max: env.AUTH_RATE_LIMIT_MAX,
      window: env.AUTH_RATE_LIMIT_WINDOW,
    },
  },
}
```

**Rationale**:

- `rateLimit.enabled` só é `true` por padrão em produção. Como a verificação
  deste projeto é **manual em dev** (Princípio I), sem `enabled: true`
  explícito o FR-024 seria impossível de demonstrar localmente.
- O better-auth já traz uma regra especial embutida de **3 requisições / 10s**
  para qualquer path iniciado por `/sign-in` e `/sign-up`. Ela é agressiva
  demais para cadastro (um usuário corrigindo o formulário três vezes seguidas
  bateria no limite). A `customRules` acima afrouxa o login para uma janela
  que faz sentido contra força bruta (10 tentativas / 5 min por origem) e
  deixa o `/sign-up/email` no default.
- `storage: 'memory'` é o default e não exige modelo Prisma nem migration.

**Valores definidos** (a spec deferiu explicitamente para esta fase): `max: 10`
tentativas numa janela de `window: 300` segundos, por origem, em
`/sign-in/email`. Ambos saem de variáveis de ambiente —
`AUTH_RATE_LIMIT_MAX` e `AUTH_RATE_LIMIT_WINDOW` — com esses números como
default, de modo que apertar ou afrouxar o limite não exige deploy de código.
`AUTH_SESSION_EXPIRES_IN` (padrão `2592000`) faz o mesmo pela duração da sessão
do R2.

**Alternatives considered**:

- `storage: 'database'` + `modelName: 'rateLimit'` — exigiria um modelo Prisma
  novo e uma migration para um app de instância única. Rejeitado por custo
  desproporcional; anotado como o caminho a seguir se o deploy virar
  multi-instância.
- Plugin de rate limit do Fastify (`@fastify/rate-limit`) — dependência nova
  cobrindo o que o better-auth já faz. Rejeitado por Princípio V.

---

## R4 — Encaminhar o IP do cliente para o rate limiter

**Decision**: No handler catch-all de `/api/auth/*` em
`packages/backend/src/index.ts`, definir o header `x-forwarded-for` a partir de
`request.ip` antes de construir o `Request` passado para `auth.handler(req)`.

**Rationale**: O handler atual reconstrói um `Request` do WHATWG a partir de
`request.headers` — o socket do Fastify, e portanto o IP de origem, **não
atravessa essa fronteira**. O rate limiter do better-auth resolve a origem
lendo os headers de IP (`x-forwarded-for` por padrão). Sem esse repasse, todas
as tentativas caem no mesmo balde (ou nenhum), e o FR-024 ("por origem")
não se sustenta. Este é o único ponto do backend em que o comportamento
descrito no spec depende de código nosso, e não de configuração.

**Alternatives considered**:

- Configurar `advanced.ipAddress.ipAddressHeaders` para outro header — não
  resolve: o problema é que nenhum header de IP existe, não qual header é lido.
- `disableIpTracking` — desliga justamente o que o FR-024 pede.

---

## R5 — Colisão de e-mail entre Google e senha

**Decision**: Nenhuma configuração nova. O comportamento default do
better-auth já é o exigido pela clarificação de 2026-07-28.

**Rationale**: `signUp.email` com um e-mail já existente lança
`APIError(UNPROCESSABLE_ENTITY, USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL)` —
recusa sem vincular credencial, independentemente de a conta ter vindo do
Google. E `signIn.email` numa conta sem credencial de senha devolve o erro
genérico de credencial inválida, sem revelar o método. Isso satisfaz FR-010,
SC-007 e SC-009 **sem** habilitar `account.accountLinking`.

**Alternatives considered**:

- Habilitar `accountLinking` com `trustedProviders: ['google']` — permitiria
  que quem soubesse o e-mail anexasse uma senha própria a uma conta Google
  existente a partir de um formulário público. Rejeitado na clarificação
  (opção A).

---

## R6 — Mensagens de erro em pt-BR

**Decision**: Um helper `packages/web/src/helpers/auth-error-message.ts`
que mapeia `error.code` (de `authClient.$ERROR_CODES`) e `error.status` para
copy em pt-BR, com um fallback genérico.

**Rationale**: FR-021 exige pt-BR; SC-007 exige que credencial inválida e
e-mail inexistente sejam indistinguíveis; FR-025 exige mensagem genérica no
429. Concentrar o mapa num helper impede que cada tela invente sua própria
copy e mantém a regra de "não revelar existência" num lugar só. É regra de
domínio → `helpers/`, não `lib/`.

**Mapeamento**:

| Origem | Canal | Copy |
|---|---|---|
| `status: 429` | toast | "Muitas tentativas. Aguarde alguns minutos e tente de novo." |
| `INVALID_EMAIL_OR_PASSWORD` (e qualquer falha de login) | toast | "E-mail ou senha incorretos." |
| `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` | toast | "Esse e-mail já está em uso. Tente entrar." |
| falha de rede (sem `error.code`) | toast | "Não foi possível conectar. Verifique sua internet e tente de novo." |
| validação Zod | inline | mensagem do schema, sob o campo |

---

## R7 — Primitivos de UI ausentes

**Decision**: Adicionar `field`, `checkbox` e `label` via
`npx shadcn@latest add @shadcn/field @shadcn/checkbox @shadcn/label`, dentro de
`packages/web`.

**Rationale**: `packages/web/src/components/ui/` hoje tem `button`, `input`,
`link`, `sonner`, `spinner` e outros — mas **não** tem label nem checkbox, e a
tela precisa dos dois (FR-001, FR-003, FR-022).

Fonte da verdade: <https://ui.shadcn.com/docs/forms/react-hook-form>, mais os
exemplos `form-rhf-input`, `form-rhf-checkbox` e o bloco `signup-05` do registry.

**`@shadcn/form` NÃO é adicionado.** O padrão atual é `Controller` + `Field` —
os docs não mencionam o legado `form.tsx` (`FormField`/`FormItem`/`FormControl`/
`FormMessage`), que ainda declara `radix-ui` e seria uma segunda biblioteca de
primitivos convivendo com Base UI (Princípio V).

### Superfície do `field` que estas telas usam

| Componente | Onde | Substitui |
|---|---|---|
| `FieldGroup` | wrapper de todos os campos do `<form>` | espaçamento manual entre campos |
| `Field` | um por campo, com `data-invalid={fieldState.invalid}` | `<div className="flex flex-col gap-1.5">` |
| `FieldLabel` | rótulo, ligado por `htmlFor` | `<label>` estilizado à mão |
| `FieldError` | `errors={[fieldState.error]}` | mensagem inline manual + `aria-describedby` |
| `FieldDescription` | "Mínimo de 8 caracteres.", aviso de termos, linha de navegação cruzada | `<p>` estilizado à mão |
| `FieldSeparator` | **o divisor "ou"** | um `auth-divider.tsx` próprio — **não é mais necessário** |
| `Field orientation="horizontal"` | a linha do checkbox "Manter conectado" | flex row manual |

Anatomia de um campo, conforme os docs:

```tsx
<Controller
  name="email"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="signin-email">E-mail</FieldLabel>
      <Input {...field} id="signin-email" aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

E o divisor, que no `signup-05` aparece exatamente na posição do nosso:

```tsx
<FieldSeparator>ou</FieldSeparator>
```

**Consequência de plano**: o componente `auth-divider.tsx` sai do escopo. A
regra de UI do projeto manda preferir o design system a estilizar tags nativas,
e escrever dois `<span>` com hairline seria reimplementar `FieldSeparator`.

**Risco a verificar na implementação**: o `components.json` deste projeto usa
`"style": "base-vega"` e os primitivos existentes importam de
`@base-ui/react/*`. O registry `@shadcn` lista `radix-ui` como dependência de
`checkbox`/`label`. Se o CLI emitir a variante Radix, **portar os imports para
`@base-ui/react` e não instalar `radix-ui`**.

**Risco a verificar na implementação**: o `components.json` deste projeto usa
`"style": "base-vega"` e os primitivos existentes importam de
`@base-ui/react/*`. O registry `@shadcn` lista `radix-ui` como dependência de
`checkbox`/`label`. Se o CLI emitir a variante Radix, **portar os imports para
`@base-ui/react` e não instalar `radix-ui`**.

---

## R8 — Alturas fixas vs. alvos de toque

**Decision**:

- Alterar `packages/web/src/components/ui/input.tsx`: `h-9` → `min-h-9`.
- Nos campos das telas de auth, aplicar `min-h-11` (44px).
- Usar `Button size="xl"` nos dois botões de ação (submit e Google).

**Rationale**: A regra do projeto proíbe dimensionar por `height` fixo, e a
constituição (Princípio IV) exige alvos de toque ≥ 44×44px. O design entrega
36px no desktop e 44px no mobile, mas as Assumptions do spec já registram que
essas alturas são referência visual, não obrigação. `min-h-9` renderiza
idêntico a `h-9` para um input de linha única, então a troca na base é segura
para as outras páginas e corrige uma violação existente. `Button size="xl"` já
é `min-h-11` no `buttonVariants` — nenhum override necessário, e o `loading`
embutido (Spinner + `disabled`) atende o FR-016 sem código extra.

O `Input` base já traz `text-base md:text-sm`, que mantém 16px no mobile e
evita o zoom automático do iOS — coerente com o design (16px mobile / 14px
desktop).

---

## R9 — Ponto de troca de layout

**Decision**: Usar o breakpoint `lg:` do Tailwind (min-width **1024px**).

**Rationale**: FR-017 pede banner lateral a partir de 1024px e FR-018 pede o
layout de lâmina até 1023px. O `lg` do Tailwind 4 é exatamente `64rem` = 1024px,
então o requisito cai no breakpoint padrão sem custom variant. Mobile-first
(Princípio IV): as classes base descrevem a lâmina, `lg:` promove ao banner.

---

## R10 — Imagem do banner

**Decision**: Servir `public/login-bg.png` por `next/image` com `fill`,
`priority` e `sizes="(min-width: 1024px) 52vw, 100vw"`. Substituir o
`bg-[url(...)]` atual.

**Rationale**: O arquivo tem **1.9MB**. A página de login é a primeira coisa
que um visitante não autenticado carrega; o Princípio VI exige `next/image`
com dimensionamento adequado e proíbe crescer o peso sem justificativa. Com
`fill` + `sizes`, o Next serve AVIF/WebP redimensionado por viewport, o que
derruba o payload em uma ordem de grandeza sem tocar no arquivo-fonte.
`priority` evita que o LCP fique atrás do JS.

O `object-position` do design é `45.561% 50%` — preservar via
`className="object-cover object-[45.561%_50%]"`.

**Edge case do spec** ("imagem do banner indisponível"): o texto do banner fica
sobre um gradiente escuro **próprio**, um elemento irmão da imagem, não sobre a
foto. Se a imagem falhar, o gradiente sobrevive e o contraste se mantém.

---

## R11 — Estrutura de rotas

**Decision**:

- `packages/web/src/app/(auth)/layout.tsx` — shell compartilhado: banner,
  painel branco e rodapé. Server Component.
- `packages/web/src/app/(auth)/login/page.tsx` — reescrita.
- `packages/web/src/app/(auth)/signup/page.tsx` — nova.
- `packages/web/src/app/(auth)/_components/` — UI colocada das duas telas.
- `packages/web/src/proxy.ts` — `publicRoutes` passa a
  `new Set(['/login', '/signup'])`.

**Rationale**: As duas telas compartilham banner, gradiente, lâmina e rodapé
por completo — só mudam o título, o formulário e o rótulo do Google. Um
`layout.tsx` no grupo `(auth)` é o mecanismo do App Router para isso e evita
duplicar a estrutura responsiva em dois arquivos (o ponto mais caro de manter
em sincronia). O redirecionamento de usuário autenticado (FR-015) já é feito
pelo `proxy.ts` para qualquer rota pública — basta registrar `/signup`.

O slug `/signup` segue a convenção do produto (`/login`, `/profile`,
`/onboarding` — slugs em inglês, interface em pt-BR), conforme registrado nas
Assumptions do spec.

---

## R12 — Contratos de API e Orval

**Decision**: **Nenhuma regeneração do Orval é necessária.**

**Rationale**: Todo o tráfego novo desta feature vai para `/api/auth/*`, que no
`packages/backend/src/index.ts` é registrado com `schema: { hide: true }` e,
portanto, fica fora do `/openapi.json` que o Orval consome. O contrato do
better-auth é tipado no cliente pelo próprio `createAuthClient`. Nenhuma rota
REST do produto muda de forma, então a regra de "regenerar após mudar
contrato" não é acionada. As mudanças no backend são de **configuração**
(`lib/auth.ts`) e de **repasse de header** (`index.ts`), não de contrato.

---

## R13 — Configuração do `useForm` que os requisitos exigem

**Decision**: Os dois hooks chamam `useForm` com:

```ts
useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { /* string vazia em cada campo; rememberMe: false */ },
  mode: 'onSubmit',
  reValidateMode: 'onChange',
})
```

**Rationale**, requisito a requisito:

- **`mode: 'onSubmit'` + `reValidateMode: 'onChange'`** — o erro inline só
  aparece depois da primeira tentativa de envio (FR-005 fala em bloquear o
  envio, não em criticar enquanto se digita) e some assim que o campo é
  corrigido. É o default do RHF e o comportamento menos ruidoso.
- **`defaultValues` explícitos** — sem eles os campos nascem `undefined` e o
  React reclama de input não controlado virando controlado. `rememberMe`
  começa em `false`, que é o estado desmarcado do FR-003.
- **`formState.isSubmitting`** alimenta `Button loading={...}` diretamente. O
  RHF mantém essa flag `true` enquanto a promise do `onSubmit` não resolve, e o
  `handleSubmit` **ignora reenvios enquanto está submetendo** — o FR-016 sai de
  graça, sem guarda manual.
- **`Controller` para o `Checkbox`** — o `Checkbox` expõe
  `checked`/`onCheckedChange`, não o par `value`/`onChange` que o `register`
  espera. A ligação oficial, copiada do exemplo `form-rhf-checkbox`, é:

  ```tsx
  <Field orientation="horizontal">
    <Checkbox
      id="signin-remember"
      name={field.name}
      checked={field.value}
      onCheckedChange={field.onChange}
    />
    <FieldLabel htmlFor="signin-remember" className="font-normal">
      Manter conectado
    </FieldLabel>
  </Field>
  ```

  O `className="font-normal"` no `FieldLabel` é o que os docs usam em rótulo de
  checkbox, para não herdar o peso de rótulo de campo.
- **Erro de servidor não entra no `formState`** — vai para `toast()` via o
  helper de R6. Usar `setError` colocaria a mensagem sob um campo, o que
  contradiz a clarificação de 2026-07-27 (servidor ⇒ toast) e, no caso de
  credencial inválida, revelaria qual campo está errado, ferindo o SC-007.

**Preservação de valores na troca de layout** (história 4, cenário 4): a troca
em 1024px é feita só com classes `lg:` do Tailwind — o componente do formulário
**não desmonta**, então o estado do RHF sobrevive naturalmente. Isso vira uma
restrição de implementação: **não** renderizar dois formulários condicionalmente
(`isDesktop ? <FormA/> : <FormB/>`), porque aí a troca desmontaria um e perderia
o que foi digitado.
