# Phase 1 — Quickstart: verificação manual do fluxo de recuperar senha

**Feature**: `009-password-reset-flow` | **Date**: 2026-07-30

> A constituição proíbe testes automatizados (Princípio I). Este é o roteiro de
> verificação da feature — cada seção mapeia para requisitos e critérios da spec.

---

## 0. Pré-requisitos

```bash
# raiz do repo
nvm use                 # Node v24.14.0
npm install
docker compose up -d    # Postgres
```

`packages/backend/.env` — variáveis novas desta feature:

```bash
EMAIL_PROVIDER=console                    # console | resend
EMAIL_FROM="FIT.AI <nao-responda@fit.ai>" # exigido quando EMAIL_PROVIDER=resend
EMAIL_SUPPORT_URL=https://fit.ai/suporte
# RESEND_API_KEY=re_xxx                   # exigido apenas quando EMAIL_PROVIDER=resend
AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN=3600
PASSWORD_RESET_RATE_LIMIT_MAX=3
PASSWORD_RESET_RATE_LIMIT_WINDOW=900
```

Subir os dois pacotes:

```bash
cd packages/backend && npm run dev   # :3333, docs em /docs
cd packages/web     && npm run dev   # :3000
```

**Conta de apoio**: criar em `/signup` uma conta com e-mail e senha (ex.
`teste@fit.ai` / `senha12345`). Para o cenário de conta só-Google, entrar uma vez
pelo botão do Google com outra conta.

---

## 1. Camada de e-mail isolada (Fase A)

Com `EMAIL_PROVIDER=console`, disparar uma solicitação (seção 2.1) e conferir no
terminal do backend:

- [ ] O log traz assunto, destinatário e o HTML completo
- [ ] Nenhuma requisição de rede sai do processo
- [ ] O backend sobe **sem** `RESEND_API_KEY` definida

Para exercitar o Resend de verdade, trocar para `EMAIL_PROVIDER=resend` e usar
`delivered@resend.dev` como destinatário.

⚠️ **Nunca testar com endereços falsos em provedores reais** (`teste@gmail.com`):
eles retornam bounce e degradam a reputação de envio do domínio.

---

## 2. Backend pelos endpoints (Fases A + B)

### 2.1 Solicitar redefinição — conta com senha

```bash
curl -i -X POST http://localhost:3333/api/auth/request-password-reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@fit.ai","redirectTo":"http://localhost:3000/reset-password"}'
```

- [ ] `200` com `{"status":true,"message":"If this email exists..."}` (FR-005)
- [ ] O e-mail aparece no log, com o nome do usuário na saudação (FR-012)
- [ ] O corpo declara a expiração de 1 hora (FR-013)
- [ ] O botão e o link em texto apontam para o mesmo endereço (FR-014)
- [ ] A resposta chega em menos de 200ms — o envio não bloqueia

### 2.2 E-mail inexistente e conta só-Google

Repetir 2.1 com um e-mail sem conta e depois com o e-mail da conta Google.

- [ ] A resposta HTTP é **idêntica** à de 2.1 (FR-006, SC-004)
- [ ] **Nenhum e-mail** é gerado no log em nenhum dos dois casos
- [ ] O tempo de resposta é comparável ao de 2.1

### 2.3 Limite por origem e por endereço (FR-009)

```bash
# 4 solicitações seguidas para o mesmo endereço
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    http://localhost:3333/api/auth/request-password-reset \
    -H 'Content-Type: application/json' \
    -d '{"email":"teste@fit.ai","redirectTo":"http://localhost:3000/reset-password"}'
done
```

- [ ] As primeiras respondem `200` e a que ultrapassa `PASSWORD_RESET_RATE_LIMIT_MAX` responde `429`
- [ ] Repetir com um e-mail **sem conta**: o `429` chega no mesmo ponto da
  sequência (SC-004 — o limite não pode virar oráculo de enumeração)
- [ ] Variar o endereço mantendo a origem: o limite por origem também dispara

### 2.4 Abrir o link (FR-035)

Copiar do log a URL de `sendResetPassword` e abrir no navegador.

- [ ] Link válido → redireciona para `/reset-password?token=...`
- [ ] Alterar um caractere do token → redireciona para `/reset-password?error=INVALID_TOKEN`

### 2.5 Redefinir e efeitos colaterais

```bash
curl -i -X POST http://localhost:3333/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"newPassword":"novasenha123","token":"<token da URL>"}'
```

- [ ] `200` com `{"status":true}` e **nenhum cookie de sessão** na resposta (FR-022)
- [ ] O e-mail de aviso "sua senha foi alterada" aparece no log (FR-032, SC-012)
- [ ] O aviso **não contém nenhum link capaz de trocar a senha** (FR-033)
- [ ] Reenviar a mesma requisição → erro `INVALID_TOKEN` (FR-020)
- [ ] A senha antiga deixa de autenticar em `/sign-in/email` (FR-023, SC-006)
- [ ] Sessões abertas em outro navegador deixam de dar acesso (SC-006)

### 2.6 Registros de segurança (FR-037 a FR-039, SC-013)

No log do backend, após percorrer 2.1 → 2.5:

- [ ] Há entrada para solicitação, conclusão, recusa de link inválido e limite atingido
- [ ] **Nenhuma** entrada contém o token, a URL completa do link ou a senha
- [ ] Uma falha de envio (chave de API inválida em modo `resend`) é registrada,
  e o usuário ainda recebe a confirmação neutra

---

## 3. Telas (Fase C) — validação obrigatória com chrome-devtools MCP

Executar em **402px** e **1280px**, e conferir 320px, 768px, 1023px e 1024px.

### 3.1 Entrada no fluxo

- [ ] Em `/login`, "Esqueci minha senha" é clicável e leva a `/forgot-password` (FR-001)
- [ ] O elemento entra na ordem de tabulação e mostra foco visível

### 3.2 `/forgot-password` (US1)

- [ ] Título, texto de apoio, campo rotulado e botão "Enviar link" conforme `3a`/`3b`
- [ ] Campo vazio e e-mail malformado → erro **inline** sob o campo, sem chamada ao servidor (FR-004)
- [ ] Envio válido → estado "Verifique seu e-mail" com ícone, botão e a linha "Não recebeu?" (FR-007)
- [ ] "tente outro e-mail" volta ao formulário sem recarregar a página (FR-008)
- [ ] "Voltar ao login" leva a `/login`
- [ ] O botão entra em carregamento e bloqueia envio duplicado (FR-010)
- [ ] A troca para o estado de sucesso é anunciada por leitor de tela (FR-030)
- [ ] Acessando autenticado, a tela **não** redireciona para a home (FR-002)

### 3.3 `/reset-password` (US3)

- [ ] Com `?token=` válido → formulário conforme `4a`/`4b`, com o aviso de mínimo de 8 caracteres (FR-017, FR-018)
- [ ] Com `?error=INVALID_TOKEN` ou **sem** parâmetro → painel de link inválido, **sem formulário** (FR-035)
- [ ] Senha com menos de 8 caracteres → erro inline (FR-019)
- [ ] Confirmação divergente → erro inline no campo de confirmação (FR-019)
- [ ] Sucesso → redireciona para `/login` com toast de senha alterada (FR-022)
- [ ] Entrar com a nova senha funciona; com a antiga, não (SC-006)
- [ ] O gerenciador de senhas do navegador oferece salvar a credencial nova

### 3.4 Apresentação e acessibilidade (US4)

- [ ] ≥ 1024px: banner lateral com logo, título e subtítulo (FR-025)
- [ ] ≤ 1023px: foto no topo, logo centralizada, lâmina branca arredondada (FR-025)
- [ ] Rodapé com copyright e crédito de autoria nas duas telas (FR-026)
- [ ] Sem rolagem horizontal, sem sobreposição e **sem erros no console** em 320/402/768/1023/1024/1280px (SC-008)
- [ ] Alvos de toque ≥ 44×44px (FR-027)
- [ ] Fluxo inteiro operável só pelo teclado, com foco sempre visível (SC-010)
- [ ] Comparar o resultado em 402px e 1280px com as variantes `3a`/`3b` e `4a`/`4b`
  do design, incluindo os **dois estados** da tela 3 (SC-009)

---

## 4. Conferência do e-mail contra o design (US2, SC-003)

Enviar de verdade (`EMAIL_PROVIDER=resend`, destinatário `delivered@resend.dev`
ou uma caixa própria) e comparar com `Email - Redefinir Senha.html`:

- [ ] Cabeçalho azul com a logo e o título "Redefinir sua senha" (FR-011)
- [ ] Corpo branco com saudação, prazo, botão e link em texto
- [ ] Avisos finais: spam, ignorar se não tem conta, envio automático, suporte, copyright (FR-015)
- [ ] Com **imagens bloqueadas**, a mensagem continua legível e o link continua acessível (FR-016)
- [ ] Abrir no Gmail e no Outlook: a logo aparece (é PNG, não SVG — ver D7)
- [ ] Todo o conteúdo em português do Brasil (FR-016)

---

## 5. Fim a fim (SC-001)

Cronometrar o percurso completo com uma conta real:

`/login` → "Esqueci minha senha" → enviar → abrir o e-mail → definir a nova senha
→ entrar com ela.

- [ ] Concluído em menos de 3 minutos, sem ajuda e sem recarregar página manualmente
