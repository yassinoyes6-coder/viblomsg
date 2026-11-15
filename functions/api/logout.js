import { json, handleOptions } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost() {
  return json({ ok: true });
}
