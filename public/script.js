// script.js
let currentUser = null;
let socket = null;
let activeFriend = null;
let onlineFriendIds = new Set();
let cachedFriends = [];
let cachedOutgoing = [];
let activeServer = null;
let cachedServers = [];
let activeChannel = null;
let serverDataCache = null;

let audioCtx = null;

// Inicializa o áudio quando o usuário clica (resolve o bloqueio do navegador)
function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { console.error('Audio init error', e); }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  // Corrigido: só bloqueia o som se o status for explicitamente diferente de online
  if (currentUser && currentUser.status && currentUser.status !== 'online' && type !== 'login') return;
  
  initAudio(); // Garante que o áudio está ativado
  if (!audioCtx) return;
  
  try {
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    masterGain.connect(filter);
    filter.connect(audioCtx.destination);
    masterGain.gain.setValueAtTime(0, now);
    
    let freqs = [];
    let dur = 0.2;

    if (type === 'send') {
      freqs = [523.25, 659.25];
      dur = 0.15;
    } else if (type === 'receive') {
      freqs = [659.25, 523.25];
      dur = 0.25;
    } else if (type === 'login') {
      freqs = [392, 523.25, 659.25];
      dur = 0.4;
    } else {
      return;
    }

    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = Math.random() * 10 - 5;
      
      const oscGain = audioCtx.createGain();
      const startTime = now + (i * 0.08);
      oscGain.gain.setValueAtTime(0, startTime);
      oscGain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  } catch(e) { console.error('Audio error', e); }
}

function showNotification(title, body, avatarUrl) {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  const notif = document.createElement('div');
  notif.className = 'notification-card';
  notif.innerHTML = `
    <img src="${avatarUrl}" class="notification-avatar" alt="avatar" />
    <div class="notification-content">
      <div class="notification-title">${escapeHtml(title)}</div>
      <div class="notification-body">${escapeHtml(body)}</div>
    </div>
  `;
  container.appendChild(notif);
  
  setTimeout(() => notif.classList.add('show'), 10);
  
  setTimeout(() => {
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 400);
  }, 4000);
}
const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#5865f2"/><text x="50%" y="55%" font-size="32" fill="white" text-anchor="middle" font-family="sans-serif">?</text></svg>`);

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Unexpected error');
  return data;
}

function avatarOrDefault(url) { return url && url.trim() ? url : DEFAULT_AVATAR; }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str ?? ''; return div.innerHTML; }

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
  setupServersView();

  try {
    const { user } = await api('/me');
    currentUser = user;
    enterApp();
  } catch { showAuthScreen(); }
}

// ---------- Auth ----------
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
    initAudio(); // ATIVA O ÁUDIO AQUI!
    try {
      const { user } = await api('/login', { method: 'POST', body: JSON.stringify({
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value
      })});
      currentUser = user; enterApp();
    } catch (err) { document.getElementById('login-error').textContent = err.message; }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    initAudio(); // ATIVA O ÁUDIO AQUI!
    try {
      const { user } = await api('/register', { method: 'POST', body: JSON.stringify({
        username: document.getElementById('register-username').value.trim(),
        display_name: document.getElementById('register-display-name').value.trim(),
        password: document.getElementById('register-password').value
      })});
      currentUser = user; enterApp();
    } catch (err) { document.getElementById('register-error').textContent = err.message; }
  });
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function enterApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  renderProfile(); 
  connectSocket(); 
  loadFriends(); 
  loadFriendRequests(); 
  setupStatus();
  playSound('login');
  switchView('home');
}

function connectSocket() {
  socket = io();
  
  socket.on('new_message', (message) => {
    const isSender = message.sender_id === currentUser.id;
    const friendId = isSender ? message.receiver_id : message.sender_id;
    const friend = cachedFriends.find(f => f.id === friendId);
    
    const isActiveChat = activeFriend && (message.sender_id === activeFriend.id || message.receiver_id === activeFriend.id);
    
    if (isActiveChat) {
      appendMessage(message);
      if (!isSender) playSound('receive');
    } else {
      if (!isSender) {
        playSound('receive');
        showNotification(friend?.display_name || 'New Message', message.content, avatarOrDefault(friend?.avatar));
      }
    }
  });

  socket.on('presence', ({ userId, online }) => {
    if (online) onlineFriendIds.add(userId); else onlineFriendIds.delete(userId);
    updateOnlineIndicators();
  });

  socket.on('new_server_message', (message) => {
    const isActiveChat = activeServer && activeChannel && message.server_id === activeServer.id && message.channel_id === activeChannel.id;
    
    if (isActiveChat) {
      appendServerMessage(message);
      if (message.sender_id !== currentUser.id) {
        playSound('receive');
      }
    } else {
      if (message.sender_id !== currentUser.id) {
        playSound('receive');
        showNotification(message.users?.display_name || 'Server Message', `#${activeChannel?.name || 'channel'}: ${message.content}`, avatarOrDefault(message.users?.avatar));
      }
    }
  });
}

socket.on('presence', ({ userId, online }) => {
  if (online) onlineFriendIds.add(userId); else onlineFriendIds.delete(userId);
  updateOnlineIndicators();
});
socket.on('new_server_message', (message) => {
  if (activeServer && activeChannel && message.server_id === activeServer.id && message.channel_id === activeChannel.id) {
    appendServerMessage(message);
    if (message.sender_id !== currentUser.id && !document.hasFocus()) {
      playSound('receive');
    }
  } else {
    if (message.sender_id !== currentUser.id) {
      playSound('receive');
      showNotification(message.users?.display_name || 'Server Message', `#${activeChannel?.name || 'channel'}: ${message.content}`, avatarOrDefault(message.users?.avatar));
    }
  }
});

function setupStatus() {
  const grid = document.getElementById('status-grid');
  if (!grid) return;
  const buttons = grid.querySelectorAll('.status-btn');
  
  function updateActiveStatus() {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.status === currentUser.status));
  }
  updateActiveStatus();

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const status = btn.dataset.status;
      try {
        await api('/status', { method: 'PUT', body: JSON.stringify({ status }) });
        currentUser.status = status;
        updateActiveStatus();
      } catch (err) { alert(err.message); }
    });
  });
}

// ---------- Nav ----------
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  document.querySelectorAll('.view').forEach(section => section.classList.add('hidden'));
  const show = (id) => document.getElementById(id).classList.remove('hidden');
  
  if (view === 'friends') { show('view-friends'); loadFriends(); loadFriendRequests(); }
  else if (view === 'users') show('view-users');
  else if (view === 'servers') { show('view-servers'); loadServers(); }
  else if (view === 'settings') { show('view-settings'); fillSettingsForm(); }
  else if (view === 'chat') { show('view-chat'); renderChatFriendList(); }
  else show('view-home');
}

// ---------- Home ----------
function renderProfile() {
  document.getElementById('profile-avatar').src = avatarOrDefault(currentUser.avatar);
  document.getElementById('profile-display-name').textContent = currentUser.display_name;
  document.getElementById('profile-username').textContent = '@' + currentUser.username;
  document.getElementById('profile-serial').textContent = currentUser.serial_id;
  document.getElementById('profile-bio').textContent = currentUser.bio || '';
}

// ---------- Friends & Chat ----------
function setupFriendsView() {
  const form = document.getElementById('add-friend-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Impede a página de recarregar
      const input = document.getElementById('friend-serial-input');
      const errorEl = document.getElementById('add-friend-error');
      const btn = document.getElementById('send-friend-request-btn');
      
      if (!input.value.trim()) return; // Não faz nada se estiver vazio
      
      btn.textContent = 'Sending...';
      btn.disabled = true;
      errorEl.textContent = '';

      try {
        await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: input.value.trim() }) });
        input.value = ''; 
        errorEl.style.color = 'var(--online)'; 
        errorEl.textContent = 'Request sent!';
        loadFriendRequests(); // Atualiza a lista na hora
      } catch (err) { 
        errorEl.style.color = 'var(--danger)'; 
        errorEl.textContent = err.message; 
      } finally {
        btn.textContent = 'Send Request';
        btn.disabled = false;
      }
    });
  }
}

async function loadFriendRequests() {
  try {
    const [{ requests }, { requests: outgoing }] = await Promise.all([api('/friends/requests'), api('/friends/requests/outgoing')]);
    cachedOutgoing = outgoing;
    
    const list = document.getElementById('friend-requests-list');
    list.innerHTML = '';
    if (requests.length === 0) list.innerHTML = '<li class="muted small">No pending requests</li>';
    
    requests.forEach(req => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="clickable"><img class="avatar" src="${avatarOrDefault(req.avatar)}" /><div class="info"><div class="name">${escapeHtml(req.display_name)}</div><div class="muted small">${req.serial_id}</div></div></div><div class="actions"><button class="accept-btn">✔</button><button class="decline-btn btn-secondary">✖</button></div>`;
      
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(req.id, 'stranger'));
      li.querySelector('.accept-btn').addEventListener('click', async () => { 
        await api('/friends/accept', { method: 'POST', body: JSON.stringify({ request_id: req.request_id }) }); 
        loadFriendRequests(); loadFriends(); 
      });
      li.querySelector('.decline-btn').addEventListener('click', async () => { 
        await api('/friends/decline', { method: 'POST', body: JSON.stringify({ request_id: req.request_id }) }); 
        loadFriendRequests(); 
      });
      list.appendChild(li);
    });

    const outgoingList = document.getElementById('friend-requests-outgoing-list');
    outgoingList.innerHTML = '';
    if (outgoing.length === 0) outgoingList.innerHTML = '<li class="muted small">No outgoing requests</li>';
    
    outgoing.forEach(req => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="clickable"><img class="avatar" src="${avatarOrDefault(req.avatar)}" /><div class="info"><div class="name">${escapeHtml(req.display_name)}</div><div class="muted small">Waiting...</div></div></div><div class="actions"><button class="cancel-btn btn-secondary">✖</button></div>`;
      
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(req.id, 'stranger'));
      li.querySelector('.cancel-btn').addEventListener('click', async () => { 
        await api('/friends/cancel', { method: 'POST', body: JSON.stringify({ request_id: req.request_id }) }); 
        loadFriendRequests(); 
      });
      outgoingList.appendChild(li);
    });
  } catch (err) {}
}

async function loadFriends() {
  try {
    const { friends } = await api('/friends');
    cachedFriends = friends;
    const list = document.getElementById('friends-list');
    list.innerHTML = '';
    if (friends.length === 0) list.innerHTML = '<li class="muted small">You dont have any friends yet</li>';
    friends.forEach(friend => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="clickable"><img class="avatar" src="${avatarOrDefault(friend.avatar)}" /><div class="info"><div class="name">${escapeHtml(friend.display_name)}</div><div class="muted small">${friend.serial_id}</div></div></div><div class="actions"><button class="chat-btn btn-secondary">💬</button><button class="remove-btn btn-danger">🗑</button></div>`;
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(friend.id, 'friend'));
      li.querySelector('.chat-btn').addEventListener('click', () => { switchView('chat'); openChat(friend); });
      li.querySelector('.remove-btn').addEventListener('click', async () => { await api('/friends/' + friend.id, { method: 'DELETE' }); loadFriends(); });
      list.appendChild(li);
    });
  } catch (err) {}
}

// ---------- Users ----------
function setupUsersView() {
  document.getElementById('user-search-btn').addEventListener('click', async () => {
    const input = document.getElementById('user-search-input');
    const resultEl = document.getElementById('user-search-result');
    try {
      const { user } = await api('/users/search?serial_id=' + encodeURIComponent(input.value.trim()));
      resultEl.innerHTML = `<div class="list-item"><div class="clickable"><img class="avatar" src="${avatarOrDefault(user.avatar)}" /><div class="info"><div class="name">${escapeHtml(user.display_name)}</div><div class="muted small">${user.serial_id}</div></div></div><div class="actions"><button id="add-from-search-btn">➕</button></div></div>`;
      resultEl.querySelector('.clickable').addEventListener('click', () => openProfileModal(user.id, 'stranger'));
      document.getElementById('add-from-search-btn').addEventListener('click', async () => {
        await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) });
        resultEl.insertAdjacentHTML('beforeend', '<p class="form-success">Request sent!</p>');
      });
    } catch (err) { resultEl.innerHTML = `<p class="form-error">${escapeHtml(err.message)}</p>`; }
  });
}

// ---------- Settings ----------
function setupSettingsView() {
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { user } = await api('/profile', { method: 'PUT', body: JSON.stringify({
      display_name: document.getElementById('settings-display-name').value.trim(),
      bio: document.getElementById('settings-bio').value
    })});
    currentUser = user; renderProfile();
    const successEl = document.getElementById('settings-success');
    successEl.textContent = 'Profile updated!';
    setTimeout(() => successEl.textContent = '', 2000);
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    location.reload();
  });

  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('avatar', file);
    try { const { user } = await api('/upload/avatar', { method: 'POST', body: formData }); currentUser = user; renderProfile(); fillSettingsForm(); } catch (err) { document.getElementById('upload-error').textContent = err.message; }
    e.target.value = '';
  });

  document.getElementById('banner-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('banner', file);
    try { const { user } = await api('/upload/banner', { method: 'POST', body: formData }); currentUser = user; renderProfile(); fillSettingsForm(); } catch (err) { document.getElementById('upload-error').textContent = err.message; }
    e.target.value = '';
  });
}

function fillSettingsForm() {
  document.getElementById('settings-display-name').value = currentUser.display_name || '';
  document.getElementById('settings-bio').value = currentUser.bio || '';
  document.getElementById('avatar-preview').src = avatarOrDefault(currentUser.avatar);
  document.getElementById('banner-preview').style.cssText = `background-image: url('${currentUser.banner}')`;
}

function setupAppearance() {
  const savedTheme = localStorage.getItem('pc_theme') || 'dark';
  const savedAccent = localStorage.getItem('pc_accent');
  document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b.dataset.theme === savedTheme));
  document.getElementById('accent-input').value = savedAccent || '#5865f2';

  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('pc_theme', theme);
      document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  document.getElementById('accent-input').addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--accent', e.target.value);
    localStorage.setItem('pc_accent', e.target.value);
  });
  document.getElementById('accent-reset-btn').addEventListener('click', () => {
    document.documentElement.style.removeProperty('--accent');
    localStorage.removeItem('pc_accent');
    document.getElementById('accent-input').value = '#5865f2';
  });
}

// ---------- Chat ----------
function renderChatFriendList() {
  const list = document.getElementById('chat-friends-list');
  list.innerHTML = '';
  if (cachedFriends.length === 0) { list.innerHTML = '<li class="muted small">Add friends to start chatting</li>'; return; }
  cachedFriends.forEach(friend => {
    const li = document.createElement('li');
    li.className = 'list-item friend-item' + (activeFriend && activeFriend.id === friend.id ? ' selected' : '');
    li.innerHTML = `<img class="avatar" src="${avatarOrDefault(friend.avatar)}" /><div class="info"><div class="name"><span class="online-dot ${onlineFriendIds.has(friend.id) ? 'online' : ''}"></span>${escapeHtml(friend.display_name)}</div></div>`;
    li.addEventListener('click', () => openChat(friend));
    list.appendChild(li);
  });
}

function updateOnlineIndicators() {
  document.querySelectorAll('#chat-friends-list .friend-item').forEach(li => {
    const dot = li.querySelector('.online-dot'); if (!dot) return;
    dot.classList.toggle('online', onlineFriendIds.has(Number(li.dataset.friendId)));
  });
}

async function openChat(friend) {
  activeFriend = friend;
  switchView('chat'); // Garante que muda para a tela de chat
  
  // Pequeno atraso para garantir que o HTML carregou antes de procurar os elementos
  setTimeout(() => {
    document.getElementById('chat-empty').classList.add('hidden');
    document.getElementById('chat-active').classList.remove('hidden');
    document.getElementById('chat-header-avatar').src = avatarOrDefault(friend.avatar);
    document.getElementById('chat-header-name').textContent = friend.display_name;
    document.getElementById('chat-header-status').textContent = onlineFriendIds.has(friend.id) ? '● Online' : '● Offline';
    
    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML = '<p class="muted small">Loading...</p>';
    
    api('/messages/' + friend.id).then(({ messages }) => {
      messagesEl.innerHTML = '';
      messages.forEach(appendMessage);
    }).catch(err => {
      messagesEl.innerHTML = `<p class="form-error">${err.message}</p>`;
    });
  }, 50);
}

function appendMessage(message) {
  if (!activeFriend) return;
  const messagesEl = document.getElementById('chat-messages');
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '10px';
  wrapper.style.flexDirection = message.sender_id === currentUser.id ? 'row-reverse' : 'row';
  
  const avatar = document.createElement('img');
  avatar.src = avatarOrDefault(message.sender_id === currentUser.id ? currentUser.avatar : activeFriend.avatar);
  avatar.className = 'avatar';
  avatar.style.cursor = 'pointer';
  avatar.style.width = '32px';
  avatar.style.height = '32px';
  avatar.onclick = () => openProfileModal(message.sender_id, 'stranger');
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble ' + (message.sender_id === currentUser.id ? 'mine' : 'theirs');
  bubble.textContent = message.content;
  
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setupChatForm() {
  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (!activeFriend) return;
    const input = document.getElementById('chat-input');
    if (!input.value.trim()) return;
    try {
      const { message } = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content: input.value }) });
      appendMessage(message); 
      playSound('send');
      input.value = '';
    } catch (err) { alert(err.message); }
  });
}

// ---------- Profile Modal ----------
function setupProfileModal() {
  document.getElementById('profile-modal-close').addEventListener('click', () => document.getElementById('profile-modal').classList.add('hidden'));
  document.getElementById('profile-modal').addEventListener('click', (e) => { if (e.target.id === 'profile-modal') e.currentTarget.classList.add('hidden'); });
}

async function openProfileModal(userId, relation, requestId) {
  const modal = document.getElementById('profile-modal');
  modal.classList.remove('hidden');
  document.getElementById('modal-display-name').textContent = 'Loading...';
  document.getElementById('modal-username').textContent = '';
  document.getElementById('modal-serial').textContent = '';
  document.getElementById('modal-bio').textContent = '';
  document.getElementById('modal-actions').innerHTML = '';

  try {
    const { user } = await api('/users/' + userId);
    document.getElementById('modal-avatar').src = avatarOrDefault(user.avatar);
    document.getElementById('modal-banner').style.cssText = `background-image: url('${user.banner}')`;
    document.getElementById('modal-display-name').textContent = user.display_name;
    document.getElementById('modal-username').textContent = '@' + user.username;
    document.getElementById('modal-serial').textContent = user.serial_id;
    document.getElementById('modal-bio').textContent = user.bio || '';
    
    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    if (relation === 'friend') {
      const btn = document.createElement('button');
      btn.className = 'btn-danger';
      btn.textContent = 'Remove Friend';
      btn.addEventListener('click', async () => { await api('/friends/' + user.id, { method: 'DELETE' }); loadFriends(); closeProfileModal(); });
      actionsEl.appendChild(btn);
    } else {
      const isFriend = cachedFriends.some(f => f.id === user.id);
      const isPending = cachedOutgoing.some(r => r.id === user.id);
      if (!isFriend && !isPending && user.id !== currentUser.id) {
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add Friend';
        addBtn.addEventListener('click', async () => { await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) }); loadFriendRequests(); closeProfileModal(); });
        actionsEl.appendChild(addBtn);
      }
    }
  } catch (err) {
    document.getElementById('modal-display-name').textContent = 'Error loading profile';
  }
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
}

// ==================== SERVERS ====================
function setupServersView() {
  document.getElementById('server-create-form').addEventListener('submit', createServer);
  document.getElementById('server-join-form').addEventListener('submit', joinServer);
  document.getElementById('server-chat-form').addEventListener('submit', sendServerMessage);
  document.getElementById('copy-server-invite-btn').addEventListener('click', copyServerInvite);
  
  document.getElementById('open-server-settings-btn').addEventListener('click', () => {
    document.getElementById('server-settings-modal').classList.remove('hidden');
    renderServerSettings();
  });
  document.getElementById('close-server-settings').addEventListener('click', () => {
    document.getElementById('server-settings-modal').classList.add('hidden');
  });
  document.getElementById('create-role-btn').addEventListener('click', createRole);
  document.getElementById('save-server-name-btn').addEventListener('click', saveServerName);
  document.getElementById('server-icon-input').addEventListener('change', uploadServerIcon);
  document.getElementById('create-channel-form').addEventListener('submit', createChannel);
  document.getElementById('perm-channel-select').addEventListener('change', renderChannelPermissions);
}

async function createServer(event) {
  event.preventDefault();
  const input = document.getElementById('server-name-input');
  try {
    const { server } = await api('/servers', { method: 'POST', body: JSON.stringify({ name: input.value.trim() }) });
    input.value = ''; await loadServers(); openServerChat(server);
  } catch (error) { document.getElementById('server-error').textContent = error.message; }
}

async function joinServer(event) {
  event.preventDefault();
  const input = document.getElementById('server-invite-input');
  try {
    const { server } = await api('/servers/join', { method: 'POST', body: JSON.stringify({ invite_code: input.value.trim() }) });
    input.value = ''; await loadServers(); openServerChat(server);
  } catch (error) { document.getElementById('server-error').textContent = error.message; }
}

async function loadServers() {
  try {
    const { servers } = await api('/servers');
    cachedServers = servers;
    const list = document.getElementById('servers-list');
    list.innerHTML = '';
    if (!cachedServers.length) { list.innerHTML = '<li class="server-list-empty">No servers yet</li>'; return; }
    cachedServers.forEach(server => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'server-list-item' + (activeServer?.id === server.id ? ' selected' : '');
      if (server.icon_url) {
        const img = document.createElement('img');
        img.src = server.icon_url;
        img.className = 'server-list-initial';
        img.style.objectFit = 'cover';
        button.append(img);
      } else {
        const initial = document.createElement('span');
        initial.className = 'server-list-initial';
        initial.textContent = server.name.slice(0, 1).toUpperCase();
        button.append(initial);
      }
      const name = document.createElement('span');
      name.className = 'server-list-name';
      name.textContent = server.name;
      button.append(name);
      button.addEventListener('click', () => openServerChat(server));
      item.appendChild(button);
      list.appendChild(item);
    });
  } catch (err) {}
}

async function openServerChat(server) {
  activeServer = server;
  document.getElementById('server-chat-empty').classList.add('hidden');
  document.getElementById('server-chat-active').classList.remove('hidden');
  document.getElementById('server-chat-header-name').textContent = server.name;
  
  if (server.icon_url) {
    document.getElementById('server-chat-icon').src = server.icon_url;
    document.getElementById('server-chat-icon').style.display = 'block';
    document.getElementById('server-chat-initial').style.display = 'none';
  } else {
    document.getElementById('server-chat-icon').style.display = 'none';
    document.getElementById('server-chat-initial').style.display = 'grid';
    document.getElementById('server-chat-initial').textContent = server.name.slice(0, 1).toUpperCase();
  }
  
  document.getElementById('server-invite-label').textContent = 'Invite: ' + server.invite_code;
  if (socket) socket.emit('join_server', server.id);

  try {
    const data = await api('/servers/' + server.id + '/data');
    serverDataCache = data;
    renderChannels(data.channels);
  } catch (err) { console.error(err); }
}

function renderChannels(channels) {
  const list = document.getElementById('server-channels-list');
  list.innerHTML = '';
  if (!channels.length) return;
  
  if (!activeChannel || !channels.find(c => c.id === activeChannel.id)) {
    activeChannel = channels[0];
  }
  
  document.getElementById('active-channel-name').textContent = activeChannel.name;
  
  channels.forEach(ch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'channel-item' + (ch.id === activeChannel.id ? ' active' : '');
    btn.innerHTML = `<span>#</span> ${escapeHtml(ch.name)}`;
    btn.addEventListener('click', () => {
      activeChannel = ch;
      document.getElementById('active-channel-name').textContent = ch.name;
      renderChannels(channels);
      loadChannelMessages();
    });
    list.appendChild(btn);
  });
  
  loadChannelMessages();
}

function appendServerMessage(message) {
  const msgEl = document.getElementById('server-chat-messages');
  const isMe = message.sender_id === currentUser.id;
  const author = message.users?.display_name || 'User';
  
  const div = document.createElement('div');
  div.className = 'server-message' + (isMe ? ' mine' : '');
  
  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  avatar.src = avatarOrDefault(message.users?.avatar);
  avatar.style.cursor = 'pointer';
  avatar.onclick = () => openProfileModal(message.sender_id, 'stranger');
  
  const body = document.createElement('div');
  body.className = 'server-message-body';
  body.innerHTML = `
    <div class="server-message-meta">
      <strong style="color: ${isMe ? 'var(--accent)' : 'var(--text)'}">${escapeHtml(author)}</strong>
      <time>${new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</time>
    </div>
    <p class="server-message-content">${escapeHtml(message.content)}</p>
  `;
  
  div.appendChild(avatar);
  div.appendChild(body);
  msgEl.appendChild(div);
  msgEl.scrollTop = msgEl.scrollHeight;
}

async function sendServerMessage(event) {
  event.preventDefault();
  if (!activeServer || !activeChannel) return;
  const input = document.getElementById('server-chat-input');
  if (!input.value.trim()) return;
  
  try {
    await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages`, {
      method: 'POST', body: JSON.stringify({ content: input.value })
    });
    playSound('send');
    input.value = '';
  } catch (err) { alert(err.message); }
}

async function copyServerInvite() {
  if (!activeServer?.invite_code) return;
  try {
    await navigator.clipboard.writeText(activeServer.invite_code);
    const btn = document.getElementById('copy-server-invite-btn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = original, 1500);
  } catch {}
}

// ---------- Server Settings ----------
async function renderServerSettings() {
  if (!activeServer) return;
  document.getElementById('server-edit-name').value = activeServer.name;
  document.getElementById('server-icon-preview').src = activeServer.icon_url || DEFAULT_AVATAR;
  
  try {
    const data = await api('/servers/' + activeServer.id + '/data');
    serverDataCache = data;
    
    // Roles
    const rolesList = document.getElementById('server-roles-list');
    rolesList.innerHTML = '';
    data.roles.forEach(role => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="info"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${role.color}; margin-right:8px;"></span>${escapeHtml(role.name)}</div>`;
      rolesList.appendChild(li);
    });

    // Members & Role Assignment/Removal
    const membersList = document.getElementById('server-members-list');
    membersList.innerHTML = '';
    data.members.forEach(m => {
      const userRoleIds = data.memberRoles.filter(mr => mr.user_id === m.user_id).map(mr => mr.role_id);
      const userRoles = data.roles.filter(r => userRoleIds.includes(r.id));
      
      // Gera as "etiquetas" de cargo. Se clicar, remove o cargo.
      const rolesHtml = userRoles.map(r => `
        <span class="role-badge" data-role-id="${r.id}" title="Click to remove role" style="cursor:pointer; border:1px solid ${r.color}; color:${r.color}; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px; display:inline-flex; align-items:center; gap:4px;">
          ${escapeHtml(r.name)} <span style="opacity:0.7; font-size:9px;">✖</span>
        </span>
      `).join('');
      
      const li = document.createElement('li');
      li.className = 'list-item';
      li.style.flexWrap = 'wrap';
      li.innerHTML = `<img class="avatar" src="${avatarOrDefault(m.users.avatar)}" style="width: 30px; height: 30px;" /><div class="info" style="flex:1;"><div class="name">${escapeHtml(m.users.display_name)}</div><div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">${rolesHtml || '<span class="muted small" style="font-size:11px;">No roles</span>'}</div></div>`;
      
      // Dropdown para adicionar cargos
      const select = document.createElement('select');
      select.style.marginLeft = 'auto';
      select.style.background = 'var(--bg-elevated-2)';
      select.style.color = 'var(--text)';
      select.style.border = '1px solid var(--border)';
      select.style.padding = '5px';
      select.style.borderRadius = '4px';
      select.style.height = 'fit-content';

      const defaultOpt = document.createElement('option');
      defaultOpt.textContent = '+ Add Role';
      defaultOpt.value = '';
      select.appendChild(defaultOpt);

      data.roles.forEach(role => {
        if (!userRoleIds.includes(role.id)) {
          const opt = document.createElement('option');
          opt.value = role.id;
          opt.textContent = role.name;
          select.appendChild(opt);
        }
      });

      select.addEventListener('change', async (e) => {
        const roleId = Number(e.target.value);
        if (!roleId) return;
        try {
          await api(`/servers/${activeServer.id}/roles/assign`, {
            method: 'POST',
            body: JSON.stringify({ user_id: m.user_id, role_id: roleId })
          });
          renderServerSettings();
        } catch (err) { alert(err.message); }
      });

      // Adiciona evento de remover cargo nas etiquetas
      li.querySelectorAll('.role-badge').forEach(badge => {
        badge.addEventListener('click', async () => {
          const roleId = Number(badge.dataset.roleId);
          try {
            await api(`/servers/${activeServer.id}/roles/revoke`, {
              method: 'POST',
              body: JSON.stringify({ user_id: m.user_id, role_id: roleId })
            });
            renderServerSettings();
          } catch (err) { alert(err.message); }
        });
      });

      li.appendChild(select);
      membersList.appendChild(li);
    });

    // Channel Perms Select
    const select = document.getElementById('perm-channel-select');
    select.innerHTML = '';
    data.channels.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = '# ' + ch.name;
      select.appendChild(opt);
    });
    renderChannelPermissions();

  } catch (err) { console.error(err); }
}

async function loadChannelMessages() {
  if (!activeServer || !activeChannel) return;
  const msgEl = document.getElementById('server-chat-messages');
  const formEl = document.getElementById('server-chat-form');
  const lockedEl = document.getElementById('chat-locked-notice');
  
  msgEl.innerHTML = '<p class="muted small">Loading...</p>';
  
  // 1. Verificar permissão
  let canSend = true;
  if (serverDataCache) {
    if (activeServer.owner_id !== currentUser.id) {
      const userRoles = serverDataCache.memberRoles.filter(mr => mr.user_id === currentUser.id).map(mr => mr.role_id);
      const overrides = serverDataCache.overrides.filter(o => o.channel_id === activeChannel.id && userRoles.includes(o.role_id));
      
      // Se existir uma regra dizendo can_send_messages: false, ele está mutado
      if (overrides.some(o => o.can_send_messages === false)) {
        canSend = false;
      }
    }
  }

  // 2. Mostrar/Esconder a barra de mensagem
  if (canSend) {
    formEl.classList.remove('hidden');
    lockedEl.classList.add('hidden');
  } else {
    formEl.classList.add('hidden');
    lockedEl.classList.remove('hidden');
  }

  // 3. Caregar mensagens
  try {
    const { messages } = await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages`);
    msgEl.innerHTML = '';
    messages.forEach(appendServerMessage);
  } catch (err) {
    msgEl.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
}

async function createRole() {
  const name = document.getElementById('new-role-name').value.trim();
  const color = document.getElementById('new-role-color').value;
  if (!name) return;
  try {
    await api('/servers/' + activeServer.id + '/roles', { method: 'POST', body: JSON.stringify({ name, color }) });
    document.getElementById('new-role-name').value = '';
    renderServerSettings();
  } catch (err) { alert(err.message); }
}

async function saveServerName() {
  const name = document.getElementById('server-edit-name').value.trim();
  try {
    const { server } = await api('/servers/' + activeServer.id, { method: 'PUT', body: JSON.stringify({ name }) });
    activeServer = server;
    document.getElementById('server-chat-header-name').textContent = server.name;
    loadServers();
    renderServerSettings();
  } catch (err) { alert(err.message); }
}

async function uploadServerIcon(e) {
  const file = e.target.files[0]; if (!file) return;
  const formData = new FormData(); formData.append('icon', file);
  try {
    const { server } = await api('/servers/' + activeServer.id + '/icon', { method: 'POST', body: formData });
    activeServer = server;
    openServerChat(server);
    renderServerSettings();
  } catch (err) { alert(err.message); }
}

async function createChannel(e) {
  e.preventDefault();
  const input = document.getElementById('new-channel-name');
  try {
    const { channel } = await api('/servers/' + activeServer.id + '/channels', { method: 'POST', body: JSON.stringify({ name: input.value }) });
    input.value = '';
    openServerChat(activeServer);
  } catch (err) { alert(err.message); }
}

function renderChannelPermissions() {
  if (!serverDataCache) return;
  const channelId = Number(document.getElementById('perm-channel-select').value);
  const list = document.getElementById('channel-permissions-list');
  list.innerHTML = '';
  
  serverDataCache.roles.forEach(role => {
    const override = serverDataCache.overrides.find(o => o.channel_id === channelId && o.role_id === role.id);
    const canSend = override ? override.can_send_messages : true;
    
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="info"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${role.color}; margin-right:8px;"></span>${escapeHtml(role.name)}</div>
      <div class="actions">
        <button class="btn-secondary toggle-perm-btn" data-role-id="${role.id}">${canSend ? 'Allow Send' : 'Mute'}</button>
      </div>
    `;
    li.querySelector('.toggle-perm-btn').addEventListener('click', async (e) => {
      const newCanSend = !canSend;
      try {
        await api('/channels/' + channelId + '/permissions', { method: 'PUT', body: JSON.stringify({ role_id: role.id, can_send_messages: newCanSend }) });
        renderServerSettings();
      } catch (err) { alert(err.message); }
    });
    list.appendChild(li);
  });
}