// server.js
// Backend principal: autenticacao, perfil, amigos e chat privado.

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const http = require('http');
const multer = require('multer');
const { Server } = require('socket.io');

const db = require('./db');
const { generateSerialId } = require('./serialId');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionMiddleware = session({
  secret: 'private-chat-dev-secret', // troque isso em producao
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 dias
});

app.use(sessionMiddleware);

// Compartilha a sessao HTTP com o socket.io, assim sabemos quem esta conectado.
io.engine.use(sessionMiddleware);

// ---------- Upload de arquivos (avatar / banner) ----------

const AVATAR_DIR = path.join(__dirname, 'public', 'uploads', 'avatars');
const BANNER_DIR = path.join(__dirname, 'public', 'uploads', 'banners');
fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(BANNER_DIR, { recursive: true });

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function imageFileFilter(req, file, cb) {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error('Formato de imagem invalido (use PNG, JPG, WEBP ou GIF)'));
  }
  cb(null, true);
}

function makeStorage(destDir, prefix) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${prefix}-${req.session.userId}-${Date.now()}${ext}`);
    }
  });
}

const uploadAvatar = multer({
  storage: makeStorage(AVATAR_DIR, 'avatar'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadBanner = multer({
  storage: makeStorage(BANNER_DIR, 'banner'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

function deleteOldUpload(relativePath) {
  if (!relativePath || !relativePath.startsWith('/uploads/')) return;
  const abs = path.join(__dirname, 'public', relativePath);
  fs.unlink(abs, () => {}); // ignora erro se o arquivo nao existir
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
    bio: row.bio
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }
  next();
}

function areFriends(userA, userB) {
  const row = db.prepare(`
    SELECT id FROM friendships
    WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
  `).get(userA, userB, userB, userA);
  return !!row;
}

// ---------- Auth ----------

app.post('/api/register', (req, res) => {
  const { username, password, display_name } = req.body;

  if (!username || !password || !display_name) {
    return res.status(400).json({ error: 'Preencha usuario, senha e nome de exibicao' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Usuario deve ter pelo menos 3 caracteres' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Esse usuario ja existe' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const serial = generateSerialId();

  const insert = db.prepare(`
    INSERT INTO users (serial_id, username, display_name, password, avatar, bio)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(serial, username, display_name, hashed, '', '');

  req.session.userId = info.lastInsertRowid;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Usuario ou senha invalidos' });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: publicUser(user) });
});

// ---------- Perfil ----------

app.put('/api/profile', requireAuth, (req, res) => {
  const { display_name, bio } = req.body;
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

  db.prepare(`
    UPDATE users SET display_name = ?, bio = ? WHERE id = ?
  `).run(
    display_name ?? current.display_name,
    bio ?? current.bio,
    req.session.userId
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: publicUser(updated) });
});

app.post('/api/upload/avatar', requireAuth, (req, res) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const current = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.session.userId);
    const relativePath = '/uploads/avatars/' + req.file.filename;

    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(relativePath, req.session.userId);
    deleteOldUpload(current.avatar);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    res.json({ user: publicUser(updated) });
  });
});

app.post('/api/upload/banner', requireAuth, (req, res) => {
  uploadBanner.single('banner')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const current = db.prepare('SELECT banner FROM users WHERE id = ?').get(req.session.userId);
    const relativePath = '/uploads/banners/' + req.file.filename;

    db.prepare('UPDATE users SET banner = ? WHERE id = ?').run(relativePath, req.session.userId);
    deleteOldUpload(current.banner);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    res.json({ user: publicUser(updated) });
  });
});

app.delete('/api/upload/avatar', requireAuth, (req, res) => {
  const current = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.session.userId);
  deleteOldUpload(current.avatar);
  db.prepare('UPDATE users SET avatar = NULL WHERE id = ?').run(req.session.userId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: publicUser(updated) });
});

app.delete('/api/upload/banner', requireAuth, (req, res) => {
  const current = db.prepare('SELECT banner FROM users WHERE id = ?').get(req.session.userId);
  deleteOldUpload(current.banner);
  db.prepare('UPDATE users SET banner = NULL WHERE id = ?').run(req.session.userId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: publicUser(updated) });
});

// Perfil publico de qualquer usuario (usado no popout "ver perfil")
app.get('/api/users/:id', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  res.json({ user: publicUser(user) });
});

// Busca um usuario pelo Serial ID (usado na tela de Friends/Users)
app.get('/api/users/search', requireAuth, (req, res) => {
  const { serial_id } = req.query;
  if (!serial_id) return res.status(400).json({ error: 'Informe um Serial ID' });

  const user = db.prepare('SELECT * FROM users WHERE serial_id = ?').get(serial_id.trim());
  if (!user) return res.status(404).json({ error: 'Nenhum usuario encontrado com esse Serial ID' });

  res.json({ user: publicUser(user) });
});

// Solicitacoes enviadas pelo proprio usuario e ainda pendentes (QOL: permite cancelar)
app.get('/api/friends/requests/outgoing', requireAuth, (req, res) => {
  const outgoing = db.prepare(`
    SELECT fr.id, u.id as user_id, u.serial_id, u.username, u.display_name, u.avatar
    FROM friend_requests fr
    JOIN users u ON u.id = fr.receiver_id
    WHERE fr.sender_id = ? AND fr.status = 'pending'
  `).all(req.session.userId);

  res.json({ requests: outgoing });
});

app.post('/api/friends/cancel', requireAuth, (req, res) => {
  const { request_id } = req.body;
  const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(request_id);

  if (!request || request.sender_id !== req.session.userId || request.status !== 'pending') {
    return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  }

  db.prepare('DELETE FROM friend_requests WHERE id = ?').run(request_id);
  res.json({ ok: true });
});

// ---------- Amigos ----------

app.post('/api/friends/request', requireAuth, (req, res) => {
  const { serial_id } = req.body;
  const target = db.prepare('SELECT * FROM users WHERE serial_id = ?').get((serial_id || '').trim());

  if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
  if (target.id === req.session.userId) {
    return res.status(400).json({ error: 'Voce nao pode adicionar a si mesmo' });
  }
  if (areFriends(req.session.userId, target.id)) {
    return res.status(409).json({ error: 'Voces ja sao amigos' });
  }

  const pending = db.prepare(`
    SELECT id FROM friend_requests
    WHERE status = 'pending'
      AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
  `).get(req.session.userId, target.id, target.id, req.session.userId);

  if (pending) return res.status(409).json({ error: 'Ja existe uma solicitacao pendente' });

  db.prepare(`
    INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')
  `).run(req.session.userId, target.id);

  res.json({ ok: true });
});

app.get('/api/friends/requests', requireAuth, (req, res) => {
  const incoming = db.prepare(`
    SELECT fr.id, u.id as user_id, u.serial_id, u.username, u.display_name, u.avatar, u.banner
    FROM friend_requests fr
    JOIN users u ON u.id = fr.sender_id
    WHERE fr.receiver_id = ? AND fr.status = 'pending'
  `).all(req.session.userId);

  res.json({ requests: incoming });
});

app.post('/api/friends/accept', requireAuth, (req, res) => {
  const { request_id } = req.body;
  const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(request_id);

  if (!request || request.receiver_id !== req.session.userId || request.status !== 'pending') {
    return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  }

  db.prepare(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`).run(request_id);
  db.prepare(`
    INSERT INTO friendships (user1_id, user2_id) VALUES (?, ?)
  `).run(request.sender_id, request.receiver_id);

  res.json({ ok: true });
});

app.post('/api/friends/decline', requireAuth, (req, res) => {
  const { request_id } = req.body;
  const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(request_id);

  if (!request || request.receiver_id !== req.session.userId || request.status !== 'pending') {
    return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  }

  db.prepare(`UPDATE friend_requests SET status = 'declined' WHERE id = ?`).run(request_id);
  res.json({ ok: true });
});

app.delete('/api/friends/:friendId', requireAuth, (req, res) => {
  const friendId = Number(req.params.friendId);

  db.prepare(`
    DELETE FROM friendships
    WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
  `).run(req.session.userId, friendId, friendId, req.session.userId);

  res.json({ ok: true });
});

app.get('/api/friends', requireAuth, (req, res) => {
  const friends = db.prepare(`
    SELECT u.id, u.serial_id, u.username, u.display_name, u.avatar, u.banner
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.user1_id = ? THEN f.user2_id ELSE f.user1_id END
    WHERE f.user1_id = ? OR f.user2_id = ?
  `).all(req.session.userId, req.session.userId, req.session.userId);

  res.json({ friends });
});

// ---------- Mensagens ----------

app.get('/api/messages/:friendId', requireAuth, (req, res) => {
  const friendId = Number(req.params.friendId);

  if (!areFriends(req.session.userId, friendId)) {
    return res.status(403).json({ error: 'Voces nao sao amigos' });
  }

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY id ASC
  `).all(req.session.userId, friendId, friendId, req.session.userId);

  res.json({ messages });
});

app.post('/api/messages', requireAuth, (req, res) => {
  const { receiver_id, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }
  if (!areFriends(req.session.userId, receiver_id)) {
    return res.status(403).json({ error: 'Voces nao sao amigos' });
  }

  const info = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)
  `).run(req.session.userId, receiver_id, content.trim());

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);

  // Entrega em tempo real para o destinatario, se estiver online.
  io.to('user:' + receiver_id).emit('new_message', message);

  res.json({ message });
});

// ---------- Socket.io (status online + entrega em tempo real) ----------

const onlineUsers = new Map(); // userId -> quantidade de conexoes abertas

io.on('connection', (socket) => {
  const userId = socket.request.session && socket.request.session.userId;
  if (!userId) {
    socket.disconnect();
    return;
  }

  socket.join('user:' + userId);
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
  io.emit('presence', { userId, online: true });

  socket.on('typing', ({ to }) => {
    io.to('user:' + to).emit('typing', { from: userId });
  });

  socket.on('disconnect', () => {
    const count = (onlineUsers.get(userId) || 1) - 1;
    if (count <= 0) {
      onlineUsers.delete(userId);
      io.emit('presence', { userId, online: false });
    } else {
      onlineUsers.set(userId, count);
    }
  });
});

app.get('/api/online/:userId', requireAuth, (req, res) => {
  res.json({ online: onlineUsers.has(Number(req.params.userId)) });
});

server.listen(PORT, () => {
  console.log(`PrivateChat rodando em http://localhost:${PORT}`);
});
