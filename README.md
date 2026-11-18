# Finance Imob

Gestão financeira de terrenos, casas e obras com React, TypeScript, Vite e Supabase.

A versão atual inclui temas claro/escuro persistidos, navegação agrupada com drawer
no celular e dashboard executivo com períodos, comparações, gráficos e visões de
caixa consolidado, terrenos e casas. As carteiras e os custos acumulados são posições
atuais, identificadas separadamente das movimentações do período.

Em **Relatórios**, consulte 11 análises com exportação PDF, XLSX e CSV. Extrato,
compras e fichas também exportam a seleção. Fichas de clientes e imóveis ficam nos
atalhos dos cadastros; fornecedores possuem consulta de compras, saldos e pagamentos.
O extrato oferece recibo PDF individual e comprovantes por movimentação. Vendas
aceitam cinco periodicidades e juros/descontos fixos explicitamente acordados; não
há cobrança automática de encargos por atraso.

Os cadastros agora incluem dados pessoais, loteamento/quadra/lote/metragem e dados da construção. Use **Editar cadastro** em pessoas e **Editar imóvel** nos imóveis. O perfil Obras atualiza somente os dados de construção; o Financeiro pode consultar os imóveis e editar pessoas.

O menu **Compras e despesas** registra o que foi comprado/contratado, o valor e a data, com fornecedor e imóvel opcionais. Pesquise por período da compra ou vencimento, descrição, classificação livre, fornecedor, imóvel, categoria e pagamento. Os totais e as exportações refletem a seleção. Não exige cadastro de produtos nem movimenta estoque. Registre o pagamento para movimentar o caixa; anexos ficam no botão **Comprovantes**. Registros históricos sem data da compra permanecem identificados como tal.

No **Financeiro**, use **Receber outra receita** para entradas sem venda/parcela. A seção **Pagamentos de aquisição de imóveis** permite iniciar o controle do pagamento de cada imóvel com custo positivo: informe explicitamente quanto já foi pago antes do controle e confira o saldo inicial. A abertura não movimenta caixa nem duplica custo; os pagamentos seguintes podem ser parciais e estornados pelo extrato.

## Executar

Requer Node.js 24 e npm.

```powershell
npm ci
Copy-Item .env.example .env.local
# Preencha .env.local com a URL e a chave PUBLICÁVEL do projeto Supabase.
npm run dev
```

Neste checkout, `.env.local` já está preenchido para `IMOB-Project`. Não sobrescreva esse arquivo se a conexão já estiver configurada. O endereço local padrão é http://127.0.0.1:5173 (use o endereço impresso pelo Vite).

Nunca coloque `service_role`, senhas do banco ou chaves secretas em variáveis `VITE_*`. `.env.local` é ignorado pelo Git.

## Primeiro acesso

O login do painel Supabase não cria automaticamente um usuário da aplicação.

1. Abra [Authentication / Users do projeto](https://supabase.com/dashboard/project/jahefxamnkcuyayotqcl/auth/users).
2. Use **Add user / Create new user** para criar a conta desejada, com senha definida por você e e-mail confirmado. Não compartilhe a senha no chat.
3. O modo de contas gerenciadas cria o perfil administrador no primeiro acesso, sem aprovação por usuário, após desativar o cadastro público e ativar a configuração global descrita em `docs/ACESSO.md`.
4. Antes de inserir dados reais, execute `docs/cleanup-qa.sql` no SQL Editor. A confirmação da ferramenta para remover os registros descartáveis expirou; a conta de teste está bloqueada, mas seus registros QA ainda existem.
5. Entre no Finance Imob e cadastre uma conta/caixa com seu saldo inicial.
6. Cadastre cliente e imóvel; registre uma venda; confirme os pagamentos na área de parcelas.

As contas são gerenciadas diretamente no Supabase Authentication. A tela de aprovação adicional foi retirada. Perfis existentes e contas desativadas são preservados; consulte `docs/ACESSO.md` antes de habilitar o provisionamento automático de novas contas.

## Comandos

```powershell
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

## Banco e ambientes

- Projeto configurado: `IMOB-Project`, referência `jahefxamnkcuyayotqcl`.
- Organização retornada pela integração: `imob`.
- Migrações aplicadas e versionadas em `supabase/migrations/`, com versões sincronizadas com o remoto.
- Testes transacionais em `supabase/tests/` (oito scripts, incluindo financial_v2 e sale_schedule_options); executar por conexão administrativa confiável ou SQL Editor. Os scripts terminam em ROLLBACK e não deixam fixtures.
- Somente desenvolvimento está configurado. Não há implantação pública, pipeline de deploy ou ambiente separado de homologação ainda. O GitHub Actions valida lint, testes e build, sem acesso ao banco remoto.
- Repositório: `Joao-GuilhermeS/FInance-Imob`. Autenticação Git local configurada; entregas publicadas na main por branches de escopo (`feat/` nesta entrega) e commits `feat`/`chore`. A integração GitHub pode negar criação de PR/merge; nesse caso, o Git local é utilizado sem force push.

## Escopo e próximos passos

Consulte [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md) para as regras, permissões, verificações e pendências do MVP. O histórico e a validação desta entrega estão em [docs/REDESIGN_V2.md](docs/REDESIGN_V2.md). Publicação e validação operacional continuam pendentes.

[docs/DESIGN.md](docs/DESIGN.md) registra a direção visual da interface.
