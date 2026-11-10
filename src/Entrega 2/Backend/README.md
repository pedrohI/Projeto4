# KFKA — API da Entrega 2

API REST da Plataforma de Acompanhamento Escolar KFKA, em Node.js + Express 5 + PostgreSQL.

## Requisitos da entrega e como foram atendidos

### 1. API funcional com as operações principais

Rotas REST para listar, detalhar, criar e atualizar os recursos do sistema: alunos, acompanhamentos, professores, turmas, disciplinas, vínculos, períodos, responsáveis e auditoria. As rotas ficam em `src/routes/` e o backoffice administrativo em `/api/admin`.

### 2. Persistência em banco de dados

PostgreSQL (Neon) acessado com `pg`. Todo o SQL fica em `src/data/` com consultas parametrizadas. A criação e a atualização de acompanhamentos gravam o histórico na mesma operação.

### 3. Autenticação e proteção de rotas

Cadastro e login com senha em bcrypt (custo 12) e token JWT (HS256). Os middlewares `autenticar` e `autorizar` exigem token válido e restringem cada rota aos perfis administrador, professor ou responsável.

### 4. Validação e tratamento de erros

`src/utils/validacao.js` valida os campos e acumula os detalhes por campo (HTTP 422). Todas as respostas seguem o envelope `{ sucesso, dados }` ou `{ sucesso, erro: { codigo, mensagem, detalhes } }`, com middleware central de erros.

### 5. Credenciais fora do código-fonte

Configurações sensíveis em `.env`, ignorado pelo Git, com modelo em `.env.example`. O `JWT_SECRET` é obrigatório e precisa ter ao menos 32 caracteres.

### 6. Aplicação publicada e acessível

Publicada em dois serviços:

- **Frontend (Vercel):** <https://project-kfka.vercel.app>
- **API (Railway):** <https://projeto4-production.up.railway.app> — healthcheck em `/api/status`
- **Banco:** PostgreSQL no Neon, acessado apenas pela API

O Express mantém a API em `/api` e o frontend é servido pela Vercel, com `CORS_ORIGIN` restringindo as origens permitidas. O registro de como o deploy foi feito está em [`../DEPLOY.md`](../DEPLOY.md).

## Como executar

```bash
npm install
cp .env.example .env   # configure PostgreSQL e JWT_SECRET
npm start              # http://localhost:3000
```

## Migration executada pelo dono do banco

O usuário da aplicação (`kfka_app`) só tem `USAGE` no schema `public`, então não consegue criar tabelas. Rode uma vez, conectado como o dono (`KFKA_owner`):

```bash
# Neon: aba SQL Editor, ou
psql "$DATABASE_URL_DO_DONO" -f scripts/sql/convite.sql
```

`scripts/sql/convite.sql` é idempotente e cria a tabela usada pelos convites de professor.

## Testes

```bash
npm test
```
