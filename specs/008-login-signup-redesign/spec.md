# Feature Specification: Login e Criar Conta com Banner

**Feature Branch**: `008-login-signup-redesign`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Use the claude_design MCP to import this project: https://claude.ai/design/p/f5dc167e-fe91-4a12-b83e-5a5928fea9b8?file=Login+com+banner.dc.html — Implement: `Login com banner.dc.html`"

**Design reference**: Claude Design project `f5dc167e-fe91-4a12-b83e-5a5928fea9b8`, arquivo `Login com banner.dc.html` (seção 1 = Login, seção 2 = Criar conta; variantes `1a`/`2a` desktop 1280×800 e `1c`/`2b` mobile 402×801).

## Clarifications

### Session 2026-07-27

- Q: Como os erros de formulário devem ser apresentados nas duas telas? → A: Erro inline sob cada campo para falhas de validação + toast para erros vindos do servidor
- Q: Como tratar os links sem destino existente ("Esqueci minha senha", "Termos de uso", "Política de privacidade")? → A: Renderizar o texto sem navegação ativa (presente no layout, não clicável), até que os destinos existam
- Q: O feature deve tratar proteção contra força bruta / credential stuffing no login? → A: Sim — habilitar limite de tentativas no servidor, nos endpoints de autenticação, com aviso claro ao usuário quando o limite for atingido
- Q: Quais durações de sessão para "Manter conectado" desmarcado vs. marcado? → A: Desmarcado expira ao fechar o navegador (sessão de navegador); marcado dura 30 dias
- Q: Em qual largura o layout troca entre a versão mobile e a versão desktop com banner lateral? → A: Layout mobile até 1023px; layout desktop com banner lateral a partir de 1024px

### Session 2026-07-28

- Q: O que acontece quando o mesmo e-mail colide entre os dois métodos (conta criada pelo Google e depois cadastro/login por e-mail e senha)? → A: Cadastro é recusado com a mesma mensagem de "e-mail já em uso", sem vincular credencial; o login com senha nessa conta devolve o erro genérico de credencial inválida
- Q: O aviso de limite de tentativas atingido deve informar o tempo restante de bloqueio? → A: Não — mensagem genérica ("aguarde alguns minutos"), sem tempo numérico e sem depender de retry-after do servidor

## User Scenarios *(mandatory)*

### User Story 1 - Entrar com e-mail e senha (Priority: P1)

Um usuário que já tem conta abre a tela de login e vê, além do botão do Google que já existia, um formulário de e-mail e senha. Ele preenche as credenciais, escolhe se quer permanecer conectado e entra no app, chegando direto na sua tela de treino do dia.

**Why this priority**: Hoje o único caminho de entrada é o Google. Quem criou conta por e-mail e senha (o backend já aceita esse método) simplesmente não consegue entrar. Esta história desbloqueia o acesso e sozinha já entrega valor completo.

**Independent Verification**: Com um usuário de e-mail/senha existente no banco local, abrir a tela de login, preencher o formulário e confirmar que a sessão é criada e o usuário é levado à home. Verificável manualmente em 320px e 1280px.

**Acceptance Scenarios**:

1. **Given** um visitante não autenticado na tela de login, **When** ele informa e-mail e senha válidos e confirma, **Then** a sessão é criada e ele é levado à área autenticada do app.
2. **Given** o formulário de login preenchido com credenciais inválidas, **When** o visitante confirma, **Then** um toast com mensagem de erro clara é exibido e nenhuma sessão é criada.
3. **Given** o visitante marcou "Manter conectado", **When** ele fecha e reabre o navegador dentro de 30 dias, **Then** ele continua autenticado sem precisar entrar de novo.
4. **Given** o visitante deixou "Manter conectado" desmarcado, **When** ele fecha e reabre o navegador, **Then** a sessão já expirou e ele precisa entrar novamente.
5. **Given** um usuário já autenticado, **When** ele acessa a rota de login diretamente, **Then** ele é redirecionado para a área autenticada em vez de ver o formulário.
6. **Given** o envio do formulário em andamento, **When** o visitante tenta confirmar novamente, **Then** o botão está em estado de carregamento e não dispara uma segunda tentativa.

---

### User Story 2 - Criar conta com e-mail e senha (Priority: P2)

Um visitante sem conta acessa a tela de criar conta, informa nome, e-mail e senha, aceita os termos ao confirmar, e passa a ter uma conta ativa — seguindo direto para o onboarding.

**Why this priority**: Completa o par de telas do arquivo de design e remove a dependência exclusiva do Google no cadastro. Não depende da história 1 e pode ser entregue sozinha, mas o login é o gargalo mais urgente.

**Independent Verification**: Abrir a rota de criar conta com um e-mail inédito, concluir o cadastro e confirmar que a conta é criada, a sessão é iniciada e o usuário chega ao onboarding.

**Acceptance Scenarios**:

1. **Given** um visitante na tela de criar conta, **When** ele informa nome, e-mail inédito e senha com pelo menos 8 caracteres e confirma, **Then** a conta é criada, a sessão é iniciada e ele segue para o onboarding.
2. **Given** um e-mail que já pertence a uma conta, **When** o visitante confirma o cadastro, **Then** um toast informa que o e-mail já está em uso e sugere entrar, sem criar conta duplicada.
3. **Given** uma senha com menos de 8 caracteres, **When** o visitante tenta confirmar, **Then** o envio é bloqueado e o requisito mínimo aparece inline sob o campo de senha.
4. **Given** qualquer campo obrigatório vazio ou e-mail em formato inválido, **When** o visitante tenta confirmar, **Then** o envio é bloqueado e o erro aparece inline sob o campo problemático.
5. **Given** um usuário já autenticado, **When** ele acessa a rota de criar conta diretamente, **Then** ele é redirecionado para a área autenticada.

---

### User Story 3 - Navegar entre entrar e criar conta (Priority: P2)

O visitante que abriu a tela errada encontra, no rodapé do formulário, um caminho direto para a outra tela — "Não tem uma conta? Criar conta" no login e "Já tem uma conta? Entrar" no cadastro.

**Why this priority**: Sem essa ponte, a tela de criar conta fica inalcançável pela navegação normal. É pequena, mas é o que torna as histórias 1 e 2 utilizáveis como um fluxo real.

**Independent Verification**: A partir da tela de login, acionar "Criar conta", chegar à tela de cadastro, acionar "Entrar" e voltar ao login — sem erros de console e sem perda de contexto.

**Acceptance Scenarios**:

1. **Given** o visitante na tela de login, **When** ele aciona "Criar conta", **Then** a tela de criar conta é aberta.
2. **Given** o visitante na tela de criar conta, **When** ele aciona "Entrar", **Then** a tela de login é aberta.
3. **Given** qualquer uma das duas telas, **When** o visitante navega para a outra, **Then** ambas as rotas permanecem acessíveis sem autenticação.

---

### User Story 4 - Apresentação com banner em desktop e mobile (Priority: P3)

Em telas largas o visitante vê um banner fotográfico à esquerda, com a logo FIT.AI no topo e a promessa da marca ("O app que vai transformar a forma como você treina.") sobre um gradiente escuro, com o formulário num painel branco à direita. Em telas estreitas a foto ocupa o topo e o formulário sobe numa lâmina branca de cantos arredondados.

**Why this priority**: É a camada de apresentação. As histórias 1–3 funcionam sem ela, mas é o que diferencia a tela do estado atual (mobile-only, sem formulário) e o que o arquivo de design entrega.

**Independent Verification**: Abrir login e criar conta em 320px, 402px, 1023px, 1024px e 1280px e comparar visualmente com as variantes `1a`/`1c`/`2a`/`2b` do arquivo de design.

**Acceptance Scenarios**:

1. **Given** uma janela de 1024px ou mais larga, **When** o visitante abre login ou criar conta, **Then** o banner fotográfico com logo, título e subtítulo aparece ao lado do painel de formulário.
2. **Given** uma janela de 320px a 1023px, **When** o visitante abre qualquer das duas telas, **Then** a foto ocupa a área superior com a logo centralizada e o formulário aparece numa lâmina branca de cantos superiores arredondados.
3. **Given** qualquer largura entre 320px e 1280px+, **When** a tela é renderizada, **Then** não há rolagem horizontal, texto cortado ou sobreposição de elementos.
4. **Given** uma janela redimensionada cruzando 1024px em qualquer direção, **When** o layout troca, **Then** os valores já digitados no formulário são preservados.
5. **Given** qualquer das duas telas, **When** o visitante chega ao fim do conteúdo, **Then** o rodapé exibe o aviso de copyright da FIT.AI e o crédito de autoria com link para o LinkedIn.

---

### Edge Cases

- **Autenticação com Google falha ou é cancelada**: o visitante volta à tela de origem com uma mensagem explicando que a entrada não foi concluída.
- **Rede indisponível durante o envio**: um toast de falha de conexão é exibido e o formulário volta ao estado editável, permitindo nova tentativa sem recarregar a página.
- **Tentativas repetidas de senha errada**: a mensagem de erro não revela se o e-mail existe, para não permitir enumeração de contas.
- **E-mail de uma conta criada pelo Google usado no formulário de senha**: no cadastro, o envio é recusado com a mesma mensagem de "e-mail já em uso" e nenhuma credencial é vinculada; no login, a resposta é o erro genérico de credencial inválida, sem indicar que a conta usa o Google.
- **Limite de tentativas atingido**: novas tentativas são recusadas pelo servidor até o fim do intervalo de bloqueio, o usuário recebe um aviso genérico pedindo que aguarde alguns minutos — sem tempo restante numérico — e o formulário permanece editável.
- **Navegação por teclado**: é possível percorrer todos os campos, o checkbox, os links navegáveis e os dois botões na ordem visual, com indicador de foco visível. Os textos sem navegação ativa (esqueci minha senha, termos, política) não recebem foco.
- **Autopreenchimento do navegador**: gerenciadores de senha reconhecem os campos de e-mail, senha atual (login) e senha nova (cadastro).
- **Imagem do banner indisponível**: o painel de formulário permanece legível e utilizável, sem texto claro sobre fundo claro.
- **Viewport curto em mobile (ex.: 320×568)**: o conteúdo da lâmina rola verticalmente sem esconder o botão principal.

## Requirements *(mandatory)*

### Functional Requirements

**Entrada por e-mail e senha**

- **FR-001**: A tela de login MUST oferecer um formulário com campos de e-mail e senha, rotulados e associados aos respectivos controles.
- **FR-002**: O sistema MUST autenticar o visitante com e-mail e senha usando o mecanismo de autenticação já existente no produto, criando sessão em caso de sucesso.
- **FR-003**: A tela de login MUST oferecer a opção "Manter conectado". Quando **desmarcada**, a sessão MUST expirar ao fechar o navegador; quando **marcada**, a sessão MUST durar 30 dias.
- **FR-004**: A tela de login MUST exibir o texto "Esqueci minha senha" na posição definida pelo design, **sem navegação ativa** — visualmente presente, porém não clicável e fora da ordem de tabulação, já que o fluxo de recuperação está fora de escopo.
- **FR-005**: O sistema MUST bloquear envios inválidos (campos vazios, e-mail malformado) e exibir a mensagem de erro **inline, logo abaixo do campo problemático**, antes de qualquer tentativa de autenticação.
- **FR-006**: O sistema MUST exibir mensagem de erro compreensível **em toast** quando a tentativa de autenticação for rejeitada pelo servidor, sem indicar se o e-mail existe.
- **FR-024**: O sistema MUST limitar, **no servidor**, o número de tentativas de autenticação por origem num intervalo de tempo, bloqueando temporariamente novas tentativas ao atingir o limite.
- **FR-025**: Ao atingir o limite de tentativas, o sistema MUST informar o usuário de que houve tentativas em excesso e que ele deve aguardar antes de tentar de novo — sem revelar se o e-mail existe. A mensagem MUST ser **genérica quanto ao tempo** (sem contagem regressiva nem tempo restante numérico), de modo que a interface não dependa de o servidor expor a duração do bloqueio.

**Criação de conta**

- **FR-007**: O produto MUST disponibilizar uma tela pública de criar conta, acessível sem autenticação.
- **FR-008**: A tela de criar conta MUST oferecer campos de nome, e-mail e senha, com o requisito de mínimo de 8 caracteres comunicado junto ao campo de senha.
- **FR-009**: O sistema MUST criar a conta e iniciar a sessão em caso de sucesso, encaminhando o novo usuário ao onboarding.
- **FR-010**: O sistema MUST informar de forma clara quando o e-mail já pertencer a uma conta existente, sem criar duplicata. A mensagem MUST ser a mesma independentemente do método usado pela conta existente (e-mail/senha ou Google), e o sistema MUST NOT vincular automaticamente uma nova credencial de senha a uma conta já existente.
- **FR-011**: A tela de criar conta MUST exibir o aviso de aceite dos Termos de uso e da Política de privacidade. Ambos os termos aparecem destacados no texto, **sem navegação ativa** e fora da ordem de tabulação, enquanto as páginas não existirem.

**Entrada com Google**

- **FR-012**: Ambas as telas MUST manter a autenticação com Google como opção secundária, apresentada abaixo do formulário e separada por um divisor "ou".
- **FR-013**: O rótulo do botão do Google MUST refletir o contexto da tela ("Fazer login com o Google" no login, "Criar conta com o Google" no cadastro).

**Navegação e estados**

- **FR-014**: Cada tela MUST oferecer um caminho direto para a outra ("Não tem uma conta? Criar conta" e "Já tem uma conta? Entrar").
- **FR-015**: Visitantes já autenticados que acessarem login ou criar conta MUST ser redirecionados para a área autenticada.
- **FR-016**: Durante o envio, os botões de ação MUST entrar em estado de carregamento e impedir envios duplicados.

**Apresentação**

- **FR-017**: A partir de **1024px**, ambas as telas MUST apresentar o banner fotográfico com logo, título e subtítulo ao lado do painel de formulário, conforme o design.
- **FR-018**: Até **1023px**, ambas as telas MUST apresentar a foto na área superior com a logo centralizada e o formulário numa lâmina branca de cantos superiores arredondados.
- **FR-019**: Ambas as telas MUST exibir o rodapé com o aviso de copyright da FIT.AI e o crédito de autoria com link externo.
- **FR-020**: Ambas as telas MUST ser utilizáveis de 320px a 1280px+ sem rolagem horizontal, com alvos de toque de no mínimo 44×44px.
- **FR-021**: Toda a interface e as mensagens de erro MUST estar em português do Brasil, coerentes com o restante do produto.
- **FR-022**: Ambas as telas MUST ser operáveis por teclado, com rótulos associados aos campos e indicador de foco visível.
- **FR-023**: Erros inline MUST estar programaticamente associados ao campo correspondente, de modo que leitores de tela os anunciem ao focar o campo.

### Key Entities

- **Conta de usuário**: identidade do praticante no produto — nome, e-mail e credencial de acesso; pode ser criada por e-mail/senha ou pelo provedor Google. Já existe no domínio; esta feature apenas amplia as formas de criá-la e acessá-la.
- **Sessão**: vínculo autenticado entre o visitante e sua conta. Dura enquanto o navegador estiver aberto quando "Manter conectado" está desmarcado, e 30 dias quando marcado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário existente com credenciais de e-mail e senha consegue entrar e chegar à sua tela de treino em menos de 30 segundos, sem usar o Google.
- **SC-002**: Um visitante sem conta consegue concluir o cadastro e chegar ao onboarding em menos de 60 segundos, preenchendo três campos.
- **SC-003**: 100% dos erros previstos resultam numa mensagem legível no canal correto — inline sob o campo para senha curta, campo vazio e e-mail malformado; toast para credencial inválida, e-mail já cadastrado, limite de tentativas atingido e falha de rede — sem estado travado e sem necessidade de recarregar a página.
- **SC-004**: As duas telas são renderizadas sem rolagem horizontal, sem sobreposição e sem erros no console em 320px, 402px, 768px, 1023px, 1024px e 1280px — incluindo as duas larguras que cercam a troca de layout.
- **SC-005**: O resultado visual em 402px e 1280px corresponde às variantes correspondentes do arquivo de design em layout, hierarquia tipográfica, cores e espaçamento.
- **SC-006**: Todo o fluxo de entrada e de cadastro pode ser concluído usando apenas o teclado, com foco sempre visível.
- **SC-007**: Nenhuma mensagem de erro permite distinguir "e-mail não cadastrado" de "senha incorreta".
- **SC-008**: Tentativas sucessivas de login com senha errada a partir da mesma origem passam a ser recusadas pelo servidor após um limite definido, e o usuário recebe um aviso genérico para aguardar antes de tentar de novo.
- **SC-009**: Nenhum caminho do formulário de cadastro vincula uma senha a uma conta existente: um e-mail já cadastrado por qualquer método é sempre recusado com a mesma mensagem.

## Assumptions

- O escopo desta feature são as **duas seções** do arquivo `Login com banner.dc.html`: a tela de login (seção 1) e a tela de criar conta (seção 2). Confirmado com o autor.
- O **fluxo de recuperação de senha está fora de escopo**. O texto "Esqueci minha senha" aparece conforme o design, mas sem navegação ativa; a tela de recuperação e o envio de e-mail ficam para uma feature futura — o próprio arquivo de design lista "tela de recuperar senha" como próximo passo.
- O mecanismo de autenticação por e-mail e senha **já está habilitado no backend**; esta feature consome o que existe e não altera contratos de API.
- O limite de tentativas usa o recurso de rate limiting **já disponível no mecanismo de autenticação em uso**, sem introduzir nova dependência ou serviço. Os valores concretos (número de tentativas e janela de tempo) serão definidos na fase de plano.
- **Verificação de e-mail não é exigida** para concluir o cadastro — o usuário segue direto para o onboarding. A tela de verificar e-mail é citada como próximo passo no design e fica fora de escopo.
- **Termos de uso e Política de privacidade ainda não existem** como páginas no produto. O aviso é exibido conforme o design, com os dois termos destacados mas sem navegação ativa. Nenhuma página nova é criada nesta entrega.
- O aceite dos termos é **implícito na confirmação do cadastro** (como no design), sem checkbox obrigatório.
- O caminho da rota de criar conta segue a convenção já usada no produto, em que os slugs são em inglês mesmo com a interface em português (`/login`, `/profile`, `/onboarding`): a tela nova fica em **`/signup`**, no mesmo grupo de rotas públicas do login.
- Após o cadastro, o destino é o **onboarding**, coerente com a regra de que um usuário sem plano ativo é direcionado para lá.
- A tela de criar conta **não tem a opção "Manter conectado"** (o design não a inclui). A sessão criada no cadastro e a criada pelo Google usam a duração estendida de 30 dias, evitando que o novo usuário perca o acesso no meio do onboarding.
- Os textos, a fotografia de fundo, a logo e o ícone do Google vêm do arquivo de design; os assets equivalentes já existem no repositório.
- As alturas fixas de campo presentes no design (36px no desktop) são referência visual, não obrigação — a implementação deve respeitar a regra do projeto de não fixar altura e o mínimo de 44×44px em alvos de toque.
- Verificação é **manual**, conforme o princípio supremo da constituição: nenhum teste automatizado será escrito para esta feature.
- Os estados de erro não estão desenhados no arquivo (listados como próximo passo). O padrão foi definido por clarificação: **inline sob o campo** para falhas de validação e **toast** para erros retornados pelo servidor, reaproveitando o mecanismo de toast já presente no produto.
