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
3. Despesa compõe o custo ao ser registrada; caixa muda somente no pagamento.
4. Aquisição é um custo-base do cadastro do imóvel, não uma segunda despesa na apuração de custos. A primeira entrega não registra o financiamento/pagamento da aquisição: saldo inicial deve refletir a situação de abertura do sistema.
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

## Próximos incrementos para fechar o MVP aprovado

1. Reservas com expiração, cancelamento de venda/distrato e renegociação de parcelas com histórico — próximo incremento. Os cadastros ampliados e sua edição já estão implementados.
2. Histórico de alterações cadastrais/auditoria consultável e recibo individual por pagamento. As fichas financeiras consolidadas e o histórico de movimentações já estão disponíveis.
3. Compra com múltiplos itens e preço unitário, categorias configuráveis, rateio e pagamentos da aquisição sem duplicação de custo.
4. Definir as regras operacionais de devolução, multa de distrato e renegociação antes de automatizar esses valores.
5. Definir juros, descontos, multa e correção antes de automatizar esses cálculos.
6. Relatórios completos em Excel (.xlsx) e PDF. CSV e impressão de recibos já estão disponíveis; não equivalem a essa entrega completa.
7. Relatórios gerenciais adicionais e rateio de despesas administrativas por imóvel. Filtros do extrato, resultado de caixa por imóvel, contas a pagar no dashboard e separação de terrenos/casas já estão implementados.
8. Notificações agendadas em segundo plano. A central atual calcula avisos ao consultar e não envia mensagens externas.
9. Gestão de usuários pela interface sem depender do painel Supabase para criar/recuperar contas.
10. Validar política operacional de backup/restauração, retenção de dados/anexos, implantação, SMTP e configuração de URLs de autenticação. A configuração do backup hospedado ainda não foi verificada.

Estoque, WhatsApp automático, integração bancária, integração técnica com a Caixa e assinatura digital permanecem fora do primeiro recorte, conforme proposta de MVP.

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
- Versionamento da etapa em branch `codex/feat-cadastros-completos`, com classificação `feat`. Fluxo contínuo de branches, testes, PRs e merges registrado em `docs/GIT_WORKFLOW.md`; acesso remoto ainda pendente de autenticação/autorização no GitHub privado.
