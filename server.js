/* VIBLO-MSG — realtime messenger server */
'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { Server } = require('socket.io');

/* ------------------------------ env + config ------------------------------ */
function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(PUBLIC_DIR, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.txt');

const secret = (() => {
  const fromEnv = (process.env.SESSION_SECRET || '').trim();
  if (fromEnv.length >= 32) return fromEnv;
  try {
    if (fs.existsSync(SECRET_FILE)) return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, s);
  return s;
})();

/* ---------------------------------- db ----------------------------------- */
let db = { users: {}, convs: {}, messages: {} };
try {
  if (fs.existsSync(DB_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db.users = parsed.users || {};
    db.convs = parsed.convs || {};
    db.messages = parsed.messages || {};
  }
} catch (err) {
  console.error('⚠️  تعذر قراءة قاعدة البيانات، سيتم البدء بقاعدة جديدة:', err.message);
}

let saveTimer = null;
function saveDb() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('DB save failed:', err.message);
    }
  }, 250);
}

/* ------------------------------- helpers --------------------------------- */
const id = (n = 16) => crypto.randomBytes(n).toString('hex');
const now = () => Date.now();
const usernameRe = /^[a-z0-9._]{3,20}$/;
const SCRYPT_KEYLEN = 64;

/* ------------------------------ passwords ------------------------------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  try {
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/* simple in-memory brute-force protection */
const loginAttempts = new Map();
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 10;
function attemptKey(req, username) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
  return ip + '|' + username;
}
function attemptsLeft(key) {
  const list = (loginAttempts.get(key) || []).filter((t) => now() - t < ATTEMPT_WINDOW);
  loginAttempts.set(key, list);
  return Math.max(0, ATTEMPT_LIMIT - list.length);
}
function noteFailure(key) {
  const list = (loginAttempts.get(key) || []).filter((t) => now() - t < ATTEMPT_WINDOW);
  list.push(now());
  loginAttempts.set(key, list);
}
function findUserByUsername(raw) {
  const u = String(raw || '').toLowerCase().trim();
  if (!u) return null;
  return Object.values(db.users).find((x) => x.usernameLower === u) || null;
}

function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ u: userId, exp: now() + 30 * 24 * 3600 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.u || !data.exp || data.exp < now()) return null;
    return db.users[data.u] || null;
  } catch {
    return null;
  }
}
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username || null,
    name: u.name || u.username || 'مستخدم',
    picture: u.picture || null,
    online: onlineUsers.has(u.id),
    lastSeen: u.lastSeen || null,
    createdAt: u.createdAt
  };
}
function peerOf(conv, me) {
  return db.users[conv.a === me ? conv.b : conv.a] || null;
}
function convView(conv, me) {
  const peer = peerOf(conv, me);
  const list = db.messages[conv.id] || [];
  const last = list[list.length - 1] || null;
  const unread = list.filter((m) => m.from !== me && m.from !== 'system' && !(m.readBy || []).includes(me)).length;
  return {
    id: conv.id,
    status: conv.status,
    requestedBy: conv.requestedBy,
    createdAt: conv.createdAt,
    acceptedAt: conv.acceptedAt || null,
    lastMessageAt: conv.lastMessageAt || conv.createdAt,
    peer: publicUser(peer),
    lastMessage: last
      ? {
          id: last.id,
          from: last.from,
          kind: last.kind,
          text: last.text || '',
          createdAt: last.createdAt,
          mediaName: last.media ? last.media.name || '' : '',
          read: last.from === me ? (last.readBy || []).some((x) => x !== me) : true
        }
      : null,
    unread
  };
}
function findConvBetween(a, b) {
  return Object.values(db.convs).find(
    (c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)
  );
}
function validateMedia(media) {
  if (!media || typeof media !== 'object') return null;
  if (typeof media.url !== 'string' || !media.url.startsWith('/uploads/')) return null;
  return {
    url: media.url.slice(0, 500),
    mime: String(media.mime || '').slice(0, 100),
    name: String(media.name || '').slice(0, 200),
    size: Number(media.size) || 0,
    duration: Number(media.duration) || 0
  };
}
function createMessage(conv, from, body) {
  const kind = ['text', 'image', 'video', 'audio'].includes(body.kind) ? body.kind : 'text';
  const text = String(body.text || '').slice(0, 4000).trim();
  const media = validateMedia(body.media);
  if (kind === 'text' && !text) return null;
  if (kind !== 'text' && !media) return null;
  const msg = {
    id: id(12),
    convId: conv.id,
    from,
    kind,
    text,
    media,
    createdAt: now(),
    readBy: [from]
  };
  if (!db.messages[conv.id]) db.messages[conv.id] = [];
  db.messages[conv.id].push(msg);
  if (db.messages[conv.id].length > 5000) db.messages[conv.id].splice(0, db.messages[conv.id].length - 5000);
  conv.lastMessageAt = msg.createdAt;
  saveDb();
  return msg;
}

/* -------------------------------- app ------------------------------------ */
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e6,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    etag: true,
    maxAge: '365d',
    immutable: true
  })
);

app.use(
  express.static(PUBLIC_DIR, {
    etag: true,
    maxAge: 0
  })
);

/* -------------------------------- auth ----------------------------------- */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'انتهت الجلسة، سجّل الدخول مرة أخرى.' });
  req.user = user;
  next();
}

app.get('/api/config', (req, res) => {
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ];
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL.split(',').map((s) => s.trim()).filter(Boolean),
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || ''
    });
  }
  res.json({
    appName: 'VIBLO-MSG',
    iceServers
  });
});

/* ----------------------------- registration ----------------------------- */
app.get('/api/auth/check-username', (req, res) => {
  const u = String(req.query.u || '').toLowerCase().trim();
  if (!usernameRe.test(u)) return res.json({ available: false, reason: 'invalid' });
  res.json({ available: !findUserByUsername(u), reason: findUserByUsername(u) ? 'taken' : 'ok' });
});

app.post('/api/auth/register', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const username = String(body.username || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'اكتب اسماً أو لقباً من حرفين على الأقل.' });
  if (!usernameRe.test(username)) {
    return res.status(400).json({ error: 'اليوزر من 3 إلى 20 حرفاً، ويكون بالإنجليزية والأرقام و . أو _ فقط.' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' });
  if (password.length > 128) return res.status(400).json({ error: 'كلمة المرور طويلة جداً.' });
  if (findUserByUsername(username)) return res.status(409).json({ error: 'هذا اليوزر مستخدم بالفعل، جرّب غيره.' });

  const user = {
    id: id(10),
    name,
    username,
    usernameLower: username,
    password: hashPassword(password),
    createdAt: now(),
    lastSeen: now(),
    lastIp: req.socket.remoteAddress || ''
  };
  db.users[user.id] = user;
  saveDb();
  console.log(`👤  حساب جديد: @${username}`);
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const body = req.body || {};
  const username = String(body.username || '').toLowerCase().trim();
  const password = String(body.password || '');
  if (!username || !password) return res.status(400).json({ error: 'اكتب اليوزر وكلمة المرور.' });

  const key = attemptKey(req, username);
  if (attemptsLeft(key) <= 0) {
    return res.status(429).json({ error: 'محاولات كثيرة خاطئة. انتظر 15 دقيقة ثم حاول مجدداً.' });
  }

  const user = findUserByUsername(username);
  if (!user || !user.password || !verifyPassword(password, user.password)) {
    noteFailure(key);
    return res.status(401).json({ error: 'اليوزر أو كلمة المرور غير صحيحة.' });
  }

  loginAttempts.delete(key);
  user.lastSeen = now();
  saveDb();
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/logout', auth, (req, res) => {
  res.json({ ok: true });
});

/* ------------------------------- profile --------------------------------- */
app.get('/api/username/check', auth, (req, res) => {
  const u = String(req.query.u || '').toLowerCase().trim();
  if (!usernameRe.test(u)) return res.json({ available: false, reason: 'invalid' });
  const taken = Object.values(db.users).some((x) => x.usernameLower === u && x.id !== req.user.id);
  res.json({ available: !taken, reason: taken ? 'taken' : 'ok' });
});

app.post('/api/profile/username', auth, (req, res) => {
  const u = String((req.body && req.body.username) || '').toLowerCase().trim();
  if (!usernameRe.test(u)) {
    return res.status(400).json({ error: 'اليوزر من 3 إلى 20 حرفاً، ويكون بالإنجليزية والأرقام و . أو _ فقط.' });
  }
  const taken = Object.values(db.users).some((x) => x.usernameLower === u && x.id !== req.user.id);
  if (taken) return res.status(409).json({ error: 'هذا اليوزر مستخدم بالفعل، جرّب غيره.' });
  req.user.username = u;
  req.user.usernameLower = u;
  saveDb();
  res.json({ user: publicUser(req.user) });
});

/* -------------------------------- search --------------------------------- */
app.get('/api/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim().slice(0, 30);
  if (q.length < 2) return res.json({ users: [] });
  const me = req.user.id;
  const results = Object.values(db.users)
    .filter((u) => u.id !== me && (u.usernameLower || '').includes(q))
    .sort((a, b) => {
      const as = (a.usernameLower || '').startsWith(q) ? 0 : 1;
      const bs = (b.usernameLower || '').startsWith(q) ? 0 : 1;
      return as - bs || (a.usernameLower || '').localeCompare(b.usernameLower || '');
    })
    .slice(0, 20)
    .map((u) => {
      const conv = findConvBetween(me, u.id);
      return {
        user: publicUser(u),
        conv: conv
          ? { id: conv.id, status: conv.status, requestedBy: conv.requestedBy }
          : null
      };
    });
  res.json({ users: results });
});

/* ----------------------------- conversations ----------------------------- */
app.get('/api/conversations', auth, (req, res) => {
  const me = req.user.id;
  const list = Object.values(db.convs)
    .filter((c) => (c.a === me || c.b === me) && c.status === 'accepted')
    .sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt))
    .map((c) => convView(c, me));
  res.json({ conversations: list });
});

app.get('/api/requests', auth, (req, res) => {
  const me = req.user.id;
  const all = Object.values(db.convs).filter(
    (c) => (c.a === me || c.b === me) && c.status === 'pending'
  );
  const incoming = all.filter((c) => c.requestedBy !== me).map((c) => convView(c, me));
  const outgoing = all.filter((c) => c.requestedBy === me).map((c) => convView(c, me));
  res.json({ incoming, outgoing });
});

app.post('/api/requests', auth, (req, res) => {
  const me = req.user.id;
  let target = null;
  if (req.body && req.body.userId) target = db.users[String(req.body.userId)];
  if (!target && req.body && req.body.username) {
    const uname = String(req.body.username).toLowerCase().trim();
    target = Object.values(db.users).find((u) => u.usernameLower === uname);
  }
  if (!target) return res.status(404).json({ error: 'لم يتم العثور على هذا المستخدم.' });
  if (target.id === me) return res.status(400).json({ error: 'لا يمكنك إرسال طلب لنفسك.' });
  if (!target.username) return res.status(400).json({ error: 'هذا المستخدم لم يكمل إعداد حسابه بعد.' });

  let conv = findConvBetween(me, target.id);
  if (conv) {
    if (conv.status === 'accepted') return res.status(409).json({ error: 'المحادثة موجودة بالفعل.', convId: conv.id });
    if (conv.status === 'pending') {
      if (conv.requestedBy === me) return res.status(409).json({ error: 'لقد أرسلت طلباً بالفعل، بانتظار الموافقة.' });
      return res.status(409).json({ error: 'لديك طلب محادثة وارد من هذا المستخدم، افتح الطلبات لقبوله.' });
    }
    conv.status = 'pending';
    conv.requestedBy = me;
    conv.createdAt = now();
    conv.acceptedAt = null;
    conv.lastMessageAt = now();
  } else {
    conv = {
      id: id(10),
      a: me,
      b: target.id,
      status: 'pending',
      requestedBy: me,
      createdAt: now(),
      lastMessageAt: now(),
      acceptedAt: null
    };
    db.convs[conv.id] = conv;
  }
  saveDb();
  io.to('u:' + target.id).emit('request:new', { conv: convView(conv, target.id) });
  res.json({ conv: convView(conv, me) });
});

app.post('/api/requests/:id/accept', auth, (req, res) => {
  const conv = db.convs[req.params.id];
  const me = req.user.id;
  if (!conv || (conv.a !== me && conv.b !== me)) return res.status(404).json({ error: 'الطلب غير موجود.' });
  if (conv.requestedBy === me) return res.status(400).json({ error: 'لا يمكنك قبول طلبك الخاص.' });
  if (conv.status !== 'pending') return res.status(409).json({ error: 'هذا الطلب لم يعد معلقاً.' });
  conv.status = 'accepted';
  conv.acceptedAt = now();
  conv.lastMessageAt = now();
  saveDb();

  const peer = peerOf(conv, me);
  const sys = {
    id: id(12),
    convId: conv.id,
    from: 'system',
    kind: 'system',
    text: 'تم قبول طلب المحادثة. ابدأ بإرسال رسالة 👋',
    createdAt: now(),
    readBy: []
  };
  if (!db.messages[conv.id]) db.messages[conv.id] = [];
  db.messages[conv.id].push(sys);
  saveDb();

  io.to('u:' + peer.id).emit('request:update', { conv: convView(conv, peer.id), status: 'accepted', acceptedBy: me });
  io.to('u:' + me).emit('request:update', { conv: convView(conv, me), status: 'accepted', acceptedBy: me });
  io.to('u:' + peer.id).emit('message:new', { convId: conv.id, message: sys, conv: convView(conv, peer.id) });
  io.to('u:' + me).emit('message:new', { convId: conv.id, message: sys, conv: convView(conv, me) });
  res.json({ conv: convView(conv, me) });
});

app.post('/api/requests/:id/reject', auth, (req, res) => {
  const conv = db.convs[req.params.id];
  const me = req.user.id;
  if (!conv || (conv.a !== me && conv.b !== me)) return res.status(404).json({ error: 'الطلب غير موجود.' });
  if (conv.requestedBy === me) return res.status(400).json({ error: 'لا يمكنك رفض طلبك الخاص.' });
  if (conv.status !== 'pending') return res.status(409).json({ error: 'هذا الطلب لم يعد معلقاً.' });
  conv.status = 'rejected';
  saveDb();
  const peer = peerOf(conv, me);
  io.to('u:' + peer.id).emit('request:update', { conv: null, status: 'rejected', peer: publicUser(req.user) });
  res.json({ ok: true });
});

app.get('/api/conversations/:id/messages', auth, (req, res) => {
  const conv = db.convs[req.params.id];
  const me = req.user.id;
  if (!conv || (conv.a !== me && conv.b !== me)) return res.status(404).json({ error: 'المحادثة غير موجودة.' });
  if (conv.status !== 'accepted') return res.status(403).json({ error: 'المحادثة غير مفعّلة بعد.' });
  res.json({
    conv: convView(conv, me),
    messages: db.messages[conv.id] || []
  });
});

app.post('/api/conversations/:id/read', auth, (req, res) => {
  const conv = db.convs[req.params.id];
  const me = req.user.id;
  if (!conv || (conv.a !== me && conv.b !== me)) return res.status(404).json({ error: 'المحادثة غير موجودة.' });
  let changed = false;
  for (const m of db.messages[conv.id] || []) {
    if (m.from !== me && m.from !== 'system' && !(m.readBy || []).includes(me)) {
      m.readBy = m.readBy || [];
      m.readBy.push(me);
      changed = true;
    }
  }
  if (changed) {
    saveDb();
    const peer = peerOf(conv, me);
    if (peer) io.to('u:' + peer.id).emit('messages:read', { convId: conv.id, readerId: me });
  }
  res.json({ ok: true });
});

app.post('/api/conversations/:id/messages', auth, (req, res) => {
  const conv = db.convs[req.params.id];
  const me = req.user.id;
  if (!conv || (conv.a !== me && conv.b !== me)) return res.status(404).json({ error: 'المحادثة غير موجودة.' });
  if (conv.status !== 'accepted') return res.status(403).json({ error: 'المحادثة غير مفعّلة بعد.' });
  const msg = createMessage(conv, me, req.body || {});
  if (!msg) return res.status(400).json({ error: 'الرسالة فارغة أو الملف غير صالح.' });
  broadcastMessage(conv, msg);
  res.json({ message: msg, conv: convView(conv, me) });
});

function broadcastMessage(conv, msg) {
  for (const uid of [conv.a, conv.b]) {
    io.to('u:' + uid).emit('message:new', { convId: conv.id, message: msg, conv: convView(conv, uid) });
  }
}

/* -------------------------------- uploads --------------------------------- */
const allowedMime = /^(image|video|audio)\//;
const mimeExt = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
  'image/avif': '.avif', 'image/svg+xml': '.svg', 'video/mp4': '.mp4', 'video/webm': '.webm',
  'video/ogg': '.ogv', 'video/quicktime': '.mov', 'audio/mpeg': '.mp3', 'audio/ogg': '.ogg',
  'audio/webm': '.weba', 'audio/wav': '.wav', 'audio/mp4': '.m4a'
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOrig = (path.extname(file.originalname || '').toLowerCase().match(/^\.[a-z0-9]{1,6}$/) || [''])[0];
    const ext = mimeExt[file.mimetype] || safeOrig;
    cb(null, `${Date.now()}-${id(6)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || '';
    if (mime === 'image/svg+xml') return cb(new Error('ملفات SVG غير مسموحة لأسباب أمنية.'));
    if (allowedMime.test(mime)) return cb(null, true);
    cb(new Error('الصور والفيديو والصوت فقط مسموح بها.'));
  }
});

app.post('/api/upload', auth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف أكبر من 80 ميجابايت.' : err.message || 'فشل رفع الملف.';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار ملف.' });
    res.json({
      url: '/uploads/' + req.file.filename,
      mime: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size
    });
  });
});

/* ------------------------------- websocket -------------------------------- */
const onlineUsers = new Set();
const userSockets = new Map();

io.use((socket, next) => {
  const token = (socket.handshake.auth && socket.handshake.auth.token) || socket.handshake.query.token;
  const user = verifyToken(token);
  if (!user) return next(new Error('unauthorized'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  const me = socket.user;
  const uid = me.id;
  socket.join('u:' + uid);

  if (!userSockets.has(uid)) userSockets.set(uid, new Set());
  userSockets.get(uid).add(socket.id);
  const wasOnline = onlineUsers.has(uid);
  onlineUsers.add(uid);
  me.lastSeen = now();
  saveDb();
  if (!wasOnline) socket.broadcast.emit('presence', { userId: uid, online: true });

  socket.on('message:send', (payload, ack) => {
    try {
      const conv = db.convs[payload && payload.convId];
      if (!conv || (conv.a !== uid && conv.b !== uid)) throw new Error('المحادثة غير موجودة.');
      if (conv.status !== 'accepted') throw new Error('المحادثة غير مفعّلة بعد.');
      const msg = createMessage(conv, uid, payload || {});
      if (!msg) throw new Error('الرسالة فارغة.');
      broadcastMessage(conv, msg);
      if (typeof ack === 'function') ack({ ok: true, message: msg, conv: convView(conv, uid) });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  socket.on('typing', (payload) => {
    const conv = db.convs[payload && payload.convId];
    if (!conv || (conv.a !== uid && conv.b !== uid) || conv.status !== 'accepted') return;
    const peer = conv.a === uid ? conv.b : conv.a;
    socket.to('u:' + peer).emit('typing', { convId: conv.id, userId: uid, typing: !!payload.typing });
  });

  /* ----------------------------- WebRTC calls ----------------------------- */
  socket.on('call:offer', (payload, ack) => {
    try {
      const target = db.users[String(payload && payload.to)];
      if (!target) throw new Error('المستخدم غير متصل.');
      const conv = findConvBetween(uid, target.id);
      if (!conv || conv.status !== 'accepted') throw new Error('لا يمكن الاتصال بمستخدم ليس في محادثاتك.');
      const callType = payload.callType === 'video' ? 'video' : 'audio';
      const callId = String(payload.callId || id(8)).slice(0, 60);
      io.to('u:' + target.id).emit('call:incoming', {
        callId,
        from: publicUser(me),
        sdp: payload.sdp,
        callType
      });
      if (typeof ack === 'function') ack({ ok: true, callId });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  const relay = (event, payload) => {
    const target = db.users[String(payload && payload.to)];
    if (!target) return;
    io.to('u:' + target.id).emit(event, {
      callId: payload.callId,
      from: publicUser(me),
      sdp: payload.sdp,
      candidate: payload.candidate,
      reason: payload.reason
    });
  };

  socket.on('call:answer', (p) => relay('call:answer', p));
  socket.on('call:ice', (p) => relay('call:ice', p));
  socket.on('call:reject', (p) => relay('call:reject', p));
  socket.on('call:end', (p) => relay('call:end', p));

  socket.on('disconnect', () => {
    const set = userSockets.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        userSockets.delete(uid);
        onlineUsers.delete(uid);
        me.lastSeen = now();
        saveDb();
        socket.broadcast.emit('presence', { userId: uid, online: false, lastSeen: me.lastSeen });
      }
    }
  });
});

/* ------------------------------ SPA fallback ------------------------------ */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'غير موجود.' });
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'خطأ في الخادم.' });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('');
    console.log('  ██╗   ██╗██╗██████╗ ██╗      ██████╗       ███╗   ███╗███████╗ ██████╗');
    console.log('  ██║   ██║██║██╔══██╗██║     ██╔═══██╗      ████╗ ████║██╔════╝██╔════╝');
    console.log('  ██║   ██║██║██████╔╝██║     ██║   ██║█████╗██╔████╔██║███████╗██║  ███╗');
    console.log('  ╚██╗ ██╔╝██║██╔══██╗██║     ██║   ██║╚════╝██║╚██╔╝██║╚════██║██║   ██║');
    console.log('   ╚████╔╝ ██║██████╔╝███████╗╚██████╔╝      ██║ ╚═╝ ██║███████║╚██████╔╝');
    console.log('    ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝       ╚═╝     ╚═╝╚══════╝ ╚═════╝');
    console.log('');
    console.log(`  ✅  VIBLO-MSG يعمل الآن على:  http://localhost:${PORT}`);
    console.log('  🔐  تسجيل الحسابات وكلمات المرور: مُفعّل');
    console.log('  💬  سجّل حساباً جديداً أو ادخل بحسابك من صفحة الدخول.');
    console.log('');
  });
}

module.exports = { app, server, io };
