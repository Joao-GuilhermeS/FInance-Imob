# Contas gerenciadas pelo responsável

Nesta fase, o responsável cria as contas diretamente em Supabase Authentication.
Contas novas confirmadas recebem perfil administrador no primeiro acesso, sem
uma segunda aprovação no aplicativo, quando o modo abaixo estiver habilitado.
Perfis existentes são preservados, incluindo papéis limitados e contas desativadas.
Não compartilhar senhas no chat nem versionar credenciais.

## Habilitação única por ambiente

1. Em Authentication → Sign In / Providers, desligar **Allow new users to sign up**.
   Continuar criando contas pelo painel administrativo. Não habilitar cadastro
   público enquanto o provisionamento automático estiver ativo.
2. Verificar que `/auth/v1/settings` retorna `disable_signup: true`, usando somente
   a chave publicável. Não habilitar o passo seguinte com cadastro público aberto.
3. Pelo SQL Editor administrativo ou integração autorizada, executar:

```sql
update private.managed_auth_access set enabled=true where singleton;
```

4. Criar e confirmar o usuário em Authentication. Ele pode entrar diretamente no
   aplicativo com o e-mail e a senha definidos, sem liberar perfil pela interface.

Essa configuração não muda a senha nem torna o banco público. RLS e operações
autorizadas continuam exigindo autenticação e perfil ativo. Usuários da aplicação
não podem alterar a configuração privada. Para suspender o provisionamento de
novos perfis, usar `enabled=false`; isso não desativa contas existentes.

## Estado desta entrega

A conta operacional existente já recebeu perfil ativo. A trava para novas contas
permanece desligada até o responsável desativar o cadastro público. O conector não
oferece atualização de Auth e a CLI administrativa retornou acesso negado para a
configuração do projeto. A ativação fica pendente dessa mudança no painel.

## Verificação

`supabase/tests/managed_auth_access.sql` testa o provisionamento e as recusas em
transação com ROLLBACK. Contas não confirmadas, anônimas e banidas não são
provisionadas; conta desativada não é reativada; papel existente não é elevado.
