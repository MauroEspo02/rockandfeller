import { getSessionUser, json } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env);
  const users = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  return json({ user, has_users: (users?.n || 0) > 0 });
}
