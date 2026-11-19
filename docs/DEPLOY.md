# Publicação na Vercel

- Endereço: https://finance-imob.vercel.app
- Projeto: `finance-imob`, equipe `joao-2d15`.
- Origem: `Joao-GuilhermeS/FInance-Imob`, branch de produção `main`.
- Framework: Vite; build `npm run build`; saída `dist`.
- Supabase: `IMOB-Project`, referência `jahefxamnkcuyayotqcl`.

## Variáveis obrigatórias no projeto Vercel

Em Settings → Environment Variables, manter em Production, Preview e Development:

- `VITE_SUPABASE_URL`: URL do projeto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave **publicável** do mesmo projeto.

Esses dois valores são públicos e incorporados ao JavaScript do navegador. Nunca
usar chave administrativa, `service_role`, senha do banco ou segredo em `VITE_*`.
O arquivo `.env.local` pertence ao ambiente local e não é enviado pelo Git.
Após alterar variáveis na Vercel, é necessário um novo build/deploy.

`vite.config.ts` bloqueia builds na Vercel quando as variáveis estão ausentes.
`vercel.json` encaminha rotas da SPA para `index.html`, permitindo abrir ou
recarregar `/financeiro`, `/parcelas` e as demais telas diretamente.

## Correção de 19/11/2026

O primeiro deploy estava pronto, mas sem variáveis: a tela de login exibia a
mensagem de configuração e desabilitava o envio. Além disso, rotas internas
acessadas diretamente retornavam 404. As variáveis públicas foram cadastradas
no projeto Vercel, e o fallback SPA e a validação de build foram versionados.
Credenciais e permissões dos usuários não foram alteradas.

Validação local: build/lint e 62 testes aprovados; build Vercel sem variáveis
rejeitado como esperado. A validação de produção deve conferir resposta HTTP
das rotas, carregamento dos assets, ausência do aviso de configuração e
comunicação do formulário com o Auth do Supabase. O login completo depende
da senha definida pelo responsável, que não deve ser compartilhada no chat.

Backups/restauração, SMTP, retenção operacional de anexos e homologação com
dados reais permanecem como verificações operacionais separadas.
