import { json, handleOptions, hashPassword, signToken, publicUser, randomId } from "../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  try {
    let body = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      return json({ error: 'Body parse error: ' + e.message }, 400);
    }
    const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const username = String(body.username || '').toLowerCase().trim();
    const password = String(body.password || '');
    const usernameRe = /^[a-z0-9._]{3,20}$/;

    if (name.length < 2) return json({ error: 'اكتب اسماً أو لقباً من حرفين على الأقل.' }, 400);
    if (!usernameRe.test(username)) {
      return json({ error: 'اليوزر من 3 إلى 20 حرفاً، ويكون بالإنجليزية والأرقام و . أو _ فقط.' }, 400);
    }
    if (password.length < 8) return json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' }, 400);

    const existing = await env.DB.prepare("SELECT id FROM users WHERE usernameLower = ?").bind(username).first();
    if (existing) return json({ error: 'هذا اليوزر مستخدم بالفعل، جرّب غيره.' }, 409);

    const user = {
      id: randomId(8),
      name,
      username,
      usernameLower: username,
      password: await hashPassword(password),
      picture: null,
      createdAt: Date.now(),
      lastSeen: Date.now()
    };

    await env.DB.prepare(
      "INSERT INTO users (id, name, username, usernameLower, password, picture, createdAt, lastSeen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(user.id, user.name, user.username, user.usernameLower, user.password, user.picture, user.createdAt, user.lastSeen).run();

    const token = await signToken(user.id);
    return json({ token, user: publicUser(user) }, 201);
  } catch (err) {
    return json({ error: 'حدث خطأ أثناء التسجيل: ' + err.message }, 500);
  }
}
