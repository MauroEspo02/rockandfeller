import { json, error } from "../../../../_lib/auth.js";
import { logActivity } from "../../../../_lib/db.js";
import { normalizeCode } from "../../../../_lib/gratta.js";

async function find(env, raw) {
  const code = normalizeCode(raw);
  if (!code) return { code: null, row: null };
  const row = await env.DB.prepare("SELECT ts, code, expires_at, used_at, used_by FROM gratta_plays WHERE code = ?").bind(code).first();
  return { code, row };
}

function status(row) {
  if (!row) return "inesistente";
  if (row.used_at) return "usato";
  if (row.expires_at && Date.now() > row.expires_at) return "scaduto";
  return "valido";
}

// Controlla un codice vinto.
export async function onRequestGet({ env, params }) {
  const { code, row } = await find(env, params.code);
  if (!code) return error("Il codice ha questa forma: RF-ABC234.");
  return json({ code, status: status(row), ...(row || {}) });
}

// Segna il codice come usato alla cassa.
export async function onRequestPost({ env, params, data }) {
  const { code, row } = await find(env, params.code);
  if (!row) return error("Codice inesistente.", 404);
  const st = status(row);
  if (st !== "valido") return error(st === "usato" ? "Questo codice è già stato usato." : "Questo codice è scaduto.", 409);
  const now = Date.now();
  const res = await env.DB.prepare("UPDATE gratta_plays SET used_at = ?, used_by = ? WHERE code = ? AND used_at IS NULL").bind(now, data.user.username, code).run();
  if (!res.meta || res.meta.changes !== 1) return error("Questo codice è già stato usato.", 409);
  await logActivity(env, data.user.username, `ha usato il codice ${code}`);
  return json({ code, status: "usato", ts: row.ts, expires_at: row.expires_at, used_at: now, used_by: data.user.username });
}
