# Fluxo de versionamento

Autorização do responsável em 17/11/2026: versionar no GitHub quando necessário, classificar as alterações, criar branches e fazer merges quando necessários.

## Convenções

- `feat: descrição`: funcionalidade nova ou ampliação de uma funcionalidade, incluindo UI, regras e migrações relacionadas.
- `chore: descrição`: manutenção de ferramentas, configuração, organização e documentação sem comportamento funcional novo.
- Branches de entrega: `codex/feat-descricao` ou `codex/chore-descricao`.
- Autor e committer: identidade Git configurada pelo responsável; não adicionar coautoria automática.

## Sequência de entrega

1. Conferir alterações locais, referências remotas e o destino `Joao-GuilhermeS/FInance-Imob`.
2. Isolar a entrega em branch; manter juntos código, migrações, testes e documentação relacionados.
3. Executar build e testes pertinentes. Mudanças no banco exigem verificação de migrações, permissões e regressão financeira.
4. Criar o commit com classificação explícita e publicar a branch sem force push.
5. Abrir PR com problema resolvido, comportamento final e validação; verificar divergências e checks antes do merge para `main`.
6. Confirmar o resultado remoto e atualizar as referências locais depois do merge. Não declarar push ou merge concluído com base apenas no estado local.

## Estado da entrega de cadastros

Branch: `codex/feat-cadastros-completos`. Classificação: `feat`.

O acesso remoto foi tentado, mas a integração GitHub retornou 404 e o Git local não encontrou credenciais. A entrega pode ser commitada localmente; publicação e merge dependem da liberação do acesso ao repositório privado.
