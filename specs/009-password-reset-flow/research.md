# Phase 0 — Research: Fluxo de Recuperar Senha

**Feature**: `009-password-reset-flow` | **Date**: 2026-07-30

Todas as incógnitas do Technical Context foram resolvidas. As decisões abaixo
foram tiradas do código real do `better-auth@1.5.1` instalado no repositório
(`node_modules/better-auth/dist/api/routes/password.mjs`), da documentação
oficial via Context7 e da skill `resend`.

---

## D1 — Provedor de e-mail transacional

**Decision**: `resend` (SDK Node oficial, `>= 6.14.0`) como único provedor de
envio real, adicionado a `packages/backend`.

**Rationale**: Escolha explícita do autor no comando. O SDK é leve, sem árvore
transitiva pesada, e cobre exatamente o caso de uso (transacional, um
destinatário por envio). O backend já é Node/Fastify, então a chamada acontece
server-side — a API do Resend não suporta CORS por design, o que descarta
qualquer tentativa de enviar a partir do navegador.

**Alternatives considered**:
- **Nodemailer + SMTP**: exigiria administrar credenciais SMTP, filas e
  reputação por conta própria; sem painel de entregabilidade.
- **AWS SES**: mais barato em escala alta, porém traz o SDK da AWS (árvore
  transitiva grande) e um processo de saída do sandbox — desproporcional para
  duas mensagens transacionais.

---

## D2 — Modo de desenvolvimento local sem entrega real

**Decision**: variável `EMAIL_PROVIDER` com união discriminada em
`src/config/env.ts`, valores `console` (padrão em dev) e `resend`. Em `console`,
o assunto, o destinatário e o HTML gerado são escritos no log; nenhuma chamada
de rede acontece e `RESEND_API_KEY` não é exigida.

**Rationale**: Atende a Assumption da spec ("modo local que permita inspecionar
a mensagem sem depender de entrega real") e **espelha exatamente o padrão que o
projeto já usa para `LLM_PROVIDER` (`ollama` | `google`)** em `config/env.ts` e
`lib/ai.ts`. Consistência com o que existe, sem inventar um mecanismo novo.

**Alternatives considered**:
- **Sempre enviar via Resend usando `delivered@resend.dev`**: exigiria chave de
  API para rodar o projeto localmente e não permite ler o HTML gerado.
- **Mailpit/MailHog em Docker**: mais um serviço no `docker-compose` e mais uma
  dependência de infraestrutura para inspecionar duas mensagens.

---

## D3 — Templates de e-mail: HTML em TypeScript, não React Email

**Decision**: funções TypeScript em `packages/backend/src/emails/` que recebem os
dados e devolvem `{ subject, html, text }`. O HTML é o do arquivo de design,
adaptado com interpolação — tabelas, estilos inline, sem CSS externo.

**Rationale**: O design **já entrega o HTML final** (`Email - Redefinir
Senha.html`), com a estrutura de tabelas e estilos inline que os clientes de
e-mail exigem. Reescrevê-lo em componentes React significaria adicionar `react`,
`react-dom` e `@react-email/components` a um backend Fastify que hoje não tem
React algum — violação direta do Princípio V (Minimal Dependencies) para
produzir o mesmo HTML que já temos.

**Alternatives considered**:
- **React Email**: excelente quando os templates são muitos e evoluem; aqui são
  dois, estáticos, e o HTML já existe pronto. Custo de dependência não se paga.
- **Templates no painel do Resend** (`resend.emails.send({ template })`): tiraria
  o conteúdo do controle de versão e do fluxo de review, e criaria um
  acoplamento com o painel para qualquer mudança de texto.

---

## D4 — Como o better-auth conduz o fluxo (leitura do código instalado)

**Decision**: usar `emailAndPassword.sendResetPassword`, `onPasswordReset`,
`revokeSessionsOnPasswordReset: true` e `resetPasswordTokenExpiresIn: 3600`. No
cliente, `authClient.requestPasswordReset({ email, redirectTo })` e
`authClient.resetPassword({ newPassword, token })`.

**Rationale / achados que mudam o desenho**:

1. **`requestPasswordReset` já é imune a enumeração.** Quando o e-mail não tem
   conta, o endpoint gera um id descartável, faz uma consulta falsa de
   verificação (mitigação de timing attack) e devolve a **mesma** resposta
   genérica. Atende FR-006 e SC-004 sem nenhum código nosso.

2. **O link do e-mail já valida o token antes de a tela abrir.** O `url` passado
   para `sendResetPassword` é
   `${BETTER_AUTH_URL}/api/auth/reset-password/<token>?callbackURL=<redirectTo>`.
   Esse GET consulta a verificação e redireciona para
   `callbackURL?token=<token>` **ou** `callbackURL?error=INVALID_TOKEN`.
   → **FR-035 (validar ao abrir) sai de graça**: a página `/reset-password` só
   precisa ler os search params. Sem round-trip extra, sem endpoint novo.

3. **`resetPassword` revalida o token no envio** (`findVerificationValue` +
   checagem de `expiresAt`) e apaga a verificação após o uso → FR-020 e FR-036.

4. **`revokeSessionsOnPasswordReset: true` chama `deleteSessions(userId)`**, que
   apaga **todas** as sessões, não apenas as outras → FR-022. Como o
   `resetPassword` não cria sessão nova, o usuário cai no login exatamente como
   a spec pede.

5. **`onPasswordReset({ user })` roda depois da troca bem-sucedida** → ponto de
   engate do e-mail de aviso (FR-032) e do registro de conclusão (FR-037).

6. **O prazo padrão do token já é 3600s = 1 hora**, idêntico ao que o template de
   e-mail promete (FR-013). Será declarado explicitamente mesmo assim, para que
   a regra não dependa de um default da biblioteca.

**Alternatives considered**: implementar tokens, expiração e revogação de sessão
à mão em use-cases próprios — rejeitado: reescreveria, com mais risco, o que a
biblioteca de autenticação já faz e mantém.

---

## D5 — Contas só com Google: divergência do padrão do better-auth

**Decision**: bloquear o envio dentro de `sendResetPassword`, consultando se o
usuário possui uma conta com `provider_id = 'credential'`. Sem credencial de
senha, a função retorna sem enviar — e a resposta HTTP continua sendo a mesma
mensagem genérica, porque quem a produz é o endpoint, não o callback.

**Rationale**: ⚠️ Achado importante — **o comportamento padrão do better-auth é o
oposto do que a spec decidiu**:

- `requestPasswordReset` busca o usuário com `includeAccounts: true` mas **nunca
  usa** as contas: envia o link para qualquer usuário existente, inclusive os que
  só entram com Google.
- `resetPassword` vai além: se não encontra conta `credential`, ele **cria uma**
  (`internalAdapter.createAccount({ providerId: 'credential', ... })`).

Ou seja, sem intervenção, o fluxo viraria um caminho de "defina uma senha para
sua conta Google" — exatamente a opção que o autor **recusou** na clarificação.
O gancho em `sendResetPassword` é o ponto de corte correto: é o único lugar por
onde o token chega ao usuário.

**Risco residual aceito**: o endpoint `resetPassword` continua capaz de criar
credencial se receber um token válido de usuário sem senha. Como nenhum token
desses é emitido, o caminho é inalcançável na prática. Documentado aqui para que
uma futura mudança em `sendResetPassword` não reabra a brecha em silêncio.

**Alternatives considered**:
- **Aceitar o padrão** (permitir definir senha para conta Google): contraria a
  clarificação registrada na spec.
- **Interceptar em `resetPassword` via hook**: tarde demais — o e-mail já teria
  sido enviado, revelando que o endereço tem conta.

---

## D6 — Limite de solicitações nas duas dimensões (FR-009)

**Decision**: duas camadas.

- **Por origem**: regra `'/request-password-reset'` em
  `auth.rateLimit.customRules`, alimentada por novas variáveis de ambiente. O
  mecanismo já está ligado (`storage: 'memory'`) e o `x-forwarded-for` já é
  preenchido no adaptador Fastify em `src/index.ts`.
- **Por endereço**: contador próprio em `src/lib/password-reset-rate-limit.ts`,
  chaveado pelo e-mail normalizado (minúsculas, sem espaços), engatado num
  `hooks.before` do better-auth que só age no path `/request-password-reset`.
  Ao estourar, responde `429` com o mesmo formato de erro do limite nativo.

**Rationale**: o `rateLimit` do better-auth só sabe agrupar por IP; a proteção
contra bombardear a caixa de uma pessoa a partir de vários IPs precisa de um
contador por e-mail. Janela deslizante em memória (`Map`), coerente com o
`storage: 'memory'` já adotado — nenhuma dependência nova, nenhuma tabela nova.

**⚠️ Ordem obrigatória**: o contador por e-mail deve ser consultado **e
incrementado sempre**, existindo conta ou não. Incrementar só quando o e-mail
existe transformaria o próprio limite num oráculo de enumeração (respostas
rápidas para e-mails inexistentes, `429` só para os reais), destruindo SC-004.

**Alternatives considered**:
- **Só o limite por origem**: recusado na clarificação — não impede bombardeio.
- **Contador em Postgres**: durabilidade desnecessária para uma janela de
  minutos, com custo de escrita a cada tentativa.
- **Redis**: dependência de infraestrutura nova para um contador efêmero.

---

## D7 — Logo dentro do e-mail

**Decision**: usar um **PNG** (170×78 para telas 2x) hospedado publicamente e
referenciado por `EMAIL_LOGO_URL`, com `alt="FIT.AI"`.

**Rationale**: o design usa `logo.svg`, mas **Gmail, Outlook e Yahoo removem SVG
em e-mail** — a marca simplesmente sumiria para a maioria dos destinatários. PNG
com `alt` preserva a identidade e mantém a mensagem legível quando o cliente
bloqueia imagens (FR-016). A URL precisa ser pública: o cliente de e-mail busca a
imagem pelo proxy dele, sem acesso à rede local, então `CLIENT_ORIGIN` só serviria
em produção — daí a variável dedicada.

**Alternatives considered**:
- **SVG do design**: quebra nos principais clientes.
- **Imagem embutida em base64/CID**: engorda a mensagem e é tratada como anexo
  por vários clientes, prejudicando a entregabilidade.
- **Só o texto "FIT.AI"**: mais robusto, porém abandona a identidade visual que o
  design especifica no cabeçalho azul.

---

## D8 — Idempotência dos envios

**Decision**: passar `idempotencyKey` em toda chamada ao Resend, no formato da
skill: `password-reset/<userId>-<token-prefix>` e
`password-changed/<userId>-<timestamp>`.

**Rationale**: recomendação explícita da skill `resend` (chave válida por 24h;
mesma chave + mesmo payload não reenvia). Protege contra duplicatas se o
processo reprocessar a requisição. O prefixo do token entra na chave porque
solicitações legítimas sucessivas geram tokens diferentes e **devem** produzir
e-mails diferentes.

**Gotcha registrado**: o SDK Node do Resend **não lança exceção** — devolve
`{ data, error }`. O código precisa checar `error` explicitamente; um
`try/catch` em volta não captura falha de API. Isso convive com a regra
constitucional de `try/catch`: o `try/catch` continua obrigatório para erros de
rede/runtime, e a checagem de `error` é uma guard clause adicional logo depois.

---

## D9 — Nenhuma regeneração do Orval, nenhuma migração de banco

**Decision**: esta feature **não** adiciona rota REST em `/api` nem altera o
schema Prisma.

**Rationale**:
- Todo o fluxo usa endpoints que o better-auth já expõe sob `/api/auth/*`, rota
  registrada com `schema: { hide: true }` e consumida no front pelo `authClient`,
  não pelo cliente gerado. Logo, **`npx orval` não precisa rodar** e nenhum DTO
  ou schema novo entra em `dtos/` ou `schemas/`.
- Os tokens de redefinição são gravados no model **`Verification`, que já existe**
  no `schema.prisma` (identificador `reset-password:<token>`). **Nenhuma migração.**

Isso mantém o change set enxuto e evita o ruído de um `orval` regenerado sem
diferença real.

---

## D10 — Logger compartilhado para os eventos de segurança (FR-037 a FR-039)

**Decision**: extrair a instância do pino para `src/lib/logger.ts`, passá-la ao
Fastify via `loggerInstance` em `buildApp()` e reaproveitá-la nos use-cases de
e-mail e no limitador. Promover `pino` a dependência direta de
`packages/backend`.

**Rationale**: `sendResetPassword` e `onPasswordReset` rodam dentro do
better-auth, fora de qualquer handler Fastify — não há `request.log` ali. Sem uma
instância compartilhada, os eventos de segurança cairiam em `console.log`, sem
estrutura nem nível.

`pino` **já está na árvore** como dependência transitiva do Fastify 5; promovê-lo
a dependência direta não instala nada novo, apenas torna o import explícito e
versionado (Princípio V pede justificar, não proibir).

**Alternatives considered**:
- **Passar `app.log` por injeção até o auth**: `lib/auth.ts` é importado por
  `index.ts` antes de o app existir — criaria dependência circular ou um setter
  mutável global.
- **`console.error`**: sem níveis nem campos estruturados; inviabiliza SC-013.

**Campos proibidos nos logs** (FR-038): o token, a URL completa do link e a
senha. Registrar apenas `userId`, o evento e o instante. O e-mail entra somente
nos eventos em que já é conhecido pelo solicitante.
