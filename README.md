# Finance Imob

Primeira implementação da gestão de imóveis, vendas, parcelas, caixa e custos de obras. React + TypeScript + Vite, integrado ao Supabase.

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
- Testes transacionais em `supabase/tests/finance_core.sql`; executar por conexão administrativa confiável ou SQL Editor. O script termina em ROLLBACK e não deixa fixtures.
- Somente desenvolvimento está configurado. Não há implantação pública, pipeline de deploy ou ambiente separado de homologação ainda.
- O remoto Git está configurado, mas o acesso autenticado ao GitHub ainda precisa ser autorizado neste ambiente. Nenhum push foi feito.

## Escopo e próximos passos

Consulte [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md) para as regras, permissões, verificações e pendências do MVP. Esta entrega inicia os fluxos principais e ainda não representa a conclusão de todos os requisitos do PDF.

[docs/DESIGN.md](docs/DESIGN.md) registra a direção visual da interface.
