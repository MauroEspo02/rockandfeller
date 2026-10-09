import { cleanSite, cleanPotm } from "../../../_lib/validate.js";
import { json, error, readJson } from "../../../_lib/auth.js";
import { setSetting, logActivity } from "../../../_lib/db.js";

const KEYS = {
  site: { clean: cleanSite, label: "le informazioni del locale" },
  potm: { clean: cleanPotm, label: "il prodotto del mese" },
};

export async function onRequestPut({ request, env, params, data }) {
  const k = KEYS[params.key];
  if (!k) return error("Impostazione sconosciuta.", 404);
  const value = k.clean(await readJson(request));
  await setSetting(env, params.key, value);
  await logActivity(env, data.user.username, `ha aggiornato ${k.label}`);
  return json(value);
}
