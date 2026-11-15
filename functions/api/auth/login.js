import { json, handleOptions, verifyPassword, signToken, publicUser } from "../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || '').toLowerCase().trim();
    const password = String(body.password || '');

    if (!username || !password) return json({ error: 'اكتب اليوزر وكلمة المرور.' }, 400);

    const user = await env.DB.prepare("SELECT * FROM users WHERE usernameLower = ?").bind(username).first();
    if (!user || !(await verifyPassword(password, user.password))) {
      return json({ error: 'اليوزر أو كلمة المرور غير صحيحة.' }, 401);
    }

    const now = Date.now();
    await env.DB.prepare("UPDATE users SET lastSeen = ? WHERE id = ?").bind(now, user.id).run();
    user.lastSeen = now;

    const token = await signToken(user.id);
    return json({ token, user: publicUser(user) });
  } catch (err) {
    return json({ error: 'حدث خطأ: ' + err.message }, 500);
  }
}
