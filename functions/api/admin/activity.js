import { json } from "../../_lib/auth.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT ts, user, action FROM activity ORDER BY id DESC LIMIT 100").all();
  return json(results);
}
