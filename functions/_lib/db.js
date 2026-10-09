import { MIGRATIONS } from "./schema.js";
import { seedDatabase, seedV2, seedV3, DEFAULT_SITE } from "./seed.js";

let ready = null;

// Crea le tabelle e inserisce il menù iniziale la prima volta. Le volte dopo non fa niente.
export function ensureDb(env) {
  if (!env.DB) throw new Error("Database D1 non collegato: aggiungi il binding DB nelle impostazioni del progetto.");
  if (!ready) {
    ready = migrate(env.DB).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function migrate(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)").run();
  const row = await db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").first();
  const current = row ? Number(row.value) : 0;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await db.batch(m.statements.map((sql) => db.prepare(sql)));
    if (m.seed) {
      // Solo chi riesce a inserire questa riga fa il seed: evita doppioni se arrivano due richieste insieme.
      const key = m.seed === true ? "seeded" : `seeded_${m.seed}`;
      const claim = await db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)").bind(key, String(Date.now())).run();
      if (claim.meta && claim.meta.changes === 1) await ({ true: seedDatabase, v2: seedV2, v3: seedV3 }[m.seed])(db);
    }
    await db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(String(m.version))
      .run();
  }
}

export async function getSetting(env, key, fallback = null) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export async function setSetting(env, key, value) {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, JSON.stringify(value))
    .run();
}

export async function getSite(env) {
  return { ...DEFAULT_SITE, ...(await getSetting(env, "site", {})) };
}

const bool = (v) => v === 1 || v === true;

export function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    item_color: row.item_color,
    note: row.note,
    show_in_menu: bool(row.show_in_menu),
    show_in_componi: bool(row.show_in_componi),
    componi_label: row.componi_label,
    componi_role: row.componi_role,
    componi_max: row.componi_max,
    layout: row.layout || "list",
    visible: bool(row.visible),
    sort: row.sort,
  };
}

export function mapItem(row) {
  let variants = [];
  try {
    variants = JSON.parse(row.variants || "[]");
  } catch {}
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    prefix: row.prefix,
    pieces: row.pieces,
    price_cents: row.price_cents,
    variants,
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    visual: row.visual,
    image_id: row.image_id,
    available: bool(row.available),
    visible: bool(row.visible),
    sort: row.sort,
  };
}

export function mapLink(row) {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    icon: row.icon,
    color: row.color,
    kind: row.kind,
    image_id: row.image_id,
    visible: bool(row.visible),
    sort: row.sort,
  };
}

export const MAPPERS = { categories: mapCategory, items: mapItem, links: mapLink };

// Tutto quello che serve alle pagine pubbliche (includeHidden = true per il pannello).
export async function loadAll(env, { includeHidden = false } = {}) {
  const [cats, items, links, site, potm] = await Promise.all([
    env.DB.prepare("SELECT * FROM categories ORDER BY sort, id").all(),
    env.DB.prepare("SELECT * FROM items ORDER BY sort, id").all(),
    env.DB.prepare("SELECT * FROM links ORDER BY sort, id").all(),
    getSite(env),
    getSetting(env, "potm", null),
  ]);
  let categories = cats.results.map(mapCategory);
  let allItems = items.results.map(mapItem);
  let allLinks = links.results.map(mapLink);
  if (!includeHidden) {
    categories = categories.filter((c) => c.visible);
    allItems = allItems.filter((i) => i.visible);
    allLinks = allLinks.filter((l) => l.visible);
  }
  const byCat = new Map(categories.map((c) => [c.id, { ...c, items: [] }]));
  for (const item of allItems) byCat.get(item.category_id)?.items.push(item);
  const fullCategories = [...byCat.values()];

  let potmOut = null;
  if (potm && (includeHidden || potm.active)) {
    const linked = potm.item_id ? allItems.find((i) => i.id === potm.item_id) || null : null;
    potmOut = {
      ...potm,
      item: linked,
      display: {
        label: potm.label || "Panino del mese",
        period: potm.period || "",
        title: potm.title || linked?.name || "",
        description: potm.description || linked?.description || "",
        price_cents: potm.price_cents ?? linked?.price_cents ?? null,
        image_id: potm.image_id || linked?.image_id || null,
        tags: linked?.tags || [],
      },
    };
  }
  return { site, categories: fullCategories, links: allLinks, potm: potmOut };
}

export async function logActivity(env, user, action) {
  try {
    await env.DB.prepare("INSERT INTO activity (ts, user, action) VALUES (?, ?, ?)").bind(Date.now(), user, action).run();
    await env.DB.prepare("DELETE FROM activity WHERE id NOT IN (SELECT id FROM activity ORDER BY id DESC LIMIT 300)").run();
  } catch {}
}
