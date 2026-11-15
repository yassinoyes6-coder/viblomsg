/* ============================================================
   VIBLO-MSG — front-end application
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const els = {
  loginView: $('loginView'),
  appView: $('appView'),
  authTitle: $('authTitle'),
  authHint: $('authHint'),
  tabLogin: $('tabLogin'),
  tabRegister: $('tabRegister'),
  loginForm: $('loginForm'),
  loginUsername: $('loginUsername'),
  loginPassword: $('loginPassword'),
  loginError: $('loginError'),
  loginSubmitBtn: $('loginSubmitBtn'),
  registerForm: $('registerForm'),
  regName: $('regName'),
  regUsername: $('regUsername'),
  regUsernameState: $('regUsernameState'),
  regPassword: $('regPassword'),
  regPassword2: $('regPassword2'),
  regError: $('regError'),
  registerSubmitBtn: $('registerSubmitBtn'),
  usernameModal: $('usernameModal'),
  setupAvatar: $('setupAvatar'),
  setupName: $('setupName'),
  usernameInput: $('usernameInput'),
  usernameState: $('usernameState'),
  saveUsernameBtn: $('saveUsernameBtn'),
  usernameCloseBtn: $('usernameCloseBtn'),
  myAvatar: $('myAvatar'),
  profileBtn: $('profileBtn'),
  newChatBtn: $('newChatBtn'),
  requestsBtn: $('requestsBtn'),
  reqBadge: $('reqBadge'),
  logoutBtn: $('logoutBtn'),
  chatSearch: $('chatSearch'),
  clearChatSearch: $('clearChatSearch'),
  chatList: $('chatList'),
  listEmpty: $('listEmpty'),
  emptyNewChat: $('emptyNewChat'),
  requestsStrip: $('requestsStrip'),
  chatEmpty: $('chatEmpty'),
  chatView: $('chatView'),
  backBtn: $('backBtn'),
  chatPeerBtn: $('chatPeerBtn'),
  peerAvatar: $('peerAvatar'),
  peerName: $('peerName'),
  peerStatus: $('peerStatus'),
  voiceCallBtn: $('voiceCallBtn'),
  videoCallBtn: $('videoCallBtn'),
  chatMenuBtn: $('chatMenuBtn'),
  headMenu: $('headMenu'),
  menuProfileBtn: $('menuProfileBtn'),
  menuClearBtn: $('menuClearBtn'),
  messages: $('messages'),
  messagesInner: $('messagesInner'),
  typingBar: $('typingBar'),
  typingText: $('typingText'),
  scrollDownBtn: $('scrollDownBtn'),
  messageInput: $('messageInput'),
  sendBtn: $('sendBtn'),
  emojiBtn: $('emojiBtn'),
  emojiPop: $('emojiPop'),
  emojiTabs: $('emojiTabs'),
  emojiGrid: $('emojiGrid'),
  attachBtn: $('attachBtn'),
  attachMenu: $('attachMenu'),
  attachImage: $('attachImage'),
  attachVideo: $('attachVideo'),
  imageInput: $('imageInput'),
  videoInput: $('videoInput'),
  uploadProgress: $('uploadProgress'),
  upBarFill: $('upBarFill'),
  upLabel: $('upLabel'),
  newChatModal: $('newChatModal'),
  userSearchInput: $('userSearchInput'),
  searchIdle: $('searchIdle'),
  searchResults: $('searchResults'),
  requestsModal: $('requestsModal'),
  incomingCount: $('incomingCount'),
  outgoingCount: $('outgoingCount'),
  incomingList: $('incomingList'),
  outgoingList: $('outgoingList'),
  profileModal: $('profileModal'),
  profileAvatar: $('profileAvatar'),
  profileName: $('profileName'),
  profileUsername: $('profileUsername'),
  profileEmail: $('profileEmail'),
  copyUsernameBtn: $('copyUsernameBtn'),
  changeUsernameBtn: $('changeUsernameBtn'),
  profileLogoutBtn: $('profileLogoutBtn'),
  lightbox: $('lightbox'),
  lightboxContent: $('lightboxContent'),
  lightboxClose: $('lightboxClose'),
  lightboxDownload: $('lightboxDownload'),
  incomingModal: $('incomingModal'),
  incomingAvatar: $('incomingAvatar'),
  incomingName: $('incomingName'),
  incomingType: $('incomingType'),
  acceptCallBtn: $('acceptCallBtn'),
  rejectCallBtn: $('rejectCallBtn'),
  callOverlay: $('callOverlay'),
  remoteVideo: $('remoteVideo'),
  localVideo: $('localVideo'),
  callAudioBg: $('callAudioBg'),
  callAvatar: $('callAvatar'),
  callPeerName: $('callPeerName'),
  callStatusText: $('callStatusText'),
  callTimer: $('callTimer'),
  toggleMicBtn: $('toggleMicBtn'),
  toggleCamBtn: $('toggleCamBtn'),
  micIcon: $('micIcon'),
  camIcon: $('camIcon'),
  hangupBtn: $('hangupBtn'),
  toastStack: $('toastStack')
};

const tokenStore = {
  get() {
    try { return sessionStorage.getItem('viblo_token') || localStorage.getItem('viblo_token') || ''; }
    catch { return localStorage.getItem('viblo_token') || ''; }
  },
  set(token) {
    try { sessionStorage.setItem('viblo_token', token); } catch {}
    try { localStorage.setItem('viblo_token', token); } catch {}
  },
  clear() {
    try { sessionStorage.removeItem('viblo_token'); } catch {}
    try { localStorage.removeItem('viblo_token'); } catch {}
  }
};

const state = {
  config: { appName: 'VIBLO-MSG' },
  token: tokenStore.get(),
  me: null,
  convs: [],
  requests: { incoming: [], outgoing: [] },
  activeId: null,
  activeConv: null,
  messages: [],
  socket: null,
  presence: new Map(),
  typing: new Map(),
  searchSeq: 0,
  openSeq: 0,
  readTimers: new Map(),
  typingTimer: null,
  typingSent: false,
  profilePeer: null,
  call: null,
  incomingCall: null,
  ringTimer: null,
  callTimeout: null,
  callTick: null,
  audioCtx: null,
  seenConnect: false,
  replyPeer: null,
  followBottom: true
};

/* ============================ helpers ============================ */
const timeFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
const shortDateFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'numeric' });
const longDateFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function formatTime(ts) {
  try { return timeFmt.format(new Date(ts)); } catch { return ''; }
}
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function dayLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (dayKey(ts) === dayKey(now)) return 'اليوم';
  const y = new Date(now.getTime() - 86400000);
  if (dayKey(ts) === dayKey(y)) return 'أمس';
  return longDateFmt.format(d);
}
function shortWhen(ts) {
  if (dayKey(ts) === dayKey(Date.now())) return formatTime(ts);
  const y = new Date(Date.now() - 86400000);
  if (dayKey(ts) === dayKey(y)) return 'أمس';
  return shortDateFmt.format(new Date(ts));
}
function formatLastSeen(ts) {
  if (!ts) return 'غير متصل';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'آخر ظهور الآن';
  if (diff < 3600000) return `آخر ظهور قبل ${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return `آخر ظهور قبل ${Math.floor(diff / 3600000)} س`;
  return `آخر ظهور ${shortWhen(ts)}`;
}
function hueFor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
function initialOf(user) {
  const n = (user && (user.name || user.username)) || '?';
  return n.trim().charAt(0).toUpperCase() || '?';
}
function avatarHTML(user, cls = '') {
  if (user && user.picture) {
    return `<span class="avatar ${cls}"><img src="${esc(user.picture)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  }
  const h = hueFor((user && (user.username || user.name)) || 'viblo');
  return `<span class="avatar ${cls}" style="background:linear-gradient(135deg,hsl(${h} 38% 30%),hsl(${(h + 40) % 360} 42% 22%))"><span class="initial">${esc(initialOf(user))}</span></span>`;
}
function profileAvatarHTML(user) {
  if (!user) return '';
  if (user.picture) return `<img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">`;
  const h = hueFor((user.username || user.name) || 'viblo');
  return `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,hsl(${h} 38% 32%),hsl(${(h + 40) % 360} 45% 22%));font-size:34px;font-weight:700;color:#d9fdd3">${esc(initialOf(user))}</span>`;
}
function peerOnline(peer) {
  if (!peer) return false;
  const p = state.presence.get(peer.id);
  return p ? !!p.online : !!peer.online;
}
function peerLastSeen(peer) {
  const p = state.presence.get(peer.id);
  return p && p.lastSeen ? p.lastSeen : peer && peer.lastSeen;
}
function mediaURL(url) {
  return typeof url === 'string' && url.startsWith('/uploads/') ? url : '';
}
function previewOf(msg) {
  if (!msg) return '';
  if (msg.kind === 'image') return '📷 صورة';
  if (msg.kind === 'video') return '🎬 فيديو';
  if (msg.kind === 'audio') return '🎤 رسالة صوتية';
  return msg.text || '';
}

async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (state.token) headers.Authorization = 'Bearer ' + state.token;
  let body = opts.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(path, { ...opts, headers, body });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && state.token) {
    logoutLocal();
    throw new Error(data.error || 'انتهت الجلسة، سجّل الدخول مرة أخرى.');
  }
  if (!res.ok) throw new Error(data.error || 'حدث خطأ، حاول مجدداً.');
  return data;
}

function toast(message, type = '', user = null, onClick = null) {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type === 'err'
    ? '<svg class="ic"><use href="#i-close"/></svg>'
    : type === 'ok'
      ? '<svg class="ic"><use href="#i-check"/></svg>'
      : user
        ? avatarHTML(user)
        : '<svg class="ic"><use href="#i-chat"/></svg>';
  el.innerHTML = `${icon}<div class="t-main">${message}</div>`;
  if (onClick) { el.style.cursor = 'pointer'; el.addEventListener('click', onClick); }
  els.toastStack.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }, 4300);
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

function getAudioCtx() {
  try {
    if (!state.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      state.audioCtx = new Ctx();
    }
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume().catch(() => {});
    return state.audioCtx;
  } catch { return null; }
}
function tone(freq, delay, dur, vol = 0.045) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {}
}
function playPop() {
  tone(740, 0, 0.09, 0.035);
  tone(980, 0.08, 0.12, 0.03);
}
function startRingtone(incoming = true) {
  stopRingtone();
  const ring = () => {
    if (incoming) {
      tone(880, 0, 0.28, 0.06);
      tone(660, 0.32, 0.28, 0.06);
    } else {
      tone(440, 0, 0.4, 0.025);
    }
  };
  ring();
  state.ringTimer = setInterval(ring, incoming ? 1700 : 3000);
}
function stopRingtone() {
  if (state.ringTimer) { clearInterval(state.ringTimer); state.ringTimer = null; }
}

/* ============================ login ============================ */
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) state.config = await res.json();
  } catch {}
}

function showAuthError(el, message) {
  el.textContent = message || '';
  el.classList.toggle('hidden', !message);
}

function showAuthMode(mode, focus = true) {
  const isLogin = mode !== 'register';
  els.loginForm.classList.toggle('hidden', !isLogin);
  els.registerForm.classList.toggle('hidden', isLogin);
  els.tabLogin.classList.toggle('active', isLogin);
  els.tabRegister.classList.toggle('active', !isLogin);
  els.tabLogin.setAttribute('aria-selected', String(isLogin));
  els.tabRegister.setAttribute('aria-selected', String(!isLogin));
  els.authTitle.textContent = isLogin ? 'أهلاً بعودتك 👋' : 'أنشئ حسابك 🚀';
  els.authHint.textContent = isLogin
    ? 'سجّل دخولك باليوزر وكلمة المرور للمتابعة.'
    : 'اختر اسماً ويوزراً فريداً وكلمة مرور قوية.';
  showAuthError(els.loginError, '');
  showAuthError(els.regError, '');
  if (focus) setTimeout(() => (isLogin ? els.loginUsername : els.regName).focus(), 80);
}

function bindLogin() {
  els.tabLogin.addEventListener('click', () => showAuthMode('login'));
  els.tabRegister.addEventListener('click', () => showAuthMode('register'));

  document.querySelectorAll('[data-eye]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.eye);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('active', show);
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
      input.focus();
    });
  });

  const sanitize = (input) => {
    const v = input.value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
    if (v !== input.value) input.value = v;
    return v;
  };

  els.loginForm.addEventListener('submit', (e) => { e.preventDefault(); doLogin(); });
  els.registerForm.addEventListener('submit', (e) => { e.preventDefault(); doRegister(); });

  els.loginUsername.addEventListener('input', () => {
    sanitize(els.loginUsername);
    showAuthError(els.loginError, '');
  });
  els.loginPassword.addEventListener('input', () => showAuthError(els.loginError, ''));

  els.regName.addEventListener('input', () => showAuthError(els.regError, ''));
  els.regPassword.addEventListener('input', () => showAuthError(els.regError, ''));
  els.regPassword2.addEventListener('input', () => showAuthError(els.regError, ''));
  els.regUsername.addEventListener('input', () => {
    showAuthError(els.regError, '');
    checkRegUsername(sanitize(els.regUsername));
  });
}

async function doLogin() {
  const username = els.loginUsername.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  showAuthError(els.loginError, '');
  if (!username || !password) {
    showAuthError(els.loginError, 'اكتب اليوزر وكلمة المرور.');
    (!username ? els.loginUsername : els.loginPassword).focus();
    return;
  }
  els.loginSubmitBtn.disabled = true;
  els.loginSubmitBtn.textContent = 'جارٍ الدخول…';
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
    await handleAuthSuccess(data);
  } catch (err) {
    showAuthError(els.loginError, err.message);
    els.loginPassword.select();
  } finally {
    els.loginSubmitBtn.disabled = false;
    els.loginSubmitBtn.textContent = 'دخول';
  }
}

let regCheckTimer = null;
let regUsernameAvailable = false;

function checkRegUsername(raw) {
  const u = String(raw || '').toLowerCase().trim();
  regUsernameAvailable = false;
  if (!u) {
    els.regUsernameState.textContent = '3–20 حرفاً إنجليزياً أو أرقام أو . _';
    els.regUsernameState.className = 'field-state';
    return;
  }
  if (!/^[a-z0-9._]{3,20}$/.test(u)) {
    els.regUsernameState.textContent = 'اليوزر يجب أن يكون 3–20 حرفاً، إنجليزي/أرقام/نقطة/شرطة سفلية فقط.';
    els.regUsernameState.className = 'field-state err';
    return;
  }
  els.regUsernameState.textContent = 'جارٍ التحقق من التوفّر…';
  els.regUsernameState.className = 'field-state';
  clearTimeout(regCheckTimer);
  regCheckTimer = setTimeout(async () => {
    try {
      const data = await api('/api/auth/check-username?u=' + encodeURIComponent(u));
      if (data.available) {
        regUsernameAvailable = true;
        els.regUsernameState.textContent = '✓ اليوزر متاح، يمكنك استخدامه.';
        els.regUsernameState.className = 'field-state ok';
      } else {
        els.regUsernameState.textContent = '✕ هذا اليوزر محجوز، جرّب اسماً آخر.';
        els.regUsernameState.className = 'field-state err';
      }
    } catch (err) {
      els.regUsernameState.textContent = err.message;
      els.regUsernameState.className = 'field-state err';
    }
  }, 320);
}

async function doRegister() {
  const name = els.regName.value.trim().replace(/\s+/g, ' ');
  const username = els.regUsername.value.trim().toLowerCase();
  const password = els.regPassword.value;
  const password2 = els.regPassword2.value;
  showAuthError(els.regError, '');

  if (name.length < 2) { showAuthError(els.regError, 'اكتب اسماً أو لقباً من حرفين على الأقل.'); els.regName.focus(); return; }
  if (!/^[a-z0-9._]{3,20}$/.test(username)) {
    showAuthError(els.regError, 'اليوزر من 3 إلى 20 حرفاً، بالإنجليزية والأرقام و . أو _ فقط.');
    els.regUsername.focus();
    return;
  }
  if (!regUsernameAvailable) {
    showAuthError(els.regError, 'تأكد من أن اليوزر متاح قبل إنشاء الحساب.');
    els.regUsername.focus();
    return;
  }
  if (password.length < 8) { showAuthError(els.regError, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'); els.regPassword.focus(); return; }
  if (password !== password2) { showAuthError(els.regError, 'كلمتا المرور غير متطابقتين.'); els.regPassword2.focus(); return; }

  els.registerSubmitBtn.disabled = true;
  els.registerSubmitBtn.textContent = 'جارٍ إنشاء الحساب…';
  try {
    const data = await api('/api/auth/register', { method: 'POST', body: { name, username, password } });
    await handleAuthSuccess(data);
    toast(`مرحباً ${name} 👋 تم إنشاء حسابك @${username}`, 'ok');
  } catch (err) {
    showAuthError(els.regError, err.message);
  } finally {
    els.registerSubmitBtn.disabled = false;
    els.registerSubmitBtn.textContent = 'إنشاء الحساب';
  }
}

async function handleAuthSuccess(data) {
  state.token = data.token;
  state.me = data.user;
  tokenStore.set(data.token);
  await enterApp();
}

async function tryRestore() {
  try {
    const data = await api('/api/me');
    state.me = data.user;
    await enterApp();
    return true;
  } catch {
    state.token = '';
    tokenStore.clear();
    return false;
  }
}

async function enterApp() {
  els.loginView.classList.add('hidden');
  els.appView.classList.remove('hidden');
  renderMe();
  connectSocket();
  await Promise.all([loadConversations(), loadRequests()]);
  if (!state.me.username) openUsernameModal(false);
}

function logoutLocal() {
  state.token = '';
  state.me = null;
  tokenStore.clear();
  if (state.socket) { try { state.socket.disconnect(); } catch {} state.socket = null; }
  window.location.reload();
}

/* ============================ username ============================ */
let usernameCheckTimer = null;
let usernameAvailable = false;

function openUsernameModal(force) {
  if (!state.me) return;
  if (!force && state.me.username) return;
  usernameAvailable = false;
  els.setupName.textContent = state.me.name || '';
  els.setupAvatar.innerHTML = profileAvatarHTML(state.me);
  els.usernameInput.value = state.me.username || '';
  els.usernameCloseBtn.classList.toggle('hidden', !state.me.username);
  els.saveUsernameBtn.disabled = true;
  els.usernameState.textContent = '3–20 حرفاً إنجليزياً أو أرقام أو . _';
  els.usernameState.className = 'field-state';
  openModal('usernameModal');
  setTimeout(() => els.usernameInput.focus(), 120);
  if (els.usernameInput.value) checkUsername(els.usernameInput.value);
}

function checkUsername(raw) {
  const u = raw.toLowerCase().trim();
  usernameAvailable = false;
  els.saveUsernameBtn.disabled = true;
  if (!u) {
    els.usernameState.textContent = '3–20 حرفاً إنجليزياً أو أرقام أو . _';
    els.usernameState.className = 'field-state';
    return;
  }
  if (!/^[a-z0-9._]{3,20}$/.test(u)) {
    els.usernameState.textContent = 'اليوزر يجب أن يكون 3–20 حرفاً، إنجليزي/أرقام/نقطة/شرطة سفلية فقط.';
    els.usernameState.className = 'field-state err';
    return;
  }
  els.usernameState.textContent = 'جارٍ التحقق…';
  els.usernameState.className = 'field-state';
  clearTimeout(usernameCheckTimer);
  usernameCheckTimer = setTimeout(async () => {
    try {
      const data = await api('/api/username/check?u=' + encodeURIComponent(u));
      if (data.available) {
        usernameAvailable = true;
        els.saveUsernameBtn.disabled = false;
        els.usernameState.textContent = '✓ اليوزر متاح، يمكنك استخدامه.';
        els.usernameState.className = 'field-state ok';
      } else {
        els.usernameState.textContent = '✕ هذا اليوزر محجوز، جرّب اسماً آخر.';
        els.usernameState.className = 'field-state err';
      }
    } catch (err) {
      els.usernameState.textContent = err.message;
      els.usernameState.className = 'field-state err';
    }
  }, 320);
}

async function saveUsername() {
  const u = els.usernameInput.value.toLowerCase().trim();
  if (!usernameAvailable) return;
  els.saveUsernameBtn.disabled = true;
  try {
    const data = await api('/api/profile/username', { method: 'POST', body: { username: u } });
    state.me = data.user;
    closeModal('usernameModal');
    renderMe();
    toast(`تم حفظ يوزرك @${esc(u)} بنجاح 🎉`, 'ok');
  } catch (err) {
    toast(esc(err.message), 'err');
    els.saveUsernameBtn.disabled = false;
  }
}

/* ============================ profile ============================ */
function renderMe() {
  if (!state.me) return;
  els.myAvatar.outerHTML = avatarHTML(state.me).replace('class="avatar "', 'class="avatar" id="myAvatar"');
  // re-bind reference after outerHTML replacement
  els.myAvatar = $('myAvatar');
  const initials = initialOf(state.me);
  void initials;
}

function openMyProfile() {
  if (!state.me) return;
  state.profilePeer = null;
  els.profileAvatar.innerHTML = profileAvatarHTML(state.me);
  els.profileName.textContent = state.me.name || '';
  els.profileUsername.textContent = state.me.username ? '@' + state.me.username : '@—';
  els.profileEmail.textContent = state.me.email || 'حساب VIBLO-MSG';
  els.changeUsernameBtn.classList.remove('hidden');
  els.profileLogoutBtn.classList.remove('hidden');
  els.copyUsernameBtn.classList.toggle('hidden', !state.me.username);
  openModal('profileModal');
}

function openPeerProfile(peer) {
  if (!peer) return;
  state.profilePeer = peer;
  els.profileAvatar.innerHTML = profileAvatarHTML(peer);
  els.profileName.textContent = peer.name || '';
  els.profileUsername.textContent = peer.username ? '@' + peer.username : '@—';
  els.profileEmail.textContent = peerOnline(peer) ? 'متصل الآن' : 'عضو في VIBLO-MSG';
  els.changeUsernameBtn.classList.add('hidden');
  els.profileLogoutBtn.classList.add('hidden');
  els.copyUsernameBtn.classList.toggle('hidden', !peer.username);
  openModal('profileModal');
}

/* ============================ socket ============================ */
function connectSocket() {
  if (state.socket) { try { state.socket.disconnect(); } catch {} }
  const socket = io({ auth: { token: state.token } });
  state.socket = socket;

  socket.on('connect', () => {
    if (state.seenConnect) {
      loadConversations().catch(() => {});
      loadRequests().catch(() => {});
      if (state.activeId) refreshActiveHeader();
    }
    state.seenConnect = true;
  });
  socket.on('connect_error', (err) => {
    if (err && /unauthorized/i.test(err.message || '')) logoutLocal();
    else toast('تعذر الاتصال بالخادم. تحقق من الشبكة.', 'err');
  });
  socket.on('presence', (p) => {
    if (!p || !p.userId) return;
    state.presence.set(p.userId, { online: !!p.online, lastSeen: p.lastSeen || Date.now() });
    if (state.activeConv && state.activeConv.peer && state.activeConv.peer.id === p.userId) refreshActiveHeader();
    renderChatList();
  });
  socket.on('message:new', (payload) => {
    if (!payload || !payload.message) return;
    handleIncomingMessage(payload);
  });
  socket.on('messages:read', (p) => {
    if (!p) return;
    if (state.activeId === p.convId) {
      let changed = false;
      for (const m of state.messages) {
        if (m.from === state.me.id && !(m.readBy || []).includes(p.readerId)) {
          m.readBy = m.readBy || [];
          m.readBy.push(p.readerId);
          changed = true;
        }
      }
      if (changed) renderMessages(false);
    }
    const conv = state.convs.find((c) => c.id === p.convId);
    if (conv && conv.lastMessage && conv.lastMessage.from === state.me.id) {
      conv.lastMessage.read = true;
      renderChatList();
    }
  });
  socket.on('typing', (p) => {
    if (!p) return;
    if (p.typing) {
      state.typing.set(p.convId, Date.now() + 4500);
      setTimeout(() => {
        if ((state.typing.get(p.convId) || 0) < Date.now()) {
          state.typing.delete(p.convId);
          if (state.activeId === p.convId) refreshActiveHeader();
        }
      }, 4700);
    } else {
      state.typing.delete(p.convId);
    }
    if (state.activeId === p.convId) refreshActiveHeader();
  });
  socket.on('request:new', (p) => {
    loadRequests().catch(() => {});
    const name = p && p.conv && p.conv.peer ? p.conv.peer.name : 'مستخدم';
    playPop();
    toast(`لديك طلب محادثة جديد من <b>${esc(name)}</b>`, '', p && p.conv ? p.conv.peer : null, () => openRequests());
  });
  socket.on('request:update', (p) => {
    loadRequests().catch(() => {});
    loadConversations().catch(() => {});
    if (p && p.status === 'accepted') {
      if (!p.acceptedBy || p.acceptedBy !== state.me.id) {
        toast('تم قبول طلب المحادثة، يمكنك البدء الآن 🎉', 'ok');
      }
    } else if (p && p.status === 'rejected') {
      toast('تم رفض طلب المحادثة.', '');
    }
  });
  socket.on('call:incoming', (p) => handleIncomingCall(p));
  socket.on('call:answer', (p) => onCallAnswer(p));
  socket.on('call:ice', (p) => onCallIce(p));
  socket.on('call:reject', (p) => {
    if (state.call && (!p || p.callId === state.call.callId)) {
      const wasIncoming = state.call.role === 'callee';
      cleanupCall();
      toast(wasIncoming ? 'تم إنهاء المكالمة.' : 'تم رفض المكالمة.', '');
    }
    if (state.incomingCall) {
      clearIncomingCall();
      toast('تم إلغاء المكالمة.', '');
    }
  });
  socket.on('call:end', (p) => {
    if (state.call && (!p || p.callId === state.call.callId)) {
      cleanupCall();
      toast('انتهت المكالمة.', '');
    }
    if (state.incomingCall && (!p || p.callId === state.incomingCall.callId)) {
      clearIncomingCall();
    }
  });
}

/* ============================ conversations ============================ */
async function loadConversations() {
  const data = await api('/api/conversations');
  const active = data.conversations.find((c) => c.id === state.activeId);
  state.convs = data.conversations;
  if (active) {
    state.activeConv = active;
    refreshActiveHeader();
  } else if (state.activeId) {
    // conversation disappeared; keep UI but avoid stale peer
  }
  renderChatList();
  updateTitle();
}

async function loadRequests() {
  const data = await api('/api/requests');
  state.requests = data;
  renderRequests();
  renderRequestsStrip();
  const total = data.incoming.length;
  els.reqBadge.textContent = total > 9 ? '9+' : String(total);
  els.reqBadge.classList.toggle('hidden', total === 0);
}

function renderChatList() {
  const q = (els.chatSearch.value || '').toLowerCase().trim();
  let list = state.convs.slice();
  if (q) {
    list = list.filter((c) => {
      const p = c.peer || {};
      return (p.name || '').toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q);
    });
  }
  if (!list.length) {
    els.chatList.innerHTML = '';
    els.listEmpty.classList.remove('hidden');
    if (state.convs.length === 0) {
      els.listEmpty.querySelector('h3').textContent = 'لا توجد محادثات بعد';
      els.listEmpty.querySelector('p').textContent = 'ابحث عن يوزر صديقك وأرسل له طلب محادثة.';
      els.emptyNewChat.classList.remove('hidden');
    } else {
      els.listEmpty.querySelector('h3').textContent = 'لا توجد نتائج';
      els.listEmpty.querySelector('p').textContent = 'جرّب البحث باسم أو يوزر آخر.';
      els.emptyNewChat.classList.add('hidden');
    }
    return;
  }
  els.listEmpty.classList.add('hidden');
  els.chatList.innerHTML = list.map((c) => {
    const p = c.peer || { name: 'مستخدم' };
    const online = peerOnline(p);
    const last = c.lastMessage;
    const out = last && last.from === state.me.id;
    let preview = 'ابدأ المحادثة الآن 👋';
    if (last) {
      preview = previewOf(last);
      if (out) preview = 'أنت: ' + preview;
    }
    const ticks = out && last
      ? `<span class="ticks ${last.read ? 'read' : ''}">✓✓</span>`
      : '';
    const unread = c.unread || 0;
    const statusBadge = c.status === 'pending'
      ? `<span class="ci-badge pending">${c.requestedBy === state.me.id ? 'بانتظار الموافقة' : 'طلب وارد'}</span>`
      : unread > 0
        ? `<span class="ci-badge">${unread > 99 ? '99+' : unread}</span>`
        : '';
    return `
      <div class="chat-item ${c.id === state.activeId ? 'active' : ''} ${unread > 0 ? 'unread' : ''}" data-id="${esc(c.id)}">
        <span class="avatar-wrap">${avatarHTML(p)}${online ? '<span class="online-ring"></span>' : ''}</span>
        <div class="ci-main">
          <div class="ci-top"><span class="ci-name">${esc(p.name || p.username || 'مستخدم')}</span><span class="ci-time">${last ? shortWhen(last.createdAt) : shortWhen(c.lastMessageAt || c.createdAt)}</span></div>
          <div class="ci-bottom"><span class="ci-preview">${ticks}${esc(preview)}</span>${statusBadge}</div>
        </div>
      </div>`;
  }).join('');
}

function renderRequestsStrip() {
  const incoming = state.requests.incoming || [];
  if (!incoming.length) { els.requestsStrip.classList.add('hidden'); els.requestsStrip.innerHTML = ''; return; }
  const c = incoming[0];
  const p = c.peer || {};
  els.requestsStrip.classList.remove('hidden');
  els.requestsStrip.innerHTML = `
    ${avatarHTML(p)}
    <div class="rs-text"><b>${esc(p.name || p.username || 'مستخدم')}</b><small>${incoming.length > 1 ? `${incoming.length} طلبات محادثة واردة` : 'يريد بدء محادثة معك'}</small></div>
    <button class="rs-open">مراجعة</button>`;
  els.requestsStrip.onclick = openRequests;
}

function renderRequests() {
  const inc = state.requests.incoming || [];
  const out = state.requests.outgoing || [];
  els.incomingCount.textContent = String(inc.length);
  els.outgoingCount.textContent = String(out.length);
  els.incomingList.innerHTML = inc.length
    ? inc.map((c) => {
        const p = c.peer || {};
        return `<div class="req-card">${avatarHTML(p)}<div class="req-info"><b>${esc(p.name || '')}</b><small>@${esc(p.username || '')}</small></div><div class="req-actions"><button class="accept" data-req-action="accept" data-id="${esc(c.id)}" title="قبول" aria-label="قبول طلب المحادثة"><svg class="ic"><use href="#i-check"/></svg></button><button class="reject" data-req-action="reject" data-id="${esc(c.id)}" title="رفض" aria-label="رفض طلب المحادثة"><svg class="ic"><use href="#i-close"/></svg></button></div></div>`;
      }).join('')
    : '<div class="req-empty">لا توجد طلبات واردة حالياً.</div>';
  els.outgoingList.innerHTML = out.length
    ? out.map((c) => {
        const p = c.peer || {};
        return `<div class="req-card">${avatarHTML(p)}<div class="req-info"><b>${esc(p.name || '')}</b><small>@${esc(p.username || '')}</small></div><span class="pending-label">بانتظار الموافقة…</span></div>`;
      }).join('')
    : '<div class="req-empty">لم ترسل أي طلبات معلقة.</div>';
}

function updateTitle() {
  const total = state.convs.reduce((n, c) => n + (c.unread || 0), 0);
  document.title = total > 0 ? `(${total}) VIBLO-MSG` : 'VIBLO-MSG — محادثاتك بسرعة البرق';
}

async function openConversation(convId, opts = {}) {
  let conv = state.convs.find((c) => c.id === convId);
  if (!conv) {
    await loadConversations();
    conv = state.convs.find((c) => c.id === convId);
  }
  if (!conv) { toast('لا يمكن فتح هذه المحادثة.', 'err'); return; }
  if (conv.status !== 'accepted') { openRequests(); return; }

  state.activeId = convId;
  state.activeConv = conv;
  state.messages = [];
  state.followBottom = true;
  state.openSeq++;
  const seq = state.openSeq;
  els.chatEmpty.classList.add('hidden');
  els.chatView.classList.remove('hidden');
  els.appView.classList.add('chat-open');
  renderChatList();
  refreshActiveHeader();
  els.messagesInner.innerHTML = '<div class="msgs-empty">جارٍ تحميل الرسائل…</div>';
  els.scrollDownBtn.classList.add('hidden');
  closeEmoji();
  closeAttach();
  els.headMenu.classList.add('hidden');

  try {
    const data = await api(`/api/conversations/${convId}/messages`);
    if (seq !== state.openSeq) return;
    state.activeConv = data.conv;
    const idx = state.convs.findIndex((c) => c.id === convId);
    if (idx >= 0) state.convs[idx] = data.conv;
    state.messages = data.messages || [];
    renderMessages(true);
    if (conv.unread) { conv.unread = 0; }
    markRead(convId);
    renderChatList();
    updateTitle();
    refreshActiveHeader();
    if (window.innerWidth > 900) setTimeout(() => els.messageInput.focus(), 120);
  } catch (err) {
    if (seq !== state.openSeq) return;
    toast(esc(err.message), 'err');
    els.messagesInner.innerHTML = `<div class="msgs-empty">${esc(err.message)}</div>`;
  }
}

function refreshActiveHeader() {
  const conv = state.activeConv;
  if (!conv) return;
  const p = conv.peer || {};
  els.peerAvatar.outerHTML = avatarHTML(p, 'sm').replace('class="avatar sm"', 'class="avatar sm" id="peerAvatar"');
  els.peerAvatar = $('peerAvatar');
  els.peerName.textContent = p.name || p.username || 'مستخدم';
  const typingUntil = state.typing.get(conv.id);
  const typing = typingUntil && typingUntil > Date.now();
  const online = peerOnline(p);
  els.peerStatus.classList.toggle('online', online && !typing);
  els.peerStatus.classList.toggle('typing', !!typing);
  els.peerStatus.textContent = typing ? 'يكتب الآن…' : online ? 'متصل الآن' : formatLastSeen(peerLastSeen(p));
  els.typingBar.classList.toggle('hidden', !typing);
  if (typing) els.typingText.textContent = `${p.name || 'المستخدم'} يكتب…`;
}

function markRead(convId) {
  clearTimeout(state.readTimers.get(convId));
  const t = setTimeout(async () => {
    try { await api(`/api/conversations/${convId}/read`, { method: 'POST', body: {} }); } catch {}
  }, 220);
  state.readTimers.set(convId, t);
  const conv = state.convs.find((c) => c.id === convId);
  if (conv && conv.unread) {
    conv.unread = 0;
    renderChatList();
    updateTitle();
  }
}

/* ============================ messages ============================ */
function messageHTML(msg) {
  if (!msg) return '';
  if (msg.kind === 'system' || msg.from === 'system') {
    return `<div class="msg system"><div class="system-pill">${esc(msg.text || '')}</div></div>`;
  }
  const out = msg.from === state.me.id;
  const url = msg.media ? mediaURL(msg.media.url) : '';
  let content = '';
  let isMedia = false;
  if (msg.kind === 'image' && url) {
    isMedia = true;
    content = `<div class="msg-media" data-lightbox="${esc(url)}" data-type="image"><img src="${esc(url)}" alt="صورة" loading="lazy">${msg.text ? `<div class="media-caption">${esc(msg.text)}</div>` : ''}</div>`;
  } else if (msg.kind === 'video' && url) {
    isMedia = true;
    content = `<div class="msg-media"><video src="${esc(url)}" controls preload="metadata" playsinline></video>${msg.text ? `<div class="media-caption">${esc(msg.text)}</div>` : ''}</div>`;
  } else if (msg.kind === 'audio' && url) {
    isMedia = true;
    content = `<div class="msg-audio"><span class="audio-ic"><svg class="ic"><use href="#i-mic"/></svg></span><audio src="${esc(url)}" controls preload="metadata"></audio></div>`;
  } else {
    content = `<div class="msg-text">${esc(msg.text || '')}</div>`;
  }
  const read = out && (msg.readBy || []).some((x) => x !== state.me.id);
  const ticks = out ? `<span class="ticks ${read ? 'read' : ''}">✓✓</span>` : '';
  return `<div class="msg ${out ? 'out' : 'in'}" data-id="${esc(msg.id)}"><div class="bubble ${isMedia ? 'media-bubble' : ''}"><div class="msg-bubble-content">${content}</div><div class="msg-meta"><span class="time">${formatTime(msg.createdAt)}</span>${ticks}</div></div></div>`;
}

function renderMessages(scrollBottom = false) {
  if (!state.messages.length) {
    els.messagesInner.innerHTML = '<div class="msgs-empty">لا توجد رسائل بعد… قل مرحباً 👋</div>';
    return;
  }
  let html = '';
  let lastDay = '';
  for (const m of state.messages) {
    const dk = dayKey(m.createdAt);
    if (dk !== lastDay) {
      html += `<div class="day-sep">${esc(dayLabel(m.createdAt))}</div>`;
      lastDay = dk;
    }
    html += messageHTML(m);
  }
  const near = isNearBottom();
  els.messagesInner.innerHTML = html;
  if (scrollBottom || near) scrollToBottom(false);
  bindMediaScroll();
}

function bindMediaScroll() {
  const check = () => {
    if (state.followBottom) scrollToBottom(false);
  };
  els.messagesInner.querySelectorAll('img').forEach((img) => {
    if (img.complete) check();
    else img.addEventListener('load', check, { once: true });
  });
  els.messagesInner.querySelectorAll('video').forEach((v) => {
    if (v.readyState >= 1) check();
    else v.addEventListener('loadedmetadata', check, { once: true });
  });
}

function addMessageToActive(message) {
  if (!state.activeId || state.activeId !== message.convId) return;
  if (state.messages.some((m) => m.id === message.id)) return;
  const prev = state.messages[state.messages.length - 1];
  const near = isNearBottom();
  state.messages.push(message);
  let html = '';
  if (!prev || dayKey(prev.createdAt) !== dayKey(message.createdAt)) html += `<div class="day-sep">${esc(dayLabel(message.createdAt))}</div>`;
  html += messageHTML(message);
  const empty = els.messagesInner.querySelector('.msgs-empty');
  if (empty) empty.remove();
  els.messagesInner.insertAdjacentHTML('beforeend', html);
  if (near || message.from === state.me.id) {
    state.followBottom = true;
    scrollToBottom(true);
  } else {
    state.followBottom = false;
    els.scrollDownBtn.classList.remove('hidden');
  }
  bindMediaScroll();
}

function handleIncomingMessage(payload) {
  const { convId, message, conv } = payload;
  if (!message) return;
  if (conv) {
    const idx = state.convs.findIndex((c) => c.id === convId);
    if (idx >= 0) state.convs[idx] = conv;
    else state.convs.unshift(conv);
  } else {
    const c = state.convs.find((x) => x.id === convId);
    if (c) {
      c.lastMessage = {
        id: message.id, from: message.from, kind: message.kind, text: message.text || '',
        createdAt: message.createdAt, read: (message.readBy || []).some((x) => x !== state.me.id)
      };
      c.lastMessageAt = message.createdAt;
      c.unread = (c.unread || 0) + (message.from !== state.me.id ? 1 : 0);
    } else {
      loadConversations().catch(() => {});
    }
  }
  const convObj = state.convs.find((c) => c.id === convId);
  const incoming = message.from !== state.me.id;

  if (state.activeId === convId) {
    addMessageToActive(message);
    if (incoming) {
      if (!document.hidden) markRead(convId);
      if (convObj) convObj.unread = 0;
    }
  } else if (incoming) {
    playPop();
    const peer = convObj ? convObj.peer : null;
    const name = peer ? peer.name || peer.username : 'رسالة جديدة';
    toast(`<b>${esc(name)}</b><small>${esc(previewOf(message))}</small>`, '', peer, () => {
      if (convObj) openConversation(convId);
    });
  }
  renderChatList();
  updateTitle();
  if (convObj && state.activeConv && convObj.id === state.activeConv.id) state.activeConv = convObj;
}

async function sendMessageTo(convId, payload) {
  const sendViaSocket = state.socket && state.socket.connected;
  try {
    let res;
    if (sendViaSocket) {
      res = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('انتهت مهلة الإرسال. تحقق من الاتصال.')), 10000);
        state.socket.emit('message:send', { ...payload, convId }, (r) => {
          clearTimeout(timer);
          if (r && r.ok) resolve(r);
          else reject(new Error((r && r.error) || 'تعذر إرسال الرسالة.'));
        });
      });
    } else {
      res = await api(`/api/conversations/${convId}/messages`, { method: 'POST', body: payload });
    }
    if (res.message) addMessageToActive(res.message);
    if (res.conv) {
      const idx = state.convs.findIndex((c) => c.id === convId);
      if (idx >= 0) state.convs[idx] = res.conv;
      if (state.activeId === convId) state.activeConv = res.conv;
    }
    renderChatList();
    return res;
  } catch (err) {
    toast(esc(err.message || 'تعذر إرسال الرسالة.'), 'err');
    throw err;
  }
}

async function sendText() {
  const text = els.messageInput.value.trim();
  if (!text || !state.activeId) return;
  els.messageInput.value = '';
  autoGrow();
  updateSendState();
  emitTyping(false);
  try {
    await sendMessageTo(state.activeId, { kind: 'text', text });
  } catch {
    if (!els.messageInput.value) els.messageInput.value = text;
    autoGrow();
    updateSendState();
  }
}

/* ============================ uploads ============================ */
function setUploadProgress(pct, label) {
  els.uploadProgress.classList.remove('hidden');
  els.upBarFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  els.upLabel.textContent = label || 'جارٍ رفع الملف…';
}
function hideUploadProgress() {
  els.uploadProgress.classList.add('hidden');
  els.upBarFill.style.width = '0%';
}

function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', 'Bearer ' + state.token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 90);
        setUploadProgress(pct, `جارٍ رفع الملف… ${Math.round((e.loaded / e.total) * 100)}%`);
      }
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || 'تعذر رفع الملف.'));
    };
    xhr.onerror = () => reject(new Error('تعذر الاتصال بالخادم أثناء الرفع.'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

async function handleFile(file, kind, convId) {
  if (!file || !convId) return;
  if (file.size > 80 * 1024 * 1024) { toast('حجم الملف أكبر من 80 ميجابايت.', 'err'); return; }
  const label = kind === 'image' ? 'الصورة' : 'الفيديو';
  try {
    setUploadProgress(2, `جارٍ رفع ${label}…`);
    const up = await uploadFile(file);
    setUploadProgress(97, 'جارٍ الإرسال…');
    await sendMessageTo(convId, {
      kind,
      text: '',
      media: { url: up.url, mime: up.mime, name: file.name, size: up.size, duration: 0 }
    });
    setUploadProgress(100, 'تم الإرسال ✓');
    setTimeout(hideUploadProgress, 500);
  } catch (err) {
    hideUploadProgress();
    toast(esc(err.message || 'تعذر رفع الملف.'), 'err');
  }
}

/* ============================ typing / composer ============================ */
function autoGrow() {
  const ta = els.messageInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}
function updateSendState() {
  els.sendBtn.disabled = !els.messageInput.value.trim() || !state.activeId;
}
function emitTyping(typing) {
  if (!state.activeId || !state.socket || !state.socket.connected) return;
  if (typing === state.typingSent) return;
  state.typingSent = typing;
  state.socket.emit('typing', { convId: state.activeId, typing });
}
function onComposerInput() {
  autoGrow();
  updateSendState();
  if (!state.activeId) return;
  emitTyping(true);
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => emitTyping(false), 1600);
}

/* ============================ emoji ============================ */
const EMOJI = {
  '😀': ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','💌','🌹','🥀','🌷','🌺','🌸','💐','🌼','🌻'],
  '👍': ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','✍️','💪','🦾','👏','🙌','👐','🤲','🫶','🤌','🫰','🫱','🫲','🫳','🫴'],
  '🐶': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈'],
  '🍕': ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥕','🌽','🌶️','🥒','🥬','🧄','🧅','🍄','🥜','🍞','🥐','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🍜','🍝','🍲','🍛','🍣','🍱','🍤','🍙','🍚','🍰','🎂','🍫','🍿','☕','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🍹'],
  '⚽': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🏑','🥍','🏏','⛳','🏹','🎣','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎗️','🎫','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','🎯','🎳','🎮','🎰','🧩','🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚀','✈️','🚁','⛵','🚢','🏝️','🌋','🌅','🌃','🌌']
};
function initEmoji() {
  const cats = Object.keys(EMOJI);
  els.emojiTabs.innerHTML = cats.map((c, i) => `<button data-cat="${i}" class="${i === 0 ? 'active' : ''}" type="button">${c}</button>`).join('');
  renderEmojiGrid(0);
  els.emojiTabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    els.emojiTabs.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    renderEmojiGrid(Number(b.dataset.cat));
  });
  els.emojiGrid.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    insertAtCursor(b.textContent);
  });
}
function renderEmojiGrid(cat) {
  const arr = Object.values(EMOJI)[cat] || [];
  els.emojiGrid.innerHTML = arr.map((e) => `<button type="button">${e}</button>`).join('');
  els.emojiGrid.scrollTop = 0;
}
function insertAtCursor(text) {
  const ta = els.messageInput;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  const pos = start + text.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
  onComposerInput();
}
function closeEmoji() { els.emojiPop.classList.add('hidden'); els.emojiBtn.classList.remove('active'); }
function closeAttach() { els.attachMenu.classList.add('hidden'); els.attachBtn.classList.remove('active'); }

/* ============================ new chat ============================ */
let searchTimer = null;
function openNewChat() {
  openModal('newChatModal');
  els.userSearchInput.value = '';
  els.searchResults.innerHTML = '';
  els.searchIdle.classList.remove('hidden');
  setTimeout(() => els.userSearchInput.focus(), 100);
}

async function runUserSearch() {
  const q = els.userSearchInput.value.trim().toLowerCase();
  const seq = ++state.searchSeq;
  if (q.length < 2) {
    els.searchIdle.classList.remove('hidden');
    els.searchResults.innerHTML = '';
    return;
  }
  els.searchIdle.classList.add('hidden');
  els.searchResults.innerHTML = '<div class="req-empty">جارٍ البحث…</div>';
  try {
    const data = await api('/api/search?q=' + encodeURIComponent(q));
    if (seq !== state.searchSeq) return;
    renderSearchResults(data.users || []);
  } catch (err) {
    if (seq !== state.searchSeq) return;
    els.searchResults.innerHTML = `<div class="req-empty">${esc(err.message)}</div>`;
  }
}

function renderSearchResults(results) {
  if (!results.length) {
    els.searchResults.innerHTML = '<div class="req-empty">لا يوجد مستخدم بهذا اليوزر. تأكد من الكتابة أو اسأل صديقك عن يوزره.</div>';
    return;
  }
  els.searchResults.innerHTML = results.map(({ user, conv }) => {
    const p = user;
    let btn = '';
    if (conv && conv.status === 'accepted') {
      btn = `<button class="ur-btn" data-action="open" data-conv="${esc(conv.id)}">فتح المحادثة</button>`;
    } else if (conv && conv.status === 'pending' && conv.requestedBy === state.me.id) {
      btn = '<span class="ur-btn pending">بانتظار الموافقة…</span>';
    } else if (conv && conv.status === 'pending' && conv.requestedBy !== state.me.id) {
      btn = `<button class="ur-btn blue" data-action="accept" data-conv="${esc(conv.id)}">قبول الطلب</button>`;
    } else {
      btn = `<button class="ur-btn" data-action="request" data-user="${esc(p.id)}">طلب محادثة</button>`;
    }
    return `<div class="user-result">${avatarHTML(p)}<div class="ur-meta"><b>${esc(p.name || p.username || 'مستخدم')}</b><small>@${esc(p.username || '')}${peerOnline(p) ? ' • متصل الآن' : ''}</small></div>${btn}</div>`;
  }).join('');
}

async function onSearchResultClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  try {
    if (action === 'open') {
      closeModal('newChatModal');
      await loadConversations();
      openConversation(btn.dataset.conv);
    } else if (action === 'request') {
      btn.disabled = true;
      await api('/api/requests', { method: 'POST', body: { userId: btn.dataset.user } });
      btn.outerHTML = '<span class="ur-btn pending">تم إرسال الطلب ✓</span>';
      toast('تم إرسال طلب المحادثة، بانتظار الموافقة.', 'ok');
      loadRequests().catch(() => {});
    } else if (action === 'accept') {
      btn.disabled = true;
      await acceptRequest(btn.dataset.conv);
    }
  } catch (err) {
    toast(esc(err.message), 'err');
    btn.disabled = false;
  }
}

/* ============================ requests actions ============================ */
function openRequests() {
  renderRequests();
  openModal('requestsModal');
}

async function acceptRequest(convId) {
  try {
    await api(`/api/requests/${convId}/accept`, { method: 'POST', body: {} });
    closeModal('requestsModal');
    closeModal('newChatModal');
    toast('تم قبول طلب المحادثة 🎉', 'ok');
    await Promise.all([loadConversations(), loadRequests()]);
    await openConversation(convId);
  } catch (err) {
    toast(esc(err.message), 'err');
  }
}
async function rejectRequest(convId) {
  try {
    await api(`/api/requests/${convId}/reject`, { method: 'POST', body: {} });
    toast('تم رفض طلب المحادثة.');
    await loadRequests();
  } catch (err) {
    toast(esc(err.message), 'err');
  }
}

/* ============================ stats ============================ */
function isNearBottom() {
  const el = els.messages;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
}
function scrollToBottom(smooth) {
  hideScrollDown();
  state.followBottom = true;
  requestAnimationFrame(() => {
    els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
}
function showScrollDown() { els.scrollDownBtn.classList.remove('hidden'); }
function hideScrollDown() { els.scrollDownBtn.classList.add('hidden'); }

/* ============================ WebRTC calls ============================ */
const DEFAULT_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:global.stun.twilio.com:3478' }
];
function getRtcConfig() {
  const extra = state.config && Array.isArray(state.config.iceServers) ? state.config.iceServers : [];
  const servers = DEFAULT_ICE_SERVERS.slice();
  for (const s of extra) {
    if (s && s.urls && !servers.some((x) => JSON.stringify(x.urls) === JSON.stringify(s.urls))) servers.push(s);
  }
  return { iceServers: servers };
}

function showCallOverlay(peer, type) {
  els.callAvatar.innerHTML = profileAvatarHTML(peer);
  els.callPeerName.textContent = peer.name || peer.username || 'مستخدم';
  els.callStatusText.textContent = type === 'video' ? 'مكالمة فيديو — جارٍ الاتصال…' : 'مكالمة صوتية — جارٍ الاتصال…';
  els.callTimer.classList.add('hidden');
  els.callTimer.textContent = '00:00';
  els.callOverlay.classList.remove('hidden', 'video-active');
  els.callOverlay.classList.add('calling');
  els.remoteVideo.srcObject = null;
  els.localVideo.srcObject = null;
  els.localVideo.classList.add('hidden');
  els.toggleCamBtn.style.display = type === 'video' ? '' : 'none';
  els.toggleMicBtn.classList.remove('off');
  els.toggleCamBtn.classList.remove('off');
  els.micIcon.innerHTML = '<use href="#i-mic"></use>';
  els.camIcon.innerHTML = '<use href="#i-cam"></use>';
  clearInterval(state.callTick);
}

function startCallTimerDisplay(startedAt) {
  clearInterval(state.callTick);
  const update = () => {
    if (!state.call) return;
    const secs = Math.max(0, Math.floor((Date.now() - (state.call.startedAt || startedAt)) / 1000));
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    els.callTimer.textContent = `${m}:${s}`;
  };
  update();
  state.callTick = setInterval(update, 1000);
}

function setCallConnected() {
  const call = state.call;
  if (!call || call.connected) return;
  call.connected = true;
  call.startedAt = Date.now();
  clearTimeout(call.timeout);
  stopRingtone();
  els.callOverlay.classList.remove('calling');
  els.callStatusText.textContent = 'متصل';
  els.callTimer.classList.remove('hidden');
  if (call.type === 'video') els.callOverlay.classList.add('video-active');
  startCallTimerDisplay(call.startedAt);
}

function createPeerConnection() {
  const pc = new RTCPeerConnection(getRtcConfig());
  pc.onicecandidate = (e) => {
    if (e.candidate && state.call && state.socket) {
      state.socket.emit('call:ice', {
        to: state.call.peer.id,
        callId: state.call.callId,
        candidate: e.candidate
      });
    }
  };
  pc.ontrack = (e) => {
    if (e.streams && e.streams[0]) {
      els.remoteVideo.srcObject = e.streams[0];
      els.remoteVideo.play().catch(() => {});
    }
  };
  pc.onconnectionstatechange = () => {
    if (!state.call) return;
    if (pc.connectionState === 'connected') setCallConnected();
    if (pc.connectionState === 'failed') {
      toast('تعذر إكمال الاتصال. تحقق من الشبكة.', 'err');
      endCall(true);
    }
  };
  pc.oniceconnectionstatechange = () => {
    if (!state.call) return;
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') setCallConnected();
  };
  return pc;
}

async function getMedia(type) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('المتصفح لا يدعم المكالمات. استخدم Chrome أو Edge حديثاً.');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
  });
}

async function startCall(type) {
  if (!state.activeConv) return;
  if (state.call) { toast('هناك مكالمة جارية بالفعل.', 'err'); return; }
  if (!state.socket || !state.socket.connected) { toast('أنت غير متصل بالخادم.', 'err'); return; }
  const peer = state.activeConv.peer;
  if (!peer) return;
  const callId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  state.call = {
    callId, peer, type, role: 'caller', pc: null, localStream: null,
    startedAt: 0, connected: false, pendingIce: [], timeout: null
  };
  showCallOverlay(peer, type);
  startRingtone(false);
  try {
    const stream = await getMedia(type);
    if (!state.call || state.call.callId !== callId) { stream.getTracks().forEach((t) => t.stop()); return; }
    state.call.localStream = stream;
    els.localVideo.srcObject = stream;
    els.localVideo.classList.toggle('hidden', type !== 'video');
    els.localVideo.play().catch(() => {});
    const pc = createPeerConnection();
    state.call.pc = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    state.socket.emit('call:offer', {
      to: peer.id, callId, sdp: pc.localDescription, callType: type
    }, (r) => {
      if (!r || !r.ok) {
        toast((r && r.error) || 'تعذر بدء المكالمة.', 'err');
        endCall(false);
      }
    });
    state.call.timeout = setTimeout(() => {
      if (state.call && state.call.callId === callId && !state.call.connected) {
        toast('لا يوجد رد من الطرف الآخر.', '');
        endCall(true);
      }
    }, 45000);
  } catch (err) {
    toast(err.name === 'NotAllowedError' ? 'تم رفض إذن الكاميرا/الميكروفون.' : 'تعذر الوصول إلى الكاميرا أو الميكروفون.', 'err');
    endCall(false);
  }
}

function handleIncomingCall(payload) {
  if (!payload || !payload.from) return;
  if (state.call || state.incomingCall) {
    if (state.socket) state.socket.emit('call:reject', { to: payload.from.id, callId: payload.callId, reason: 'busy' });
    toast('لديك مكالمة أخرى، تم إرسال إشعار الانشغال.', '');
    return;
  }
  payload.ice = [];
  state.incomingCall = payload;
  els.incomingAvatar.innerHTML = profileAvatarHTML(payload.from);
  els.incomingName.textContent = payload.from.name || payload.from.username || 'مستخدم';
  els.incomingType.textContent = payload.callType === 'video' ? 'مكالمة فيديو واردة…' : 'مكالمة صوتية واردة…';
  els.acceptCallBtn.innerHTML = `<svg class="ic"><use href="#i-${payload.callType === 'video' ? 'video' : 'phone'}"></use></svg>`;
  els.acceptCallBtn.title = payload.callType === 'video' ? 'قبول مكالمة الفيديو' : 'قبول المكالمة';
  openModal('incomingModal');
  startRingtone(true);
  playPop();
  if (document.hidden) document.title = '📞 مكالمة واردة — VIBLO-MSG';
  setTimeout(() => {
    if (state.incomingCall && state.incomingCall.callId === payload.callId) {
      if (state.socket) state.socket.emit('call:reject', { to: payload.from.id, callId: payload.callId, reason: 'missed' });
      clearIncomingCall();
    }
  }, 45000);
}

function clearIncomingCall() {
  state.incomingCall = null;
  closeModal('incomingModal');
  stopRingtone();
  if (state.me) updateTitle();
}

async function acceptIncomingCall() {
  const inc = state.incomingCall;
  if (!inc) return;
  state.incomingCall = null;
  closeModal('incomingModal');
  stopRingtone();
  const callId = inc.callId;
  state.call = {
    callId, peer: inc.from, type: inc.callType, role: 'callee', pc: null,
    localStream: null, startedAt: 0, connected: false, pendingIce: (inc.ice || []).slice(), timeout: null
  };
  showCallOverlay(inc.from, inc.callType);
  els.callStatusText.textContent = 'جارٍ الاتصال…';
  try {
    const stream = await getMedia(inc.callType);
    if (!state.call || state.call.callId !== callId) { stream.getTracks().forEach((t) => t.stop()); return; }
    state.call.localStream = stream;
    els.localVideo.srcObject = stream;
    els.localVideo.classList.toggle('hidden', inc.callType !== 'video');
    els.localVideo.play().catch(() => {});
    const pc = createPeerConnection();
    state.call.pc = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(inc.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    state.socket.emit('call:answer', { to: inc.from.id, callId, sdp: pc.localDescription });
    await flushIce();
    state.call.timeout = setTimeout(() => {
      if (state.call && state.call.callId === callId && !state.call.connected) {
        toast('تعذر إكمال الاتصال. تحقق من الشبكة.', 'err');
        endCall(true);
      }
    }, 45000);
  } catch (err) {
    toast(err.name === 'NotAllowedError' ? 'تم رفض إذن الكاميرا/الميكروفون.' : 'تعذر الوصول إلى الكاميرا أو الميكروفون.', 'err');
    if (state.socket) state.socket.emit('call:reject', { to: inc.from.id, callId, reason: 'error' });
    cleanupCall();
  }
}

async function onCallAnswer(p) {
  const call = state.call;
  if (!call || call.role !== 'caller' || (p && p.callId !== call.callId)) return;
  if (!p || !p.sdp || !call.pc) return;
  try {
    await call.pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
    await flushIce();
  } catch (err) {
    toast('تعذر إكمال الاتصال بالمكالمة.', 'err');
    endCall(true);
  }
}

async function onCallIce(p) {
  if (!p || !p.candidate) return;
  if (!state.call) {
    if (state.incomingCall && (!p.callId || p.callId === state.incomingCall.callId)) {
      state.incomingCall.ice = state.incomingCall.ice || [];
      state.incomingCall.ice.push(p.candidate);
    }
    return;
  }
  const call = state.call;
  if (p.callId && p.callId !== call.callId) return;
  if (call.pc && call.pc.remoteDescription && call.pc.remoteDescription.type) {
    try { await call.pc.addIceCandidate(new RTCIceCandidate(p.candidate)); } catch {}
  } else {
    call.pendingIce.push(p.candidate);
  }
}

async function flushIce() {
  const call = state.call;
  if (!call || !call.pc) return;
  const pending = call.pendingIce.splice(0);
  for (const c of pending) {
    try { await call.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
  }
}

function toggleMic() {
  const call = state.call;
  if (!call || !call.localStream) return;
  const track = call.localStream.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  els.toggleMicBtn.classList.toggle('off', !track.enabled);
  els.micIcon.innerHTML = `<use href="#i-${track.enabled ? 'mic' : 'mic-off'}"></use>`;
}
function toggleCam() {
  const call = state.call;
  if (!call || !call.localStream) return;
  const track = call.localStream.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  els.toggleCamBtn.classList.toggle('off', !track.enabled);
  els.camIcon.innerHTML = `<use href="#i-${track.enabled ? 'cam' : 'cam-off'}"></use>`;
  els.localVideo.classList.toggle('hidden', !track.enabled);
}

function endCall(sendSignal = true) {
  const call = state.call;
  if (!call) return;
  if (sendSignal && state.socket && state.socket.connected) {
    state.socket.emit('call:end', { to: call.peer.id, callId: call.callId });
  }
  cleanupCall();
}

function cleanupCall() {
  const call = state.call;
  clearInterval(state.callTick);
  stopRingtone();
  if (call) {
    clearTimeout(call.timeout);
    if (call.localStream) call.localStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    if (call.pc) { try { call.pc.close(); } catch {} }
  }
  state.call = null;
  els.callOverlay.classList.add('hidden');
  els.callOverlay.classList.remove('video-active', 'calling');
  els.remoteVideo.srcObject = null;
  els.localVideo.srcObject = null;
  els.callTimer.classList.add('hidden');
  if (document.hidden) updateTitle();
}

/* ============================ bind UI ============================ */
function bindApp() {
  els.usernameInput.addEventListener('input', () => {
    let v = els.usernameInput.value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
    if (v !== els.usernameInput.value) els.usernameInput.value = v;
    checkUsername(v);
  });
  els.usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && usernameAvailable) saveUsername();
  });
  els.saveUsernameBtn.addEventListener('click', saveUsername);
  els.usernameCloseBtn.addEventListener('click', () => {
    if (state.me && state.me.username) closeModal('usernameModal');
  });

  els.profileBtn.addEventListener('click', openMyProfile);
  els.logoutBtn.addEventListener('click', () => {
    if (confirm('هل تريد تسجيل الخروج من VIBLO-MSG؟')) logoutLocal();
  });
  els.profileLogoutBtn.addEventListener('click', () => {
    if (confirm('هل تريد تسجيل الخروج من VIBLO-MSG؟')) logoutLocal();
  });
  els.changeUsernameBtn.addEventListener('click', () => {
    closeModal('profileModal');
    openUsernameModal(true);
  });
  els.copyUsernameBtn.addEventListener('click', async () => {
    const u = state.profilePeer ? state.profilePeer.username : state.me && state.me.username;
    if (!u) return;
    try { await navigator.clipboard.writeText('@' + u); toast('تم نسخ اليوزر ✓', 'ok'); }
    catch { toast('@' + esc(u), ''); }
  });

  els.newChatBtn.addEventListener('click', openNewChat);
  els.emptyNewChat.addEventListener('click', openNewChat);
  els.requestsBtn.addEventListener('click', openRequests);

  els.chatSearch.addEventListener('input', () => {
    els.clearChatSearch.classList.toggle('hidden', !els.chatSearch.value);
    renderChatList();
  });
  els.clearChatSearch.addEventListener('click', () => {
    els.chatSearch.value = '';
    els.clearChatSearch.classList.add('hidden');
    renderChatList();
  });

  els.chatList.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-item');
    if (item) openConversation(item.dataset.id);
  });

  els.userSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runUserSearch, 280);
  });
  els.searchResults.addEventListener('click', onSearchResultClick);

  els.incomingList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-req-action]');
    if (!btn) return;
    if (btn.dataset.reqAction === 'accept') acceptRequest(btn.dataset.id);
    else rejectRequest(btn.dataset.id);
  });

  els.chatPeerBtn.addEventListener('click', () => {
    if (state.activeConv) openPeerProfile(state.activeConv.peer);
  });
  els.backBtn.addEventListener('click', () => {
    els.appView.classList.remove('chat-open');
    state.activeId = null;
    state.activeConv = null;
    state.messages = [];
    renderChatList();
  });

  els.chatMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.headMenu.classList.toggle('hidden');
  });
  els.menuProfileBtn.addEventListener('click', () => {
    els.headMenu.classList.add('hidden');
    if (state.activeConv) openPeerProfile(state.activeConv.peer);
  });
  els.menuClearBtn.addEventListener('click', () => {
    els.headMenu.classList.add('hidden');
    if (!state.activeId) return;
    state.messages = [];
    renderMessages();
    toast('تم مسح الرسائل من الشاشة.');
  });

  els.messageInput.addEventListener('input', onComposerInput);
  els.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  });
  els.messageInput.addEventListener('blur', () => emitTyping(false));
  els.sendBtn.addEventListener('click', sendText);

  els.emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const hidden = els.emojiPop.classList.contains('hidden');
    closeAttach();
    if (hidden) { els.emojiPop.classList.remove('hidden'); els.emojiBtn.classList.add('active'); }
    else closeEmoji();
  });
  els.attachBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const hidden = els.attachMenu.classList.contains('hidden');
    closeEmoji();
    if (hidden) { els.attachMenu.classList.remove('hidden'); els.attachBtn.classList.add('active'); }
    else closeAttach();
  });
  els.attachImage.addEventListener('click', () => { closeAttach(); els.imageInput.click(); });
  els.attachVideo.addEventListener('click', () => { closeAttach(); els.videoInput.click(); });
  els.imageInput.addEventListener('change', () => {
    const f = els.imageInput.files && els.imageInput.files[0];
    els.imageInput.value = '';
    if (f) handleFile(f, 'image', state.activeId);
  });
  els.videoInput.addEventListener('change', () => {
    const f = els.videoInput.files && els.videoInput.files[0];
    els.videoInput.value = '';
    if (f) handleFile(f, 'video', state.activeId);
  });

  els.scrollDownBtn.addEventListener('click', () => scrollToBottom(true));
  els.messages.addEventListener('scroll', () => {
    state.followBottom = isNearBottom();
    if (state.followBottom) hideScrollDown();
  });

  els.messagesInner.addEventListener('click', (e) => {
    const m = e.target.closest('[data-lightbox]');
    if (m) openLightbox(m.dataset.lightbox, m.dataset.type || 'image');
  });
  els.lightboxClose.addEventListener('click', closeLightbox);
  els.lightbox.addEventListener('click', (e) => { if (e.target === els.lightbox) closeLightbox(); });

  els.voiceCallBtn.addEventListener('click', () => startCall('audio'));
  els.videoCallBtn.addEventListener('click', () => startCall('video'));
  els.hangupBtn.addEventListener('click', () => endCall(true));
  els.toggleMicBtn.addEventListener('click', toggleMic);
  els.toggleCamBtn.addEventListener('click', toggleCam);
  els.acceptCallBtn.addEventListener('click', acceptIncomingCall);
  els.rejectCallBtn.addEventListener('click', () => {
    const inc = state.incomingCall;
    if (inc && state.socket) state.socket.emit('call:reject', { to: inc.from.id, callId: inc.callId, reason: 'declined' });
    clearIncomingCall();
    toast('تم رفض المكالمة.');
  });

  document.addEventListener('click', (e) => {
    if (!els.emojiPop.contains(e.target) && e.target !== els.emojiBtn && !els.emojiBtn.contains(e.target)) closeEmoji();
    if (!els.attachMenu.contains(e.target) && e.target !== els.attachBtn && !els.attachBtn.contains(e.target)) closeAttach();
    if (!els.headMenu.contains(e.target) && e.target !== els.chatMenuBtn && !els.chatMenuBtn.contains(e.target)) els.headMenu.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeEmoji();
      closeAttach();
      els.headMenu.classList.add('hidden');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.activeId) markRead(state.activeId);
    updateTitle();
  });
  window.addEventListener('beforeunload', () => {
    if (state.call && state.socket) {
      state.socket.emit('call:end', { to: state.call.peer.id, callId: state.call.callId });
    }
  });
  // close modals by data-close
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  [els.newChatModal, els.requestsModal, els.profileModal].forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m && m !== els.usernameModal) m.classList.add('hidden'); });
  });

  setInterval(() => {
    if (state.activeId) refreshActiveHeader();
  }, 30000);
}

/* ============================ lightbox ============================ */
function openLightbox(url, type) {
  const safe = mediaURL(url);
  if (!safe) return;
  els.lightboxContent.innerHTML = type === 'video'
    ? `<video src="${esc(safe)}" controls autoplay playsinline></video>`
    : `<img src="${esc(safe)}" alt="">`;
  els.lightboxDownload.href = safe;
  els.lightbox.classList.remove('hidden');
}
function closeLightbox() {
  els.lightbox.classList.add('hidden');
  els.lightboxContent.innerHTML = '';
}

/* ============================ start ============================ */
(async function init() {
  bindLogin();
  bindApp();
  initEmoji();
  await loadConfig();
  showAuthMode('login', false);
  if (state.token) {
    const ok = await tryRestore();
    if (!ok) showAuthMode('login', false);
  }
})();
