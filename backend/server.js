const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'frontend');
const internalAnimals = require('./data/internal-animals.json');

// Camada temporária de dados: substituir por repositório/banco no futuro.
let animals = [
  {
    id: 'luna', name: 'Luna', species: 'cachorro', breed: 'SRD', age: 'Jovem', size: 'médio',
    city: 'Aracaju', state: 'SE', gender: 'Fêmea', vaccinated: true, neutered: true,
    urgent: true, organization: 'Amor de Rua', contact: '@amorderua', sourceType: 'external', externalLink: 'https://www.olx.com.br/animais-e-acessorios/cachorros/estado-ba', postedAt: '2026-08-28',
    traits: ['Dócil', 'Brincalhona', 'Vacinada'],
    description: 'Luna foi resgatada ainda filhote e está pronta para encontrar uma família. É carinhosa, brincalhona e se adapta bem a outros animais.',
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85'
  },
  {
    id: 'nino', name: 'Nino', species: 'gato', breed: 'Tigrado', age: 'Adulto', size: 'pequeno',
    city: 'Nossa Senhora do Socorro', state: 'SE', gender: 'Macho', vaccinated: true, neutered: true,
    urgent: false, organization: 'Casa Miaus', contact: '@casamiaus', sourceType: 'external', externalLink: 'https://www.petlove.com.br/adocao/gatos', postedAt: '2026-08-25',
    traits: ['Tranquilo', 'Carinhoso', 'Castrado'],
    description: 'Nino é um gato tranquilo que adora uma janela ensolarada e carinho atrás da orelha. Ideal para apartamento.',
    photo: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=85'
  },
  {
    id: 'bento', name: 'Bento', species: 'cachorro', breed: 'SRD', age: 'Filhote', size: 'pequeno',
    city: 'São Cristóvão', state: 'SE', gender: 'Macho', vaccinated: false, neutered: false,
    urgent: false, organization: 'Patinhas do Bem', contact: '@patinhasdobem', sourceType: 'external', externalLink: 'https://www.adoteumgatinho.com.br/', postedAt: '2026-08-22',
    traits: ['Energético', 'Sociável', 'Filhote'],
    description: 'Bento é pura energia e está aprendendo a descobrir o mundo. Precisa de uma família paciente para crescer com muito amor.',
    photo: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=85'
  },
  {
    id: 'frida', name: 'Frida', species: 'gato', breed: 'Calico', age: 'Jovem', size: 'pequeno',
    city: 'Barra dos Coqueiros', state: 'SE', gender: 'Fêmea', vaccinated: true, neutered: true,
    urgent: false, organization: 'Miau Feliz', contact: '@miaufeliz', sourceType: 'external', externalLink: 'https://www.zooplus.com.br/magazine/gatos/adocao', postedAt: '2026-08-19',
    traits: ['Independente', 'Dócil', 'Castrada'],
    description: 'Frida tem personalidade doce e independente. Depois de um período de adaptação, vira uma grande companheira.',
    photo: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=85'
  },
  {
    id: 'tobias', name: 'Tobias', species: 'cachorro', breed: 'Beagle mix', age: 'Adulto', size: 'médio',
    city: 'Aracaju', state: 'SE', gender: 'Macho', vaccinated: true, neutered: true,
    urgent: true, organization: 'Projeto Recomeço', contact: '@projetorecomeco', sourceType: 'external', externalLink: 'https://www.olx.com.br/animais-e-acessorios/cachorros/estado-ba', postedAt: '2026-08-15',
    traits: ['Companheiro', 'Obediente', 'Castrado'],
    description: 'Tobias é um companheiro leal e adora passeios. Procura um lar com espaço e pessoas que gostem de explorar a cidade.',
    photo: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=900&q=85'
  },
  {
    id: 'pipoca', name: 'Pipoca', species: 'outro', breed: 'Coelhinha', age: 'Jovem', size: 'pequeno',
    city: 'Itaporanga d’Ajuda', state: 'SE', gender: 'Fêmea', vaccinated: false, neutered: false,
    urgent: false, organization: 'Bichos da Serra', contact: '@bichosdaserra', sourceType: 'external', externalLink: 'https://www.amigonaosecompra.com.br/', postedAt: '2026-08-11',
    traits: ['Calma', 'Curiosa', 'Jovem'],
    description: 'Pipoca é uma coelhinha curiosa e calma. Precisa de um ambiente seguro, limpo e de uma família dedicada.',
    photo: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=85'
  }
];
animals = [...animals, ...internalAnimals];

const users = [{ id: 'demo-user', name: 'Usuário demonstração', email: 'demo@acolhe.local', password: 'acolhe123' }];
const sessions = new Map();
const favoritesByUser = new Map();

const json = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(payload));
};

const normalize = (value = '') => (value ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const tokenFor = (user) => { const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, user.id); return token; };
const userFromRequest = (req) => { const authorization = req.headers.authorization || ''; const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''; const userId = sessions.get(token); return users.find((user) => user.id === userId) || null; };
const readJson = (req, callback) => { let body = ''; req.on('data', (chunk) => { body += chunk; if (body.length > 14 * 1024 * 1024) req.destroy(); }); req.on('end', () => { try { callback(null, JSON.parse(body || '{}')); } catch { callback(new Error('invalid-json')); } }); };

function handleApi(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    return readJson(req, (error, input) => {
      if (error) return json(res, 400, { error: 'Envie os dados em formato válido.' });
      const name = (input.name || '').trim(); const email = normalize(input.email); const password = input.password || '';
      if (!name || !email || password.length < 6) return json(res, 400, { error: 'Informe nome, e-mail e uma senha com pelo menos 6 caracteres.' });
      if (users.some((user) => user.email === email)) return json(res, 409, { error: 'Já existe uma conta com este e-mail.' });
      const user = { id: `user-${Date.now()}`, name, email, password }; users.push(user);
      return json(res, 201, { user: publicUser(user), token: tokenFor(user) });
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    return readJson(req, (error, input) => {
      if (error) return json(res, 400, { error: 'Envie os dados em formato válido.' });
      const user = users.find((item) => item.email === normalize(input.email) && item.password === (input.password || ''));
      if (!user) return json(res, 401, { error: 'E-mail ou senha incorretos.' });
      return json(res, 200, { user: publicUser(user), token: tokenFor(user) });
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const user = userFromRequest(req); return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: 'Não autenticado.' });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    const token = (req.headers.authorization || '').replace(/^Bearer /, ''); sessions.delete(token); return json(res, 200, { success: true });
  }

  if (url.pathname === '/api/favorites' || url.pathname.startsWith('/api/favorites/')) {
    const user = userFromRequest(req);
    if (!user) return json(res, 401, { error: 'Faça login para salvar favoritos.' });
    const userFavorites = favoritesByUser.get(user.id) || new Set();
    if (req.method === 'GET' && url.pathname === '/api/favorites') return json(res, 200, { favorites: [...userFavorites] });
    const animalId = url.pathname.split('/').pop();
    if (!animals.some((animal) => animal.id === animalId)) return json(res, 404, { error: 'Animal não encontrado.' });
    if (req.method === 'POST') userFavorites.add(animalId);
    if (req.method === 'DELETE') userFavorites.delete(animalId);
    favoritesByUser.set(user.id, userFavorites);
    return json(res, 200, { favorites: [...userFavorites] });
  }

  if (req.method === 'GET' && url.pathname === '/api/stats') {
    return json(res, 200, { animals: animals.length, organizations: new Set(animals.map((animal) => animal.organization)).size, cities: new Set(animals.map((animal) => animal.city)).size });
  }

  if (req.method === 'GET' && url.pathname === '/api/animals') {
    const q = normalize(url.searchParams.get('q'));
    const species = normalize(url.searchParams.get('species'));
    const location = normalize(url.searchParams.get('location'));
    const size = normalize(url.searchParams.get('size'));
    const source = normalize(url.searchParams.get('source'));
    const urgent = url.searchParams.get('urgent') === 'true';
    let result = animals.filter((animal) => {
      const searchable = normalize([animal.name, animal.breed, animal.city, animal.organization, animal.description].join(' '));
      return (!q || searchable.includes(q)) && (!species || animal.species === species) && (!location || normalize(animal.city).includes(location)) && (!size || animal.size === size) && (!source || source === 'all' || animal.sourceType === source) && (!urgent || animal.urgent);
    });
    if (url.searchParams.get('sort') === 'oldest') result = result.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
    return json(res, 200, { animals: result, total: result.length });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/animals/')) {
    const animal = animals.find((item) => item.id === url.pathname.split('/').pop());
    return animal ? json(res, 200, animal) : json(res, 404, { error: 'Animal não encontrado.' });
  }

  if (req.method === 'POST' && url.pathname === '/api/animals') {
    const user = userFromRequest(req);
    if (!user) return json(res, 401, { error: 'Faça login para publicar um anúncio.' });
    return readJson(req, (error, input) => {
      try {
        if (error) return json(res, 400, { error: 'O anúncio precisa estar em formato válido.' });
        if (!input.name || !input.species || !input.city || !input.description) return json(res, 400, { error: 'Preencha nome, espécie, cidade e descrição.' });
        const images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
        if (images.length < 1 || images.length > 6) return json(res, 400, { error: 'Adicione entre 1 e 6 imagens do animal.' });
        if (images.some((image) => typeof image !== 'string' || !(/^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/i.test(image)))) return json(res, 400, { error: 'As imagens enviadas não são válidas.' });
        if (!input.externalLink && (input.whatsapp || '').replace(/\D/g, '').length < 10) return json(res, 400, { error: 'Informe um WhatsApp válido para o anúncio interno.' });
        if (input.externalLink) {
          try { const link = new URL(input.externalLink); if (!['http:', 'https:'].includes(link.protocol)) throw new Error('invalid'); } catch { return json(res, 400, { error: 'Informe um link externo válido, começando com http:// ou https://.' }); }
        }
        const animal = { ...input, id: `${normalize(input.name).replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, postedAt: new Date().toISOString().slice(0, 10), urgent: Boolean(input.urgent), sourceType: input.externalLink ? 'external' : 'acolhe', traits: input.traits || ['Aguardando um lar'], organization: input.organization || 'Anunciante independente', contact: input.contact || 'Contato disponível no anúncio', images, photo: images[0], postedBy: user.id };
        animals = [animal, ...animals];
        return json(res, 201, animal);
      } catch (error) {
        return json(res, 400, { error: 'O anúncio precisa estar em formato válido.' });
      }
    });
  }

  return json(res, 404, { error: 'Rota não encontrada.' });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) return json(res, 403, { error: 'Acesso negado.' });
  fs.readFile(filePath, (error, content) => {
    if (error) return json(res, 404, { error: 'Arquivo não encontrado.' });
    const extension = path.extname(filePath);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': `${types[extension] || 'application/octet-stream'}; charset=utf-8` });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(PORT, () => console.log(`Acolhe rodando em http://localhost:${PORT}`));
