// server.js
require('dotenv').config();
console.log('GIPHY_API_KEY carregada:', process.env.GIPHY_API_KEY ? 'SIM (' + process.env.GIPHY_API_KEY.slice(0,4) + '...)' : 'NAO');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const http = require('http');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const supabase = require('./db');
const { generateSerialId } = require('./serialId');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const VALID_STATUSES = ['online', 'away', 'busy', 'invisible'];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'private-chat-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// ---------- Rate limiting ----------
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' }
});

// ---------- Rate limiting para Mensagens ----------
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 30, // Máximo de 30 mensagens por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are sending messages too fast. Please slow down.' }
});

// ---------- Uploads (memória -> Supabase Storage) ----------
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Formato invalido (use PNG, JPG, WEBP ou GIF)'));
    }
    cb(null, true);
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

async function uploadToSupabase(bucket, fileBuffer, fileName, mimetype) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, { contentType: mimetype, upsert: false });
  
  if (error) throw new Error('Erro ao salvar imagem');
  return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
}

async function deleteOldUpload(url) {
  if (!url) return;
  try {
    const match = url.match(/\/public\/([a-zA-Z]+)\/(.+)$/);
    if (match) {
      const bucket = match[1];
      const filePath = match[2];
      await supabase.storage.from(bucket).remove([filePath]);
    }
  } catch (err) { /* ignora */ }
}

// ---------- Helpers ----------
function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    serial_id: row.serial_id,
    username: row.username,
    display_name: row.display_name,
    avatar: row.avatar,
    banner: row.banner,
    bio: row.bio,
    status: row.status,
    has_security_question: !!row.security_question
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Nao autenticado' });
  next();
}

async function areFriends(userA, userB) {
  const { data } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(user1_id.eq.${userA},user2_id.eq.${userB}),and(user1_id.eq.${userB},user2_id.eq.${userA})`)
    .maybeSingle();
  return !!data;
}

async function isBlocked(userA, userB) {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`)
    .maybeSingle();
  return !!data;
}

async function removeFriendshipAndRequests(userA, userB) {
  await supabase.from('friendships').delete()
    .or(`and(user1_id.eq.${userA},user2_id.eq.${userB}),and(user1_id.eq.${userB},user2_id.eq.${userA})`);
  await supabase.from('friend_requests').delete()
    .or(`and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`);
}

// ---------- Auth ----------
app.post('/api/register', loginLimiter, async (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || !password || !display_name) return res.status(400).json({ error: 'Preencha tudo' });
  if (username.length < 3) return res.status(400).json({ error: 'Usuario curto' });
  if (password.length < 4) return res.status(400).json({ error: 'Senha curta' });

  const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
  if (existing) return res.status(409).json({ error: 'Usuario ja existe' });

  const hashed = bcrypt.hashSync(password, 10);
  const serial = await generateSerialId();

  const { data: newUser, error } = await supabase.from('users')
    .insert({ serial_id: serial, username, display_name, password: hashed, avatar: '', bio: '' })
    .select().single();

    if (error) {
    console.error('Erro ao registrar:', error);
      return res.status(500).json({ error: 'Erro ao registrar' });
    }
  
  req.session.userId = newUser.id;
  res.json({ user: publicUser(newUser) });
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const { data: user } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/me', requireAuth, async (req, res) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  res.json({ user: publicUser(user) });
});

// ---------- Senha e Conta ----------
app.put('/api/account/security-question', requireAuth, async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Preencha os dados' });
  const answerHash = bcrypt.hashSync(answer.trim().toLowerCase(), 10);
  await supabase.from('users').update({ security_question: question.trim(), security_answer_hash: answerHash }).eq('id', req.session.userId);
  res.json({ ok: true });
});

app.get('/api/account/security-question', loginLimiter, async (req, res) => {
  const { username } = req.query;
  const { data: user } = await supabase.from('users').select('security_question').eq('username', username).maybeSingle();
  if (!user || !user.security_question) return res.status(404).json({ error: 'Sem pergunta cadastrada' });
  res.json({ question: user.security_question });
});

app.post('/api/account/reset-password', loginLimiter, async (req, res) => {
  const { username, answer, new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'Senha curta' });
  const { data: user } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
  if (!user || !user.security_answer_hash) return res.status(404).json({ error: 'Sem pergunta cadastrada' });
  if (!bcrypt.compareSync((answer || '').trim().toLowerCase(), user.security_answer_hash)) return res.status(401).json({ error: 'Resposta incorreta' });
  const hashed = bcrypt.hashSync(new_password, 10);
  await supabase.from('users').update({ password: hashed }).eq('id', user.id);
  res.json({ ok: true });
});

app.put('/api/account/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'Senha curta' });
  const { data: user } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  if (!bcrypt.compareSync(current_password || '', user.password)) return res.status(401).json({ error: 'Senha atual incorreta' });
  const hashed = bcrypt.hashSync(new_password, 10);
  await supabase.from('users').update({ password: hashed }).eq('id', req.session.userId);
  res.json({ ok: true });
});

app.delete('/api/account', requireAuth, async (req, res) => {
  const { password } = req.body;
  const { data: user } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  if (!bcrypt.compareSync(password || '', user.password)) return res.status(401).json({ error: 'Senha incorreta' });
  const uid = req.session.userId;
  
  await deleteOldUpload(user.avatar);
  await deleteOldUpload(user.banner);
  await supabase.from('messages').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
  await supabase.from('friendships').delete().or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
  await supabase.from('friend_requests').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
  await supabase.from('blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);
  await supabase.from('friend_meta').delete().or(`owner_id.eq.${uid},friend_id.eq.${uid}`);
  await supabase.from('users').delete().eq('id', uid);

  req.session.destroy(() => res.json({ ok: true }));
});

// ---------- Status ----------
app.put('/api/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Status invalido' });
  await supabase.from('users').update({ status }).eq('id', req.session.userId);
  broadcastPresence(req.session.userId);
  res.json({ ok: true });
});

// ---------- Perfil ----------

app.put('/api/profile', requireAuth, async (req, res) => {
  const { display_name, bio } = req.body;
  try {
    const { data: current } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
    
    const { data: updated, error } = await supabase.from('users')
      .update({
        display_name: display_name ?? current.display_name,
        bio: bio ?? current.bio
      })
      .eq('id', req.session.userId)
      .select()
      .single();

    if (error) {
      console.error('Erro Supabase ao salvar perfil:', error);
      return res.status(500).json({ error: 'Banco de dados recusou a alteração.' });
    }

    res.json({ user: publicUser(updated) });
  } catch (err) {
    console.error('Erro interno ao salvar perfil:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.put('/api/profile/avatar-url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'URL invalida' });
  const { data: current } = await supabase.from('users').select('avatar').eq('id', req.session.userId).maybeSingle();
  if (current?.avatar) await deleteOldUpload(current.avatar);
  await supabase.from('users').update({ avatar: url }).eq('id', req.session.userId);
  const { data: updated } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  res.json({ user: publicUser(updated) });
});

app.put('/api/profile/banner-url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: 'URL invalida' });
  const { data: current } = await supabase.from('users').select('banner').eq('id', req.session.userId).maybeSingle();
  if (current?.banner) await deleteOldUpload(current.banner);
  await supabase.from('users').update({ banner: url }).eq('id', req.session.userId);
  const { data: updated } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  res.json({ user: publicUser(updated) });
});

app.post('/api/upload/avatar', requireAuth, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    try {
      const { data: current } = await supabase.from('users').select('avatar').eq('id', req.session.userId).maybeSingle();
      if (current?.avatar) await deleteOldUpload(current.avatar);
      const fileName = `avatar-${req.session.userId}-${Date.now()}${path.extname(req.file.originalname) || '.png'}`;
      const publicUrl = await uploadToSupabase('avatars', req.file.buffer, fileName, req.file.mimetype);
      await supabase.from('users').update({ avatar: publicUrl }).eq('id', req.session.userId);
      const { data: updated } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
      res.json({ user: publicUser(updated) });
    } catch (e) { res.status(500).json({ error: 'Erro no upload' }); }
  });
});

app.post('/api/upload/banner', requireAuth, (req, res) => {
  upload.single('banner')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    try {
      const { data: current } = await supabase.from('users').select('banner').eq('id', req.session.userId).maybeSingle();
      if (current?.banner) await deleteOldUpload(current.banner);
      const fileName = `banner-${req.session.userId}-${Date.now()}${path.extname(req.file.originalname) || '.png'}`;
      const publicUrl = await uploadToSupabase('banners', req.file.buffer, fileName, req.file.mimetype);
      await supabase.from('users').update({ banner: publicUrl }).eq('id', req.session.userId);
      const { data: updated } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
      res.json({ user: publicUser(updated) });
    } catch (e) { res.status(500).json({ error: 'Erro no upload' }); }
  });
});

app.delete('/api/upload/avatar', requireAuth, async (req, res) => {
  const { data: current } = await supabase.from('users').select('avatar').eq('id', req.session.userId).maybeSingle();
  await deleteOldUpload(current.avatar);
  await supabase.from('users').update({ avatar: null }).eq('id', req.session.userId);
  const { data: updated } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  res.json({ user: publicUser(updated) });
});

app.delete('/api/upload/banner', requireAuth, async (req, res) => {
  const { data: current } = await supabase.from('users').select('banner').eq('id', req.session.userId).maybeSingle();
  await deleteOldUpload(current.banner);
  await supabase.from('users').update({ banner: null }).eq('id', req.session.userId);
  const { data: updated } = await supabase.from('users').select('*').eq('id', req.session.userId).maybeSingle();
  res.json({ user: publicUser(updated) });
});

app.get('/api/users/:id', requireAuth, async (req, res) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', Number(req.params.id)).maybeSingle();
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  res.json({ user: publicUser(user) });
});

app.get('/api/users/search', requireAuth, async (req, res) => {
  const { serial_id } = req.query;
  if (!serial_id) return res.status(400).json({ error: 'Informe um Serial ID' });
  const { data: user } = await supabase.from('users').select('*').eq('serial_id', serial_id.trim()).maybeSingle();
  if (!user) return res.status(404).json({ error: 'Nenhum usuario encontrado' });
  res.json({ user: publicUser(user) });
});

// ---------- Bloqueios ----------
app.post('/api/block', requireAuth, async (req, res) => {
  const targetId = Number(req.body.user_id);
  if (targetId === req.session.userId) return res.status(400).json({ error: 'Nao pode bloquear a si mesmo' });
  const { data: target } = await supabase.from('users').select('id').eq('id', targetId).maybeSingle();
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  await supabase.from('blocks').upsert({ blocker_id: req.session.userId, blocked_id: targetId });
  await removeFriendshipAndRequests(req.session.userId, targetId);
  res.json({ ok: true });
});

app.delete('/api/block/:userId', requireAuth, async (req, res) => {
  await supabase.from('blocks').delete().eq('blocker_id', req.session.userId).eq('blocked_id', Number(req.params.userId));
  res.json({ ok: true });
});

app.get('/api/blocks', requireAuth, async (req, res) => {
  const { data: blocked } = await supabase
    .from('blocks')
    .select('blocked_id, users:users!blocks_blocked_id_fkey(id, serial_id, username, display_name, avatar)')
    .eq('blocker_id', req.session.userId);
  const formatted = (blocked || []).map(b => b.users).filter(Boolean);
  res.json({ blocked: formatted });
});

// ---------- Amigos ----------
app.post('/api/friends/request', requireAuth, async (req, res) => {
  const { serial_id } = req.body;
  const { data: target } = await supabase.from('users').select('*').eq('serial_id', (serial_id || '').trim()).maybeSingle();
  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (target.id === req.session.userId) return res.status(400).json({ error: 'Nao pode adicionar a si mesmo' });
  if (await isBlocked(req.session.userId, target.id)) return res.status(403).json({ error: 'Bloqueado' });
  if (await areFriends(req.session.userId, target.id)) return res.status(409).json({ error: 'Ja sao amigos' });
  
  const { data: pending } = await supabase.from('friend_requests')
    .select('id').eq('status', 'pending')
    .or(`and(sender_id.eq.${req.session.userId},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${req.session.userId})`)
    .maybeSingle();
  if (pending) return res.status(409).json({ error: 'Ja existe solicitacao pendente' });

  await supabase.from('friend_requests').insert({ sender_id: req.session.userId, receiver_id: target.id, status: 'pending' });
  res.json({ ok: true });
});

app.get('/api/friends/requests', requireAuth, async (req, res) => {
  const { data: requests } = await supabase
    .from('friend_requests')
    .select('id, users:sender_id(id, serial_id, username, display_name, avatar, banner)')
    .eq('receiver_id', req.session.userId).eq('status', 'pending');
  
  const formatted = (requests || []).map(r => ({ request_id: r.id, ...r.users }));
  res.json({ requests: formatted });
});

app.get('/api/friends/requests/outgoing', requireAuth, async (req, res) => {
  const { data: requests } = await supabase
    .from('friend_requests')
    .select('id, users:receiver_id(id, serial_id, username, display_name, avatar)')
    .eq('sender_id', req.session.userId).eq('status', 'pending');
  
  const formatted = (requests || []).map(r => ({ request_id: r.id, ...r.users }));
  res.json({ requests: formatted });
});

app.post('/api/friends/cancel', requireAuth, async (req, res) => {
  const { request_id } = req.body;
  const { data: request } = await supabase.from('friend_requests').select('*').eq('id', request_id).maybeSingle();
  if (!request || request.sender_id !== req.session.userId || request.status !== 'pending') return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  await supabase.from('friend_requests').delete().eq('id', request_id);
  res.json({ ok: true });
});

app.post('/api/friends/accept', requireAuth, async (req, res) => {
  const { request_id } = req.body;
  const { data: request } = await supabase.from('friend_requests').select('*').eq('id', request_id).maybeSingle();
  if (!request || request.receiver_id !== req.session.userId || request.status !== 'pending') return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', request_id);
  await supabase.from('friendships').insert({ user1_id: request.sender_id, user2_id: request.receiver_id });
  res.json({ ok: true });
});

app.post('/api/friends/decline', requireAuth, async (req, res) => {
  const { request_id } = req.body;
  const { data: request } = await supabase.from('friend_requests').select('*').eq('id', request_id).maybeSingle();
  if (!request || request.receiver_id !== req.session.userId || request.status !== 'pending') return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', request_id);
  res.json({ ok: true });
});

app.delete('/api/friends/:friendId', requireAuth, async (req, res) => {
  const friendId = Number(req.params.friendId);
  await supabase.from('friendships').delete()
    .or(`and(user1_id.eq.${req.session.userId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${req.session.userId})`);
  res.json({ ok: true });
});

app.get('/api/friends', requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const { data: friends } = await supabase
    .from('friendships')
    .select(`user1_id, user2_id, user1:user1_id(id, serial_id, username, display_name, avatar, banner, status), user2:user2_id(id, serial_id, username, display_name, avatar, banner, status)`)
    .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
  const { data: metas } = await supabase.from('friend_meta').select('friend_id, nickname, note').eq('owner_id', uid);
  const metaMap = Object.fromEntries((metas || []).map(m => [m.friend_id, m]));
  const { data: unread } = await supabase.from('messages').select('sender_id, count').eq('receiver_id', uid).is('read_at', null).is('deleted_at', null).order('sender_id');
  const unreadMap = {};
  (unread || []).forEach(r => { unreadMap[r.sender_id] = (unreadMap[r.sender_id] || 0) + 1; });
  const list = (friends || []).map(f => {
    const friend = f.user1_id === uid ? f.user2 : f.user1;
    if (!friend) return null;
    const meta = metaMap[friend.id] || {};
    return { ...friend, nickname: meta.nickname, note: meta.note, unread_count: unreadMap[friend.id] || 0 };
  }).filter(Boolean);
  res.json({ friends: list });
});

app.put('/api/friends/:friendId/meta', requireAuth, async (req, res) => {
  const friendId = Number(req.params.friendId);
  const { nickname, note } = req.body;
  if (!await areFriends(req.session.userId, friendId)) return res.status(403).json({ error: 'Nao sao amigos' });
  await supabase.from('friend_meta').upsert({ owner_id: req.session.userId, friend_id: friendId, nickname: nickname || null, note: note || null }, { onConflict: 'owner_id,friend_id' });
  res.json({ ok: true });
});

// ---------- Mensagens ----------
const MESSAGES_PAGE_SIZE = 50;

app.get('/api/messages/:friendId', requireAuth, async (req, res) => {
  const friendId = Number(req.params.friendId);
  const before = req.query.before ? Number(req.query.before) : null;
  if (!await areFriends(req.session.userId, friendId)) return res.status(403).json({ error: 'Nao sao amigos' });

  let query = supabase.from('messages').select('*, reply_to, deleted_at, image') // Adicionado deleted_at e image aqui
    .or(`and(sender_id.eq.${req.session.userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${req.session.userId})`)
    .order('id', { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);
  if (before) query = query.lt('id', before);
  
  const { data: rows } = await query;
  rows.reverse();

  if (!before) {
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('sender_id', friendId).eq('receiver_id', req.session.userId).is('read_at', null);
    io.to('user:' + friendId).emit('messages_read', { by: req.session.userId });
  }
  res.json({ messages: rows, has_more: rows.length === MESSAGES_PAGE_SIZE });
});

app.post('/api/messages', requireAuth, messageLimiter, async (req, res) => {
  // 1. Autenticação já feita pelo requireAuth (usa a sessão, não confia no cliente)
  const sender_id = req.session.userId; 
  
  // 2. Validação de Input
  const { receiver_id, content, reply_to } = req.body;
  
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia ou invalida' });
  }
  if (content.length > 4000) {
    return res.status(400).json({ error: 'Mensagem muito longa (max 4000 chars)' });
  }
  if (!receiver_id || isNaN(Number(receiver_id))) {
    return res.status(400).json({ error: 'Destinatario invalido' });
  }

  // 3. Autorização (Verifica se são amigos e se não estão bloqueados)
  if (!await areFriends(sender_id, Number(receiver_id))) return res.status(403).json({ error: 'Nao sao amigos' });
  if (await isBlocked(sender_id, Number(receiver_id))) return res.status(403).json({ error: 'Bloqueado' });

  // 4. Inserção segura no banco (Apenas os campos necessários)
  const { data: message, error } = await supabase.from('messages')
    .insert({ 
      sender_id: sender_id, 
      receiver_id: Number(receiver_id), 
      content: content.trim(),
      reply_to: reply_to ? Number(reply_to) : null
    })
    .select().single();

  if (error) {
    console.error('Erro ao salvar mensagem:', error);
    return res.status(500).json({ error: 'Erro interno ao enviar mensagem' });
  }

  io.to('user:' + receiver_id).emit('new_message', message);
  res.json({ message });
});

app.put('/api/messages/:id', requireAuth, async (req, res) => {
  const { content } = req.body;
  const { data: message } = await supabase.from('messages').select('*').eq('id', Number(req.params.id)).maybeSingle();
  if (!message || message.sender_id !== req.session.userId) return res.status(404).json({ error: 'Nao encontrada' });
  if (message.deleted_at) return res.status(400).json({ error: 'Mensagem apagada' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Vazia' });

  const { data: updated } = await supabase.from('messages')
    .update({ content: content.trim(), edited_at: new Date().toISOString() }).eq('id', message.id)
    .select().single();

  io.to('user:' + message.receiver_id).emit('message_updated', updated);
  io.to('user:' + message.sender_id).emit('message_updated', updated);
  res.json({ message: updated });
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  const { data: message } = await supabase.from('messages').select('*').eq('id', Number(req.params.id)).maybeSingle();
  if (!message || message.sender_id !== req.session.userId) return res.status(404).json({ error: 'Nao encontrada' });

  const { error } = await supabase.from('messages').update({ content: 'Mensagem apagada', image: null, deleted_at: new Date().toISOString() }).eq('id', message.id);
  
  if (error) {
    console.error('Erro do Supabase ao deletar DM:', error);
    return res.status(500).json({ error: 'O banco de dados recusou a exclusão. Verifique se a coluna deleted_at existe.' });
  }

  io.to('user:' + message.receiver_id).emit('message_deleted', { messageId: message.id });
  io.to('user:' + message.sender_id).emit('message_deleted', { messageId: message.id });
  res.json({ ok: true });
});

// ---------- Servidores ----------
app.post('/api/servers', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 3) return res.status(400).json({ error: 'Nome do servidor muito curto' });
  
  const inviteCode = Math.random().toString(36).substring(2, 10);
  const { data: server, error } = await supabase.from('servers')
    .insert({ name: name.trim(), owner_id: req.session.userId, invite_code: inviteCode })
    .select().single();
  
  if (error) return res.status(500).json({ error: 'Erro ao criar servidor' });
  
  await supabase.from('server_members').insert({ server_id: server.id, user_id: req.session.userId });
  
  const { data: role } = await supabase.from('server_roles')
    .insert({ server_id: server.id, name: '@everyone', color: '#99aab5', position: 0 })
    .select().single();
  await supabase.from('server_member_roles').insert({ server_id: server.id, user_id: req.session.userId, role_id: role.id });

  await supabase.from('server_channels').insert({ server_id: server.id, name: 'geral', position: 0 });
  
  res.json({ server });
});

app.post('/api/servers/join', requireAuth, async (req, res) => {
  const { invite_code } = req.body;
  const { data: server } = await supabase.from('servers').select('*').eq('invite_code', invite_code.trim()).maybeSingle();
  if (!server) return res.status(404).json({ error: 'Servidor nao encontrado' });
  
  const { data: existing } = await supabase.from('server_members').select('id')
    .eq('server_id', server.id).eq('user_id', req.session.userId).maybeSingle();
  if (existing) return res.status(409).json({ error: 'Voce ja esta nesse servidor' });
  
  await supabase.from('server_members').insert({ server_id: server.id, user_id: req.session.userId });
  const { data: everyoneRole } = await supabase.from('server_roles').select('id').eq('server_id', server.id).eq('name', '@everyone').maybeSingle();
  if (everyoneRole) {
    await supabase.from('server_member_roles').insert({ server_id: server.id, user_id: req.session.userId, role_id: everyoneRole.id });
  }
  res.json({ server });
});

app.get('/api/servers', requireAuth, async (req, res) => {
  const { data: members } = await supabase.from('server_members')
    .select('server_id, servers:servers!server_members_server_id_fkey(*)')
    .eq('user_id', req.session.userId);
  const servers = (members || []).map(m => m.servers).filter(Boolean);
  res.json({ servers });
});

app.put('/api/servers/:id', requireAuth, async (req, res) => {
  const serverId = Number(req.params.id);
  const { name } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', serverId).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });
  
  await supabase.from('servers').update({ name: name.trim() }).eq('id', serverId);
  const { data: updated } = await supabase.from('servers').select('*').eq('id', serverId).maybeSingle();
  res.json({ server: updated });
});

app.post('/api/servers/:id/icon', requireAuth, upload.single('icon'), async (req, res) => {
  const serverId = Number(req.params.id);
  try {
    const { data: server } = await supabase.from('servers').select('owner_id, icon_url').eq('id', serverId).maybeSingle();
    if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo' });

    if (server.icon_url) await deleteOldUpload(server.icon_url);
    const fileName = `server-${serverId}-${Date.now()}${path.extname(req.file.originalname) || '.png'}`;
    const publicUrl = await uploadToSupabase('servers', req.file.buffer, fileName, req.file.mimetype);
    
    await supabase.from('servers').update({ icon_url: publicUrl }).eq('id', serverId);
    const { data: updated } = await supabase.from('servers').select('*').eq('id', serverId).maybeSingle();
    res.json({ server: updated });
  } catch (error) {
    console.error('Erro no upload do ícone:', error);
    res.status(500).json({ error: 'Erro ao salvar imagem. Verifique se o bucket "servers" existe no Supabase.' });
  }
});

app.get('/api/servers/:id/data', requireAuth, async (req, res) => {
  const serverId = Number(req.params.id);
  const { data: member } = await supabase.from('server_members').select('id').eq('server_id', serverId).eq('user_id', req.session.userId).maybeSingle();
  if (!member) return res.status(403).json({ error: 'Voce nao esta nesse servidor' });

  const { data: channels } = await supabase.from('server_channels').select('*').eq('server_id', serverId).order('position', { ascending: true });
  const { data: roles } = await supabase.from('server_roles').select('*').eq('server_id', serverId).order('position', { ascending: true });
  const { data: members } = await supabase.from('server_members')
    .select('user_id, users:user_id(id, username, display_name, avatar)')
    .eq('server_id', serverId);
  const { data: memberRoles } = await supabase.from('server_member_roles').select('user_id, role_id').eq('server_id', serverId);
  const { data: overrides } = await supabase.from('channel_role_permissions').select('channel_id, role_id, can_send_messages').in('channel_id', (channels || []).map(c => c.id));

  res.json({ channels, roles, members, memberRoles, overrides });
});

app.put('/api/channels/:id', requireAuth, async (req, res) => {
  const channelId = Number(req.params.id);
  const { name } = req.body;
  const { data: channel } = await supabase.from('server_channels').select('server_id').eq('id', channelId).maybeSingle();
  if (!channel) return res.status(404).json({ error: 'Canal nao encontrado' });
  
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', channel.server_id).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });

  await supabase.from('server_channels').update({ name: name.trim().toLowerCase().replace(/\s+/g, '-') }).eq('id', channelId);
  res.json({ ok: true });
});

app.delete('/api/channels/:id', requireAuth, async (req, res) => {
  const channelId = Number(req.params.id);
  const { data: channel } = await supabase.from('server_channels').select('server_id').eq('id', channelId).maybeSingle();
  if (!channel) return res.status(404).json({ error: 'Canal nao encontrado' });
  
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', channel.server_id).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });

  await supabase.from('server_channels').delete().eq('id', channelId);
  res.json({ ok: true });
});

app.post('/api/servers/:id/roles', requireAuth, async (req, res) => {
  const serverId = Number(req.params.id);
  const { name, color } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', serverId).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });

  const { data: role, error } = await supabase.from('server_roles')
    .insert({ server_id: serverId, name: name.trim(), color: color || '#99aab5' })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar cargo' });
  res.json({ role });
});

app.post('/api/servers/:id/roles/assign', requireAuth, async (req, res) => {
  const serverId = Number(req.params.id);
  const { user_id, role_id } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', serverId).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });

  await supabase.from('server_member_roles').upsert({ server_id: serverId, user_id, role_id });
  res.json({ ok: true });
});

app.post('/api/servers/:id/roles/revoke', requireAuth, async (req, res) => {
  const serverId = Number(req.params.id);
  const { user_id, role_id } = req.body;
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', serverId).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'No permission' });

  await supabase.from('server_member_roles').delete()
    .eq('server_id', serverId).eq('user_id', user_id).eq('role_id', role_id);
  res.json({ ok: true });
});

app.put('/api/channels/:id/permissions', requireAuth, async (req, res) => {
  const channelId = Number(req.params.id);
  const { role_id, can_send_messages } = req.body;
  
  const { data: channel } = await supabase.from('server_channels').select('server_id').eq('id', channelId).maybeSingle();
  if (!channel) return res.status(404).json({ error: 'Canal nao encontrado' });
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', channel.server_id).maybeSingle();
  if (!server || server.owner_id !== req.session.userId) return res.status(403).json({ error: 'Sem permissao' });

  await supabase.from('channel_role_permissions').upsert({ 
    channel_id: channelId, role_id, can_send_messages 
  }, { onConflict: 'channel_id, role_id' });
  res.json({ ok: true });
});

app.get('/api/servers/:id/channels/:channelId/messages', requireAuth, async (req, res) => {
  const { id: serverId, channelId } = req.params;
  const { data: member } = await supabase.from('server_members').select('id').eq('server_id', serverId).eq('user_id', req.session.userId).maybeSingle();
  if (!member) return res.status(403).json({ error: 'Voce nao esta nesse servidor' });

  // Pega as últimas 50 mensagens (descending) e depois inverte a ordem para mostrar na tela
  const { data: messages } = await supabase.from('server_messages')
    .select('*, deleted_at, reply_to, users:sender_id(id, serial_id, username, display_name, avatar)')
    .eq('server_id', serverId).eq('channel_id', channelId)
    .order('id', { ascending: false })
    .limit(50);
  
  messages.reverse();
  
  res.json({ messages });
});

app.post('/api/servers/:id/channels/:channelId/messages', requireAuth, messageLimiter, async (req, res) => {
  const { id: serverId, channelId } = req.params;
  const { content, reply_to } = req.body;
  
  // Validação de Input
  if (!content || typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Mensagem vazia' });
  if (content.length > 4000) return res.status(400).json({ error: 'Mensagem muito longa' });
  
  // Autorização (Verifica se está no servidor)
  const { data: member } = await supabase.from('server_members').select('id').eq('server_id', serverId).eq('user_id', req.session.userId).maybeSingle();
  if (!member) return res.status(403).json({ error: 'Voce nao esta nesse servidor' });

  // Verifica permissão de canal (se não está mutado)
  const { data: userRoles } = await supabase.from('server_member_roles').select('role_id').eq('server_id', serverId).eq('user_id', req.session.userId);
  const roleIds = (userRoles || []).map(r => r.role_id);
  const { data: overrides } = await supabase.from('channel_role_permissions')
    .select('can_send_messages').eq('channel_id', channelId).in('role_id', roleIds);
    
  if (overrides.some(o => o.can_send_messages === false)) {
    return res.status(403).json({ error: 'Voce nao tem permissao para falar neste canal' });
  }

  // Inserção segura
  const { data: message, error } = await supabase.from('server_messages')
    .insert({ 
      server_id: Number(serverId), 
      channel_id: Number(channelId), 
      sender_id: req.session.userId, 
      content: content.trim(),
      reply_to: reply_to ? Number(reply_to) : null
    })
    .select('*, users:sender_id(id, serial_id, username, display_name, avatar)').single();
  
  if (error) {
    console.error('Erro ao salvar msg servidor:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
  
  io.to('server:' + serverId).emit('new_server_message', message);
  res.json({ message });
});

app.delete('/api/servers/:serverId/messages/:msgId', requireAuth, async (req, res) => {
  const { serverId, msgId } = req.params;
  const { data: msg } = await supabase.from('server_messages').select('*').eq('id', msgId).maybeSingle();
  if (!msg) return res.status(404).json({ error: 'Not found' });

  const isOwner = msg.sender_id === req.session.userId;
  let canManage = false;
  
  const { data: server } = await supabase.from('servers').select('owner_id').eq('id', serverId).maybeSingle();
  if (server.owner_id === req.session.userId) canManage = true;
  else {
    const { data: roles } = await supabase.from('server_member_roles').select('role_id').eq('server_id', serverId).eq('user_id', req.session.userId);
    const roleIds = (roles || []).map(r => r.role_id);
    if (roleIds.length > 0) {
      const { data: roleData } = await supabase.from('server_roles').select('manage_messages').in('id', roleIds);
      canManage = roleData.some(r => r.manage_messages);
    }
  }

  if (!isOwner && !canManage) return res.status(403).json({ error: 'No permission' });

  const { error } = await supabase.from('server_messages').update({ content: 'Mensagem apagada', deleted_at: new Date().toISOString() }).eq('id', msgId);
  if (error) {
    console.error('Erro do Supabase ao deletar msg de servidor:', error);
    return res.status(500).json({ error: 'O banco de dados recusou a exclusão.' });
  }

  io.to('server:' + serverId).emit('server_message_deleted', { messageId: Number(msgId) });
  res.json({ ok: true });
});

// ---------- GIFs (Giphy API) ----------
app.get('/api/gifs/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  try {
    const response = await fetch(`https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q || 'hello')}&api_key=${process.env.GIPHY_API_KEY}&limit=24&rating=pg`);
    if (!response.ok) {
      console.error('Giphy respondeu com erro:', response.status, await response.text());
      return res.status(502).json({ error: 'Giphy indisponivel' });
    }
    const data = await response.json();
    const gifs = (data.data || []).map(g => g.images?.fixed_height?.url || g.images?.original?.url).filter(Boolean);
    res.json({ gifs });
  } catch (e) {
    console.error('Giphy Error:', e);
    res.status(500).json({ error: 'Erro ao buscar GIFs' });
  }
});

app.get('/api/gifs/favorites', requireAuth, async (req, res) => {
  const { data } = await supabase.from('favorite_gifs').select('gif_url').eq('user_id', req.session.userId).order('created_at', { ascending: false });
  res.json({ gifs: data?.map(d => d.gif_url) || [] });
});

app.post('/api/gifs/favorites', requireAuth, async (req, res) => {
  const { gif_url } = req.body;
  const { error } = await supabase.from('favorite_gifs').upsert({ user_id: req.session.userId, gif_url }, { onConflict: 'user_id,gif_url' });
  if (error) {
    console.error('Erro ao favoritar GIF:', error);
    return res.status(500).json({ error: 'Erro ao favoritar GIF' });
  }
  res.json({ ok: true });
});

app.delete('/api/gifs/favorites', requireAuth, async (req, res) => {
  const { gif_url } = req.body;
  await supabase.from('favorite_gifs').delete().eq('user_id', req.session.userId).eq('gif_url', gif_url);
  res.json({ ok: true });
});

// ---------- Reações ----------
app.post('/api/messages/:id/reactions', requireAuth, async (req, res) => {
  const msgId = Number(req.params.id);
  const { emoji } = req.body;
  const { data: msg } = await supabase.from('messages').select('sender_id, receiver_id').eq('id', msgId).maybeSingle();
  if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });

  const { data: existing } = await supabase.from('message_reactions')
    .select('id').eq('message_id', msgId).eq('user_id', req.session.userId).eq('emoji', emoji).maybeSingle();

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id);
    io.to('user:' + msg.sender_id).emit('reaction_removed', { messageId: msgId, emoji, userId: req.session.userId });
    io.to('user:' + msg.receiver_id).emit('reaction_removed', { messageId: msgId, emoji, userId: req.session.userId });
    res.json({ ok: true, action: 'removed' });
  } else {
    await supabase.from('message_reactions').insert({ message_id: msgId, user_id: req.session.userId, emoji });
    io.to('user:' + msg.sender_id).emit('reaction_added', { messageId: msgId, emoji, userId: req.session.userId });
    io.to('user:' + msg.receiver_id).emit('reaction_added', { messageId: msgId, emoji, userId: req.session.userId });
    res.json({ ok: true, action: 'added' });
  }
});

// ---------- Socket.io ----------
const onlineUsers = new Map();

async function broadcastPresence(userId) {
  const { data: user } = await supabase.from('users').select('status').eq('id', userId).maybeSingle();
  const connected = onlineUsers.has(userId);
  const visible = connected && user && user.status !== 'invisible';
  io.emit('presence', { userId, online: visible, status: visible ? user.status : 'offline' });
}

io.on('connection', (socket) => {
  const userId = socket.request.session && socket.request.session.userId;
  if (!userId) { socket.disconnect(); return; }
  socket.join('user:' + userId);
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
  broadcastPresence(userId);

  socket.on('join_server', async (serverId) => {
    const parsedServerId = Number(serverId);
    const { data: member } = await supabase.from('server_members').select('id')
      .eq('server_id', parsedServerId).eq('user_id', userId).maybeSingle();
    if (member) socket.join('server:' + parsedServerId);
  });

  socket.on('disconnect', () => {
    const count = (onlineUsers.get(userId) || 1) - 1;
    if (count <= 0) { onlineUsers.delete(userId); broadcastPresence(userId); }
    else onlineUsers.set(userId, count);
  });
});

server.listen(PORT, () => console.log(`PrivateChat rodando em http://localhost:${PORT}`));