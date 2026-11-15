import { json, handleOptions, verifyToken, publicUser } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const { results: convRows } = await env.DB.prepare(
    "SELECT * FROM convs WHERE (a = ? OR b = ?) AND status = 'accepted' ORDER BY COALESCE(lastMessageAt, createdAt) DESC"
  ).bind(me.id, me.id).all();

  const list = [];
  for (const c of convRows || []) {
    const peerId = c.a === me.id ? c.b : c.a;
    const peer = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(peerId).first();

    const last = await env.DB.prepare(
      "SELECT * FROM messages WHERE convId = ? ORDER BY createdAt DESC LIMIT 1"
    ).bind(c.id).first();

    const unreadRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM messages WHERE convId = ? AND fromUser != ? AND fromUser != 'system' AND (readBy NOT LIKE ? OR readBy IS NULL)"
    ).bind(c.id, me.id, `%${me.id}%`).first();

    let lastMedia = null;
    if (last && last.media) {
      try { lastMedia = JSON.parse(last.media); } catch {}
    }

    list.push({
      id: c.id,
      status: c.status,
      requestedBy: c.requestedBy,
      createdAt: c.createdAt,
      acceptedAt: c.acceptedAt,
      lastMessageAt: c.lastMessageAt || c.createdAt,
      peer: publicUser(peer),
      lastMessage: last ? {
        id: last.id,
        from: last.fromUser,
        kind: last.kind,
        text: last.text || '',
        createdAt: last.createdAt,
        mediaName: lastMedia ? lastMedia.name || '' : '',
        read: last.fromUser === me.id ? (last.readBy || '').includes(peerId) : true
      } : null,
      unread: (unreadRow && unreadRow.count) || 0
    });
  }

  return json({ conversations: list });
}
