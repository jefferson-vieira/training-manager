# Feature Specification: AI Coach Chat

**Feature Branch**: `005-ai-coach-chat`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "chatbot ia - crie a tela em https://www.figma.com/design/Vdvl7fFXQ4TH0ktjwhr7dK/FIT.AI--Alunos---Copy-?node-id=3606-1016. Seja fiel ao figma. A tela é um chatbot que responde o usuário com IA via API pelo POST /ai. Todas as especificidades do bot de IA já estão configurados no backend; ou seja, essa feature é a construção do chat e a comunicação com a API. A feature já foi desenvolvida uma versão inicial manualmente, veja o packages/web/src/components/chat.tsx; portanto você deve analisar o que já foi feito e refatorar conforme o necessário para finalizar a feature; não se preocupe em preservar qualquer código já escrito podendo descartá-lo conforme fizer sentido. O chat deve poder ser exibido em qualquer tela, exceto login e onboarding. A tela onboarding também já utiliza uma versão do chat e futuramente utilizará o chat construido mas por hora não faça nada com ele. O estado de aberto e fechado do chat deve ser preservado entre páginas e recarregamentos. O chat é aberto ao clicar no botão central ícone 'sparkles'. Ao iniciar uma conversa as sugestões de mensagens são: - Alterar plano de treino; - Mudar objetivo; - Atualizar informações. Você deve seguir as diretivas em https://ui.shadcn.com/docs/components/base/message-scroller#what-makes-a-great-streaming-chat-experience sobre como criar um bom chat. A comunicação com a API deve ser feita com a ai-sdk. De preferência para os componentes do shadcn, e os especificos de chat crie com a ai-elements https://elements.ai-sdk.dev/."

## Clarifications

### Session 2026-07-20

- Q: O que o aluno vê enquanto o assistente executa uma ação (criar plano, atualizar perfil) no meio da resposta? → A: Indicador genérico de "processando", sem expor detalhes da ferramenta
- Q: Quando o assistente altera plano ou perfil, como as telas por baixo do painel se atualizam? → A: Revalidação dos dados da tela de origem ao fechar o painel
- Q: Como o estado aberto/fechado deve ser persistido, considerando o efeito na URL e no botão voltar? → A: Armazenamento local do navegador; URL permanece limpa e o botão voltar não afeta o chat
- Q: Como o painel deve se comportar em telas largas (1280px+), já que o Figma só define o layout de telefone? → A: Largura total da viewport com margem lateral, em qualquer tamanho de tela
- Q: Qual grafia canonizar para o nome do assistente exibido no cabeçalho? → A: "Coach AI"
- Q: Quando o envio falha, como o aluno tenta novamente? → A: A mensagem que falhou permanece na conversa marcada com erro, com controle de reenvio ao lado
- Q: O que acontece quando a sessão expira e o aluno tenta enviar uma mensagem? → A: Redirecionamento direto para a tela de login. (Revisado após verificação de código: a resposta inicial previa revalidação por refresh token, mas o `better-auth` está com configuração de sessão padrão e o login é feito com Google — não existe renovação de sessão expirada no cliente. A tentativa silenciosa foi removida do escopo.)
- Q: O aluno precisa de um controle para reiniciar a conversa sem fechar o painel? → A: Não; reiniciar é fechar e reabrir o painel

## User Scenarios *(mandatory)*

### User Story 1 - Conversar com o Coach AI a partir de qualquer tela (Priority: P1)

Um aluno autenticado está em qualquer tela do app (home, plano de treino, progresso, perfil). Ele toca no botão central da barra inferior, identificado pelo ícone de "sparkles", e um painel de conversa sobreposto abre por cima do conteúdo atual. O painel apresenta o cabeçalho "Coach AI" com indicador "Online", uma saudação de boas-vindas do assistente e um campo para digitar. O aluno escreve uma pergunta sobre seu treino, envia, e vê a resposta do assistente aparecer progressivamente, palavra a palavra, formatada (listas, ênfases, parágrafos). Ele pode fechar o painel a qualquer momento pelo botão "X" ou tocando fora dele, retornando exatamente para onde estava na tela de origem.

**Why this priority**: É o núcleo da feature — sem enviar mensagem e receber resposta em streaming, não há produto. Entrega valor sozinha: o aluno consegue tirar dúvidas e pedir alterações ao Coach AI de qualquer lugar do app.

**Independent Verification**: Com o app rodando localmente e um usuário autenticado, abrir a home, tocar no botão "sparkles", digitar "Qual meu treino de hoje?" e observar a resposta sendo transmitida incrementalmente no painel; fechar e confirmar que a tela de origem permanece intacta.

**Acceptance Scenarios**:

1. **Given** um aluno autenticado em qualquer tela do app com o chat fechado, **When** ele toca no botão central com ícone "sparkles", **Then** o painel de conversa abre sobreposto ao conteúdo, com cabeçalho "Coach AI", indicador "Online" e campo de entrada visível e focável.
2. **Given** o painel de conversa aberto e vazio, **When** o aluno digita uma mensagem e a envia, **Then** a mensagem aparece imediatamente alinhada à direita e a resposta do assistente começa a ser exibida progressivamente à esquerda, sem esperar a resposta completa.
3. **Given** uma resposta do assistente em transmissão, **When** o conteúdo contém formatação (listas, negrito, parágrafos), **Then** ele é renderizado formatado e legível enquanto ainda está chegando, sem quebrar o layout.
4. **Given** o painel aberto, **When** o aluno toca no "X" do cabeçalho ou na área escurecida fora do painel, **Then** o painel fecha e a tela de origem permanece no mesmo estado e posição de rolagem.
5. **Given** o aluno enviou uma mensagem e a resposta ainda está sendo transmitida, **When** ele tenta enviar outra mensagem, **Then** o envio fica indisponível até a resposta atual terminar, com sinalização visual clara do estado ocupado.
6. **Given** o assistente interrompe o texto para executar uma ação sobre os dados do aluno, **When** o aluno observa a conversa, **Then** um indicador genérico de processamento é exibido até o texto voltar a fluir, sem revelar nomes de ferramentas ou parâmetros.
7. **Given** o assistente alterou o plano de treino ou o perfil durante a conversa, **When** o aluno fecha o painel, **Then** a tela de origem exibe os dados atualizados sem que ele precise recarregar a página.

---

### User Story 2 - Iniciar a conversa por sugestões prontas (Priority: P2)

Um aluno abre o Coach AI sem saber o que pedir. Acima do campo de entrada, ele vê três sugestões em formato de pílulas roláveis horizontalmente: "Alterar plano de treino", "Mudar objetivo" e "Atualizar informações". Ao tocar em uma delas, a frase é enviada como se ele mesmo a tivesse digitado, e o assistente responde. Assim que a conversa começa, as sugestões deixam de ocupar espaço.

**Why this priority**: Reduz o atrito do primeiro uso e direciona o aluno para as três ações que o Coach AI de fato executa. Depende do fluxo base (P1), mas é independentemente verificável e agrega valor mensurável de ativação.

**Independent Verification**: Abrir o chat pela primeira vez, confirmar as três sugestões na ordem especificada, tocar em "Mudar objetivo" e verificar que a frase é enviada e respondida; confirmar que as sugestões somem depois disso.

**Acceptance Scenarios**:

1. **Given** o painel aberto sem nenhuma mensagem na conversa, **When** o aluno observa a área acima do campo de entrada, **Then** as três sugestões aparecem na ordem "Alterar plano de treino", "Mudar objetivo", "Atualizar informações".
2. **Given** as sugestões visíveis em uma tela estreita (320px) onde não cabem todas, **When** o aluno arrasta horizontalmente sobre elas, **Then** as sugestões rolam lateralmente sem gerar rolagem horizontal na página.
3. **Given** as sugestões visíveis, **When** o aluno toca em uma delas, **Then** o texto da sugestão é enviado como mensagem do aluno e o assistente inicia a resposta.
4. **Given** a conversa já contém ao menos uma mensagem, **When** o aluno olha a área acima do campo de entrada, **Then** as sugestões não são mais exibidas.

---

### User Story 3 - Leitura confortável durante o streaming (Priority: P2)

Um aluno recebe uma resposta longa do Coach AI. Enquanto o texto chega, a conversa acompanha o final da resposta automaticamente. Se o aluno rolar para cima para reler algo anterior, a conversa para de se mover sozinha e respeita onde ele está, mesmo com a resposta ainda crescendo. Um indicador permite voltar ao final da conversa com um toque. Ao chegar de volta ao final, o acompanhamento automático é retomado.

**Why this priority**: É a diferença entre um chat utilizável e um chat frustrante em respostas longas — que são a norma para planos de treino. Verificável de forma independente e exigido explicitamente pelas diretrizes de streaming adotadas.

**Independent Verification**: Pedir ao Coach AI um plano de treino completo (resposta longa), rolar para cima durante o streaming e confirmar que a visualização não é puxada para baixo; tocar no controle de "voltar ao final" e confirmar o retorno e a retomada do acompanhamento.

**Acceptance Scenarios**:

1. **Given** o aluno está no final da conversa, **When** uma resposta é transmitida, **Then** a visualização acompanha o conteúdo novo mantendo o final visível.
2. **Given** uma resposta em transmissão, **When** o aluno rola para cima ou seleciona um trecho de texto, **Then** a conversa deixa de rolar automaticamente e permanece onde o aluno a deixou.
3. **Given** o aluno rolou para longe do final com conteúdo novo chegando, **When** ele observa a interface, **Then** existe um controle visível para voltar ao final da conversa.
4. **Given** o aluno rolou para cima, **When** ele aciona o controle de voltar ao final, **Then** a conversa vai para a última mensagem e volta a acompanhar automaticamente as próximas.
5. **Given** uma nova pergunta é enviada, **When** a resposta começa a ser transmitida, **Then** a mensagem do aluno é posicionada de forma que a resposta cresça dentro da área visível, sem empurrar a pergunta para fora da tela.

---

### User Story 4 - Estado do chat preservado ao navegar e recarregar (Priority: P3)

Um aluno abre o Coach AI na home e, com o painel aberto, navega para a tela de plano de treino: o painel continua aberto. Ele recarrega a página: o painel continua aberto. Ao fechar o painel e navegar novamente, ele permanece fechado. O painel nunca aparece nas telas de login e onboarding.

**Why this priority**: Melhora a continuidade da experiência, mas o chat é plenamente útil sem isso. Verificável isoladamente.

**Independent Verification**: Abrir o chat na home, navegar para "/workout-plan" e recarregar, confirmando que continua aberto; fechar, navegar e confirmar que continua fechado; acessar "/login" e "/onboarding" e confirmar ausência do painel e do botão de abertura.

**Acceptance Scenarios**:

1. **Given** o chat aberto em uma tela, **When** o aluno navega para outra tela do app, **Then** o chat continua aberto.
2. **Given** o chat aberto, **When** o aluno recarrega a página, **Then** o chat reabre automaticamente no estado aberto.
3. **Given** o chat fechado, **When** o aluno navega entre telas ou recarrega, **Then** o chat permanece fechado.
4. **Given** o aluno acessa a tela de login ou de onboarding, **When** a tela é exibida, **Then** o painel do Coach AI e o botão de abertura não são exibidos e nenhum estado de chat é aplicado a essas telas.
5. **Given** o chat foi reaberto após navegação ou recarregamento, **When** o aluno observa o conteúdo, **Then** a conversa começa vazia, com a saudação inicial e as sugestões disponíveis.
6. **Given** o chat está aberto, **When** o aluno observa o endereço da página, **Then** nenhum indício do estado do painel aparece na URL.
7. **Given** o chat está aberto e o aluno navegou entre telas, **When** ele aciona o botão "voltar" do navegador, **Then** ele retorna à tela anterior com o chat ainda aberto, sem que o painel abra ou feche por causa da navegação.

---

### User Story 5 - Falhas e interrupções tratadas com clareza (Priority: P3)

O aluno envia uma mensagem e a comunicação falha (rede indisponível, erro do serviço). Em vez de uma tela travada ou silenciosa, a mensagem fica na conversa marcada como não entregue, com um controle para reenviá-la sem redigitar. Se a falha for de sessão expirada, ele é levado à tela de login para autenticar de novo. Se decidir que a resposta em andamento não interessa mais, ele pode interrompê-la e continuar conversando.

**Why this priority**: Necessário para robustez percebida, mas o caminho feliz entrega valor sem isso.

**Independent Verification**: Com o backend parado, enviar uma mensagem e confirmar a marcação de não entregue com o controle de reenvio; religar o backend, acionar o reenvio e confirmar que a mensagem original é reaproveitada e respondida; com o backend ativo, iniciar uma resposta longa, interrompê-la e confirmar que o texto parcial permanece e um novo envio é possível.

**Acceptance Scenarios**:

1. **Given** o serviço de IA está indisponível, **When** o aluno envia uma mensagem, **Then** uma mensagem de erro clara em português é exibida, a mensagem enviada permanece na conversa marcada como não entregue e um controle de reenvio fica disponível ao lado dela.
2. **Given** uma mensagem marcada como não entregue, **When** o aluno aciona o controle de reenvio e a comunicação funciona, **Then** o texto original é reenviado sem redigitação, a marcação de erro desaparece e o assistente responde normalmente.
3. **Given** uma resposta está sendo transmitida, **When** o aluno aciona o controle de interromper, **Then** a transmissão para, o texto já recebido permanece visível e o campo de entrada volta a aceitar novas mensagens.
4. **Given** a sessão do aluno expirou, **When** ele tenta enviar uma mensagem, **Then** ele é levado à tela de login em vez de receber uma falha silenciosa ou repetida.
5. **Given** o serviço está indisponível por falha de rede, e não por sessão expirada, **When** o envio falha, **Then** o aluno permanece na tela com a mensagem marcada como não entregue, sem ser redirecionado ao login.
6. **Given** o aluno digita apenas espaços em branco, **When** ele tenta enviar, **Then** nenhuma mensagem é enviada e o envio permanece indisponível.

---

### Edge Cases

- **Resposta muito longa**: a conversa deve permanecer fluida ao rolar e ao continuar recebendo conteúdo, sem travamentos perceptíveis.
- **Mensagem do aluno muito longa**: o campo de entrada cresce até um limite e passa a rolar internamente, sem empurrar o painel para fora da tela nem cobrir a conversa.
- **Conteúdo indivisível na resposta** (URL longa, bloco de código, tabela): fica contido na largura do balão, com rolagem própria quando necessário, sem gerar rolagem horizontal na página.
- **Toque fora do painel durante o streaming**: o painel fecha; ao reabrir, a conversa recomeça vazia (histórico não é preservado — ver Assumptions).
- **Reabertura enquanto a resposta anterior estava em transmissão**: nenhuma transmissão órfã continua consumindo recursos após o fechamento.
- **Teclado virtual aberto em mobile**: o campo de entrada e a última mensagem permanecem visíveis; o painel se ajusta sem cortar o cabeçalho.
- **Envio por teclado**: `Enter` envia a mensagem e `Shift+Enter` insere uma quebra de linha.
- **Tela larga (1280px+)**: o painel acompanha a largura da viewport com margem lateral; os balões de mensagem limitam o comprimento da linha para não prejudicar a leitura.
- **Rotação de tela / redimensionamento durante o streaming**: a posição de leitura é preservada.
- **Botão "voltar" do navegador com o painel aberto**: a navegação ocorre normalmente e o painel permanece aberto, sem ser tratado como um passo do histórico.
- **Pausa longa durante execução de uma ação do assistente**: o indicador de processamento permanece visível até o texto voltar a fluir ou até a resposta terminar.
- **Reenvio que falha novamente**: a mensagem continua marcada como não entregue e o controle de reenvio permanece disponível, sem acumular cópias da mesma mensagem na conversa.
- **Painel fechado com uma mensagem não entregue pendente**: a conversa é descartada como qualquer outra, sem tentativa de reenvio posterior.
- **Sessão expirada durante uma resposta em transmissão**: a transmissão é encerrada e o aluno é levado ao login; a conversa é descartada como em qualquer fechamento do painel.

## Requirements *(mandatory)*

### Functional Requirements

#### Acesso e visibilidade

- **FR-001**: O sistema MUST exibir um botão de abertura do Coach AI, com ícone "sparkles", na posição central da barra de navegação inferior de todas as telas autenticadas do app.
- **FR-002**: O sistema MUST abrir o painel de conversa sobreposto ao conteúdo da tela atual quando o aluno acionar esse botão, sem navegar para outra rota nem perder o estado da tela de origem.
- **FR-003**: O sistema MUST NOT exibir o painel do Coach AI nem seu botão de abertura nas telas de login e de onboarding.
- **FR-004**: O sistema MUST manter a tela de onboarding com sua implementação de conversa atual, inalterada por esta feature.
- **FR-005**: O sistema MUST permitir fechar o painel pelo controle "X" do cabeçalho e por toque/clique na área escurecida fora do painel.
- **FR-006**: O sistema MUST preservar o estado aberto/fechado do painel ao navegar entre telas do app e ao recarregar a página, guardando esse estado no armazenamento local do navegador.
- **FR-007**: O endereço da página MUST NOT registrar o estado do painel, e o botão "voltar" do navegador MUST navegar entre telas sem abrir nem fechar o Coach AI.
- **FR-008**: O sistema MUST revalidar os dados da tela de origem quando o painel for fechado, de modo que alterações feitas pelo assistente no perfil ou no plano de treino apareçam ao aluno sem exigir recarregamento manual.

#### Conversa e comunicação

- **FR-009**: O sistema MUST enviar as mensagens do aluno ao serviço de IA existente e MUST NOT duplicar, reimplementar ou alterar as regras de comportamento do assistente, que residem no backend.
- **FR-010**: O sistema MUST transmitir a autenticação do aluno em cada requisição ao serviço de IA, de modo que o assistente opere sobre os dados do usuário correto.
- **FR-011**: O sistema MUST exibir a resposta do assistente de forma incremental, à medida que é recebida, sem aguardar a resposta completa.
- **FR-012**: O sistema MUST renderizar o conteúdo formatado da resposta (parágrafos, listas, ênfase) de forma legível durante e após a transmissão.
- **FR-013**: O sistema MUST exibir a mensagem do aluno na conversa imediatamente após o envio, antes de qualquer resposta.
- **FR-014**: O sistema MUST impedir o envio de mensagens vazias ou compostas apenas por espaços em branco.
- **FR-015**: O sistema MUST impedir novo envio enquanto uma resposta estiver em transmissão, sinalizando visualmente o estado ocupado.
- **FR-016**: O sistema MUST oferecer um controle para interromper a resposta em transmissão, preservando o texto já recebido e liberando o campo de entrada.
- **FR-017**: O sistema MUST exibir uma indicação de atividade entre o envio da mensagem e a chegada do primeiro trecho da resposta.
- **FR-018**: O sistema MUST exibir um indicador genérico de processamento enquanto o assistente executa uma ação sobre os dados do aluno, de modo que a interface nunca pareça parada durante pausas na transmissão do texto.
- **FR-019**: O indicador de processamento MUST NOT expor nomes de ferramentas, parâmetros ou resultados brutos das ações executadas pelo assistente.
- **FR-020**: O sistema MUST exibir mensagem de erro compreensível em português quando a comunicação falhar, permitindo nova tentativa sem recarregar a página.
- **FR-021**: O sistema MUST encerrar qualquer transmissão em andamento quando o painel for fechado, sem deixar requisições órfãs ativas.
- **FR-040**: Uma mensagem cujo envio falhou MUST permanecer visível na conversa, marcada como não entregue, acompanhada de um controle de reenvio.
- **FR-041**: O controle de reenvio MUST reaproveitar o texto original da mensagem, sem exigir que o aluno o redigite, e MUST remover a marcação de erro quando o reenvio for bem-sucedido.
- **FR-042**: Diante de falha por sessão expirada, o sistema MUST redirecionar o aluno para a tela de login.
- **FR-043**: O sistema MUST distinguir falha por sessão expirada das demais falhas de comunicação, aplicando o redirecionamento apenas ao primeiro caso; falhas de rede ou do serviço seguem o tratamento de mensagem não entregue com reenvio (FR-040, FR-041).

#### Sugestões

- **FR-022**: O sistema MUST exibir, enquanto a conversa não tiver nenhuma mensagem, exatamente três sugestões nesta ordem: "Alterar plano de treino", "Mudar objetivo", "Atualizar informações".
- **FR-023**: O sistema MUST enviar o texto da sugestão como mensagem do aluno quando ela for acionada.
- **FR-024**: O sistema MUST ocultar as sugestões assim que a conversa contiver ao menos uma mensagem.
- **FR-025**: O sistema MUST permitir rolagem horizontal das sugestões quando não couberem na largura disponível, sem provocar rolagem horizontal da página.

#### Comportamento de rolagem durante o streaming

- **FR-026**: O sistema MUST acompanhar automaticamente o conteúdo novo apenas enquanto o aluno estiver no final da conversa.
- **FR-027**: O sistema MUST interromper o acompanhamento automático assim que o aluno indicar intenção de leitura — rolar para cima, selecionar texto ou navegar por teclado — e MUST NOT reposicionar a visualização contra essa intenção.
- **FR-028**: O sistema MUST posicionar cada novo turno de forma que a resposta cresça dentro da área visível, mantendo visível a mensagem que a originou.
- **FR-029**: O sistema MUST exibir um controle de retorno ao final da conversa quando o aluno estiver afastado do final, e MUST retomar o acompanhamento automático quando ele for acionado.
- **FR-030**: O sistema MUST preservar a posição de leitura diante de mudanças de layout durante a transmissão (crescimento do conteúdo, redimensionamento da janela, abertura do teclado virtual).

#### Interface e design

- **FR-031**: A interface MUST ser fiel ao design de referência do Figma (nó `3606:1016`): cabeçalho com ícone "sparkles" em avatar circular, título "Coach AI", indicador "Online" com marcador verde e controle "X" alinhado à direita; mensagens do assistente alinhadas à esquerda em balão de fundo neutro e mensagens do aluno alinhadas à direita em balão de destaque; sugestões em pílulas na base; campo de entrada arredondado com botão de envio circular contendo seta para cima.
- **FR-032**: O nome exibido do assistente MUST ser "Coach AI" em toda a interface desta feature.
- **FR-033**: O sistema MUST exibir uma saudação inicial do assistente ao abrir uma conversa vazia, conforme o design de referência.
- **FR-034**: O painel MUST ocupar a largura da viewport com margem lateral em qualquer tamanho de tela, mantendo a mesma geometria vertical do design de referência — área superior escurecida e painel ancorado à base.
- **FR-035**: Em telas largas, os balões de mensagem MUST manter comprimento de linha legível dentro do painel, sem esticar o texto de ponta a ponta da viewport.
- **FR-036**: A interface MUST ser utilizável de 320px a 1280px+ sem rolagem horizontal, corte de conteúdo ou sobreposição indevida, e todos os alvos interativos MUST ter no mínimo 44×44px.
- **FR-037**: O sistema MUST reutilizar os componentes do design system existente e os componentes de conversa já presentes no projeto, evitando controles construídos do zero quando houver equivalente disponível.
- **FR-038**: A conversa MUST ser navegável por teclado e leitores de tela, com foco preservado durante a transmissão e anúncio das mensagens novas em ritmo confortável.
- **FR-039**: A implementação anterior do painel MUST ser substituída pela nova, sem deixar código, componentes ou estados obsoletos no projeto.
- **FR-044**: O cabeçalho MUST NOT incluir controle dedicado de "nova conversa"; reiniciar a conversa se dá exclusivamente por fechar e reabrir o painel, mantendo o cabeçalho fiel ao design de referência.

### Key Entities

- **Mensagem**: uma unidade da conversa, com autor (aluno ou assistente), conteúdo textual formatável e estado de transmissão (em andamento, concluída, interrompida, não entregue). Mensagens não entregues permanecem na conversa e podem ser reenviadas com o texto original.
- **Conversa**: sequência ordenada de mensagens da sessão atual do painel; existe apenas enquanto o painel não é reaberto do zero.
- **Estado do painel**: indicação de aberto ou fechado, guardada no armazenamento local do navegador e preservada entre telas e recarregamentos; não faz parte do endereço da página nem do histórico de navegação.
- **Sugestão**: frase pré-definida oferecida ao aluno no início da conversa, que ao ser acionada se torna uma mensagem do aluno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir de qualquer tela autenticada, o aluno abre o Coach AI e envia sua primeira mensagem em no máximo dois toques (botão "sparkles" + sugestão).
- **SC-002**: O primeiro trecho da resposta do assistente aparece em até 3 segundos após o envio em condições normais de rede, e o aluno vê algum sinal de atividade em menos de 1 segundo.
- **SC-003**: Em uma resposta longa, o aluno consegue rolar para cima e reler conteúdo anterior sem que a visualização seja deslocada automaticamente em nenhum momento.
- **SC-004**: 100% das aberturas do painel a partir das telas autenticadas preservam intacta a tela de origem, incluindo sua posição de rolagem.
- **SC-005**: O estado aberto/fechado do painel se mantém correto em 100% das navegações entre telas e recarregamentos verificados manualmente.
- **SC-006**: A interface renderizada corresponde ao design de referência em cabeçalho, alinhamento e estilo dos balões, sugestões e campo de entrada, sem divergências visuais perceptíveis.
- **SC-007**: A tela é utilizável e sem rolagem horizontal em larguras de 320px e 1280px, com todos os alvos interativos atingindo 44×44px.
- **SC-008**: Um ciclo completo de abrir, conversar, interromper, fechar e reabrir o painel é concluído sem falha visível ao aluno e sem erro registrado pelo navegador.
- **SC-009**: Falhas de comunicação resultam em mensagem compreensível e recuperação por nova tentativa em 100% dos casos verificados, sem recarregar a página.
- **SC-010**: Em nenhum momento de uma resposta que executa ações o aluno fica mais de 2 segundos sem qualquer sinal visível de que o assistente está trabalhando.
- **SC-011**: Após o assistente alterar plano ou perfil, o aluno vê os dados atualizados na tela de origem imediatamente ao fechar o painel, em 100% dos casos verificados.
- **SC-012**: Uma mensagem que falhou é recuperada com um único toque no controle de reenvio, sem redigitação, em 100% dos casos verificados.
- **SC-013**: Uma sessão expirada leva o aluno à tela de login em 100% dos casos verificados, sem falha silenciosa e sem tentativas repetidas de envio.

## Assumptions

- **Histórico não persistido**: apenas o estado aberto/fechado sobrevive a navegação e recarregamento; a conversa recomeça vazia a cada abertura, conforme decisão do produto. Persistir histórico (local ou no backend) fica fora do escopo desta feature.
- **Backend inalterado**: o serviço de IA existente já atende ao contrato necessário; esta feature não altera rotas, prompts, ferramentas nem contratos de API, e portanto não exige regeneração do cliente tipado.
- **Autenticação existente reaproveitada**: o painel só é acessível a alunos autenticados, e o envio de credenciais de sessão segue o mecanismo já usado no app. **Não há renovação de sessão expirada**: o login é feito com Google e o `better-auth` opera com configuração de sessão padrão, então sessão expirada leva diretamente ao login. Implementar renovação de credenciais está fora do escopo desta feature.
- **Sem controle de reiniciar conversa**: o cabeçalho permanece com os elementos do design de referência; reiniciar é fechar e reabrir o painel. Não há limite de mensagens por conversa, uma vez que a conversa já é descartada a cada fechamento.
- **Saudação local**: a mensagem de boas-vindas exibida na conversa vazia é conteúdo da interface e não consome uma chamada ao serviço de IA.
- **Onboarding intocado**: a tela de onboarding mantém sua própria implementação de conversa; sua unificação com este painel é trabalho futuro e não faz parte desta entrega.
- **Ações do assistente**: durante a execução o aluno vê apenas um indicador genérico de processamento; a confirmação do que foi feito chega pelo próprio texto da resposta. Exibir cartões dedicados de resultado, nomes de ferramentas ou seus parâmetros está fora do escopo.
- **Escopo de anexos**: envio de arquivos, imagens ou áudio não faz parte desta feature.
- **Verificação manual**: conforme a constituição do projeto, toda validação é manual — exercício dos fluxos, inspeção em dev local e checagem visual nas larguras alvo.
