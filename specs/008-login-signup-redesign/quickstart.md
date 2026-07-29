# Quickstart — Validação manual: Login e Criar Conta com Banner

**Feature**: `008-login-signup-redesign` | **Date**: 2026-07-28

Verificação é **100% manual** (Constituição, Princípio I — nenhum teste
automatizado). Este guia é o roteiro de aceite: cada cenário abaixo mapeia
para requisitos e critérios de sucesso do `spec.md`.

---

## Pré-requisitos

```bash
# dependências novas desta feature — no workspace web, nunca na raiz
npm install react-hook-form@7.83.0 @hookform/resolvers@5.5.7 -w packages/web

# raiz do monorepo
npm install

# backend
cd packages/backend
docker compose up -d          # Postgres
npx prisma migrate dev        # nenhuma migration nova nesta feature
npm run dev                   # :3333 — docs em /docs

# web (outro terminal)
cd packages/web
npm run dev                   # :3000
```

Ambos precisam de `.env` (`cp .env.example .env`).

**Nada de `npx orval`** — esta feature não altera contrato REST (contracts/,
research R12).

### Conta de teste com senha

`/login` só permitia Google, então provavelmente não existe usuário de
e-mail/senha no banco local. Crie um pela própria tela nova (Cenário B) ou
pela aba **Auth** do Scalar em `http://localhost:3333/docs`.

---

## Cenário A — Entrar com e-mail e senha (US1 · FR-001, FR-002, FR-016)

1. Abra `http://localhost:3000/login` deslogado.
2. Confirme: campos **E-mail** e **Senha** com rótulos, checkbox **Manter
   conectado**, texto **Esqueci minha senha**, botão **Entrar**, divisor
   **ou**, botão **Fazer login com o Google**, link **Criar conta**.
3. Preencha credenciais válidas e envie.
4. **Esperado**: botão entra em carregando, a sessão é criada e você chega à
   home (ou a `/onboarding`, se a conta não tiver plano ativo).
5. Durante o envio, clique no botão de novo → **não** dispara segunda
   tentativa.

---

## Cenário B — Criar conta (US2 · FR-007 a FR-010)

1. Abra `http://localhost:3000/signup`.
2. Preencha nome, um e-mail inédito e senha com **8+** caracteres. Envie.
3. **Esperado**: conta criada, sessão iniciada, chegada ao **`/onboarding`**.
4. Deslogue e repita com o **mesmo e-mail**.
5. **Esperado**: toast "Esse e-mail já está em uso...". Nenhuma conta
   duplicada.

---

## Cenário C — Colisão Google × senha (SC-009 · clarificação 2026-07-28)

1. Entre uma vez com o Google e anote o e-mail da conta. Deslogue.
2. Em `/signup`, tente criar conta com **esse mesmo e-mail**.
3. **Esperado**: mesma mensagem de "e-mail já em uso" do Cenário B — sem
   citar o Google, sem vincular senha.
4. Em `/login`, tente entrar com esse e-mail e qualquer senha.
5. **Esperado**: erro **genérico** "E-mail ou senha incorretos." — indistinguível
   do erro de senha errada numa conta comum.

---

## Cenário D — Erros nos dois canais (SC-003 · FR-005, FR-006, FR-023)

**Inline, sob o campo** (bloqueia o envio, nem chega ao servidor):

| Ação | Esperado |
|---|---|
| Enviar `/login` vazio | erro sob e-mail e sob senha |
| E-mail `abc` | "Informe um e-mail válido." sob o campo |
| Senha de 5 caracteres em `/signup` | "A senha precisa ter pelo menos 8 caracteres." |
| Nome vazio em `/signup` | erro sob o campo nome |

**Momento da validação** (`mode: 'onSubmit'`, `reValidateMode: 'onChange'` —
research R13): nada é criticado enquanto o visitante digita pela primeira vez;
o erro só aparece ao tentar enviar. Depois disso, corrija o campo e confirme
que a mensagem **some sozinha ao digitar**, sem precisar reenviar.

**Toast** (resposta do servidor): credencial inválida, e-mail já cadastrado,
falha de rede (desligue o backend e envie).

Em todos: o formulário volta editável, com os valores digitados preservados,
sem recarregar a página. Nenhum erro de servidor deve aparecer inline sob um
campo — servidor é sempre toast.

Com leitor de tela (ou inspecionando o DOM), confirme que o erro inline está
ligado ao input por `aria-describedby` e que o campo tem `aria-invalid`.

---

## Cenário E — "Manter conectado" (FR-003 · SC-001)

1. Entre com o checkbox **desmarcado**. Feche **todas** as janelas do
   navegador e reabra `http://localhost:3000`.
2. **Esperado**: redirecionado para `/login` — a sessão morreu com o navegador.
3. Entre com o checkbox **marcado**. Feche e reabra o navegador.
4. **Esperado**: continua autenticado.

Inspecione em DevTools → Application → Cookies →
`training-manager.session_token`: desmarcado ⇒ `Expires: Session`;
marcado ⇒ data ~30 dias à frente.

---

## Cenário F — Limite de tentativas (FR-024, FR-025 · SC-008)

1. Em `/login`, erre a senha da mesma conta **11 vezes seguidas** (limite
   padrão: `AUTH_RATE_LIMIT_MAX=10` por `AUTH_RATE_LIMIT_WINDOW=300` segundos —
   baixe os dois no `.env` se quiser um ciclo de teste mais curto).
2. **Esperado**: a partir da 11ª, toast **"Muitas tentativas. Aguarde alguns
   minutos e tente de novo."** — sem contagem regressiva, sem tempo numérico,
   sem revelar se o e-mail existe.
3. O formulário continua editável.
4. Confirme no Network que a resposta é **429**.

> Se o 429 não aparecer, verifique `rateLimit.enabled: true` em
> `lib/auth.ts` (o default é `false` fora de produção) **e** o repasse de
> `x-forwarded-for` no handler de `/api/auth/*` (research R4).

---

## Cenário G — Navegação entre as telas (US3 · FR-014, FR-015)

1. De `/login`, acione **Criar conta** → chega em `/signup`.
2. De `/signup`, acione **Entrar** → volta a `/login`.
3. Sem console errors nas duas transições.
4. **Autenticado**, acesse `/login` e `/signup` na barra de endereço →
   redirecionado para a área autenticada nas duas (`proxy.ts`).

---

## Cenário H — Layout responsivo (US4 · FR-017 a FR-020 · SC-004, SC-005)

Valide com o **chrome-devtools MCP** — obrigatório antes de dar a tarefa por
concluída (regra de UI validation do `CLAUDE.md`).

Larguras: **320 · 402 · 768 · 1023 · 1024 · 1280**, nas duas rotas.

| Largura | Esperado |
|---|---|
| ≤ 1023px | foto no topo com a logo centralizada; formulário em lâmina branca de cantos superiores arredondados |
| ≥ 1024px | banner fotográfico à esquerda (logo no topo, título + subtítulo sobre gradiente escuro) e formulário em painel branco à direita |

Em todas: sem rolagem horizontal, sem texto cortado, sem sobreposição, sem
erro no console, sem requisição falhando.

Compare 402px e 1280px com as variantes `1c`/`1a` (login) e `2b`/`2a`
(cadastro) do arquivo de design — layout, hierarquia tipográfica, cores e
espaçamento.

**Preservação de estado**: digite nos campos em 1280px, redimensione para
900px e de volta → os valores continuam lá.

**Alvos de toque**: inputs, checkbox e botões com ao menos 44×44px.

**Rodapé**: copyright da FIT.AI e crédito com link para o LinkedIn
(`target="_blank"`, `rel="noopener noreferrer"`) presentes nas duas telas e
nos dois layouts.

---

## Cenário I — Teclado e leitores de tela (FR-022, FR-023 · SC-006)

1. Só com `Tab`, percorra `/login`: e-mail → senha → checkbox → **Entrar** →
   botão do Google → link **Criar conta**.
2. **Esperado**: foco sempre visível; **"Esqueci minha senha" NÃO recebe
   foco** (FR-004 — presente, sem navegação ativa).
3. Em `/signup`, idem; **"Termos de uso" e "Política de privacidade" NÃO
   recebem foco** (FR-011).
4. Conclua login e cadastro inteiros usando só o teclado (`Enter` envia).
5. Confirme que um gerenciador de senhas reconhece os campos —
   `autocomplete="email"`, `current-password` no login e `new-password` no
   cadastro.

---

## Checklist final

- [ ] A–I passam nas duas rotas
- [ ] Toda a copy em pt-BR (FR-021)
- [ ] Nenhuma mensagem distingue "e-mail não cadastrado" de "senha incorreta" (SC-007)
- [ ] `npm run lint` limpo em `packages/web` e `packages/backend`
- [ ] `npm run build` passa nos dois pacotes
- [ ] Nenhum teste automatizado foi criado (Princípio I)
