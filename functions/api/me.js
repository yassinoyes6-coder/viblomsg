import { json, handleOptions, verifyToken, publicUser } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const user = await verifyToken(token, env.DB);
  if (!user) return json({ error: 'انتهت الجلسة، سجّل الدخول مرة أخرى.' }, 401);

  await env.DB.prepare("UPDATE users SET lastSeen = ? WHERE id = ?").bind(Date.now(), user.id).run();
  user.lastSeen = Date.now();

  return json({ user: publicUser(user) });
}
