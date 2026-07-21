# Quickstart / Validation Guide: AI Coach Chat

**Feature**: `005-ai-coach-chat` | **Date**: 2026-07-20

A constituição do projeto proíbe testes automatizados (Princípio I). Toda verificação abaixo é manual. Um cenário só conta como aprovado quando observado no navegador.

---

## Pré-requisitos

```bash
# na raiz
nvm use                 # Node v24.14.0
npm install

# backend
cd packages/backend
docker compose up -d    # Postgres
npx prisma migrate dev
npm run dev             # porta 3333, docs em /docs

# web (outro terminal)
cd packages/web
npm run dev             # porta 3000
```

Ambos os pacotes exigem `.env` (`cp .env.example .env`). O backend precisa de `SYSTEM_PROMPT` e da credencial do Gemini, senão o `/api/ai` falha e todos os cenários de conversa ficam bloqueados.

**Necessário para validar**: um usuário autenticado **com plano de treino ativo**. Sem plano ativo a home redireciona para `/onboarding`, onde o painel não é exibido (FR-003) — nesse estado a feature não é observável.

---

## Validação obrigatória com chrome-devtools MCP

`CLAUDE.md` exige validação por chrome-devtools MCP em toda mudança de frontend. Para cada bloco: abrir a página, aguardar renderização completa, capturar screenshot, conferir alinhamento, espaçamento, tipografia, cores, responsividade, transbordo, erros de console e requisições falhas. Comparar com o nó Figma `3606:1016`.

Larguras obrigatórias: **320px** e **1280px**.

---

## Bloco 1 — Conversa e streaming (História 1, P1)

| # | Ação | Esperado | Requisitos |
|---|---|---|---|
| 1.1 | Abrir `/`, tocar no botão sparkles | Painel sobrepõe o conteúdo; cabeçalho "Coach AI"; ponto verde visível; campo focável | FR-001, FR-002, FR-031 |
| 1.2 | Enviar "Qual meu treino de hoje?" | Mensagem à direita imediatamente; resposta cresce à esquerda em incrementos | FR-011, FR-013 |
| 1.3 | Observar resposta com lista ou negrito | Formatação renderizada durante a chegada, sem quebra de layout | FR-012 |
| 1.4 | Tentar enviar durante o streaming | Envio indisponível; botão vira controle de parada | FR-015 |
| 1.5 | Tocar no "X" e na área escurecida | Fecha nos dois casos; tela de origem intacta, mesma posição de rolagem | FR-005 |
| 1.6 | Pedir "Altere meu plano de treino" e observar a pausa da ferramenta | Indicador genérico de processamento; **sem** nome ou parâmetro de ferramenta na tela | FR-018, FR-019 |
| 1.7 | Após o item 1.6, fechar o painel | Tela de origem exibe os dados atualizados sem recarregar | FR-008 |

**Ponto de atenção em 1.6**: o backend roda até 10 passos. Confirmar que em nenhum momento a interface fica mais de 2 segundos sem sinal de atividade (SC-010).

---

## Bloco 2 — Sugestões (História 2, P2)

| # | Ação | Esperado | Requisitos |
|---|---|---|---|
| 2.1 | Abrir painel em conversa vazia | Exatamente 3 pílulas, nesta ordem: "Alterar plano de treino", "Mudar objetivo", "Atualizar informações" | FR-022 |
| 2.2 | Em 320px, arrastar sobre as pílulas | Rolam lateralmente; **página não rola na horizontal** | FR-025, FR-036 |
| 2.3 | Tocar em "Mudar objetivo" | Texto enviado como mensagem do aluno; assistente responde | FR-023 |
| 2.4 | Observar após o item 2.3 | Sugestões desaparecem | FR-024 |

---

## Bloco 3 — Rolagem durante streaming (História 3, P2)

Peça um plano de treino completo para garantir resposta longa.

| # | Ação | Esperado | Requisitos |
|---|---|---|---|
| 3.1 | Ficar no final durante o streaming | Visualização acompanha o conteúdo novo | FR-026 |
| 3.2 | **Rolar para cima durante o streaming** | Rolagem automática cessa; visualização **não** é puxada para baixo | FR-027 |
| 3.3 | Selecionar texto durante o streaming | Idem 3.2 — seleção também é intenção de leitura | FR-027 |
| 3.4 | Observar afastado do final | Controle de retorno ao final visível | FR-029 |
| 3.5 | Acionar o controle | Vai ao final e retoma o acompanhamento | FR-029 |
| 3.6 | Enviar nova pergunta | Pergunta permanece visível; resposta cresce dentro da área visível | FR-028 |
| 3.7 | Redimensionar a janela durante o streaming | Posição de leitura preservada | FR-030 |

**3.2 é o cenário central desta feature.** É o que a abordagem anterior (`scrollIntoView` incondicional) violava. Se falhar, nada mais neste bloco importa.

---

## Bloco 4 — Persistência de estado (História 4, P3)

| # | Ação | Esperado | Requisitos |
|---|---|---|---|
| 4.1 | Abrir chat na home, navegar para `/workout-plan` | Continua aberto | FR-006 |
| 4.2 | Recarregar a página | Reabre aberto | FR-006 |
| 4.3 | Observar a barra de endereço | **Nada sobre o painel na URL** | FR-007 |
| 4.4 | Com o chat aberto, acionar "voltar" do navegador | Volta à tela anterior com o chat ainda aberto | FR-007 |
| 4.5 | Fechar, navegar e recarregar | Permanece fechado | FR-006 |
| 4.6 | Acessar `/login` e `/onboarding` | Nem painel nem botão sparkles; onboarding com o chat próprio intacto | FR-003, FR-004 |
| 4.7 | Reabrir após navegação | Conversa vazia, com saudação e sugestões | FR-024 |

**Conferir em 4.2**: pode haver um quadro inicial com o painel fechado antes de abrir (limitação documentada em `research.md` R-006). Aceitável se for imperceptível; se piscar de forma incômoda, registrar como achado.

---

## Bloco 5 — Falhas e interrupções (História 5, P3)

| # | Ação | Esperado | Requisitos |
|---|---|---|---|
| 5.1 | **Parar o backend**, enviar mensagem | Erro claro em português; mensagem fica marcada como não entregue; controle de reenvio ao lado | FR-020, FR-040 |
| 5.2 | Religar o backend, acionar o reenvio | Texto original reenviado **sem redigitar**; marcação some; assistente responde | FR-041, SC-012 |
| 5.3 | Com o backend parado, reenviar duas vezes | Marcação permanece; **sem cópias duplicadas** da mensagem | Edge case |
| 5.4 | Iniciar resposta longa e acionar parada | Transmissão para; texto parcial permanece; campo liberado | FR-016 |
| 5.5 | Fechar painel durante streaming | Requisição abortada — conferir na aba Network | FR-021 |
| 5.6 | Digitar só espaços e tentar enviar | Nada enviado; envio indisponível | FR-014 |
| 5.7 | Apagar o cookie de sessão e enviar | Redirecionamento para `/login` | FR-042 |
| 5.8 | Com o backend parado (falha de rede, não 401), enviar | **Permanece na tela** com a mensagem não entregue; **não** redireciona ao login | FR-043 |

**5.7 e 5.8 formam um par — validar os dois juntos.** O ponto do FR-043 é a distinção: só o 401 redireciona. Se 5.8 também levar ao login, uma queda momentânea de rede passa a expulsar o aluno do app, que é o defeito que esse requisito existe para impedir.

---

## Bloco 6 — Responsividade e design

| # | Ação | Esperado | Requisitos |
|---|---|---|---|
| 6.1 | 320px: percorrer todos os blocos | Sem rolagem horizontal nem conteúdo cortado | FR-036 |
| 6.2 | 1280px: abrir o painel | Largura total com margem lateral; **balões limitam o comprimento da linha** | FR-034, FR-035 |
| 6.3 | Medir alvos interativos | Todos ≥ 44×44px | FR-036 |
| 6.4 | Mobile: abrir teclado virtual | Campo e última mensagem visíveis; cabeçalho não cortado | Edge case |
| 6.5 | Enviar mensagem muito longa | Campo cresce até um limite e rola internamente | Edge case |
| 6.6 | Pedir resposta com URL longa ou bloco de código | Contido no balão; sem rolagem horizontal da página | Edge case |
| 6.7 | Comparar com o Figma `3606:1016` | Cabeçalho, balões, pílulas e campo correspondem | FR-031 |
| 6.8 | Navegar só por teclado | Percorre a conversa; `Enter` envia, `Shift+Enter` quebra linha; foco preservado | FR-038, Edge case |

**6.2 é o ponto frágil desta feature.** Largura total em desktop foi escolha explícita do produto contra a recomendação de painel flutuante; o FR-035 é a mitigação. Se a leitura ficar desconfortável mesmo com o `max-w` do balão, é achado de produto, não defeito de implementação — reportar em vez de contornar sozinho.

---

## Bloco 7 — Limpeza (FR-039)

| # | Verificação | Esperado |
|---|---|---|
| 7.1 | `grep -rn "chat_open\|chat_initial_message" packages/web/src` | Sem ocorrências |
| 7.2 | `packages/web/src/components/chat-input.tsx` | Removido — era um `<Input />` vazio sem uso |
| 7.3 | `ui/chat-message.tsx` | Removido se ninguém mais o usa — conferir antes |
| 7.4 | `ui/chat-header.tsx` | **Mantido** — o onboarding depende dele (FR-004) |
| 7.5 | `npm run lint` em `packages/web` | Sem erro |
| 7.6 | `npm run build` em `packages/web` | Compila |

**Cuidado em 7.3 e 7.4**: `ui/chat-header.tsx` é usado pelo `onboarding/page.tsx`. Removê-lo quebra uma tela que o FR-004 manda não tocar. Confirmar consumidores com `grep` antes de qualquer remoção.

---

## Critério de conclusão

A feature está pronta quando todos os blocos passam nas duas larguras, sem erro de console, sem requisição falha inesperada, e a interface corresponde ao Figma. Divergência remanescente deve ser explicada e corrigida, e a validação repetida — não registrada como aceitável sem justificativa.
