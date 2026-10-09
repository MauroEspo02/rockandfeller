import { cleanQr } from "../../_lib/validate.js";
import { json, error, readJson } from "../../_lib/auth.js";
import { listQr } from "../../_lib/qr.js";
import { logActivity } from "../../_lib/db.js";

export async function onRequestGet({ env }) {
  return json(await listQr(env));
}

export async function onRequestPost({ request, env, data }) {
  const q = cleanQr(await readJson(request), false);
  const exists = await env.DB.prepare("SELECT slug FROM qr_codes WHERE slug = ?").bind(q.slug).first();
  if (exists) return error("Esiste già un QR con questo nome breve.", 409);
  const now = Date.now();
  await env.DB.prepare("INSERT INTO qr_codes (slug, label, target, scans, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)")
    .bind(q.slug, q.label, q.target, now, now)
    .run();
  await logActivity(env, data.user.username, `ha creato il QR "${q.label}"`);
  return json({ ...q, scans: 0, days: {}, created_at: now, updated_at: now }, { status: 201 });
}
