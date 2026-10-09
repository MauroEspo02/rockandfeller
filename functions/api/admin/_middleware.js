import { getSessionUser, sameOrigin, error } from "../../_lib/auth.js";

const OPEN = new Set(["/api/admin/login", "/api/admin/session", "/api/admin/logout"]);

export async function onRequest(context) {
  const { request, env, data } = context;
  if (!env.SESSION_SECRET) return error("SESSION_SECRET non configurata sul server (vedi LEGGIMI.md).", 500);
  if (request.method !== "GET" && !sameOrigin(request)) return error("Richiesta non consentita.", 403);
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (OPEN.has(path)) return context.next();
  const user = await getSessionUser(request, env);
  if (!user) return error("Sessione scaduta, rientra nel pannello.", 401);
  data.user = user;
  return context.next();
}
