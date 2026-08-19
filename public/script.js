// ========================================
// 1. STATE & CONSTANTS
// ========================================

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
let dmHasMore = true;
let dmLoadingMore = false;
let serverHasMore = true;
let serverLoadingMore = false;
let gifPickerOpen = false;
let gifPickerTab = 'search';

const QUICK_REACT_EMOJIS = ['👍', '❤️', '😂'];

// ========================================
// 2. EMOJI SYSTEM (Twemoji)
// ========================================

const EMOJI_MAP = {
  smile:'😄', smiley:'😃', grin:'😁', joy:'😂', laughing:'😆', sweat_smile:'😅', rofl:'🤣',
  wink:'😉', blush:'😊', innocent:'😇', slight_smile:'🙂', upside_down:'🙃',
  heart_eyes:'😍', kissing_heart:'😘', yum:'😋', tongue:'😛', zany:'🤪',
  raised_eyebrow:'🤨', neutral_face:'😐', expressionless:'😑', no_mouth:'😶',
  smirk:'😏', unamused:'😒', roll_eyes:'🙄', grimacing:'😬', lying:'🤥',
  relieved:'😌', pensive:'😔', sleepy:'😪', drool:'🤤', sleeping:'😴',
  mask:'😷', hot:'🥵', cold:'🥶', woozy:'🥴', dizzy:'😵', mind_blown:'🤯',
  cowboy:'🤠', party:'🥳', sunglasses:'😎', nerd:'🤓', monocle:'🧐',
  thinking:'🤔', confused:'😕', worried:'😟', frown:'☹️', open_mouth:'😮',
  hushed:'😯', astonished:'😲', flushed:'😳', scream:'😱', fearful:'😨',
  cold_sweat:'😰', sweat:'😓', cry:'😢', sob:'😭', angry:'😠', rage:'😡',
  cursing:'🤬', devil:'😈', skull:'💀', ghost:'👻', alien:'👽', robot:'🤖',
  poop:'💩', clown:'🤡', pleading:'🥺', hugs:'🤗', shushing:'🤫', eyes:'👀',
  feliz:'😄', triste:'😢', risada:'😂', risos:'😂', sorriso:'😊', raiva:'😠',
  medo:'😨', sono:'😴', amor:'❤️', beijo:'😘', abraco:'🤗', obrigado:'🙏',
  ola:'👋', oi:'👋', tchau:'👋', sim:'✅', nao:'❌', fogo:'🔥', top:'👍',
  legal:'😎', festa:'🎉', parabens:'🎂', dinheiro:'💰', coroa:'👑',
  foguete:'🚀', estrela:'⭐', raio:'⚡', sol:'☀️', lua:'🌙', chuva:'🌧️',
  neve:'❄️', cafe:'☕', pizza:'🍕', bolo:'🍰', cerveja:'🍺', musica:'🎵',
  computador:'💻', celular:'📱', jogo:'🎮', coracao:'❤️',
  thumbsup:'👍', thumbsdown:'👎', '+1':'👍', '-1':'👎', ok_hand:'👌',
  peace:'✌️', v:'✌️', wave:'👋', clap:'👏', pray:'🙏', handshake:'🤝',
  muscle:'💪', facepalm:'🤦', shrug:'🤷', point_up:'☝️', point_right:'👉',
  point_left:'👈', point_down:'👇', raised_hands:'🙌', call_me:'🤙', metal:'🤘',
  heart:'❤️', blue_heart:'💙', green_heart:'💚', yellow_heart:'💛',
  purple_heart:'💜', black_heart:'🖤', white_heart:'🤍', orange_heart:'🧡',
  broken_heart:'💔', two_hearts:'💕', sparkling_heart:'💖', gift_heart:'💝',
  heartbeat:'💓', revolving_hearts:'💞', heart_exclamation:'❣️',
  dog:'🐶', cat:'🐱', mouse:'🐭', fox:'🦊', bear:'🐻', panda:'🐼',
  koala:'🐨', tiger:'🐯', lion:'🦁', cow:'🐮', pig:'🐷', frog:'🐸',
  monkey:'🐵', unicorn:'🦄', bee:'🐝', butterfly:'🦋', turtle:'🐢',
  snake:'🐍', fish:'🐟', dolphin:'🐬', whale:'🐳', octopus:'🐙',
  crab:'🦀', penguin:'🐧', owl:'🦉', chicken:'🐔',
  apple:'🍎', banana:'🍌', grape:'🍇', watermelon:'🍉', strawberry:'🍓',
  cherry:'🍒', peach:'🍑', pineapple:'🍍', burger:'🍔', fries:'🍟',
  taco:'🌮', popcorn:'🍿', cookie:'🍪', donut:'🍩', chocolate:'🍫',
  candy:'🍬', cake:'🍰', birthday:'🎂', coffee:'☕', tea:'🍵', beer:'🍺',
  wine:'🍷', cocktail:'🍸', tada:'🎉',
  fire:'🔥', sparkles:'✨', star:'⭐', star2:'🌟', boom:'💥', zap:'⚡',
  rainbow:'🌈', sun:'☀️', moon:'🌙', cloud:'☁️', snowflake:'❄️', umbrella:'☔',
  '100':'💯', hundred:'💯', check:'✅', white_check_mark:'✅', x:'❌',
  question:'❓', exclamation:'❗', warning:'⚠️', no_entry:'⛔', crown:'👑',
  gem:'💎', money:'💰', moneybag:'💰', rocket:'🚀', airplane:'✈️', car:'🚗',
  trophy:'🏆', medal:'🏅', gift:'🎁', balloon:'🎈', bell:'🔔', bookmark:'🔖',
  book:'📖', memo:'📝', pencil:'✏️', pushpin:'📌', lock:'🔒', unlock:'🔓',
  key:'🔑', hammer:'🔨', wrench:'🔧', gear:'⚙️', mag:'🔍', flashlight:'🔦',
  hourglass:'⏳', alarm:'⏰', calendar:'📅', computer:'💻', phone:'📱',
  tv:'📺', camera:'📷', game:'🎮', controller:'🎮', headphones:'🎧',
  music:'🎵', microphone:'🎤', guitar:'🎸', art:'🎨',
  flag_br:'🇧🇷', flag_us:'🇺🇸'
};

function toTwemoji(text) {
  if (window.twemoji) return twemoji.parse(text, { size: '72x72' });
  return text;
}

function parseEmojis(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/:([a-zA-Z0-9_+-]{1,25}):/g, (match, name) => {
    const emoji = EMOJI_MAP[name.toLowerCase()];
    return emoji ? emoji : match;
  });
  return toTwemoji(safe);
}

function setupEmojiAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let ac = document.createElement('div');
  ac.className = 'emoji-ac hidden';
  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(ac);
  let currentMatches = [];
  let selIndex = 0;

  function renderAc() {
    ac.innerHTML = '';
    currentMatches.forEach(([name, emoji], i) => {
      const item = document.createElement('div');
      item.className = 'emoji-ac-item' + (i === selIndex ? ' selected' : '');
      item.innerHTML = `${toTwemoji(emoji)}<span class="emoji-ac-name">:${name}:</span>`;
      item.onmousedown = (e) => { e.preventDefault(); insertMatch(name); };
      ac.appendChild(item);
    });
  }

  function insertMatch(name) {
    const pos = input.selectionStart;
    const before = input.value.substring(0, pos);
    const after = input.value.substring(input.selectionEnd);
    const newBefore = before.replace(/:([a-zA-Z0-9_+-]{1,25})$/, `:${name}: `);
    input.value = newBefore + after;
    input.focus();
    input.setSelectionRange(newBefore.length, newBefore.length);
    ac.classList.add('hidden');
  }

  input.addEventListener('input', () => {
    const before = input.value.substring(0, input.selectionStart);
    const match = before.match(/:([a-zA-Z0-9_+-]{1,25})$/);
    if (match) {
      const q = match[1].toLowerCase();
      currentMatches = Object.entries(EMOJI_MAP).filter(([name]) => name.startsWith(q) || name.includes(q)).slice(0, 8);
      if (currentMatches.length) { selIndex = 0; renderAc(); ac.classList.remove('hidden'); return; }
    }
    ac.classList.add('hidden');
  });

  input.addEventListener('keydown', (e) => {
    if (ac.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selIndex = Math.min(selIndex + 1, currentMatches.length - 1); renderAc(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); renderAc(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMatch(currentMatches[selIndex][0]); }
    else if (e.key === 'Escape') ac.classList.add('hidden');
  });
}

// ========================================
// 3. UTILITY FUNCTIONS
// ========================================

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#5865f2"/><text x="50%" y="55%" font-size="32" fill="white" text-anchor="middle" font-family="sans-serif">?</text></svg>`
);

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

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileExtension(name) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

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
  okBtn.onclick = () => { modal.classList.add('hidden'); if (onConfirm) onConfirm(); };
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
  okBtn.onclick = () => { const val = input.value.trim(); modal.classList.add('hidden'); if (onSubmit) onSubmit(val); };
  actions.append(cancelBtn, okBtn);
  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
}

// ========================================
// 4. AUDIO SYSTEM
// ========================================

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* */ }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (type === 'login') { if (localStorage.getItem('pc_sound_login') === 'off') return; }
  else { if (localStorage.getItem('pc_sound_messages') === 'off') return; }
  if (currentUser && currentUser.status && currentUser.status !== 'online' && type !== 'login') return;
  initAudio();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    masterGain.connect(filter);
    filter.connect(audioCtx.destination);
    masterGain.gain.value = 1.0;
    let freqs = [], dur = 0.2;
    if (type === 'send') { freqs = [523.25, 659.25]; dur = 0.15; }
    else if (type === 'receive') { freqs = [659.25, 523.25]; dur = 0.25; }
    else if (type === 'login') { freqs = [392, 523.25, 659.25]; dur = 0.4; }
    else return;
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = Math.random() * 10 - 5;
      const oscGain = audioCtx.createGain();
      const startTime = now + (i * 0.08);
      oscGain.gain.setValueAtTime(0, startTime);
      oscGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + dur);
    });
  } catch (e) { /* */ }
}

// ========================================
// 5. NOTIFICATION SYSTEM
// ========================================

function showNotification(title, body, avatarUrl) {
  if (localStorage.getItem('pc_notify_popup') === 'off') return;
  const container = document.getElementById('notification-container');
  if (!container) return;
  const notif = document.createElement('div');
  notif.className = 'notification-card';
  notif.innerHTML = `
    <img src="${avatarUrl}" class="notification-avatar" alt="" />
    <div class="notification-content">
      <div class="notification-title">${escapeHtml(title)}</div>
      <div class="notification-body">${escapeHtml(body)}</div>
    </div>`;
  container.appendChild(notif);
  setTimeout(() => notif.classList.add('show'), 10);
  setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 400); }, 4000);
}

// ========================================
// 6. AUTHENTICATION
// ========================================

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
    initAudio();
    try {
      const { user } = await api('/login', { method: 'POST', body: JSON.stringify({
        username: document.getElementById('login-username').value.trim(),
        password: document.getElementById('login-password').value
      })});
      currentUser = user;
      enterApp();
    } catch (err) { document.getElementById('login-error').textContent = err.message; }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    initAudio();
    try {
      const { user } = await api('/register', { method: 'POST', body: JSON.stringify({
        username: document.getElementById('register-username').value.trim(),
        display_name: document.getElementById('register-display-name').value.trim(),
        password: document.getElementById('register-password').value
      })});
      currentUser = user;
      enterApp();
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
  loadFriends().then(renderHomeExtras);
  loadFriendRequests();
  loadServers().then(renderHomeExtras);
  setupStatus();
  playSound('login');
  switchView('home');
}

// ========================================
// 7. SOCKET.IO
// ========================================

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
      if (friend) friend.unread_count = 0;
    } else {
      if (!isSender) {
        playSound('receive');
        const preview = message.content.startsWith('img:') ? 'GIF' : message.content.startsWith('file:') ? 'File' : message.content;
        showNotification(friend?.display_name || 'New Message', preview, avatarOrDefault(friend?.avatar));
        if (friend) friend.unread_count = (friend.unread_count || 0) + 1;
      }
    }
    if (friend) {
      friend.last_message = message.content.startsWith('img:') ? 'GIF' : message.content.startsWith('file:') ? 'File' : message.content;
      friend.last_message_at = message.created_at;
    }
    updateUnreadBadges();
    renderHomeExtras();
  });

  socket.on('presence', ({ userId, online }) => {
    if (online) onlineFriendIds.add(userId); else onlineFriendIds.delete(userId);
    updateOnlineIndicators();
    renderHomeExtras();
    if (activeFriend && activeFriend.id === userId) {
      const statusEl = document.getElementById('chat-header-status');
      if (statusEl) statusEl.textContent = online ? '● Online' : '● Offline';
    }
  });

  socket.on('new_server_message', (message) => {
    if (activeServer && activeChannel && message.server_id === activeServer.id && message.channel_id === activeChannel.id) {
      appendServerMessage(message);
      if (message.sender_id !== currentUser.id && !document.hasFocus()) playSound('receive');
    } else if (message.sender_id !== currentUser.id) {
      playSound('receive');
      showNotification(message.users?.display_name || 'Server', message.content, avatarOrDefault(message.users?.avatar));
    }
  });

  socket.on('reaction_added', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (!msgEl) return;
    const container = msgEl.querySelector('.reactions-container');
    if (!container) return;
    let badge = container.querySelector(`[data-emoji="${CSS.escape(data.emoji)}"]`);
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'reaction-badge';
      badge.dataset.emoji = data.emoji;
      badge.innerHTML = `${toTwemoji(data.emoji)} <span>0</span>`;
      badge.onclick = async () => { try { await api(`/messages/${data.messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: data.emoji }) }); } catch(e) {} };
      container.appendChild(badge);
    }
    const countSpan = badge.querySelector('span');
    countSpan.textContent = parseInt(countSpan.textContent) + 1;
    if (data.userId === currentUser.id) badge.classList.add('mine');
  });

  socket.on('reaction_removed', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (!msgEl) return;
    const container = msgEl.querySelector('.reactions-container');
    if (!container) return;
    const badge = container.querySelector(`[data-emoji="${CSS.escape(data.emoji)}"]`);
    if (badge) {
      const countSpan = badge.querySelector('span');
      const nc = parseInt(countSpan.textContent) - 1;
      if (nc <= 0) badge.remove(); else countSpan.textContent = nc;
      if (data.userId === currentUser.id) badge.classList.remove('mine');
    }
  });

  socket.on('message_deleted', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgEl) {
      const bubble = msgEl.querySelector('.message-bubble');
      if (bubble) { bubble.classList.add('deleted-msg'); bubble.textContent = 'Mensagem apagada'; }
      const actions = msgEl.querySelector('.message-actions'); if (actions) actions.remove();
      msgEl.dataset.content = '';
    }
  });

  socket.on('server_message_deleted', (data) => {
    const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (msgEl) {
      const contentEl = msgEl.querySelector('.server-message-content');
      if (contentEl) { contentEl.classList.add('deleted-msg'); contentEl.textContent = 'Mensagem apagada'; }
      const actions = msgEl.querySelector('.message-actions'); if (actions) actions.remove();
      msgEl.dataset.content = '';
    }
  });

  socket.on('message_updated', (message) => {
    const msgEl = document.querySelector(`[data-message-id="${message.id}"]`);
    if (msgEl) {
      const bubble = msgEl.querySelector('.message-bubble');
      if (bubble) {
        bubble.innerHTML = renderMessageContent(message.content);
        if (message.edited_at) {
          const timeEl = bubble.querySelector('.msg-edited');
          if (!timeEl) {
            const sp = document.createElement('span');
            sp.className = 'msg-edited muted small';
            sp.style.marginLeft = '6px';
            sp.textContent = '(edited)';
            bubble.appendChild(sp);
          }
        }
      }
      msgEl.dataset.content = message.content;
    }
  });
}

// ========================================
// 8. NAVIGATION
// ========================================

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  document.querySelectorAll('.view').forEach(s => s.classList.add('hidden'));
  const show = (id) => document.getElementById(id)?.classList.remove('hidden');
  if (view === 'friends') { show('view-friends'); loadFriends(); loadFriendRequests(); }
  else if (view === 'users') show('view-users');
  else if (view === 'servers') { show('view-servers'); loadServers(); }
  else if (view === 'settings') { show('view-settings'); fillSettingsForm(); }
  else if (view === 'chat') { show('view-chat'); renderChatFriendList(); }
  else { show('view-home'); renderHomeExtras(); }
}

// ========================================
// 9. HOME VIEW
// ========================================

function setupHome() {
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'dms') switchView('chat');
      else if (a === 'add-friend') switchView('friends');
      else if (a === 'create-server') { switchView('servers'); setTimeout(() => document.getElementById('server-name-input')?.focus(), 100); }
      else if (a === 'settings') switchView('settings');
    });
  });
}

function renderHomeExtras() {
  updateHomeHeader();
  const statsRow = document.getElementById('home-stats-row');
  if (statsRow) {
    const onlineCount = cachedFriends.filter(f => onlineFriendIds.has(f.id)).length;
    const unreadTotal = cachedFriends.reduce((s, f) => s + (f.unread_count || 0), 0);
    const stats = [
      { number: cachedFriends.length, label: 'Friends', action: 'friends' },
      { number: onlineCount, label: 'Online Now', action: 'friends' },
      { number: cachedServers.length, label: 'Servers', action: 'servers' },
      { number: unreadTotal, label: 'Unread', action: 'chat' }
    ];
    statsRow.innerHTML = '';
    stats.forEach(s => {
      const card = document.createElement('div');
      card.className = 'home-stat-card';
      card.innerHTML = `<div class="home-stat-number">${s.number}</div><div class="home-stat-label">${s.label}</div>`;
      card.addEventListener('click', () => switchView(s.action));
      statsRow.appendChild(card);
    });
  }
  const pill = document.getElementById('profile-status-pill');
  if (pill && currentUser) {
    const st = currentUser.status || 'online';
    const labels = { online: 'Online', away: 'Away', busy: 'Do Not Disturb', invisible: 'Invisible' };
    pill.innerHTML = `<span class="status-dot ${st}"></span>${labels[st] || 'Online'}`;
  }
  // Online friends
  const onlineList = document.getElementById('online-friends-list');
  const onlineCountEl = document.getElementById('online-friends-count');
  if (onlineList) {
    const ofl = cachedFriends.filter(f => onlineFriendIds.has(f.id));
    if (onlineCountEl) onlineCountEl.textContent = ofl.length;
    onlineList.innerHTML = '';
    if (!ofl.length) onlineList.innerHTML = '<li class="widget-empty">No friends online right now</li>';
    else ofl.slice(0, 8).forEach(f => {
      const li = document.createElement('li');
      li.className = 'widget-item';
      li.innerHTML = `<img class="avatar" src="${avatarOrDefault(f.avatar)}" /><span class="online-dot-sm online"></span><span class="widget-item-name">${escapeHtml(f.display_name)}</span>`;
      li.addEventListener('click', () => { switchView('chat'); openChat(f); });
      onlineList.appendChild(li);
    });
  }
  // Recent conversations
  const actList = document.getElementById('recent-activity-list');
  if (actList) {
    const withMsg = cachedFriends.filter(f => f.last_message_at).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    actList.innerHTML = '';
    if (!withMsg.length) actList.innerHTML = '<li class="widget-empty">No recent conversations yet</li>';
    else withMsg.slice(0, 6).forEach(f => {
      const li = document.createElement('li');
      li.className = 'widget-item';
      li.innerHTML = `<img class="avatar" src="${avatarOrDefault(f.avatar)}" /><span class="widget-item-name">${escapeHtml(f.display_name)}</span><span class="widget-item-sub">${escapeHtml((f.last_message || '').substring(0, 18))}</span>`;
      li.addEventListener('click', () => { switchView('chat'); openChat(f); });
      actList.appendChild(li);
    });
  }
  // Servers
  const sList = document.getElementById('home-servers-list');
  const sCount = document.getElementById('home-servers-count');
  if (sList) {
    if (sCount) sCount.textContent = cachedServers.length;
    sList.innerHTML = '';
    if (!cachedServers.length) sList.innerHTML = '<li class="widget-empty">Create or join a server to see it here</li>';
    else cachedServers.slice(0, 6).forEach(s => {
      const li = document.createElement('li');
      li.className = 'widget-item';
      const initial = (s.name || 'S').charAt(0).toUpperCase();
      const icon = s.icon_url ? `<img class="avatar" src="${escapeHtml(s.icon_url)}" />` : `<span class="server-mini-badge">${initial}</span>`;
      li.innerHTML = `${icon}<span class="widget-item-name">${escapeHtml(s.name || 'Server')}</span><span class="widget-item-sub">Open</span>`;
      li.addEventListener('click', () => switchView('servers'));
      sList.appendChild(li);
    });
  }
}

function updateHomeHeader() {
  const g = document.getElementById('home-greeting');
  const n = document.getElementById('home-username-big');
  const d = document.getElementById('home-date');
  if (g) {
    const h = new Date().getHours();
    let txt = 'Good night';
    if (h >= 5 && h < 12) txt = 'Good morning';
    else if (h < 18) txt = 'Good afternoon';
    else if (h < 22) txt = 'Good evening';
    g.textContent = txt + ',';
  }
  if (n && currentUser) n.textContent = currentUser.display_name;
  if (d) d.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ========================================
// 10. PROFILE RENDERING
// ========================================

function renderProfile() {
  document.getElementById('profile-avatar').src = avatarOrDefault(currentUser.avatar);
  document.getElementById('profile-display-name').textContent = currentUser.display_name;
  document.getElementById('profile-username').textContent = '@' + currentUser.username;
  document.getElementById('profile-serial').textContent = currentUser.serial_id;
  document.getElementById('profile-bio').innerHTML = parseEmojis(currentUser.bio || 'No bio provided.');
  const bannerEl = document.getElementById('profile-banner-el');
  bannerEl.style.backgroundImage = currentUser.banner ? `url('${currentUser.banner}')` : 'linear-gradient(135deg, var(--accent), var(--brand-to))';
  const homeUserEl = document.getElementById('home-username');
  if (homeUserEl) homeUserEl.textContent = currentUser.display_name;
  fillAccountCard();
  renderHomeExtras();
}

// ========================================
// 11. FRIENDS VIEW
// ========================================

function setupFriendsView() {
  const form = document.getElementById('add-friend-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('friend-serial-input');
    const errorEl = document.getElementById('add-friend-error');
    const btn = document.getElementById('send-friend-request-btn');
    if (!input.value.trim()) return;
    btn.textContent = 'Sending...'; btn.disabled = true; errorEl.textContent = '';
    try {
      await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: input.value.trim() }) });
      input.value = '';
      errorEl.style.color = 'var(--online)'; errorEl.textContent = 'Request sent!';
      loadFriendRequests();
    } catch (err) { errorEl.style.color = 'var(--danger)'; errorEl.textContent = err.message; }
    finally { btn.textContent = 'Send Request'; btn.disabled = false; }
  });
}

async function loadFriendRequests() {
  try {
    const [{ requests }, { requests: outgoing }] = await Promise.all([api('/friends/requests'), api('/friends/requests/outgoing')]);
    cachedOutgoing = outgoing;
    const list = document.getElementById('friend-requests-list');
    list.innerHTML = '';
    if (!requests.length) list.innerHTML = '<li class="muted small">No pending requests</li>';
    requests.forEach(req => {
      const li = document.createElement('li'); li.className = 'list-item';
      li.innerHTML = `<div class="clickable"><img class="avatar" src="${avatarOrDefault(req.avatar)}" /><div class="info"><div class="name">${escapeHtml(req.display_name)}</div><div class="muted small">${req.serial_id}</div></div></div><div class="actions"><button class="accept-btn">✔</button><button class="decline-btn btn-secondary">✖</button></div>`;
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(req.id, 'stranger'));
      li.querySelector('.accept-btn').addEventListener('click', async () => { await api('/friends/accept', { method: 'POST', body: JSON.stringify({ request_id: req.request_id }) }); loadFriendRequests(); loadFriends().then(renderHomeExtras); });
      li.querySelector('.decline-btn').addEventListener('click', async () => { await api('/friends/decline', { method: 'POST', body: JSON.stringify({ request_id: req.request_id }) }); loadFriendRequests(); });
      list.appendChild(li);
    });
    const outList = document.getElementById('friend-requests-outgoing-list');
    outList.innerHTML = '';
    if (!outgoing.length) outList.innerHTML = '<li class="muted small">No outgoing requests</li>';
    outgoing.forEach(req => {
      const li = document.createElement('li'); li.className = 'list-item';
      li.innerHTML = `<div class="clickable"><img class="avatar" src="${avatarOrDefault(req.avatar)}" /><div class="info"><div class="name">${escapeHtml(req.display_name)}</div><div class="muted small">Waiting...</div></div></div><div class="actions"><button class="cancel-btn btn-secondary">✖</button></div>`;
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(req.id, 'stranger'));
      li.querySelector('.cancel-btn').addEventListener('click', async () => { await api('/friends/cancel', { method: 'POST', body: JSON.stringify({ request_id: req.request_id }) }); loadFriendRequests(); });
      outList.appendChild(li);
    });
  } catch (err) { /* */ }
}

async function loadFriends() {
  try {
    const { friends } = await api('/friends');
    const prev = new Map(cachedFriends.map(f => [f.id, f]));
    friends.forEach(f => { const p = prev.get(f.id); if (p) { f.last_message = p.last_message; f.last_message_at = p.last_message_at; } });
    cachedFriends = friends;
    const list = document.getElementById('friends-list');
    list.innerHTML = '';
    if (!friends.length) list.innerHTML = '<li class="muted small">You dont have any friends yet</li>';
    friends.forEach(friend => {
      const li = document.createElement('li'); li.className = 'list-item'; li.dataset.friendId = friend.id;
      const badge = friend.unread_count > 0 ? `<span class="avatar-badge">${friend.unread_count > 99 ? '99+' : friend.unread_count}</span>` : '';
      li.innerHTML = `<div class="clickable"><div class="avatar-wrap"><img class="avatar" src="${avatarOrDefault(friend.avatar)}" />${badge}</div><div class="info"><div class="name">${escapeHtml(friend.display_name)}</div><div class="muted small">${friend.serial_id}</div></div></div><div class="actions"><button class="chat-btn btn-secondary" title="Message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button><button class="remove-btn btn-danger" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div>`;
      li.querySelector('.clickable').addEventListener('click', () => openProfileModal(friend.id, 'friend'));
      li.querySelector('.chat-btn').addEventListener('click', () => { switchView('chat'); openChat(friend); });
      li.querySelector('.remove-btn').addEventListener('click', async () => { await api('/friends/' + friend.id, { method: 'DELETE' }); loadFriends().then(renderHomeExtras); });
      list.appendChild(li);
    });
    updateUnreadBadges();
  } catch (err) { /* */ }
}

// ========================================
// 12. USER SEARCH VIEW
// ========================================

function setupUsersView() {
  const input = document.getElementById('user-search-input');
  const btn = document.getElementById('user-search-btn');
  const resultEl = document.getElementById('user-search-result');
  if (!input || !btn || !resultEl) return;

  async function doSearch() {
    const serial = input.value.trim().replace(/^#+/, '').replace(/\s+/g, '');
    if (!serial) { resultEl.innerHTML = '<p class="form-error">Enter a Serial ID to search.</p>'; input.focus(); return; }
    btn.disabled = true; btn.textContent = 'Searching...'; resultEl.innerHTML = '<p class="muted small">Searching...</p>';
    try {
      const { user } = await api('/users/search?serial_id=' + encodeURIComponent(serial));
      if (!user) { resultEl.innerHTML = '<p class="form-error">User not found.</p>'; return; }
      if (currentUser && user.id === currentUser.id) { resultEl.innerHTML = '<p class="muted small">This is you!</p>'; return; }
      const isFriend = cachedFriends.some(f => f.id === user.id);
      const requestSent = cachedOutgoing.some(r => r.id === user.id);
      const btnLabel = isFriend ? '✔ Friends' : requestSent ? '⏳ Sent' : '➕';
      resultEl.innerHTML = `<div class="list-item"><div class="clickable"><img class="avatar" src="${avatarOrDefault(user.avatar)}" /><div class="info"><div class="name">${escapeHtml(user.display_name)}</div><div class="muted small">${escapeHtml(user.serial_id)}</div></div></div><div class="actions"><button id="add-from-search-btn">${btnLabel}</button></div></div>`;
      resultEl.querySelector('.clickable').addEventListener('click', () => openProfileModal(user.id, isFriend ? 'friend' : 'stranger'));
      const addBtn = document.getElementById('add-from-search-btn');
      if (isFriend || requestSent) { addBtn.disabled = true; }
      else { addBtn.addEventListener('click', async () => { addBtn.disabled = true; try { await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) }); addBtn.textContent = '⏳ Sent'; loadFriendRequests(); } catch (err) { addBtn.disabled = false; showToast(err.message, 'error'); } }); }
    } catch (err) { resultEl.innerHTML = `<p class="form-error">${escapeHtml(err.message)}</p>`; }
    finally { btn.disabled = false; btn.textContent = 'Search'; }
  }
  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
}

// ========================================
// 13. PROFILE MODAL
// ========================================

function setupProfileModal() {
  document.getElementById('profile-modal-close').addEventListener('click', () => document.getElementById('profile-modal').classList.add('hidden'));
  document.getElementById('profile-modal').addEventListener('click', (e) => { if (e.target.id === 'profile-modal') document.getElementById('profile-modal').classList.add('hidden'); });
}

async function openProfileModal(userId, relation) {
  const modal = document.getElementById('profile-modal');
  try {
    const { user } = await api('/users/' + userId);
    document.getElementById('modal-banner').style.backgroundImage = user.banner ? `url('${user.banner}')` : 'linear-gradient(135deg, var(--accent), var(--brand-to))';
    document.getElementById('modal-avatar').src = avatarOrDefault(user.avatar);
    document.getElementById('modal-display-name').textContent = user.display_name;
    document.getElementById('modal-username').textContent = '@' + user.username;
    document.getElementById('modal-serial').textContent = user.serial_id;
    document.getElementById('modal-bio').innerHTML = parseEmojis(user.bio || 'No bio.');
    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    if (relation === 'friend') {
      const msgBtn = document.createElement('button');
      msgBtn.className = 'btn-secondary';
      msgBtn.textContent = 'Message';
      msgBtn.addEventListener('click', () => { modal.classList.add('hidden'); switchView('chat'); openChat(user); });
      actionsEl.appendChild(msgBtn);
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn-danger';
      rmBtn.textContent = 'Remove Friend';
      rmBtn.addEventListener('click', async () => { await api('/friends/' + user.id, { method: 'DELETE' }); modal.classList.add('hidden'); loadFriends().then(renderHomeExtras); if (activeFriend && activeFriend.id === user.id) { activeFriend = null; document.getElementById('chat-active').classList.add('hidden'); document.getElementById('chat-empty').classList.remove('hidden'); } });
      actionsEl.appendChild(rmBtn);
    } else if (relation === 'stranger') {
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add Friend';
      addBtn.addEventListener('click', async () => { addBtn.disabled = true; try { await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) }); addBtn.textContent = 'Sent!'; } catch (err) { addBtn.disabled = false; showToast(err.message, 'error'); } });
      actionsEl.appendChild(addBtn);
    }
    modal.classList.remove('hidden');
  } catch (err) { showToast(err.message, 'error'); }
}

// ========================================
// 14. DM CHAT
// ========================================

function renderChatFriendList() {
  const list = document.getElementById('chat-friends-list');
  list.innerHTML = '';
  if (!cachedFriends.length) { list.innerHTML = '<li class="muted small">No friends yet</li>'; return; }
  cachedFriends.forEach(f => {
    const li = document.createElement('li');
    li.className = 'list-item friend-item' + (activeFriend && activeFriend.id === f.id ? ' selected' : '');
    const online = onlineFriendIds.has(f.id);
    const badge = f.unread_count > 0 ? `<span class="avatar-badge">${f.unread_count > 99 ? '99+' : f.unread_count}</span>` : '';
    li.innerHTML = `<div class="clickable"><div class="avatar-wrap"><img class="avatar" src="${avatarOrDefault(f.avatar)}" />${badge}</div><div class="info"><div class="name">${escapeHtml(f.display_name)}</div><div class="muted small"><span class="online-dot ${online ? 'online' : ''}"></span>${online ? 'Online' : 'Offline'}</div></div></div>`;
    li.querySelector('.clickable').addEventListener('click', () => openChat(f));
    list.appendChild(li);
  });
}

function updateUnreadBadges() {
  const total = cachedFriends.reduce((s, f) => s + (f.unread_count || 0), 0);
  const badge = document.getElementById('dms-unread-badge');
  if (badge) {
    if (total > 0) { badge.textContent = total > 99 ? '99+' : total; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
}

function updateOnlineIndicators() {
  document.querySelectorAll('.friend-item').forEach(li => {
    // simple re-render approach
  });
  renderChatFriendList();
  if (activeFriend) {
    const statusEl = document.getElementById('chat-header-status');
    if (statusEl) statusEl.textContent = onlineFriendIds.has(activeFriend.id) ? '● Online' : '● Offline';
  }
}

async function openChat(friend) {
  activeFriend = friend;
  replyDM = null;
  document.getElementById('reply-context-dm').classList.add('hidden');
  document.getElementById('chat-empty').classList.add('hidden');
  document.getElementById('chat-active').classList.remove('hidden');
  document.getElementById('chat-header-avatar').src = avatarOrDefault(friend.avatar);
  document.getElementById('chat-header-name').textContent = friend.display_name;
  document.getElementById('chat-header-status').textContent = onlineFriendIds.has(friend.id) ? '● Online' : '● Offline';
  const msgsEl = document.getElementById('chat-messages');
  msgsEl.innerHTML = '<p class="muted small" style="text-align:center;">Loading...</p>';
  dmHasMore = true;
  try {
    const { messages } = await api(`/messages/${friend.id}`);
    msgsEl.innerHTML = '';
    messages.forEach(msg => appendMessage(msg));
    msgsEl.scrollTop = msgsEl.scrollHeight;
    friend.unread_count = 0;
    updateUnreadBadges();
    renderChatFriendList();
  } catch (err) { msgsEl.innerHTML = `<p class="form-error" style="text-align:center;">${err.message}</p>`; }
}

// --- Renderizar conteudo de mensagem (texto, GIF, arquivo) ---
function renderMessageContent(content) {
  if (!content) return '';
  if (content.startsWith('img:')) {
    const url = content.substring(4);
    return `<img src="${escapeHtml(url)}" class="msg-gif lightbox-trigger" loading="lazy" />`;
  }
  if (content.startsWith('file:')) {
    try {
      const info = JSON.parse(content.substring(5));
      const ext = getFileExtension(info.name || 'file');
      const downloadUrl = `/api/download?url=${encodeURIComponent(info.url)}&name=${encodeURIComponent(info.name || 'download')}`;
      return `<div class="msg-file-card" data-download-url="${escapeHtml(downloadUrl)}">
        <div class="msg-file-icon">${escapeHtml(ext)}</div>
        <div class="msg-file-info">
          <div class="msg-file-name">${escapeHtml(info.name || 'file')}</div>
          <div class="msg-file-size">${formatFileSize(info.size || 0)}</div>
        </div>
        <div class="msg-file-download">⬇</div>
      </div>`;
    } catch (e) {
      return escapeHtml(content);
    }
  }
  return parseEmojis(content);
}

function appendMessage(msg, prepend = false) {
  const msgsEl = document.getElementById('chat-messages');
  const isMine = msg.sender_id === currentUser.id;
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isMine ? 'mine' : 'theirs'}`;
  wrapper.dataset.messageId = msg.id;
  wrapper.dataset.content = msg.content || '';

  const isDeleted = !!msg.deleted_at;

  let replyHtml = '';
  if (msg.reply_to) {
    // Para DMs, procuramos a mensagem referenciada no DOM
    const refEl = msgsEl.querySelector(`[data-message-id="${msg.reply_to}"]`);
    const refContent = refEl ? (refEl.dataset.content || '') : '';
    const refPreview = refContent.startsWith('img:') ? 'GIF' : refContent.startsWith('file:') ? 'File' : (refContent || '').substring(0, 60);
    replyHtml = `<div class="reply-quote" data-reply-to="${msg.reply_to}"><strong>Reply</strong><br/>${escapeHtml(refPreview)}</div>`;
  }

  const editedHtml = msg.edited_at ? '<span class="msg-edited muted small" style="margin-left:6px;">(edited)</span>' : '';

  wrapper.innerHTML = `
    <div class="message-bubble ${isDeleted ? 'deleted-msg' : ''}">
      ${replyHtml}
      ${isDeleted ? 'Mensagem apagada' : renderMessageContent(msg.content)}
      ${editedHtml}
    </div>
    <div class="reactions-container"></div>
    ${!isDeleted ? `<div class="message-actions">
      ${QUICK_REACT_EMOJIS.map(e => `<button class="quick-react-btn" data-emoji="${e}">${toTwemoji(e)}</button>`).join('')}
      <button class="reply-btn" title="Reply">↩</button>
      ${isMine ? '<button class="delete-btn" title="Delete">🗑</button>' : ''}
    </div>` : ''}`;

  // Reply quote click
  const quoteEl = wrapper.querySelector('.reply-quote');
  if (quoteEl) {
    quoteEl.addEventListener('click', () => {
      const targetId = quoteEl.dataset.replyTo;
      const target = msgsEl.querySelector(`[data-message-id="${targetId}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // File card download
  const fileCard = wrapper.querySelector('.msg-file-card');
  if (fileCard) {
    fileCard.addEventListener('click', () => {
      const url = fileCard.dataset.downloadUrl;
      if (url) window.open(url, '_blank');
    });
  }

  // Lightbox for images
  const img = wrapper.querySelector('.lightbox-trigger');
  if (img) {
    img.addEventListener('click', () => openLightbox(img.src));
  }

  // Quick reactions
  wrapper.querySelectorAll('.quick-react-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await api(`/messages/${msg.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: btn.dataset.emoji }) }); } catch (e) {}
    });
  });

  // Reply button
  const replyBtn = wrapper.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => {
      replyDM = msg;
      const ctx = document.getElementById('reply-context-dm');
      ctx.classList.remove('hidden');
      const preview = msg.content.startsWith('img:') ? 'GIF' : msg.content.startsWith('file:') ? 'File' : msg.content.substring(0, 80);
      document.getElementById('reply-to-name-dm').textContent = isMine ? 'You' : activeFriend?.display_name || 'Unknown';
      document.getElementById('reply-to-content-dm').textContent = preview;
      document.getElementById('chat-input').focus();
    });
  }

  // Delete button
  const delBtn = wrapper.querySelector('.delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      try { await api(`/messages/${msg.id}`, { method: 'DELETE' }); } catch (e) { showToast(e.message, 'error'); }
    });
  }

  if (prepend && msgsEl.firstChild) msgsEl.insertBefore(wrapper, msgsEl.firstChild);
  else msgsEl.appendChild(wrapper);
}

// --- Chat Form (enviar texto) ---
function setupChatForm() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeFriend) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiver_id: activeFriend.id,
          content: text,
          reply_to: replyDM ? replyDM.id : null
        })
      });
      replyDM = null;
      document.getElementById('reply-context-dm').classList.add('hidden');
      playSound('send');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Cancel reply
  document.getElementById('cancel-reply-btn-dm')?.addEventListener('click', () => {
    replyDM = null;
    document.getElementById('reply-context-dm').classList.add('hidden');
  });
}

// --- Chat header profile click ---
function setupChatHeaderProfile() {
  const av = document.getElementById('chat-header-avatar');
  const nm = document.getElementById('chat-header-name');
  [av, nm].forEach(el => {
    if (!el) return;
    el.addEventListener('click', () => { if (activeFriend) openProfileModal(activeFriend.id, 'friend'); });
  });
}

// ========================================
// 15. FILE UPLOAD & DOWNLOAD
// ========================================

function setupFileUpload() {
  const openBtn = document.getElementById('open-file-btn');
  const fileInput = document.getElementById('file-input-dm');
  if (!openBtn || !fileInput) return;

  openBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !activeFriend) { fileInput.value = ''; return; }
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await api('/upload/message-file', { method: 'POST', body: formData });

        let content;
        if (file.type.startsWith('image/')) {
          content = 'img:' + result.url;
        } else {
          content = 'file:' + JSON.stringify({ url: result.url, name: result.name, type: result.type, size: result.size });
        }

        await api('/messages', {
          method: 'POST',
          body: JSON.stringify({ receiver_id: activeFriend.id, content })
        });
        playSound('send');
      } catch (err) { showToast(err.message, 'error'); }
    }
    fileInput.value = '';
  });
}

function setupFileDragDrop() {
  const chatActive = document.getElementById('chat-active');
  if (!chatActive) return;

  chatActive.addEventListener('dragover', (e) => { e.preventDefault(); chatActive.classList.add('file-drop-active'); });
  chatActive.addEventListener('dragleave', (e) => { e.preventDefault(); chatActive.classList.remove('file-drop-active'); });
  chatActive.addEventListener('drop', async (e) => {
    e.preventDefault();
    chatActive.classList.remove('file-drop-active');
    const files = Array.from(e.dataTransfer.files);
    if (!files.length || !activeFriend) return;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await api('/upload/message-file', { method: 'POST', body: formData });
        let content;
        if (file.type.startsWith('image/')) {
          content = 'img:' + result.url;
        } else {
          content = 'file:' + JSON.stringify({ url: result.url, name: result.name, type: result.type, size: result.size });
        }
        await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content }) });
        playSound('send');
      } catch (err) { showToast(err.message, 'error'); }
    }
  });
}

// ========================================
// 16. GIF PICKER (CHAT)
// ========================================

function setupGifPicker() {
  const openBtn = document.getElementById('open-gif-btn');
  const picker = document.getElementById('gif-picker');
  const searchInput = document.getElementById('gif-search-input');
  const grid = document.getElementById('gif-grid');
  if (!openBtn || !picker || !searchInput || !grid) return;

  // Abrir/fechar
  openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    gifPickerOpen = !gifPickerOpen;
    picker.classList.toggle('hidden', !gifPickerOpen);
    if (gifPickerOpen) {
      searchInput.value = '';
      searchInput.focus();
      loadChatGifs('search', 'hello');
    }
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (gifPickerOpen && !picker.contains(e.target) && e.target !== openBtn) {
      gifPickerOpen = false;
      picker.classList.add('hidden');
    }
  });

  // Tabs
  picker.querySelectorAll('[data-gif-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      picker.querySelectorAll('[data-gif-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      gifPickerTab = tab.dataset.gifTab;
      if (gifPickerTab === 'search') {
        searchInput.classList.remove('hidden');
        loadChatGifs('search', searchInput.value || 'hello');
      } else {
        searchInput.classList.add('hidden');
        loadChatGifs('fav');
      }
    });
  });

  // Search com debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (gifPickerTab === 'search') loadChatGifs('search', searchInput.value || 'hello');
    }, 500);
  });

  // Selecionar GIF
  grid.addEventListener('click', async (e) => {
    const img = e.target.closest('.gif-grid img');
    if (!img || !activeFriend) return;
    const url = img.src;
    gifPickerOpen = false;
    picker.classList.add('hidden');
    try {
      await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content: 'img:' + url }) });
      playSound('send');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function loadChatGifs(tab, query = 'hello') {
  const grid = document.getElementById('gif-grid');
  grid.innerHTML = '<p class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">Loading...</p>';
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
    if (!gifs.length) { grid.innerHTML = '<p class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">No GIFs found.</p>'; return; }
    gifs.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      img.alt = 'GIF';
      grid.appendChild(img);
    });
  } catch (err) {
    grid.innerHTML = `<p class="form-error" style="grid-column:1/-1;text-align:center;padding:20px;">${escapeHtml(err.message)}</p>`;
  }
}

// ========================================
// 17. IMAGE LIGHTBOX
// ========================================

function setupImageLightbox() {
  const backdrop = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const downloadBtn = document.getElementById('lightbox-download');
  const copyBtn = document.getElementById('lightbox-copy');

  if (!backdrop || !img) return;

  closeBtn.addEventListener('click', closeLightbox);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeLightbox(); });

  img.addEventListener('click', () => img.classList.toggle('zoomed'));

  downloadBtn.addEventListener('click', () => {
    const url = img.src;
    if (url) window.open(url, '_blank');
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(img.src).then(() => showToast('Link copied!', 'success')).catch(() => {});
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) closeLightbox();
  });
}

function openLightbox(src) {
  const backdrop = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (!backdrop || !img) return;
  img.src = src;
  img.classList.remove('zoomed');
  backdrop.classList.remove('hidden');
}

function closeLightbox() {
  const backdrop = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (backdrop) backdrop.classList.add('hidden');
  if (img) { img.classList.remove('zoomed'); img.src = ''; }
}

// ========================================
// 18. SCROLL (load more)
// ========================================

function setupScrollListeners() {
  const dmEl = document.getElementById('chat-messages');
  dmEl.addEventListener('scroll', async () => {
    if (dmEl.scrollTop < 50 && dmHasMore && !dmLoadingMore && activeFriend) {
      dmLoadingMore = true;
      const firstMsg = dmEl.querySelector('.message-wrapper');
      if (!firstMsg) { dmLoadingMore = false; return; }
      const firstId = firstMsg.dataset.messageId;
      const oldHeight = dmEl.scrollHeight;
      try {
        const { messages, has_more } = await api(`/messages/${activeFriend.id}?before=${firstId}`);
        dmHasMore = has_more;
        messages.reverse().forEach(msg => appendMessage(msg, true));
        dmEl.scrollTop += dmEl.scrollHeight - oldHeight;
      } catch (err) { showToast(err.message, 'error'); }
      finally { dmLoadingMore = false; }
    }
  });

  const serverEl = document.getElementById('server-chat-messages');
  serverEl.addEventListener('scroll', async () => {
    if (serverEl.scrollTop < 50 && serverHasMore && !serverLoadingMore && activeServer && activeChannel) {
      serverLoadingMore = true;
      const firstMsg = serverEl.querySelector('.server-message');
      if (!firstMsg) { serverLoadingMore = false; return; }
      const firstId = firstMsg.dataset.messageId;
      const oldHeight = serverEl.scrollHeight;
      try {
        const { messages, has_more } = await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages?before=${firstId}`);
        serverHasMore = has_more;
        messages.reverse().forEach(msg => appendServerMessage(msg, true));
        serverEl.scrollTop += serverEl.scrollHeight - oldHeight;
      } catch (err) { showToast(err.message, 'error'); }
      finally { serverLoadingMore = false; }
    }
  });
}

// ========================================
// 19. SERVERS VIEW
// ========================================

function setupServersView() {
  // Create server
  document.getElementById('server-create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('server-name-input');
    const errorEl = document.getElementById('server-error');
    if (!nameInput.value.trim()) return;
    errorEl.textContent = '';
    try {
      const { server } = await api('/servers', { method: 'POST', body: JSON.stringify({ name: nameInput.value.trim() }) });
      nameInput.value = '';
      await loadServers();
      openServer(server);
    } catch (err) { errorEl.textContent = err.message; }
  });

  // Join server
  document.getElementById('server-join-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeInput = document.getElementById('server-invite-input');
    const errorEl = document.getElementById('server-error');
    errorEl.textContent = '';
    try {
      const { server } = await api('/servers/join', { method: 'POST', body: JSON.stringify({ invite_code: codeInput.value.trim() }) });
      codeInput.value = '';
      await loadServers();
      openServer(server);
    } catch (err) { errorEl.textContent = err.message; }
  });

  // Copy invite
  document.getElementById('copy-server-invite-btn')?.addEventListener('click', () => {
    if (activeServer) {
      navigator.clipboard.writeText(activeServer.invite_code).then(() => showToast('Invite code copied!', 'success')).catch(() => {});
    }
  });

  // Open server settings
  document.getElementById('open-server-settings-btn')?.addEventListener('click', () => {
    if (activeServer && serverDataCache) openServerSettingsModal();
  });

  // Create channel
  document.getElementById('create-channel-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-channel-name');
    if (!nameInput.value.trim() || !activeServer) return;
    try {
      await api('/channels', {
        method: 'POST',
        body: JSON.stringify({ server_id: activeServer.id, name: nameInput.value.trim() })
      });
      // Na verdade o endpoint correto e via server data, mas como nao existe, usamos workaround
      // O create channel precisa ser adicionado ao server.js se quiser
      nameInput.value = '';
      await loadServerData();
      showToast('Channel created (refresh if not visible)', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Server chat form
  document.getElementById('server-chat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeServer || !activeChannel) return;
    const input = document.getElementById('server-chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text, reply_to: replyServer ? replyServer.id : null })
      });
      replyServer = null;
      document.getElementById('reply-context-server').classList.add('hidden');
      playSound('send');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Cancel server reply
  document.getElementById('cancel-reply-btn-server')?.addEventListener('click', () => {
    replyServer = null;
    document.getElementById('reply-context-server').classList.add('hidden');
  });

  // Server settings modal close
  document.getElementById('close-server-settings')?.addEventListener('click', () => {
    document.getElementById('server-settings-modal').classList.add('hidden');
  });

  // Server icon upload
  document.getElementById('server-icon-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file || !activeServer) return;
    const formData = new FormData(); formData.append('icon', file);
    try {
      const { server } = await api(`/servers/${activeServer.id}/icon`, { method: 'POST', body: formData });
      activeServer = server;
      cachedServers = cachedServers.map(s => s.id === server.id ? server : s);
      renderServerHeader();
      document.getElementById('server-icon-preview').src = avatarOrDefault(server.icon_url);
    } catch (err) { showToast(err.message, 'error'); }
    e.target.value = '';
  });

  // Save server name
  document.getElementById('save-server-name-btn')?.addEventListener('click', async () => {
    if (!activeServer) return;
    const nameInput = document.getElementById('server-edit-name');
    try {
      const { server } = await api(`/servers/${activeServer.id}`, { method: 'PUT', body: JSON.stringify({ name: nameInput.value.trim() }) });
      activeServer = server;
      cachedServers = cachedServers.map(s => s.id === server.id ? server : s);
      renderServerList();
      renderServerHeader();
      showToast('Name saved!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Create role
  document.getElementById('create-role-btn')?.addEventListener('click', async () => {
    if (!activeServer) return;
    const name = document.getElementById('new-role-name').value.trim();
    const color = document.getElementById('new-role-color').value;
    if (!name) return;
    try {
      await api(`/servers/${activeServer.id}/roles`, { method: 'POST', body: JSON.stringify({ name, color }) });
      document.getElementById('new-role-name').value = '';
      await loadServerData();
      openServerSettingsModal();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function loadServers() {
  try {
    const { servers } = await api('/servers');
    cachedServers = servers;
    renderServerList();
  } catch (err) { /* */ }
}

function renderServerList() {
  const list = document.getElementById('servers-list');
  list.innerHTML = '';
  if (!cachedServers.length) { list.innerHTML = '<li class="server-list-empty">No servers yet</li>'; return; }
  cachedServers.forEach(s => {
    const li = document.createElement('li');
    li.className = 'server-list-item list-item' + (activeServer && activeServer.id === s.id ? ' selected' : '');

    let iconHtml;
    if (s.icon_url) {
      iconHtml = `<img class="server-list-icon" src="${escapeHtml(s.icon_url)}" alt="" />`;
    } else {
      const initial = (s.name || 'S').charAt(0).toUpperCase();
      iconHtml = `<span class="server-list-initial">${initial}</span>`;
    }

    li.innerHTML = `${iconHtml}<span class="server-list-name">${escapeHtml(s.name)}</span>`;
    li.addEventListener('click', () => openServer(s));
    list.appendChild(li);
  });
}
async function openServer(server) {
  activeServer = server;
  activeChannel = null;
  replyServer = null;
  document.getElementById('server-chat-empty').classList.add('hidden');
  document.getElementById('server-chat-active').classList.remove('hidden');
  renderServerHeader();
  renderServerList();
  await loadServerData();
  if (socket) socket.emit('join_server', server.id);
}

function renderServerHeader() {
  if (!activeServer) return;
  const initial = (activeServer.name || 'S').charAt(0).toUpperCase();
  const iconImg = document.getElementById('server-chat-icon');
  const iconDiv = document.getElementById('server-chat-initial');
  if (activeServer.icon_url) {
    iconImg.src = activeServer.icon_url; iconImg.style.display = 'block'; iconDiv.style.display = 'none';
  } else {
    iconImg.style.display = 'none'; iconDiv.style.display = 'grid'; iconDiv.textContent = initial;
  }
  document.getElementById('server-chat-header-name').textContent = activeServer.name;
  document.getElementById('server-invite-label').textContent = 'Invite: ' + activeServer.invite_code;
}

async function loadServerData() {
  if (!activeServer) return;
  try {
    serverDataCache = await api(`/servers/${activeServer.id}/data`);
    renderServerChannels();
    // Auto-select first channel
    const channels = serverDataCache.channels || [];
    if (channels.length && (!activeChannel || !channels.find(c => c.id === activeChannel.id))) {
      selectChannel(channels[0]);
    }
  } catch (err) { showToast(err.message, 'error'); }
}

function renderServerChannels() {
  const list = document.getElementById('server-channels-list');
  list.innerHTML = '';
  if (!serverDataCache) return;
  (serverDataCache.channels || []).forEach(ch => {
    const li = document.createElement('li');
    li.className = 'list-item channel-wrap';
    const isSelected = activeChannel && activeChannel.id === ch.id;

    li.innerHTML = `
      <button class="channel-item ${isSelected ? 'selected' : ''}" style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
        <span style="color:var(--text-muted);font-size:16px;flex-shrink:0;">#</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(ch.name)}</span>
      </button>
      <div class="channel-actions">
        <button class="edit-ch-btn" title="Rename channel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="delete-btn" title="Delete channel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>`;

    // Selecionar canal
    li.querySelector('.channel-item').addEventListener('click', () => selectChannel(ch));

    // Editar nome do canal
    li.querySelector('.edit-ch-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showPrompt({
        title: 'Rename Channel',
        label: 'New name for #' + ch.name,
        defaultValue: ch.name,
        confirmText: 'Save',
        onSubmit: async (newName) => {
          if (!newName.trim()) return;
          try {
            await api(`/channels/${ch.id}`, { method: 'PUT', body: JSON.stringify({ name: newName.trim() }) });
            await loadServerData();
            showToast('Channel renamed!', 'success');
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });

    // Deletar canal
    li.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      showConfirm({
        title: 'Delete Channel',
        content: `Are you sure you want to delete #${ch.name}? This cannot be undone.`,
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await api(`/channels/${ch.id}`, { method: 'DELETE' });
            if (activeChannel && activeChannel.id === ch.id) {
              activeChannel = null;
              document.getElementById('server-chat-messages').innerHTML = '';
              document.getElementById('active-channel-name').textContent = '';
            }
            await loadServerData();
            showToast('Channel deleted', 'success');
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });

    list.appendChild(li);
  });
}

async function selectChannel(channel) {
  activeChannel = channel;
  replyServer = null;
  document.getElementById('reply-context-server').classList.add('hidden');
  document.getElementById('active-channel-name').textContent = channel.name;
  document.getElementById('server-chat-messages').innerHTML = '<p class="muted small" style="text-align:center;padding:20px;">Loading...</p>';
  serverHasMore = true;
  renderServerChannels();
  try {
    const { messages } = await api(`/servers/${activeServer.id}/channels/${channel.id}/messages`);
    const el = document.getElementById('server-chat-messages');
    el.innerHTML = '';
    messages.forEach(msg => appendServerMessage(msg));
    el.scrollTop = el.scrollHeight;
  } catch (err) {
    document.getElementById('server-chat-messages').innerHTML = `<p class="form-error" style="text-align:center;">${err.message}</p>`;
  }
}

function appendServerMessage(msg, prepend = false) {
  const container = document.getElementById('server-chat-messages');
  const isMine = msg.sender_id === currentUser.id;
  const user = msg.users || {};
  const div = document.createElement('div');
  div.className = `server-message ${isMine ? 'mine' : ''}`;
  div.dataset.messageId = msg.id;
  div.dataset.content = msg.content || '';

  const isDeleted = !!msg.deleted_at;

  let replyHtml = '';
  if (msg.reply_to) {
    const refEl = container.querySelector(`[data-message-id="${msg.reply_to}"]`);
    const refContent = refEl ? (refEl.dataset.content || '') : '';
    const refPreview = refContent.startsWith('img:') ? 'GIF' : refContent.startsWith('file:') ? 'File' : (refContent || '').substring(0, 60);
    replyHtml = `<div class="reply-quote"><strong>${escapeHtml(refEl ? (refEl.classList.contains('mine') ? 'You' : user.display_name || 'Unknown') : 'Reply')}</strong><br/>${escapeHtml(refPreview)}</div>`;
  }

  const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  div.innerHTML = `
    <img class="avatar" src="${avatarOrDefault(user.avatar)}" alt="" />
    <div class="server-message-body">
      <div class="server-message-meta">
        <strong>${escapeHtml(user.display_name || 'Unknown')}</strong>
        <time>${timeStr}</time>
      </div>
      <div class="server-message-content ${isDeleted ? 'deleted-msg' : ''}">
        ${replyHtml}
        ${isDeleted ? 'Mensagem apagada' : renderMessageContent(msg.content)}
      </div>
      <div class="reactions-container"></div>
    </div>
    ${!isDeleted ? `<div class="message-actions">
      ${QUICK_REACT_EMOJIS.map(e => `<button class="quick-react-btn" data-emoji="${e}">${toTwemoji(e)}</button>`).join('')}
      <button class="reply-btn" title="Reply">↩</button>
      ${isMine ? '<button class="delete-btn" title="Delete">🗑</button>' : ''}
    </div>` : ''}`;

  // File card download
  const fileCard = div.querySelector('.msg-file-card');
  if (fileCard) {
    fileCard.addEventListener('click', () => {
      const url = fileCard.dataset.downloadUrl;
      if (url) window.open(url, '_blank');
    });
  }

  // Lightbox
  const img = div.querySelector('.lightbox-trigger');
  if (img) img.addEventListener('click', () => openLightbox(img.src));

  // Reactions
  div.querySelectorAll('.quick-react-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await api(`/messages/${msg.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: btn.dataset.emoji }) }); } catch(e) {}
    });
  });

  // Reply
  div.querySelector('.reply-btn')?.addEventListener('click', () => {
    replyServer = msg;
    const ctx = document.getElementById('reply-context-server');
    ctx.classList.remove('hidden');
    const preview = msg.content.startsWith('img:') ? 'GIF' : msg.content.startsWith('file:') ? 'File' : msg.content.substring(0, 80);
    document.getElementById('reply-to-name-server').textContent = user.display_name || 'Unknown';
    document.getElementById('reply-to-content-server').textContent = preview;
    document.getElementById('server-chat-input').focus();
  });

  // Delete
  div.querySelector('.delete-btn')?.addEventListener('click', async () => {
    try { await api(`/servers/${activeServer.id}/messages/${msg.id}`, { method: 'DELETE' }); } catch(e) { showToast(e.message, 'error'); }
  });

  if (prepend && container.firstChild) container.insertBefore(div, container.firstChild);
  else container.appendChild(div);
}

// ========================================
// 20. SERVER SETTINGS MODAL
// ========================================

function openServerSettingsModal() {
  if (!activeServer || !serverDataCache) return;
  const modal = document.getElementById('server-settings-modal');

  document.getElementById('server-icon-preview').src = avatarOrDefault(activeServer.icon_url);
  document.getElementById('server-edit-name').value = activeServer.name || '';

  // Roles
  const rolesList = document.getElementById('server-roles-list');
  rolesList.innerHTML = '';
  (serverDataCache.roles || []).forEach(role => {
    const li = document.createElement('li'); li.className = 'list-item';
    li.innerHTML = `<div class="info"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${role.color};margin-right:8px;"></span><span class="name">${escapeHtml(role.name)}</span></div>`;
    rolesList.appendChild(li);
  });

  // Members
  const membersList = document.getElementById('server-members-list');
  membersList.innerHTML = '';
  (serverDataCache.members || []).forEach(m => {
    const u = m.users || {};
    const li = document.createElement('li'); li.className = 'list-item';
    li.innerHTML = `<div class="clickable"><img class="avatar" src="${avatarOrDefault(u.avatar)}" /><div class="info"><div class="name">${escapeHtml(u.display_name || u.username)}</div></div></div>`;
    membersList.appendChild(li);
  });

  // Channel permissions
  const permSelect = document.getElementById('perm-channel-select');
  permSelect.innerHTML = '';
  (serverDataCache.channels || []).forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch.id; opt.textContent = '#' + ch.name;
    permSelect.appendChild(opt);
  });

  const renderPermissions = () => {
    const chId = Number(permSelect.value);
    const permList = document.getElementById('channel-permissions-list');
    permList.innerHTML = '';
    (serverDataCache.roles || []).forEach(role => {
      const override = (serverDataCache.overrides || []).find(o => o.channel_id === chId && o.role_id === role.id);
      const canSend = override ? override.can_send_messages : true;
      const li = document.createElement('li'); li.className = 'list-item';
      li.innerHTML = `<div class="info"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${role.color};margin-right:8px;"></span><span class="name">${escapeHtml(role.name)}</span></div>
        <label class="toggle"><input type="checkbox" ${canSend ? 'checked' : ''} data-role-id="${role.id}" data-channel-id="${chId}" class="perm-toggle" /><span class="toggle-slider"></span></label>`;
      permList.appendChild(li);
    });
    permList.querySelectorAll('.perm-toggle').forEach(toggle => {
      toggle.addEventListener('change', async () => {
        try {
          await api(`/channels/${toggle.dataset.channelId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify({ role_id: Number(toggle.dataset.roleId), can_send_messages: toggle.checked })
          });
          showToast('Permission updated', 'success');
        } catch (err) { showToast(err.message, 'error'); toggle.checked = !toggle.checked; }
      });
    });
  };
  permSelect.addEventListener('change', renderPermissions);
  renderPermissions();

  modal.classList.remove('hidden');
}

// ========================================
// 21. SETTINGS VIEW
// ========================================

function setupSettingsNav() {
  const btns = document.querySelectorAll('.settings-nav-btn[data-section]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.settings-section').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById('settings-section-' + btn.dataset.section);
      if (target) target.classList.remove('hidden');
    });
  });
  document.getElementById('go-profile-btn')?.addEventListener('click', () => {
    document.querySelector('.settings-nav-btn[data-section="profile"]')?.click();
  });
}

function fillAccountCard() {
  if (!currentUser) return;
  const av = document.getElementById('account-avatar');
  const bn = document.getElementById('account-banner');
  const dn = document.getElementById('account-display-name');
  const un = document.getElementById('account-username');
  const se = document.getElementById('account-serial');
  if (av) av.src = avatarOrDefault(currentUser.avatar);
  if (dn) dn.textContent = currentUser.display_name;
  if (un) un.textContent = '@' + currentUser.username;
  if (se) se.textContent = currentUser.serial_id;
  if (bn) bn.style.backgroundImage = currentUser.banner ? `url('${currentUser.banner}')` : 'linear-gradient(135deg, var(--accent), var(--brand-to))';
}

function setupPreferences() {
  [
    { id: 'pref-reduced-motion', key: 'pc_reduced_motion', className: 'reduced-motion' },
    { id: 'pref-compact-mode', key: 'pc_compact_mode', className: 'compact-mode' }
  ].forEach(({ id, key, className }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = localStorage.getItem(key) === 'on';
    document.body.classList.toggle(className, el.checked);
    el.addEventListener('change', () => { localStorage.setItem(key, el.checked ? 'on' : 'off'); document.body.classList.toggle(className, el.checked); });
  });
}

function setupNotificationPrefs() {
  [
    { id: 'pref-msg-sound', key: 'pc_sound_messages' },
    { id: 'pref-login-sound', key: 'pc_sound_login' },
    { id: 'pref-notify-popup', key: 'pc_notify_popup' }
  ].forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = localStorage.getItem(key) !== 'off';
    el.addEventListener('change', () => { localStorage.setItem(key, el.checked ? 'on' : 'off'); });
  });
}

function setupStatus() {
  const grid = document.getElementById('status-grid');
  if (!grid) return;
  const buttons = grid.querySelectorAll('.status-btn');
  function updateActive() { buttons.forEach(b => b.classList.toggle('active', b.dataset.status === currentUser.status)); }
  updateActive();
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api('/status', { method: 'PUT', body: JSON.stringify({ status: btn.dataset.status }) });
        currentUser.status = btn.dataset.status;
        updateActive();
        renderHomeExtras();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

function fillSettingsForm() {
  document.getElementById('settings-display-name').value = currentUser.display_name || '';
  document.getElementById('settings-bio').value = currentUser.bio || '';
  document.getElementById('avatar-preview').src = avatarOrDefault(currentUser.avatar);
  const bp = document.getElementById('banner-preview');
  if (bp) bp.style.backgroundImage = currentUser.banner ? `url('${currentUser.banner}')` : 'linear-gradient(135deg, var(--accent), var(--brand-to))';
  fillAccountCard();
}

function setupSettingsView() {
  // Save profile
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent; btn.textContent = 'Saving...'; btn.disabled = true;
    try {
      const { user } = await api('/profile', { method: 'PUT', body: JSON.stringify({
        display_name: document.getElementById('settings-display-name').value.trim(),
        bio: document.getElementById('settings-bio').value
      })});
      currentUser = user; renderProfile();
      document.getElementById('settings-success').textContent = 'Profile updated!';
      setTimeout(() => document.getElementById('settings-success').textContent = '', 2000);
    } catch (err) { showToast(err.message, 'error'); }
    finally { btn.textContent = orig; btn.disabled = false; }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await api('/logout', { method: 'POST' }); if (socket) socket.disconnect(); location.reload(); }
    catch (err) { showToast(err.message, 'error'); }
  });

  // Avatar upload
  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('avatar', file);
    try { const { user } = await api('/upload/avatar', { method: 'POST', body: formData }); currentUser = user; renderProfile(); fillSettingsForm(); }
    catch (err) { showToast(err.message, 'error'); }
    e.target.value = '';
  });

  // Banner upload
  document.getElementById('banner-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('banner', file);
    try { const { user } = await api('/upload/banner', { method: 'POST', body: formData }); currentUser = user; renderProfile(); fillSettingsForm(); }
    catch (err) { showToast(err.message, 'error'); }
    e.target.value = '';
  });

  // Avatar GIF
  document.getElementById('avatar-gif-btn').addEventListener('click', () => openGifSelectModal('avatar'));
  // Banner GIF
  document.getElementById('banner-gif-btn').addEventListener('click', () => openGifSelectModal('banner'));

  // Remove avatar
  document.getElementById('remove-avatar-btn').addEventListener('click', async () => {
    try {
      const { user } = await api('/upload/avatar', { method: 'DELETE' });
      currentUser = user; renderProfile(); fillSettingsForm();
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Remove banner
  document.getElementById('remove-banner-btn').addEventListener('click', async () => {
    try {
      const { user } = await api('/upload/banner', { method: 'DELETE' });
      currentUser = user; renderProfile(); fillSettingsForm();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// ========================================
// 22. APPEARANCE (Temas & Cores)
// ========================================

function setupAppearance() {
  // Tema ativo
  const currentTheme = localStorage.getItem('pc_theme') || 'dark';
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
  });

  // Cor de acento salva
  const savedAccent = localStorage.getItem('pc_accent');
  if (savedAccent) document.getElementById('accent-input').value = savedAccent;

  // Clicar no tema
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('pc_theme', theme);
      document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Mudar cor de acento
  document.getElementById('accent-input').addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('pc_accent', color);
  });

  // Reset cor
  document.getElementById('accent-reset-btn').addEventListener('click', () => {
    document.documentElement.style.removeProperty('--accent');
    localStorage.removeItem('pc_accent');
    document.getElementById('accent-input').value = '#5865f2';
    showToast('Accent color reset', 'success');
  });
}

// ========================================
// 23. GIF SELECT MODAL (Avatar / Banner)
// ========================================

let gifSelectTarget = null;

function setupGifSelectModal() {
  document.getElementById('gif-select-close').addEventListener('click', closeGifSelectModal);
  document.getElementById('gif-select-modal').addEventListener('click', (e) => {
    if (e.target.id === 'gif-select-modal') closeGifSelectModal();
  });

  // Tabs
  document.querySelectorAll('[data-gif-select-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-gif-select-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadGifSelectTab(btn.dataset.gifSelectTab);
    });
  });

  // Search
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
  grid.innerHTML = '<p class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">Loading...</p>';
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
    if (!gifs.length) { grid.innerHTML = '<p class="muted small" style="grid-column:1/-1;text-align:center;padding:20px;">No GIFs found.</p>'; return; }
    gifs.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      img.alt = 'GIF';
      img.addEventListener('click', () => confirmGifSelect(url));
      grid.appendChild(img);
    });
  } catch (err) {
    grid.innerHTML = `<p class="form-error" style="grid-column:1/-1;text-align:center;padding:20px;">${escapeHtml(err.message)}</p>`;
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
    showToast('GIF applied!', 'success');
  } catch (err) {
    document.getElementById('gif-select-error').textContent = err.message;
  }
}

// ========================================
// 24. GLOBAL CLICK HANDLERS
// ========================================

function setupGlobalHandlers() {
  // Fechar emoji autocomplete ao clicar fora
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.emoji-ac:not(.hidden)').forEach(ac => {
      if (!ac.contains(e.target) && e.target !== ac.previousElementSibling) {
        ac.classList.add('hidden');
      }
    });
  });

  // Fechar lightbox com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lightbox = document.getElementById('image-lightbox');
      if (lightbox && !lightbox.classList.contains('hidden')) closeLightbox();
    }
  });
}

// ========================================
// 25. INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Auth
  setupAuthTabs();
  setupAuthForms();

  // Navigation
  setupNav();

  // Views
  setupFriendsView();
  setupUsersView();
  setupServersView();
  setupHome();

  // Chat
  setupChatForm();
  setupChatHeaderProfile();
  setupFileUpload();
  setupFileDragDrop();
  setupGifPicker();
  setupScrollListeners();
  setupEmojiAutocomplete('chat-input');
  setupEmojiAutocomplete('server-chat-input');

  // Profile Modal
  setupProfileModal();

  // Lightbox
  setupImageLightbox();

  // Settings
  setupSettingsNav();
  setupSettingsView();
  setupAppearance();
  setupNotificationPrefs();
  setupPreferences();

  // GIF Select Modal (avatar/banner)
  setupGifSelectModal();

  // Global
  setupGlobalHandlers();

  // Verificar sessão
  try {
    const { user } = await api('/me');
    currentUser = user;
    enterApp();
  } catch {
    showAuthScreen();
  }
}