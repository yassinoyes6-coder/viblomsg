import { json, handleOptions, verifyToken, publicUser } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") || "").toLowerCase().trim().slice(0, 30);
  if (q.length < 2) return json({ users: [] });

  const { results: users } = await env.DB.prepare(
    "SELECT * FROM users WHERE id != ? AND usernameLower LIKE ? ORDER BY usernameLower ASC LIMIT 20"
  ).bind(me.id, `%${q}%`).all();

  const results = [];
  for (const u of users || []) {
    const conv = await env.DB.prepare(
      "SELECT id, status, requestedBy FROM convs WHERE (a = ? AND b = ?) OR (a = ? AND b = ?) LIMIT 1"
    ).bind(me.id, u.id, u.id, me.id).first();

    results.push({
      user: publicUser(u),
      conv: conv ? { id: conv.id, status: conv.status, requestedBy: conv.requestedBy } : null
    });
  }

  return json({ users: results });
}
