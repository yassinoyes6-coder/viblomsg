import { json, handleOptions, verifyToken, randomId, publicUser } from "../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || '');
  const targetId = String(body.to || body.targetUserId || '');
  const payload = body.payload || {};
  const now = Date.now();

  if (!type || !targetId) return json({ error: 'بيانات غير مكتملة.' }, 400);

  // If this is a call offer, ensure from user is attached
  if (type === 'call:offer' || type === 'call:answer' || type === 'call:ice') {
    payload.from = publicUser(me);
  }

  await env.DB.prepare(
    "INSERT INTO events (id, targetUserId, type, payload, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).bind(randomId(8), targetId, type, JSON.stringify(payload), now).run();

  return json({ ok: true });
}
