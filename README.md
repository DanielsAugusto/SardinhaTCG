# SARDINHA TCG | Controle de Estoque

Sistema de controle de estoque em React + Vite (TypeScript), Tailwind CSS, Prisma ORM, PostgreSQL (Neon) e funções serverless da Vercel.

## Configuração local

1. Instale as dependências (requer Node.js 20+):

   ```bash
   npm install
   ```

2. Preencha o arquivo `.env` (use `.env.example` como modelo):

   - `DATABASE_URL`: connection string **Pooled** do Neon.
   - `JWT_SECRET`: segredo aleatório com 32+ caracteres:
     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```
   - `ADMIN_USERNAME`: usuário de login.
   - `ADMIN_PASSWORD_HASH`: gere com `npm run hash-password` e cole a linha exibida (é o hash bcrypt em base64url).

3. Crie as tabelas no Neon:

   ```bash
   npx prisma migrate dev --name init_schema
   ```

   Se a migração travar ou falhar usando a URL Pooled, rode o comando com a connection string **direta** (sem `-pooler` no host) temporariamente no `DATABASE_URL`.

4. Suba o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

   O `npm run dev` já serve o frontend e as rotas `/api` (o plugin em `dev/vite-api-dev.ts` executa os mesmos handlers da Vercel). Como alternativa, `npx vercel dev` também funciona.

## Deploy na Vercel

1. Suba o código para o GitHub (o `.env` está no `.gitignore` e não deve ser versionado).
2. Importe o repositório na Vercel.
3. Em **Settings > Environment Variables**, cadastre `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH` (na Vercel, cole só o valor, sem aspas).
4. Clique em **Deploy**. O build roda `prisma generate && tsc -b && vite build`.

## Segurança

- Todas as rotas `/api` exigem sessão (cookie JWT `HttpOnly`, `Secure`, `SameSite=Strict`, 8h), exceto login e logout.
- Requisições que alteram dados validam o cabeçalho `Origin` (proteção CSRF).
- Entradas validadas com zod no servidor; queries via Prisma (parametrizadas).
- Erros inesperados retornam mensagem genérica; detalhes só no log do servidor.
- Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options etc.) definidos no `vercel.json`.
- O limite de tentativas de login é em memória por instância (best-effort). Para proteção forte, ative regras de rate limit no Vercel Firewall.
