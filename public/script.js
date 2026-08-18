// script.js
// Logica do frontend: autenticacao, temas, navegacao, amigos, chat e perfil popout.

let currentUser = null;
let socket = null;
let activeFriend = null; // amigo atualmente aberto no chat
let onlineFriendIds = new Set();
let cachedFriends = [];
let cachedOutgoing = [];

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <rect width="80" height="80" fill="#5865f2"/>
    <text x="50%" y="55%" font-size="32" fill="white" text-anchor="middle" font-family="sans-serif">?</text>
  </svg>
`);

const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>'
};

// ---------- Helpers de API ----------

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro inesperado');
  return data;
}

function avatarOrDefault(url) {
  return url && url.trim() ? url : DEFAULT_AVATAR;
}

function bannerStyle(url) {
  return url && url.trim() ? `background-image: url('${url}')` : '';
}

// ---------- Boot ----------

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupAuthTabs();
  setupAuthForms();
  setupNav();
  setupFriendsView();
  setupUsersView();
  setupSettingsView();
  setupAppearance();
  setupChatForm();
  setupProfileModal();

  try {
    const { user } = await api('/me');
    currentUser = user;
    enterApp();
  } catch {
    showAuthScreen();
  }
}

// ---------- Auth screen ----------

function setupAuthTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    });
  });
}

function setupAuthForms() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    try {
      const { user } = await api('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      currentUser = user;
      enterApp();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const display_name = document.getElementById('register-display-name').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';

    try {
      const { user } = await api('/register', {
        method: 'POST',
        body: JSON.stringify({ username, display_name, password })
      });
      currentUser = user;
      enterApp();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

// ---------- Entrar no app ----------

function enterApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  renderProfile();
  connectSocket();
  loadFriends();
  loadFriendRequests();
  switchView('home');
}

function connectSocket() {
  socket = io();

  socket.on('new_message', (message) => {
    if (activeFriend && (message.sender_id === activeFriend.id || message.receiver_id === activeFriend.id)) {
      appendMessage(message);
    }
  });

  socket.on('presence', ({ userId, online }) => {
    if (online) onlineFriendIds.add(userId);
    else onlineFriendIds.delete(userId);
    updateOnlineIndicators();
  });
}

// ---------- Navegacao ----------

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

  if (view === 'friends') {
    document.getElementById('view-friends').classList.remove('hidden');
    loadFriends();
    loadFriendRequests();
  } else if (view === 'users') {
    document.getElementById('view-users').classList.remove('hidden');
  } else if (view === 'settings') {
    document.getElementById('view-settings').classList.remove('hidden');
    fillSettingsForm();
  } else if (view === 'chat') {
    document.getElementById('view-chat').classList.remove('hidden');
    renderChatFriendList();
  } else {
    document.getElementById('view-home').classList.remove('hidden');
  }
}

// ---------- Perfil (Home) ----------

function renderProfile() {
  document.getElementById('profile-avatar').src = avatarOrDefault(currentUser.avatar);
  document.getElementById('profile-display-name').textContent = currentUser.display_name;
  document.getElementById('profile-username').textContent = '@' + currentUser.username;
  document.getElementById('profile-serial').textContent = currentUser.serial_id;
  document.getElementById('profile-bio').textContent = currentUser.bio || '';
  document.getElementById('profile-banner-el').style.cssText = bannerStyle(currentUser.banner);
}

// ---------- Friends view ----------

function setupFriendsView() {
  document.getElementById('send-friend-request-btn').addEventListener('click', async () => {
    const input = document.getElementById('friend-serial-input');
    const errorEl = document.getElementById('add-friend-error');
    errorEl.textContent = '';

    try {
      await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: input.value.trim() }) });
      input.value = '';
      errorEl.style.color = 'var(--online)';
      errorEl.textContent = 'Solicitacao enviada!';
      loadFriendRequests();
    } catch (err) {
      errorEl.style.color = 'var(--danger)';
      errorEl.textContent = err.message;
    }
  });
}

async function loadFriendRequests() {
  const [{ requests }, { requests: outgoing }] = await Promise.all([
    api('/friends/requests'),
    api('/friends/requests/outgoing')
  ]);
  cachedOutgoing = outgoing;

  const list = document.getElementById('friend-requests-list');
  list.innerHTML = '';

  if (requests.length === 0) {
    list.innerHTML = '<li class="muted small">Nenhuma solicitacao pendente</li>';
  }

  requests.forEach(req => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="clickable">
        <img class="avatar" src="${avatarOrDefault(req.avatar)}" />
        <div class="info">
          <div class="name">${escapeHtml(req.display_name)}</div>
          <div class="muted small">${req.serial_id}</div>
        </div>
      </div>
      <div class="actions">
        <button class="accept-btn" title="Aceitar">${ICONS.check}</button>
        <button class="decline-btn btn-secondary" title="Recusar">${ICONS.x}</button>
      </div>
    `;
    li.querySelector('.clickable').addEventListener('click', () => openProfileModal(req.user_id, 'incoming', req.id));
    li.querySelector('.accept-btn').addEventListener('click', async () => {
      await api('/friends/accept', { method: 'POST', body: JSON.stringify({ request_id: req.id }) });
      loadFriendRequests();
      loadFriends();
    });
    li.querySelector('.decline-btn').addEventListener('click', async () => {
      await api('/friends/decline', { method: 'POST', body: JSON.stringify({ request_id: req.id }) });
      loadFriendRequests();
    });
    list.appendChild(li);
  });

  const outgoingList = document.getElementById('friend-requests-outgoing-list');
  outgoingList.innerHTML = '';

  if (outgoing.length === 0) {
    outgoingList.innerHTML = '<li class="muted small">Nenhuma solicitacao enviada</li>';
  }

  outgoing.forEach(req => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="clickable">
        <img class="avatar" src="${avatarOrDefault(req.avatar)}" />
        <div class="info">
          <div class="name">${escapeHtml(req.display_name)}</div>
          <div class="muted small">Aguardando resposta...</div>
        </div>
      </div>
      <div class="actions">
        <button class="cancel-btn btn-secondary" title="Cancelar">${ICONS.x}</button>
      </div>
    `;
    li.querySelector('.clickable').addEventListener('click', () => openProfileModal(req.user_id, 'outgoing', req.id));
    li.querySelector('.cancel-btn').addEventListener('click', async () => {
      await api('/friends/cancel', { method: 'POST', body: JSON.stringify({ request_id: req.id }) });
      loadFriendRequests();
    });
    outgoingList.appendChild(li);
  });
}

async function loadFriends() {
  const { friends } = await api('/friends');
  cachedFriends = friends;

  const list = document.getElementById('friends-list');
  list.innerHTML = '';

  if (friends.length === 0) {
    list.innerHTML = '<li class="muted small">Voce ainda nao tem amigos</li>';
  }

  friends.forEach(friend => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="clickable">
        <img class="avatar" src="${avatarOrDefault(friend.avatar)}" />
        <div class="info">
          <div class="name">${escapeHtml(friend.display_name)}</div>
          <div class="muted small">${friend.serial_id}</div>
        </div>
      </div>
      <div class="actions">
        <button class="chat-btn btn-secondary" title="Chat">${ICONS.chat}</button>
        <button class="remove-btn btn-danger" title="Remover">${ICONS.trash}</button>
      </div>
    `;
    li.querySelector('.clickable').addEventListener('click', () => openProfileModal(friend.id, 'friend'));
    li.querySelector('.chat-btn').addEventListener('click', () => {
      switchView('chat');
      openChat(friend);
    });
    li.querySelector('.remove-btn').addEventListener('click', async () => {
      await api('/friends/' + friend.id, { method: 'DELETE' });
      loadFriends();
    });
    list.appendChild(li);
  });
}

// ---------- Users view (buscar por serial id) ----------

function setupUsersView() {
  document.getElementById('user-search-btn').addEventListener('click', async () => {
    const input = document.getElementById('user-search-input');
    const resultEl = document.getElementById('user-search-result');
    resultEl.innerHTML = '';

    try {
      const { user } = await api('/users/search?serial_id=' + encodeURIComponent(input.value.trim()));
      resultEl.innerHTML = `
        <div class="list-item">
          <div class="clickable">
            <img class="avatar" src="${avatarOrDefault(user.avatar)}" />
            <div class="info">
              <div class="name">${escapeHtml(user.display_name)}</div>
              <div class="muted small">${user.serial_id}</div>
            </div>
          </div>
          <div class="actions">
            <button id="add-from-search-btn" title="Adicionar">${ICONS.userPlus}</button>
          </div>
        </div>
      `;
      resultEl.querySelector('.clickable').addEventListener('click', () => openProfileModal(user.id, 'stranger'));
      document.getElementById('add-from-search-btn').addEventListener('click', async () => {
        await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) });
        resultEl.insertAdjacentHTML('beforeend', '<p class="form-success">Solicitacao enviada!</p>');
      });
    } catch (err) {
      resultEl.innerHTML = `<p class="form-error">${escapeHtml(err.message)}</p>`;
    }
  });
}

// ---------- Settings view: perfil ----------

function setupSettingsView() {
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const display_name = document.getElementById('settings-display-name').value.trim();
    const bio = document.getElementById('settings-bio').value;
    const successEl = document.getElementById('settings-success');

    const { user } = await api('/profile', {
      method: 'PUT',
      body: JSON.stringify({ display_name, bio })
    });

    currentUser = user;
    renderProfile();
    successEl.textContent = 'Perfil atualizado!';
    setTimeout(() => (successEl.textContent = ''), 2000);
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    currentUser = null;
    location.reload();
  });

  // Upload de avatar
  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadImage('avatar', file);
    e.target.value = '';
  });

  document.getElementById('remove-avatar-btn').addEventListener('click', async () => {
    const { user } = await api('/upload/avatar', { method: 'DELETE' });
    currentUser = user;
    renderProfile();
    fillSettingsForm();
  });

  // Upload de banner
  document.getElementById('banner-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadImage('banner', file);
    e.target.value = '';
  });

  document.getElementById('remove-banner-btn').addEventListener('click', async () => {
    const { user } = await api('/upload/banner', { method: 'DELETE' });
    currentUser = user;
    renderProfile();
    fillSettingsForm();
  });
}

async function uploadImage(kind, file) {
  const errorEl = document.getElementById('upload-error');
  errorEl.textContent = '';

  const formData = new FormData();
  formData.append(kind, file);

  try {
    const { user } = await api('/upload/' + kind, { method: 'POST', body: formData });
    currentUser = user;
    renderProfile();
    fillSettingsForm();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function fillSettingsForm() {
  document.getElementById('settings-display-name').value = currentUser.display_name || '';
  document.getElementById('settings-bio').value = currentUser.bio || '';
  document.getElementById('avatar-preview').src = avatarOrDefault(currentUser.avatar);
  document.getElementById('banner-preview').style.cssText = bannerStyle(currentUser.banner);
}

// ---------- Aparencia (temas + cor de destaque) ----------

function setupAppearance() {
  const savedTheme = localStorage.getItem('pc_theme') || 'dark';
  const savedAccent = localStorage.getItem('pc_accent');

  markActiveTheme(savedTheme);
  document.getElementById('accent-input').value = savedAccent || '#5865f2';

  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('pc_theme', theme);
      markActiveTheme(theme);
    });
  });

  document.getElementById('accent-input').addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('pc_accent', color);
  });

  document.getElementById('accent-reset-btn').addEventListener('click', () => {
    document.documentElement.style.removeProperty('--accent');
    localStorage.removeItem('pc_accent');
    document.getElementById('accent-input').value = '#5865f2';
  });
}

function markActiveTheme(theme) {
  document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
}

// ---------- Chat view ----------

function renderChatFriendList() {
  const list = document.getElementById('chat-friends-list');
  list.innerHTML = '';

  if (cachedFriends.length === 0) {
    list.innerHTML = '<li class="muted small">Adicione amigos para comecar a conversar</li>';
    return;
  }

  cachedFriends.forEach(friend => {
    const li = document.createElement('li');
    li.className = 'list-item friend-item' + (activeFriend && activeFriend.id === friend.id ? ' selected' : '');
    li.dataset.friendId = friend.id;
    li.innerHTML = `
      <img class="avatar" src="${avatarOrDefault(friend.avatar)}" />
      <div class="info">
        <div class="name">
          <span class="online-dot ${onlineFriendIds.has(friend.id) ? 'online' : ''}"></span>
          ${escapeHtml(friend.display_name)}
        </div>
      </div>
    `;
    li.addEventListener('click', () => openChat(friend));
    list.appendChild(li);
  });
}

function updateOnlineIndicators() {
  document.querySelectorAll('#chat-friends-list .friend-item').forEach(li => {
    const dot = li.querySelector('.online-dot');
    if (!dot) return;
    dot.classList.toggle('online', onlineFriendIds.has(Number(li.dataset.friendId)));
  });
  if (activeFriend) {
    document.getElementById('chat-header-status').textContent =
      onlineFriendIds.has(activeFriend.id) ? '● Online' : '● Offline';
  }
}

async function openChat(friend) {
  activeFriend = friend;
  renderChatFriendList();

  document.getElementById('chat-empty').classList.add('hidden');
  document.getElementById('chat-active').classList.remove('hidden');
  document.getElementById('chat-header-avatar').src = avatarOrDefault(friend.avatar);
  document.getElementById('chat-header-name').textContent = friend.display_name;
  document.getElementById('chat-header-status').textContent =
    onlineFriendIds.has(friend.id) ? '● Online' : '● Offline';

  const messagesEl = document.getElementById('chat-messages');
  messagesEl.innerHTML = '<p class="muted small">Carregando...</p>';

  const { messages } = await api('/messages/' + friend.id);
  messagesEl.innerHTML = '';
  messages.forEach(appendMessage);
}

function appendMessage(message) {
  if (!activeFriend) return;
  if (message.sender_id !== activeFriend.id && message.receiver_id !== activeFriend.id) return;

  const messagesEl = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  const mine = message.sender_id === currentUser.id;
  bubble.className = 'message-bubble ' + (mine ? 'mine' : 'theirs');
  bubble.textContent = message.content;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setupChatForm() {
  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeFriend) return;

    const input = document.getElementById('chat-input');
    const content = input.value;
    if (!content.trim()) return;
    input.value = '';

    const { message } = await api('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: activeFriend.id, content })
    });
    appendMessage(message);
  });
}

// ---------- Popout de perfil (estilo Discord) ----------

function setupProfileModal() {
  document.getElementById('profile-modal-close').addEventListener('click', closeProfileModal);
  document.getElementById('profile-modal').addEventListener('click', (e) => {
    if (e.target.id === 'profile-modal') closeProfileModal();
  });
}

async function openProfileModal(userId, relation, requestId) {
  const modal = document.getElementById('profile-modal');
  modal.classList.remove('hidden');

  document.getElementById('modal-display-name').textContent = 'Carregando...';
  document.getElementById('modal-username').textContent = '';
  document.getElementById('modal-serial').textContent = '';
  document.getElementById('modal-bio').textContent = '';
  document.getElementById('modal-actions').innerHTML = '';

  const { user } = await api('/users/' + userId);

  document.getElementById('modal-avatar').src = avatarOrDefault(user.avatar);
  document.getElementById('modal-banner').style.cssText = bannerStyle(user.banner);
  document.getElementById('modal-display-name').textContent = user.display_name;
  document.getElementById('modal-username').textContent = '@' + user.username;
  document.getElementById('modal-serial').textContent = user.serial_id;
  document.getElementById('modal-bio').textContent = user.bio || '';

  renderModalActions(user, relation, requestId);
}

function renderModalActions(user, relation, requestId) {
  const actionsEl = document.getElementById('modal-actions');
  actionsEl.innerHTML = '';

  if (relation === 'friend') {
    const btn = document.createElement('button');
    btn.className = 'btn-danger';
    btn.textContent = 'Remover amigo';
    btn.addEventListener('click', async () => {
      await api('/friends/' + user.id, { method: 'DELETE' });
      loadFriends();
      closeProfileModal();
    });
    actionsEl.appendChild(btn);
  } else if (relation === 'incoming') {
    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Aceitar';
    acceptBtn.addEventListener('click', async () => {
      await api('/friends/accept', { method: 'POST', body: JSON.stringify({ request_id: requestId }) });
      loadFriendRequests();
      loadFriends();
      closeProfileModal();
    });
    const declineBtn = document.createElement('button');
    declineBtn.className = 'btn-secondary';
    declineBtn.textContent = 'Recusar';
    declineBtn.addEventListener('click', async () => {
      await api('/friends/decline', { method: 'POST', body: JSON.stringify({ request_id: requestId }) });
      loadFriendRequests();
      closeProfileModal();
    });
    actionsEl.appendChild(acceptBtn);
    actionsEl.appendChild(declineBtn);
  } else if (relation === 'outgoing') {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancelar solicitacao';
    cancelBtn.addEventListener('click', async () => {
      await api('/friends/cancel', { method: 'POST', body: JSON.stringify({ request_id: requestId }) });
      loadFriendRequests();
      closeProfileModal();
    });
    actionsEl.appendChild(cancelBtn);
  } else {
    const isFriend = cachedFriends.some(f => f.id === user.id);
    const isPending = cachedOutgoing.some(r => r.user_id === user.id);
    if (!isFriend && !isPending && user.id !== currentUser.id) {
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Adicionar amigo';
      addBtn.addEventListener('click', async () => {
        await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) });
        loadFriendRequests();
        closeProfileModal();
      });
      actionsEl.appendChild(addBtn);
    }
  }
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
}

// ---------- Utils ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
