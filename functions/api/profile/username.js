import { json, handleOptions, verifyToken, publicUser } from "../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const body = await request.json().catch(() => ({}));
  const u = String(body.username || '').toLowerCase().trim();
  const usernameRe = /^[a-z0-9._]{3,20}$/;
  if (!usernameRe.test(u)) {
    return json({ error: 'اليوزر من 3 إلى 20 حرفاً، ويكون بالإنجليزية والأرقام و . أو _ فقط.' }, 400);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE usernameLower = ? AND id != ?"
  ).bind(u, me.id).first();
  if (existing) {
    return json({ error: 'هذا اليوزر مستخدم بالفعل، جرّب غيره.' }, 409);
  }

  await env.DB.prepare(
    "UPDATE users SET username = ?, usernameLower = ? WHERE id = ?"
  ).bind(u, u, me.id).run();

  me.username = u;
  me.usernameLower = u;

  return json({ user: publicUser(me) });
}
