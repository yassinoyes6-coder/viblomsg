import { json, handleOptions } from "../../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const u = String(url.searchParams.get("u") || "").toLowerCase().trim();
  const usernameRe = /^[a-z0-9._]{3,20}$/;
  if (!usernameRe.test(u)) return json({ available: false, reason: "invalid" });

  const existing = await env.DB.prepare("SELECT id FROM users WHERE usernameLower = ?").bind(u).first();
  return json({ available: !existing, reason: existing ? "taken" : "ok" });
}
