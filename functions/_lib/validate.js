import { HttpError } from "./auth.js";

const HEX = /^#[0-9a-fA-F]{6}$/;

function str(v, field, { max = 300, required = false, def = "" } = {}) {
  if (v === undefined || v === null) {
    if (required) throw new HttpError(`Manca il campo "${field}".`);
    return def;
  }
  if (typeof v !== "string") throw new HttpError(`Il campo "${field}" deve essere un testo.`);
  const s = v.trim();
  if (required && !s) throw new HttpError(`Il campo "${field}" non può essere vuoto.`);
  if (s.length > max) throw new HttpError(`Il campo "${field}" è troppo lungo (massimo ${max} caratteri).`);
  return s;
}

function bool(v, def = 1) {
  if (v === undefined || v === null) return def;
  return v === true || v === 1 || v === "1" ? 1 : 0;
}

function int(v, field, { min = 0, max = 1_000_000, def = 0, nullable = false } = {}) {
  if (v === undefined || v === "") return nullable ? null : def;
  if (v === null) {
    if (nullable) return null;
    throw new HttpError(`Il campo "${field}" è obbligatorio.`);
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(`Il campo "${field}" non è valido.`);
  return n;
}

export function color(v, field, def) {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v !== "string" || !HEX.test(v)) throw new HttpError(`Colore non valido per "${field}" (usa il formato #rrggbb).`);
  return v.toLowerCase();
}

export function url(v, field, { required = true } = {}) {
  const s = str(v, field, { max: 1000, required });
  if (!s) return s;
  if (s.startsWith("/") && !s.startsWith("//")) return s; // pagina del sito
  if (/^tel:[+\d\s]+$/.test(s) || /^mailto:\S+@\S+$/.test(s)) return s;
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new HttpError(`"${field}": scrivi un indirizzo completo (es. https://...) o una pagina del sito (es. /menu).`);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new HttpError(`"${field}": sono ammessi solo link http/https.`);
  return s;
}

function imageId(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !/^[a-f0-9]{24}$/.test(v)) throw new HttpError("Immagine non valida.");
  return v;
}

const VISUAL = /^[a-z_]{0,30}(:#[0-9a-fA-F]{6})?$/;

function variants(v) {
  if (v === undefined || v === null) return "[]";
  if (!Array.isArray(v) || v.length > 10) throw new HttpError("Varianti non valide.");
  return JSON.stringify(
    v.map((x, i) => {
      if (!x || typeof x !== "object") throw new HttpError("Varianti non valide.");
      return {
        label: str(x.label, `variante ${i + 1}`, { max: 120, required: true }),
        type: x.type === "price" ? "price" : "plus",
        price_cents: int(x.price_cents, `prezzo variante ${i + 1}`, { max: 100000, nullable: true }),
      };
    })
  );
}

// Ogni risorsa modificabile dal pannello: tabella e come pulire i campi in arrivo.
// partial = true durante gli aggiornamenti: i campi assenti non vengono toccati.
export const RESOURCES = {
  categories: {
    table: "categories",
    label: (r) => `categoria "${r.name}"`,
    clean(b, partial) {
      const out = {};
      const has = (k) => !partial || k in b;
      if (has("name")) out.name = str(b.name, "nome", { max: 60, required: true });
      if (has("color")) out.color = color(b.color, "colore", "#9e1c1f");
      if (has("item_color")) out.item_color = color(b.item_color, "colore prodotti", "#0c5636");
      if (has("note")) out.note = str(b.note, "nota", { max: 160 });
      if (has("show_in_menu")) out.show_in_menu = bool(b.show_in_menu);
      if (has("show_in_componi")) out.show_in_componi = bool(b.show_in_componi, 0);
      if (has("componi_label")) out.componi_label = str(b.componi_label, "titolo nel componi", { max: 40 });
      if (has("componi_role")) out.componi_role = ["base", "filling", "drink"].includes(b.componi_role) ? b.componi_role : "filling";
      if (has("componi_max")) out.componi_max = int(b.componi_max, "massimo scelte", { max: 50 });
      if (has("layout")) out.layout = b.layout === "combo" ? "combo" : "list";
      if (has("visible")) out.visible = bool(b.visible);
      return out;
    },
  },
  items: {
    table: "items",
    label: (r) => `"${r.name}"`,
    clean(b, partial) {
      const out = {};
      const has = (k) => !partial || k in b;
      if (has("category_id")) out.category_id = int(b.category_id, "categoria", { min: 1, max: 1e9 });
      if (has("name")) out.name = str(b.name, "nome", { max: 80, required: true });
      if (has("description")) out.description = str(b.description, "ingredienti", { max: 400 });
      if (has("prefix")) out.prefix = str(b.prefix, "nota prima del nome", { max: 60 });
      if (has("pieces")) out.pieces = str(b.pieces, "pezzi", { max: 20 });
      if (has("price_cents")) out.price_cents = int(b.price_cents, "prezzo", { max: 100000, nullable: true });
      if (has("variants")) out.variants = variants(b.variants);
      if (has("tags")) {
        const list = Array.isArray(b.tags) ? b.tags : String(b.tags || "").split(",");
        out.tags = list.map((t) => String(t).trim().toLowerCase()).filter((t) => /^[a-zà-ù0-9 -]{1,20}$/.test(t)).slice(0, 6).join(",");
      }
      if (has("visual")) {
        const v = str(b.visual, "disegno", { max: 40 });
        if (!VISUAL.test(v)) throw new HttpError("Disegno non valido.");
        out.visual = v;
      }
      if (has("image_id")) out.image_id = imageId(b.image_id);
      if (has("available")) out.available = bool(b.available);
      if (has("visible")) out.visible = bool(b.visible);
      return out;
    },
  },
  links: {
    table: "links",
    label: (r) => `link "${r.label}"`,
    clean(b, partial) {
      const out = {};
      const has = (k) => !partial || k in b;
      if (has("label")) out.label = str(b.label, "testo", { max: 60, required: true });
      if (has("url")) out.url = url(b.url, "link");
      if (has("icon")) out.icon = str(b.icon, "icona", { max: 20, def: "link" }) || "link";
      if (has("color")) out.color = color(b.color, "colore", "#9e1c1f");
      if (has("kind")) out.kind = b.kind === "social" ? "social" : "button";
      if (has("image_id")) out.image_id = imageId(b.image_id);
      if (has("visible")) out.visible = bool(b.visible);
      return out;
    },
  },
};

export function cleanSite(b) {
  return {
    name: str(b.name, "nome", { max: 60, required: true }),
    tagline: str(b.tagline, "sottotitolo", { max: 80 }),
    handle: str(b.handle, "nome social", { max: 40 }),
    address: str(b.address, "indirizzo", { max: 160 }),
    maps_url: b.maps_url ? url(b.maps_url, "link mappa") : "",
    phone: str(b.phone, "telefono", { max: 30 }),
    phone2: str(b.phone2, "secondo telefono", { max: 30 }),
    hours: str(b.hours, "orari", { max: 400 }),
    seasonal_note: str(b.seasonal_note, "nota stagionale", { max: 160 }),
    allergen_note: str(b.allergen_note, "nota allergeni", { max: 300 }),
  };
}

export function cleanPotm(b) {
  return {
    active: bool(b.active) === 1,
    label: str(b.label, "etichetta", { max: 40, def: "Panino del mese" }) || "Panino del mese",
    period: str(b.period, "periodo", { max: 40 }),
    item_id: int(b.item_id, "prodotto", { min: 1, max: 1e9, nullable: true }),
    title: str(b.title, "titolo", { max: 80 }),
    description: str(b.description, "descrizione", { max: 400 }),
    price_cents: int(b.price_cents, "prezzo", { max: 100000, nullable: true }),
    image_id: imageId(b.image_id),
  };
}

export function cleanQr(b, partial) {
  const out = {};
  if (!partial) {
    const slug = str(b.slug, "nome breve", { max: 40, required: true }).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(slug)) throw new HttpError("Il nome breve può avere solo lettere minuscole, numeri e trattini.");
    out.slug = slug;
  }
  if (!partial || "label" in b) out.label = str(b.label, "nome", { max: 60, required: true });
  if (!partial || "target" in b) out.target = url(b.target, "destinazione");
  return out;
}

export function cleanGratta(b) {
  return {
    active: bool(b.active) === 1,
    win_percent: int(b.win_percent, "probabilità di vincita", { min: 0, max: 100 }),
    max_wins_day: int(b.max_wins_day, "vincite massime al giorno", { max: 10000 }),
    plays_per_day: int(b.plays_per_day, "giocate per telefono", { min: 1, max: 20, def: 1 }),
    valid_days: int(b.valid_days, "giorni di validità", { min: 1, max: 365, def: 7 }),
    prize: str(b.prize, "premio", { max: 120, required: true }),
  };
}

export { str, int, bool };
