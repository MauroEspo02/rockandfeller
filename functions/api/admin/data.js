import { loadAll } from "../../_lib/db.js";
import { json } from "../../_lib/auth.js";
import { listQr } from "../../_lib/qr.js";

// Tutto il contenuto, compresi gli elementi nascosti, per il pannello.
export async function onRequestGet({ env, data }) {
  const [all, qr, users, activity] = await Promise.all([
    loadAll(env, { includeHidden: true }),
    listQr(env),
    env.DB.prepare("SELECT username, display_name, created_at FROM users ORDER BY created_at").all(),
    env.DB.prepare("SELECT ts, user, action FROM activity ORDER BY id DESC LIMIT 40").all(),
  ]);
  return json({ ...all, qr, users: users.results, activity: activity.results, me: data.user });
}
