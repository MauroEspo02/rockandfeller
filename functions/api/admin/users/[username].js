import { hashPassword, json, error, readJson, checkPassword } from "../../../_lib/auth.js";
import { str } from "../../../_lib/validate.js";
import { logActivity } from "../../../_lib/db.js";

export async function onRequestPut({ request, env, params, data }) {
  const user = await env.DB.prepare("SELECT username, display_name FROM users WHERE username = ?").bind(params.username).first();
  if (!user) return error("Utente non trovato.", 404);
  const b = await readJson(request, 10_000);
  if (b.password !== undefined) {
    const pwErr = checkPassword(b.password);
    if (pwErr) return error(pwErr);
    const { hash, salt, iterations } = await hashPassword(b.password);
    await env.DB.prepare("UPDATE users SET pass_hash = ?, salt = ?, iterations = ? WHERE username = ?").bind(hash, salt, iterations, user.username).run();
    await logActivity(env, data.user.username, `ha cambiato la password di ${user.display_name}`);
  }
  if (b.display_name !== undefined) {
    const display = str(b.display_name, "nome", { max: 40, required: true });
    await env.DB.prepare("UPDATE users SET display_name = ? WHERE username = ?").bind(display, user.username).run();
  }
  return json({ ok: true });
}

export async function onRequestDelete({ env, params, data }) {
  if (params.username === data.user.username) return error("Non puoi cancellare il tuo stesso account.");
  const user = await env.DB.prepare("SELECT display_name FROM users WHERE username = ?").bind(params.username).first();
  await env.DB.prepare("DELETE FROM users WHERE username = ?").bind(params.username).run();
  if (user) await logActivity(env, data.user.username, `ha cancellato l'account di ${user.display_name}`);
  return json({ ok: true });
}
