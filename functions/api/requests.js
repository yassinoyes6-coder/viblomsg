import { json, handleOptions, verifyToken, publicUser, randomId } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const { results: allReqs } = await env.DB.prepare(
    "SELECT * FROM convs WHERE (a = ? OR b = ?) AND status = 'pending' ORDER BY createdAt DESC"
  ).bind(me.id, me.id).all();

  const incoming = [];
  const outgoing = [];

  for (const c of allReqs || []) {
    const peerId = c.a === me.id ? c.b : c.a;
    const peer = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(peerId).first();
    const item = {
      id: c.id,
      status: c.status,
      requestedBy: c.requestedBy,
      createdAt: c.createdAt,
      acceptedAt: c.acceptedAt,
      lastMessageAt: c.lastMessageAt || c.createdAt,
      peer: publicUser(peer),
      lastMessage: null,
      unread: 0
    };
    if (c.requestedBy === me.id) outgoing.push(item);
    else incoming.push(item);
  }

  return json({ incoming, outgoing });
}

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const body = await request.json().catch(() => ({}));
  let target = null;
  if (body.userId) {
    target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(String(body.userId)).first();
  } else if (body.username) {
    const u = String(body.username).toLowerCase().trim();
    target = await env.DB.prepare("SELECT * FROM users WHERE usernameLower = ?").bind(u).first();
  }

  if (!target) return json({ error: 'لم يتم العثور على هذا المستخدم.' }, 404);
  if (target.id === me.id) return json({ error: 'لا يمكنك إرسال طلب لنفسك.' }, 400);

  let conv = await env.DB.prepare(
    "SELECT * FROM convs WHERE (a = ? AND b = ?) OR (a = ? AND b = ?) LIMIT 1"
  ).bind(me.id, target.id, target.id, me.id).first();

  const now = Date.now();
  if (conv) {
    if (conv.status === 'accepted') return json({ error: 'المحادثة موجودة بالفعل.', convId: conv.id }, 409);
    if (conv.status === 'pending') {
      if (conv.requestedBy === me.id) return json({ error: 'لقد أرسلت طلباً بالفعل، بانتظار الموافقة.' }, 409);
      return json({ error: 'لديك طلب محادثة وارد من هذا المستخدم، افتح الطلبات لقبوله.' }, 409);
    }
    await env.DB.prepare(
      "UPDATE convs SET status = 'pending', requestedBy = ?, createdAt = ?, lastMessageAt = ?, acceptedAt = NULL WHERE id = ?"
    ).bind(me.id, now, now, conv.id).run();
    conv.status = 'pending';
    conv.requestedBy = me.id;
    conv.createdAt = now;
  } else {
    conv = {
      id: randomId(8),
      a: me.id,
      b: target.id,
      status: 'pending',
      requestedBy: me.id,
      createdAt: now,
      lastMessageAt: now,
      acceptedAt: null
    };
    await env.DB.prepare(
      "INSERT INTO convs (id, a, b, status, requestedBy, createdAt, lastMessageAt, acceptedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(conv.id, conv.a, conv.b, conv.status, conv.requestedBy, conv.createdAt, conv.lastMessageAt, conv.acceptedAt).run();
  }

  // Push event for target
  const convPayload = {
    id: conv.id,
    status: conv.status,
    requestedBy: conv.requestedBy,
    createdAt: conv.createdAt,
    peer: publicUser(me),
    unread: 0
  };
  await env.DB.prepare(
    "INSERT INTO events (id, targetUserId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).bind(randomId(8), target.id, 'request:new', JSON.stringify({ conv: convPayload }), now).run();

  return json({
    conv: {
      id: conv.id,
      status: conv.status,
      requestedBy: conv.requestedBy,
      createdAt: conv.createdAt,
      peer: publicUser(target),
      unread: 0
    }
  });
}
