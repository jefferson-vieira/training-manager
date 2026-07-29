# Implementation Plan: Login e Criar Conta com Banner

**Branch**: `008-login-signup-redesign` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-login-signup-redesign/spec.md`

## Summary

Substituir a tela de login atual (mobile-only, apenas Google) pelas duas telas
do arquivo de design `Login com banner.dc.html`: **login** e **criar conta**,
cada uma com formulário de e-mail e senha, o Google como opção secundária,
banner fotográfico lateral a partir de 1024px e lâmina branca abaixo disso.

A abordagem é **configuração antes de código**. O backend já tem
`emailAndPassword.enabled: true`; as três exigências novas do servidor —
sessão de 30 dias, limite de tentativas e limite *por origem* — são atendidas
por duas opções do `betterAuth()` e um repasse de header no handler
`/api/auth/*`, sem nova rota, sem migration e sem regenerar o Orval. O peso da
feature está no frontend: um `layout.tsx` no grupo `(auth)` carrega toda a
estrutura responsiva compartilhada, e cada página contribui só o seu
formulário. Os formulários seguem a **integração oficial do shadcn com
react-hook-form** ([docs](https://ui.shadcn.com/docs/forms/react-hook-form)) —
`Controller` + a família `Field`, com `zodResolver` sobre os schemas Zod que já
são vocabulário do projeto, tudo encapsulado em hooks para manter a lógica fora
dos componentes.

Detalhamento das decisões em [research.md](./research.md); superfície de
autenticação em [contracts/auth-client-contract.md](./contracts/auth-client-contract.md);
roteiro de aceite manual em [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Fastify 5 + Prisma 7 + better-auth 1.5.1 (backend);
Next.js 16 + React 19 + Tailwind 4 + shadcn sobre `@base-ui/react` + Zod 4 (web).
**Duas dependências novas em `packages/web`**: `react-hook-form@7.83.0` e
`@hookform/resolvers@5.5.7` — justificadas em Complexity Tracking e research R1.

**Storage**: PostgreSQL via Prisma. **Nenhuma migration nesta feature** — `User`,
`Account` e `Session` já existem; o estado do rate limit fica em memória.

**Testing**: **NONE** — Constitution Principle I forbids all automated tests.
Manual verification only, via [quickstart.md](./quickstart.md) + chrome-devtools MCP.

**Target Platform**: Web responsivo (320px → 1280px+); API Node em :3333

**Project Type**: npm workspaces monorepo — `packages/backend` + `packages/web`

**Performance Goals**: `login-bg.png` (1.9MB) passa a ser servido por
`next/image` com `fill` + `sizes` + `priority`, cortando o payload da primeira
tela que um visitante carrega. Backend inalterado (só configuração).

**Constraints**: sem `height` fixo (usar `min-h-*`); alvos de toque ≥ 44×44px;
troca de layout exatamente em 1024px (`lg:`) **feita só com classes CSS**, para
que o formulário não desmonte e o estado do react-hook-form sobreviva ao resize
(research R13); toda a copy em pt-BR; erros de autenticação nunca revelam se o
e-mail existe.

**Scale/Scope**: 2 rotas públicas (1 reescrita, 1 nova), 1 layout compartilhado,
5 componentes colocados, 2 hooks, 2 helpers, 3 primitivos shadcn adicionados,
2 dependências npm, 2 arquivos de backend tocados (configuração).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliado antes da Fase 0 e **reavaliado após a Fase 1** — sem violações nas
duas passagens.

- [x] **No Automated Testing**: nenhuma tarefa, infra ou framework de teste. A
      verificação é o `quickstart.md`, integralmente manual.
- [x] **Code Quality**: zero lógica em componente ou route handler. O `useForm`,
      o resolver, a chamada ao better-auth, a tradução de erro e o redirect
      ficam em `src/hooks/use-sign-in-form.ts` e `use-sign-up-form.ts`, que
      devolvem `{ form, onSubmit }`; regras de domínio (schemas, copy de erro)
      em `src/helpers/`; o `.tsx` só compõe `Controller` + `Field`. Backend só
      muda configuração em `lib/auth.ts` — nenhum use-case novo, porque não há
      lógica de negócio nova: o better-auth já é o mecanismo.
- [x] **UX Consistency**: `Button`, `Input`, `Checkbox`, `Label` e a família
      `Field` (`FieldGroup`, `FieldLabel`, `FieldError`, `FieldDescription`,
      `FieldSeparator`) do design system, na composição que os docs oficiais
      prescrevem; `toast()` do `sonner` já montado no root layout; só tokens
      semânticos (`primary`, `muted-foreground`, `border`, `destructive`),
      nenhuma cor literal; `font-heading` nos títulos como manda a convenção.
      Nenhum divisor, rótulo ou mensagem inline estilizado à mão — a regra de UI
      do projeto manda preferir o design system a estilizar tags nativas.
- [x] **Responsive Design**: mobile-first, `lg:` (1024px) promove ao banner;
      validação obrigatória em 6 larguras; alvos ≥ 44px via `Button size="xl"`
      e `min-h-11` nos campos.
- [x] **Minimal Dependencies**: dois pacotes novos, **justificados na tabela de
      Complexity Tracking** com problema, alternativa e custo, como o Princípio
      V exige — ele pede justificativa, não proibição. Ambos vão em
      `packages/web`, não na raiz. `@shadcn/form` é deliberadamente **não**
      adicionado para não trazer `radix-ui` junto do Base UI (research R7);
      `field`, `checkbox` e `label` continuam sendo código-fonte vendorizado,
      não dependências.
- [x] **Performance**: `next/image` com `fill`/`sizes`/`priority` no banner;
      layout e páginas permanecem Server Components — só os formulários e o
      botão do Google são `"use client"`, então os ~10 kB do react-hook-form
      ficam nas duas rotas públicas e fora do bundle da área autenticada. O RHF
      mantém os campos não controlados, evitando um re-render por tecla. Sem
      N+1 (nenhuma query nova).
- [x] **Package Rules**: web em `packages/web`, backend em `packages/backend`;
      contextos e hooks nos diretórios que a constituição fixa; proteção de
      rota via `proxy.ts`. **Sem regeneração do Orval** — justificado em
      research R12 (as rotas `/api/auth/*` são `hide: true` e ficam fora do
      `/openapi.json`).

## Project Structure

### Documentation (this feature)

```text
specs/008-login-signup-redesign/
├── plan.md                            # Este arquivo
├── spec.md
├── research.md                        # Fase 0 — 13 decisões
├── data-model.md                      # Fase 1
├── quickstart.md                      # Fase 1 — roteiro de aceite manual
├── contracts/
│   └── auth-client-contract.md        # Fase 1
├── checklists/
│   └── requirements.md
└── tasks.md                           # Fase 2 — criado por /speckit-tasks
```

### Source Code (repository root)

```text
packages/
├── backend/src/
│   ├── lib/auth.ts                    # M  session.expiresIn 30d + rateLimit
│   └── index.ts                       # M  repassa x-forwarded-for (research R4)
└── web/src/
    ├── app/(auth)/
    │   ├── layout.tsx                 # +  shell: banner + painel + rodapé
    │   ├── _components/
    │   │   ├── auth-banner.tsx        # +  foto, gradiente, logo, título
    │   │   ├── auth-footer.tsx        # +  copyright + crédito LinkedIn
    │   │   └── google-auth-button.tsx # +  generaliza sign-in-with-google
    │   ├── login/
    │   │   ├── page.tsx               # M  reescrita
    │   │   ├── sign-in-form.tsx       # +  "use client"
    │   │   └── sign-in-with-google.tsx# -  absorvido por google-auth-button
    │   └── signup/
    │       ├── page.tsx               # +
    │       └── sign-up-form.tsx       # +  "use client"
    ├── components/ui/
    │   ├── field.tsx                  # +  via shadcn CLI — inclui FieldSeparator
    │   ├── checkbox.tsx               # +  via shadcn CLI
    │   ├── label.tsx                  # +  via shadcn CLI
    │   └── input.tsx                  # M  h-9 → min-h-9 (research R8)
    ├── helpers/
    │   ├── auth-schemas.ts            # +  schemas Zod + copy inline
    │   └── auth-error-message.ts      # +  código/status → copy pt-BR
    ├── hooks/
    │   ├── use-sign-in-form.ts        # +
    │   └── use-sign-up-form.ts        # +
    └── proxy.ts                       # M  publicRoutes += '/signup'
```

**Structure Decision**: as duas telas são idênticas fora do formulário — banner,
gradiente, lâmina, painel e rodapé são os mesmos. Concentrar isso num
`(auth)/layout.tsx` é o mecanismo nativo do App Router e evita manter duas
cópias da estrutura responsiva em sincronia, que é o ponto mais caro e mais
frágil da feature. Cada `page.tsx` fica sendo só título, formulário e o
rodapé de navegação cruzada. Formulários e botão do Google são os únicos
`"use client"`; o resto renderiza no servidor.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `react-hook-form@7.83.0` + `@hookform/resolvers@5.5.7` em `packages/web` (~10 kB gzip somados) | Estado por campo, `touched`/`dirty`, revalidação após o primeiro erro, foco no primeiro campo inválido e trava de reenvio durante o submit — em dois formulários | Hooks próprios com Zod puro (a decisão anterior) fariam o mesmo sem dependência, mas ao custo de ~80 linhas de orquestração de estado duplicadas entre os dois formulários, e com re-render a cada tecla por serem campos controlados. Decisão explícita do autor da feature; detalhamento em research R1 |

Compatibilidade e custo verificados antes de aceitar: `@hookform/resolvers@5`
declara peer `zod ^3.25 || ^4`, e o projeto já tem `zod@4.3.6` — o
`zodResolver` reconhece Zod 4 em runtime, sem pacote extra e sem upgrade.
`react-hook-form` não tem dependências de runtime.

Uma escolha permanece deliberadamente *mais simples* que a alternativa óbvia:

| Escolha | Alternativa mais pesada rejeitada | Onde |
|---|---|---|
| Rate limit em memória | `storage: 'database'` — exigiria modelo Prisma + migration num app de instância única | R3 |
| `Controller` + `Field` | `@shadcn/form` — traria `radix-ui` para um projeto Base UI | R7 |
| `FieldSeparator` do design system | um `auth-divider.tsx` próprio — seria reimplementar um componente que já vem no `field` | R7 |

## Riscos conhecidos

| Risco | Mitigação |
|---|---|
| O CLI do shadcn pode emitir `checkbox`/`label` na variante **Radix** em vez de Base UI, arrastando `radix-ui` | Conferir os imports logo após o `add` e portar para `@base-ui/react`; não instalar `radix-ui` nem `@shadcn/form` (research R7) |
| Renderizar formulários diferentes por breakpoint desmontaria o componente e perderia o estado do RHF no resize | A troca em 1024px é só `lg:` no CSS, com **uma** árvore de formulário; cenário 4 da história 4 verifica isso explicitamente (research R13) |
| `Checkbox` do Base UI expõe `checked`/`onCheckedChange`, incompatível com `register` | Envolver em `Controller`, como o resto dos campos (research R13) |
| `rateLimit` fica inativo em dev por padrão, e o IP não atravessa o handler catch-all | `enabled: true` explícito **e** repasse de `x-forwarded-for`; Cenário F do quickstart falha ruidosamente se algum dos dois faltar (R3, R4) |
| Trocar `h-9` por `min-h-9` no `Input` base afeta outras páginas | Para input de linha única o render é idêntico; a troca ainda corrige uma violação existente da regra de altura fixa (R8) |
