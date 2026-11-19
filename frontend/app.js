// O frontend é servido pelo mesmo servidor da API, então as rotas são relativas.
const API_BASE_URL = '';
const grid = document.querySelector('#animal-grid');
const resultCount = document.querySelector('#result-count');
const resultStatus = document.querySelector('#results-status');
let favorites = new Set();
const speciesLabel = { cachorro: 'Cachorro', gato: 'Gato', outro: 'Outro animal', tartaruga: 'Tartaruga', lagarto: 'Lagarto' };
const formatDate = (date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));
const clean = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
let token = localStorage.getItem('acolhe-token') || '';
let currentUser = JSON.parse(localStorage.getItem('acolhe-user') || 'null');
let selectedImages = [];
let pendingPublish = false;
let pendingFavorite = null;
let favoritesOnly = false;
let loadSequence = 0;
// Imagem reserva quando uma foto não carrega (ex.: rede que bloqueia o site da imagem).
const PHOTO_FALLBACK = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e9f5ee"/><g fill="#a9cdb7"><ellipse cx="200" cy="170" rx="38" ry="32"/><circle cx="152" cy="122" r="16"/><circle cx="186" cy="102" r="16"/><circle cx="222" cy="102" r="16"/><circle cx="256" cy="122" r="16"/></g></svg>')}`;
document.addEventListener('error', (event) => {
  const img = event.target;
  if (img.tagName !== 'IMG' || img.dataset.fallback) return;
  img.dataset.fallback = 'true';
  img.src = PHOTO_FALLBACK;
}, true);

function apiOptions(options = {}) { const headers = { ...(options.headers || {}) }; if (token) headers.Authorization = `Bearer ${token}`; return { ...options, headers }; }
function queryParams() { const params = new URLSearchParams(); const q = document.querySelector('#hero-search-input').value.trim() || document.querySelector('#header-search-input').value.trim(); const species = document.querySelector('#species-filter').value; const location = document.querySelector('#location-filter').value.trim(); const source = document.querySelector('#source-filter').value; const sizes = [...document.querySelectorAll('input[name="size"]:checked')].map((input) => input.value); if (q) params.set('q', q); if (species) params.set('species', species); if (location) params.set('location', location); if (source) params.set('source', source); if (sizes.length) params.set('size', sizes.join(',')); if (document.querySelector('#urgent-filter').checked) params.set('urgent', 'true'); if (document.querySelector('#sort-filter').value) params.set('sort', document.querySelector('#sort-filter').value); return params; }

function cardTemplate(animal) { const saved = favorites.has(animal.id); const sourceLabel = animal.sourceType === 'external' ? 'Anúncio externo' : 'Publicado no Acolhe'; const photo = animal.images?.[0] || animal.photo; const originalAction = animal.externalLink ? `<a class="ad-link" href="${clean(animal.externalLink)}" target="_blank" rel="noopener noreferrer">Abrir anúncio original ↗</a>` : `<button class="ad-link" data-details="${clean(animal.id)}">Conversar no WhatsApp →</button>`; return `<article class="animal-card"><div class="animal-photo-wrap"><img class="animal-photo" src="${clean(photo)}" alt="${clean(animal.name)}, ${clean(speciesLabel[animal.species] || animal.species)}" loading="lazy" />${animal.urgent ? '<span class="badge">Adoção urgente</span>' : ''}<span class="source-badge">${sourceLabel}</span><button class="favorite ${saved ? 'saved' : ''}" data-favorite="${clean(animal.id)}" aria-label="${saved ? 'Remover dos favoritos' : 'Salvar'} ${clean(animal.name)}">${saved ? '♥' : '♡'}</button></div><button class="animal-info" data-details="${clean(animal.id)}"><div class="animal-title"><h3>${clean(animal.name)}</h3><span>${formatDate(animal.postedAt)}</span></div><p class="animal-meta">${clean(speciesLabel[animal.species] || animal.species)} · ${clean(animal.breed || 'Sem raça definida')} · ${clean(animal.age || 'Não informado')}</p><p class="animal-location"><span>⌖</span> ${clean(animal.city)}, ${clean(animal.state || 'SE')}</p></button><div class="animal-footer"><span class="adoption-label">Adoção gratuita</span><span class="source-label">${clean(animal.organization)}</span></div>${originalAction}</article>`; }

function activeFilterCount() {
  let count = document.querySelectorAll('input[name="size"]:checked').length;
  ['#species-filter', '#location-filter', '#source-filter'].forEach((selector) => { if (document.querySelector(selector).value.trim()) count += 1; });
  if (document.querySelector('#urgent-filter').checked) count += 1;
  return count;
}
function setActiveNav(name) {
  document.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === name));
}
async function loadAnimals() {
  const sequence = ++loadSequence;
  if (favoritesOnly && !currentUser) favoritesOnly = false;
  setActiveNav(favoritesOnly ? 'favorites' : 'home');
  const filters = activeFilterCount();
  const badge = document.querySelector('#filter-count');
  badge.textContent = filters;
  badge.hidden = !filters;
  grid.innerHTML = '<div class="empty-state">Carregando anúncios...</div>';
  try {
    // Favoritos mostram tudo o que foi salvo, sem os filtros da busca.
    const response = await fetch(`${API_BASE_URL}/api/animals?${favoritesOnly ? '' : queryParams()}`);
    const data = await response.json();
    if (sequence !== loadSequence) return;
    const animals = favoritesOnly ? data.animals.filter((animal) => favorites.has(animal.id)) : data.animals;
    const total = animals.length;
    resultCount.textContent = `${total} ${total === 1 ? 'anúncio' : 'anúncios'}`;
    document.querySelector('#apply-filters').textContent = total ? `Ver ${total} ${total === 1 ? 'anúncio' : 'anúncios'}` : 'Nenhum anúncio encontrado';
    if (favoritesOnly) {
      resultStatus.innerHTML = `<span>Mostrando seus favoritos</span><button type="button" class="link-button" id="show-all">Ver todos os anúncios</button>`;
      document.querySelector('#show-all').addEventListener('click', showAllAnimals);
    } else {
      resultStatus.textContent = total ? `Encontramos ${total} oportunidade${total === 1 ? '' : 's'} para você` : 'Nenhum anúncio corresponde aos filtros';
    }
    const empty = favoritesOnly
      ? '<div class="empty-state"><strong>Nenhum favorito ainda</strong>Toque no ♡ de um anúncio para guardá-lo aqui.</div>'
      : '<div class="empty-state"><strong>Nenhum anúncio encontrado</strong>Tente remover algum filtro ou buscar por outra cidade.</div>';
    grid.innerHTML = total ? animals.map(cardTemplate).join('') : empty;
    updateFavoriteCount();
  } catch {
    if (sequence !== loadSequence) return;
    grid.innerHTML = '<div class="empty-state"><strong>Não foi possível carregar os anúncios</strong>Verifique a conexão e tente novamente.</div>';
  }
}
function showFavorites() {
  if (!currentUser || !token) { showAuth('login'); return; }
  favoritesOnly = true;
  loadAnimals();
  document.querySelector('#adocoes').scrollIntoView({ behavior: 'smooth' });
}
function showAllAnimals() {
  favoritesOnly = false;
  loadAnimals();
}
function openFilters() {
  document.querySelector('#filters-sidebar').classList.add('open');
  document.querySelector('#filters-backdrop').hidden = false;
  document.body.classList.add('sheet-open');
}
function closeFilters() {
  document.querySelector('#filters-sidebar').classList.remove('open');
  document.querySelector('#filters-backdrop').hidden = true;
  document.body.classList.remove('sheet-open');
}
async function loadStats() {
  try {
    const stats = await (await fetch(`${API_BASE_URL}/api/stats`)).json();
    if (Number.isFinite(stats.animals)) document.querySelector('#stat-animals').textContent = stats.animals;
  } catch { /* mantém o número padrão */ }
}
function updateFavoriteCount() {
  document.querySelector('#favorite-count').textContent = favorites.size;
  const mobile = document.querySelector('#favorite-count-mobile');
  mobile.textContent = favorites.size;
  mobile.hidden = !favorites.size;
}
async function loadFavorites() { if (!token || !currentUser) { favorites = new Set(); updateFavoriteCount(); return; } const response = await fetch(`${API_BASE_URL}/api/favorites`, apiOptions()); if (!response.ok) { favorites = new Set(); updateFavoriteCount(); return; } const data = await response.json(); favorites = new Set(data.favorites); updateFavoriteCount(); }
async function toggleFavorite(id) { if (!currentUser || !token) { pendingFavorite = id; showAuth('login'); return; } const saved = favorites.has(id); const response = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(id)}`, apiOptions({ method: saved ? 'DELETE' : 'POST' })); if (response.status === 401) { pendingFavorite = id; token = ''; currentUser = null; localStorage.removeItem('acolhe-token'); localStorage.removeItem('acolhe-user'); updateAuthUI(); showAuth('login'); return; } if (!response.ok) return; const data = await response.json(); favorites = new Set(data.favorites); updateFavoriteCount(); loadAnimals(); }
function openModal(content) { document.querySelector('#modal-content').innerHTML = content; document.querySelector('#modal-backdrop').hidden = false; document.body.style.overflow = 'hidden'; document.querySelector('#modal-content input, #modal-content button, #modal-content select, #modal-content textarea')?.focus(); }
function closeModal() { document.querySelector('#modal-backdrop').hidden = true; document.body.style.overflow = ''; document.querySelector('#modal-content').innerHTML = ''; selectedImages = []; }

async function showDetails(id) {
  let animal;
  try {
    const response = await fetch(`${API_BASE_URL}/api/animals/${encodeURIComponent(id)}`);
    if (!response.ok) return;
    animal = await response.json();
  } catch { return; }
  const images = (animal.images?.length ? animal.images : [animal.photo]).filter(Boolean);
  const whatsapp = (animal.whatsapp || '').replace(/\D/g, '');
  const action = animal.externalLink
    ? `<a class="button button-primary external-action" href="${clean(animal.externalLink)}" target="_blank" rel="noopener noreferrer">Visitar anúncio original ↗</a>`
    : whatsapp
      ? `<a class="button button-primary external-action" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">Conversar com o responsável ↗</a>`
      : '<div class="contact-box">O responsável ainda não informou um WhatsApp.</div>';
  const extraContact = animal.contact && animal.contact !== 'Contato disponível no anúncio' && animal.contact !== animal.organization ? animal.contact : '';
  const contact = [animal.organization, animal.sourceType === 'acolhe' && whatsapp ? 'WhatsApp disponível' : '', extraContact].filter(Boolean).map(clean).join(' · ');
  const thumbs = images.length > 1 ? `<div class="detail-thumbs">${images.map((image, index) => `<button type="button" data-photo="${index}" aria-label="Ver foto ${index + 1}"><img class="${index === 0 ? 'active' : ''}" src="${clean(image)}" alt="" /></button>`).join('')}</div>` : '';
  openModal(`<div class="detail-modal"><div class="detail-gallery"><img class="detail-gallery-main" src="${clean(images[0])}" alt="${clean(animal.name)}" />${thumbs}</div><div class="detail-body"><div class="breadcrumb">${animal.sourceType === 'external' ? 'Anúncio externo' : 'Publicado no Acolhe'} <span>·</span> ${animal.urgent ? 'Adoção urgente' : 'Adoção gratuita'}</div><h2 id="modal-title">${clean(animal.name)}</h2><p class="animal-meta">${clean(speciesLabel[animal.species] || animal.species)} · ${clean(animal.breed || 'Sem raça definida')} · ${clean(animal.age || 'Não informado')} · Porte ${clean(animal.size || 'não informado')}</p><p class="animal-location"><span>⌖</span> ${clean(animal.city)}, ${clean(animal.state || 'SE')}</p><p class="detail-description">${clean(animal.description)}</p><div class="traits">${(animal.traits || []).map((trait) => `<span class="trait">${clean(trait)}</span>`).join('')}</div><div class="contact-box">Publicado por<strong>${contact}</strong></div>${action}</div></div>`);
  document.querySelector('.detail-thumbs')?.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-photo]');
    if (!thumb) return;
    const main = document.querySelector('.detail-gallery-main');
    delete main.dataset.fallback;
    main.src = images[Number(thumb.dataset.photo)];
    document.querySelectorAll('.detail-thumbs img').forEach((img) => img.classList.toggle('active', img.parentElement === thumb));
  });
}

function updateAuthUI() {
  const actions = document.querySelector('#auth-actions');
  if (!currentUser) {
    actions.innerHTML = '<button class="login-button" id="open-login">Entrar</button><button class="button button-publish" id="open-register">Criar conta</button>';
  } else {
    actions.innerHTML = `<div class="auth-user"><span>Olá, <strong>${clean(currentUser.name.split(' ')[0])}</strong></span><button class="my-ads-link" id="open-my-ads">Meus anúncios</button><button id="logout">Sair</button></div>`;
  }
  document.querySelector('#account-label').textContent = currentUser ? 'Conta' : 'Entrar';
  document.querySelector('#open-login')?.addEventListener('click', () => showAuth('login'));
  document.querySelector('#open-register')?.addEventListener('click', () => showAuth('register'));
  document.querySelector('#open-my-ads')?.addEventListener('click', showMyAds);
  document.querySelector('#logout')?.addEventListener('click', logout);
}
function expireSession() {
  token = '';
  currentUser = null;
  favorites = new Set();
  localStorage.removeItem('acolhe-token');
  localStorage.removeItem('acolhe-user');
  updateAuthUI();
  updateFavoriteCount();
  if (favoritesOnly) showAllAnimals();
}
function showAuth(mode = 'login') { openModal(document.querySelector('#auth-template').innerHTML); const form = document.querySelector('#auth-form'); const nameField = document.querySelector('.auth-name-field'); const title = document.querySelector('#auth-title'); const subtitle = document.querySelector('#auth-subtitle'); const submit = document.querySelector('#auth-submit'); const setMode = (nextMode) => { mode = nextMode; document.querySelectorAll('[data-auth-mode]').forEach((button) => button.classList.toggle('selected', button.dataset.authMode === mode)); nameField.hidden = mode !== 'register'; form.password.autocomplete = mode === 'register' ? 'new-password' : 'current-password'; nameField.querySelector('input').required = mode === 'register'; title.textContent = mode === 'login' ? 'Entre para continuar' : 'Crie sua conta'; subtitle.textContent = mode === 'login' ? 'Para publicar ou favoritar, você precisa estar conectado.' : 'Cadastre-se gratuitamente para publicar e salvar anúncios.'; submit.innerHTML = `${mode === 'login' ? 'Entrar' : 'Criar conta'} <span>→</span>`; }; document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.authMode))); setMode(mode); form.addEventListener('submit', async (event) => { event.preventDefault(); const feedback = document.querySelector('#auth-feedback'); if (submit.disabled) return; feedback.textContent = 'Aguarde...'; const input = Object.fromEntries(new FormData(form).entries()); submit.disabled = true; let response; let data; try { response = await fetch(`${API_BASE_URL}/api/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); data = await response.json().catch(() => ({})); } catch { feedback.textContent = 'Sem conexão com o servidor. Verifique a internet e tente novamente.'; return; } finally { submit.disabled = false; } if (!response.ok) { feedback.textContent = data.error || 'Não foi possível concluir.'; return; } token = data.token; currentUser = data.user; localStorage.setItem('acolhe-token', token); localStorage.setItem('acolhe-user', JSON.stringify(currentUser)); updateAuthUI(); await loadFavorites(); closeModal(); if (pendingPublish) { pendingPublish = false; showPostForm(); } if (pendingFavorite) { const favoriteId = pendingFavorite; pendingFavorite = null; await toggleFavorite(favoriteId); } }); }
async function logout() { fetch(`${API_BASE_URL}/api/auth/logout`, apiOptions({ method: 'POST' })).catch(() => {}); expireSession(); }
async function restoreSession() { if (!token) return; const response = await fetch(`${API_BASE_URL}/api/auth/me`, apiOptions()); if (!response.ok) { token = ''; currentUser = null; localStorage.removeItem('acolhe-token'); localStorage.removeItem('acolhe-user'); updateAuthUI(); return; } const data = await response.json(); currentUser = data.user; localStorage.setItem('acolhe-user', JSON.stringify(currentUser)); updateAuthUI(); await loadFavorites(); }
function requireLogin() { if (currentUser && token) showPostForm(); else { pendingPublish = true; showAuth('login'); } }

// Fotos HEIC (padrão do iPhone) não abrem no Chrome; o conversor só é baixado quando necessário.
const isHeic = (file) => /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
let heicConverter = null;
function loadHeicConverter() {
  heicConverter ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.onload = () => resolve(window.heic2any);
    script.onerror = () => { heicConverter = null; reject(new Error('heic-converter')); };
    document.head.appendChild(script);
  });
  return heicConverter;
}
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}
// Reduz a foto no navegador (máx. 1600px, JPEG) para o envio ficar leve mesmo pelo celular.
async function resizeImage(file, maxSize = 1600, quality = 0.82) {
  let img;
  try {
    img = await loadImage(file);
  } catch (error) {
    if (!isHeic(file)) throw error;
    const heic2any = await loadHeicConverter();
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    img = await loadImage(Array.isArray(converted) ? converted[0] : converted);
  }
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
function renderImagePreview() { const preview = document.querySelector('#image-preview'); if (!preview) return; preview.innerHTML = selectedImages.map((image, index) => `<div class="image-preview-item"><img src="${image}" alt="Prévia da foto ${index + 1}" /><button type="button" data-remove-image="${index}" aria-label="Remover foto">×</button></div>`).join(''); }
function showPostForm(animal = null) {
  const editing = Boolean(animal);
  selectedImages = editing ? [...(animal.images?.length ? animal.images : [animal.photo])].filter(Boolean) : [];
  openModal(document.querySelector('#post-template').innerHTML);
  const form = document.querySelector('#post-form');
  const externalField = document.querySelector('.external-field');
  const linkInput = externalField.querySelector('input');
  const whatsappInput = form.whatsapp;
  const fileInput = document.querySelector('#animal-images');
  const feedback = document.querySelector('#form-feedback');
  const submitButton = form.querySelector('button[type="submit"]');
  // As fotos ficam em `selectedImages`; a obrigatoriedade é conferida no envio.
  fileInput.required = false;
  const setPostType = (isExternal) => {
    document.querySelectorAll('[data-post-type]').forEach((item) => item.classList.toggle('selected', (item.dataset.postType === 'external') === isExternal));
    externalField.hidden = !isExternal;
    linkInput.required = isExternal;
    whatsappInput.required = !isExternal;
  };
  document.querySelectorAll('[data-post-type]').forEach((button) => button.addEventListener('click', () => setPostType(button.dataset.postType === 'external')));
  if (editing) {
    document.querySelector('#modal-content .breadcrumb').textContent = 'Meus anúncios';
    document.querySelector('#modal-title').textContent = 'Editar anúncio';
    submitButton.innerHTML = 'Salvar alterações <span>→</span>';
    form.name.value = animal.name || '';
    form.species.value = animal.species || '';
    form.city.value = animal.city || '';
    form.size.value = animal.size || 'pequeno';
    form.externalLink.value = animal.externalLink || '';
    form.organization.value = animal.organization === 'Anunciante independente' ? '' : animal.organization || '';
    form.contact.value = animal.contact === 'Contato disponível no anúncio' ? '' : animal.contact || '';
    form.whatsapp.value = animal.whatsapp || '';
    form.description.value = animal.description || '';
    form.urgent.checked = Boolean(animal.urgent);
    setPostType(animal.sourceType === 'external');
    renderImagePreview();
  }
  const photoCount = () => (selectedImages.length ? `${selectedImages.length} ${selectedImages.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}.` : 'Adicione pelo menos uma foto.');
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files].filter((file) => file.type.startsWith('image/') || isHeic(file));
    fileInput.value = '';
    if (!files.length) return;
    const room = 6 - selectedImages.length;
    if (room <= 0) { feedback.textContent = 'Você já adicionou 6 fotos. Remova alguma para trocar.'; return; }
    feedback.textContent = files.some(isHeic) ? 'Convertendo fotos do iPhone...' : 'Preparando fotos...';
    let failed = 0;
    for (const file of files.slice(0, room)) {
      try { selectedImages.push(await resizeImage(file)); } catch { failed += 1; }
    }
    renderImagePreview();
    const notes = [photoCount()];
    if (files.length > room) notes.push('Só cabem 6 fotos por anúncio.');
    if (failed) notes.push(`${failed} ${failed === 1 ? 'foto não pôde ser aberta' : 'fotos não puderam ser abertas'}. Use JPG, PNG, WEBP ou HEIC.`);
    feedback.textContent = notes.join(' ');
  });
  document.querySelector('#image-preview').addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-image]');
    if (!remove) return;
    selectedImages.splice(Number(remove.dataset.removeImage), 1);
    renderImagePreview();
    feedback.textContent = photoCount();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    if (!selectedImages.length) { feedback.textContent = 'Adicione pelo menos uma foto do animal.'; return; }
    const input = Object.fromEntries(new FormData(form).entries());
    delete input['animal-images'];
    if (externalField.hidden) input.externalLink = '';
    input.urgent = form.urgent.checked;
    input.images = selectedImages;
    feedback.textContent = editing ? 'Salvando alterações...' : 'Publicando anúncio...';
    submitButton.disabled = true;
    const url = editing ? `${API_BASE_URL}/api/animals/${encodeURIComponent(animal.id)}` : `${API_BASE_URL}/api/animals`;
    let response;
    let data;
    try {
      response = await fetch(url, apiOptions({ method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
      data = await response.json().catch(() => ({}));
    } catch {
      submitButton.disabled = false;
      feedback.textContent = 'Sem conexão com o servidor. Verifique a internet e tente novamente.';
      return;
    }
    if (!response.ok) {
      submitButton.disabled = false;
      feedback.textContent = data.error || 'Confira os dados e tente novamente.';
      return;
    }
    feedback.textContent = editing ? 'Alterações salvas!' : 'Anúncio publicado gratuitamente!';
    setTimeout(() => {
      closeModal();
      loadAnimals();
      loadStats();
      if (editing) showMyAds();
      else document.querySelector('#adocoes').scrollIntoView({ behavior: 'smooth' });
    }, 800);
  });
}

// Lista os anúncios publicados pelo usuário, com opções de editar e excluir.
async function showMyAds() {
  if (!currentUser || !token) { showAuth('login'); return; }
  openModal(`<div class="modal-header"><div class="breadcrumb">Sua conta · ${clean(currentUser.email)}</div><h2 id="modal-title">Meus anúncios</h2><p>Edite ou exclua os anúncios que você publicou.</p></div><div class="my-ads" id="my-ads"><div class="empty-state">Carregando seus anúncios...</div></div><div class="my-ads-footer"><button type="button" class="button button-publish" id="my-ads-new">＋ Publicar novo anúncio</button><button type="button" class="my-ads-logout" id="my-ads-logout">Sair da conta</button></div>`);
  const list = document.querySelector('#my-ads');
  document.querySelector('#my-ads-new').addEventListener('click', () => showPostForm());
  document.querySelector('#my-ads-logout').addEventListener('click', async () => { closeModal(); await logout(); });
  let animals;
  try {
    const response = await fetch(`${API_BASE_URL}/api/my/animals`, apiOptions());
    if (response.status === 401) { expireSession(); closeModal(); showAuth('login'); return; }
    animals = (await response.json()).animals || [];
  } catch {
    list.innerHTML = '<div class="empty-state"><strong>Não foi possível carregar</strong>Verifique a conexão e tente novamente.</div>';
    return;
  }
  if (!animals.length) {
    list.innerHTML = '<div class="empty-state"><strong>Você ainda não publicou anúncios</strong>Quando publicar, eles aparecem aqui para editar ou excluir.</div>';
    return;
  }
  list.innerHTML = animals.map((animal) => `<div class="my-ad" data-my-ad="${clean(animal.id)}"><img src="${clean(animal.images?.[0] || animal.photo)}" alt="${clean(animal.name)}" /><div class="my-ad-info"><strong>${clean(animal.name)}</strong><span>${clean(speciesLabel[animal.species] || animal.species)} · ${clean(animal.city)} · ${formatDate(animal.postedAt)}</span></div><div class="my-ad-actions"><button type="button" data-edit-ad="${clean(animal.id)}">Editar</button><button type="button" class="danger" data-delete-ad="${clean(animal.id)}">Excluir</button></div></div>`).join('');
  list.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-ad]');
    const remove = event.target.closest('[data-delete-ad]');
    if (edit) showPostForm(animals.find((animal) => animal.id === edit.dataset.editAd));
    if (!remove) return;
    const animal = animals.find((item) => item.id === remove.dataset.deleteAd);
    if (!window.confirm(`Excluir o anúncio de ${animal.name}? Essa ação não pode ser desfeita.`)) return;
    remove.disabled = true;
    try {
      const response = await fetch(`${API_BASE_URL}/api/animals/${encodeURIComponent(animal.id)}`, apiOptions({ method: 'DELETE' }));
      if (!response.ok) throw new Error('delete');
    } catch {
      remove.disabled = false;
      window.alert('Não foi possível excluir agora. Tente novamente.');
      return;
    }
    favorites.delete(animal.id);
    updateFavoriteCount();
    loadAnimals();
    loadStats();
    showMyAds();
  });
}

function searchFrom(value) {
  document.querySelector('#header-search-input').value = value;
  document.querySelector('#hero-search-input').value = value;
  document.querySelector('#header-search-input').blur();
  favoritesOnly = false;
  loadAnimals();
  document.querySelector('#adocoes').scrollIntoView({ behavior: 'smooth' });
}
document.querySelector('#header-search').addEventListener('submit', (event) => { event.preventDefault(); searchFrom(document.querySelector('#header-search-input').value); }); document.querySelector('#hero-search').addEventListener('submit', (event) => { event.preventDefault(); searchFrom(document.querySelector('#hero-search-input').value); });
['#species-filter', '#source-filter', '#urgent-filter'].forEach((selector) => document.querySelector(selector).addEventListener('change', loadAnimals)); document.querySelector('#location-filter').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); loadAnimals(); } }); document.querySelectorAll('input[name="size"]').forEach((input) => input.addEventListener('change', loadAnimals)); document.querySelector('#sort-filter').addEventListener('change', loadAnimals);
function selectCategory(element) {
  document.querySelectorAll('[data-category], [data-urgent]').forEach((item) => item.classList.toggle('active', item === element));
  favoritesOnly = false;
}
document.querySelector('#clear-filters').addEventListener('click', () => {
  document.querySelector('#species-filter').value = '';
  document.querySelector('#location-filter').value = '';
  document.querySelector('#source-filter').value = '';
  document.querySelector('#urgent-filter').checked = false;
  document.querySelectorAll('input[name="size"]').forEach((input) => { input.checked = false; });
  selectCategory(document.querySelector('[data-category=""]'));
  loadAnimals();
});
document.querySelectorAll('[data-category]').forEach((category) => category.addEventListener('click', () => {
  selectCategory(category);
  document.querySelector('#species-filter').value = category.dataset.category;
  document.querySelector('#urgent-filter').checked = false;
  loadAnimals();
}));
document.querySelector('[data-urgent]').addEventListener('click', () => {
  selectCategory(document.querySelector('[data-urgent]'));
  document.querySelector('#urgent-filter').checked = true;
  loadAnimals();
});
grid.addEventListener('click', (event) => { const favorite = event.target.closest('[data-favorite]'); if (favorite) { event.preventDefault(); toggleFavorite(favorite.dataset.favorite); return; } const details = event.target.closest('[data-details]'); if (details) showDetails(details.dataset.details); });
document.querySelectorAll('#open-post-top, #open-post-banner').forEach((button) => button.addEventListener('click', requireLogin));
document.querySelector('#modal-close').addEventListener('click', closeModal);
document.querySelector('#modal-backdrop').addEventListener('click', (event) => { if (event.target.id === 'modal-backdrop') closeModal(); });
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!document.querySelector('#modal-backdrop').hidden) closeModal();
  else closeFilters();
});
document.querySelector('#open-filters').addEventListener('click', openFilters);
document.querySelector('#close-filters').addEventListener('click', closeFilters);
document.querySelector('#filters-backdrop').addEventListener('click', closeFilters);
document.querySelector('#apply-filters').addEventListener('click', () => {
  closeFilters();
  document.querySelector('#adocoes').scrollIntoView({ behavior: 'smooth' });
});
document.querySelector('#open-favorites').addEventListener('click', (event) => { event.preventDefault(); showFavorites(); });
document.querySelector('#bottom-nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-nav]');
  if (!button) return;
  const nav = button.dataset.nav;
  if (nav === 'home') { showAllAnimals(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (nav === 'search') document.querySelector('#header-search-input').focus();
  if (nav === 'publish') requireLogin();
  if (nav === 'favorites') showFavorites();
  if (nav === 'account') { if (currentUser) showMyAds(); else showAuth('login'); }
});
updateAuthUI(); updateFavoriteCount(); loadAnimals(); loadStats(); restoreSession();
