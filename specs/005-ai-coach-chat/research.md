# Phase 0 Research: AI Coach Chat

**Feature**: `005-ai-coach-chat` | **Date**: 2026-07-20

Resolve as incógnitas técnicas do spec antes do desenho. Cada item registra decisão, justificativa e alternativas descartadas.

---

## R-001 — Sessão expirada (FR-042, FR-043)

**Histórico**: a primeira resposta do `/speckit-clarify` previa revalidação em segundo plano por refresh token. Marquei a premissa como não verificada e, ao abrir o código, ela não se confirmou: `packages/backend/src/lib/auth.ts` configura o `betterAuth` sem bloco `session` — sem `refreshToken`, `updateAge` ou `cookieCache` explícitos. Os refresh tokens do Google servem à comunicação com o provedor, não à sessão da aplicação. **O produto decidiu remover a revalidação do escopo**; sessão expirada leva direto ao login.

**Decisão**: no 401 vindo do `/api/ai`, redirecionar para `/login`. Sem tentativa silenciosa, sem verificação extra de sessão, sem reenvio automático.

**Justificativa**: nenhuma renovação de sessão expirada é possível no cliente com a configuração atual, e o login é feito com Google. Uma verificação intermediária de sessão adicionaria uma ida ao servidor que, na prática, quase sempre confirmaria a expiração — custo sem benefício observável.

**Distinção que precisa existir (FR-043)**: apenas o 401 dispara o redirecionamento. Falha de rede, indisponibilidade do serviço ou erro do modelo seguem o caminho de mensagem não entregue com reenvio (R-002). Tratar tudo como expiração expulsaria o aluno do app por uma queda momentânea de rede.

**Alternativas descartadas**:
- Verificar a sessão antes de redirecionar — descartado pelo produto; ida ao servidor sem ganho prático.
- Configurar refresh token no better-auth — trabalho de backend, fora do escopo desta feature.
- Tratar 401 como falha comum com reenvio — o aluno reenviaria em laço sem nunca ter sucesso.

---

## R-002 — Mensagem não entregue e reenvio (FR-040, FR-041)

**Decisão**: usar `error` + `regenerate()` do `useChat`, sem estado paralelo.

**Justificativa**: quando `sendMessage` falha, o AI SDK mantém a mensagem do aluno em `messages` (inserção otimista) e popula `error`. `regenerate()` reprocessa a última mensagem do aluno reaproveitando o texto original — exatamente o que o FR-041 exige. A documentação do AI SDK apresenta esse par como o padrão de retry, e `status === 'error'` habilita o controle.

**Consequência de desenho**: a marcação de "não entregue" é derivada de `error != null` combinada com a última mensagem ser do aluno — não é um campo persistido. Isso satisfaz o edge case "reenvio que falha novamente" sem acumular cópias, porque nenhuma mensagem nova é inserida no reenvio.

**Alternativas descartadas**:
- Estado próprio de mensagens falhas — duplicaria o que o hook já modela e contraria a Regra II da constituição.
- Reenvio via novo `sendMessage` com o mesmo texto — inseriria uma segunda cópia da mensagem na conversa.

---

## R-003 — Comportamento de rolagem durante streaming (FR-026 a FR-030)

**Decisão**: manter `use-stick-to-bottom` via o componente `Conversation` já existente, e acrescentar um `ConversationScrollButton`.

**Justificativa**: `use-stick-to-bottom@1.1.3` já é dependência e é a base do `Conversation` local. O `useStickToBottomContext()` expõe `isAtBottom` e `scrollToBottom`, que são precisamente o que FR-029 (controle de retorno ao final) e FR-026/FR-027 (seguir só enquanto no final; parar na intenção do aluno) requerem. A biblioteca também trata FR-030, preservando posição diante de crescimento de conteúdo e redimensionamento.

**Sobre o `message-scroller` do shadcn**: o documento de diretrizes citado no pedido descreve o componente `message-scroller` do registry Base UI, que **não está disponível** — `components.json` declara apenas `@shadcn`, e a busca no registry não retorna o item. As 15 diretrizes daquele documento são princípios de UX, não um contrato de API; foram traduzidas em FR-026..FR-030 e são atendidas pelo `use-stick-to-bottom`. Adotamos os princípios, não o componente.

**Alternativas descartadas**:
- Adicionar o registry Base UI só por esse componente — dependência nova sem justificativa, contra o Princípio V, tendo equivalente já instalado.
- `scrollIntoView` manual (abordagem atual do `chat.tsx`) — rola incondicionalmente e viola FR-027, que é o ponto central das diretrizes.

---

## R-004 — Componentes de ai-elements a acrescentar

**Decisão**: acrescentar `ConversationScrollButton` ao `conversation.tsx` local e um componente de carregamento; reutilizar `Message`, `Suggestion` e `PromptInput` como estão.

**Achado**: o `conversation.tsx` local é uma versão reduzida do oficial — contém apenas `Conversation` e `ConversationContent`. Faltam `ConversationScrollButton` (exigido por FR-029) e um indicador de carregamento (FR-017, FR-018).

**Cuidado de execução**: rodar `npx ai-elements@latest add conversation` **sobrescreveria** o arquivo local, descartando os ajustes já feitos (`initial="smooth"`, `resize="smooth"`, `role="log"`, espaçamentos). O `onboarding/page.tsx` depende desse arquivo e o FR-004 proíbe alterá-lo. **Acrescentar o subcomponente manualmente ao arquivo existente, em vez de rodar o CLI sobre ele.**

**Já disponível e reaproveitado sem mudança**:
- `PromptInputSubmit` já recebe `status: ChatStatus` e `onStop`, alternando ícone entre envio, `Spinner` (submitted), quadrado de parada (streaming) e erro. Cobre FR-015, FR-016 e FR-017 sem código novo.
- `Suggestions`/`Suggestion` já rolam horizontalmente via `ScrollArea` — cobre FR-025.
- `Message`/`MessageContent` já alinham aluno à direita e assistente à esquerda com os tokens corretos — cobre parte de FR-031.
- `ui/spinner.tsx` existe e é usado pelo `PromptInputSubmit`.

---

## R-005 — Indicador de processamento de ações (FR-018, FR-019)

**Decisão**: derivar o indicador do estado das partes da mensagem, exibindo um texto neutro ("Processando…") com `Spinner` quando o assistente está em `streaming` mas a última parte não é texto em progresso.

**Justificativa**: o backend usa `stepCountIs(10)` com ferramentas; durante uma chamada de ferramenta o stream emite partes de tipo `tool-*` e o texto pausa. Detectar "não há texto fluindo agora, mas o status ainda é streaming" é suficiente para o indicador genérico, e não expõe nome nem parâmetros de ferramenta — o que o FR-019 proíbe explicitamente.

**Alternativas descartadas**:
- Componente `Tool` do ai-elements — mostra nome, entrada e saída da ferramenta; proibido por FR-019.
- Indicador baseado em tempo (mostrar após N segundos sem token) — heurística frágil e não determinística para verificação manual.

---

## R-006 — Persistência do estado aberto/fechado (FR-006, FR-007)

**Decisão**: hook próprio em `packages/web/src/hooks/`, lendo e escrevendo `localStorage`, com o estado inicial `false` e leitura feita em `useEffect` após a montagem.

**Justificativa**: FR-007 exige URL limpa e botão "voltar" inerte, o que descarta `nuqs`. A leitura pós-montagem evita divergência de hidratação entre servidor e cliente, já que o servidor não tem acesso ao `localStorage`.

**Consequência aceita**: no primeiro quadro após o carregamento o painel está fechado, abrindo logo em seguida se o estado guardado disser que sim. Um cookie eliminaria essa transição, mas foi descartado na Q3 do clarify.

**Migração**: os parâmetros `chat_open` e `chat_initial_message` do `nuqs` deixam de existir. O `ChatOpenButton` passa a usar o hook. Como o `nuqs` continua em uso em outras telas, o pacote permanece.

---

## R-007 — Revalidação dos dados ao fechar (FR-008)

**Decisão**: chamar `router.refresh()` do `next/navigation` ao fechar o painel, apenas quando houve ao menos uma resposta concluída na conversa.

**Justificativa**: as telas buscam dados no servidor via `lib/dal.ts`; `router.refresh()` refaz a requisição dos Server Components mantendo o estado do cliente, que é o que FR-008 e o cenário 7 da História 1 descrevem. A condição de guarda evita refetch inútil quando o aluno apenas abriu e fechou o painel.

**Limite honesto**: revalida sempre que houve resposta, sem saber se o assistente de fato executou uma ferramenta — a resposta do `/api/ai` não expõe isso ao cliente de forma confiável. O custo é uma revalidação ocasionalmente desnecessária; o risco inverso (não revalidar após uma alteração real) é pior para o aluno.

**Alternativas descartadas**:
- Revalidar ao fim de cada resposta — rejeitado na Q2 do clarify.
- Inspecionar partes `tool-*` do stream para detectar mutações — acoplaria o frontend aos nomes internos das ferramentas do backend, contra a regra de contrato único.

---

## R-008 — Token de cor do indicador "Online" (FR-031)

**Achado**: o `chat.tsx` atual usa a classe `bg-online`, mas **`--online` não existe em `globals.css`**. O ponto verde do cabeçalho está invisível hoje. O `ui/chat-header.tsx` usa `bg-green-600` fixo, o que a Regra III da constituição proíbe.

**Decisão**: adicionar o token `--online` em `globals.css` (tema claro e escuro), com o mapeamento `--color-online`, e usá-lo no cabeçalho novo.

**Justificativa**: a constituição permite cor fora de token apenas quando nenhum token existe — e então exige criar o token. É exatamente este caso.

---

## R-009 — Geometria do painel (FR-034, FR-035)

**Decisão**: sobreposição fixa com área superior escurecida e painel ancorado à base, ocupando a largura da viewport com margem lateral em qualquer tamanho; `max-h` proporcional em vez de altura fixa; balões limitados por `max-w` para preservar comprimento de linha.

**Justificativa**: a Q4 do clarify definiu largura total. A constituição proíbe altura fixa em CSS, então a geometria vertical do Figma (topo em 160px de 785px) vira `top` proporcional com `min-h`/`max-h`, não `h-[625px]`.

**Ponto de atenção para validação**: largura total em 1280px+ produz linhas longas; o FR-035 existe para conter isso via `max-w` no balão. Essa é a combinação a conferir com atenção na etapa de validação visual em desktop.

---

## Dependências novas

**Nenhuma.** Todos os requisitos são atendidos por pacotes já presentes: `@ai-sdk/react`, `ai`, `use-stick-to-bottom`, `streamdown`, `lucide-react`, `next`, `better-auth`. Princípio V satisfeito sem análise de custo, pois nada é acrescentado.
