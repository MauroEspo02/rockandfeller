import { RESOURCES } from "../../_lib/validate.js";
import { json, error, readJson } from "../../_lib/auth.js";

// Riceve la nuova sequenza di id e riscrive l'ordine.
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const res = RESOURCES[body.resource];
  if (!res || !Array.isArray(body.ids) || body.ids.length > 500 || !body.ids.every((n) => Number.isInteger(n) && n > 0)) {
    return error("Ordine non valido.");
  }
  await env.DB.batch(body.ids.map((id, i) => env.DB.prepare(`UPDATE ${res.table} SET sort = ? WHERE id = ?`).bind((i + 1) * 10, id)));
  return json({ ok: true });
}
