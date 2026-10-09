// Dati iniziali, copiati dal menù cartaceo. Vengono inseriti una volta sola, quando il database è vuoto.
// Dopo, tutto si modifica dal pannello /admin.

const SL = "*Selezione Letizia*";
const e = (euro) => Math.round(euro * 100);

const C = {
  rosso: "#9e1c1f",
  verde: "#0c5636",
  blu: "#1262a8",
  arancio: "#d7892c",
  giallo: "#f2a23a",
  verdino: "#00a54f",
};

// [nome, prezzo, opzioni]
const CATEGORIES = [
  {
    name: "Patatine", color: C.arancio, item_color: C.verde,
    items: [
      ["Classiche", 4], ["Würstel", 5], ["Salsa crispy + bacon", 5.5],
      ["Cheddar + bacon", 6], ["Würstel + bacon + cheddar", 6.5], ["Salsiccia + provola", 7],
      ["Bacon + provola", 7], ["Pulled + cheddar", 7.5], ["Hamburger + cheddar + salsa crispy", 8],
    ],
  },
  {
    name: "Antipasti", color: C.blu, item_color: C.verde,
    items: [
      ["Frittatina", 2, { pieces: "1pz" }], ["Crocchè", 2, { pieces: "1pz" }],
      ["Mozzarella sticks", 4, { pieces: "5pz" }], ["Anelli di cipolla", 3.5, { pieces: "5pz" }],
      ["Nuggets", 4, { pieces: "5pz" }], ["Bandidos", 4.5, { pieces: "5pz" }],
      ["Jalapeños", 5, { pieces: "4pz" }], ["Alette", 5, { pieces: "5pz" }],
      ["Polpettine pulled & cheddar", 7, { pieces: "5pz" }],
    ],
  },
  {
    name: "Piadine", color: C.rosso, item_color: C.verde, note: "aggiungi 3,50€ per avere il menù",
    items: [
      ["Rock and Feller", 5.5, {
        description: "Kebab, insalata, pomodori, patatine, salsa greca, ketchup, mayo",
        variants: [{ label: "Variante cipolla e piccante", type: "plus", price_cents: 50 }, { label: "Variante panino", type: "plus", price_cents: 100 }],
      }],
      ["Kebacon", 7, { description: "Kebab, bacon, cheddar, patatine" }],
      ["BBK", 8, { description: "Kebab, bacon, provola, patatine, salsa BBQ, mayo" }],
      ["Pistacchiosa", 8, { description: "Kebab, mortadella, provola, patatine, granella di pistacchio, pesto di pistacchio" }],
      ["Green", 7, { description: "Falafel, insalata, pomodori, patatine, salsa greca, cipolle, mayo, ketchup", tags: "veg" }],
    ],
  },
  {
    name: "Panini", color: C.arancio, item_color: C.verde, note: "aggiungi 3,50€ per avere il menù",
    items: [
      ["RFC", 8, { description: "Pollo fritto, provola, bacon, insalata, pomodori, salsa andalusa" }],
      ["Cinghialotto", 10, { description: `Porchetta ${SL}, funghi, provola impanata, mayo al pepe nero` }],
      ["Crispy Cheese Bacon", 8, {
        description: `Hamburger ${SL}, cheddar, bacon, salsa crispy`,
        variants: [{ label: "Doppio hamburger", type: "price", price_cents: 1250 }],
      }],
      ["Crispy Pork", 10, { prefix: "servito con ciabatta", description: `Pollo fritto, pulled pork ${SL}, patatine, cheddar, insalata, salsa rosa` }],
      ["Green Burger", 7, { description: "Provola impanata, patatine, peperoni fritti, mayo al pepe nero, onion jam", tags: "veg" }],
      ["Vegan Burger", 7, {
        description: "Burger di verdure, insalata, cipolla, pomodoro, mayo vegana", tags: "veg",
        variants: [{ label: "Veggy + provola", type: "plus", price_cents: 100 }],
      }],
      ["Classic Burger", 9, { description: `Hamburger ${SL}, insalata, pomodori, provola, onion jam, salsa BBQ` }],
      ["Hot Dog", 4, {
        description: "Würstel, salsa a scelta (max 2)",
        variants: [{ label: "Variante patatine", type: "price", price_cents: 450 }],
      }],
      ["Patapulled", 10, { description: `Pulled pork ${SL}, patate al forno, bacon, provola impanata, mayo pepe nero` }],
    ],
  },
  {
    name: "Burrito", color: C.blu, item_color: C.verde, note: "aggiungi 3,50€ per avere il menù",
    items: [
      ["Burrito Loco", 10, { description: `Pulled pork ${SL}, patatine, bacon, provola, salsa andalusa` }],
      ["Burrito Bacon Crispy", 10, { description: "Doppio kebab, cheddar, bacon, patatine, salsa crispy" }],
      ["Burrito Burger", 10, { description: `Hamburger sbriciolato ${SL}, patatine, provola, prosciutto cotto, mayo` }],
      ["Burrito Chicken", 10, { description: "Bandidos, patate al forno, provola, insalata, cheddar, mayo al pepe nero" }],
    ],
  },
  {
    name: "Dolci", color: C.rosso, item_color: C.giallo,
    items: [
      ["Churros", 5, {
        pieces: "5pz",
        variants: [{ label: "Crema a scelta: nutella, bianca, pistacchio e nocciola", type: "plus", price_cents: 50 }],
      }],
      ["Bueno Roll", 4, { description: "Piadina con nutella, crema nocciola e Bueno" }],
    ],
  },
  {
    name: "Bibite", color: C.verde, item_color: C.verde, show_in_componi: 1, componi_label: "Da bere?", componi_role: "drink",
    items: [
      ["Acqua", 1, { visual: "drink:#6fb7e0" }], ["Coca-Cola", 2.5, { visual: "drink:#c8261e" }],
      ["Coca-Cola Zero", 2.5, { visual: "drink:#1b1b1b" }], ["Fanta", 2.5, { visual: "drink:#f28a1a" }],
      ["Estathé", 3, { visual: "drink:#e0b13a" }], ["Sprite", 3, { visual: "drink:#2f9e5b" }],
      ["Nastro Azzurro 33cl", 2.5, { visual: "drink:#1f4fa0" }], ["Tennent's", 4, { visual: "drink:#c9a227" }],
      ["Ceres", 4, { visual: "drink:#b0181e" }], ["Bjorne", 4.5, { visual: "drink:#7a4a1c" }],
      ["Leffe Blonde/Rouge", 5, { visual: "drink:#b5761c" }], ["Heineken", 3, { visual: "drink:#1f7a3a" }],
    ],
  },
  {
    name: "Menù bambini", color: C.rosso, item_color: C.verde, note: "con bibita e patatine",
    items: [
      ["Cotoletta, hamburger, nuggets o toast", 6, { description: "Scegli tra cotoletta, hamburger, nuggets o toast. Con bibita e patatine." }],
    ],
  },
  // Sezioni del "Componi tu": non compaiono nel menù, solo nella pagina /componi
  {
    name: "Pane", color: C.verde, item_color: C.verde, show_in_menu: 0, show_in_componi: 1,
    componi_label: "Scegli la base", componi_role: "base", componi_max: 1,
    items: [
      ["Tortillas", 1.5, { visual: "wrap" }], ["Panino ciabatta", 2.5, { visual: "ciabatta" }],
      ["Panino tondo", 1.5, { visual: "bun" }], ["Panino hot dog", 1.5, { visual: "hotdog" }],
      ["Burrito", 2.5, { visual: "burrito" }], ["Vaschetta", 2, { visual: "tray" }],
    ],
  },
  {
    name: "Carni", color: C.verde, item_color: C.verde, show_in_menu: 0, show_in_componi: 1, componi_label: "Carni",
    items: [
      ["Kebab", 3, { visual: "kebab" }], ["Hamburger", 4.5, { visual: "patty" }], ["Würstel", 2.5, { visual: "wurstel" }],
      ["Cotoletta", 3.5, { visual: "cutlet" }], ["Salsiccia", 3.5, { visual: "sausage" }], ["Porchetta", 4, { visual: "porchetta" }],
      ["Bacon", 2, { visual: "bacon" }], ["Prosciutto cotto", 1, { visual: "ham" }], ["Prosciutto crudo", 1.5, { visual: "crudo" }],
      ["Mortadella", 1, { visual: "mortadella" }], ["Falafel", 4, { visual: "falafel", tags: "veg" }],
      ["Petto di pollo", 3, { visual: "chicken" }], ["Pulled pork", 4, { visual: "pulled" }], ["Bandidos", 3.5, { visual: "bandidos" }],
      ["Hamburger di verdure", 4, { visual: "veggie", tags: "veg" }],
    ],
  },
  {
    name: "Formaggi", color: C.verde, item_color: C.verde, show_in_menu: 0, show_in_componi: 1, componi_label: "Formaggi",
    items: [
      ["Provola impanata", 2.5, { visual: "provola_fried" }], ["Provola", 1.5, { visual: "provola" }],
      ["Sottiletta", 1, { visual: "cheese:#f6c544" }], ["Cheddar", 1, { visual: "cheese:#f09a1a" }],
    ],
  },
  {
    name: "Contorni", color: C.verde, item_color: C.verde, show_in_menu: 0, show_in_componi: 1, componi_label: "Contorni",
    items: [
      ["Insalata", 0.5, { visual: "lettuce" }], ["Pomodori", 0.5, { visual: "tomato" }], ["Patatine", 0.5, { visual: "fries" }],
      ["Patate al forno", 1.5, { visual: "potatoes" }], ["Friarielli", 1, { visual: "friarielli", tags: "stagionale" }],
      ["Zucchine arrostite", 1, { visual: "zucchini" }], ["Zucchine fritte", 1, { visual: "zucchini_fried" }],
      ["Funghi", 1, { visual: "mushrooms" }], ["Melanzane sott'olio", 1, { visual: "eggplant:#5b2a4e" }],
      ["Melanzane arrostite", 1, { visual: "eggplant:#4a2142" }], ["Melanzane a funghetto", 1, { visual: "eggplant:#7a3a2a" }],
      ["Cipolle", 0.5, { visual: "onion" }], ["Cipolla caramellata", 1, { visual: "onion_caramel" }],
      ["Anelli di cipolla", 1.5, { visual: "onion_rings" }], ["Cipolla croccante", 1, { visual: "onion_crispy" }],
      ["Peperoni", 1, { visual: "peppers" }],
    ],
  },
  {
    name: "Salse", color: C.verde, item_color: C.verde, show_in_menu: 0, show_in_componi: 1, componi_label: "Salse",
    items: [
      ["Ketchup", 0.2, { visual: "sauce:#c8261e" }], ["Maionese", 0.2, { visual: "sauce:#f3e9bf" }],
      ["Greca", 0.2, { visual: "sauce:#eef0e2" }], ["Salsa BBQ", 0.5, { visual: "sauce:#5a2414" }],
      ["Senape", 0.5, { visual: "sauce:#e2b21c" }], ["Tabasco", 0.5, { visual: "sauce:#b3260e" }],
      ["Rosa", 0.5, { visual: "sauce:#f19c86" }], ["Andalusa", 0.5, { visual: "sauce:#e8803a" }],
      ["Maio al pepe nero", 0.5, { visual: "sauce:#e6dec2" }], ["Salsa burger", 0.5, { visual: "sauce:#e3a356" }],
      ["Pistacchio", 1, { visual: "sauce:#8fae3c" }], ["Caesar", 0.5, { visual: "sauce:#efe0b0", tags: "stagionale" }],
      ["Mayo al bacon", 0.5, { visual: "sauce:#e0b48c" }], ["Salsa crispy", 0.5, { visual: "sauce:#efbd55" }],
      ["Cheddar", 1, { visual: "sauce:#f2a31b" }],
    ],
  },
];

const LINKS = [
  { label: "Menù", url: "/menu", icon: "menu", color: C.rosso, kind: "button" },
  { label: "Componi tu", url: "/componi", icon: "burger", color: C.arancio, kind: "button" },
  { label: "Ordina con Glovo", url: "https://ufv9.adj.st?adjust_deeplink=glovoapp%3A%2F%2Fopen%3Flink_type%3Dstore%26store_id%3D431670&adjust_t=s321jkn", icon: "scooter", color: C.verde, kind: "button" },
  { label: "Ordina con Alfonsino", url: "https://alfonsino.delivery/partner/1648/rock-and-feller/prodotti", icon: "bag", color: C.blu, kind: "button" },
  { label: "Prenota il tuo tavolo con TheFork", url: "https://www.thefork.it/", icon: "table", color: C.rosso, kind: "button" },
  { label: "Instagram", url: "https://www.instagram.com/rockandfeller/", icon: "camera", color: C.rosso, kind: "social" },
  { label: "TikTok", url: "https://www.tiktok.com/@rockandfeller", icon: "music", color: C.rosso, kind: "social" },
  { label: "Facebook", url: "https://www.facebook.com/rockandfellerCaserta", icon: "people", color: C.rosso, kind: "social" },
];

const QR = [
  { slug: "panino-del-mese", label: "Panino del mese", target: "/del-mese" },
  { slug: "menu", label: "Menù", target: "/menu" },
  { slug: "componi", label: "Componi tu", target: "/componi" },
  { slug: "home", label: "Pagina iniziale", target: "/" },
  { slug: "gratta", label: "Gratta e vinci", target: "/gratta" },
];

export const DEFAULT_SITE = {
  name: "Rock and Feller",
  tagline: "Caserta Doner Kebab",
  handle: "@rockandfeller",
  address: "",
  maps_url: "",
  phone: "0823 356742",
  phone2: "334 863 7298",
  hours: "",
  seasonal_note: "Prodotti soggetti a disponibilità stagionale",
  allergen_note: "Per allergeni e intolleranze chiedi al personale.",
};

export async function seedDatabase(db) {
  const now = Date.now();
  const statements = [];
  let catSort = 0;
  let potmName = "Pistacchiosa";
  for (const cat of CATEGORIES) {
    catSort += 10;
    statements.push(
      db.prepare(
        `INSERT INTO categories (name, color, item_color, note, show_in_menu, show_in_componi, componi_label, componi_role, componi_max, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        cat.name, cat.color, cat.item_color, cat.note || "", cat.show_in_menu ?? 1, cat.show_in_componi ?? 0,
        cat.componi_label || "", cat.componi_role || "filling", cat.componi_max || 0, catSort
      )
    );
    let itemSort = 0;
    for (const [name, price, opts = {}] of cat.items) {
      itemSort += 10;
      statements.push(
        db.prepare(
          `INSERT INTO items (category_id, name, description, prefix, pieces, price_cents, variants, tags, visual, sort)
           VALUES ((SELECT id FROM categories WHERE name = ? AND sort = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          cat.name, catSort, name, opts.description || "", opts.prefix || "", opts.pieces || "", e(price),
          JSON.stringify(opts.variants || []), opts.tags || "", opts.visual || "", itemSort
        )
      );
    }
  }
  LINKS.forEach((l, i) => {
    statements.push(
      db.prepare("INSERT INTO links (label, url, icon, color, kind, sort) VALUES (?, ?, ?, ?, ?, ?)").bind(l.label, l.url, l.icon, l.color, l.kind, (i + 1) * 10)
    );
  });
  for (const q of QR) {
    statements.push(
      db.prepare("INSERT INTO qr_codes (slug, label, target, scans, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)").bind(q.slug, q.label, q.target, now, now)
    );
  }
  statements.push(db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('site', ?)").bind(JSON.stringify(DEFAULT_SITE)));
  await db.batch(statements);

  const potmItem = await db.prepare("SELECT id FROM items WHERE name = ?").bind(potmName).first();
  const potm = {
    active: true,
    label: "Panino del mese",
    period: "",
    item_id: potmItem ? potmItem.id : null,
    title: "",
    description: "",
    price_cents: null,
    image_id: null,
  };
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('potm', ?)").bind(JSON.stringify(potm)).run();
}

// Aggiornamento 2: menù bambini, TheFork, gratta e vinci, niente coperto.
// Aggiunge solo quello che manca, così funziona anche su un database già pieno.
export async function seedV2(db) {
  const now = Date.now();
  const kids = await db.prepare("SELECT id FROM categories WHERE name = ?").bind("Menù bambini").first();
  if (!kids) {
    const max = await db.prepare("SELECT COALESCE(MAX(sort), 0) AS m FROM categories WHERE show_in_menu = 1").first();
    const cat = await db
      .prepare("INSERT INTO categories (name, color, item_color, note, show_in_menu, show_in_componi, sort) VALUES (?, ?, ?, ?, 1, 0, ?) RETURNING id")
      .bind("Menù bambini", C.rosso, C.verde, "con bibita e patatine", (max?.m || 0) + 5)
      .first();
    await db
      .prepare("INSERT INTO items (category_id, name, description, price_cents, sort) VALUES (?, ?, ?, ?, 10)")
      .bind(cat.id, "Cotoletta, hamburger, nuggets o toast", "Scegli tra cotoletta, hamburger, nuggets o toast. Con bibita e patatine.", 600)
      .run();
  }
  const fork = await db.prepare("SELECT id FROM links WHERE url LIKE '%thefork%' OR label LIKE '%TheFork%'").first();
  if (!fork) {
    const max = await db.prepare("SELECT COALESCE(MAX(sort), 0) AS m FROM links WHERE kind = 'button'").first();
    await db
      .prepare("INSERT INTO links (label, url, icon, color, kind, sort) VALUES (?, ?, 'table', ?, 'button', ?)")
      .bind("Prenota il tuo tavolo con TheFork", "https://www.thefork.it/", C.rosso, (max?.m || 0) + 5)
      .run();
  }
  await db
    .prepare("INSERT OR IGNORE INTO qr_codes (slug, label, target, scans, created_at, updated_at) VALUES ('gratta', 'Gratta e vinci', '/gratta', 0, ?, ?)")
    .bind(now, now)
    .run();
  const site = await db.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  if (site) {
    try {
      const v = JSON.parse(site.value);
      if ("coperto_cents" in v) {
        delete v.coperto_cents;
        await db.prepare("UPDATE settings SET value = ? WHERE key = 'site'").bind(JSON.stringify(v)).run();
      }
    } catch {}
  }
  await db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('gratta', ?)").bind(JSON.stringify(DEFAULT_GRATTA)).run();
}

export const DEFAULT_GRATTA = {
  active: true,
  win_percent: 10,
  max_wins_day: 10,
  plays_per_day: 1,
  valid_days: 7,
  prize: "10% di sconto sul panino del mese",
};
