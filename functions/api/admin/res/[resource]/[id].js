import { RESOURCES } from "../../../../_lib/validate.js";
import { json, error, readJson, HttpError } from "../../../../_lib/auth.js";
import { logActivity, MAPPERS } from "../../../../_lib/db.js";

function target(params) {
  const res = RESOURCES[params.resource];
  const id = Number(params.id);
  if (!res || !Number.isInteger(id) || id < 1) throw new HttpError("Elemento non trovato.", 404);
  return { res, id };
}

const PRICE = (c) => (c == null ? "—" : (c / 100).toFixed(2).replace(".", ",") + "€");

export async function onRequestPut({ request, env, params, data }) {
  const { res, id } = target(params);
  const before = await env.DB.prepare(`SELECT * FROM ${res.table} WHERE id = ?`).bind(id).first();
  if (!before) return error("Elemento non trovato (forse è stato cancellato).", 404);
  const row = res.clean(await readJson(request), true);
  if ("category_id" in row) {
    const cat = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(row.category_id).first();
    if (!cat) throw new HttpError("Categoria inesistente.");
  }
  const cols = Object.keys(row);
  if (!cols.length) return json(MAPPERS[params.resource](before));
  const updated = await env.DB.prepare(`UPDATE ${res.table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ? RETURNING *`)
    .bind(...cols.map((c) => row[c]), id)
    .first();
  let what = `ha modificato ${res.label(updated)}`;
  if (params.resource === "items" && "price_cents" in row && row.price_cents !== before.price_cents) {
    what = `ha cambiato il prezzo di ${res.label(updated)}: ${PRICE(before.price_cents)} → ${PRICE(row.price_cents)}`;
  } else if ("available" in row && cols.length === 1) {
    what = `ha segnato ${res.label(updated)} come ${row.available ? "disponibile" : "esaurito"}`;
  } else if ("visible" in row && cols.length === 1) {
    what = `ha ${row.visible ? "mostrato" : "nascosto"} ${res.label(updated)}`;
  }
  await logActivity(env, data.user.username, what);
  return json(MAPPERS[params.resource](updated));
}

export async function onRequestDelete({ env, params, data }) {
  const { res, id } = target(params);
  const before = await env.DB.prepare(`SELECT * FROM ${res.table} WHERE id = ?`).bind(id).first();
  if (!before) return json({ ok: true });
  const stmts = [];
  if (params.resource === "categories") stmts.push(env.DB.prepare("DELETE FROM items WHERE category_id = ?").bind(id));
  stmts.push(env.DB.prepare(`DELETE FROM ${res.table} WHERE id = ?`).bind(id));
  await env.DB.batch(stmts);
  await logActivity(env, data.user.username, `ha cancellato ${res.label(before)}`);
  return json({ ok: true });
}
