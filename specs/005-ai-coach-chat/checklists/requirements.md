# Specification Quality Checklist: AI Coach Chat

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Iteração 4 (`/speckit-clarify`, 2026-07-20)** — 0 perguntas: o usuário forneceu a decisão diretamente ("remova a parte do refresh token… se não for possível apenas redirecione para login"). Status permanece 16/16, sem regressões. Impactos:
  - **Fecha o risco #1 do plano**, que era o único ponto em que um requisito aprovado não era integralmente realizável. A verificação de código feita no `/speckit-plan` (better-auth sem bloco `session`, login via Google) provou a premissa original incorreta, e o produto ajustou o escopo em vez de exigir trabalho de backend.
  - FR-042 simplificado para redirecionamento direto. FR-043 **reaproveitado, não removido**: passou a exigir a distinção entre 401 e falha de rede. Sem isso, uma queda momentânea de rede expulsaria o aluno do app — defeito real que a redação anterior mascarava. IDs preservados; nenhuma renumeração.
  - Propagação além do spec: `research.md` R-001 reescrito, tabela de riscos do `plan.md` marcada como encerrada, `quickstart.md` ganhou o cenário 5.8 (falha de rede **não** redireciona) como par de validação do 5.7, e `contracts/ui-contract.md` teve o gatilho do 401 corrigido.
  - Menções remanescentes a "refresh token" em `research.md` e no log de Clarifications são **registro histórico deliberado** — documentam por que a decisão mudou. Não são requisitos ativos.
- **Iteração 3 (`/speckit-clarify`, 2026-07-20)** — 3 perguntas respondidas (a sessão parou antes da quota de 5: as lacunas restantes eram de baixo impacto e não justificavam pergunta formal). Status permanece 16/16, sem regressões. Impactos no spec:
  - Novos requisitos receberam IDs FR-040..FR-044, posicionados nas subseções temáticas corretas mas **fora de ordem numérica**. Escolha deliberada: a renumeração da Iteração 2 já invalidou os IDs originais, e a partir daqui `/speckit-plan` e `/speckit-tasks` passarão a referenciá-los — estabilidade de ID vale mais que contiguidade.
  - A História 5 foi reescrita (descrição, verificação e 6 cenários) porque as decisões novas contradiziam o texto anterior sobre "tentar novamente" e "autenticar novamente".
  - FR-042/FR-043 assumem que a estratégia de renovação de credenciais já existe no app. Isso **não foi verificado no código** durante esta sessão — se o `better-auth` não estiver configurado para renovação automática de sessão, o requisito vira trabalho de backend fora do escopo declarado. Verificar em `/speckit-plan`.
- **Iteração 2 (`/speckit-clarify`, 2026-07-20)** — 5 perguntas respondidas e integradas; status permanece 16/16, sem regressões. Impactos no spec:
  - Requisitos renumerados para FR-001..FR-039 após a inserção de novos itens (a numeração anterior ia até FR-032). Referências externas ao spec anteriores a esta sessão devem ser reconferidas.
  - FR-006/FR-007 passaram a nomear o armazenamento local do navegador como mecanismo de persistência. Isso beira um detalhe de implementação, mas foi mantido porque a decisão tem consequências diretamente observáveis pelo aluno — URL sem estado do painel e botão "voltar" que não abre nem fecha o chat — ambas expressas como comportamento em FR-007 e nos cenários 6 e 7 da História 4.
  - FR-034 substituiu a formulação vaga "mantém largura legível e permanece ancorado" por uma regra verificável de largura total com margem lateral; o edge case correspondente foi reescrito para não contradizê-la.
- **Iteração 1** — dois ajustes aplicados antes da aprovação:
  - SC-008 mencionava "erro de console" e "requisição de rede", vocabulário de ferramenta de desenvolvimento. Reescrito em termos de resultado observável pelo aluno, mantendo a verificabilidade exigida pela validação manual do projeto.
  - Nomes de bibliotecas citados no pedido original (ai-sdk, ai-elements, shadcn) foram deliberadamente mantidos fora dos requisitos; FR-030 expressa a mesma intenção como "reutilizar os componentes do design system existente e os componentes de conversa já presentes no projeto". A escolha concreta de bibliotecas pertence ao `/speckit-plan`.
- A referência ao nó Figma `3606:1016` em FR-027 é intencional: identifica o artefato de design de origem, não uma decisão de implementação.
- A ambiguidade sobre persistência do histórico foi resolvida com o solicitante antes da redação (apenas o estado aberto/fechado persiste); registrada em Assumptions, sem marcador [NEEDS CLARIFICATION] remanescente.
- Itens marcados como incompletos exigiriam atualização do spec antes de `/speckit-clarify` ou `/speckit-plan`. Nenhum item está incompleto.
