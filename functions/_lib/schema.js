// Struttura del database. Viene creata da sola alla prima richiesta (vedi ensureDb in db.js):
// non serve lanciare migrazioni a mano dalla console di Cloudflare.
// Per cambiare la struttura in futuro: aggiungi una nuova voce in MIGRATIONS (mai modificare quelle già esistenti).

export const MIGRATIONS = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#9e1c1f',
        item_color TEXT NOT NULL DEFAULT '#0c5636',
        note TEXT NOT NULL DEFAULT '',
        show_in_menu INTEGER NOT NULL DEFAULT 1,
        show_in_componi INTEGER NOT NULL DEFAULT 0,
        componi_label TEXT NOT NULL DEFAULT '',
        componi_role TEXT NOT NULL DEFAULT 'filling',
        componi_max INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        prefix TEXT NOT NULL DEFAULT '',
        pieces TEXT NOT NULL DEFAULT '',
        price_cents INTEGER,
        variants TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '',
        visual TEXT NOT NULL DEFAULT '',
        image_id TEXT,
        available INTEGER NOT NULL DEFAULT 1,
        visible INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS items_category ON items(category_id, sort)`,
      `CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'link',
        color TEXT NOT NULL DEFAULT '#9e1c1f',
        kind TEXT NOT NULL DEFAULT 'button',
        image_id TEXT,
        visible INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS qr_codes (
        slug TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        target TEXT NOT NULL,
        scans INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS qr_scans (
        slug TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (slug, day)
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        pass_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        iterations INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        data BLOB NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS login_attempts (
        ip TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        first_attempt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        user TEXT NOT NULL,
        action TEXT NOT NULL
      )`,
    ],
    seed: true,
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS gratta_plays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        day TEXT NOT NULL,
        device TEXT NOT NULL,
        ip TEXT NOT NULL,
        win INTEGER NOT NULL DEFAULT 0,
        code TEXT UNIQUE,
        expires_at INTEGER,
        used_at INTEGER,
        used_by TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS gratta_device_day ON gratta_plays(device, day)`,
      `CREATE INDEX IF NOT EXISTS gratta_ip_day ON gratta_plays(ip, day)`,
      `CREATE INDEX IF NOT EXISTS gratta_day ON gratta_plays(day, win)`,
    ],
    seed: "v2",
  },
  {
    version: 3,
    statements: [`ALTER TABLE categories ADD COLUMN layout TEXT NOT NULL DEFAULT 'list'`],
    seed: "v3",
  },
];
