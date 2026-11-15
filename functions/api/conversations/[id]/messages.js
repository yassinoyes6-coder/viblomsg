import { json, handleOptions, verifyToken, publicUser, randomId } from "../../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, params, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const convId = params.id;
  const conv = await env.DB.prepare("SELECT * FROM convs WHERE id = ?").bind(convId).first();
  if (!conv || (conv.a !== me.id && conv.b !== me.id)) {
    return json({ error: 'المحادثة غير موجودة.' }, 404);
  }

  const peerId = conv.a === me.id ? conv.b : conv.a;
  const peer = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(peerId).first();

  const { results: rawMsgs } = await env.DB.prepare(
    "SELECT * FROM messages WHERE convId = ? ORDER BY createdAt ASC LIMIT 500"
  ).bind(convId).all();

  const messages = (rawMsgs || []).map((m) => {
    let media = null;
    if (m.media) {
      try { media = JSON.parse(m.media); } catch {}
    }
    return {
      id: m.id,
      convId: m.convId,
      from: m.fromUser,
      kind: m.kind,
      text: m.text || '',
      media,
      createdAt: m.createdAt,
      readBy: (m.readBy || '').split(',').filter(Boolean)
    };
  });

  const convView = {
    id: conv.id,
    status: conv.status,
    requestedBy: conv.requestedBy,
    createdAt: conv.createdAt,
    acceptedAt: conv.acceptedAt,
    lastMessageAt: conv.lastMessageAt || conv.createdAt,
    peer: publicUser(peer),
    unread: 0
  };

  return json({ conv: convView, messages });
}

export async function onRequestPost({ request, params, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const convId = params.id;
  const conv = await env.DB.prepare("SELECT * FROM convs WHERE id = ?").bind(convId).first();
  if (!conv || (conv.a !== me.id && conv.b !== me.id)) {
    return json({ error: 'المحادثة غير موجودة.' }, 404);
  }
  if (conv.status !== 'accepted') {
    return json({ error: 'المحادثة غير مفعّلة بعد.' }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const kind = ['text', 'image', 'video', 'audio'].includes(body.kind) ? body.kind : 'text';
  const text = String(body.text || '').slice(0, 4000).trim();
  const mediaObj = body.media && typeof body.media === 'object' ? body.media : null;

  if (kind === 'text' && !text) return json({ error: 'الرسالة فارغة.' }, 400);
  if (kind !== 'text' && !mediaObj) return json({ error: 'الملف غير صالح.' }, 400);

  const now = Date.now();
  const msg = {
    id: randomId(8),
    convId: conv.id,
    from: me.id,
    kind,
    text,
    media: mediaObj,
    createdAt: now,
    readBy: [me.id]
  };

  await env.DB.prepare(
    "INSERT INTO messages (id, convId, fromUser, kind, text, media, createdAt, readBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(msg.id, msg.convId, msg.from, msg.kind, msg.text, mediaObj ? JSON.stringify(mediaObj) : null, now, me.id).run();

  await env.DB.prepare("UPDATE convs SET lastMessageAt = ? WHERE id = ?").bind(now, conv.id).run();

  // Push event for peer
  const peerId = conv.a === me.id ? conv.b : conv.a;
  await env.DB.prepare(
    "INSERT INTO events (id, targetUserId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).bind(randomId(8), peerId, 'message:new', JSON.stringify({ convId: conv.id, message: msg }), now).run();

  return json({ message: msg });
}
