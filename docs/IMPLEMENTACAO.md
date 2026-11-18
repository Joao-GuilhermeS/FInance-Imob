# Finance Imob — primeira entrega

## Escopo implementado

Aplicação React/TypeScript responsiva, com autenticação por e-mail/senha e banco Supabase centralizado. Ambiente remoto: projeto `IMOB-Project` (`jahefxamnkcuyayotqcl`), organização retornada pela integração: `imob`.

- Login individual e autorização no banco: administrador, financeiro, vendas e obras.
- Cadastro de clientes, fornecedores e prestadores.
- Cadastro de terrenos e casas; edição de valores de venda e etapa da construção.
- Venda com entrada prevista e parcelas mensais, sem juros automáticos. À vista é uma obrigação única, confirmada no recebimento.
- Datas mensais calculadas a partir do primeiro vencimento, sem desvio de mês após fevereiro.
- Recebimento integral, parcial e antecipado; saldo atualizado e caixa na mesma transação.
- Contas/caixas com saldo inicial; despesas com vencimento e pagamentos parciais.
- Materiais, mão de obra, serviços e demais custos separados por imóvel; quantidade, unidade e valor total da compra.
- Estorno justificado por lançamento inverso; histórico de auditoria protegido.
- Dashboard com caixa, entradas, saídas e recebíveis; filtros de período para movimentações realizadas.
- Central de alertas calculada ao consultar; antecedência individual configurável.
- Contratos, documentos de imóveis e comprovantes de despesas privados (PDF/JPG/PNG, até 10 MB). Links assinados com validade curta.
- Recibo consolidado por parcela para impressão/PDF e extrato em CSV.
- Fichas financeiras de cliente e imóvel, acessíveis pelo menu e por atalhos nos cadastros; vendas, parcelas, saldo pendente, atraso e histórico de pagamentos/estornos.
- Na ficha do imóvel: aquisição e custos incorridos, obrigações em aberto, resultado previsto da venda e resultado de caixa registrado, sem duplicar custos nem misturar saldo inicial.
- Extrato com filtros combináveis de período, conta, pessoa, imóvel, segmento, categoria, operação e busca; totais e CSV refletem a seleção. A atualização dos dados preserva os filtros da tela.
- Contas a pagar no dashboard, com total pendente e saldo em atraso; no financeiro, vencimentos ordenados e pagamento parcial identificado.
- Cadastros ampliados de pessoas: RG, nascimento, estado civil, profissão/atividade, telefone e WhatsApp separados, endereço e observações; edição por administrador, financeiro e vendas.
- Cadastros ampliados de imóveis: loteamento, quadra, lote, metragem, aquisição, identificação e responsável da obra, início, previsão e conclusão efetiva; atualização respeita o perfil e mantém os vínculos financeiros.
- Formulários organizados por seções, validação de formato e datas, mensagens junto aos campos e resumo de erros com foco de teclado.

## Regras financeiras

1. Valores em centavos inteiros; não usar ponto flutuante para armazenar dinheiro.
2. Venda não altera caixa. Entrada prevista também precisa ser recebida.
3. Despesa operacional compõe o custo ao ser registrada; caixa muda somente no pagamento. A obrigação de aquisição não soma novo custo: o valor já integra o cadastro do imóvel.
4. Aquisição é um custo-base do cadastro do imóvel, não uma segunda despesa na apuração de custos. O Financeiro permite iniciar uma obrigação de aquisição, reconhecer explicitamente pagamentos anteriores e pagar o restante. O saldo inicial deve refletir a situação de abertura do sistema; o reconhecimento anterior não cria lançamento de caixa.
5. Recebimentos e pagamentos são limitados ao saldo restante. A operação trava a parcela/despesa no banco.
6. Chaves de solicitação previnem duplicação em tentativas repetidas do mesmo envio.
7. Estornos preservam o registro original e restauram o saldo pendente.
8. Resultado previsto do imóvel = venda contratada (ou preço pedido se ainda não vendido) menos aquisição e custos incorridos. Continua provisório enquanto houver custos a registrar; não representa lucro líquido contábil.
9. Dashboard mostra os saldos atuais de caixa e recebíveis independentemente do período selecionado. Entradas, saídas e resultado de caixa respeitam o período.
10. Autocadastro não libera dados. Somente um perfil autorizado pode consultar a operação. O proprietário verificado `perseu.wr@gmail.com` recebe o perfil administrador inicial.

## Permissões iniciais

| Perfil | Leitura | Operações |
| --- | --- | --- |
| Administrador | Toda a operação e auditoria | Todos os cadastros e RPCs; atribuição de perfis |
| Financeiro | Pessoas, imóveis, vendas, parcelas, contas e despesas | Pessoas, contas, despesas, pagamentos, recebimentos e estornos |
| Vendas | Pessoas, imóveis e vendas | Pessoas, imóveis e novas vendas; contratos |
| Obras | Fornecedores/prestadores, imóveis e despesas | Novos fornecedores/prestadores, atualização dos dados de construção e despesas vinculadas a obras; não acessa cadastros de clientes nem altera preços de venda |

As permissões são verificadas por RLS, privilégios de coluna e funções autorizadas. Esconder um botão não é a barreira de acesso. Nenhuma chave privilegiada fica no navegador.

## Prioridades do MVP financeiro — revisão de 18/11/2026

O objetivo principal é o controle financeiro especializado em terrenos, casas e obras. Conforme esclarecimento do responsável, compras são registros livres do que foi comprado, por quanto e quando. Não haverá cadastro obrigatório de produtos, entradas/saídas físicas, inventário ou transferências de estoque. Quantidade e unidade são complementos opcionais; o valor total é informado diretamente. Cadastro de categorias também não é pré-requisito: a classificação complementar é texto livre pesquisável.

A fase atual utiliza um único usuário; ampliar a gestão de usuários não é prioridade. Reservas, renegociação e distrato já estão implementados. Compras e despesas possuem registro próprio e consultas por período, imóvel, fornecedor, categoria, situação e texto.

Próximas entregas funcionais:

1. Ficha de fornecedores com compras, pagamentos e pendências; consultas específicas de mão de obra e serviços.
2. Dashboard completo por segmento e relatórios gerenciais, com exportação PDF e Excel nativo. CSV já está disponível, mas não substitui essa entrega.
3. Complementos de vendas (condições, responsável comercial, observações), resumo de entrada/parcelas nas fichas, recibo individual por pagamento e comprovantes acessíveis por recebimento.
4. Notificações agendadas. A central atual calcula avisos ao consultar, sem envio externo.
5. Consulta geral de auditoria; os registros de autoria e alterações já existem no banco.
6. Publicação e validação operacional: backup/restauração, retenção de anexos, URLs de autenticação e SMTP. Backup hospedado ainda não verificado.

Posteriores: revisão excepcional de acordos encerrados, gestão ampliada de usuários e cálculos automáticos de juros, descontos, multas ou correção (dependem de regras comerciais). Renegociação conserva o saldo e distrato exige devolução explicitamente acordada.

WhatsApp automático, integração bancária, integração técnica com a Caixa e assinatura digital permanecem fora do primeiro recorte. Rateio administrativo e compras com múltiplos itens na mesma nota são melhorias possíveis, não condições para fechar esta etapa.

## Verificação

- `npm run build`: TypeScript e build de produção.
- `npm test`: conversão monetária e situação de parcelas, incluindo pagamento parcial em atraso.
- `src/lib/financial.test.ts`: consolidação por cliente/imóvel, múltiplas vendas, obrigações parciais, estornos, categorias, filtros combinados, intervalos de data, seleção vazia e CSV com proteção contra fórmulas.
- `supabase/tests/finance_core.sql`: integração transacional; fixtures e usuário de teste são revertidos com ROLLBACK.
- Verificação no navegador com conta descartável; nenhuma credencial de usuário real é utilizada.

Resultados em 14/11/2026: build e quatro testes unitários aprovados; testes transacionais de banco aprovados, incluindo arredondamento e bloqueio de perfil inativo; login, cliente, imóvel, venda e recebimento parcial conferidos no navegador; arquivo privado enviado, aberto por link assinado e removido pelo Storage API; acesso anônimo negado. Layout de 375 px conferido sem rolagem horizontal da página.

Pendência de limpeza: a confirmação da ferramenta SQL para excluir fixtures expirou duas vezes. O usuário `qa-finance-imob@example.invalid` foi bloqueado, sua senha invalidada e seu perfil desativado. Os registros `QA` permanecem até execução do script revisável `docs/cleanup-qa.sql`. Não usar esses valores como dados reais.

O último Advisor do Supabase apontou **Leaked Password Protection Disabled**. A proteção contra senhas vazadas deve ser ativada nas configurações de Auth quando disponível no plano: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. Não restaram alertas de RLS ou de funções públicas privilegiadas nesta verificação.

O projeto não está publicado. A aplicação está configurada para desenvolvimento contra o Supabase remoto. Mudanças de schema devem ser versionadas e revisadas antes de aplicação; nunca usar reset/push destrutivo nesse projeto.

## Segunda entrega: fichas e consultas financeiras

- Build de produção e 17 testes unitários aprovados.
- Fichas, seleção por URL, filtros combinados, seleção vazia, persistência dos filtros após atualização e download do CSV verificados em navegador.
- Layouts de fichas e extrato conferidos em desktop e 375 px, sem rolagem horizontal da página; tabelas mantêm sua rolagem interna.
- Navegação da nova ficha restrita a administrador/financeiro; perfil Vendas redirecionado ao dashboard sem solicitar dados financeiros.
- Esta verificação de interface utilizou respostas de API simuladas, isoladas no navegador. Não foram criados usuários ou registros no Supabase, nem alterados schema, RLS ou regras de pagamento. As regras de escrita do banco não foram retestadas nesta entrega, pois permaneceram inalteradas.
- Exportação disponível em CSV, incluindo resumo, contratos, parcelas, custos e histórico da ficha. Excel nativo e relatórios PDF completos continuam pendentes.

## Terceira entrega: cadastros completos e edição — 17/11/2026

- Campos adicionais opcionais preservam a compatibilidade com registros existentes.
- Pessoas: os dados podem ser preenchidos e corrigidos na mesma ficha, com CPF/CNPJ normalizado e formato conferido (sem consulta externa nem cálculo de dígito verificador). O tipo de cliente não pode mudar quando há venda vinculada.
- Imóveis: código, tipo e custo de aquisição são mantidos na edição; preço pedido não altera o valor de venda contratada. Correções de aquisição continuam reservadas ao futuro fluxo financeiro.
- Obras atualiza identificação, responsável, datas, etapa, orçamento e observações da construção. O banco bloqueia mudanças de preço pelo perfil Obras.
- Duas migrações aditivas aplicadas ao `IMOB-Project`, com versões locais sincronizadas com o histórico remoto. Não há exclusão de dados nem alteração de parcelas ou lançamentos existentes.
- Build de produção e 25 testes unitários aprovados. `supabase/tests/registry.sql` valida os novos dados, permissões, auditoria e manutenção dos vínculos/saldos; `supabase/tests/finance_core.sql` foi reexecutado e aprovado. Ambos revertem suas fixtures com ROLLBACK.
- Interface verificada com API simulada no navegador; as alterações simuladas não são gravadas no Supabase. A verificação do banco foi feita separadamente por testes transacionais reais.
- No navegador: documento inválido manteve os dados preenchidos e focou o resumo de erros; edição de pessoa e de imóvel reaberta com os novos valores; campos protegidos ausentes do PATCH de imóvel; formulários conferidos em desktop e 375 px, sem transbordamento horizontal do diálogo ou da página.
- A consulta ao Advisor manteve apenas o aviso já conhecido de proteção contra senhas vazadas desativada; não foram apontados avisos de RLS ou funções públicas privilegiadas.
- Versionamento da etapa em branch `codex/feat-cadastros-completos`, com classificação `feat`. Fluxo contínuo de branches, testes, PRs e merges registrado em `docs/GIT_WORKFLOW.md`; acesso remoto posteriormente corrigido e entrega integrada à main pelo PR #1.


## Quarta entrega: ciclo comercial — 17/11/2026

- Reservas com validade inclusiva no horário de São Paulo, liberação justificada e conversão em venda para o cliente reservado. Disponibilidade efetiva calculada no banco, sem depender de tarefa agendada.
- Renegociação conserva todo o saldo em aberto, sem juros/descontos automáticos. Centavos são ajustados na última parcela e os vencimentos preservam a referência mensal. Parcelas substituídas e recebimentos permanecem no histórico.
- Distrato exige devolução acordada entre zero e o recebido líquido; encerra a cobrança e permite revenda sem excluir a venda anterior. Devolução positiva gera conta a pagar vinculada ao cliente e imóvel. O caixa muda apenas no pagamento dessa obrigação.
- Acordos possuem motivo, data, autor e dados financeiros auditáveis. Solicitações repetidas são idempotentes; alterações de saldo entre abertura e envio do formulário são rejeitadas pelo banco.
- Recebimentos de parcelas substituídas ou vendas canceladas ficam protegidos contra estorno, para não invalidar o acordo. Revisão desses acordos ainda não tem fluxo próprio. Pagamentos de devoluções podem ser estornados normalmente.
- Fichas, CSV, alertas, parcelas e totais consideram somente cobrança ativa; recebimentos e devoluções continuam no histórico. Devoluções não são custo de construção.
- Migração aplicada ao IMOB-Project e versão local sincronizada. Três scripts SQL transacionais aprovados: finance_core, registry e sales_lifecycle; todas as novas fixtures revertidas por ROLLBACK.
- Build aprovado; 30 testes unitários. Lint sem erros, com quatro avisos preexistentes em App/Documents.
- Navegador com API simulada: prévia de renegociação, valores enviados aos RPCs de renegociação/distrato e diálogo de distrato em 375 px sem transbordamento horizontal. A verificação do banco foi separada e real; a simulação não altera dados remotos.
- Advisor mantém apenas o aviso já documentado de proteção contra senhas vazadas desativada. Publicação da aplicação permanece pendente.

## Quinta entrega: compras e despesas financeiras — 18/11/2026

- Novo menu **Compras e despesas**, disponível para administrador, financeiro e obras. A antiga lista resumida de Obras direciona à consulta completa; o botão de registrar continua disponível em ambas as telas.
- Registro rápido: descrição livre, valor total, data da compra/contratação, vencimento e categoria. Imóvel/obra e fornecedor são opcionais para administrador/financeiro; Obras exige imóvel. Quantidade, unidade, classificação livre e observações são opcionais. Não há catálogo de produtos nem controle de estoque.
- O registro não movimenta caixa. Custo e obrigação usam a mesma despesa; pagamentos parciais e estornos usam os fluxos financeiros existentes. Comprovantes permanecem anexados à despesa.
- Consulta por data da compra ou vencimento, intervalo inclusivo, atalhos de hoje/mês/ano, imóvel/empresa, fornecedor, categoria, situação de pagamento e busca sem acentos. Classificação e observações entram na busca.
- Totais de custo registrado, pagos até agora, saldo pendente e saldo vencido refletem a seleção; CSV exporta somente os registros selecionados. Pagamentos são saldos atuais, não movimentações limitadas ao período da compra. Saídas por data de pagamento continuam no Financeiro.
- Datas antigas desconhecidas permanecem nulas. Sem período, aparecem todos os registros; opção específica localiza registros sem data da compra. Não se usa criação/vencimento como data da compra presumida.
- Devoluções de distrato ficam no Financeiro e não são classificadas como compras. O módulo não altera custo de aquisição de imóveis.
- Migração aditiva aplicada no IMOB-Project, sem apagar dados existentes; histórico remoto e local sincronizados. Novo RPC valida entradas, papéis, fornecedor/prestador, autoria e idempotência com conferência de todos os dados da solicitação. API antiga de despesas preservada.
- Build e 35 testes unitários aprovados. Lint sem erros; quatro avisos preexistentes em App/Documents. Quatro scripts SQL transacionais aprovados (purchase_records, finance_core, registry e sales_lifecycle), sempre com ROLLBACK das fixtures.
- Interface verificada em navegador com API simulada: filtros combinados, totais, CSV baixado e inspecionado, filtros preservados após atualizar, histórico sem data, validação sem perda de preenchimento, payload monetário em centavos e novo registro refletido na lista. Desktop e 375 px sem transbordamento horizontal da página ou diálogo. Nenhuma fixture de navegador foi gravada no banco remoto; regras reais verificadas separadamente pelos scripts SQL.
- Advisor sem novos alertas; permanece o aviso conhecido de senhas vazadas desativado: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Sexta entrega: outras receitas e pagamentos de aquisição — 18/11/2026

- **Financeiro → Receber outra receita**: registra entrada efetiva com descrição livre, conta, valor, data, forma de pagamento, pessoa/imóvel opcionais e observações. Categoria própria no extrato, filtros, CSV, comprovantes pelo lançamento e estorno justificado. Não gera nem baixa parcelas de vendas.
- **Financeiro → Pagamentos de aquisição de imóveis**: cada imóvel com custo positivo pode ter uma obrigação única, iniciada explicitamente pelo operador. O custo cadastrado é conferido contra o valor esperado para rejeitar formulários desatualizados. Imóveis não iniciados mostram saldo “a conferir” e não geram contas a pagar presumidas.
- Na abertura, exige valor já pago (inclusive zero), justificativa e conferência de que o saldo inicial já considera pagamentos anteriores. Esse reconhecimento é auditável, protegido após confirmação e reduz a obrigação sem gerar movimentação de caixa. Não se infere que aquisições antigas estão pagas ou pendentes.
- Pagamentos novos podem ser parciais, com data/conta/forma, e usam o fluxo financeiro existente. Limite de pagamento considera o reconhecimento anterior. Estorno restaura apenas o valor pago neste controle. Vencimento único para o saldo; não há cronograma parcelado de aquisição nesta entrega.
- Aquisição não duplica custo em obras/fichas e não entra como compra operacional. Conta a pagar inclui o saldo de aquisição. Receitas avulsas compõem caixa e aparecem separadas dos recebimentos contratuais nas fichas.
- Formulários e RPCs reservados a administrador/financeiro. Obras não consulta as obrigações de aquisição nem registra receitas avulsas. Notas e pessoa são preservadas em estornos de receitas.
- Migração aditiva aplicada, com histórico local/remoto sincronizado. Cinco scripts SQL transacionais aprovados: income_acquisitions, finance_core, registry, sales_lifecycle e purchase_records. Fixtures revertidas por ROLLBACK. Testes cobrem reconhecimento inicial, parcial, quitação, estorno, limite de pagamento, repetição de solicitações, dados alterados, custo desatualizado, privacidade e bloqueio anônimo.
- Build e 40 testes unitários aprovados. Lint sem erros, quatro avisos preexistentes em App/Documents. Advisor mantém somente o aviso conhecido de senhas vazadas desativadas, já documentado.
- Navegador com API simulada: prévia do saldo, payload da aquisição, valor padrão de pagamento considerando reconhecimento anterior, pagamento parcial refletido no caixa e obrigação; receita com pessoa/imóvel refletida no extrato e conta; CSV baixado e inspecionado. Layouts desktop e 375 px conferidos. O botão de comprovantes foi conferido com Storage simulado (caminho ledger/id); envio real não foi repetido nesta entrega. A primeira tentativa com token fictício chegou ao Storage e retornou 400, corretamente mostrado na interface; a simulação foi completada para isolar a verificação. Nenhum registro de navegador foi gravado no banco real.
- Ainda não há publicação nem teste de carga. Correção da situação inicial de aquisição após confirmação depende de futuro fluxo auditado; não há alteração direta dessa base pela interface.

## Ajuste: acesso das contas criadas no Supabase — 18/11/2026

- A conta operacional existente sem perfil foi corrigida no banco, como administrador ativo, sem alterar senha. Dados pessoais dessa correção não foram incluídos em migração pública.
- Removida a mensagem de espera por aprovação e o formulário de liberação adicional. Configurações aponta para o gerenciamento de contas no Supabase.
- No primeiro acesso sem perfil, a aplicação chama ensure_profile. A função usa somente a identidade autenticada, verifica confirmação/bloqueio/anonimato e cria perfil administrador; chamadas repetidas são idempotentes. Não aceita escolher outro usuário nem usa user_metadata para autorizar. Perfis existentes não são promovidos nem reativados.
- Provisionamento automático de novas contas tem trava global privada, inicialmente desabilitada, até comprovação de que cadastro público está desligado no Auth. Essa configuração é por ambiente, não uma aprovação por usuário. O login das contas já com perfil funciona normalmente enquanto isso.
- Situação ao implementar: Auth expõe disable_signup=false; a integração não oferece alteração dessa configuração e a CLI retornou Access denied ao consultar a configuração administrativa. Foi solicitado ao responsável desligar Allow new users to sign up no painel. Não foi habilitado provisionamento administrativo aberto a cadastros públicos.
- Build e 40 testes unitários aprovados; managed_auth_access.sql passou com ROLLBACK, verificando a trava, repetição, preservação de perfis/inatividade e bloqueio de anônimos, e-mails não confirmados e contas banidas. Navegador com API simulada confirmou passagem de usuário sem perfil para o dashboard via RPC. O React StrictMode pode disparar duas chamadas na montagem; ambas são idempotentes.
- Advisor mantém aviso conhecido de proteção contra senhas vazadas desativada. A tabela privada de configuração possui RLS e nenhum grant ao cliente; o informativo RLS sem políticas representa negação por padrão nessa tabela privada, não acesso aberto.
