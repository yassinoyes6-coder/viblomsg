import { json, handleOptions, verifyToken, publicUser, randomId } from "../../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, params, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const { id: convId, action } = params;
  const conv = await env.DB.prepare("SELECT * FROM convs WHERE id = ?").bind(convId).first();
  if (!conv || (conv.a !== me.id && conv.b !== me.id)) {
    return json({ error: 'الطلب غير موجود.' }, 404);
  }
  if (conv.requestedBy === me.id) {
    return json({ error: 'لا يمكنك تنفيذ هذا الإجراء على طلبك الخاص.' }, 400);
  }

  const peerId = conv.a === me.id ? conv.b : conv.a;
  const peer = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(peerId).first();
  const now = Date.now();

  if (action === 'accept') {
    await env.DB.prepare(
      "UPDATE convs SET status = 'accepted', acceptedAt = ?, lastMessageAt = ? WHERE id = ?"
    ).bind(now, now, conv.id).run();

    // System welcome message
    const sysMsg = {
      id: randomId(8),
      convId: conv.id,
      fromUser: 'system',
      kind: 'system',
      text: 'تم قبول طلب المحادثة. ابدأ بإرسال رسالة 👋',
      media: null,
      createdAt: now,
      readBy: ''
    };
    await env.DB.prepare(
      "INSERT INTO messages (id, convId, fromUser, kind, text, media, createdAt, readBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(sysMsg.id, sysMsg.convId, sysMsg.fromUser, sysMsg.kind, sysMsg.text, sysMsg.media, sysMsg.createdAt, sysMsg.readBy).run();

    // Event for peer
    const convViewPeer = {
      id: conv.id,
      status: 'accepted',
      requestedBy: conv.requestedBy,
      createdAt: conv.createdAt,
      acceptedAt: now,
      lastMessageAt: now,
      peer: publicUser(me),
      unread: 0
    };
    await env.DB.prepare(
      "INSERT INTO events (id, targetUserId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
    ).bind(randomId(8), peerId, 'request:update', JSON.stringify({ conv: convViewPeer, status: 'accepted', acceptedBy: me.id }), now).run();

    return json({
      conv: {
        id: conv.id,
        status: 'accepted',
        requestedBy: conv.requestedBy,
        createdAt: conv.createdAt,
        acceptedAt: now,
        lastMessageAt: now,
        peer: publicUser(peer),
        unread: 0
      }
    });
  } else if (action === 'reject') {
    await env.DB.prepare("UPDATE convs SET status = 'rejected' WHERE id = ?").bind(conv.id).run();
    await env.DB.prepare(
      "INSERT INTO events (id, targetUserId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
    ).bind(randomId(8), peerId, 'request:update', JSON.stringify({ conv: null, status: 'rejected', peer: publicUser(me) }), now).run();
    return json({ ok: true });
  }

  return json({ error: 'إجراء غير معروف.' }, 400);
}
