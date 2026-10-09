import { verifyCredentials, createSessionCookie, json, error, clientIp, isRateLimited, registerFailedAttempt, clearAttempts, readJson } from "../../_lib/auth.js";
import { logActivity } from "../../_lib/db.js";

export async function onRequestPost({ request, env }) {
  const ip = clientIp(request);
  if (await isRateLimited(env, ip)) return error("Troppi tentativi. Riprova tra qualche minuto.", 429);
  const body = await readJson(request, 10_000);
  const user = await verifyCredentials(env, body.username, body.password);
  if (!user) {
    await registerFailedAttempt(env, ip);
    return error("Utente o password sbagliati.", 401);
  }
  await clearAttempts(env, ip);
  await logActivity(env, user.username, "è entrato nel pannello");
  const cookie = await createSessionCookie(request, env, user.username);
  return json({ user }, { headers: { "Set-Cookie": cookie } });
}
