// Server di prova in locale, senza installare niente: imita Cloudflare Pages (file statici + cartella functions)
// e usa un database SQLite al posto di D1. Serve solo per provare il sito sul computer.
//
//   node scripts/dev-server.mjs            → http://localhost:8788
//   PORT=3000 node scripts/dev-server.mjs
//
// Le password di prova si leggono da .dev.vars (copia .dev.vars.example). Il database finisce in .local/dev.sqlite.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const FUNCTIONS = path.join(ROOT, "functions");
const PORT = Number(process.env.PORT || 8788);

// ---------- variabili ----------
const env = {};
const varsFile = fs.existsSync(path.join(ROOT, ".dev.vars")) ? ".dev.vars" : ".dev.vars.example";
for (const line of fs.readFileSync(path.join(ROOT, varsFile), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

// ---------- D1 finto su SQLite ----------
fs.mkdirSync(path.join(ROOT, ".local"), { recursive: true });
const sqlite = new DatabaseSync(process.env.DB_FILE || path.join(ROOT, ".local", "dev.sqlite"));
sqlite.exec("PRAGMA foreign_keys = ON");

const norm = (v) => (v instanceof Uint8Array ? v : v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);
class Stmt {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    return new Stmt(this.sql, args.map(norm));
  }
  _run() {
    const st = sqlite.prepare(this.sql);
    if (/^\s*(SELECT|WITH|PRAGMA)|\bRETURNING\b/i.test(this.sql)) return { rows: st.all(...this.args).map((r) => ({ ...r })) };
    const info = st.run(...this.args);
    return { rows: [], meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }
  async first(col) {
    const r = this._run().rows[0];
    if (!r) return null;
    return col ? r[col] : r;
  }
  async all() {
    const r = this._run();
    return { results: r.rows, success: true, meta: r.meta || {} };
  }
  async run() {
    const r = this._run();
    return { success: true, meta: r.meta || { changes: r.rows.length } };
  }
}
env.DB = {
  prepare: (sql) => new Stmt(sql),
  async batch(stmts) {
    sqlite.exec("BEGIN");
    try {
      const out = [];
      for (const s of stmts) out.push(await s.all());
      sqlite.exec("COMMIT");
      return out;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};

// ---------- rotte delle functions ----------
const routes = [];
const middlewares = [];
function walk(dir, segs) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (name.startsWith("_lib")) continue;
    if (fs.statSync(full).isDirectory()) walk(full, [...segs, name]);
    else if (name === "_middleware.js") middlewares.push({ segs, file: full });
    else if (name.endsWith(".js")) {
      const base = name.slice(0, -3);
      routes.push({ segs: base === "index" ? segs : [...segs, base], file: full });
    }
  }
}
walk(FUNCTIONS, []);
const dyn = (s) => /^\[.+\]$/.test(s);
routes.sort((a, b) => b.segs.length - a.segs.length || a.segs.filter(dyn).length - b.segs.filter(dyn).length);
middlewares.sort((a, b) => a.segs.length - b.segs.length);

function match(segs, parts) {
  if (segs.length !== parts.length) return null;
  const params = {};
  for (let i = 0; i < segs.length; i++) {
    if (dyn(segs[i])) params[segs[i].slice(1, -1)] = decodeURIComponent(parts[i]);
    else if (segs[i] !== parts[i]) return null;
  }
  return params;
}

const modCache = new Map();
async function load(file) {
  if (!modCache.has(file)) modCache.set(file, await import(pathToFileURL(file).href));
  return modCache.get(file);
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2",
  ".json": "application/json", ".ico": "image/x-icon", ".txt": "text/plain", ".webmanifest": "application/manifest+json",
};

function staticFile(pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidates = [path.join(PUBLIC, clean)];
  if (clean.endsWith("/")) candidates.push(path.join(PUBLIC, clean, "index.html"));
  else candidates.push(path.join(PUBLIC, clean + ".html"), path.join(PUBLIC, clean, "index.html"));
  for (const c of candidates) {
    if (c.startsWith(PUBLIC) && fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

async function handle(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  for (const r of routes) {
    const params = match(r.segs, parts);
    if (!params) continue;
    const mod = await load(r.file);
    const handler = mod[`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`] || mod.onRequest;
    if (!handler) return new Response("Method Not Allowed", { status: 405 });
    const chain = [];
    for (const m of middlewares) if (m.segs.every((s, i) => s === parts[i])) chain.push((await load(m.file)).onRequest);
    chain.push(handler);
    const data = {};
    const pending = [];
    let i = 0;
    const ctx = {
      request, env, params, data,
      waitUntil: (p) => pending.push(p),
      next: () => chain[i++](ctx),
    };
    const res = await ctx.next();
    await Promise.allSettled(pending);
    return res;
  }
  const file = staticFile(url.pathname);
  if (!file) {
    const nf = path.join(PUBLIC, "404.html");
    return new Response(fs.existsSync(nf) ? fs.readFileSync(nf) : "Not found", { status: 404, headers: { "Content-Type": MIME[".html"] } });
  }
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" } });
}

http
  .createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
      });
      const response = await handle(request);
      const outHeaders = {};
      response.headers.forEach((v, k) => (outHeaders[k] = v));
      res.writeHead(response.status, outHeaders);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Errore: " + err.message);
    }
  })
  .listen(PORT, () => console.log(`Rock and Feller in locale: http://localhost:${PORT}  (admin: /admin)`));
