import { cleanQr } from "../../../_lib/validate.js";
import { json, error, readJson } from "../../../_lib/auth.js";
import { logActivity } from "../../../_lib/db.js";

export async function onRequestPut({ request, env, params, data }) {
  const q = cleanQr(await readJson(request), true);
  const row = await env.DB.prepare("UPDATE qr_codes SET label = COALESCE(?, label), target = COALESCE(?, target), updated_at = ? WHERE slug = ? RETURNING *")
    .bind(q.label ?? null, q.target ?? null, Date.now(), params.slug)
    .first();
  if (!row) return error("QR non trovato.", 404);
  await logActivity(env, data.user.username, `ha cambiato la destinazione del QR "${row.label}" → ${row.target}`);
  return json(row);
}

export async function onRequestDelete({ env, params, data }) {
  const row = await env.DB.prepare("SELECT label FROM qr_codes WHERE slug = ?").bind(params.slug).first();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM qr_codes WHERE slug = ?").bind(params.slug),
    env.DB.prepare("DELETE FROM qr_scans WHERE slug = ?").bind(params.slug),
  ]);
  if (row) await logActivity(env, data.user.username, `ha cancellato il QR "${row.label}"`);
  return json({ ok: true });
}
