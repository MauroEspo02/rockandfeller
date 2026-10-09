import { json, error, clientIp, sameOrigin } from "../_lib/auth.js";
import { loadAll } from "../_lib/db.js";
import { romeDay } from "../_lib/qr.js";
import { getGrattaConfig, hasPass, deviceId, newDevice, newCode, randomUnit, IP_MAX_PER_DAY } from "../_lib/gratta.js";

async function potmTitle(env) {
  const { potm } = await loadAll(env);
  return potm?.display?.title || "";
}

function publicResult(row) {
  if (!row) return null;
  return { win: !!row.win, code: row.code || null, expires_at: row.expires_at || null, used: !!row.used_at };
}

// Stato del gioco per questo telefono.
export async function onRequestGet({ request, env }) {
  const cfg = await getGrattaConfig(env);
  let dev = deviceId(request);
  const headers = {};
  if (!dev) {
    const d = newDevice(request);
    dev = d.id;
    headers["Set-Cookie"] = d.cookie;
  }
  const day = romeDay();
  const { results } = await env.DB.prepare("SELECT win, code, expires_at, used_at FROM gratta_plays WHERE device = ? AND day = ? ORDER BY id DESC").bind(dev, day).all();
  const pass = await hasPass(request, env);
  const left = Math.max(0, cfg.plays_per_day - results.length);
  return json(
    {
      active: cfg.active,
      prize: cfg.prize,
      potm: await potmTitle(env),
      has_pass: pass,
      plays_left: left,
      can_play: cfg.active && pass && left > 0,
      last: publicResult(results[0]),
    },
    { headers }
  );
}

// Gioca: decide l'esito e, se vinci, crea il codice.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return error("Richiesta non consentita.", 403);
  const cfg = await getGrattaConfig(env);
  if (!cfg.active) return error("Il gratta e vinci al momento è chiuso.", 409);
  if (!(await hasPass(request, env))) return error("Inquadra il QR del gratta e vinci nel locale per giocare.", 403);
  const dev = deviceId(request);
  if (!dev) return error("Ricarica la pagina e riprova.", 400);
  const day = romeDay();
  const ip = clientIp(request);
  const [byDev, byIp, wins] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM gratta_plays WHERE device = ? AND day = ?").bind(dev, day).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM gratta_plays WHERE ip = ? AND day = ?").bind(ip, day).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM gratta_plays WHERE day = ? AND win = 1").bind(day).first(),
  ]);
  if ((byDev?.n || 0) >= cfg.plays_per_day) return error("Hai già giocato oggi. Riprova domani!", 429);
  if ((byIp?.n || 0) >= IP_MAX_PER_DAY) return error("Troppe giocate da questa rete oggi. Riprova domani!", 429);

  const underCap = !cfg.max_wins_day || (wins?.n || 0) < cfg.max_wins_day;
  const win = underCap && randomUnit() < cfg.win_percent / 100;
  const now = Date.now();
  let code = null;
  let expires = null;
  if (win) {
    expires = now + cfg.valid_days * 86400000;
    for (let i = 0; i < 5 && !code; i++) {
      const c = newCode();
      const clash = await env.DB.prepare("SELECT 1 FROM gratta_plays WHERE code = ?").bind(c).first();
      if (!clash) code = c;
    }
  }
  await env.DB.prepare("INSERT INTO gratta_plays (ts, day, device, ip, win, code, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(now, day, dev, ip, win && code ? 1 : 0, code, expires)
    .run();
  return json({ win: !!(win && code), code, expires_at: expires, prize: cfg.prize, potm: await potmTitle(env), plays_left: cfg.plays_per_day - (byDev?.n || 0) - 1 });
}
