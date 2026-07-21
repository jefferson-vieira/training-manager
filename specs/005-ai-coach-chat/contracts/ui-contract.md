# Phase 1 Contracts: AI Coach Chat

**Feature**: `005-ai-coach-chat` | **Date**: 2026-07-20

Esta feature **não expõe nem altera nenhum contrato de API**. Consome a rota existente `POST /api/ai` sem mudar sua forma.

---

## Contrato de API consumido (inalterado)

**Rota**: `POST {NEXT_PUBLIC_API_URL}/api/ai` — `packages/backend/src/routes/ai.routes.ts`

| Aspecto | Valor |
|---|---|
| Corpo | `{ messages: UIMessage[] }` |
| Autenticação | Cookie de sessão; `credentials: 'include'` |
| Resposta | Stream de protocolo do AI SDK |
| Sem sessão | `401` com `{ code: 'UNAUTHORIZED', error: 'Unauthorized' }` |
| Transporte no cliente | `DefaultChatTransport` do `ai` |

**Sem regeneração do Orval.** A rota de IA é streaming e não faz parte do cliente tipado gerado; nenhuma mudança de contrato ocorre nesta feature. O passo `npx orval` do fluxo do projeto **não se aplica** aqui.

**O 401 é o gatilho** do redirecionamento para `/login` (FR-042). Demais falhas seguem o caminho de mensagem não entregue com reenvio (FR-043).

---

## Contratos de componente

Interfaces internas entre os componentes da feature. Não há API pública para consumidores externos.

### `useChatPanel()` — hook de estado do painel

`packages/web/src/hooks/use-chat-panel.ts`

```ts
type UseChatPanelReturn = {
  close: () => void;
  isOpen: boolean;
  open: () => void;
};
```

- Lê `localStorage['training-manager:chat-open']` em `useEffect` pós-montagem.
- `isOpen` inicia `false` no servidor e no primeiro quadro do cliente (evita divergência de hidratação).
- Escreve a cada alternância.
- Cobre FR-006 e FR-007.

**Sincronização entre instâncias**: `ChatOpenButton` e `Chat` consomem o mesmo estado. Como ambos vivem sob o mesmo layout, o hook expõe o estado por Context, evitando duas cópias divergentes de `useState` sobre a mesma chave.

### `<Chat />` — painel

`packages/web/src/components/chat.tsx`

```ts
type ChatProps = Record<string, never>; // sem props
```

- Retorna `null` quando fechado — **desmontagem real**, não ocultação por CSS (ver `data-model.md`).
- Renderizado no layout autenticado, não no layout raiz, para satisfazer FR-003 sem verificação de rota no componente.

### `<ChatOpenButton />` — gatilho

`packages/web/src/app/(main)/_components/chat-open-button.tsx`

- Ícone `Sparkles`; alvo de toque ≥ 44×44px (FR-036).
- Chama `open()` do hook.

### `<ConversationScrollButton />` — retorno ao final

Acrescentado a `packages/web/src/components/ai-elements/conversation.tsx`

```ts
type ConversationScrollButtonProps = ComponentProps<typeof Button>;
```

- Usa `useStickToBottomContext()` para `isAtBottom` e `scrollToBottom`.
- Renderiza `null` quando `isAtBottom` é `true`.
- Cobre FR-029.

**Restrição de execução**: acrescentar **manualmente** ao arquivo existente. Rodar `npx ai-elements@latest add conversation` sobrescreveria o arquivo e quebraria o `onboarding/page.tsx`, que o FR-004 proíbe alterar.

---

## Contrato de tokens de design

Adicionar em `packages/web/src/app/globals.css`:

```css
@theme inline {
  --color-online: var(--online);
}

:root  { --online: <verde de disponibilidade, tema claro>; }
.dark  { --online: <verde de disponibilidade, tema escuro>; }
```

**Motivo**: `bg-online` já é usada no `chat.tsx` atual mas `--online` nunca foi definida — o ponto verde está invisível hoje. `ui/chat-header.tsx` usa `bg-green-600` fixo, proibido pela Regra III da constituição. Criar o token corrige ambos.

**Escopo**: esta feature apenas **cria** o token e o usa no cabeçalho novo. Migrar `ui/chat-header.tsx` para o token tocaria o onboarding — **fora de escopo por FR-004**, registrado como dívida.

---

## Superfícies deliberadamente ausentes

| Não haverá | Requisito |
|---|---|
| Rota, DTO ou schema novo no backend | Premissa "backend inalterado" |
| Entidade Prisma ou migração | `data-model.md` |
| Regeneração do Orval | Rota de IA fora do cliente tipado |
| Controle de "nova conversa" | FR-044 |
| Exposição de nome ou parâmetro de ferramenta | FR-019 |
| Persistência de histórico | Escopo definido no `/speckit-specify` |
