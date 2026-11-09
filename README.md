# Acolhe — protótipo de adoção responsável

Protótipo enxuto do projeto de extensão sobre cidades inteligentes. A interface cria uma ponte entre pessoas interessadas em adotar, protetores independentes, ONGs e instituições.

## Colocar no ar em uma VPS (Docker)

Funciona em qualquer VPS Linux (Ubuntu/Debian) com 1 GB de RAM ou mais. O Docker Compose sobe três serviços: o site/API (Node), o banco (MongoDB) e o Caddy, que recebe o tráfego nas portas 80/443 e gera o certificado HTTPS automaticamente.

1. Instale o Docker na VPS:

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. Copie o projeto para a VPS (por exemplo com `git clone`) e entre na pasta.

3. Crie o `.env` a partir do exemplo e gere uma chave segura:

   ```bash
   cp .env.example .env
   sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
   ```

4. Escolha como o site será acessado, editando `SITE_ADDRESS` no `.env`:
   - **Só pelo IP** (mais rápido para testar): deixe `SITE_ADDRESS=:80` e acesse `http://IP-DA-VPS`.
   - **Com domínio e HTTPS**: crie um registro DNS do tipo A apontando o domínio para o IP da VPS e use `SITE_ADDRESS=acolhe.seudominio.com.br`. O Caddy emite o certificado sozinho na primeira subida.

5. Suba tudo:

   ```bash
   docker compose up -d --build
   ```

6. Confira: `docker compose ps` deve mostrar os serviços como `healthy`/`running`, e `docker compose logs -f app` mostra o log do site.

Na primeira subida o banco recebe os anúncios de exemplo e a conta de demonstração `demo@acolhe.local` / `acolhe123`. Para desativar, use `SEED_DEMO_DATA=false` no `.env`.

Garanta que as portas 80 e 443 estão liberadas no firewall da VPS (ex.: `ufw allow 80,443/tcp`).

### Comandos úteis na VPS

- Atualizar após um `git pull`: `docker compose up -d --build`
- Ver logs: `docker compose logs -f app`
- Parar: `docker compose down` (os dados continuam salvos nos volumes)
- Backup do banco: `docker compose exec mongo mongodump --archive > backup-$(date +%F).archive`

Os dados do MongoDB e as fotos enviadas ficam em volumes do Docker (`mongo-data` e `uploads`) e sobrevivem a reinícios e atualizações. **Não** use `docker compose down -v`, que apaga esses volumes.

## Colocar no ar no Render

O arquivo `render.yaml` já descreve o serviço. O banco fica no MongoDB Atlas (o Render não hospeda MongoDB).

1. **MongoDB Atlas:** crie um cluster gratuito (M0), de preferência na AWS `us-east-1` (perto da região do Render). Em *Database Access* crie um usuário com senha; em *Network Access* libere `0.0.0.0/0`; copie a string de conexão (`mongodb+srv://...`) e acrescente o nome do banco, ex.: `.../acolhe?retryWrites=true&w=majority`.
2. Suba o projeto para o GitHub (ou GitLab).
3. No Render: **New > Blueprint**, escolha o repositório e, quando pedir, cole a string do Atlas em `MONGODB_URI`. O `JWT_SECRET` é gerado sozinho.
4. Aguarde o deploy e acesse a URL `https://acolhe-xxxx.onrender.com`.

No plano grátis o site "dorme" após ~15 min sem acesso (o primeiro acesso leva cerca de 1 minuto) e as fotos enviadas pelos usuários se perdem a cada deploy/reinício. Anúncios, usuários e favoritos ficam no Atlas e não se perdem. Para guardar as fotos, siga as instruções comentadas no `render.yaml` (plano pago com disco).

## Executar localmente (sem Docker)

Requer Node.js 20.19 ou superior e um MongoDB (local ou Atlas).

```bash
cp .env.example .env
# edite MONGODB_URI (ex.: mongodb://localhost:27017/acolhe) e JWT_SECRET
npm install
npm start
```

Acesse `http://localhost:3000`. Para reiniciar sozinho ao salvar arquivos, use `npm run dev`.

## O que já está funcionando

- Experiência de marketplace, inspirada em OLX/Mercado Livre, com vitrine de anúncios e navegação por categorias.
- Busca por nome, cidade ou raça.
- Filtros laterais por espécie, localização, porte, origem do anúncio e adoção urgente, com foco na Grande Aracaju e regiões próximas.
- Ordenação por anúncios recentes ou antigos.
- Cards com foto, localização, idade, raça, origem, ação de visita e selo de adoção urgente.
- Favoritos persistidos no navegador com `localStorage`.
- Modal com detalhes, responsável e botão para abrir o anúncio original externo.
- Formulário para cadastro direto ou compartilhamento de link externo.
- Cadastro e login provisórios para controlar quem pode publicar anúncios.
- Favoritos vinculados à conta do usuário e protegidos por autenticação.
- Publicação obrigatória de 1 a 6 imagens por anúncio, com pré-visualização e remoção antes do envio.
- Anúncios internos fictícios em `backend/data/internal-animals.json`, com fotos realistas locais, conversa direta pelo WhatsApp do anunciante, incluindo cães, gatos, coelho, tartaruga e lagarto.
- Comunicação explícita de que não existem preços: toda adoção é gratuita.
- API Express + MongoDB para usuários, anúncios e favoritos, com senhas criptografadas (bcrypt) e login por token (JWT).
- Fotos reduzidas no navegador antes do envio e salvas em disco no servidor.

## API

- `GET /api/animals` — lista anúncios. Aceita `q`, `species`, `location`, `size`, `source`, `urgent` e `sort`.
- `GET /api/animals/:id` — consulta um anúncio.
- `POST /api/animals` — cria um anúncio provisório, exige token de login, entre 1 e 6 imagens e WhatsApp para anúncios internos.
- `GET /api/favorites` — lista os favoritos do usuário autenticado.
- `POST /api/favorites/:id` — salva um animal nos favoritos do usuário autenticado.
- `DELETE /api/favorites/:id` — remove um favorito do usuário autenticado.
- `POST /api/auth/register` — cria uma conta provisória.
- `POST /api/auth/login` — inicia uma sessão provisória.
- `GET /api/auth/me` — consulta a sessão atual.
- `POST /api/auth/logout` — encerra a sessão atual.
- `GET /api/stats` — retorna contadores básicos.

Todos os dados ficam no MongoDB. Cada anúncio pode ter `sourceType` (`external` ou `acolhe`), `externalLink` para a página específica da oportunidade de adoção, `images` com até seis imagens e `whatsapp` para anúncios internos. Fotos enviadas são salvas na pasta `uploads/` (configurável por `UPLOADS_DIR`) e servidas em `/uploads/...`.

- `GET /api/health` — verifica se o servidor e o banco estão no ar.

## Organização das pastas

- `frontend/` — página, estilos e JavaScript da interface (servidos pelo próprio backend).
- `backend/src/` — servidor Express: rotas, controllers, models do MongoDB e middlewares.
- `backend/data/` — anúncios de exemplo usados para popular o banco na primeira execução.
- `Dockerfile`, `docker-compose.yml`, `Caddyfile` — empacotamento e publicação na VPS.
- `render.yaml` — publicação no Render.
- `package.json` — comandos para executar o projeto.

## Próximos passos sugeridos

1. Modelar usuários, organizações, anúncios, fotos, favoritos e denúncias.
2. Adicionar moderação dos anúncios e permitir que o autor edite/remova os seus.
3. Mover as fotos para um armazenamento externo (S3 ou similar) se o volume crescer.
4. Criar fluxo de contato seguro e política de privacidade.
