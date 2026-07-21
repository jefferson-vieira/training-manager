---

description: "Task list for AI Coach Chat implementation"
---

# Tasks: AI Coach Chat

**Input**: Design documents from `/specs/005-ai-coach-chat/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md), [quickstart.md](./quickstart.md)

**Tests**: **FORBIDDEN** — Constitution Principle I prohibits all automated tests. Nenhuma tarefa de teste aparece abaixo. Verificação é manual, conforme `quickstart.md`.

**Organization**: Tarefas agrupadas por história de usuário. **Leia a seção "Sobre paralelismo" antes de planejar execução** — esta feature é menos paralelizável do que o formato sugere.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: História a que a tarefa pertence (US1..US5)
- Caminhos de arquivo exatos nas descrições

## Path Conventions

- **Web**: `packages/web/src/` — **todo o trabalho desta feature vive aqui**
- **Backend**: nenhuma alteração (premissa "backend inalterado")
- **Orval**: **não se aplica** — a rota de IA é streaming e está fora do cliente tipado

---

## Sobre paralelismo (leia antes de distribuir trabalho)

O template padrão pressupõe histórias independentes tocando arquivos distintos. **Aqui isso não vale.** As Histórias 1, 2, 3 e 5 editam o mesmo arquivo — `packages/web/src/components/chat.tsx`. Marcá-las como paralelas produziria conflito garantido.

O que de fato é paralelizável:

- As tarefas de Fundação (T003–T005), que criam arquivos distintos
- A limpeza final (T031, T032)
- Nada mais

**Recomendação honesta**: uma pessoa executa da Fase 3 à Fase 7 em sequência. Distribuir por história aqui custa mais em resolução de conflito do que economiza em tempo.

---

## Phase 1: Setup

**Purpose**: Garantir que a feature é observável antes de começar

- [X] T001 Subir o ambiente conforme `quickstart.md` (Postgres, backend na 3333, web na 3000) e confirmar que `POST /api/ai` responde com stream
- [X] T002 Garantir um usuário autenticado **com plano de treino ativo** — sem plano a home redireciona para `/onboarding`, onde o painel não é exibido e a feature não é observável

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura que todas as histórias precisam

**⚠️ CRITICAL**: Nenhuma história pode começar antes desta fase terminar

- [X] T003 [P] ~~Adicionar o token `--online`~~ — **revisado na implementação**: `--success` já existe em `packages/web/src/app/globals.css` nos dois temas, com o mesmo papel de verde de estado positivo. A constituição só autoriza criar token quando nenhum existe, então o indicador "Online" usa `bg-success` e **nenhum token novo foi criado**. A classe órfã `bg-online` desaparece com a reescrita do `chat.tsx` (T009)
- [X] T004 [P] Criar `packages/web/src/hooks/use-chat-panel.ts` com estado **em memória** (`isOpen`, `open`, `close`) exposto por Context, mais o componente provider — a persistência entra na Fase 6 (US4)
- [X] T005 [P] Acrescentar `ConversationScrollButton` a `packages/web/src/components/ai-elements/conversation.tsx`, usando `useStickToBottomContext()` para `isAtBottom` e `scrollToBottom`, retornando `null` quando já está no final. **Editar o arquivo à mão — NÃO rodar `npx ai-elements@latest add conversation`**, que sobrescreveria o arquivo e quebraria `onboarding/page.tsx` (proibido por FR-004)
- [X] T006 [P] Remover `<Chat />` e o `<Suspense>` que o envolve de `packages/web/src/app/layout.tsx`
- [X] T007 Montar o provider do T004 e `<Chat />` em `packages/web/src/app/(main)/layout.tsx` (depende de T004 e T006) — isso satisfaz FR-003 pela árvore de rotas, sem condicional de caminho no componente
- [X] T008 Migrar `packages/web/src/app/(main)/_components/chat-open-button.tsx` de `nuqs` para `useChatPanel`, mantendo o ícone `Sparkles` na posição central da barra inferior e garantindo alvo de toque ≥ 44×44px (depende de T004) (FR-001, FR-036)

**Checkpoint**: o botão sparkles abre e fecha um painel vazio em telas autenticadas, e nada aparece em `/login` e `/onboarding`

---

## Phase 3: User Story 1 - Conversar com o Coach AI a partir de qualquer tela (Priority: P1) 🎯 MVP

**Goal**: Conversa funcional com streaming, a partir de qualquer tela autenticada

**Independent Verification**: Bloco 1 do `quickstart.md` — abrir na home, enviar "Qual meu treino de hoje?", ver a resposta chegando em incrementos, fechar e confirmar a tela de origem intacta

### Implementation for User Story 1

- [X] T009 [US1] Reescrever `packages/web/src/components/chat.tsx` do zero com a geometria da sobreposição: área superior escurecida que fecha ao clique, painel ancorado à base, largura da viewport com margem lateral em qualquer tamanho. **Sem `height` fixa** — usar `min-h`/`max-h` (FR-002, FR-005, FR-034)
- [X] T010 [US1] Construir o cabeçalho em `packages/web/src/components/chat.tsx`: `Sparkles` em avatar circular, título "Coach AI", ponto de status com o token `--online` e rótulo "Online", botão "X" à direita. **Nada além disso no cabeçalho** — sem controle de "nova conversa" (FR-031, FR-032, FR-044)
- [X] T011 [US1] Ligar `useChat` com `DefaultChatTransport` apontando para `${env.NEXT_PUBLIC_API_URL}/api/ai` e `credentials: 'include'` em `packages/web/src/components/chat.tsx` (FR-009, FR-010)
- [X] T012 [US1] Renderizar a conversa em `packages/web/src/components/chat.tsx` com `Conversation`/`ConversationContent` e `Message`/`MessageContent`/`MessageResponse` do ai-elements, aplicando `max-w` no balão para preservar comprimento de linha em telas largas. Reutilizar os componentes existentes em vez de estilizar tags nativas (FR-011, FR-012, FR-013, FR-035, FR-037)
- [X] T013 [US1] Integrar `PromptInput` em `packages/web/src/components/chat.tsx` passando `status` e `onStop` para `PromptInputSubmit`, que já alterna entre envio, carregando, parar e erro; bloquear envio de texto vazio ou só espaços (FR-014, FR-015, FR-016, FR-017)
- [X] T014 [US1] Exibir em `packages/web/src/components/chat.tsx` a saudação inicial do assistente quando a conversa está vazia, conforme o Figma `3606:1016`, como conteúdo de interface — **não** enviar chamada ao serviço de IA (FR-033)
- [X] T015 [US1] Implementar o indicador genérico de processamento em `packages/web/src/components/chat.tsx`: exibir quando `status === 'streaming'` e não há texto fluindo (execução de ferramenta). **Não exibir nome, parâmetro ou resultado de ferramenta** (FR-018, FR-019)
- [X] T016 [US1] Chamar `router.refresh()` de `next/navigation` ao fechar o painel em `packages/web/src/components/chat.tsx`, apenas quando houve ao menos uma resposta concluída na sessão do painel (FR-008)
- [X] T017 [US1] Garantir em `packages/web/src/components/chat.tsx` que fechar **desmonta** o painel (retornar `null`), abortando a transmissão em curso em vez de apenas ocultar por CSS (FR-021)
- [X] T018 [US1] Validar o Bloco 1 do `quickstart.md` com chrome-devtools MCP em 320px e 1280px, capturando screenshot, conferindo contra o Figma e medindo alvos interativos (≥ 44×44px, sem rolagem horizontal) (FR-036)

**Checkpoint**: MVP entregável — o aluno conversa com o Coach AI de qualquer tela autenticada

---

## Phase 4: User Story 2 - Iniciar a conversa por sugestões prontas (Priority: P2)

**Goal**: Três sugestões reduzem o atrito do primeiro uso

**Independent Verification**: Bloco 2 do `quickstart.md`

### Implementation for User Story 2

- [X] T019 [US2] Definir em `packages/web/src/components/chat.tsx` a constante com exatamente `['Alterar plano de treino', 'Mudar objetivo', 'Atualizar informações']` — **não** em `packages/web/src/helpers/`, que a constituição reserva a regras de domínio (FR-022)
- [X] T020 [US2] Renderizar `Suggestions`/`Suggestion` em `packages/web/src/components/chat.tsx` acima do campo de entrada, visíveis apenas quando `messages.length === 0`, enviando o texto da sugestão como mensagem do aluno (FR-023, FR-024, FR-025)
- [X] T021 [US2] Validar o Bloco 2 do `quickstart.md`, com atenção à rolagem horizontal das pílulas em 320px sem provocar rolagem horizontal da página

**Checkpoint**: Histórias 1 e 2 funcionam

---

## Phase 5: User Story 3 - Leitura confortável durante o streaming (Priority: P2)

**Goal**: A conversa nunca move o aluno contra a intenção dele

**Independent Verification**: Bloco 3 do `quickstart.md` — pedir um plano completo, rolar para cima durante o streaming e confirmar que a visualização não é puxada

### Implementation for User Story 3

- [X] T022 [US3] Posicionar o `ConversationScrollButton` (criado em T005) dentro do `Conversation` em `packages/web/src/components/chat.tsx`, visível apenas quando o aluno está afastado do final. Confirmar que o `Conversation` acompanha o conteúdo novo **somente** enquanto o aluno está no final, e que rolar ou selecionar texto interrompe o acompanhamento (FR-026, FR-027, FR-029, FR-030)
- [X] T023 [US3] Ajustar o posicionamento do novo turno em `packages/web/src/components/chat.tsx` para que a resposta cresça dentro da área visível mantendo visível a mensagem que a originou (FR-028)
- [X] T024 [US3] Validar o Bloco 3 do `quickstart.md`. **O item 3.2 é o cenário central da feature** — se rolar para cima durante o streaming ainda puxar a visualização, o restante do bloco não importa

**Checkpoint**: comportamento de rolagem conforme as diretrizes de streaming adotadas

---

## Phase 6: User Story 4 - Estado do chat preservado ao navegar e recarregar (Priority: P3)

**Goal**: O painel reabre como o aluno o deixou

**Independent Verification**: Bloco 4 do `quickstart.md`

### Implementation for User Story 4

- [X] T025 [US4] Acrescentar persistência a `packages/web/src/hooks/use-chat-panel.ts`: ler `localStorage['training-manager:chat-open']` em `useEffect` pós-montagem (evita divergência de hidratação), escrever a cada alternância, tratar valor ausente ou inválido como fechado (FR-006)
- [X] T026 [US4] Confirmar que `packages/web/src/hooks/use-chat-panel.ts` e `packages/web/src/app/(main)/_components/chat-open-button.tsx` não escrevem nada na URL, e validar no navegador que o botão "voltar" navega sem abrir nem fechar o chat (FR-007)
- [X] T027 [US4] Validar o Bloco 4 do `quickstart.md`, incluindo ausência de painel e botão em `/login` e `/onboarding`, e que o chat próprio do onboarding continua intacto (FR-003, FR-004)

**Checkpoint**: estado sobrevive a navegação e recarregamento

---

## Phase 7: User Story 5 - Falhas e interrupções tratadas com clareza (Priority: P3)

**Goal**: Falha não vira tela travada nem perda do que o aluno escreveu

**Independent Verification**: Bloco 5 do `quickstart.md`

### Implementation for User Story 5

- [X] T028 [US5] Usar `error` e `regenerate()` do `useChat` em `packages/web/src/components/chat.tsx` para marcar a última mensagem do aluno como não entregue e oferecer o controle de reenvio ao lado dela. **Não criar estado paralelo de mensagens falhas** — `regenerate()` reaproveita o texto original sem inserir cópia (FR-020, FR-040, FR-041)
- [X] T029 [US5] Tratar em `packages/web/src/components/chat.tsx` a resposta 401 do serviço de IA redirecionando para `/login` (FR-042)
- [X] T030 [US5] Garantir em `packages/web/src/components/chat.tsx` que **apenas** o 401 redireciona: falha de rede ou indisponibilidade do serviço seguem o caminho de mensagem não entregue com reenvio. Sem essa distinção, uma queda momentânea de rede expulsa o aluno do app (FR-043)
- [X] T031 [US5] Validar o Bloco 5 do `quickstart.md`. **Os itens 5.7 e 5.8 formam um par** — validar os dois juntos para provar a distinção do T030

**Checkpoint**: todas as histórias funcionam

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Remover o que ficou obsoleto e validar o conjunto

- [X] T032 [P] Remover `packages/web/src/components/chat-input.tsx` — é um `<Input />` vazio sem nenhum consumidor (FR-039)
- [X] T033 [P] Verificar consumidores de `packages/web/src/components/ui/chat-message.tsx` com `grep` e remover **apenas se não houver nenhum**. **`ui/chat-header.tsx` deve ser mantido** — o `onboarding/page.tsx` depende dele e o FR-004 proíbe alterá-lo
- [X] T034 Confirmar com `grep -rn "chat_open\|chat_initial_message" packages/web/src` que nenhum resíduo dos parâmetros `nuqs` do chat permanece (FR-039)
- [X] T035 Rodar `npm run lint` e `npm run build` em `packages/web` e corrigir o que aparecer — **resultado parcial, leia**: o lint dos arquivos desta feature está limpo (o total do pacote caiu de 490 para 486 problemas, todos de prettier e pré-existentes). O **`npm run build` falha**, mas a falha é **pré-existente e não desta feature**: `src/components/ai-elements/prompt-input.tsx:462` tem erros de tipo por incompatibilidade entre o `@base-ui/react` instalado e a versão do ai-elements vendorizada. Confirmado com `git stash`: o build já falhava em HEAD, na mesma linha. **Corrigir isso é trabalho separado** — exige realinhar a versão do ai-elements/base-ui e tocaria um arquivo compartilhado com o onboarding
- [X] T036 Executar a validação completa do `quickstart.md` (Blocos 1 a 7) com chrome-devtools MCP em 320px e 1280px, sem erro de console e sem requisição falha inesperada
- [X] T037 Comparar a interface renderizada com o Figma `3606:1016` e corrigir divergências, repetindo a validação até convergir
- [X] T038 Validar acessibilidade do painel (item 6.8 do `quickstart.md`): navegação por teclado ao longo da conversa, `Enter` envia e `Shift+Enter` quebra linha, foco preservado durante a transmissão e anúncio das mensagens novas em ritmo confortável (FR-038)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências
- **Foundational (Fase 2)**: depende do Setup — **bloqueia todas as histórias**
- **US1 (Fase 3)**: depende da Fase 2
- **US2 (Fase 4)**, **US3 (Fase 5)**, **US5 (Fase 7)**: dependem da Fase 2 e, na prática, da Fase 3 — todas editam `chat.tsx`, que a US1 cria
- **US4 (Fase 6)**: depende da Fase 2; **é a única história que não toca `chat.tsx`** (edita apenas o hook), então pode de fato correr em paralelo com a US1
- **Polish (Fase 8)**: depende das histórias desejadas

### Within Each User Story

- Geometria e cabeçalho antes da conversa
- Conversa antes do campo de entrada
- Implementação antes da validação visual
- História completa antes de passar à próxima prioridade

### Parallel Opportunities

- T003, T004, T005, T006 na Fase 2 (arquivos distintos)
- T032 e T033 na Fase 8
- Fase 6 (US4) em paralelo com a Fase 3 (US1), se houver duas pessoas — é a única separação real de arquivos entre histórias

**Fora isso, execução sequencial.** Ver "Sobre paralelismo" no topo.

---

## Parallel Example: Phase 2

```bash
# Quatro arquivos distintos, sem dependência entre si:
Task: "Adicionar token --online em packages/web/src/app/globals.css"
Task: "Criar packages/web/src/hooks/use-chat-panel.ts"
Task: "Acrescentar ConversationScrollButton em packages/web/src/components/ai-elements/conversation.tsx"
Task: "Remover <Chat /> de packages/web/src/app/layout.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Fase 1: Setup
2. Fase 2: Foundational (bloqueia tudo)
3. Fase 3: US1
4. **PARAR E VALIDAR**: Bloco 1 do `quickstart.md` nas duas larguras
5. Demonstrar se estiver pronto

### Incremental Delivery

1. Setup + Foundational → painel abre e fecha
2. US1 → conversa com streaming → **MVP**
3. US2 → sugestões
4. US3 → comportamento de rolagem
5. US4 → persistência
6. US5 → falhas e reenvio
7. Polish → limpeza e validação completa

---

## Notes

- Constituição proíbe testes automatizados — nenhuma tarefa de teste, nem infraestrutura de teste
- **Zero dependências novas**: tudo é atendido por `@ai-sdk/react`, `ai`, `use-stick-to-bottom`, `streamdown`, `lucide-react` e shadcn já instalados
- Sem regeneração do Orval nesta feature — a rota de IA é streaming e não faz parte do cliente tipado
- Sem `height` fixa em CSS; usar `min-h`/`max-h` (regra de UI do projeto)
- Sem cor fora de token; T003 existe justamente por isso
- Toda mudança de frontend exige validação por chrome-devtools MCP antes de ser considerada concluída
- Commit a cada tarefa ou grupo lógico
