import { json, handleOptions, verifyToken, randomId } from "../_lib.js";

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const me = await verifyToken(token, env.DB);
  if (!me) return json({ error: 'غير مصرح.' }, 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === 'string') {
      return json({ error: 'لم يتم اختيار ملف.' }, 400);
    }

    const mime = file.type || 'application/octet-stream';
    if (!mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/')) {
      return json({ error: 'الصور والفيديو والصوت فقط مسموح بها.' }, 400);
    }

    const fileId = `${Date.now()}-${randomId(6)}`;
    const buffer = await file.arrayBuffer();

    // Store in Cloudflare KV
    await env.KV.put(`upload:${fileId}`, buffer, {
      metadata: { mime, name: file.name, size: file.size }
    });

    return json({
      url: '/uploads/' + fileId,
      mime,
      name: file.name,
      size: file.size
    });
  } catch (err) {
    return json({ error: 'فشل رفع الملف: ' + err.message }, 500);
  }
}
