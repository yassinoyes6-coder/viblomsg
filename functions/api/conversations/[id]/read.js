import { json, handleOptions, verifyToken, randomId } from "../../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
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

  // Update messages readBy
  const { results: unread } = await env.DB.prepare(
    "SELECT id, readBy FROM messages WHERE convId = ? AND fromUser != ? AND fromUser != 'system' AND (readBy NOT LIKE ? OR readBy IS NULL)"
  ).bind(convId, me.id, `%${me.id}%`).all();

  for (const m of unread || []) {
    const list = (m.readBy || '').split(',').filter(Boolean);
    if (!list.includes(me.id)) {
      list.push(me.id);
      await env.DB.prepare("UPDATE messages SET readBy = ? WHERE id = ?").bind(list.join(','), m.id).run();
    }
  }

  const peerId = conv.a === me.id ? conv.b : conv.a;
  if ((unread || []).length > 0) {
    await env.DB.prepare(
      "INSERT INTO events (id, targetUserId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
    ).bind(randomId(8), peerId, 'messages:read', JSON.stringify({ convId, readerId: me.id }), Date.now()).run();
  }

  return json({ ok: true });
}
