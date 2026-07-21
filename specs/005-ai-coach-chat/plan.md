# Implementation Plan: AI Coach Chat

**Branch**: `005-ai-coach-chat` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-ai-coach-chat/spec.md`

## Summary

Reconstruir o painel do Coach AI como sobreposição global das telas autenticadas, com streaming pelo `POST /api/ai` já existente. A implementação anterior (`components/chat.tsx`) é descartada: ela rola incondicionalmente com `scrollIntoView`, o que viola o requisito central de respeitar a intenção de leitura do aluno, e usa a classe `bg-online` sem que o token exista.

A abordagem reaproveita o que já está instalado — `useChat` do `@ai-sdk/react` para conversa, erro e reenvio; `use-stick-to-bottom` (via `Conversation` do ai-elements) para o comportamento de rolagem; `PromptInput` para envio, parada e estados de ocupado. **Nenhuma dependência nova.** O trabalho concentra-se em: um hook de persistência em `localStorage`, o subcomponente de retorno ao final da conversa, o indicador genérico de processamento de ferramentas, o token de cor `--online`, e a montagem do painel no layout autenticado.

## Technical Context

**Language/Version**: TypeScript (Node v24.14.0 per `.nvmrc`)

**Primary Dependencies**: Next.js 16 + React 19 + Tailwind 4 + shadcn (web). Sem toque no backend.

**Storage**: Nenhuma mudança de banco. Único estado persistido: `localStorage['training-manager:chat-open']`.

**Testing**: **NONE** — Constitution Principle I forbids all automated tests. Manual verification only, per [quickstart.md](./quickstart.md).

**Target Platform**: Web responsivo (320px a 1280px+)

**Project Type**: npm workspaces monorepo — mudança confinada a `packages/web`

**Performance Goals**: streaming incremental sem buffer; sem crescimento injustificado de bundle (nenhum pacote novo)

**Constraints**: sem dependência nova; sem `height` fixa em CSS (Regra de UI); sem cor fora de token; lógica fora de componentes

**Scale/Scope**: 1 sobreposição global, ~6 arquivos tocados em `packages/web`, 0 endpoints, 0 migrações

**Incógnitas resolvidas na Fase 0**: revalidação de sessão (R-001), mecânica de reenvio (R-002), rolagem (R-003), componentes a acrescentar (R-004), indicador de ferramenta (R-005), persistência (R-006), revalidação de dados (R-007), token de cor (R-008), geometria (R-009). Nenhuma NEEDS CLARIFICATION remanescente.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No Automated Testing**: nenhuma tarefa de teste em nenhum artefato; verificação exclusivamente manual via `quickstart.md`
- [x] **Code Quality**: estado do painel em `hooks/use-chat-panel.ts`; componentes só compõem e renderizam; sugestões são constante de interface, não indo para `helpers/` (reservado a regras de domínio)
- [x] **UX Consistency**: reutiliza `Button`, `ScrollArea`, `Spinner`, `InputGroup` do shadcn e `Message`/`Suggestion`/`PromptInput` do ai-elements; corrige `bg-green-600` fixo criando token
- [x] **Responsive Design**: mobile-first; sem `h-*` fixa (usa `min-h`/`max-h`); alvos ≥ 44×44px; validação obrigatória em 320px e 1280px
- [x] **Minimal Dependencies**: **zero pacotes novos** — ver `research.md`, seção final
- [x] **Performance**: streaming incremental preservado; painel desmontado quando fechado; sem estado derivado espelhado em `useState`
- [x] **Package Rules**: tudo em `packages/web`; **Orval não se aplica** — a rota de IA é streaming e está fora do cliente tipado, e nenhum contrato muda

**Reavaliação pós-Fase 1**: mantido. O desenho não introduziu abstração nova além de um hook, que existe justamente para tirar lógica do componente conforme a Regra II. Tabela de Complexity Tracking permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/005-ai-coach-chat/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — 9 decisões técnicas
├── data-model.md        # Fase 1 — estado de cliente (sem banco)
├── quickstart.md        # Fase 1 — 7 blocos de validação manual
├── contracts/
│   └── ui-contract.md   # Fase 1 — contratos de componente e tokens
├── checklists/
│   └── requirements.md  # Qualidade do spec — 16/16
└── tasks.md             # Fase 2 — criado por /speckit-tasks
```

### Source Code (arquivos afetados)

```text
packages/web/src/
├── app/
│   ├── layout.tsx                        # REMOVER <Chat /> daqui
│   ├── globals.css                       # ADICIONAR token --online
│   └── (main)/
│       ├── layout.tsx                    # ADICIONAR <Chat /> + provider
│       └── _components/
│           └── chat-open-button.tsx      # MIGRAR de nuqs p/ hook
├── components/
│   ├── chat.tsx                          # REESCREVER
│   ├── chat-input.tsx                    # REMOVER (Input vazio sem uso)
│   └── ai-elements/
│       └── conversation.tsx              # ACRESCENTAR ConversationScrollButton
└── hooks/
    └── use-chat-panel.ts                 # CRIAR
```

**Structure Decision**: `<Chat />` migra do layout raiz para o layout `(main)`. Isso satisfaz FR-003 por **estrutura de rotas**, não por condicional de caminho dentro do componente — `/login` e `/onboarding` ficam fora desse layout, então nem painel nem botão são renderizados sem que nenhum código precise conhecer nomes de rota. Menos acoplamento e menos chance de regressão quando rotas novas surgirem.

## Fases de implementação sugeridas

Ordem por dependência, alinhada às prioridades do spec:

1. **Fundação** — token `--online`; `use-chat-panel.ts`; `ConversationScrollButton`
2. **Montagem** — mover `<Chat />` para `(main)/layout.tsx`; migrar `ChatOpenButton`
3. **P1 — conversa** — painel, cabeçalho, streaming, envio, parada (História 1)
4. **P2 — sugestões e rolagem** (Histórias 2 e 3)
5. **P3 — persistência, falhas, revalidação** (Histórias 4 e 5)
6. **Limpeza e validação** — remover código morto; validar por chrome-devtools MCP nas duas larguras

## Complexity Tracking

> Preenchido apenas quando há violação do Constitution Check a justificar.

Nenhuma violação. Nenhuma dependência nova, nenhuma camada de abstração extra, nenhum serviço novo.

## Riscos e limitações conhecidos

Registrados aqui porque afetam o que a feature pode de fato entregar — não são detalhes de execução.

| # | Risco | Impacto | Encaminhamento |
|---|---|---|---|
| 1 | ~~FR-042/FR-043 assumem renovação de sessão que não existe~~ — **resolvido em 2026-07-20**: o produto removeu a revalidação do escopo; 401 redireciona direto ao login | Encerrado | `research.md` R-001 atualizado; renovação de credenciais fica como trabalho de backend separado, se um dia for desejada |
| 2 | Largura total em 1280px+ (escolha do produto na Q4) produz linhas longas | Médio — legibilidade em desktop | FR-035 limita o balão; conferir no bloco 6.2 do quickstart e reportar se insuficiente |
| 3 | Rodar o CLI do ai-elements sobre `conversation.tsx` sobrescreveria o arquivo e quebraria o onboarding | Médio — violaria FR-004 | Acrescentar o subcomponente à mão; registrado em `research.md` R-004 e no contrato |
| 4 | `ui/chat-header.tsx` usa `bg-green-600` fixo e é consumido pelo onboarding | Baixo — inconsistência remanescente | Token criado nesta feature; migrar o onboarding fica como dívida, bloqueada por FR-004 |
| 5 | Leitura pós-montagem do `localStorage` pode produzir um quadro com o painel fechado | Baixo — possível piscada na abertura | Documentado em `research.md` R-006; avaliar no bloco 4.2 |

## Próximo comando

`/speckit-tasks` para gerar `tasks.md` a partir destes artefatos.
