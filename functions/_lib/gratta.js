// Gratta e vinci: si gioca solo arrivando dal QR (che lascia un "pass" valido 2 ore nel browser).
// L'esito lo decide il server, così non si può barare guardando il codice della pagina.
import { hmac, getCookie, timingSafeEqual } from "./auth.js";
import { getSetting } from "./db.js";
import { DEFAULT_GRATTA } from "./seed.js";

export const PASS_COOKIE = "rf_gpass";
export const DEVICE_COOKIE = "rf_dev";
const PASS_MS = 2 * 60 * 60 * 1000;
export const IP_MAX_PER_DAY = 40; // il Wi-Fi del locale è uno solo: limite alto, serve solo contro gli abusi

export async function getGrattaConfig(env) {
  return { ...DEFAULT_GRATTA, ...(await getSetting(env, "gratta", {})) };
}

function flags(request, maxAge) {
  const secure = new URL(request.url).protocol === "https:";
  return `HttpOnly; SameSite=Lax; Path=/${secure ? "; Secure" : ""}; Max-Age=${maxAge}`;
}

export async function passCookie(request, env) {
  if (!env.SESSION_SECRET) return null;
  const exp = Date.now() + PASS_MS;
  const sig = await hmac(env.SESSION_SECRET, `gratta.${exp}`);
  return `${PASS_COOKIE}=${exp}.${sig}; ${flags(request, PASS_MS / 1000)}`;
}

export async function hasPass(request, env) {
  const v = getCookie(request, PASS_COOKIE);
  if (!v || !env.SESSION_SECRET) return false;
  const [expStr, sig] = v.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp || !sig) return false;
  return timingSafeEqual(sig, await hmac(env.SESSION_SECRET, `gratta.${expStr}`));
}

// Identificativo anonimo del telefono, per il limite di giocate al giorno.
export function deviceId(request) {
  const v = getCookie(request, DEVICE_COOKIE);
  return v && /^[a-f0-9]{32}$/.test(v) ? v : null;
}
export function newDevice(request) {
  const id = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { id, cookie: `${DEVICE_COOKIE}=${id}; ${flags(request, 400 * 24 * 3600)}` };
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // niente 0/O, 1/I
export function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return "RF-" + [...b].map((x) => ALPHA[x % ALPHA.length]).join("");
}
export function normalizeCode(c) {
  const t = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = t.startsWith("RF") ? t.slice(2) : t;
  return /^[A-Z0-9]{6}$/.test(body) ? `RF-${body}` : null;
}

export function randomUnit() {
  const b = crypto.getRandomValues(new Uint32Array(1));
  return b[0] / 4294967296;
}
