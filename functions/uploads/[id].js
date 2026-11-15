export async function onRequestGet({ params, env }) {
  const fileId = params.id;
  const item = await env.KV.getWithMetadata(`upload:${fileId}`, { type: "arrayBuffer" });
  if (!item || !item.value) {
    return new Response("Not found", { status: 404 });
  }

  const mime = (item.metadata && item.metadata.mime) || "application/octet-stream";
  return new Response(item.value, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
