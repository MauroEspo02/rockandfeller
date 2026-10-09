import { ensureDb } from "../_lib/db.js";

// Foto caricate dal pannello. L'id cambia a ogni caricamento, quindi possono restare in cache per sempre.
export async function onRequestGet({ env, params }) {
  const id = String(params.id || "");
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response("Non trovata", { status: 404 });
  await ensureDb(env);
  const row = await env.DB.prepare("SELECT mime, data FROM images WHERE id = ?").bind(id).first();
  if (!row) return new Response("Non trovata", { status: 404 });
  const bytes = row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data);
  return new Response(bytes, {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
