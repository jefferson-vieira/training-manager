# Feature Specification: Fluxo de Recuperar Senha

**Feature Branch**: `009-password-reset-flow`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "fluxo de recuperar senha — Use the claude_design MCP to import this project: https://claude.ai/design/p/f5dc167e-fe91-4a12-b83e-5a5928fea9b8?file=Login+com+banner.dc.html — Focus on `Login com banner.dc.html` e `Email - Redefinir Senha.html`. Implement: Deve somente implementar o fluxo de recuperar senha (sessões 3 e 4). Também deve enviar o email conforme o template Email - Redefinir senha"

**Design reference**: Claude Design project `f5dc167e-fe91-4a12-b83e-5a5928fea9b8`.

- `Login com banner.dc.html` — **seção 3** "Recuperar senha" (variantes `3a` desktop 1280×800 e `3b` mobile 402×801, cada uma com estado de formulário e estado de sucesso) e **seção 4** "Nova senha" (variantes `4a` desktop 1280×800 e `4b` mobile 402×801).
- `Email - Redefinir Senha.html` — template do e-mail transacional enviado ao solicitar a redefinição.

Seções 1 (Login) e 2 (Criar conta) do mesmo arquivo estão **fora de escopo** — já entregues em `008-login-signup-redesign`.

## Clarifications

### Session 2026-07-30

- Q: Depois que o usuário salva a nova senha com sucesso (tela 4), o que deve acontecer? → A: Redirecionar para a tela de login com aviso de sucesso; o usuário entra usando a nova senha
- Q: Contas criadas só com Google (sem credencial de senha) que pedirem redefinição — como tratar? → A: A tela sempre mostra a mesma confirmação neutra ("Verifique seu e-mail"), mas nenhum link de redefinição é enviado para contas sem credencial de senha
- Q: Ao redefinir a senha, as outras sessões ativas do usuário devem ser encerradas? → A: Sim — todas as sessões existentes são encerradas, obrigando novo login em todos os dispositivos
- Q: Após a senha ser redefinida com sucesso, o sistema deve enviar um segundo e-mail avisando que a senha foi alterada? → A: Sim — um aviso de "sua senha foi alterada" é enviado ao concluir a redefinição
- Q: O limite de solicitações de redefinição deve ser aplicado por qual dimensão? → A: Por origem **e** por endereço de e-mail solicitado, com contadores independentes
- Q: Quando o link de redefinição deve ser validado? → A: Ao abrir a tela "Nova senha" e novamente no envio
- Q: Quais eventos do fluxo de redefinição devem ser registrados nos logs do servidor? → A: Eventos de segurança completos — solicitação, conclusão, recusa de link inválido e limite atingido, sem token nem senha

## User Scenarios *(mandatory)*

### User Story 1 - Solicitar o link de redefinição (Priority: P1)

Um usuário que esqueceu a senha abre a tela de login, aciona "Esqueci minha senha", informa o e-mail da conta e envia. A tela troca para um estado de confirmação — "Verifique seu e-mail" — informando que um link de redefinição foi enviado, com opções de voltar ao login ou tentar outro e-mail.

**Why this priority**: É a porta de entrada do fluxo. Sem ela, o usuário que perdeu a senha e não usa Google fica permanentemente sem acesso à conta — hoje o texto "Esqueci minha senha" existe na tela de login mas não leva a lugar nenhum.

**Independent Verification**: Pode ser demonstrada abrindo a tela de login, clicando em "Esqueci minha senha", enviando um e-mail conhecido e observando o estado de confirmação. Entrega valor mesmo antes da tela de nova senha existir, porque o e-mail com o link já chega ao usuário.

**Acceptance Scenarios**:

1. **Given** um visitante na tela de login, **When** ele aciona "Esqueci minha senha", **Then** chega à tela "Recuperar senha" com um campo de e-mail e o botão "Enviar link".
2. **Given** a tela "Recuperar senha" com um e-mail válido preenchido, **When** o visitante envia o formulário, **Then** o formulário é substituído pelo estado "Verifique seu e-mail" e o link de redefinição é enviado ao endereço informado.
3. **Given** a tela "Recuperar senha" com o campo vazio ou um e-mail malformado, **When** o visitante envia o formulário, **Then** a mensagem de erro aparece inline sob o campo e nenhum e-mail é enviado.
4. **Given** um e-mail que não pertence a nenhuma conta, **When** o visitante envia o formulário, **Then** a tela exibe exatamente a mesma confirmação "Verifique seu e-mail" e nenhum e-mail é enviado.
5. **Given** o estado de confirmação exibido, **When** o visitante aciona "tente outro e-mail", **Then** o formulário volta a aparecer com o campo editável.
6. **Given** o estado de confirmação exibido, **When** o visitante aciona "Voltar ao login", **Then** ele retorna à tela de login.

---

### User Story 2 - Receber o e-mail de redefinição (Priority: P1)

O usuário que solicitou a redefinição recebe um e-mail em português, com a identidade visual da FIT.AI, informando que o link expira em 1 hora, com um botão "Redefinir senha" e o mesmo endereço em texto para copiar e colar.

**Why this priority**: O e-mail é o único elo entre a solicitação e a redefinição. Sem ele, a User Story 1 não entrega nada de fato e a User Story 3 não tem como ser alcançada.

**Independent Verification**: Pode ser demonstrada solicitando a redefinição para uma conta real e conferindo o e-mail recebido contra o template de design — assunto, saudação com o nome do usuário, aviso de expiração, botão, link em texto, links de suporte e rodapé.

**Acceptance Scenarios**:

1. **Given** uma solicitação de redefinição para uma conta existente com senha, **When** o envio é processado, **Then** o usuário recebe um e-mail cujo conteúdo corresponde ao template `Email - Redefinir Senha.html` em estrutura, textos e hierarquia visual.
2. **Given** o e-mail recebido, **When** o usuário lê o corpo da mensagem, **Then** ele é saudado pelo próprio nome, o prazo de expiração de 1 hora está explícito e o endereço de destino aparece tanto no botão quanto em texto copiável.
3. **Given** o e-mail recebido, **When** o usuário aciona o botão "Redefinir senha", **Then** ele chega à tela "Nova senha" com o token da solicitação reconhecido.
4. **Given** um cliente de e-mail que bloqueia imagens ou não renderiza HTML rico, **When** a mensagem é aberta, **Then** o conteúdo continua legível e o link de redefinição continua acessível.

---

### User Story 3 - Definir a nova senha (Priority: P1)

Ao abrir o link recebido, o usuário chega à tela "Nova senha", informa a nova senha e a confirmação, salva e é levado de volta ao login com um aviso de que a senha foi alterada — podendo então entrar com a credencial nova.

**Why this priority**: É a conclusão do fluxo e o momento em que o usuário efetivamente recupera o acesso. Sem ela, as duas histórias anteriores não devolvem a conta a ninguém.

**Independent Verification**: Pode ser demonstrada abrindo o link do e-mail, definindo uma senha nova e, em seguida, entrando na aplicação com essa senha na tela de login.

**Acceptance Scenarios**:

1. **Given** um link de redefinição válido e dentro do prazo, **When** o usuário o abre, **Then** a tela "Nova senha" é exibida com os campos "Nova senha" e "Confirmar senha" e o requisito de mínimo de 8 caracteres comunicado junto ao campo.
2. **Given** a tela "Nova senha" preenchida com uma senha válida e a confirmação idêntica, **When** o usuário aciona "Salvar nova senha", **Then** a senha da conta é substituída e ele é levado à tela de login com um aviso de sucesso.
3. **Given** a senha alterada com sucesso, **When** o usuário entra com a nova senha na tela de login, **Then** o acesso é concedido; a senha antiga deixa de funcionar.
4. **Given** a senha alterada com sucesso, **When** existiam sessões ativas em outros dispositivos, **Then** todas são encerradas e exigem novo login.
5. **Given** a senha alterada com sucesso, **When** o envio é processado, **Then** o usuário recebe um e-mail avisando que a senha foi alterada, com orientação de procurar o suporte caso não reconheça a mudança.
6. **Given** uma senha com menos de 8 caracteres ou uma confirmação diferente da senha, **When** o usuário envia o formulário, **Then** a mensagem de erro aparece inline sob o campo problemático e a senha não é alterada.
7. **Given** um link expirado, já utilizado ou adulterado, **When** o usuário o abre, **Then** o formulário não é exibido: em seu lugar aparece a mensagem de link inválido com caminho direto para solicitar um novo.
8. **Given** a tela "Nova senha" aberta com um link que expira enquanto o usuário digita, **When** ele aciona "Salvar nova senha", **Then** a senha não é alterada e ele recebe a mesma mensagem de link inválido.

---

### User Story 4 - Apresentação nas duas larguras (Priority: P2)

As duas telas do fluxo seguem a mesma moldura das telas de login e criar conta: banner fotográfico lateral com logo, título e subtítulo em desktop; foto no topo com o formulário numa lâmina branca de cantos superiores arredondados em mobile — sempre com o rodapé de copyright e crédito de autoria.

**Why this priority**: A recuperação de senha só é usável quando o fluxo funciona (P1). A consistência visual com o restante da autenticação é essencial para a confiança, mas não bloqueia a recuperação do acesso.

**Independent Verification**: Pode ser demonstrada abrindo as duas telas em 402px e 1280px e comparando com as variantes `3a`/`3b` e `4a`/`4b` do arquivo de design.

**Acceptance Scenarios**:

1. **Given** um viewport de 1024px ou mais, **When** qualquer das duas telas é aberta, **Then** o banner fotográfico com logo, título e subtítulo aparece ao lado do painel de formulário, como nas demais telas de autenticação.
2. **Given** um viewport de até 1023px, **When** qualquer das duas telas é aberta, **Then** a foto ocupa a área superior com a logo centralizada e o conteúdo aparece na lâmina branca inferior.
3. **Given** qualquer das duas telas, **When** ela é renderizada entre 320px e 1280px+, **Then** não há rolagem horizontal, sobreposição ou conteúdo cortado, e os alvos de toque têm no mínimo 44×44px.

---

### Edge Cases

- **E-mail não cadastrado**: a confirmação exibida é idêntica à de um e-mail existente e nenhuma mensagem em nenhum ponto do fluxo permite descobrir se um endereço tem conta.
- **Conta criada apenas com Google**: a tela exibe a mesma confirmação neutra, porém nenhum link de redefinição é enviado — a conta continua acessível pelo botão do Google.
- **Solicitações repetidas para o mesmo e-mail**: o limite por endereço recusa novas solicitações mesmo quando partem de origens diferentes, impedindo que a caixa de entrada de uma pessoa seja bombardeada; o usuário recebe um aviso genérico pedindo que aguarde alguns minutos, sem revelar se o e-mail existe.
- **Varredura de muitos e-mails a partir da mesma origem**: o limite por origem recusa a sequência de solicitações antes que ela sirva para descobrir quais endereços têm conta.
- **Múltiplos links solicitados em sequência**: apenas o link mais recente conduz a uma redefinição bem-sucedida; os anteriores passam a ser recusados como inválidos.
- **Link reutilizado**: uma segunda tentativa com o mesmo link, após a senha já ter sido alterada, é recusada com a mensagem de link inválido.
- **Link aberto após 1 hora**: a tela já abre no estado de link inválido, sem formulário, orientando a solicitar um novo link com caminho direto de volta a "Recuperar senha".
- **Link ausente ou incompleto no endereço**: tratado como link inválido, com a mesma mensagem e o mesmo caminho de recuperação.
- **Link aberto por um usuário já autenticado**: a tela "Nova senha" é exibida normalmente, sem redirecionar para a área autenticada — quem clicou no e-mail quer trocar a senha.
- **Rede indisponível durante o envio**: um toast de falha de conexão é exibido e o formulário volta ao estado editável, permitindo nova tentativa sem recarregar a página.
- **Falha no envio do e-mail**: a confirmação neutra continua sendo exibida ao usuário (para não revelar existência de conta) e a falha fica registrada nos logs do servidor para diagnóstico.
- **Investigação após um sequestro de conta**: os registros do servidor permitem reconstruir quando a redefinição foi solicitada e concluída, sem que os logs contenham o token ou a senha.
- **Navegação por teclado**: é possível percorrer campos, botões e links das duas telas na ordem visual, com indicador de foco visível.
- **Autopreenchimento do navegador**: gerenciadores de senha reconhecem o campo de e-mail na tela 3 e os campos de senha nova na tela 4, oferecendo salvar a credencial atualizada.
- **Viewport curto em mobile (ex.: 320×568)**: o conteúdo da lâmina rola verticalmente sem esconder o botão principal.

## Requirements *(mandatory)*

### Functional Requirements

#### Entrada no fluxo

- **FR-001**: A tela de login MUST oferecer "Esqueci minha senha" como link navegável para a tela "Recuperar senha", na posição definida pelo design — substituindo o texto sem navegação ativa entregue em `008-login-signup-redesign` (FR-004 daquela spec).
- **FR-002**: As telas "Recuperar senha" e "Nova senha" MUST ser públicas, acessíveis sem autenticação, e MUST NOT redirecionar visitantes autenticados para a área autenticada.

#### Solicitação do link (seção 3)

- **FR-003**: A tela "Recuperar senha" MUST apresentar título, texto de apoio "Informe seu e-mail para receber o link de redefinição.", um campo de e-mail rotulado e o botão "Enviar link", conforme o design.
- **FR-004**: O sistema MUST bloquear envios inválidos (campo vazio, e-mail malformado) e exibir a mensagem de erro **inline, logo abaixo do campo**, antes de qualquer chamada ao servidor.
- **FR-005**: Ao receber uma solicitação para um e-mail de conta existente **com credencial de senha**, o sistema MUST enviar a esse endereço um link de redefinição de uso único.
- **FR-006**: O sistema MUST NOT enviar link de redefinição para endereços sem conta ou para contas sem credencial de senha, e MUST exibir, em todos esses casos, exatamente a mesma confirmação apresentada em caso de envio efetivo.
- **FR-007**: Após um envio aceito, a tela MUST substituir o formulário pelo estado de confirmação "Verifique seu e-mail", com o texto de apoio, o ícone, o botão "Voltar ao login" e a linha "Não recebeu? Verifique o spam ou tente outro e-mail" definidos no design.
- **FR-008**: A ação "tente outro e-mail" MUST devolver o usuário ao formulário com o campo editável, sem recarregar a página.
- **FR-009**: O sistema MUST limitar, **no servidor**, o número de solicitações de redefinição num intervalo de tempo, em **duas dimensões independentes**: por origem da requisição e por endereço de e-mail solicitado. Atingir qualquer um dos dois limites MUST recusar novas solicitações até o fim do intervalo.
- **FR-034**: Ao atingir qualquer um dos limites, o usuário MUST receber um aviso genérico pedindo que aguarde, **sem contagem regressiva** e sem revelar se o e-mail existe nem qual dos dois limites foi atingido.
- **FR-010**: Durante o envio, o botão de ação MUST entrar em estado de carregamento e impedir envios duplicados.

#### E-mail transacional

- **FR-011**: O e-mail de redefinição MUST corresponder ao template `Email - Redefinir Senha.html` em estrutura, textos, hierarquia tipográfica e cores: cabeçalho azul com a logo FIT.AI e o título "Redefinir sua senha", corpo branco, botão de ação e rodapé de avisos.
- **FR-012**: O e-mail MUST ser personalizado com o nome do destinatário na saudação e MUST exibir o endereço de destino no rodapé, conforme os campos do template.
- **FR-013**: O e-mail MUST declarar explicitamente que o link expira em 1 hora.
- **FR-014**: O e-mail MUST apresentar o link de redefinição em duas formas — botão de ação e endereço em texto copiável — ambos apontando para a tela "Nova senha" com o token da solicitação.
- **FR-015**: O e-mail MUST incluir os avisos finais do template: instrução para o caso de a mensagem cair no spam, orientação para ignorar a mensagem caso o destinatário não tenha conta, aviso de que é um envio automático sem resposta, links de suporte e a linha de copyright.
- **FR-016**: Todo o conteúdo do e-mail MUST estar em português do Brasil e MUST permanecer legível em clientes que bloqueiam imagens ou não renderizam HTML rico.
- **FR-032**: Ao concluir uma redefinição com sucesso, o sistema MUST enviar ao endereço da conta um segundo e-mail avisando que a senha foi alterada. O aviso MUST informar que todas as sessões foram encerradas e MUST orientar quem não reconhecer a alteração a procurar o suporte imediatamente.
- **FR-033**: O e-mail de aviso MUST reaproveitar a identidade visual do template de redefinição (cabeçalho azul com a logo, corpo branco, rodapé de avisos) e MUST NOT conter nenhum link capaz de alterar a senha.

#### Redefinição da senha (seção 4)

- **FR-017**: A tela "Nova senha" MUST apresentar título, texto de apoio "Crie uma nova senha para sua conta.", os campos "Nova senha" e "Confirmar senha" e o botão "Salvar nova senha", conforme o design.
- **FR-018**: A tela "Nova senha" MUST comunicar o requisito de mínimo de 8 caracteres junto ao campo de senha, coerente com a regra já aplicada na criação de conta.
- **FR-019**: O sistema MUST recusar, com erro **inline sob o campo correspondente**, senhas com menos de 8 caracteres e confirmações diferentes da senha informada, sem chamar o servidor.
- **FR-020**: O sistema MUST aceitar cada link de redefinição **uma única vez** e MUST recusá-lo após a expiração de 1 hora, após o uso ou quando adulterado.
- **FR-021**: Quando o link for inválido, expirado ou já utilizado, o sistema MUST informar o motivo de forma compreensível e oferecer caminho direto para solicitar um novo link.
- **FR-035**: O sistema MUST verificar a validade do link **ao abrir a tela "Nova senha"** e, quando ele já não for válido, MUST exibir o estado de link inválido no lugar do formulário — sem exigir que o usuário preencha os campos para descobrir o problema.
- **FR-036**: O sistema MUST revalidar o link **no envio do formulário**, porque ele pode expirar entre a abertura da tela e o salvamento. A verificação de abertura MUST NOT ser tratada como autorização suficiente para trocar a senha.
- **FR-022**: Ao salvar com sucesso, o sistema MUST substituir a credencial de senha da conta, **encerrar todas as demais sessões ativas** do usuário e redirecionar para a tela de login com um aviso de sucesso — sem criar sessão automaticamente.
- **FR-023**: A senha anterior MUST deixar de ser aceita imediatamente após a redefinição.
- **FR-024**: Ambas as telas MUST oferecer o caminho "Lembrou a senha? Voltar ao login", conforme o design.

#### Apresentação e acessibilidade

- **FR-025**: A partir de **1024px**, as duas telas MUST apresentar o banner fotográfico com logo, título e subtítulo ao lado do painel de formulário; até **1023px**, MUST apresentar a foto na área superior com a logo centralizada e o conteúdo numa lâmina branca de cantos superiores arredondados — mesma moldura das telas de login e criar conta.
- **FR-026**: As duas telas MUST exibir o rodapé com o aviso de copyright da FIT.AI e o crédito de autoria com link externo.
- **FR-027**: As duas telas MUST ser utilizáveis de 320px a 1280px+ sem rolagem horizontal, com alvos de toque de no mínimo 44×44px.
- **FR-028**: Toda a interface e todas as mensagens MUST estar em português do Brasil, coerentes com o restante do produto.
- **FR-029**: As duas telas MUST ser operáveis por teclado, com rótulos associados aos campos, indicador de foco visível e erros inline programaticamente associados ao campo correspondente.
- **FR-030**: A transição entre o formulário e a confirmação na tela "Recuperar senha" MUST anunciar a mudança para leitores de tela, de modo que quem não vê a animação perceba que a solicitação foi concluída.
- **FR-031**: Erros vindos do servidor MUST ser apresentados em **toast**, e erros de validação de formulário **inline sob o campo** — mesma convenção adotada nas telas de login e criar conta.

#### Registro de eventos

- **FR-037**: O servidor MUST registrar cada solicitação de redefinição, cada redefinição concluída, cada recusa de link inválido ou expirado e cada bloqueio por limite atingido, de modo que uma redefinição não autorizada possa ser investigada depois do fato.
- **FR-038**: Os registros MUST NOT conter o token do link, a senha informada nem qualquer valor que permita completar a redefinição a partir dos logs.
- **FR-039**: O servidor MUST registrar as falhas de envio de e-mail com detalhe suficiente para diagnóstico, mesmo quando a interface exibe a confirmação neutra ao usuário.

### Key Entities

- **Conta de usuário**: identidade do praticante no produto — nome, e-mail e credencial de acesso. Já existe no domínio; esta feature altera a credencial de senha ao final do fluxo e depende do nome para personalizar o e-mail.
- **Solicitação de redefinição**: vínculo temporário e de uso único entre um e-mail solicitante e a permissão de trocar a senha daquela conta. Válida por 1 hora, invalidada ao ser usada e substituída pela solicitação mais recente do mesmo e-mail.
- **E-mail de redefinição**: mensagem transacional enviada ao endereço da conta, contendo o link da solicitação, o nome do destinatário e o prazo de validade.
- **E-mail de aviso de senha alterada**: mensagem transacional enviada ao endereço da conta após a redefinição ser concluída, sem nenhum link capaz de alterar a senha. Serve para que o dono legítimo perceba uma redefinição que não partiu dele.
- **Sessão**: vínculo autenticado entre o usuário e sua conta. Todas as sessões existentes são encerradas quando a senha é redefinida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário que esqueceu a senha consegue percorrer o fluxo inteiro — login → recuperar senha → e-mail → nova senha → login com a senha nova — em menos de 3 minutos, sem ajuda externa e sem recarregar nenhuma página manualmente.
- **SC-002**: O e-mail de redefinição é aceito pelo provedor de envio na mesma solicitação, sem enfileiramento próprio do produto. A taxa e o tempo de entrega são acompanhados no painel do provedor como métrica de operação pós-lançamento, não como critério de aceite desta entrega.
- **SC-003**: O conteúdo do e-mail recebido corresponde ao template de design em estrutura, textos, hierarquia tipográfica e cores, e permanece legível com imagens bloqueadas.
- **SC-004**: Nenhuma resposta da interface permite distinguir "e-mail cadastrado" de "e-mail não cadastrado" ou "conta só com Google" — o texto exibido e o tempo de resposta percebido são equivalentes nos três casos.
- **SC-005**: Um link de redefinição usado uma segunda vez, ou aberto após 1 hora, nunca resulta em troca de senha e sempre exibe uma mensagem que orienta a solicitar um novo link.
- **SC-006**: Após a redefinição, a senha antiga é recusada em 100% das tentativas e as sessões abertas em outros dispositivos deixam de dar acesso à área autenticada.
- **SC-007**: 100% dos erros previstos resultam numa mensagem legível no canal correto — inline sob o campo para e-mail vazio/malformado, senha curta e confirmação divergente; toast para link inválido, limite de solicitações atingido e falha de rede — sem estado travado.
- **SC-008**: As duas telas são renderizadas sem rolagem horizontal, sem sobreposição e sem erros no console em 320px, 402px, 768px, 1023px, 1024px e 1280px.
- **SC-009**: O resultado visual em 402px e 1280px corresponde às variantes `3a`/`3b` e `4a`/`4b` do arquivo de design em layout, hierarquia tipográfica, cores e espaçamento, incluindo os dois estados da tela 3.
- **SC-010**: Todo o fluxo pode ser concluído usando apenas o teclado, com foco sempre visível.
- **SC-011**: Solicitações sucessivas passam a ser recusadas pelo servidor após um limite definido, tanto quando repetem a mesma origem quanto quando repetem o mesmo endereço de e-mail a partir de origens diferentes, sempre com aviso genérico ao usuário.
- **SC-012**: Toda redefinição concluída gera um e-mail de aviso ao dono da conta, de modo que uma redefinição não autorizada seja perceptível sem que a vítima precise tentar entrar.
- **SC-013**: Após percorrer o fluxo, é possível reconstruir pelos registros do servidor quando a redefinição foi solicitada e concluída — e nenhum registro contém o token do link ou a senha informada.

## Assumptions

- A recuperação de senha se aplica apenas a contas com credencial de e-mail e senha. Contas criadas exclusivamente pelo Google continuam acessíveis pelo botão do Google e não recebem link de redefinição — decisão registrada em Clarifications.
- A confirmação neutra exibida para e-mails sem conta é intencional e segue a mesma política antienumeração já adotada no login (`008-login-signup-redesign`).
- O prazo de validade de 1 hora vem do próprio template de e-mail e vale como regra do produto.
- O mínimo de 8 caracteres para a nova senha reaproveita a regra já comunicada na criação de conta, mantendo a política de senha única em todo o produto.
- O ponto de quebra entre o layout mobile e o layout desktop com banner lateral permanece em 1024px, como definido em `008-login-signup-redesign`.
- As telas reaproveitam a moldura de autenticação existente (banner, lâmina e rodapé) e os componentes de formulário já usados em login e criar conta — inclusive o campo de senha com alternância de visibilidade já disponível no produto.
- A nomenclatura das novas rotas segue a convenção já existente no produto (rotas em inglês, como `/login` e `/signup`); o endereço `app.fit.ai/redefinir-senha` que aparece no template de design é ilustrativo e será substituído pelo endereço real da aplicação.
- O produto ainda **não possui infraestrutura de envio de e-mail**. Habilitar um canal de envio transacional é uma dependência nova desta feature, incluindo um modo de desenvolvimento local que permita inspecionar a mensagem gerada sem depender de entrega real.
- O limite por origem reaproveita o mecanismo de limite de tentativas já existente na camada de autenticação, estendido ao endpoint de redefinição. O limite por endereço de e-mail é um contador novo, sem equivalente hoje no produto.
- O nome exibido na saudação do e-mail vem do cadastro da conta; contas sem nome preenchido não são um caso esperado, pois o nome é obrigatório na criação de conta.
- Endereço remetente, domínio verificado e caixa de suporte (`fit.ai/suporte`) são configurações de ambiente, não decisões desta especificação.
- O design fornece apenas o template do e-mail de redefinição. O e-mail de aviso de senha alterada (FR-032) não tem template próprio e será derivado do existente, mantendo a mesma identidade visual.
