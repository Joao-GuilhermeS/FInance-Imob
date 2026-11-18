# Finance Imob

Primeira implementação da gestão de imóveis, vendas, parcelas, caixa e custos de obras. React + TypeScript + Vite, integrado ao Supabase.

Agora inclui fichas financeiras por cliente e imóvel, filtros combinados no extrato, exportação da seleção em CSV e contas a pagar no dashboard. As fichas ficam no menu **Fichas financeiras** e nos atalhos das telas **Imóveis** e **Clientes e fornecedores**, para os perfis administrador e financeiro.

Os cadastros agora incluem dados pessoais, loteamento/quadra/lote/metragem e dados da construção. Use **Editar cadastro** em pessoas e **Editar imóvel** nos imóveis. O perfil Obras atualiza somente os dados de construção; o Financeiro pode consultar os imóveis e editar pessoas.

O menu **Compras e despesas** registra o que foi comprado/contratado, o valor e a data, com fornecedor e imóvel opcionais. Pesquise por período da compra ou vencimento, descrição, classificação livre, fornecedor, imóvel, categoria e pagamento. Os totais e o CSV refletem a seleção. Não exige cadastro de produtos nem movimenta estoque. Registre o pagamento para movimentar o caixa; anexos ficam no botão **Comprovantes**. Registros históricos sem data da compra permanecem identificados como tal.

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
2. Use **Add user / Create new user** para criar `perseu.wr@gmail.com`, com senha definida por você e e-mail confirmado. Não compartilhe a senha no chat.
3. A migração atribui automaticamente o perfil administrador a esse e-mail verificado.
4. Antes de inserir dados reais, execute `docs/cleanup-qa.sql` no SQL Editor. A confirmação da ferramenta para remover os registros descartáveis expirou; a conta de teste está bloqueada, mas seus registros QA ainda existem.
5. Entre no Finance Imob e cadastre uma conta/caixa com seu saldo inicial.
6. Cadastre cliente e imóvel; registre uma venda; confirme os pagamentos na área de parcelas.

Para outros usuários, crie o acesso confirmado no Supabase Authentication e atribua um perfil em **Configurações → Gerenciar acesso** no aplicativo. O autocadastro sem perfil não dá acesso aos dados.

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
- Testes transacionais em `supabase/tests/` (finance_core, registry, sales_lifecycle e purchase_records); executar por conexão administrativa confiável ou SQL Editor. Os scripts terminam em ROLLBACK e não deixam fixtures.
- Somente desenvolvimento está configurado. Não há implantação pública, pipeline de deploy ou ambiente separado de homologação ainda.
- Repositório: `Joao-GuilhermeS/FInance-Imob`. Autenticação Git local configurada; entregas publicadas na main por branches `codex/` e commits `feat`/`chore`. A integração GitHub pode negar criação de PR/merge; nesse caso, o Git local é utilizado sem force push.

## Escopo e próximos passos

Consulte [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md) para as regras, permissões, verificações e pendências do MVP. Esta entrega inicia os fluxos principais e ainda não representa a conclusão de todos os requisitos do PDF.

[docs/DESIGN.md](docs/DESIGN.md) registra a direção visual da interface.
