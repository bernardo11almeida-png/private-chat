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
let replyDM = null;
let replyServer = null;

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
  // Só bloqueia o som se o status for explicitamente diferente de online
  if (currentUser && currentUser.status && currentUser.status !== 'online' && type !== 'login') return;
  
  initAudio();
  if (!audioCtx) return;
  
  try {
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.value = 2000; // Deixa o som suave (sem 8-bit)
    
    masterGain.connect(filter);
    filter.connect(audioCtx.destination);
    
    // CORREÇÃO: O volume principal precisa ser 1 para o som sair!
    masterGain.gain.value = 1.0;
    
    let freqs = [];
    let dur = 0.2;

    if (type === 'send') {
      freqs = [523.25, 659.25]; // Dó, Mi
      dur = 0.15;
    } else if (type === 'receive') {
      freqs = [659.25, 523.25]; // Mi, Dó
      dur = 0.25;
    } else if (type === 'login') {
      freqs = [392, 523.25, 659.25]; // Sol, Dó, Mi
      dur = 0.4;
    } else {
      return;
    }

    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine'; // Onda senoidal = som puro e suave
      osc.frequency.value = f;
      osc.detune.value = Math.random() * 10 - 5; // Leve defasagem
      
      const oscGain = audioCtx.createGain();
      const startTime = now + (i * 0.08);
      
      // Volume de cada nota (aumentado para 0.3 para garantir que saia)
      oscGain.gain.setValueAtTime(0, startTime);
      oscGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
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

// ---------- Modais e Toasts Customizados ----------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirm({ title, content, confirmText = 'Confirm', onConfirm }) {
  const modal = document.getElementById('custom-modal');
  document.getElementById('custom-modal-title').textContent = title;
  document.getElementById('custom-modal-content').textContent = content;
  document.getElementById('custom-modal-input').classList.add('hidden');
  
  const actions = document.getElementById('custom-modal-actions');
  actions.innerHTML = '';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => modal.classList.add('hidden');
  
  const okBtn = document.createElement('button');
  okBtn.textContent = confirmText;
  okBtn.className = 'btn-danger';
  okBtn.onclick = () => {
    modal.classList.add('hidden');
    if (onConfirm) onConfirm();
  };
  
  actions.append(cancelBtn, okBtn);
  modal.classList.remove('hidden');
}

function showPrompt({ title, label, defaultValue = '', confirmText = 'Save', onSubmit }) {
  const modal = document.getElementById('custom-modal');
  document.getElementById('custom-modal-title').textContent = title;
  document.getElementById('custom-modal-content').textContent = label;
  
  const input = document.getElementById('custom-modal-input');
  input.value = defaultValue;
  input.classList.remove('hidden');
  
  const actions = document.getElementById('custom-modal-actions');
  actions.innerHTML = '';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => modal.classList.add('hidden');
  
  const okBtn = document.createElement('button');
  okBtn.textContent = confirmText;
  okBtn.onclick = () => {
    const val = input.value.trim();
    modal.classList.add('hidden');
    if (onSubmit) onSubmit(val);
  };
  
  actions.append(cancelBtn, okBtn);
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
}

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
  setupGifSelectModal();
  setupServersView();
  setupHome();

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
      if (friend) friend.unread_count = 0; // Zera se já estiver aberto
    } else {
      if (!isSender) {
        playSound('receive');
        showNotification(friend?.display_name || 'New Message', message.content, avatarOrDefault(friend?.avatar));
        if (friend) {
          friend.unread_count = (friend.unread_count || 0) + 1; // Incrementa
        }
      }
    }
    updateUnreadBadges();
  });

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

    socket.on('reaction_added', (data) => {
    // Se a mensagem estiver na tela, adiciona a reação visualmente
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgEl) {
      const container = msgEl.querySelector('.reactions-container');
      let badge = container.querySelector(`[data-emoji="${data.emoji}"]`);
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'reaction-badge';
        badge.dataset.emoji = data.emoji;
        badge.innerHTML = `${data.emoji} <span>0</span>`;
        badge.onclick = async () => {
          try { await api(`/messages/${data.messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: data.emoji }) }); } catch(e) {}
        };
        container.appendChild(badge);
      }
      const countSpan = badge.querySelector('span');
      countSpan.textContent = parseInt(countSpan.textContent) + 1;
      if (data.userId === currentUser.id) badge.classList.add('mine');
    }
  });

  socket.on('reaction_removed', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgEl) {
      const container = msgEl.querySelector('.reactions-container');
      let badge = container.querySelector(`[data-emoji="${data.emoji}"]`);
      if (badge) {
        const countSpan = badge.querySelector('span');
        let newCount = parseInt(countSpan.textContent) - 1;
        if (newCount <= 0) {
          badge.remove();
        } else {
          countSpan.textContent = newCount;
        }
        if (data.userId === currentUser.id) badge.classList.remove('mine');
      }
    }
  });

    socket.on('message_deleted', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgEl) {
      const bubble = msgEl.querySelector('.message-bubble');
      if (bubble) {
        bubble.classList.add('deleted-msg');
        bubble.textContent = 'Mensagem apagada';
      }
      const actions = msgEl.querySelector('.message-actions');
      if (actions) actions.remove();
      msgEl.dataset.content = '';
    }
  });

  socket.on('server_message_deleted', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgEl) {
      const contentEl = msgEl.querySelector('.server-message-content');
      if (contentEl) {
        contentEl.classList.add('deleted-msg');
        contentEl.textContent = 'Mensagem apagada';
      }
      const actions = msgEl.querySelector('.message-actions');
      if (actions) actions.remove();
      msgEl.dataset.content = '';
    }
  });
}

function setupHome() {
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'dms') switchView('chat');
      else if (action === 'add-friend') switchView('friends');
      else if (action === 'create-server') {
        switchView('servers');
        setTimeout(() => document.getElementById('server-name-input')?.focus(), 100);
      }
      else if (action === 'settings') switchView('settings');
    });
  });
}

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
      li.dataset.friendId = friend.id;
      
      const badgeHtml = friend.unread_count > 0 ? `<span class="avatar-badge">${friend.unread_count > 99 ? '99+' : friend.unread_count}</span>` : '';
      
      li.innerHTML = `<div class="clickable"><div class="avatar-wrap"><img class="avatar" src="${avatarOrDefault(friend.avatar)}" />${badgeHtml}</div><div class="info"><div class="name">${escapeHtml(friend.display_name)}</div><div class="muted small">${friend.serial_id}</div></div></div><div class="actions"><button class="chat-btn btn-secondary" title="Message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button><button class="remove-btn btn-danger" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div>`;
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(friend.id, 'friend'));
      li.querySelector('.chat-btn').addEventListener('click', () => { switchView('chat'); openChat(friend); });
      li.querySelector('.remove-btn').addEventListener('click', async () => { await api('/friends/' + friend.id, { method: 'DELETE' }); loadFriends(); });
      list.appendChild(li);
    });
    updateUnreadBadges();
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

// ---------- GIF Picker para Avatar/Banner ----------
let gifSelectTarget = null;

function setupGifSelectModal() {
  document.getElementById('gif-select-close').addEventListener('click', closeGifSelectModal);
  document.getElementById('gif-select-modal').addEventListener('click', (e) => {
    if (e.target.id === 'gif-select-modal') closeGifSelectModal();
  });

  document.querySelectorAll('[data-gif-select-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-gif-select-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadGifSelectTab(btn.dataset.gifSelectTab);
    });
  });

  let searchTimeout;
  document.getElementById('gif-select-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadGifSelectTab('search', e.target.value), 500);
  });
}

function openGifSelectModal(target) {
  gifSelectTarget = target;
  document.getElementById('gif-select-title').textContent = target === 'avatar' ? 'Choose a GIF avatar' : 'Choose a GIF banner';
  document.getElementById('gif-select-error').textContent = '';
  document.getElementById('gif-select-search-input').value = '';
  document.querySelectorAll('[data-gif-select-tab]').forEach(b => b.classList.toggle('active', b.dataset.gifSelectTab === 'search'));
  document.getElementById('gif-select-modal').classList.remove('hidden');
  loadGifSelectTab('search');
}

function closeGifSelectModal() {
  document.getElementById('gif-select-modal').classList.add('hidden');
  gifSelectTarget = null;
}

async function loadGifSelectTab(tab, query = 'hello') {
  const grid = document.getElementById('gif-select-grid');
  grid.innerHTML = '<p class="muted small">Loading...</p>';
  try {
    let gifs = [];
    if (tab === 'search') {
      const res = await api(`/gifs/search?q=${encodeURIComponent(query)}`);
      gifs = res.gifs || [];
    } else {
      const res = await api('/gifs/favorites');
      gifs = res.gifs || [];
    }
    grid.innerHTML = '';
    if (gifs.length === 0) { grid.innerHTML = '<p class="muted small">No GIFs found.</p>'; return; }
    gifs.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.onclick = () => confirmGifSelect(url);
      grid.appendChild(img);
    });
  } catch (err) {
    grid.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
}

async function confirmGifSelect(url) {
  const target = gifSelectTarget;
  if (!target) return;
  try {
    const endpoint = target === 'avatar' ? '/profile/avatar-url' : '/profile/banner-url';
    const { user } = await api(endpoint, { method: 'PUT', body: JSON.stringify({ url }) });
    currentUser = user;
    renderProfile();
    fillSettingsForm();
    closeGifSelectModal();
  } catch (err) {
    document.getElementById('gif-select-error').textContent = err.message;
  }
}

// ---------- Settings ----------
function setupSettingsView() {
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const { user } = await api('/profile', { 
        method: 'PUT', 
        body: JSON.stringify({
          display_name: document.getElementById('settings-display-name').value.trim(),
          bio: document.getElementById('settings-bio').value
        })
      });
      
      currentUser = user; 
      renderProfile();
      
      const successEl = document.getElementById('settings-success');
      successEl.textContent = 'Profile updated!';
      setTimeout(() => successEl.textContent = '', 2000);
    } catch (err) {
      // Se der erro, agora vai aparecer o toast vermelho na tela!
      showToast(err.message, 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await api('/logout', { method: 'POST' });
      if (socket) socket.disconnect();
      location.reload();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Resto da função (upload de avatar/banner) continua igual...
  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('avatar', file);
    try { const { user } = await api('/upload/avatar', { method: 'POST', body: formData }); currentUser = user; renderProfile(); fillSettingsForm(); } catch (err) { showToast(err.message, 'error'); }
    e.target.value = '';
  });

  document.getElementById('banner-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('banner', file);
    try { const { user } = await api('/upload/banner', { method: 'POST', body: formData }); currentUser = user; renderProfile(); fillSettingsForm(); } catch (err) { showToast(err.message, 'error'); }
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
    li.dataset.friendId = friend.id;
    
    const badgeHtml = friend.unread_count > 0 ? `<span class="avatar-badge">${friend.unread_count > 99 ? '99+' : friend.unread_count}</span>` : '';
    
    li.innerHTML = `<div class="avatar-wrap"><img class="avatar" src="${avatarOrDefault(friend.avatar)}" />${badgeHtml}</div><div class="info"><div class="name"><span class="online-dot ${onlineFriendIds.has(friend.id) ? 'online' : ''}"></span>${escapeHtml(friend.display_name)}</div></div>`;
    li.addEventListener('click', () => openChat(friend));
    list.appendChild(li);
  });
  updateUnreadBadges();
}

function updateUnreadBadges() {
  const totalUnread = cachedFriends.reduce((sum, f) => sum + (f.unread_count || 0), 0);
  const sidebarBadge = document.getElementById('dms-unread-badge');
  if (sidebarBadge) {
    if (totalUnread > 0) {
      sidebarBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
      sidebarBadge.classList.remove('hidden');
    } else {
      sidebarBadge.classList.add('hidden');
    }
  }

  // Atualiza a lista de amigos
  const friendsList = document.getElementById('friends-list');
  if (friendsList) {
    cachedFriends.forEach(friend => {
      const li = friendsList.querySelector(`[data-friend-id="${friend.id}"]`);
      if (li) {
        const wrap = li.querySelector('.avatar-wrap');
        if (wrap) {
          let badge = wrap.querySelector('.avatar-badge');
          if (friend.unread_count > 0) {
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'avatar-badge';
              wrap.appendChild(badge);
            }
            badge.textContent = friend.unread_count > 99 ? '99+' : friend.unread_count;
          } else if (badge) {
            badge.remove();
          }
        }
      }
    });
  }

  // Atualiza a lista de DMs
  const chatList = document.getElementById('chat-friends-list');
  if (chatList) {
    cachedFriends.forEach(friend => {
      const li = chatList.querySelector(`[data-friend-id="${friend.id}"]`);
      if (li) {
        const wrap = li.querySelector('.avatar-wrap');
        if (wrap) {
          let badge = wrap.querySelector('.avatar-badge');
          if (friend.unread_count > 0) {
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'avatar-badge';
              wrap.appendChild(badge);
            }
            badge.textContent = friend.unread_count > 99 ? '99+' : friend.unread_count;
          } else if (badge) {
            badge.remove();
          }
        }
      }
    });
  }
}

function updateOnlineIndicators() {
  document.querySelectorAll('#chat-friends-list .friend-item').forEach(li => {
    const dot = li.querySelector('.online-dot'); if (!dot) return;
    dot.classList.toggle('online', onlineFriendIds.has(Number(li.dataset.friendId)));
  });
}

async function openChat(friend) {
  activeFriend = friend;
  switchView('chat');
  
  setTimeout(() => {
    document.getElementById('chat-empty').classList.add('hidden');
    document.getElementById('chat-active').classList.remove('hidden');
    document.getElementById('chat-header-avatar').src = avatarOrDefault(friend.avatar);
    document.getElementById('chat-header-name').textContent = friend.display_name;
    document.getElementById('chat-header-status').textContent = onlineFriendIds.has(friend.id) ? '● Online' : '● Offline';
    
    // Limpa o contador de não lidas
    friend.unread_count = 0;
    updateUnreadBadges();
    
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
  
  let wrapper = messagesEl.querySelector(`[data-message-id="${message.id}"]`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + (message.sender_id === currentUser.id ? 'mine' : 'theirs');
    wrapper.dataset.messageId = message.id;
    messagesEl.appendChild(wrapper);
  } else {
    wrapper.innerHTML = '';
  }

  if (message.reply_to) {
    const original = messagesEl.querySelector(`[data-message-id="${message.reply_to}"]`);
    const quote = document.createElement('div');
    quote.className = 'reply-quote';
    if (original) {
      const isMine = original.classList.contains('mine');
      const origAuthor = isMine ? currentUser.display_name : activeFriend.display_name;
      const origContent = original.dataset.content || '';
      quote.innerHTML = `<strong>${escapeHtml(origAuthor)}</strong> ${escapeHtml(origContent.substring(0, 50))}`;
      quote.onclick = () => original.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      quote.innerHTML = `<strong>Original message unavailable</strong>`;
    }
    wrapper.appendChild(quote);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble ' + (message.sender_id === currentUser.id ? 'mine' : 'theirs');
  
  if (message.deleted_at) {
    bubble.classList.add('deleted-msg');
    bubble.textContent = 'Mensagem apagada';
    wrapper.dataset.content = '';
  } else if (message.content.startsWith('img:')) {
    const url = message.content.replace('img:', '');
    bubble.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px; display:block;" />`;
    wrapper.dataset.content = "GIF";
  } else {
    bubble.textContent = message.content;
    wrapper.dataset.content = message.content;
  }
  wrapper.appendChild(bubble);

  if (!message.deleted_at) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const reactBtn = document.createElement('button');
    reactBtn.innerHTML = '😀';
    reactBtn.onclick = (e) => {
      e.stopPropagation();
      const picker = wrapper.querySelector('.emoji-quick-picker');
      if (picker) picker.classList.toggle('show');
    };
    actions.appendChild(reactBtn);

    const replyBtn = document.createElement('button');
    replyBtn.innerHTML = '↩';
    replyBtn.title = 'Reply';
    replyBtn.onclick = () => setReplyDM(message);
    actions.appendChild(replyBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '🗑';
    delBtn.title = 'Delete';
    delBtn.onclick = async () => {
      showConfirm({
        title: 'Delete Message',
        content: 'Are you sure you want to delete this message?',
        confirmText: 'Delete',
        onConfirm: async () => {
          try { await api(`/messages/${message.id}`, { method: 'DELETE' }); } catch(e) { showToast(e.message, 'error'); }
        }
      });
    };
    actions.appendChild(delBtn);

    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'emoji-quick-picker';
    ['👍', '❤️', '😂', '😮', '😢', '🙏'].forEach(em => {
      const span = document.createElement('span');
      span.textContent = em;
      span.onclick = async () => {
        try { await api(`/messages/${message.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: em }) }); } catch(err) {}
        emojiPicker.classList.remove('show');
      };
      emojiPicker.appendChild(span);
    });

    const reactionsContainer = document.createElement('div');
    reactionsContainer.className = 'reactions-container';
    if (message.reactions) renderReactions(reactionsContainer, message.reactions, message.id);

    wrapper.appendChild(reactBtn); // mantém o botão flutuante antigo se precisar
    wrapper.appendChild(actions);
    wrapper.appendChild(emojiPicker);
    wrapper.appendChild(reactionsContainer);
  }
  
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderReactions(container, reactions, messageId) {
  container.innerHTML = '';
  const grouped = {};
  
  Object.entries(reactions).forEach(([emoji, users]) => {
    grouped[emoji] = users;
  });

  Object.entries(grouped).forEach(([emoji, users]) => {
    const isMine = users.some(u => u.id === currentUser.id);
    const badge = document.createElement('div');
    badge.className = 'reaction-badge' + (isMine ? ' mine' : '');
    badge.innerHTML = `${emoji} <span>${users.length}</span>`;
    badge.onclick = async () => {
      try {
        await api(`/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) });
      } catch(err) { console.error(err); }
    };
    container.appendChild(badge);
  });
}

// Variáveis de controle para evitar spam
let isSendingDM = false;
let isSendingServer = false;

function setupChatForm() {
  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    if (!activeFriend || isSendingDM) return; // Trava se já estiver enviando
    
    const input = document.getElementById('chat-input');
    if (!input.value.trim()) return;
    
    isSendingDM = true; // Liga a trava
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const { message } = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content: input.value, reply_to: replyDM?.id }) });
      appendMessage(message); 
      playSound('send');
      input.value = '';
      cancelReplyDM();
    } catch (err) { 
      showToast(err.message, 'error'); 
    } finally {
      isSendingDM = false; // Destrava
      if (btn) btn.disabled = false;
      input.focus();
    }
  });

  document.getElementById('cancel-reply-btn-dm').addEventListener('click', cancelReplyDM);
  document.getElementById('cancel-reply-btn-server').addEventListener('click', cancelReplyServer);

  // Lógica dos GIFs (mantém a original)
  const gifPicker = document.getElementById('gif-picker');
  document.getElementById('open-gif-btn').addEventListener('click', async () => {
    gifPicker.classList.toggle('hidden');
    if (!gifPicker.classList.contains('hidden')) loadGifTab('search');
  });
  document.querySelectorAll('.gif-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gif-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadGifTab(btn.dataset.gifTab);
    });
  });
  let searchTimeout;
  document.getElementById('gif-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadGifTab('search', e.target.value), 500);
  });
}

async function sendServerMessage(event) {
  event.preventDefault();
  if (!activeServer || !activeChannel || isSendingServer) return; // Trava se já estiver enviando
  
  const input = document.getElementById('server-chat-input');
  if (!input.value.trim()) return;
  
  isSendingServer = true; // Liga a trava
  const btn = event.target.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages`, {
      method: 'POST', body: JSON.stringify({ content: input.value, reply_to: replyServer?.id })
    });
    playSound('send');
    input.value = '';
    cancelReplyServer();
  } catch (err) { 
    showToast(err.message, 'error'); 
  } finally {
    isSendingServer = false; // Destrava
    if (btn) btn.disabled = false;
    input.focus();
  }
}

function setReplyDM(message) {
  replyDM = message;
  document.getElementById('reply-to-name-dm').textContent = message.sender_id === currentUser.id ? 'Yourself' : activeFriend.display_name;
  document.getElementById('reply-to-content-dm').textContent = message.content.substring(0, 50);
  document.getElementById('reply-context-dm').classList.remove('hidden');
  document.getElementById('chat-input').focus();
}

function cancelReplyDM() {
  replyDM = null;
  document.getElementById('reply-context-dm').classList.add('hidden');
}

function setReplyServer(message) {
  replyServer = message;
  document.getElementById('reply-to-name-server').textContent = message.users?.display_name || 'User';
  document.getElementById('reply-to-content-server').textContent = message.content.substring(0, 50);
  document.getElementById('reply-context-server').classList.remove('hidden');
  document.getElementById('server-chat-input').focus();
}

function cancelReplyServer() {
  replyServer = null;
  document.getElementById('reply-context-server').classList.add('hidden');
}

async function loadGifTab(tab, query = 'hello') {
  const grid = document.getElementById('gif-grid');
  if (!grid) return;
  grid.innerHTML = '<p class="muted small">Loading...</p>';
  
  try {
    let gifs = [];
    if (tab === 'search') {
      const res = await api(`/gifs/search?q=${encodeURIComponent(query)}`);
      gifs = res.gifs || [];
    } else {
      const res = await api('/gifs/favorites');
      gifs = res.gifs || [];
    }

    grid.innerHTML = '';
    if (gifs.length === 0) {
      grid.innerHTML = '<p class="muted small">No GIFs found.</p>';
      return;
    }

    gifs.forEach(url => {
      const wrap = document.createElement('div');
      wrap.className = 'gif-item';

      const img = document.createElement('img');
      img.src = url;
      img.onclick = async () => {
        const { message } = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content: `img:${url}` }) });
        appendMessage(message);
        playSound('send');
        document.getElementById('gif-picker').classList.add('hidden');
      };

      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'gif-fav-btn';
      favBtn.textContent = tab === 'fav' ? '✖' : '★';
      favBtn.title = tab === 'fav' ? 'Remove dos favoritos' : 'Adicionar aos favoritos';
      favBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
          if (tab === 'fav') {
            await api('/gifs/favorites', { method: 'DELETE', body: JSON.stringify({ gif_url: url }) });
            wrap.remove();
          } else {
            await api('/gifs/favorites', { method: 'POST', body: JSON.stringify({ gif_url: url }) });
            favBtn.textContent = '✔';
          }
        } catch(err) { showToast(err.message, 'error'); }
      };

      wrap.appendChild(img);
      wrap.appendChild(favBtn);
      grid.appendChild(wrap);
    });
  } catch (err) {
    grid.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
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
    const wrap = document.createElement('div');
    wrap.className = 'channel-wrap';
    
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
    wrap.appendChild(btn);

    // Botões de Editar e Deletar (Apenas para o dono)
    if (activeServer.owner_id === currentUser.id) {
      const actions = document.createElement('div');
      actions.className = 'channel-actions';

      const editBtn = document.createElement('button');
      editBtn.title = 'Edit Channel';
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
      editBtn.onclick = (e) => {
        e.stopPropagation();
        showPrompt({
          title: 'Edit Channel',
          label: 'Enter the new channel name:',
          defaultValue: ch.name,
          confirmText: 'Save',
          onSubmit: (newName) => {
            if (newName) {
              api(`/channels/${ch.id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) })
                .then(() => openServerChat(activeServer))
                .catch(err => showToast(err.message, 'error'));
            }
          }
        });
      };

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.title = 'Delete Channel';
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>`;
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        showConfirm({
          title: 'Delete Channel',
          content: `Are you sure you want to delete #${ch.name}? All messages will be lost.`,
          confirmText: 'Delete',
          onConfirm: async () => {
            try {
              await api(`/channels/${ch.id}`, { method: 'DELETE' });
              openServerChat(activeServer);
              showToast('Channel deleted', 'success');
            } catch(err) { showToast(err.message, 'error'); }
          }
        });
      };

      actions.append(editBtn, delBtn);
      wrap.appendChild(actions);
    }
    
    list.appendChild(wrap);
  });
  
  loadChannelMessages();
}

function appendServerMessage(message) {
  const msgEl = document.getElementById('server-chat-messages');
  let div = msgEl.querySelector(`[data-message-id="${message.id}"]`);
  if (!div) {
    div = document.createElement('div');
    div.className = 'server-message' + (message.sender_id === currentUser.id ? ' mine' : '');
    div.dataset.messageId = message.id;
    msgEl.appendChild(div);
  } else {
    div.innerHTML = '';
  }

  let canDelete = message.sender_id === currentUser.id || activeServer.owner_id === currentUser.id;
  if (!canDelete && serverDataCache) {
    const userRoleIds = serverDataCache.memberRoles.filter(mr => mr.user_id === currentUser.id).map(mr => mr.role_id);
    const roles = serverDataCache.roles.filter(r => userRoleIds.includes(r.id));
    canDelete = roles.some(r => r.manage_messages);
  }

  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  avatar.src = avatarOrDefault(message.users?.avatar);
  avatar.style.cursor = 'pointer';
  avatar.onclick = () => openProfileModal(message.sender_id, 'stranger');
  
  const body = document.createElement('div');
  body.className = 'server-message-body';

  if (message.reply_to) {
    const original = msgEl.querySelector(`[data-message-id="${message.reply_to}"]`);
    const quote = document.createElement('div');
    quote.className = 'reply-quote';
    if (original) {
      const origAuthor = original.dataset.author || 'User';
      const origContent = original.dataset.content || '';
      quote.innerHTML = `<strong>${escapeHtml(origAuthor)}</strong> ${escapeHtml(origContent.substring(0, 50))}`;
      quote.onclick = () => original.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      quote.innerHTML = `<strong>Original message unavailable</strong>`;
    }
    body.appendChild(quote);
  }

  const meta = document.createElement('div');
  meta.className = 'server-message-meta';
  const author = message.users?.display_name || 'User';
  meta.innerHTML = `<strong style="color: ${message.sender_id === currentUser.id ? 'var(--accent)' : 'var(--text)'}">${escapeHtml(author)}</strong><time>${new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</time>`;
  body.appendChild(meta);

  const contentEl = document.createElement('p');
  contentEl.className = 'server-message-content';
  if (message.deleted_at) {
    contentEl.classList.add('deleted-msg');
    contentEl.textContent = 'Mensagem apagada';
    div.dataset.content = '';
  } else {
    contentEl.textContent = message.content;
    div.dataset.content = message.content;
  }
  body.appendChild(contentEl);

  div.dataset.author = author;

  if (!message.deleted_at) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const replyBtn = document.createElement('button');
    replyBtn.innerHTML = '↩';
    replyBtn.title = 'Reply';
    replyBtn.onclick = () => setReplyServer(message);
    actions.appendChild(replyBtn);

    if (canDelete) {
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '🗑';
      delBtn.title = 'Delete';
      delBtn.onclick = async () => {
        showConfirm({
          title: 'Delete Message',
          content: 'Are you sure you want to delete this message?',
          confirmText: 'Delete',
          onConfirm: async () => {
            try { await api(`/servers/${activeServer.id}/messages/${message.id}`, { method: 'DELETE' }); } catch(e) { showToast(e.message, 'error'); }
          }
        });
      };
      actions.appendChild(delBtn);
    }
    div.appendChild(actions);
  }

  div.appendChild(avatar);
  div.appendChild(body);
  msgEl.scrollTop = msgEl.scrollHeight;
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