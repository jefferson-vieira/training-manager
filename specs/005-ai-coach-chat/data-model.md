# Phase 1 Data Model: AI Coach Chat

**Feature**: `005-ai-coach-chat` | **Date**: 2026-07-20

Esta feature **não altera o banco de dados**. Não há entidade Prisma nova, migração ou coluna. O modelo abaixo descreve apenas estado de cliente, em memória ou no `localStorage`.

---

## Entidade: Mensagem

Não é modelada pela feature — é o `UIMessage` do AI SDK, gerido pelo `useChat`. Documentado aqui apenas para fixar como o spec se mapeia nele.

| Campo do spec | Origem no `UIMessage` | Observação |
|---|---|---|
| Autor | `role` | `'user'` ou `'assistant'` |
| Conteúdo formatável | `parts[]` do tipo `text` | Renderizado por `MessageResponse` (Streamdown) |
| Em andamento | `status === 'streaming'` **e** última mensagem | Derivado, não armazenado |
| Concluída | `status === 'ready'` | Derivado |
| Interrompida | `stop()` chamado; partes recebidas permanecem | Derivado |
| Não entregue | `error != null` **e** última mensagem é do aluno | **Derivado — ver regra abaixo** |

### Regra de derivação do estado "não entregue"

```
naoEntregue(mensagem) =
  error != null
  E mensagem.role === 'user'
  E mensagem é a última da lista
```

Não existe campo persistido de erro por mensagem. Consequências que satisfazem o spec diretamente:

- **FR-041** (reenvio reaproveita o texto): `regenerate()` reprocessa a última mensagem do aluno; nada é redigitado.
- **Edge case "reenvio que falha novamente"**: o reenvio não insere mensagem nova, então não há acúmulo de cópias; a marcação simplesmente permanece enquanto `error` estiver preenchido.
- **Edge case "painel fechado com pendência"**: nada persiste, então nada é reenviado depois.

---

## Entidade: Conversa

Lista ordenada de mensagens do `useChat`, com ciclo de vida amarrado à montagem do painel.

**Ciclo de vida:**

```
[vazia] --primeiro envio--> [ativa] --fechar painel--> [descartada]
   ^                                                        |
   |------------------ reabrir painel ---------------------|
```

**Invariantes:**

- Não é persistida em lugar nenhum (decisão de escopo do `/speckit-specify`).
- Conversa vazia ⇒ sugestões visíveis (FR-022, FR-024).
- Conversa com ≥ 1 mensagem ⇒ sugestões ocultas (FR-024).
- Sem limite de mensagens e sem controle de reinício (FR-044).

**Nota de implementação**: para que "fechar descarta a conversa" seja verdade de fato, o componente do painel precisa ser **desmontado** ao fechar, não apenas escondido por CSS. Desmontar também aborta a requisição em curso, satisfazendo FR-021 e o edge case da transmissão órfã.

---

## Entidade: Estado do painel

Único estado que sobrevive a navegação e recarregamento.

| Propriedade | Valor |
|---|---|
| Domínio | `true` (aberto) / `false` (fechado) |
| Onde vive | `localStorage`, chave `training-manager:chat-open` |
| Estado inicial no servidor | `false` sempre — servidor não lê `localStorage` |
| Leitura | `useEffect` após montagem, para evitar divergência de hidratação |
| Escrita | A cada alternância de aberto/fechado |
| Ausente ou corrompido | Tratar como `false` |

**Prefixo da chave**: `training-manager:` alinha com o `cookiePrefix` já usado pelo better-auth, evitando colisão em `localStorage` compartilhado por origem.

**Transições:**

| De | Evento | Para | Efeito colateral |
|---|---|---|---|
| fechado | toque no botão sparkles | aberto | monta o painel |
| aberto | toque no "X" | fechado | desmonta; aborta stream; revalida se houve resposta |
| aberto | toque na área escurecida | fechado | idem |
| aberto | navegação entre telas | aberto | painel permanece montado |
| qualquer | recarregamento | valor guardado | leitura pós-montagem |

**Fora da regra**: em `/login` e `/onboarding` o painel e o botão não são renderizados, independentemente do valor guardado (FR-003). O valor **não é apagado** ao passar por essas telas — o aluno reencontra o painel como o deixou ao voltar para uma tela autenticada.

---

## Entidade: Sugestão

Constante de interface, não dado de domínio.

| Propriedade | Valor |
|---|---|
| Conteúdo | `['Alterar plano de treino', 'Mudar objetivo', 'Atualizar informações']` |
| Ordem | Fixa, exatamente como acima (FR-022) |
| Onde vive | Constante em módulo do frontend |
| Ação | Envia o próprio texto como mensagem do aluno (FR-023) |

**Localização**: as sugestões são rótulos de interface, não regras de negócio — ficam junto ao componente do chat, **não** em `src/helpers/`, que a constituição reserva a regras de domínio.

---

## Estado derivado (sem armazenamento)

| Nome | Derivação | Requisito |
|---|---|---|
| `isBusy` | `status === 'submitted' \|\| status === 'streaming'` | FR-015 |
| `showSuggestions` | `messages.length === 0` | FR-024 |
| `isProcessingAction` | `status === 'streaming'` **e** última parte não é texto em progresso | FR-018 |
| `hasFailedMessage` | `status === 'error'` | FR-040 |
| `shouldRevalidate` | houve ≥ 1 resposta concluída durante a sessão do painel | FR-008 |
| `isAtBottom` | `useStickToBottomContext()` | FR-029 |

Todo estado derivado é calculado na renderização. Nenhum deles é espelhado em `useState`, o que evitaria sincronização redundante e possíveis divergências.
