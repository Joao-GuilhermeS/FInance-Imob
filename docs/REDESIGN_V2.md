# Redesign financeiro v2

Integração: `feat/redesign-financeiro-v2`. Etapas em branches próprias e commits
Conventional Commits, com build, lint e verificações pertinentes antes de integrar.

## Escopo confirmado

1. Tokens Light/Dark, preferência do sistema, escolha persistida e header.
2. Navegação por grupos e módulos reais; drawer acessível abaixo de 1024 px.
3. Dashboard executivo, períodos, comparação, gráficos, carteiras e imóveis.
4. Descrição livre nas baixas, segregação e consolidação financeira, relatórios
   PDF/XLSX, preservando parcial/antecipação e rastreabilidade existentes.
5. Revisão visual e funcional em 375, 768 e 1440 px, nos dois temas.

Estoque e WhatsApp adiados por confirmação do responsável nesta entrega. Reservas
e fichas continuam nos fluxos comercial/financeiro; não criar módulos vazios.

## Decisões visuais

Os tokens exatos do pedido são a referência. A busca da habilidade UI/UX retornou
Enterprise Gateway (landing comercial), sem correspondência verificada com a área
operacional, mesmo após refinar a consulta. Esse padrão foi descartado. As regras
gerais de acessibilidade, foco, densidade e responsividade orientam a implementação.

DM Sans/Manrope preservados; números tabulares, bordas discretas e hierarquia por
tipografia. Os tokens semânticos pedidos são mantidos. Texto compacto e badges
claros usam variantes de tinta mais escuras para contraste legível; sinais e rótulos
acompanham cores. Não usar cor como único indicador. Movimento reduzido respeitado.

Resultado de caixa = entradas menos saídas; não chamar de lucro líquido contábil.
Lucro bruto estimado = contrato ativo menos aquisição e custos incorridos, sem
duplicar obrigação de aquisição nem somar devoluções como custo de construção.

## Etapa 1

- Tokens compartilhados em todas as telas, sem manter a antiga paleta verde.
- Tema aplicado antes da primeira pintura; preferência persistida, sincronização
  entre abas e acompanhamento do sistema quando não há escolha explícita.
- Header com alternância, perfil/papel e contagem de parcelas vencidas/hoje.
- Ajustes de efeitos assíncronos removem os quatro avisos preexistentes de lint.
- Build/lint sem erros ou avisos; 41 testes unitários. Navegador com API simulada:
  alternância, persistência após reload e inspeção visual Light/Dark em 1440 px.

## Etapa 2

- 16 entradas funcionais agrupadas, com menus colapsáveis e rolagem independente.
  Terrenos/casas e clientes/fornecedores possuem consultas próprias; mão de obra
  e serviços consulta somente essas despesas. Reservas em abas de vendas, fichas
  nos atalhos de cada registro. Links antigos preservados.
- Drawer abaixo de 1024 px, Escape, foco contido e restaurado, fundo inerte e
  rolagem de fundo bloqueada. Perfil/papel acessível por menu no header mobile.
- Build/lint aprovados e 43 testes unitários. Navegador: navegação entre módulos,
  isolamento de casas/fornecedores, Escape/foco e ausência de overflow da página
  em 375, 768 e 1440 px. Tabelas mantêm rolagem interna.

## Etapa 3

- Dashboard executivo com Hoje/Semana/Mês/Ano até hoje, intervalo personalizado
  na URL, comparação anterior de igual duração e ausência de percentuais inventados
  quando a base anterior é zero. Datas inválidas não mostram totais antigos.
- Posição do caixa até a data final; entradas/saídas/resultado do intervalo.
  Carteiras atuais preservam todas as obrigações e destacam vencimentos do período,
  para não ocultar dívidas antigas/futuras ao filtrar um mês. Disponibilidade e custos
  acumulados são posições atuais, identificadas como tal. Não são snapshots históricos.
- Visões consolidada, terrenos, casas e empresa reconciliáveis. Saldos iniciais
  legados sem classificação/data permanecem na base geral, sem rateio presumido.
- Gráfico SVG redimensionável com foco/seleção e tabela acessível; rosca com legenda
  interativa. Sem dados, estados vazios reais. Saídas incluem estornos de recebimentos
  explicitamente classificados, sem tratá-los como novo custo de construção.
- Resumos setoriais, custo/lucro bruto por casa, movimentações e cobranças com ação
  de recebimento. Métricas financeiras não são exibidas a perfis sem essa permissão.
- 51 testes unitários; build/lint aprovados. Navegador com API simulada em Light/Dark,
  375/768/1440 px: períodos, segmentação, intervalo inválido e ausência de overflow.

## Etapa 4 — core e relatórios

- Migrações aplicadas: contas por segmento/data, classificação com justificativa e
  controle de concorrência; baixas com descrição/observações e comparação integral
  em novas tentativas. Contas exclusivas rejeitam imóveis de outro segmento.
- Rotas financeiras separadas filtram obrigações e aquisições, além do extrato.
  O saldo atribuído ao segmento não presume rateio de saldos iniciais gerais.
- Categorias adicionais: impostos/cartório, comissões, fretes, equipamentos e utilidades.
- Central com 11 relatórios e variações por segmento/período/pessoa/imóvel; extrato,
  compras e fichas exportam PDF/XLSX/CSV. Excel preserva números, filtro e cabeçalho;
  PDF paginado, com metodologia e filtros. Fornecedor: relatório de obrigações e
  extrato filtrado por pessoa para pagamentos/estornos. Sem catálogo de estoque.
- 58 testes unitários e sete roteiros SQL reais aprovados, todos com rollback.
  Navegador com API simulada: formulários, isolamento de obrigações, 11 relatórios,
  downloads reais e layouts 375/768/1440. PDF renderizado/inspecionado e XLSX reaberto.
- ExcelJS carrega somente na exportação. Override uuid 11.1.1 compatível com a única
  API usada no código fonte da dependência (v4); npm audit sem vulnerabilidades.
  O pacote browser pré-compilado contém sua própria implementação e não lê esse
  override; o aviso de uuid cobre v3/v5/v6 com buffer fornecido, não usados aqui.
