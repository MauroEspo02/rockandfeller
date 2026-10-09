// Accesso al pannello: ogni persona ha il suo utente e password (salvate solo come hash PBKDF2).
// La variabile ADMIN_PASSWORD fa da chiave di emergenza: con utente "admin" e quella password si entra sempre,
// così si possono creare i primi account o recuperare una password dimenticata.

const COOKIE_NAME = "rf_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni: chi gestisce il locale non deve rifare login ogni volta
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const PBKDF2_ITERATIONS = 100000; // massimo supportato da Cloudflare Workers
export const RECOVERY_USER = "admin";

const enc = new TextEncoder();

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmac(key, message) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
}

export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return { hash: toHex(bits), salt: toHex(salt), iterations };
}

export function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

// Ritorna { username, display_name } se le credenziali sono giuste, altrimenti null.
export async function verifyCredentials(env, username, password) {
  if (typeof password !== "string" || !password) return null;
  const u = normalizeUsername(username);
  const row = await env.DB.prepare("SELECT username, display_name, pass_hash, salt, iterations FROM users WHERE username = ?").bind(u).first();
  if (row) {
    const { hash } = await hashPassword(password, row.salt, row.iterations);
    return timingSafeEqual(hash, row.pass_hash) ? { username: row.username, display_name: row.display_name } : null;
  }
  if (u === RECOVERY_USER && env.ADMIN_PASSWORD && env.SESSION_SECRET) {
    const [a, b] = await Promise.all([hmac(env.SESSION_SECRET, password), hmac(env.SESSION_SECRET, env.ADMIN_PASSWORD)]);
    return timingSafeEqual(a, b) ? { username: RECOVERY_USER, display_name: "Admin (emergenza)" } : null;
  }
  return null;
}

function cookieFlags(request) {
  const secure = new URL(request.url).protocol === "https:";
  return `HttpOnly; SameSite=Strict; Path=/${secure ? "; Secure" : ""}`;
}

export async function createSessionCookie(request, env, username) {
  const exp = Date.now() + SESSION_DURATION_MS;
  const payload = `${encodeURIComponent(username)}.${exp}`;
  const sig = await hmac(env.SESSION_SECRET, payload);
  return `${COOKIE_NAME}=${payload}.${sig}; ${cookieFlags(request)}; Max-Age=${SESSION_DURATION_MS / 1000}`;
}

export function clearSessionCookie(request) {
  return `${COOKIE_NAME}=; ${cookieFlags(request)}; Max-Age=0`;
}

export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(name + "="));
  return match ? match.slice(name.length + 1) : null;
}

// Ritorna l'utente della sessione, oppure null.
export async function getSessionUser(request, env) {
  if (!env.SESSION_SECRET) return null;
  const value = getCookie(request, COOKIE_NAME);
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userEnc, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const expected = await hmac(env.SESSION_SECRET, `${userEnc}.${expStr}`);
  if (!timingSafeEqual(sig, expected)) return null;
  const username = decodeURIComponent(userEnc);
  if (username === RECOVERY_USER) {
    const exists = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(RECOVERY_USER).first();
    if (!exists) return env.ADMIN_PASSWORD ? { username, display_name: "Admin (emergenza)" } : null;
  }
  // Se l'utente è stato cancellato, la sua sessione non vale più.
  const row = await env.DB.prepare("SELECT username, display_name FROM users WHERE username = ?").bind(username).first();
  return row ? { username: row.username, display_name: row.display_name } : null;
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(init.headers || {}) },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, { status });
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

export async function isRateLimited(env, ip) {
  const row = await env.DB.prepare("SELECT count, first_attempt FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (!row || Date.now() - row.first_attempt > RATE_LIMIT_WINDOW_MS) return false;
  return row.count >= RATE_LIMIT_MAX;
}

export async function registerFailedAttempt(env, ip) {
  const now = Date.now();
  const row = await env.DB.prepare("SELECT count, first_attempt FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (!row || now - row.first_attempt > RATE_LIMIT_WINDOW_MS) {
    await env.DB.prepare(
      "INSERT INTO login_attempts (ip, count, first_attempt) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = 1, first_attempt = excluded.first_attempt"
    ).bind(ip, now).run();
  } else {
    await env.DB.prepare("UPDATE login_attempts SET count = count + 1 WHERE ip = ?").bind(ip).run();
  }
}

export async function clearAttempts(env, ip) {
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
}

// Le modifiche devono arrivare dal sito stesso (protezione contro richieste da altri siti).
export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // alcuni browser non lo mandano su richieste same-origin; il cookie è comunque SameSite=Strict
  return origin === new URL(request.url).origin;
}

export async function readJson(request, maxBytes = 3 * 1024 * 1024) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > maxBytes) throw new HttpError("Dati troppo grandi.", 413);
  try {
    return await request.json();
  } catch {
    throw new HttpError("Richiesta non valida.", 400);
  }
}

export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function checkPassword(p) {
  if (typeof p !== "string" || p.length < 8) return "La password deve avere almeno 8 caratteri.";
  if (p.length > 200) return "Password troppo lunga.";
  return null;
}
