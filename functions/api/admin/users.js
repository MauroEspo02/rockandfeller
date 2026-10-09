import { hashPassword, normalizeUsername, json, error, readJson, RECOVERY_USER, checkPassword } from "../../_lib/auth.js";
import { str } from "../../_lib/validate.js";
import { logActivity } from "../../_lib/db.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT username, display_name, created_at FROM users ORDER BY created_at").all();
  return json(results);
}

export async function onRequestPost({ request, env, data }) {
  const b = await readJson(request, 10_000);
  const username = normalizeUsername(b.username);
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return error("Nome utente: 3-30 caratteri, solo lettere minuscole, numeri, punto, trattino.");
  if (username === RECOVERY_USER) return error(`"${RECOVERY_USER}" è riservato all'accesso di emergenza: scegli un altro nome.`);
  const pwErr = checkPassword(b.password);
  if (pwErr) return error(pwErr);
  const display = str(b.display_name, "nome", { max: 40 }) || username;
  const exists = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
  if (exists) return error("Questo nome utente esiste già.", 409);
  const { hash, salt, iterations } = await hashPassword(b.password);
  await env.DB.prepare("INSERT INTO users (username, display_name, pass_hash, salt, iterations, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(username, display, hash, salt, iterations, Date.now())
    .run();
  await logActivity(env, data.user.username, `ha creato l'account di ${display}`);
  return json({ username, display_name: display }, { status: 201 });
}
