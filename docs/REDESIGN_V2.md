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

- Venda configurável: semanal, a cada 14 dias, mensal, trimestral e anual; ajustes
  de juros/desconto em valor fixo explicitamente informado, com descrição obrigatória
  quando houver ajuste e prévia do total/datas. Sem taxa presumida, capitalização ou
  encargos por atraso. Entrada + parcelas reconciliam o total em centavos. À vista
  pode usar entrada integral. Conversão de reserva usa o mesmo fluxo. Renegociação
  conserva a regra anterior (saldo mantido, cronograma mensal, sem novos ajustes).
- Oitavo roteiro SQL cobre periodicidades, fim de mês, ajustes, idempotência e acesso;
  62 testes unitários. Prévia e formulário mobile verificados no navegador simulado.

## Etapa 5 — validação e integração

- Build de produção inspecionado em 17 rotas (16 módulos do menu + ficha), dois
  temas e três larguras (375/768/1440): 102 combinações sem erro JavaScript nem
  overflow horizontal da página. Tabelas extensas possuem rolagem interna.
- Preferência inicial do sistema e persistência após recarregar aprovadas. Textos
  principal/secundário e indicadores semânticos sobre superfície alcançaram 4,5:1
  ou mais nos dois temas. Isso não substitui auditoria completa com leitores de tela.
- PDF e Excel baixados também no preview do build de produção. PDFs de extrato e
  recibo individual renderizados e inspecionados; XLSX reaberto com valores
  numéricos, cabeçalho congelado e autofiltro. O recibo individual não aparece
  para estornos ou recebimentos estornados. Demonstrativo consolidado preservado.
- Ficha de fornecedor acessível pelo cadastro: obrigações e pagamentos/estornos em
  seções separadas, com suas respectivas datas e exportações, sem somar custo e
  pagamento como duas despesas. Moeda exibida em formato brasileiro.
- Código principal dividido: aplicação ~70 kB, React ~219 kB e Supabase ~216 kB
  minificados. ExcelJS ~929 kB permanece como chunk lazy, baixado apenas ao exportar;
  o build mantém o aviso de tamanho desse arquivo, sem elevar o limite artificialmente.
- GitHub Actions valida npm ci, lint, 62 testes, build e auditoria de dependências
  em Node 24. Não executa SQL remoto e não publica aplicação automaticamente.
- Supabase: health sem avisos; advisor security mantém proteção contra senhas vazadas
  desativada (preexistente) e informação de RLS sem políticas na configuração privada,
  intencionalmente inacessível. Migrações remotas e locais sincronizadas.
- Testes de interface usam API simulada; regras financeiras foram testadas no banco
  real em transações revertidas. Não equivalem a homologação com usuário real, teste
  de carga, restauração de backup ou validação do envio de e-mails.

### Fora desta entrega

Estoque e WhatsApp adiados pelo responsável. Publicação, backup/restauração, retenção
operacional de anexos, SMTP, notificações agendadas, integrações bancárias/Caixa e
assinatura digital não foram implementados. O provisionamento global de novos perfis
continua sujeito à configuração de contas gerenciadas documentada em ACESSO.md;
esta entrega não altera essa configuração nem as credenciais de usuários existentes.

## Dashboard principal — refinamento de 19/11/2026

- Dashboard permanece na rota raiz e passa a ser o destino após login bem-sucedido,
  mesmo quando a tela de login foi aberta em outra rota. Links internos de sessões
  já autenticadas continuam funcionando. Destinos inválidos retornam ao Dashboard.
- Atalho exclusivo, primeiro e destacado no menu, independente dos grupos recolhíveis;
  mesmo comportamento no drawer mobile. Título e breadcrumb padronizados como Dashboard.
- Grid com intervalos de 20–28 px, cards de 16 px, sombras discretas, saldo principal
  com fundo executivo, resultado com superfície de destaque e números tabulares maiores.
  Indicadores secundários, painéis setoriais e listas mantêm hierarquia consistente.
- Gráfico de caixa com área maior, escala de valores arredondada, zero identificado,
  rótulos de datas espaçados conforme a largura e precisão para valores em centavos.
  Legenda distingue barras e linha; seleção por mouse/toque/teclado e tabela preservadas.
  Rosca maior e legenda com alvos de 44 px. Mobile sem rótulos fragmentados ou descrições
  cortadas nas movimentações. Nenhuma biblioteca ou dependência adicionada.
- Skill UI/UX: aplicadas recomendações pertinentes de espaçamento de alvos e reflow.
  Duas buscas de gráficos não encontraram recomendação específica adequada; mantido
  o gráfico temporal existente, com melhorias baseadas nas diretrizes gerais da skill.
- Build e lint aprovados; 62 testes existentes passam. Preview de produção com API
  simulada: Light/Dark em 375/768/1440/1920 px, sem overflow ou KPIs cortados; filtros,
  caixa, foco do gráfico, tabela acessível, menu recolhível e drawer conferidos.
  Login simulado a partir de /financeiro abre /; deep link autenticado preservado.
- Mudança de interface e navegação; não requer migração nem altera regras financeiras.
  Permanece o aviso conhecido de tamanho do chunk lazy de Excel, alheio a esta mudança.

## Login — refinamento visual de 19/11/2026

- Substituído o split-screen por painel centralizado de até 400 px, com superfície
  Zinc neutra, borda fina, sombra discreta e textura radial quase imperceptível.
  Tema escuro #09090B e equivalente claro; preferência e alternância preservadas.
- Marca monocromática legível, título funcional e rodapé administrativo de 12 px.
  Removidos painel promocional, frases motivacionais, escudo, lista e seta do botão.
- Campos de 44 px, rótulos explícitos, foco visível, botão Entrar azul #2563EB com
  texto branco e controle acessível para mostrar/ocultar senha. Alertas compactos
  com ícone e superfície vermelha translúcida. CSS antigo de autenticação removido.
- Autenticação, integração, credenciais e destino após login mantidos. Estado de
  envio bloqueia controles e mostra progresso; falhas preservam os valores.
- Build/lint e 62 testes aprovados. Navegador no preview de produção: Light/Dark
  em 375/768/1440, painel centralizado sem overflow, foco, alternância de senha,
  erro e carregamento. Auth simulado validou login a partir de /financeiro com
  chegada ao Dashboard e manutenção de links internos autenticados.
- Contrastes medidos: texto principal >=17,7:1; texto secundário >=5,5:1;
  placeholder >=4,6:1; botão branco/azul 5,17:1. Não houve dependências novas.
