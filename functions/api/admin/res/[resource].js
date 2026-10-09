import { RESOURCES } from "../../../_lib/validate.js";
import { json, error, readJson, HttpError } from "../../../_lib/auth.js";
import { logActivity, MAPPERS } from "../../../_lib/db.js";

// Crea una categoria, un prodotto o un link.
export async function onRequestPost({ request, env, params, data }) {
  const res = RESOURCES[params.resource];
  if (!res) return error("Risorsa sconosciuta.", 404);
  const body = await readJson(request);
  const row = res.clean(body, false);
  if (params.resource === "items") {
    const cat = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(row.category_id).first();
    if (!cat) throw new HttpError("Categoria inesistente.");
  }
  // In fondo alla lista (per i prodotti, in fondo alla loro categoria).
  const where = params.resource === "items" ? " WHERE category_id = ?" : "";
  const stmt = env.DB.prepare(`SELECT COALESCE(MAX(sort), 0) AS m FROM ${res.table}${where}`);
  const max = await (where ? stmt.bind(row.category_id) : stmt).first();
  row.sort = (max?.m || 0) + 10;
  const cols = Object.keys(row);
  const created = await env.DB.prepare(
    `INSERT INTO ${res.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) RETURNING *`
  ).bind(...cols.map((c) => row[c])).first();
  await logActivity(env, data.user.username, `ha aggiunto ${res.label(created)}`);
  return json(MAPPERS[params.resource](created), { status: 201 });
}
