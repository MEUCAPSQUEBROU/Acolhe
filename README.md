# Acolhe — protótipo de adoção responsável

Protótipo enxuto do projeto de extensão sobre cidades inteligentes. A interface cria uma ponte entre pessoas interessadas em adotar, protetores independentes, ONGs e instituições.

## Executar localmente

Requer Node.js 18 ou superior.

```bash
npm start
```

Acesse `http://localhost:3000`.

### API MongoDB

Copie `.env.example` para `.env`, substitua `MONGODB_URI` pela string do MongoDB Atlas e defina um `JWT_SECRET` forte. A API Express da pasta `backend/src` é iniciada com:

```bash
npm run api
```

O protótipo da interface continua sendo iniciado com `npm start`.

Para testar rapidamente a publicação, use a conta provisória `demo@acolhe.local` com a senha `acolhe123`, ou crie uma conta pela própria interface.

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
- API HTTP em memória para listar, consultar e criar anúncios.

## API provisória

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

Os dados de usuários, sessões, favoritos e anúncios ficam somente na memória do processo e são perdidos ao reiniciar o servidor. Quando a equipe implementar o banco, o ponto principal de substituição está nos arrays `users`/`animals`, no mapa `sessions`, no mapa `favoritesByUser` e nas operações dentro de `backend/server.js`; a interface já conversa com uma API, então não precisa ser refeita. Cada anúncio pode ter `sourceType` (`external` ou `acolhe`), `externalLink` para a página específica da oportunidade de adoção, `images` com até seis imagens e `whatsapp` para anúncios internos.

## Organização das pastas

- `frontend/` — página, estilos e JavaScript da interface.
- `backend/` — servidor HTTP e API provisória.
- `package.json` — comandos para executar o projeto.

## Próximos passos sugeridos

1. Modelar usuários, organizações, anúncios, fotos, favoritos e denúncias.
2. Adicionar autenticação e moderação dos anúncios.
3. Trocar URLs externas por upload/armazenamento de imagens.
4. Validar telefone, links e localização no backend.
5. Criar fluxo de contato seguro e política de privacidade.
