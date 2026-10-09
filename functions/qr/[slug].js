import { ensureDb } from "../_lib/db.js";
import { romeDay } from "../_lib/qr.js";
import { passCookie } from "../_lib/gratta.js";

// Indirizzo fisso stampato sui QR: /qr/<nome>. Conta la scansione e porta alla destinazione scelta nel pannello.
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || "").toLowerCase();
  let target = "/";
  try {
    await ensureDb(env);
    const row = await env.DB.prepare("SELECT target FROM qr_codes WHERE slug = ?").bind(slug).first();
    if (row) {
      target = row.target;
      const day = romeDay();
      const count = env.DB.batch([
        env.DB.prepare("UPDATE qr_codes SET scans = scans + 1 WHERE slug = ?").bind(slug),
        env.DB.prepare("INSERT INTO qr_scans (slug, day, count) VALUES (?, ?, 1) ON CONFLICT(slug, day) DO UPDATE SET count = count + 1").bind(slug, day),
      ]);
      if (context.waitUntil) context.waitUntil(count.catch(() => {}));
      else await count.catch(() => {});
    }
  } catch (err) {
    console.error(err);
  }
  const dest = new URL(target, request.url);
  const headers = { Location: dest.toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  // Chi arriva al gratta e vinci da un QR riceve il "pass" per giocare.
  if (dest.origin === new URL(request.url).origin && dest.pathname.replace(/\/$/, "") === "/gratta") {
    const c = await passCookie(request, env).catch(() => null);
    if (c) headers["Set-Cookie"] = c;
  }
  return new Response(null, { status: 302, headers });
}
