import { json, handleOptions, verifyToken } from "../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  const url = new URL(request.url);
  const since = Number(url.searchParams.get("since") || "0");
  const now = Date.now();

  // Heartbeat presence
  await env.DB.prepare("UPDATE users SET lastSeen = ? WHERE id = ?").bind(now, me.id).run();

  // Fetch new events
  const { results: rawEvents } = await env.DB.prepare(
    "SELECT * FROM events WHERE targetUserId = ? AND createdAt > ? ORDER BY createdAt ASC LIMIT 50"
  ).bind(me.id, since).all();

  const events = (rawEvents || []).map((e) => {
    let payload = {};
    try { payload = JSON.parse(e.payload); } catch {}
    return {
      id: e.id,
      type: e.type,
      payload,
      createdAt: e.createdAt
    };
  });

  // Cleanup old events (older than 2 minutes) to keep DB tiny
  env.DB.prepare("DELETE FROM events WHERE createdAt < ?").bind(now - 120000).run().catch(() => {});

  return json({ now, events });
}
