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

// ================== EMOJI SYSTEM (Twemoji - estilo Discord) ==================

const EMOJI_MAP = {
  // Rostos
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
  // Aliases em português
  feliz:'😄', triste:'😢', risada:'😂', risos:'😂', sorriso:'😊', raiva:'😠',
  medo:'😨', sono:'😴', amor:'❤️', beijo:'😘', abraco:'🤗', obrigado:'🙏',
  ola:'👋', oi:'👋', tchau:'👋', sim:'✅', nao:'❌', fogo:'🔥', top:'👍',
  legal:'😎', festa:'🎉', parabens:'🎂', dinheiro:'💰', coroa:'👑',
  foguete:'🚀', estrela:'⭐', raio:'⚡', sol:'☀️', lua:'🌙', chuva:'🌧️',
  neve:'❄️', cafe:'☕', pizza:'🍕', bolo:'🍰', cerveja:'🍺', musica:'🎵',
  computador:'💻', celular:'📱', jogo:'🎮', coracao:'❤️',
  // Gestos
  thumbsup:'👍', thumbsdown:'👎', '+1':'👍', '-1':'👎', ok_hand:'👌',
  peace:'✌️', v:'✌️', wave:'👋', clap:'👏', pray:'🙏', handshake:'🤝',
  muscle:'💪', facepalm:'🤦', shrug:'🤷', point_up:'☝️', point_right:'👉',
  point_left:'👈', point_down:'👇', raised_hands:'🙌', call_me:'🤙', metal:'🤘',
  // Corações
  heart:'❤️', blue_heart:'💙', green_heart:'💚', yellow_heart:'💛',
  purple_heart:'💜', black_heart:'🖤', white_heart:'🤍', orange_heart:'🧡',
  broken_heart:'💔', two_hearts:'💕', sparkling_heart:'💖', gift_heart:'💝',
  heartbeat:'💓', revolving_hearts:'💞', heart_exclamation:'❣️',
  // Animais
  dog:'🐶', cat:'🐱', mouse:'🐭', fox:'🦊', bear:'🐻', panda:'🐼',
  koala:'🐨', tiger:'🐯', lion:'🦁', cow:'🐮', pig:'🐷', frog:'🐸',
  monkey:'🐵', unicorn:'🦄', bee:'🐝', butterfly:'🦋', turtle:'🐢',
  snake:'🐍', fish:'🐟', dolphin:'🐬', whale:'🐳', octopus:'🐙',
  crab:'🦀', penguin:'🐧', owl:'🦉', chicken:'🐔',
  // Comida
  apple:'🍎', banana:'🍌', grape:'🍇', watermelon:'🍉', strawberry:'🍓',
  cherry:'🍒', peach:'🍑', pineapple:'🍍', burger:'🍔', fries:'🍟',
  taco:'🌮', popcorn:'🍿', cookie:'🍪', donut:'🍩', chocolate:'🍫',
  candy:'🍬', cake:'🍰', birthday:'🎂', coffee:'☕', tea:'🍵', beer:'🍺',
  wine:'🍷', cocktail:'🍸', tada:'🎉',
  // Objetos e símbolos
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

const QUICK_REACT_EMOJIS = ['👍', '❤️', '😂'];

// Converte texto com unicode emoji para <img> Twemoji
function toTwemoji(text) {
  if (window.twemoji) return twemoji.parse(text, { size: '72x72' });
  return text; // fallback: emoji nativo
}

// Escapa HTML, converte :shortcodes: em emojis e renderiza como Twemoji
function parseEmojis(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/:([a-zA-Z0-9_+-]{1,25}):/g, (match, name) => {
    const emoji = EMOJI_MAP[name.toLowerCase()];
    return emoji ? emoji : match;
  });
  return toTwemoji(safe);
}

function positionEmojiPicker(picker, anchorBtn) {
  const rect = anchorBtn.getBoundingClientRect();
  const pickerWidth = 6 * 28 + 5 * 2 + 12;
  const pickerHeight = 3 * 28 + 2 * 2 + 12;
  let left = rect.right - pickerWidth;
  if (left < 8) left = 8;
  if (left + pickerWidth > window.innerWidth - 8) left = window.innerWidth - pickerWidth - 8;
  let top = rect.bottom + 6;
  if (top + pickerHeight > window.innerHeight - 8) top = rect.top - pickerHeight - 6;
  picker.style.left = left + 'px';
  picker.style.top = top + 'px';
}

function closeAllEmojiPickers(exceptWrapper) {
  document.querySelectorAll('.emoji-quick-picker.show').forEach(p => {
    if (!exceptWrapper || !exceptWrapper.contains(p)) p.classList.remove('show');
  });
}

// ================== AUTOCOMPLETE :emoji: ==================
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
      currentMatches = Object.entries(EMOJI_MAP)
        .filter(([name]) => name.startsWith(q) || name.includes(q))
        .slice(0, 8);
      if (currentMatches.length) {
        selIndex = 0;
        renderAc();
        ac.classList.remove('hidden');
        return;
      }
    }
    ac.classList.add('hidden');
  });

  input.addEventListener('keydown', (e) => {
    if (ac.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selIndex = Math.min(selIndex + 1, currentMatches.length - 1); renderAc(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); renderAc(); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMatch(currentMatches[selIndex][0]);
    }
    else if (e.key === 'Escape') ac.classList.add('hidden');
  });
}

let audioCtx = null;

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
  // Preferências de som (seção Notifications das Settings)
  if (type === 'login') {
    if (localStorage.getItem('pc_sound_login') === 'off') return;
  } else {
    if (localStorage.getItem('pc_sound_messages') === 'off') return;
  }
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

    let freqs = [];
    let dur = 0.2;

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
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        dmLoadingMore = false;
      }
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
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        serverLoadingMore = false;
      }
    }
  });
}

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
      currentUser = user; enterApp();
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
  loadFriends().then(renderHomeExtras); 
  loadFriendRequests(); 
  loadServers().then(renderHomeExtras);
  setupStatus();
  playSound('login');
  switchView('home');
}

function setupGifPicker() {
  const openBtn = document.getElementById('open-gif-btn');
  const picker = document.getElementById('gif-picker');
  const searchInput = document.getElementById('gif-search-input');
  const grid = document.getElementById('gif-grid');
  if (!openBtn || !picker || !grid) return;

  let gifTab = 'search';
  let searchTimeout;

  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasHidden = picker.classList.contains('hidden');
    // fecha outros pickers
    document.querySelectorAll('.emoji-ac:not(.hidden)').forEach(ac => ac.classList.add('hidden'));
    closeAllEmojiPickers(null);
    picker.classList.toggle('hidden');
    if (wasHidden) {
      searchInput.value = '';
      searchInput.focus();
      loadGifs();
    }
  });

  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && e.target !== openBtn && !openBtn.contains(e.target)) {
      picker.classList.add('hidden');
    }
  });

  picker.querySelectorAll('.gif-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.gif-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gifTab = btn.dataset.gifTab;
      loadGifs();
    });
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadGifs, 400);
  });

  async function loadGifs() {
    grid.innerHTML = '<p class="muted small" style="grid-column:1/-1;text-align:center;padding:24px 0;">Loading...</p>';
    try {
      let gifs = [];
      if (gifTab === 'search') {
        const q = searchInput.value.trim() || 'hello';
        const res = await api('/gifs/search?q=' + encodeURIComponent(q));
        gifs = res.gifs || [];
      } else {
        const res = await api('/gifs/favorites');
        gifs = res.gifs || [];
      }
      grid.innerHTML = '';
      if (!gifs.length) {
        grid.innerHTML = '<p class="muted small" style="grid-column:1/-1;text-align:center;padding:24px 0;">Nenhum GIF encontrado.</p>';
        return;
      }
      gifs.forEach(url => {
        const wrap = document.createElement('div');
        wrap.className = 'gif-item';
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'GIF';
        img.loading = 'lazy';
        img.addEventListener('click', () => sendGif(url));
        wrap.appendChild(img);
        grid.appendChild(wrap);
      });
    } catch (err) {
      grid.innerHTML = '<p class="form-error" style="grid-column:1/-1;text-align:center;padding:24px 0;">' + escapeHtml(err.message) + '</p>';
    }
  }

  async function sendGif(url) {
    if (!activeFriend) { showToast('Selecione um amigo primeiro.', 'error'); return; }
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: activeFriend.id, content: 'img:' + url })
      });
      picker.classList.add('hidden');
      playSound('send');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

function connectSocket() {
  socket = io();
  
    socket.on('new_message', function (message) {
    var isSender = message.sender_id === currentUser.id;
    var friendId = isSender ? message.receiver_id : message.sender_id;
    var friend = cachedFriends.find(function (f) { return f.id === friendId; });
    var isActiveChat = activeFriend && (message.sender_id === activeFriend.id || message.receiver_id === activeFriend.id);

    // Preview para lista de amigos
    var preview;
    var c = message.content || '';
    if (c.startsWith('img:') && c.substring(4).startsWith('http')) preview = '🖼️ Image';
    else if (c.startsWith('vid:') && c.substring(4).startsWith('http')) preview = '🎬 Video';
    else if (c.startsWith('file:') && c.substring(5).startsWith('http')) {
      var parts = c.substring(5).split('|');
      preview = '📎 ' + (parts[1] || 'File');
    } else {
      preview = c;
    }

    if (isActiveChat) {
      appendMessage(message);
      if (!isSender) playSound('receive');
      if (friend) friend.unread_count = 0;
    } else {
      if (!isSender) {
        playSound('receive');
        if (localStorage.getItem('pc_notify_popup') !== 'off') {
          showNotification(friend ? friend.display_name : 'New Message', preview, avatarOrDefault(friend ? friend.avatar : null));
        }
        if (friend) friend.unread_count = (friend.unread_count || 0) + 1;
      }
    }
    if (friend) {
      friend.last_message = preview;
      friend.last_message_at = message.created_at;
    }
    updateUnreadBadges();
    renderHomeExtras();
  });

  socket.on('presence', ({ userId, online }) => {
    if (online) onlineFriendIds.add(userId); else onlineFriendIds.delete(userId);
    updateOnlineIndicators();
    renderHomeExtras();
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
      badge.onclick = async () => {
        try { await api(`/messages/${data.messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: data.emoji }) }); } catch(e) {}
      };
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
      const newCount = parseInt(countSpan.textContent) - 1;
      if (newCount <= 0) badge.remove();
      else countSpan.textContent = newCount;
      if (data.userId === currentUser.id) badge.classList.remove('mine');
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

function renderHomeExtras() {
  updateHomeHeader();

  const statsRow = document.getElementById('home-stats-row');
  if (statsRow) {
    const onlineCount = cachedFriends.filter(f => onlineFriendIds.has(f.id)).length;
    const unreadTotal = cachedFriends.reduce((sum, f) => sum + (f.unread_count || 0), 0);
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
    const status = currentUser.status || 'online';
    const labels = { online: 'Online', away: 'Away', busy: 'Do Not Disturb', invisible: 'Invisible' };
    pill.innerHTML = `<span class="status-dot ${status}"></span>${labels[status] || 'Online'}`;
  }

  // Amigos online
  const onlineList = document.getElementById('online-friends-list');
  const onlineCountEl = document.getElementById('online-friends-count');
  if (onlineList) {
    const onlineFriends = cachedFriends.filter(f => onlineFriendIds.has(f.id));
    if (onlineCountEl) onlineCountEl.textContent = onlineFriends.length;
    onlineList.innerHTML = '';
    if (onlineFriends.length === 0) {
      onlineList.innerHTML = '<li class="widget-empty">No friends online right now</li>';
    } else {
      onlineFriends.slice(0, 8).forEach(f => {
        const li = document.createElement('li');
        li.className = 'widget-item';
        li.innerHTML = `<img class="avatar" src="${avatarOrDefault(f.avatar)}" /><span class="online-dot-sm online"></span><span class="widget-item-name">${escapeHtml(f.display_name)}</span>`;
        li.addEventListener('click', () => { switchView('chat'); openChat(f); });
        onlineList.appendChild(li);
      });
    }
  }

  // Conversas recentes
  const activityList = document.getElementById('recent-activity-list');
  if (activityList) {
    const withMessages = cachedFriends.filter(f => f.last_message_at).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    activityList.innerHTML = '';
    if (withMessages.length === 0) {
      activityList.innerHTML = '<li class="widget-empty">No recent conversations yet</li>';
    } else {
      withMessages.slice(0, 6).forEach(f => {
        const li = document.createElement('li');
        li.className = 'widget-item';
        li.innerHTML = `<img class="avatar" src="${avatarOrDefault(f.avatar)}" /><span class="widget-item-name">${escapeHtml(f.display_name)}</span><span class="widget-item-sub">${escapeHtml((f.last_message || '').substring(0, 18))}</span>`;
        li.addEventListener('click', () => { switchView('chat'); openChat(f); });
        activityList.appendChild(li);
      });
    }
  }

  // ✨ NOVO: widget "Your Servers"
  const serversList = document.getElementById('home-servers-list');
  const serversCount = document.getElementById('home-servers-count');
  if (serversList) {
    if (serversCount) serversCount.textContent = cachedServers.length;
    serversList.innerHTML = '';
    if (cachedServers.length === 0) {
      serversList.innerHTML = '<li class="widget-empty">Create or join a server to see it here</li>';
    } else {
      cachedServers.slice(0, 6).forEach(s => {
        const li = document.createElement('li');
        li.className = 'widget-item';
        const initial = (s.name || 'S').charAt(0).toUpperCase();
        const icon = s.icon
          ? `<img class="avatar" src="${escapeHtml(s.icon)}" />`
          : `<span class="server-mini-badge">${initial}</span>`;
        li.innerHTML = `${icon}<span class="widget-item-name">${escapeHtml(s.name || 'Server')}</span><span class="widget-item-sub">Open</span>`;
        li.addEventListener('click', () => switchView('servers'));
        serversList.appendChild(li);
      });
    }
  }
}

function updateHomeHeader() {
  const greetingEl = document.getElementById('home-greeting');
  const nameEl = document.getElementById('home-username-big');
  const dateEl = document.getElementById('home-date');

  if (greetingEl) {
    const h = new Date().getHours();
    let g = 'Good night';
    if (h >= 5 && h < 12) g = 'Good morning';
    else if (h < 18) g = 'Good afternoon';
    else if (h < 22) g = 'Good evening';
    greetingEl.textContent = g + ',';
  }
  if (nameEl && currentUser) nameEl.textContent = currentUser.display_name;
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}

// ===== Settings em seções (estilo Discord) =====
function setupSettingsNav() {
  const btns = document.querySelectorAll('.settings-nav-btn[data-section]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.section;
      btns.forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.settings-section').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById('settings-section-' + s);
      if (target) target.classList.remove('hidden');
    });
  });

  const goProfile = document.getElementById('go-profile-btn');
  if (goProfile) {
    goProfile.addEventListener('click', () => {
      document.querySelector('.settings-nav-btn[data-section="profile"]')?.click();
    });
  }
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
  if (bn) {
    bn.style.backgroundImage = currentUser.banner
      ? `url('${currentUser.banner}')`
      : 'linear-gradient(135deg, var(--accent), var(--brand-to))';
  }
}

function setupPreferences() {
  const prefs = [
    { id: 'pref-reduced-motion', key: 'pc_reduced_motion', className: 'reduced-motion' },
    { id: 'pref-compact-mode', key: 'pc_compact_mode', className: 'compact-mode' }
  ];
  prefs.forEach(({ id, key, className }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const enabled = localStorage.getItem(key) === 'on';
    el.checked = enabled;
    document.body.classList.toggle(className, enabled);
    el.addEventListener('change', () => {
      localStorage.setItem(key, el.checked ? 'on' : 'off');
      document.body.classList.toggle(className, el.checked);
    });
  });
}

function setupNotificationPrefs() {
  const toggles = [
    { id: 'pref-msg-sound', key: 'pc_sound_messages' },
    { id: 'pref-login-sound', key: 'pc_sound_login' },
    { id: 'pref-notify-popup', key: 'pc_notify_popup' }
  ];
  toggles.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = localStorage.getItem(key) !== 'off';
    el.addEventListener('change', () => {
      localStorage.setItem(key, el.checked ? 'on' : 'off');
    });
  });
}

// Clicar na pfp/nome do header da DM abre o perfil
function setupChatHeaderProfile() {
  const av = document.getElementById('chat-header-avatar');
  const nm = document.getElementById('chat-header-name');
  [av, nm].forEach(el => {
    if (!el) return;
    el.addEventListener('click', () => {
      if (activeFriend) openProfileModal(activeFriend.id, 'friend');
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
        renderHomeExtras();
      } catch (err) { alert(err.message); }
    });
  });
}

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
  else { show('view-home'); renderHomeExtras(); }
}

function renderProfile() {
  document.getElementById('profile-avatar').src = avatarOrDefault(currentUser.avatar);
  document.getElementById('profile-display-name').textContent = currentUser.display_name;
  document.getElementById('profile-username').textContent = '@' + currentUser.username;
  document.getElementById('profile-serial').textContent = currentUser.serial_id;
  // Bio agora aceita :emojis:
  document.getElementById('profile-bio').innerHTML = parseEmojis(currentUser.bio || 'No bio provided.');

  const bannerEl = document.getElementById('profile-banner-el');
  if (currentUser.banner) {
    bannerEl.style.backgroundImage = `url('${currentUser.banner}')`;
  } else {
    bannerEl.style.backgroundImage = 'linear-gradient(135deg, var(--accent), var(--brand-to))';
  }

  const homeUserEl = document.getElementById('home-username');
  if (homeUserEl) homeUserEl.textContent = currentUser.display_name;

  fillAccountCard();
  renderHomeExtras();
}

function fillSettingsForm() {
  document.getElementById('settings-display-name').value = currentUser.display_name || '';
  document.getElementById('settings-bio').value = currentUser.bio || '';
  document.getElementById('avatar-preview').src = avatarOrDefault(currentUser.avatar);
  const bp = document.getElementById('banner-preview');
  if (bp) {
    bp.style.backgroundImage = currentUser.banner
      ? `url('${currentUser.banner}')`
      : 'linear-gradient(135deg, var(--accent), var(--brand-to))';
  }
  fillAccountCard();
}

async function init() {
  setupAuthTabs();
  setupAuthForms();
  setupNav();
  setupFriendsView();
  setupUsersView();
  setupSettingsView();
  setupSettingsNav();          // ✨ novo
  setupNotificationPrefs();    // ✨ novo
  setupAppearance();
  setupChatForm();
  setupProfileModal();
  setupGifSelectModal();
  setupServersView();
  setupHome();
  setupScrollListeners();
  setupChatHeaderProfile();    // ✨ novo
  setupEmojiAutocomplete('chat-input');        // ✨ novo
  setupEmojiAutocomplete('server-chat-input'); // ✨ novo
  setupNotificationPrefs();
  setupPreferences();
  setupChatForm();
  setupFileUpload();
  setupFileDragDrop();
  setupImageLightbox();
  setupGifPicker();  

  // Fecha pickers/autocomplete ao clicar fora
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.emoji-ac:not(.hidden)').forEach(ac => {
      if (!ac.contains(e.target)) ac.classList.add('hidden');
    });
  });

  try {
    const { user } = await api('/me');
    currentUser = user;
    enterApp();
  } catch { showAuthScreen(); }
}

function setupFriendsView() {
  const form = document.getElementById('add-friend-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('friend-serial-input');
      const errorEl = document.getElementById('add-friend-error');
      const btn = document.getElementById('send-friend-request-btn');
      
      if (!input.value.trim()) return;
      
      btn.textContent = 'Sending...';
      btn.disabled = true;
      errorEl.textContent = '';

      try {
        await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: input.value.trim() }) });
        input.value = ''; 
        errorEl.style.color = 'var(--online)'; 
        errorEl.textContent = 'Request sent!';
        loadFriendRequests();
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
        loadFriendRequests(); loadFriends().then(renderHomeExtras); 
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
    const previous = new Map(cachedFriends.map(f => [f.id, f]));
    friends.forEach(f => {
      const prev = previous.get(f.id);
      if (prev) { f.last_message = prev.last_message; f.last_message_at = prev.last_message_at; }
    });
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
      li.querySelector('.remove-btn').addEventListener('click', async () => { await api('/friends/' + friend.id, { method: 'DELETE' }); loadFriends().then(renderHomeExtras); });
      list.appendChild(li);
    });
    updateUnreadBadges();
  } catch (err) {}
}

function setupUsersView() {
  const input = document.getElementById('user-search-input');
  const btn = document.getElementById('user-search-btn');
  const resultEl = document.getElementById('user-search-result');
  if (!input || !btn || !resultEl) return;

  async function doSearch() {
    // Normaliza: aceita "#000000001", "000000001" e remove espaços
    const serial = input.value.trim().replace(/^#+/, '').replace(/\s+/g, '');
    if (!serial) {
      resultEl.innerHTML = '<p class="form-error">Enter a Serial ID to search.</p>';
      input.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Searching...';
    resultEl.innerHTML = '<p class="muted small">Searching...</p>';

    try {
      const { user } = await api('/users/search?serial_id=' + encodeURIComponent(serial));

      if (!user) {
        resultEl.innerHTML = '<p class="form-error">User not found.</p>';
        return;
      }

      if (currentUser && user.id === currentUser.id) {
        resultEl.innerHTML = '<p class="muted small">This is you!</p>';
        return;
      }

      const isFriend = cachedFriends.some(f => f.id === user.id);
      const requestSent = cachedOutgoing.some(r => r.id === user.id);
      const relation = isFriend ? 'friend' : 'stranger';
      const btnLabel = isFriend ? '✔ Friends' : requestSent ? '⏳ Sent' : '➕';

      resultEl.innerHTML = `<div class="list-item"><div class="clickable"><img class="avatar" src="${avatarOrDefault(user.avatar)}" /><div class="info"><div class="name">${escapeHtml(user.display_name)}</div><div class="muted small">${escapeHtml(user.serial_id)}</div></div></div><div class="actions"><button id="add-from-search-btn">${btnLabel}</button></div></div>`;
      resultEl.querySelector('.clickable').addEventListener('click', () => openProfileModal(user.id, relation));

      const addBtn = document.getElementById('add-from-search-btn');
      if (isFriend || requestSent) {
        addBtn.disabled = true;
      } else {
        addBtn.addEventListener('click', async () => {
          addBtn.disabled = true;
          try {
            await api('/friends/request', { method: 'POST', body: JSON.stringify({ serial_id: user.serial_id }) });
            addBtn.textContent = '⏳ Sent';
            loadFriendRequests();
          } catch (err) {
            addBtn.disabled = false;
            showToast(err.message, 'error');
          }
        });
      }
    } catch (err) {
      resultEl.innerHTML = `<p class="form-error">${escapeHtml(err.message)}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Search';
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
  });
}

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
  document.getElementById('avatar-gif-btn').addEventListener('click', () => openGifSelectModal('avatar'));
document.getElementById('banner-gif-btn').addEventListener('click', () => openGifSelectModal('banner'));

document.getElementById('remove-avatar-btn').addEventListener('click', async () => {
  try {
    const { user } = await api('/upload/avatar', { method: 'DELETE' });
    currentUser = user;
    renderProfile();
    fillSettingsForm();
  } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('remove-banner-btn').addEventListener('click', async () => {
  try {
    const { user } = await api('/upload/banner', { method: 'DELETE' });
    currentUser = user;
    renderProfile();
    fillSettingsForm();
  } catch (err) { showToast(err.message, 'error'); }
});
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

// ================== MEDIA & FILE SYSTEM ==================

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileExtension(filename) {
  if (!filename) return '?';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : '?';
}

function getFileColor(type, ext) {
  if (type && type.startsWith('image/')) return '#2ecc71';
  if (type && type.startsWith('video/')) return '#9b59b6';
  if (type && type.startsWith('audio/')) return '#e67e22';
  if (['PDF'].includes(ext)) return '#e74c3c';
  if (['TXT','MD','LOG','CFG','INI','JSON','XML','YML','YAML','TOML','ENV'].includes(ext)) return '#95a5a6';
  if (['JS','TS','PY','RB','LUA','RS','GO','JAVA','CPP','C','CS','PHP','HTML','CSS','SCSS'].includes(ext)) return '#f1c40f';
  if (['ZIP','RAR','7Z','TAR','GZ','BZ2'].includes(ext)) return '#e67e22';
  if (['RBXM','RBXL','RBXMX','RBXLX'].includes(ext)) return '#5865f2';
  if (['DOC','DOCX','ODT','RTF'].includes(ext)) return '#3498db';
  if (['XLS','XLSX','CSV','ODS'].includes(ext)) return '#27ae60';
  if (['PPT','PPTX','ODP'].includes(ext)) return '#e74c3c';
  if (['MP3','WAV','OGG','FLAC','AAC','WMA','M4A'].includes(ext)) return '#e67e22';
  if (['MP4','WEBM','MKV','AVI','MOV','WMV','FLV'].includes(ext)) return '#9b59b6';
  return '#95a5a6';
}

function renderFileAttachment(url, name, type, size) {
  const ext = getFileExtension(name);
  const color = getFileColor(type, ext);
  const sizeStr = formatFileSize(size);
  return `<a href="${escapeHtml(url)}" download="${escapeHtml(name)}" target="_blank" rel="noopener" class="file-attachment" onclick="event.stopPropagation()">
    <div class="file-attachment-icon" style="background:${color}">${escapeHtml(ext)}</div>
    <div class="file-attachment-info">
      <div class="file-attachment-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      <div class="file-attachment-size">${sizeStr}</div>
    </div>
    <div class="file-attachment-download">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </div>
  </a>`;
}

function renderReplyPreview(content) {
  if (!content) return '';
  if (content.startsWith('img:') && content.substring(4).startsWith('http')) return '🖼️ Image';
  if (content.startsWith('vid:') && content.substring(4).startsWith('http')) return '🎬 Video';
  if (content.startsWith('file:') && content.substring(5).startsWith('http')) {
    const parts = content.substring(5).split('|');
    return '📎 ' + (parts[1] || 'File');
  }
  return escapeHtml((content || '').substring(0, 80));
}

function renderMessageContent(content) {
  if (!content) return '';

  // Imagem (screenshot, foto, GIF)
  if (content.startsWith('img:') && content.substring(4).startsWith('http')) {
    const url = content.substring(4);
    return `<div class="msg-image-wrap"><img src="${escapeHtml(url)}" class="msg-image" onclick="openLightbox(this.src)" alt="Image" loading="lazy" /></div>`;
  }

  // Vídeo / Gravação
  if (content.startsWith('vid:') && content.substring(4).startsWith('http')) {
    const url = content.substring(4);
    return `<video src="${escapeHtml(url)}" class="msg-video" controls preload="metadata" playsinline></video>`;
  }

  // Arquivo (txt, rbxm, zip, etc.)
  if (content.startsWith('file:') && content.substring(5).startsWith('http')) {
    const parts = content.substring(5).split('|');
    const url = parts[0];
    const name = parts[1] || 'download';
    const type = parts[2] || '';
    const size = parseInt(parts[3]) || 0;
    return renderFileAttachment(url, name, type, size);
  }

  // Texto normal com suporte a emojis
  return parseEmojis(content);
}

// ================== LIGHTBOX ==================

let lightboxScale = 1;
let lightboxTx = 0, lightboxTy = 0;
let lightboxDragging = false;
let lightboxStartX = 0, lightboxStartY = 0;

function openLightbox(url) {
  const lb = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb || !img || !url) return;

  lightboxScale = 1;
  lightboxTx = 0;
  lightboxTy = 0;
  img.style.transform = 'scale(1)';
  img.src = url;
  lb.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb) return;
  lb.classList.add('hidden');
  if (img) { img.src = ''; img.style.transform = 'scale(1)'; }
  document.body.style.overflow = '';
  lightboxScale = 1;
  lightboxTx = 0;
  lightboxTy = 0;
}

function setupImageLightbox() {
  const lb = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const dlBtn = document.getElementById('lightbox-download');
  if (!lb || !img) return;

  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.classList.contains('hidden')) closeLightbox(); });

  dlBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!img.src) return;
    const a = document.createElement('a');
    a.href = img.src;
    a.download = 'synto-image.png';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Zoom com scroll
  img.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    lightboxScale = Math.max(0.25, Math.min(8, lightboxScale + delta));
    if (lightboxScale <= 1) { lightboxTx = 0; lightboxTy = 0; }
    img.style.transform = `scale(${lightboxScale}) translate(${lightboxTx}px, ${lightboxTy}px)`;
    img.style.cursor = lightboxScale > 1 ? 'grab' : 'default';
  }, { passive: false });

  // Double-click reset
  img.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    lightboxScale = 1; lightboxTx = 0; lightboxTy = 0;
    img.style.transform = 'scale(1)';
    img.style.cursor = 'default';
  });

  // Drag para pan quando zoomed
  img.addEventListener('mousedown', (e) => {
    if (lightboxScale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    lightboxDragging = true;
    lightboxStartX = e.clientX - lightboxTx;
    lightboxStartY = e.clientY - lightboxTy;
    img.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!lightboxDragging) return;
    lightboxTx = e.clientX - lightboxStartX;
    lightboxTy = e.clientY - lightboxStartY;
    img.style.transform = `scale(${lightboxScale}) translate(${lightboxTx}px, ${lightboxTy}px)`;
  });

  document.addEventListener('mouseup', () => {
    if (lightboxDragging) {
      lightboxDragging = false;
      img.style.cursor = lightboxScale > 1 ? 'grab' : 'default';
    }
  });

  // Touch support
  let lastTouchDist = 0;
  img.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });

  img.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = (dist - lastTouchDist) * 0.01;
      lightboxScale = Math.max(0.25, Math.min(8, lightboxScale + delta));
      lastTouchDist = dist;
      img.style.transform = `scale(${lightboxScale}) translate(${lightboxTx}px, ${lightboxTy}px)`;
    } else if (e.touches.length === 1 && lightboxScale > 1) {
      e.preventDefault();
      lightboxTx += e.touches[0].clientX - (lightboxTx + e.touches[0].clientX); // simplified pan
    }
  }, { passive: false });
}

// ================== FILE UPLOAD ==================

function setupFileUpload() {
  // DM
  const openBtn = document.getElementById('open-file-btn');
  const fileInput = document.getElementById('file-input-dm');
  if (openBtn && fileInput) {
    openBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      for (const f of files) await uploadAndSendFile(f, 'dm');
      fileInput.value = '';
    });
  }

  // Server
  const openBtnS = document.getElementById('open-file-btn-server');
  const fileInputS = document.getElementById('file-input-server');
  if (openBtnS && fileInputS) {
    openBtnS.addEventListener('click', () => fileInputS.click());
    fileInputS.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      for (const f of files) await uploadAndSendFile(f, 'server');
      fileInputS.value = '';
    });
  }
}

async function uploadAndSendFile(file, context) {
  const isDm = context === 'dm';
  const bar = document.getElementById(isDm ? 'file-upload-bar' : 'file-upload-bar-server');
  const nameEl = document.getElementById(isDm ? 'file-upload-name' : 'file-upload-name-server');

  if (bar) bar.classList.remove('hidden');
  if (nameEl) nameEl.textContent = file.name;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload/message-file', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    const { url, name, type, size } = data;

    // Monta o conteúdo com prefixo
    let content;
    if (type && type.startsWith('image/')) {
      content = `img:${url}`;
    } else if (type && type.startsWith('video/')) {
      content = `vid:${url}|${name}|${size}`;
    } else {
      content = `file:${url}|${name}|${type}|${size}`;
    }

    if (isDm && activeFriend) {
      await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content }) });
    } else if (!isDm && activeServer && activeChannel) {
      await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
    } else {
      throw new Error('Nenhum chat ativo');
    }

    playSound('send');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (bar) bar.classList.add('hidden');
  }
}

function setupFileDragDrop() {
  const areas = [
    { el: document.getElementById('chat-messages'), ctx: 'dm' },
    { el: document.getElementById('server-chat-messages'), ctx: 'server' }
  ];

  areas.forEach(({ el, ctx }) => {
    if (!el) return;

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      el.classList.add('drag-over');
    });

    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      if (ctx === 'dm' && !activeFriend) return;
      if (ctx === 'server' && (!activeServer || !activeChannel)) return;
      for (const f of files) await uploadAndSendFile(f, ctx);
    });
  });
}

// ================== MESSAGE RENDERING (DM) ==================

function appendMessage(msg, prepend) {
  var container = document.getElementById('chat-messages');
  if (!container) return;

  var isMine = msg.sender_id === currentUser.id;
  var isDeleted = !!msg.deleted_at;
  var content = msg.content || '';

  // Detecta se é anexo
  var isAttachment = false;
  if (!isDeleted && content.length > 4) {
    var prefix = content.substring(0, content.indexOf(':'));
    var afterPrefix = content.substring(content.indexOf(':') + 1);
    if (afterPrefix.startsWith('http') && ['img', 'vid', 'file'].indexOf(prefix) !== -1) {
      isAttachment = true;
    }
  }

  var wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ' + (isMine ? 'mine' : 'theirs');
  wrapper.dataset.messageId = msg.id;
  wrapper.dataset.content = content;

  // Reply quote
  var replyHtml = '';
  if (msg.reply_to && msg.reply_to.content !== undefined) {
    var rpName = msg.reply_to.sender_id === currentUser.id
      ? (currentUser.display_name || 'You')
      : (activeFriend ? activeFriend.display_name : 'Unknown');
    replyHtml = '<div class="reply-quote" data-reply-to="' + msg.reply_to.id + '">'
      + '<strong>' + escapeHtml(rpName) + '</strong><br/>'
      + renderReplyPreview(msg.reply_to.content)
      + '</div>';
  }

  // Se for anexo, a bolha só tem o reply (se houver). O anexo fica fora.
  var bubbleInner = '';
  var attachmentHtml = '';

  if (isDeleted) {
    bubbleInner = '<span class="deleted-msg">Mensagem apagada</span>';
  } else if (isAttachment) {
    bubbleInner = replyHtml;
    attachmentHtml = renderMessageContent(content);
  } else {
    bubbleInner = replyHtml + parseEmojis(content);
  }

  var editedTag = (msg.edited_at && !isDeleted) ? ' <span class="muted small">(edited)</span>' : '';

  // Se a bolha fica vazia (só anexo sem reply), não cria a bolha
  var bubbleHtml = bubbleInner.trim()
    ? '<div class="message-bubble">' + bubbleInner + editedTag + '</div>'
    : '';

  // Edited tag fora da bolha se só tiver anexo
  if (isAttachment && msg.edited_at && !isDeleted) {
    attachmentHtml += ' <span class="muted small" style="display:block;margin-top:2px;">(edited)</span>';
  }

  // Ações
  var actionsHtml = '';
  if (!isDeleted) {
    actionsHtml = '<div class="message-actions">';
    actionsHtml += '<button class="reply-btn" title="Reply" data-msg-id="' + msg.id + '">↩</button>';
    if (isMine) {
      actionsHtml += '<button class="edit-btn" title="Edit" data-msg-id="' + msg.id + '">✏</button>';
      actionsHtml += '<button class="delete-btn" title="Delete" data-msg-id="' + msg.id + '">🗑</button>';
    }
    QUICK_REACT_EMOJIS.forEach(function (em) {
      actionsHtml += '<button class="quick-react-btn" data-msg-id="' + msg.id + '" data-emoji="' + em + '">' + toTwemoji(em) + '</button>';
    });
    actionsHtml += '</div>';
  }

  wrapper.innerHTML = bubbleHtml + attachmentHtml
    + '<div class="reactions-container"></div>'
    + actionsHtml;

  if (prepend) {
    container.prepend(wrapper);
  } else {
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  }

  // --- Bind eventos ---

  // Reply quote scroll
  var quote = wrapper.querySelector('.reply-quote');
  if (quote) {
    quote.addEventListener('click', function () {
      var tid = quote.dataset.replyTo;
      var target = container.querySelector('[data-message-id="' + tid + '"]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var bub = target.querySelector('.message-bubble');
        if (bub) {
          bub.style.transition = 'background .3s ease';
          bub.style.background = 'rgba(88,101,242,0.25)';
          setTimeout(function () { bub.style.background = ''; }, 1200);
        }
      }
    });
  }

  // Reply button
  var replyBtn = wrapper.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', function () {
      replyDM = msg;
      var bar = document.getElementById('reply-context-dm');
      document.getElementById('reply-to-name-dm').textContent = isMine ? 'You' : (activeFriend ? activeFriend.display_name : '');
      document.getElementById('reply-to-content-dm').textContent = renderReplyPreview(content);
      bar.classList.remove('hidden');
      document.getElementById('chat-input').focus();
    });
  }

  // Edit button
  var editBtn = wrapper.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', function () {
      if (isAttachment) { showToast('Não é possível editar anexos.', 'error'); return; }
      var input = document.getElementById('chat-input');
      input.value = content;
      input.focus();
      input.dataset.editing = msg.id;
    });
  }

  // Delete button
  var delBtn = wrapper.querySelector('.delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', function () {
      showConfirm({
        title: 'Delete Message',
        content: 'Are you sure? This cannot be undone.',
        confirmText: 'Delete',
        onConfirm: function () {
          api('/messages/' + msg.id, { method: 'DELETE' }).catch(function (e) { showToast(e.message, 'error'); });
        }
      });
    });
  }

  // Quick react
  wrapper.querySelectorAll('.quick-react-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      api('/messages/' + msg.id + '/reactions', { method: 'POST', body: JSON.stringify({ emoji: btn.dataset.emoji }) }).catch(function () {});
    });
  });

  // Reações existentes
  if (msg.reactions && msg.reactions.length) {
    var rc = wrapper.querySelector('.reactions-container');
    msg.reactions.forEach(function (r) {
      var badge = document.createElement('div');
      badge.className = 'reaction-badge' + (r.user_id === currentUser.id ? ' mine' : '');
      badge.dataset.emoji = r.emoji;
      badge.innerHTML = toTwemoji(r.emoji) + ' <span>1</span>';
      badge.addEventListener('click', function () {
        api('/messages/' + msg.id + '/reactions', { method: 'POST', body: JSON.stringify({ emoji: r.emoji }) }).catch(function () {});
      });
      rc.appendChild(badge);
    });
  }
}

// ================== MESSAGE RENDERING (SERVER) ==================

function appendServerMessage(msg, prepend) {
  var container = document.getElementById('server-chat-messages');
  if (!container) return;

  var isMine = msg.sender_id === currentUser.id;
  var isDeleted = !!msg.deleted_at;
  var sender = msg.users || {};
  var content = msg.content || '';

  // Detecta anexo
  var isAttachment = false;
  if (!isDeleted && content.length > 4) {
    var prefix = content.substring(0, content.indexOf(':'));
    var afterPrefix = content.substring(content.indexOf(':') + 1);
    if (afterPrefix.startsWith('http') && ['img', 'vid', 'file'].indexOf(prefix) !== -1) {
      isAttachment = true;
    }
  }

  var row = document.createElement('div');
  row.className = 'server-message' + (isMine ? ' mine' : '');
  row.dataset.messageId = msg.id;
  row.dataset.content = content;

  var time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  var editedTag = (msg.edited_at && !isDeleted) ? ' <span class="muted small">(edited)</span>' : '';

  var contentHtml = '';
  if (isDeleted) {
    contentHtml = '<span class="deleted-msg">Mensagem apagada</span>';
  } else {
    contentHtml = renderMessageContent(content);
    if (isAttachment && msg.edited_at) {
      contentHtml += ' <span class="muted small" style="display:inline;margin-left:4px;">(edited)</span>';
    } else if (!isAttachment) {
      contentHtml += editedTag;
    }
  }

  var actionsHtml = '';
  if (!isDeleted) {
    actionsHtml = '<div class="message-actions">';
    actionsHtml += '<button class="reply-btn" title="Reply" data-msg-id="' + msg.id + '">↩</button>';
    QUICK_REACT_EMOJIS.forEach(function (em) {
      actionsHtml += '<button class="quick-react-btn" data-msg-id="' + msg.id + '" data-emoji="' + em + '">' + toTwemoji(em) + '</button>';
    });
    if (isMine) {
      actionsHtml += '<button class="delete-btn" title="Delete" data-msg-id="' + msg.id + '">🗑</button>';
    }
    actionsHtml += '</div>';
  }

  row.innerHTML = '<img class="avatar" src="' + avatarOrDefault(sender.avatar) + '" alt="" />'
    + '<div class="server-message-body">'
    + '<div class="server-message-meta"><strong>' + escapeHtml(sender.display_name || 'Unknown') + '</strong> <time>' + time + '</time></div>'
    + '<div class="server-message-content">' + contentHtml + '</div>'
    + '<div class="reactions-container"></div>'
    + actionsHtml
    + '</div>';

  if (prepend) {
    container.prepend(row);
  } else {
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // Reply
  var replyBtn = row.querySelector('.reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', function () {
      replyServer = msg;
      var bar = document.getElementById('reply-context-server');
      document.getElementById('reply-to-name-server').textContent = sender.display_name || 'Unknown';
      document.getElementById('reply-to-content-server').textContent = renderReplyPreview(content);
      bar.classList.remove('hidden');
      document.getElementById('server-chat-input').focus();
    });
  }

  // Delete
  var delBtn = row.querySelector('.delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', function () {
      if (!activeServer) return;
      showConfirm({
        title: 'Delete Message',
        content: 'Are you sure?',
        confirmText: 'Delete',
        onConfirm: function () {
          api('/servers/' + activeServer.id + '/messages/' + msg.id, { method: 'DELETE' }).catch(function (e) { showToast(e.message, 'error'); });
        }
      });
    });
  }

  // Quick react
  row.querySelectorAll('.quick-react-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      api('/messages/' + msg.id + '/reactions', { method: 'POST', body: JSON.stringify({ emoji: btn.dataset.emoji }) }).catch(function () {});
    });
  });

  // Imagens no server chat também abrem lightbox
  row.querySelectorAll('.msg-image').forEach(function (img) {
    img.addEventListener('click', function () { openLightbox(img.src); });
  });
}

// ================== CHAT FORM (DM) — Substituir a existente ==================

function setupChatForm() {
  // DM form
  const dmForm = document.getElementById('chat-form');
  const dmInput = document.getElementById('chat-input');
  if (dmForm && dmInput) {
    dmForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = dmInput.value.trim();
      if (!text || !activeFriend) return;

      const editingId = dmInput.dataset.editing;
      dmInput.dataset.editing = '';
      dmInput.value = '';

      // Cancel reply after send
      document.getElementById('reply-context-dm').classList.add('hidden');
      const replyTo = replyDM?.id || null;
      replyDM = null;

      try {
        if (editingId) {
          const { message } = await api(`/messages/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify({ content: text })
          });
          // Atualiza a bolha localmente
          const el = document.querySelector(`[data-message-id="${editingId}"] .message-bubble`);
          if (el) {
            el.innerHTML = renderMessageContent(text) + ' <span class="muted small">(edited)</span>';
            document.querySelector(`[data-message-id="${editingId}"]`).dataset.content = text;
          }
        } else {
          await api('/messages', {
            method: 'POST',
            body: JSON.stringify({ receiver_id: activeFriend.id, content: text, reply_to: replyTo })
          });
          playSound('send');
        }
      } catch (err) {
        showToast(err.message, 'error');
        dmInput.value = text;
        if (editingId) dmInput.dataset.editing = editingId;
      }
    });
  }

  // Server form
  const sForm = document.getElementById('server-chat-form');
  const sInput = document.getElementById('server-chat-input');
  if (sForm && sInput) {
    sForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = sInput.value.trim();
      if (!text || !activeServer || !activeChannel) return;

      sInput.value = '';
      document.getElementById('reply-context-server').classList.add('hidden');
      const replyTo = replyServer?.id || null;
      replyServer = null;

      try {
        await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: text, reply_to: replyTo })
        });
        playSound('send');
      } catch (err) {
        showToast(err.message, 'error');
        sInput.value = text;
      }
    });
  }

  // Cancel reply buttons
  document.getElementById('cancel-reply-btn-dm')?.addEventListener('click', () => {
    replyDM = null;
    document.getElementById('reply-context-dm').classList.add('hidden');
  });

  document.getElementById('cancel-reply-btn-server')?.addEventListener('click', () => {
    replyServer = null;
    document.getElementById('reply-context-server').classList.add('hidden');
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
  switchView('chat');
  
  setTimeout(() => {
    document.getElementById('chat-empty').classList.add('hidden');
    document.getElementById('chat-active').classList.remove('hidden');
    document.getElementById('chat-header-avatar').src = avatarOrDefault(friend.avatar);
    document.getElementById('chat-header-name').textContent = friend.display_name;
    document.getElementById('chat-header-status').textContent = onlineFriendIds.has(friend.id) ? '● Online' : '● Offline';
    
    friend.unread_count = 0;
    updateUnreadBadges();
    
    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML = '<p class="muted small">Loading...</p>';
    
    api('/messages/' + friend.id).then(({ messages, has_more }) => {
      messagesEl.innerHTML = '';
      dmHasMore = has_more;
      messages.forEach(m => appendMessage(m, false));
    }).catch(err => {
      messagesEl.innerHTML = `<p class="form-error">${err.message}</p>`;
    });
  }, 50);
}

function appendMessage(message, prepend = false) {
  if (!activeFriend) return;
  const messagesEl = document.getElementById('chat-messages');

  let wrapper = messagesEl.querySelector(`[data-message-id="${message.id}"]`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + (message.sender_id === currentUser.id ? 'mine' : 'theirs');
    wrapper.dataset.messageId = message.id;
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
        bubble.innerHTML = `<img src="${url}" class="msg-gif lightbox-trigger" />`;
        wrapper.dataset.content = 'GIF';
    } else if (message.content.startsWith('file:')) {
        bubble.innerHTML = renderFileMessage(message.content);
        wrapper.dataset.content = 'File';
    } else {
        bubble.innerHTML = parseEmojis(message.content);
        wrapper.dataset.content = message.content;
    }
  wrapper.appendChild(bubble);

  if (!message.deleted_at) {
    // Picker de reação + barra de ações (reação JUNTO de reply/delete)
    wrapper.appendChild(buildMessageActions(message, 'dm', wrapper));

    // Reações: canto esquerdo inferior, várias simultâneas
    const reactionsContainer = document.createElement('div');
    reactionsContainer.className = 'reactions-container';
    if (message.reactions) renderReactions(reactionsContainer, message.reactions, message.id);
    wrapper.appendChild(reactionsContainer);
  }

  if (prepend) {
    messagesEl.prepend(wrapper);
  } else {
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

// Barra de ações: Reagir + Reply + Delete (mesmo lugar, como o Discord)
function buildMessageActions(message, type, wrapper) {
  const actions = document.createElement('div');
  actions.className = 'message-actions';

  // 3 reações rápidas — clicou, já reagiu
  QUICK_REACT_EMOJIS.forEach(emoji => {
    const reactBtn = document.createElement('button');
    reactBtn.className = 'quick-react-btn';
    reactBtn.innerHTML = toTwemoji(emoji);
    reactBtn.title = 'Reagir com ' + emoji;
    reactBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        await api(`/messages/${message.id}/reactions`, {
          method: 'POST',
          body: JSON.stringify({ emoji })
        });
      } catch (err) { showToast(err.message, 'error'); }
    };
    actions.appendChild(reactBtn);
  });

  // Reply
  const replyBtn = document.createElement('button');
  replyBtn.innerHTML = '↩';
  replyBtn.title = 'Reply';
  replyBtn.onclick = () => { if (type === 'dm') setReplyDM(message); else setReplyServer(message); };
  actions.appendChild(replyBtn);

  // Delete
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.innerHTML = '🗑';
  delBtn.title = 'Delete';
  delBtn.onclick = () => {
    showConfirm({
      title: 'Delete Message',
      content: 'Are you sure you want to delete this message?',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          if (type === 'dm') {
            await api(`/messages/${message.id}`, { method: 'DELETE' });
          } else {
            await api(`/servers/${activeServer.id}/channels/${activeChannel.id}/messages/${message.id}`, { method: 'DELETE' });
          }
        } catch(e) { showToast(e.message, 'error'); }
      }
    });
  };
  actions.appendChild(delBtn);

  return actions;
}

// Picker de reação com Twemoji
function buildEmojiPicker(message) {
  const picker = document.createElement('div');
  picker.className = 'emoji-quick-picker';
  QUICK_EMOJIS.forEach(em => {
    const span = document.createElement('span');
    span.innerHTML = toTwemoji(em);
    span.title = em;
    span.onclick = async (e) => {
      e.stopPropagation();
      picker.classList.remove('show');
      try {
        await api(`/messages/${message.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji: em }) });
      } catch(err) {}
    };
    picker.appendChild(span);
  });
  return picker;
}

function renderReactions(container, reactions, messageId) {
  container.innerHTML = '';
  Object.entries(reactions).forEach(([emoji, users]) => {
    if (!users || users.length === 0) return;
    const isMine = users.some(u => u.id === currentUser.id);
    const badge = document.createElement('div');
    badge.className = 'reaction-badge' + (isMine ? ' mine' : '');
    badge.dataset.emoji = emoji;
    badge.innerHTML = `${toTwemoji(emoji)} <span>${users.length}</span>`;
    badge.title = users.map(u => u.display_name || u.username).join(', ');
    badge.onclick = async () => {
      try {
        await api(`/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) });
      } catch(err) {}
    };
    container.appendChild(badge);
  });
}

let isSendingDM = false;
let isSendingServer = false;

function setupChatForm() {
  document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    if (!activeFriend || isSendingDM) return;
    
    const input = document.getElementById('chat-input');
    if (!input.value.trim()) return;
    
    isSendingDM = true;
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
      if (!err.message.includes('fast')) input.value = input.value;
    } finally {
      isSendingDM = false;
      if (btn) btn.disabled = false;
      input.focus();
    }
  });

  document.getElementById('cancel-reply-btn-dm').addEventListener('click', cancelReplyDM);
  document.getElementById('cancel-reply-btn-server').addEventListener('click', cancelReplyServer);

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
  if (!activeServer || !activeChannel || isSendingServer) return;
  
  const input = document.getElementById('server-chat-input');
  if (!input.value.trim()) return;
  
  isSendingServer = true;
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
    isSendingServer = false;
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

function formatFileSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + ' ' + units[i];
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
let isUploadingFile = false;

function formatFileSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + ' ' + units[i];
}

function renderFileMessage(raw) {
  let meta;
  try { meta = JSON.parse(raw.replace('file:', '')); } catch { return 'File unavailable'; }
  const type = meta.type || '';
  const safeUrl = escapeHtml(meta.url || '');
  const safeName = escapeHtml(meta.name || 'file');

  if (type.startsWith('image/')) {
    return `<img src="${safeUrl}" class="msg-gif lightbox-trigger" />`;
  }
  if (type.startsWith('video/')) {
    return `<video src="${safeUrl}" class="msg-video" controls></video>`;
  }

  const ext = (meta.name || '').split('.').pop().toUpperCase().slice(0, 4);
  return `<div class="msg-file-card" data-file-url="${safeUrl}" data-file-name="${safeName}">
    <span class="msg-file-icon">${ext || '?'}</span>
    <div class="msg-file-info">
      <div class="msg-file-name">${safeName}</div>
      <div class="msg-file-size">${formatFileSize(meta.size)}</div>
    </div>
    <span class="msg-file-download">⬇</span>
  </div>`;
}

async function downloadFile(url, name) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    showToast('Failed to download file', 'error');
  }
}

async function uploadAndSendFile(file) {
  if (!activeFriend || isUploadingFile) return;
  if (file.size > MAX_FILE_SIZE) {
    showToast('File is too large (max 25MB)', 'error');
    return;
  }

  isUploadingFile = true;
  const btn = document.getElementById('open-file-btn');
  const bar = document.getElementById('file-upload-bar');
  const nameEl = document.getElementById('file-upload-name');
  if (btn) btn.disabled = true;
  bar.classList.remove('hidden');
  nameEl.textContent = file.name || 'file';

  try {
    const formData = new FormData();
    formData.append('file', file);
    const meta = await api('/upload/message-file', { method: 'POST', body: formData });
    const content = 'file:' + JSON.stringify({ url: meta.url, name: meta.name, type: meta.type, size: meta.size });
    const { message } = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content, reply_to: replyDM?.id }) });
    appendMessage(message);
    playSound('send');
    cancelReplyDM();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isUploadingFile = false;
    if (btn) btn.disabled = false;
    bar.classList.add('hidden');
  }
}

function setupFileUpload() {
  const btn = document.getElementById('open-file-btn');
  const input = document.getElementById('file-input-dm');
  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    for (const file of files) {
      await uploadAndSendFile(file);
    }
    input.value = '';
  });

  document.getElementById('chat-input').addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const fileItem = items.find(it => it.kind === 'file');
    if (!fileItem) return;
    e.preventDefault();
    const file = fileItem.getAsFile();
    if (file) await uploadAndSendFile(file);
  });

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.msg-file-card');
    if (card) downloadFile(card.dataset.fileUrl, card.dataset.fileName);
  });
}

function setupFileDragDrop() {
  const dropZone = document.getElementById('chat-active');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      if (activeFriend) dropZone.classList.add('file-drop-active');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('file-drop-active');
    });
  });

  dropZone.addEventListener('drop', async (e) => {
    if (!activeFriend) return;
    const files = Array.from(e.dataTransfer?.files || []);
    for (const file of files) {
      await uploadAndSendFile(file);
    }
  });
}

function setupImageLightbox() {
  const backdrop = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  let zoomed = false;

  function openLightbox(src) {
    img.src = src;
    zoomed = false;
    img.classList.remove('zoomed');
    backdrop.classList.remove('hidden');
  }

  function closeLightbox() {
    backdrop.classList.add('hidden');
    img.src = '';
  }

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.lightbox-trigger');
    if (target) {
      e.preventDefault();
      openLightbox(target.src);
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeLightbox();
  });

  img.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomed = !zoomed;
    img.classList.toggle('zoomed', zoomed);
  });

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-download').addEventListener('click', () => downloadFile(img.src, 'image'));
  document.getElementById('lightbox-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(img.src);
      showToast('Link copied', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) closeLightbox();
  });
}

async function uploadAndSendFile(file) {
  if (!activeFriend) return;
  const bar = document.getElementById('file-upload-bar');
  const nameEl = document.getElementById('file-upload-name');
  bar.classList.remove('hidden');
  nameEl.textContent = file.name || 'arquivo';

  try {
    const formData = new FormData();
    formData.append('file', file);
    const meta = await api('/upload/message-file', { method: 'POST', body: formData });
    const content = 'file:' + JSON.stringify({ url: meta.url, name: meta.name, type: meta.type, size: meta.size });
    const { message } = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: activeFriend.id, content, reply_to: replyDM?.id }) });
    appendMessage(message);
    playSound('send');
    cancelReplyDM();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    bar.classList.add('hidden');
  }
}

function setupFileUpload() {
  const btn = document.getElementById('open-file-btn');
  const input = document.getElementById('file-input-dm');
  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    for (const file of files) {
      await uploadAndSendFile(file);
    }
    input.value = '';
  });

  document.getElementById('chat-input').addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const fileItem = items.find(it => it.kind === 'file');
    if (!fileItem) return;
    e.preventDefault();
    const file = fileItem.getAsFile();
    if (file) await uploadAndSendFile(file);
  });
}

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
    document.getElementById('modal-bio').innerHTML = parseEmojis(user.bio || 'No bio provided.');
    
    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    if (relation === 'friend') {
      const btn = document.createElement('button');
      btn.className = 'btn-danger';
      btn.textContent = 'Remove Friend';
      btn.addEventListener('click', async () => { await api('/friends/' + user.id, { method: 'DELETE' }); loadFriends().then(renderHomeExtras); closeProfileModal(); });
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
    input.value = ''; await loadServers().then(renderHomeExtras); openServerChat(server);
  } catch (error) { document.getElementById('server-error').textContent = error.message; }
}

async function joinServer(event) {
  event.preventDefault();
  const input = document.getElementById('server-invite-input');
  try {
    const { server } = await api('/servers/join', { method: 'POST', body: JSON.stringify({ invite_code: input.value.trim() }) });
    input.value = ''; await loadServers().then(renderHomeExtras); openServerChat(server);
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

function appendServerMessage(message, prepend = false) {
  const msgEl = document.getElementById('server-chat-messages');
  let div = msgEl.querySelector(`[data-message-id="${message.id}"]`);
  if (!div) {
    div = document.createElement('div');
    div.className = 'server-message' + (message.sender_id === currentUser.id ? ' mine' : '');
    div.dataset.messageId = message.id;
    if (prepend) msgEl.prepend(div);
    else msgEl.appendChild(div);
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
    contentEl.innerHTML = parseEmojis(message.content);
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
  
  if (prepend) {
    msgEl.prepend(div);
  } else {
    msgEl.appendChild(div);
    msgEl.scrollTop = msgEl.scrollHeight;
  }
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

async function renderServerSettings() {
  if (!activeServer) return;
  document.getElementById('server-edit-name').value = activeServer.name;
  document.getElementById('server-icon-preview').src = activeServer.icon_url || DEFAULT_AVATAR;
  
  try {
    const data = await api('/servers/' + activeServer.id + '/data');
    serverDataCache = data;
    
    const rolesList = document.getElementById('server-roles-list');
    rolesList.innerHTML = '';
    data.roles.forEach(role => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="info"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${role.color}; margin-right:8px;"></span>${escapeHtml(role.name)}</div>`;
      rolesList.appendChild(li);
    });

    const membersList = document.getElementById('server-members-list');
    membersList.innerHTML = '';
    data.members.forEach(m => {
      const userRoleIds = data.memberRoles.filter(mr => mr.user_id === m.user_id).map(mr => mr.role_id);
      const userRoles = data.roles.filter(r => userRoleIds.includes(r.id));
      
      const rolesHtml = userRoles.map(r => `
        <span class="role-badge" data-role-id="${r.id}" title="Click to remove role" style="cursor:pointer; border:1px solid ${r.color}; color:${r.color}; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px; display:inline-flex; align-items:center; gap:4px;">
          ${escapeHtml(r.name)} <span style="opacity:0.7; font-size:9px;">✖</span>
        </span>
      `).join('');
      
      const li = document.createElement('li');
      li.className = 'list-item';
      li.style.flexWrap = 'wrap';
      li.innerHTML = `<img class="avatar" src="${avatarOrDefault(m.users.avatar)}" style="width: 30px; height: 30px;" /><div class="info" style="flex:1;"><div class="name">${escapeHtml(m.users.display_name)}</div><div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">${rolesHtml || '<span class="muted small" style="font-size:11px;">No roles</span>'}</div></div>`;
      
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
  
  let canSend = true;
  if (serverDataCache) {
    if (activeServer.owner_id !== currentUser.id) {
      const userRoles = serverDataCache.memberRoles.filter(mr => mr.user_id === currentUser.id).map(mr => mr.role_id);
      const overrides = serverDataCache.overrides.filter(o => o.channel_id === activeChannel.id && userRoles.includes(o.role_id));
      
      if (overrides.some(o => o.can_send_messages === false)) {
        canSend = false;
      }
    }
  }

  if (canSend) {
    formEl.classList.remove('hidden');
    lockedEl.classList.add('hidden');
  } else {
    formEl.classList.add('hidden');
    lockedEl.classList.remove('hidden');
  }

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