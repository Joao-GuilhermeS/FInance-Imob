# FinanceImob

Manual de uso e referência das telas

Versão 1.0 | Atualizado em 20/11/2026

Aplicação: https://finance-imob.vercel.app

Este manual descreve as funcionalidades implementadas na versão atual. Os nomes dos botões seguem a interface. As opções visíveis dependem do perfil de acesso; as orientações completas de operação consideram o perfil Administrador. Valores de exemplos são fictícios.

## 1. Objetivo do sistema e conceitos essenciais

O FinanceImob organiza o controle financeiro de terrenos, casas e obras. Reúne cadastros, vendas, parcelas, compras, pagamentos, recebimentos e consultas de custo por imóvel. O objetivo é identificar o que foi contratado, quanto ainda falta receber ou pagar e o que efetivamente entrou ou saiu do caixa.

| Conceito | Como interpretar |
| --- | --- |
| Valor contratado | Total acordado na venda. Não significa dinheiro já recebido. |
| Conta a receber | Parcela ou entrada prevista que ainda precisa ser baixada. |
| Conta a pagar | Obrigação registrada, mesmo que o pagamento ainda não tenha ocorrido. |
| Movimentação de caixa | Recebimento, pagamento ou estorno efetivamente registrado em uma conta. |
| Custo acumulado do imóvel | Aquisição mais despesas vinculadas, incluindo valores ainda não pagos. |
| Resultado de caixa | Entradas menos saídas registradas. Não representa, por si só, lucro líquido contábil. |
| Resultado bruto previsto | Valor contratado ativo menos custo acumulado do imóvel. Pode mudar enquanto houver novos custos. |

**Regra principal:** cadastrar um imóvel, registrar uma venda ou lançar uma compra não confirma um pagamento. As baixas de recebimento e pagamento são etapas próprias.

## 2. Acesso e tela de login

**Finalidade:** entrar com uma conta individual já disponibilizada pelo responsável.

| Componente | Utilização |
| --- | --- |
| E-mail e Senha | Informe as credenciais da sua conta da aplicação. |
| Mostrar senha / Ocultar senha | Alterna a visualização sem alterar o valor digitado. |
| Entrar | Envia as credenciais; durante o envio aparece Entrando… |
| Alternância de tema | Muda entre modo claro e escuro. A preferência é lembrada neste navegador. |
| Aviso de erro | Informa falha de acesso ou configuração indisponível. |

1. Abra o endereço da aplicação e preencha e-mail e senha.
2. Se necessário, use o ícone do olho para conferir a senha.
3. Clique em **Entrar**. Após o login, o sistema abre o **Dashboard**.

Não há cadastro público de contas nem recuperação de senha por botão nesta tela. Solicite criação ou recuperação ao responsável. O login da aplicação é uma conta do Supabase Authentication, não necessariamente a mesma conta usada para administrar o painel Supabase.

## 3. Navegação e componentes comuns

O **Dashboard** é o primeiro atalho e o principal destaque do menu. Os demais módulos ficam em grupos: Visão geral, Imóveis e engenharia, Comercial e CRM, Financeiro e Administração.

| Componente | O que faz |
| --- | --- |
| Menu lateral e títulos dos grupos | Abrem as telas; os grupos podem ser recolhidos. |
| Menu no celular | O botão de três linhas abre o painel lateral. Escolher uma tela ou pressionar Escape fecha o painel. |
| Atualizar dados | Recarrega os dados disponíveis para o usuário. Use após alterações feitas em outra sessão. |
| Sino de notificações | Para Administrador e Financeiro, leva aos alertas e indica parcelas vencidas ou vencendo hoje. |
| Perfil do usuário | Mostra nome e perfil e oferece a opção de sair da conta. |
| Sol / lua | Alterna o tema sem alterar dados financeiros. |
| Buscas e filtros | Restringem os registros mostrados na tela correspondente. |
| Janela de cadastro/operação | Permite preencher, conferir, salvar ou cancelar antes da confirmação. |

Em tabelas extensas no celular, deslize horizontalmente dentro da tabela para ver as colunas restantes. Se houver erro ao salvar, confira a mensagem e os campos indicados; o formulário preserva os dados para correção. Cancelar antes de confirmar fecha a operação sem salvá-la.

## 4. Dashboard

**Acesso:** atalho Dashboard ou página inicial. **Finalidade:** acompanhar posição financeira, carteira e desempenho dos imóveis.

### Componentes principais

| Bloco | Conteúdo e uso |
| --- | --- |
| Período de análise | Hoje, Esta semana, Este mês, Este ano e Personalizado, com datas De e Até. Os atalhos vão até o dia atual; a semana começa na segunda-feira. |
| Saldo de caixa | Posição até a data final selecionada. O seletor permite Geral consolidado, Caixa de terrenos, Caixa de casas / obras e Sem vínculo com imóvel. |
| Entradas, Saídas e Resultado | Movimentações do intervalo e resultado de caixa. A comparação usa um período anterior de igual duração; sem base anterior, não é inventado um percentual. |
| Carteira e vencimentos | Total a receber, total a pagar, parcelas vencidas, próximas do vencimento e receitas líquidas no ano selecionado. |
| Fluxo de caixa | Barras de entradas e saídas e linha do resultado. Selecione um intervalo com mouse, toque ou teclado; Ver dados do gráfico abre a tabela. |
| Despesas por categoria | Distribuição das saídas do período. A legenda permite consultar cada categoria. Estornos de recebimentos são identificados separadamente. |
| Terrenos e Casas e construções | Quantidades por situação e resumos de vendas, recebimentos, saldos e custos. |
| Resultado por casa | Contrato ativo, custo acumulado, lucro bruto estimado e caixa realizado. O código do imóvel abre a ficha financeira. |
| Últimas movimentações | Registros recentes do período, com descrição, pessoa/imóvel, conta, data e valor. Ver extrato abre o Financeiro. |
| Prioridade de recebimento | Parcelas vencidas ou vencendo hoje. Receber abre a baixa da parcela. |

### Como utilizar

1. Escolha o período e a visão de caixa.
2. Leia entradas, saídas e resultado; consulte os gráficos para entender a composição.
3. Verifique as cobranças prioritárias e use **Receber** quando houver confirmação do pagamento.
4. Use **Registrar despesa** para lançar uma compra/contratação ou **Receber receita** para uma entrada sem vínculo com parcela.

**Interpretação importante:** as carteiras de dívida, a disponibilidade dos imóveis e os custos acumulados representam a posição atual, com os destaques de período indicados na tela. Não são uma reconstrução histórica completa do patrimônio. A lista prioritária considera as dívidas atuais, mesmo quando o período do gráfico é outro. Saldos iniciais gerais não são rateados automaticamente entre terrenos e casas. Perfis sem acesso financeiro recebem uma visão operacional reduzida.

## 5. Central de notificações

**Menu:** Visão geral > Central de notificações. **Finalidade:** organizar a cobrança das parcelas.

**Componentes:** cards Parcelas em atraso, Vencem hoje e Próximos vencimentos; tabela Agenda de cobrança; identificação de cliente e imóvel; vencimento, valor, saldo, situação e ações de recebimento/recibo.

1. Comece pelas parcelas em atraso e pelas que vencem hoje.
2. Localize a parcela na agenda e confira cliente, imóvel e saldo.
3. Use **Receber** somente após confirmar a entrada do dinheiro.
4. Ajuste o horizonte de próximos vencimentos em **Configurações > Ajustar antecedência**.

A central é calculada ao consultar ou atualizar os dados. Não envia mensagens automáticas, notificações agendadas ou lembretes por WhatsApp.

## 6. Terrenos

**Menu:** Imóveis e engenharia > Terrenos. **Finalidade:** cadastrar e consultar terrenos e sua disponibilidade comercial.

**Componentes:** busca, botão Novo imóvel e cards com código, nome, localização, valor pedido e situação Disponível, Reservado ou Vendido. Quando preenchidos, aparecem loteamento, quadra, lote e área. Os cards oferecem Documentos, Ficha financeira e edição/consulta conforme o perfil.

1. Clique em **Novo imóvel** e mantenha o tipo Terreno.
2. Informe código, nome e localização. Complete loteamento, quadra, lote e metragem quando aplicável.
3. Registre custo e data de aquisição, preço pedido e demais informações pertinentes.
4. Salve e use **Documentos** para anexar arquivos do imóvel.
5. Para vender ou reservar, utilize as telas comerciais; a disponibilidade acompanha essas operações.

O código, o tipo e o custo de aquisição ficam protegidos na edição de imóveis existentes. Alterar o preço pedido não altera contratos já registrados. Informar custo de aquisição não lança uma saída no caixa; o pagamento é controlado no Financeiro.

## 7. Casas e construções

**Menu:** Imóveis e engenharia > Casas e construções. **Finalidade:** acompanhar cada casa desde o cadastro até a venda e sua apuração de custos.

**Aba Imóveis:** apresenta cards semelhantes aos de terrenos, com etapa da construção e informações da obra. O cadastro permite identificação da obra, responsável, início, previsão de conclusão, conclusão efetiva e orçamento. As etapas são Planejamento, Em construção, Acabamento e Concluída.

**Aba Custos e obras:** apresenta aquisição, materiais, mão de obra, custo acumulado total e orçamento de cada casa. Quando permitido, exibe resultado previsto/provisório. O atalho Consultar compras e despesas abre a consulta detalhada.

1. Cadastre a casa em **Novo imóvel**, com tipo Casa.
2. Preencha os dados da construção e o orçamento.
3. Atualize a etapa e as datas conforme a execução avança.
4. Registre compras e serviços vinculados à casa para compor seus custos.
5. Abra a **Ficha financeira** para examinar contrato, recebimentos, obrigações, custo e resultado.

O resultado provisório em Custos e obras pode usar o preço pedido quando ainda não há venda ativa. Na ficha e no relatório de custo/resultado, a ausência de venda ativa é indicada como tal. Não confunda preço pedido, orçamento e valor contratado. O perfil Obras pode atualizar dados de construção, mas não os dados comerciais protegidos.

## 8. Compras e despesas

**Menu:** Imóveis e engenharia > Compras e despesas. **Finalidade:** registrar o que foi comprado ou contratado, por quanto e quando, sem cadastrar produtos de estoque.

### Componentes principais

| Componente | Utilização |
| --- | --- |
| Registrar compra / despesa | Abre o formulário com descrição, valor total, data, vencimento e categoria. |
| Vínculos e detalhes | Imóvel/obra, fornecedor/prestador, classificação livre, quantidade, unidade e observações. |
| Filtros | Período por data da compra ou vencimento, registros sem data, imóvel/empresa, pessoa, categoria, situação e busca textual. |
| Totais | Total registrado e, para os perfis financeiros, pago até agora, saldo a pagar e saldo vencido. |
| Histórico | Mostra compra/vencimento, descrição, fornecedor/imóvel, valor, situação e ações. |
| Pagar | Abre a baixa total ou parcial da despesa. Disponível aos perfis financeiros. |
| Comprovantes e exportações | Anexa documentos e exporta os registros selecionados em PDF, XLSX e CSV. Há CSV detalhado com quantidades. |

### Como registrar e pagar

1. Clique em **Registrar compra / despesa**.
2. Descreva o que foi comprado/contratado e informe o valor total, sem multiplicação automática por quantidade.
3. Preencha a data da compra, o vencimento e a categoria.
4. Vincule imóvel e fornecedor quando houver. Para o perfil Obras, o imóvel é obrigatório.
5. Salve em **Registrar despesa**. O registro passa a compor custo e obrigação.
6. Quando houver pagamento, localize o registro e use **Pagar**; informe valor, conta, data, descrição e forma de pagamento.
7. Anexe a nota à despesa e o comprovante da transferência à movimentação do extrato, conforme a organização desejada.

Categorias disponíveis: materiais, mão de obra, serviços, impostos e cartório, comissões, fretes, equipamentos, água e energia e outras despesas. Quantidade e unidade são opcionais e não movimentam inventário.

**Exemplo:** uma compra de R$ 1.200,00 gera custo/obrigação de R$ 1.200,00. Uma baixa de R$ 400,00 gera apenas R$ 400,00 de saída no caixa e deixa R$ 800,00 a pagar.

Os filtros de compra e vencimento usam datas diferentes. Os valores pagos/pendentes refletem a situação atual, mesmo se parte do pagamento ocorreu fora do período pesquisado. Para saídas por data do pagamento, consulte o extrato. Registros antigos sem data da compra têm consulta própria. Aquisições de imóveis e devoluções por distrato ficam no Financeiro.

## 9. Mão de obra e serviços

**Menu:** Imóveis e engenharia > Mão de obra e serviços. **Finalidade:** consultar especificamente despesas classificadas como Mão de obra ou Serviços.

A tela oferece os filtros, totais, histórico, pagamento, comprovantes e exportações de Compras e despesas. O botão de registro inicia o formulário com Mão de obra selecionada.

1. Descreva o serviço ou etapa contratada, por exemplo, Instalação elétrica da casa C-01.
2. Informe valor, contratação, vencimento, prestador e imóvel.
3. Escolha **Mão de obra** ou **Serviços** para que o registro apareça nesta consulta.
4. Registre os pagamentos efetivos com **Pagar**.

Se outra categoria for escolhida, o registro permanece na consulta geral de Compras e despesas. A tela não realiza folha de pagamento, encargos trabalhistas ou gestão de ponto.

## 10. Clientes

**Menu:** Comercial e CRM > Clientes. **Finalidade:** manter os compradores identificados e acessar seu histórico financeiro.

**Componentes:** Nova pessoa; busca; tabela com nome, tipo, CPF/CNPJ, telefone e e-mail; Editar cadastro; Consultar ficha para os perfis financeiros.

1. Clique em **Nova pessoa** e confira o tipo Cliente.
2. Preencha nome ou razão social. Quando aplicável, complete CPF/CNPJ, RG, nascimento, estado civil, profissão, contatos, endereço e observações.
3. Salve antes de registrar a venda.
4. Use **Consultar ficha** para acompanhar contratos, pagamentos e dívida do cliente.

CPF/CNPJ é opcional e sua validação não consulta a Receita Federal. O WhatsApp é um campo de contato; não habilita envio automático. O tipo de um cliente vinculado a venda não pode ser trocado livremente.

## 11. Fornecedores e prestadores

**Menu:** Comercial e CRM > Fornecedores. **Finalidade:** organizar os favorecidos das compras e serviços.

**Componentes:** Nova pessoa; busca; tabela de cadastro e contato; edição/consulta; Consultar ficha para os perfis financeiros.

1. Cadastre a pessoa como **Fornecedor** ou **Prestador**.
2. Vincule esse cadastro às compras, serviços ou outras obrigações pertinentes.
3. Abra **Consultar ficha** para examinar as obrigações da pessoa em Relatórios.
4. Confira a seção **Pagamentos e estornos do fornecedor** para o histórico das movimentações.

A ficha separa valor da obrigação e pagamento: eles não devem ser somados como duas despesas. O filtro de obrigações usa a data da compra/contratação; a seção de pagamentos usa a data da movimentação. Ao abrir pelo cadastro, o fornecedor já vem selecionado.

## 12. Vendas e contratos

**Menu:** Comercial e CRM > Vendas e contratos, aba Vendas e acordos. **Finalidade:** registrar contratos, gerar contas a receber e preservar o histórico de acordos.

**Componentes:** Nova venda; busca por cliente/imóvel; tabela com data, contratado, saldo conforme o perfil, situação e versão do cronograma; Documentos, Histórico, Renegociar e Distrato.

### Registrar uma venda

1. Cadastre antes o cliente e o imóvel.
2. Clique em **Nova venda** e selecione cliente e imóvel disponível.
3. Informe valor base, juros acordados em valor fixo e desconto acordado. Se não houver ajustes, mantenha zero.
4. Escolha periodicidade: semanal, a cada 14 dias, mensal, trimestral ou anual.
5. Descreva os ajustes quando houver; informe entrada prevista, quantidade de parcelas do saldo, data da venda e primeiro vencimento.
6. Confira a prévia do total final e das primeiras/últimas parcelas; salve.
7. Receba a entrada e as parcelas em **Parcelas e recebimentos** quando o dinheiro for confirmado.

Total final = valor base + juros fixos acordados - desconto acordado. A soma da entrada e do cronograma corresponde a esse total, com ajuste de centavos na última parcela. Para venda à vista, use uma parcela ou entrada igual ao total. Juros não são uma taxa automática recorrente e não há encargos automáticos por atraso.

O sistema impede outra venda ativa do mesmo imóvel. A seção Documentos guarda arquivos do contrato; não gera automaticamente um contrato jurídico nem realiza assinatura digital.

### Renegociar parcelas

1. Na venda ativa com saldo pendente, clique em **Renegociar**.
2. Informe quantidade de novas parcelas, primeiro vencimento e motivo/condições.
3. Confira o saldo mantido e a prévia; confirme a renegociação.

Somente o saldo pendente é reprogramado, em parcelas mensais e sem novos juros ou descontos. Parcelas anteriores ficam encerradas por acordo, com os recebimentos preservados. A renegociação não gera dinheiro em caixa. Recebimentos ligados a parcelas substituídas ficam protegidos contra estorno para não invalidar o acordo.

### Realizar distrato

1. Clique em **Distrato** na venda ativa.
2. Informe a devolução explicitamente acordada, inclusive quando for zero, seu vencimento e o motivo.
3. Confira os valores e confirme o acordo.

O distrato encerra a cobrança pendente e libera o imóvel para nova venda, mantendo o histórico anterior. Uma devolução positiva gera conta a pagar; o caixa só muda quando ela é paga. A devolução não pode exceder o recebido líquido. Não há cálculo automático de multa ou retenção.

## 13. Reservas

**Acesso:** Vendas e contratos > aba Reservas. **Finalidade:** reservar um imóvel para determinado cliente antes da venda.

**Componentes:** Nova reserva; tabela de imóvel, cliente, data limite, situação e ações Converter em venda, Liberar e Histórico.

1. Clique em **Nova reserva** e escolha imóvel disponível, cliente e data limite.
2. Registre observações quando necessário e salve.
3. Use **Converter em venda** para abrir o cadastro da venda com cliente e imóvel preenchidos.
4. Se o negócio não seguir, use **Liberar** e descreva o motivo.

A reserva vale até o fim do dia informado, no horário de São Paulo. Após vencer, as consultas consideram o imóvel disponível. As situações incluem Ativa, Expirada, Liberada e Convertida em venda. Reservar ou liberar não movimenta caixa. Uma reserva ativa impede venda para outro cliente.

## 14. Parcelas e recebimentos

**Menu:** Financeiro > Parcelas e recebimentos. **Finalidade:** dar baixa nas entradas e parcelas geradas pelas vendas.

**Componentes:** busca por cliente/código do imóvel; filtro Todas as parcelas, Em aberto, Em atraso, Pagas ou Encerradas por acordo; tabela de parcela, vencimento, valor, saldo, situação e ações Receber/Recibo.

### Receber integralmente, parcialmente ou antes do vencimento

1. Localize a parcela e clique em **Receber**.
2. Confira o saldo sugerido. Para baixa parcial, informe apenas o valor recebido.
3. Selecione a conta e informe a data real do pagamento, a descrição **Referente a quê?**, a forma de pagamento e observações opcionais.
4. Confirme. O saldo e o status são atualizados e a receita é lançada no caixa na mesma operação.
5. Consulte o extrato para comprovante e **Recibo PDF** individual.

É permitido receber uma parcela antes do vencimento; isso é uma antecipação, sem desconto automático. Não é permitido receber acima do saldo nem informar uma data futura para uma baixa já realizada.

**Situações:** A vencer, Vence hoje, Atrasada, Paga parcialmente, Parcial · atrasada, Paga, Renegociada ou Cancelada. Parcelas encerradas por acordo não voltam a ser cobradas como parcelas ativas.

O botão **Recibo** da parcela abre um demonstrativo consolidado dos recebimentos e estornos, com opção de impressão/salvar PDF. Ele é diferente do recibo individual por movimentação. Uma baixa parcial não quita o contrato inteiro.

## 15. Financeiro consolidado

**Menu:** Financeiro > Financeiro consolidado. **Finalidade:** operar contas, examinar o extrato e pagar obrigações da empresa.

### Contas e saldo inicial

Os cards mostram nome da conta, saldo atual, saldo inicial, segmento e data inicial, quando conhecida.

1. Clique em **Nova conta**.
2. Informe nome, saldo inicial, segmento e data do saldo inicial.
3. Use Geral / empresa para uma conta compartilhada; use Terrenos ou Casas e obras para uma conta exclusiva.
4. Confira o saldo com os registros já existentes antes de iniciar novas baixas.

O saldo inicial pode ser negativo. A data define o início do controle, e novas baixas não podem antecedê-la. **Classificar conta** permite ajustar segmento/data com justificativa; não altera o valor inicial nem os lançamentos. O sistema pode rejeitar uma conta exclusiva incompatível com seus movimentos existentes.

### Extrato e filtros

| Componente | Utilização |
| --- | --- |
| Filtros do extrato | Datas, conta, pessoa, segmento, imóvel, categoria, operação e busca por descrição/forma. |
| Restaurar filtros | Volta à seleção padrão, preservando o segmento fixo nas telas específicas. |
| Entradas, Saídas e Resultado da seleção | Totais somente dos movimentos filtrados, incluindo estornos. |
| Tabela do extrato | Data, Referente a quê?, categoria/forma, pessoa/imóvel, conta, valor e situação/ações. |
| Exportar PDF / XLSX / CSV | Baixa a seleção para consulta ou conferência. |
| Comprovantes | Anexa ou abre documentos da movimentação. |
| Recibo PDF | Gera recibo de um recebimento válido, individual. Não aparece para estornos ou recebimentos estornados. |
| Estornar | Cria o lançamento inverso, mediante justificativa, mantendo o original. |

**Saldos dos cards e contas a pagar não acompanham os filtros do extrato.** Eles mostram posição atual. Um filtro de mês não oculta uma obrigação fora daquele mês na lista geral de contas a pagar.

### Pagar uma obrigação e corrigir uma baixa

1. Em **Contas a pagar**, localize descrição, favorecido, imóvel, vencimento e saldo.
2. Clique em **Pagar** e informe valor, conta, data, descrição e forma.
3. Confirme a baixa total ou parcial. Não registre outra despesa para representar esse pagamento.
4. Se uma baixa estiver errada, localize-a no extrato e use **Estornar**, com motivo. Após a reversão, registre a baixa correta se aplicável.

O estorno financeiro preserva o histórico e corrige os saldos; não representa uma transferência bancária automática. Recebimentos vinculados a acordos encerrados podem não admitir estorno. Não existe exclusão silenciosa de lançamentos financeiros pela interface.

### Registrar outra receita

Use **Receber outra receita** para uma entrada efetivamente recebida que não seja baixa de venda/parcela. Preencha descrição, valor, data, conta, forma e vínculos opcionais. Recebimentos de parcelas devem sempre ser baixados na própria parcela para reduzir a dívida do cliente.

### Controlar pagamento da aquisição

A seção **Pagamentos de aquisição de imóveis** mostra imóveis com custo de aquisição positivo.

1. Clique em **Iniciar controle** no imóvel ainda não controlado.
2. Informe quanto foi pago antes do início deste controle, mesmo que seja zero, além do vencimento, favorecido opcional e justificativa.
3. Confirme que o saldo inicial do caixa já considera os pagamentos anteriores.
4. Confira a obrigação e salve. Depois, use **Pagar aquisição** para as baixas do saldo restante.

A abertura cria uma obrigação única, sem duplicar o custo nem lançar pagamentos antigos novamente no caixa. A situação inicial fica protegida após a confirmação. Imóveis sem controle iniciado não entram automaticamente nas contas a pagar.

## 16. Financeiro dos terrenos

**Menu:** Financeiro > Financeiro dos terrenos. **Finalidade:** consultar o caixa e as obrigações atribuídos aos terrenos.

A tela mantém extrato, filtros, exportação, pagamento, estorno e comprovantes. O segmento Terrenos é fixo. A lista de obrigações e o controle de aquisição também respeitam esse segmento.

O destaque **Saldo atribuído ao segmento** considera movimentos ligados aos terrenos e saldos iniciais das contas exclusivas desse segmento. Os cards mostram as contas exclusivas de terrenos. Uma movimentação vinculada a terreno pode aparecer nesta visão mesmo que tenha passado por uma conta bancária geral.

Saldos iniciais gerais não são divididos automaticamente entre terrenos e casas. Uma conta exclusiva de terrenos rejeita pagamentos vinculados a casas.

## 17. Financeiro das casas

**Menu:** Financeiro > Financeiro das casas. **Finalidade:** consultar o caixa e as obrigações atribuídos às casas/obras.

Oferece os mesmos componentes da visão consolidada, com segmento Casas fixo e obrigações/aquisições correspondentes. O saldo atribuído combina as movimentações relacionadas às casas e a abertura das contas exclusivas desse segmento.

Use a visão para acompanhar desembolsos e recebimentos das obras. Para custo acumulado e resultado por imóvel, abra a ficha ou o relatório específico: o extrato considera data do dinheiro; o custo pode incluir compras ainda não pagas. Uma conta exclusiva de casas rejeita pagamentos vinculados a terrenos.

## 18. Fichas financeiras de cliente e imóvel

**Acesso:** Consultar ficha em Clientes ou Ficha financeira no card de imóvel; códigos de imóveis em alguns painéis também abrem a ficha. Não é um item principal separado no menu.

| Área da ficha | O que apresenta |
| --- | --- |
| Seletor Cliente / Imóvel | Escolhe a entidade consultada. |
| Identificação e indicadores | Contratado ativo, recebido líquido, saldo a receber e saldo em atraso. |
| Resumo de cancelamentos/devoluções | Contratos cancelados, devoluções pagas e ainda a pagar, sem apagar o histórico. |
| Vendas e contratos | Relação das vendas vinculadas e sua situação. |
| Parcelas e saldo devedor | Vencimentos, recebido, saldo e situação, com atalho para registrar recebimento. |
| Custos e obrigações do imóvel | Aquisição, despesas, pago e pendente; aparece na ficha por imóvel. |
| Histórico de movimentações | Pagamentos, recebimentos e estornos de todo o período. |
| Exportações | PDF, XLSX e CSV; há também CSV detalhado da ficha. |

Na ficha do imóvel, o custo inclui aquisição uma única vez mais despesas operacionais vinculadas; devoluções por distrato não são custo de construção. O resultado bruto previsto é contrato ativo menos custo acumulado. O resultado de caixa da ficha considera lançamentos, sem saldo inicial de contas e sem rateio automático das despesas gerais da empresa.

## 19. Relatórios financeiros

**Menu:** Financeiro > Relatórios. **Finalidade:** consultar e exportar análises com critérios explícitos.

**Componentes:** seletor Relatório; datas De/Até; segmento; imóvel; cliente/fornecedor; filtro de situação na Carteira de parcelas; tabela de resultados; notas sobre a base dos valores; Exportar PDF, XLSX e CSV.

| Relatório | Base de consulta |
| --- | --- |
| Extrato financeiro | Data da movimentação, incluindo estornos. |
| Fluxo de caixa por período | Entradas, saídas e resultado em até 12 intervalos; não inclui saldos iniciais. Exige intervalo válido. |
| Vendas e contratos | Data da venda, valor contratado e situação ativa/cancelada. |
| Carteira de parcelas | Vencimento; recebido e saldo atuais. Permite Todas, A receber, Vencidas e Pagas. |
| Recebimentos de parcelas | Movimentos de recebimento de venda e seus estornos, pela data de caixa. |
| Contas a pagar | Obrigações ainda pendentes, filtradas por vencimento, com saldo atual. |
| Compras e despesas | Data da compra/contratação; valores pagos e pendentes atuais. |
| Mão de obra e serviços | Compras/contratações das categorias correspondentes. |
| Despesas por categoria | Custos operacionais por data da compra, independentemente do pagamento. Exclui aquisição e devolução. |
| Custo e resultado por imóvel | Posição acumulada atual. Não aplica período nem filtro por pessoa; esses campos ficam desabilitados. |
| Ficha de fornecedor | Obrigações por data da compra; seção adicional de pagamentos/estornos por data de movimentação. |

1. Escolha a pergunta que deseja responder e selecione o relatório adequado.
2. Informe os filtros e leia a nota de interpretação abaixo do título.
3. Confira a tabela e clique no formato desejado. Sem registros, a exportação fica desabilitada.

O PDF é indicado para consulta e impressão; XLSX mantém valores monetários numéricos para análise; CSV facilita importação e conferência em planilhas. Os arquivos reproduzem a seleção, não fazem backup integral do sistema. Registros sem data de compra não aparecem em períodos delimitados por essa data.

## 20. Documentos, comprovantes e recibos

**Acesso:** Documentos nos imóveis/vendas e Comprovantes nas despesas/movimentações.

1. Abra o registro certo e clique em **Documentos** ou **Comprovantes**.
2. Use **Anexar documento / Selecionar documento** e escolha o arquivo.
3. Aguarde o envio. O nome aparece na lista; clique nele para abrir em outra aba.
4. Use **Concluir** para fechar a janela.

São aceitos PDF, JPG e PNG, com até 10 MB por arquivo. Os documentos são privados e a abertura utiliza link temporário; abra novamente pelo sistema se ele expirar. A interface atual não oferece botão para excluir ou substituir anexos.

Anexo é um arquivo enviado pelo usuário. Recibo PDF é um documento gerado a partir de um recebimento. Nenhum dos dois cria ou confirma, sozinho, um pagamento no banco. O sistema não envia documentos automaticamente por e-mail ou WhatsApp.

## 21. Configurações

**Menu:** Administração > Configurações. **Finalidade:** consultar o perfil e ajustar a antecedência dos alertas.

**Componentes:** Antecedência dos alertas, Ajustar antecedência, Seu perfil e, para Administrador, Contas de acesso.

1. Clique em **Ajustar antecedência**.
2. Informe entre 0 e 60 dias e salve.
3. Volte à Central de notificações para consultar o horizonte atualizado.

A preferência é individual. Zero considera o próprio dia e os atrasos na agenda, sem antecipar dias futuros. A configuração não agenda envio externo de notificações.

## 22. Usuários e permissões

**Menu:** Administração > Usuários e permissões, disponível ao Administrador. **Finalidade:** consultar orientações de acesso e abrir a gestão de contas no Supabase.

A tela mostra o perfil e o atalho **Gerenciar contas no Supabase**. A criação e a confirmação de contas ocorrem no Supabase Authentication, não em um formulário interno do FinanceImob. O provisionamento automático de novos perfis depende da configuração global de contas gerenciadas; criar um usuário de Auth não garante acesso se essa configuração ainda não estiver habilitada. Consulte o responsável técnico para novos acessos.

| Perfil | Resumo de uso |
| --- | --- |
| Administrador | Acesso completo às telas e operações implementadas. |
| Financeiro | Caixa, parcelas, pagamentos, acordos, relatórios e consultas; imóveis em consulta, sem criação de vendas/imóveis pela interface. |
| Vendas | Cadastros comerciais, imóveis, reservas e novas vendas; sem acesso aos módulos de caixa/baixa financeira. |
| Obras | Casas, atualização da construção, compras e serviços; sem visão financeira consolidada. |

Os botões e dados apresentados respeitam o perfil. Solicite ao responsável os ajustes de acesso; não compartilhe credenciais. Esta fase não oferece uma central interna completa para administrar usuários e permissões.

## 23. Rotinas recomendadas e exemplos

### Primeiro uso

1. Confira sua conta e seu perfil.
2. Cadastre contas/caixas com saldo e data inicial conferidos.
3. Cadastre imóveis, clientes e fornecedores.
4. Inicie o controle das aquisições, distinguindo o que já foi pago antes do sistema.
5. Registre vendas, compras e serviços; dê baixa somente nos valores efetivamente movimentados.

### Rotina diária

1. Abra o Dashboard e confira cobranças prioritárias.
2. Registre os recebimentos confirmados nas parcelas correspondentes.
3. Registre novas compras/contratações e seus vencimentos.
4. Baixe os pagamentos efetivamente realizados.
5. Anexe documentos e confira o extrato com os comprovantes bancários.

### Fechamento de período

1. Filtre o Financeiro pelas datas do fechamento e confira conta por conta.
2. Verifique saldos pendentes nas telas/relatórios próprios, sem confundi-los com o caixa do mês.
3. Consulte custo e resultado dos imóveis e investigue registros sem vínculo ou sem data.
4. Exporte os relatórios necessários para conferência e arquivo.

### Exemplo: venda com entrada

Uma venda de R$ 120.000,00, sem ajustes, tem entrada prevista de R$ 20.000,00 e 10 parcelas de R$ 10.000,00. Registrar a venda cria a cobrança. Receber os R$ 20.000,00 na entrada gera a receita correspondente e deixa R$ 100.000,00 a receber. Não registre a entrada novamente como Outra receita.

### Exemplo: aquisição anterior ao controle

Um terreno custa R$ 50.000,00 e R$ 30.000,00 já foram pagos antes da abertura do caixa no sistema. Ao iniciar o controle, reconheça R$ 30.000,00 como anteriores. O custo continua R$ 50.000,00, o saldo a pagar fica R$ 20.000,00 e nenhuma saída antiga é duplicada. A baixa posterior de R$ 5.000,00 reduz o saldo a R$ 15.000,00 e gera saída atual de R$ 5.000,00.

## 24. Dúvidas frequentes

| Situação | Como proceder |
| --- | --- |
| O valor vendido não apareceu no caixa | Confirme o recebimento da entrada/parcela. A venda registra contrato e cobrança, não o dinheiro. |
| Registrei a compra, mas não houve saída | Use Pagar quando houver pagamento efetivo. Não crie uma segunda despesa. |
| Recebi parte de uma parcela | Informe o valor efetivamente recebido; o restante continua pendente. |
| A conta não aceita o imóvel escolhido | Confira segmento e data inicial. Contas exclusivas não aceitam outro segmento. |
| O filtro do extrato não mudou o saldo das contas | É esperado: cards de conta são posição atual, enquanto os totais da seleção são filtrados. |
| Não encontro uma compra em um mês | Confira se o filtro usa compra ou vencimento; verifique também a consulta de registros sem data. |
| O saldo do cliente não diminuiu após Outra receita | Pagamentos da venda precisam ser baixados na parcela correta. Confira o lançamento e corrija com estorno justificado, se permitido. |
| O botão esperado não aparece | Verifique seu perfil, a situação do registro e se a operação já foi encerrada por acordo. |
| Não consigo estornar um recebimento antigo | Ele pode estar vinculado a renegociação ou distrato. Não substitua o acordo por um lançamento avulso; solicite análise do responsável. |
| Um documento não abriu | Abra novamente pelo sistema e confira bloqueio de novas abas, conexão e permissões. |
| A exportação está desabilitada | Revise os filtros, o intervalo de datas e a existência de registros na seleção. |
| O login falhou | Confira e-mail/senha e conexão. Para recuperar acesso, procure o responsável; não informe a senha no chat. |

## 25. Limites atuais

Não fazem parte desta versão: estoque físico/catálogo de produtos, mensagens automáticas por WhatsApp, notificações agendadas, conciliação ou transferência bancária automática, integração técnica com a Caixa, assinatura digital, geração automática de contrato jurídico, cálculo automático de multas/correção e uma tela geral de auditoria.

Os registros de operações e justificativas são preservados no sistema. Revisão excepcional de acordos encerrados, backup/restauração e rotinas operacionais de retenção dependem do responsável técnico. Consultar o sistema não substitui conferir os documentos e o movimento real das contas.
