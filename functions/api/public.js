import { loadAll } from "../_lib/db.js";
import { json } from "../_lib/auth.js";

// Menù, link e prodotto del mese per le pagine pubbliche.
export async function onRequestGet({ env }) {
  const data = await loadAll(env);
  // Per le pagine pubbliche togliamo i campi interni che non servono.
  for (const c of data.categories) {
    delete c.visible;
    for (const i of c.items) delete i.visible;
  }
  for (const l of data.links) delete l.visible;
  if (data.potm) data.potm = data.potm.display ? { ...data.potm.display, item_id: data.potm.item_id } : null;
  return json(data, { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
}
