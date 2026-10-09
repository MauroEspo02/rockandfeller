import { json, readJson } from "../../_lib/auth.js";
import { setSetting, logActivity } from "../../_lib/db.js";
import { romeDay } from "../../_lib/qr.js";
import { getGrattaConfig } from "../../_lib/gratta.js";
import { cleanGratta } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  const cfg = await getGrattaConfig(env);
  const today = romeDay();
  const since = romeDay(new Date(Date.now() - 29 * 86400000));
  const [t, m, recent] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS plays, COALESCE(SUM(win), 0) AS wins FROM gratta_plays WHERE day = ?").bind(today).first(),
    env.DB.prepare("SELECT COUNT(*) AS plays, COALESCE(SUM(win), 0) AS wins, COUNT(used_at) AS used FROM gratta_plays WHERE day >= ?").bind(since).first(),
    env.DB.prepare("SELECT ts, code, expires_at, used_at, used_by FROM gratta_plays WHERE win = 1 ORDER BY id DESC LIMIT 30").all(),
  ]);
  return json({ config: cfg, today: t, month: m, recent: recent.results });
}

export async function onRequestPut({ request, env, data }) {
  const cfg = cleanGratta(await readJson(request, 10_000));
  await setSetting(env, "gratta", cfg);
  await logActivity(env, data.user.username, "ha aggiornato il gratta e vinci");
  return json(cfg);
}
