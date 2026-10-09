// Disegni del "Componi tu": ogni ingrediente ha un "visual" (es. "kebab", "cheese:#f09a1a", "sauce:#c8261e")
// e qui diventa uno strato SVG. Il panino si costruisce dal basso verso l'alto nell'ordine in cui tocchi gli ingredienti.

export const W = 360;
const CX = W / 2;

// Elenco usato anche dal pannello admin per scegliere il disegno di un ingrediente nuovo.
export const PRESETS = {
  // basi
  bun: { label: "Panino tondo", role: "base" },
  ciabatta: { label: "Ciabatta", role: "base" },
  hotdog: { label: "Panino hot dog", role: "base" },
  wrap: { label: "Tortilla / piadina", role: "base" },
  burrito: { label: "Burrito", role: "base" },
  tray: { label: "Vaschetta", role: "base" },
  // carni
  kebab: { label: "Kebab" },
  patty: { label: "Hamburger" },
  wurstel: { label: "Würstel" },
  cutlet: { label: "Cotoletta / pollo fritto" },
  sausage: { label: "Salsiccia" },
  porchetta: { label: "Porchetta" },
  bacon: { label: "Bacon" },
  ham: { label: "Prosciutto cotto" },
  crudo: { label: "Prosciutto crudo" },
  mortadella: { label: "Mortadella" },
  falafel: { label: "Falafel / polpette" },
  chicken: { label: "Petto di pollo" },
  pulled: { label: "Pulled pork" },
  bandidos: { label: "Bandidos / croccante" },
  veggie: { label: "Burger di verdure" },
  // formaggi
  cheese: { label: "Formaggio fuso (colore)", color: "#f09a1a" },
  provola: { label: "Provola" },
  provola_fried: { label: "Provola impanata" },
  // verdure
  lettuce: { label: "Insalata" },
  tomato: { label: "Pomodori" },
  fries: { label: "Patatine" },
  potatoes: { label: "Patate al forno" },
  friarielli: { label: "Friarielli / verdura a foglia" },
  zucchini: { label: "Zucchine" },
  zucchini_fried: { label: "Zucchine fritte" },
  mushrooms: { label: "Funghi" },
  eggplant: { label: "Melanzane (colore)", color: "#5b2a4e" },
  onion: { label: "Cipolla" },
  onion_caramel: { label: "Cipolla caramellata" },
  onion_rings: { label: "Anelli di cipolla" },
  onion_crispy: { label: "Cipolla croccante" },
  peppers: { label: "Peperoni" },
  // altro
  sauce: { label: "Salsa (colore)", color: "#c8261e" },
  drink: { label: "Bibita (colore lattina)", color: "#c8261e", role: "drink" },
  generic: { label: "Generico (colore)", color: "#b5835a" },
};

export function parseVisual(v) {
  const [kind, color] = String(v || "").split(":");
  return { kind: PRESETS[kind] ? kind : "generic", color: color || PRESETS[kind]?.color || "#b5835a" };
}

// Numeri pseudo-casuali ma stabili per lo stesso ingrediente.
function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 48271) % 2147483647) / 2147483647);
}

const f = (n) => Math.round(n * 10) / 10;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Bordo ondulato tra x0 e x1 all'altezza y.
function wave(x0, x1, y, amp, n, r) {
  let d = "";
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const xa = x0 + step * i;
    d += ` Q${f(xa + step / 2)} ${f(y + (i % 2 ? amp : -amp) * (0.6 + r() * 0.8))} ${f(xa + step)} ${f(y)}`;
  }
  return d;
}

// Larghezza del panino a seconda del pane
export function baseWidth(baseKind) {
  return { hotdog: 300, ciabatta: 270, wrap: 290, burrito: 270, tray: 280 }[baseKind] || 250;
}

// ---------- strati (y = bordo superiore, h = altezza) ----------
const LAYERS = {
  kebab(y, w, c, r) {
    const x0 = CX - w / 2 - 4, x1 = CX + w / 2 + 4;
    const cols = ["#7d3f1c", "#a35a2a", "#c47a3e", "#8f4b22"];
    let s = "";
    for (let i = 0; i < 4; i++) {
      const yy = y + 4 + i * 6;
      s += `<path d="M${x0 + r() * 8} ${yy + 8}${wave(x0 + 4, x1 - 4, yy, 4, 14, r)} L${x1 - r() * 8} ${yy + 10} Z" fill="${cols[i]}"/>`;
    }
    return { svg: s, h: 30 };
  },
  patty(y, w) {
    const x0 = CX - w / 2 + 2;
    let s = `<rect x="${x0}" y="${y}" width="${w - 4}" height="30" rx="14" fill="#5a2e18"/>`;
    s += `<rect x="${x0 + 6}" y="${y + 3}" width="${w - 16}" height="7" rx="4" fill="#7a4224"/>`;
    for (let i = 1; i < 7; i++) s += `<path d="M${x0 + (w / 7) * i - 8} ${y + 14} l14 -2" stroke="#3a1b0d" stroke-width="3" stroke-linecap="round"/>`;
    return { svg: s, h: 30 };
  },
  wurstel(y, w) {
    const len = w * 0.92;
    const x = CX - len / 2;
    return {
      svg: `<rect x="${x}" y="${y + 1}" width="${len}" height="13" rx="6.5" fill="#c4603a"/><rect x="${x + 8}" y="${y + 3}" width="${len - 40}" height="3" rx="1.5" fill="#e08a60"/>
            <rect x="${x + 6}" y="${y + 11}" width="${len - 12}" height="13" rx="6.5" fill="#b4522f"/><rect x="${x + 14}" y="${y + 13}" width="${len - 50}" height="3" rx="1.5" fill="#d27a52"/>`,
      h: 24,
    };
  },
  cutlet(y, w, c, r) {
    const x0 = CX - w / 2 - 6, x1 = CX + w / 2 + 6;
    let s = `<path d="M${x0} ${y + 12}${wave(x0, x1, y + 4, 4, 10, r)} L${x1} ${y + 18}${wave(x1, x0, y + 22, 3, 10, r).replace(/Q/g, "Q")} Z" fill="#d39234"/>`;
    for (let i = 0; i < 26; i++) s += `<circle cx="${f(x0 + 10 + r() * (w - 8))}" cy="${f(y + 7 + r() * 13)}" r="${f(1 + r() * 1.6)}" fill="${r() > 0.5 ? "#a96a1c" : "#f0bd63"}"/>`;
    return { svg: s, h: 24 };
  },
  sausage(y, w) {
    let s = "";
    const n = Math.round(w / 46);
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 24 + i * ((w - 48) / (n - 1));
      s += `<ellipse cx="${f(cx)}" cy="${y + 11}" rx="22" ry="11" fill="#8c3a22"/><ellipse cx="${f(cx)}" cy="${y + 10}" rx="18" ry="8" fill="#b8573a"/>
            <circle cx="${f(cx - 6)}" cy="${y + 9}" r="2" fill="#e8b49a"/><circle cx="${f(cx + 7)}" cy="${y + 12}" r="1.6" fill="#e8b49a"/>`;
    }
    return { svg: s, h: 22 };
  },
  porchetta(y, w, c, r) {
    const x0 = CX - w / 2 - 2, x1 = CX + w / 2 + 2;
    return {
      svg: `<path d="M${x0} ${y + 6}${wave(x0, x1, y + 4, 3, 8, r)} L${x1} ${y + 20} L${x0} ${y + 20} Z" fill="#e3a596"/>
            <path d="M${x0} ${y + 20}${wave(x0, x1, y + 15, 2, 8, r)} L${x1} ${y + 24} L${x0} ${y + 24} Z" fill="#f6e6d4"/>
            <path d="M${x0} ${y + 24} L${x1} ${y + 24}" stroke="#9a5a2a" stroke-width="3"/>`,
      h: 24,
    };
  },
  bacon(y, w, c, r) {
    const x0 = CX - w / 2 - 10, x1 = CX + w / 2 + 10;
    return {
      svg: `<path d="M${x0} ${y + 7}${wave(x0, x1, y + 7, 5, 7, r)}" stroke="#a83a2a" stroke-width="9" fill="none" stroke-linecap="round"/>
            <path d="M${x0} ${y + 7}${wave(x0, x1, y + 7, 5, 7, r)}" stroke="#f0c2a8" stroke-width="2.5" fill="none" transform="translate(0 -1)"/>
            <path d="M${x0 + 6} ${y + 13}${wave(x0 + 6, x1 - 6, y + 13, 4, 7, r)}" stroke="#c04b33" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      h: 18,
    };
  },
  ham(y, w, c, r) {
    const x0 = CX - w / 2 - 8, x1 = CX + w / 2 + 8;
    return { svg: `<path d="M${x0} ${y + 12}${wave(x0, x1, y + 5, 5, 6, r)} L${x1} ${y + 14}${wave(x1, x0, y + 15, 3, 6, r)} Z" fill="${c || "#f1a7a0"}" stroke="${shade(c || "#f1a7a0", -0.15)}" stroke-width="1.5"/>`, h: 16 };
  },
  crudo(y, w, c, r) {
    const x0 = CX - w / 2 - 8, x1 = CX + w / 2 + 8;
    return {
      svg: `<path d="M${x0} ${y + 11}${wave(x0, x1, y + 5, 5, 6, r)} L${x1} ${y + 14}${wave(x1, x0, y + 15, 3, 6, r)} Z" fill="#c4505a"/>
            <path d="M${x0 + 2} ${y + 6}${wave(x0 + 2, x1 - 2, y + 4, 5, 6, r)}" stroke="#fbeee8" stroke-width="2.5" fill="none"/>`,
      h: 16,
    };
  },
  mortadella(y, w, c, r) {
    const x0 = CX - w / 2 - 8, x1 = CX + w / 2 + 8;
    let s = `<path d="M${x0} ${y + 11}${wave(x0, x1, y + 5, 5, 6, r)} L${x1} ${y + 14}${wave(x1, x0, y + 15, 3, 6, r)} Z" fill="#f3b5ae"/>`;
    for (let i = 0; i < 12; i++) s += `<circle cx="${f(x0 + 14 + r() * (w - 10))}" cy="${f(y + 7 + r() * 6)}" r="${f(1.3 + r())}" fill="${i % 4 ? "#fff4ef" : "#6e9a2c"}"/>`;
    return { svg: s, h: 16 };
  },
  falafel(y, w) {
    let s = "";
    const n = Math.max(4, Math.round(w / 52));
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 26 + i * ((w - 52) / (n - 1));
      s += `<circle cx="${f(cx)}" cy="${y + 13}" r="14" fill="#8a5f22"/><circle cx="${f(cx - 4)}" cy="${y + 9}" r="5" fill="#b07f36"/><circle cx="${f(cx + 5)}" cy="${y + 16}" r="1.8" fill="#5d7a2a"/>`;
    }
    return { svg: s, h: 26 };
  },
  chicken(y, w, c, r) {
    let s = "";
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = CX - w / 2 + i * (w / n) + 2;
      const yy = y + (i % 2) * 4;
      s += `<rect x="${f(x)}" y="${yy}" width="${f(w / n + 6)}" height="15" rx="7" fill="#e3bb84"/>`;
      s += `<path d="M${f(x + 12)} ${yy + 3} l-6 10 M${f(x + 30)} ${yy + 3} l-6 10 M${f(x + 48)} ${yy + 3} l-6 10" stroke="#b07a3a" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    return { svg: s, h: 20 };
  },
  pulled(y, w, c, r) {
    let s = `<rect x="${CX - w / 2 + 4}" y="${y + 6}" width="${w - 8}" height="18" rx="9" fill="#6e3218"/>`;
    for (let i = 0; i < 16; i++) {
      const x = CX - w / 2 + 6 + r() * (w - 30);
      s += `<path d="M${f(x)} ${f(y + 6 + r() * 14)} q${f(10 + r() * 10)} ${f(-6 + r() * 12)} ${f(24 + r() * 14)} ${f(-4 + r() * 8)}" stroke="${r() > 0.5 ? "#9a4d24" : "#4e200e"}" stroke-width="${f(2 + r() * 2)}" fill="none" stroke-linecap="round"/>`;
    }
    return { svg: s, h: 26 };
  },
  bandidos(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 9; i++) {
      const x = CX - w / 2 + 10 + i * ((w - 20) / 8);
      const yy = y + 4 + r() * 6;
      s += `<path d="M${f(x - 16)} ${f(yy + 12)} l${f(6 + r() * 4)} -12 l${f(14 + r() * 6)} ${f(-2 + r() * 3)} l${f(6 + r() * 4)} 14 z" fill="${i % 2 ? "#d58f2c" : "#e6a640"}" stroke="#a96717" stroke-width="1.5" stroke-linejoin="round"/>`;
    }
    return { svg: s, h: 22 };
  },
  veggie(y, w, c, r) {
    const x0 = CX - w / 2 + 2;
    let s = `<rect x="${x0}" y="${y}" width="${w - 4}" height="28" rx="13" fill="#6b6f33"/>`;
    for (let i = 0; i < 22; i++) s += `<circle cx="${f(x0 + 10 + r() * (w - 24))}" cy="${f(y + 5 + r() * 18)}" r="${f(1.5 + r() * 2)}" fill="${["#a8c25a", "#e48b3a", "#f2d27a", "#3f5c22"][i % 4]}"/>`;
    return { svg: s, h: 28 };
  },
  cheese(y, w, c, r) {
    const col = c || "#f09a1a";
    const x0 = CX - w / 2 - 6, x1 = CX + w / 2 + 6;
    let d = `M${x0} ${y} L${x1} ${y} L${x1} ${y + 8}`;
    const drips = 6;
    for (let i = drips; i > 0; i--) {
      const xa = x0 + ((x1 - x0) / drips) * i;
      const xb = x0 + ((x1 - x0) / drips) * (i - 1);
      const mid = (xa + xb) / 2;
      d += ` L${f(xa - 6)} ${y + 8} Q${f(mid)} ${f(y + 18 + r() * 14)} ${f(xb + 6)} ${y + 8}`;
    }
    d += ` L${x0} ${y + 8} Z`;
    return { svg: `<path d="${d}" fill="${col}"/><rect x="${x0 + 10}" y="${y + 2}" width="${w * 0.5}" height="2.5" rx="1.2" fill="${shade(col, 0.35)}"/>`, h: 10 };
  },
  provola(y, w, c, r) {
    const x0 = CX - w / 2 - 2, x1 = CX + w / 2 + 2;
    return {
      svg: `<path d="M${x0} ${y + 2} L${x1} ${y + 2} L${x1} ${y + 9} Q${x1 - 20} ${y + 20} ${x1 - 40} ${y + 10} L${x0 + 50} ${y + 10} Q${x0 + 30} ${y + 22} ${x0 + 14} ${y + 10} L${x0} ${y + 10} Z" fill="#f5ead0" stroke="#e2d0a4" stroke-width="1.5"/>`,
      h: 12,
    };
  },
  provola_fried(y, w, c, r) {
    const x0 = CX - w / 2 + 6;
    let s = `<rect x="${x0}" y="${y}" width="${w - 12}" height="22" rx="8" fill="#dd9d3a"/><rect x="${x0 + 6}" y="${y + 17}" width="${w - 24}" height="5" rx="2" fill="#f5ead0"/>`;
    for (let i = 0; i < 24; i++) s += `<circle cx="${f(x0 + 6 + r() * (w - 24))}" cy="${f(y + 3 + r() * 12)}" r="${f(1 + r() * 1.5)}" fill="${r() > 0.5 ? "#b06e1a" : "#f2c46a"}"/>`;
    return { svg: s, h: 22 };
  },
  lettuce(y, w, c, r) {
    const x0 = CX - w / 2 - 14, x1 = CX + w / 2 + 14;
    return {
      svg: `<path d="M${x0} ${y + 10}${wave(x0, x1, y + 8, 7, 14, r)} L${x1 - 6} ${y + 16} L${x0 + 6} ${y + 16} Z" fill="#5f9e3e"/>
            <path d="M${x0 + 8} ${y + 12}${wave(x0 + 8, x1 - 8, y + 12, 5, 12, r)} L${x1 - 10} ${y + 17} L${x0 + 10} ${y + 17} Z" fill="#8cc63f"/>`,
      h: 17,
    };
  },
  tomato(y, w) {
    let s = "";
    const n = Math.round(w / 64);
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 34 + i * ((w - 68) / Math.max(1, n - 1));
      s += `<rect x="${f(cx - 34)}" y="${y}" width="68" height="12" rx="6" fill="#d8322a"/><rect x="${f(cx - 28)}" y="${y + 3}" width="56" height="5" rx="2.5" fill="#f2665a"/>
            <ellipse cx="${f(cx - 12)}" cy="${y + 5}" rx="3" ry="1.6" fill="#f7d36a"/><ellipse cx="${f(cx + 12)}" cy="${y + 5}" rx="3" ry="1.6" fill="#f7d36a"/>`;
    }
    return { svg: s, h: 12 };
  },
  fries(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 18; i++) {
      const x = CX - w / 2 + r() * (w - 60);
      const yy = y + 4 + r() * 16;
      const ang = -12 + r() * 24;
      s += `<rect x="${f(x)}" y="${f(yy)}" width="${f(56 + r() * 20)}" height="8" rx="2.5" fill="${r() > 0.3 ? "#f2c14e" : "#e3a835"}" stroke="#c98a1f" stroke-width="1" transform="rotate(${f(ang)} ${f(x + 30)} ${f(yy + 4)})"/>`;
    }
    return { svg: s, h: 28 };
  },
  potatoes(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 7; i++) {
      const x = CX - w / 2 + 6 + i * ((w - 40) / 6);
      const yy = y + 4 + r() * 6;
      s += `<path d="M${f(x)} ${f(yy + 16)} Q${f(x + 2)} ${f(yy)} ${f(x + 18)} ${f(yy + 2)} Q${f(x + 34)} ${f(yy + 6)} ${f(x + 32)} ${f(yy + 16)} Z" fill="#e3a548" stroke="#9a5a1e" stroke-width="2.5"/>`;
    }
    return { svg: s, h: 24 };
  },
  friarielli(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 14; i++) {
      const x = CX - w / 2 + r() * w;
      s += `<ellipse cx="${f(x)}" cy="${f(y + 6 + r() * 8)}" rx="${f(12 + r() * 10)}" ry="${f(4 + r() * 3)}" fill="${r() > 0.5 ? "#2f5d27" : "#3f7a2f"}" transform="rotate(${f(-20 + r() * 40)} ${f(x)} ${y + 10})"/>`;
    }
    return { svg: s, h: 16 };
  },
  zucchini(y, w, c, r, fried) {
    let s = "";
    const n = Math.round(w / 40);
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 20 + i * ((w - 40) / (n - 1));
      s += fried
        ? `<ellipse cx="${f(cx)}" cy="${y + 7}" rx="20" ry="7" fill="#e0a640" stroke="#b47a1f" stroke-width="1.5"/>`
        : `<ellipse cx="${f(cx)}" cy="${y + 7}" rx="20" ry="7" fill="#4f7d2a"/><ellipse cx="${f(cx)}" cy="${y + 6}" rx="16" ry="4.5" fill="#d7e5a6"/><path d="M${f(cx - 10)} ${y + 6} h20" stroke="#4f7d2a" stroke-width="1.5" stroke-dasharray="2 4"/>`;
    }
    return { svg: s, h: 14 };
  },
  zucchini_fried(y, w, c, r) {
    return LAYERS.zucchini(y, w, c, r, true);
  },
  mushrooms(y, w, c, r) {
    let s = "";
    const n = Math.round(w / 40);
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 20 + i * ((w - 40) / (n - 1)) + (r() - 0.5) * 6;
      s += `<path d="M${f(cx - 17)} ${y + 10} Q${f(cx)} ${y - 4} ${f(cx + 17)} ${y + 10} Z" fill="#8b6a4e"/><rect x="${f(cx - 5)}" y="${y + 9}" width="10" height="9" rx="3" fill="#e9dcc6"/>`;
    }
    return { svg: s, h: 18 };
  },
  eggplant(y, w, c, r) {
    const col = c || "#5b2a4e";
    let s = "";
    const n = Math.round(w / 56);
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 28 + i * ((w - 56) / Math.max(1, n - 1));
      s += `<ellipse cx="${f(cx)}" cy="${y + 8}" rx="30" ry="8" fill="${col}"/><ellipse cx="${f(cx)}" cy="${y + 7}" rx="25" ry="5" fill="#e9d9a8"/><path d="M${f(cx - 14)} ${y + 7} h28" stroke="#b49a5a" stroke-width="1.5" stroke-dasharray="1 4" stroke-linecap="round"/>`;
    }
    return { svg: s, h: 16 };
  },
  onion(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 8; i++) {
      const cx = CX - w / 2 + 16 + r() * (w - 32);
      s += `<ellipse cx="${f(cx)}" cy="${f(y + 5 + r() * 3)}" rx="${f(14 + r() * 8)}" ry="4" fill="none" stroke="${r() > 0.5 ? "#efe6f2" : "#c9a5cf"}" stroke-width="3"/>`;
    }
    return { svg: s, h: 12 };
  },
  onion_caramel(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 16; i++) {
      const x = CX - w / 2 + r() * (w - 30);
      s += `<path d="M${f(x)} ${f(y + 4 + r() * 6)} q12 ${f(-6 + r() * 12)} 28 ${f(-3 + r() * 6)}" stroke="${r() > 0.5 ? "#9a5a1e" : "#7a3e12"}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    }
    return { svg: s, h: 12 };
  },
  onion_rings(y, w) {
    let s = "";
    const n = Math.round(w / 52);
    for (let i = 0; i < n; i++) {
      const cx = CX - w / 2 + 26 + i * ((w - 52) / (n - 1));
      s += `<ellipse cx="${f(cx)}" cy="${y + 10}" rx="25" ry="10" fill="none" stroke="#d99a3a" stroke-width="7"/><ellipse cx="${f(cx)}" cy="${y + 10}" rx="25" ry="10" fill="none" stroke="#f0c063" stroke-width="2" stroke-dasharray="3 5"/>`;
    }
    return { svg: s, h: 20 };
  },
  onion_crispy(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 40; i++) s += `<circle cx="${f(CX - w / 2 + r() * w)}" cy="${f(y + 3 + r() * 7)}" r="${f(1.5 + r() * 2.2)}" fill="${r() > 0.5 ? "#a5641f" : "#d0903a"}"/>`;
    return { svg: s, h: 10 };
  },
  peppers(y, w, c, r) {
    let s = "";
    for (let i = 0; i < 9; i++) {
      const x = CX - w / 2 + r() * (w - 40);
      s += `<path d="M${f(x)} ${f(y + 6 + r() * 4)} q20 ${f(-8 + r() * 8)} 42 0" stroke="${["#d8322a", "#f2b31b", "#3f8a2f"][i % 3]}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    return { svg: s, h: 12 };
  },
  sauce(y, w, c, r) {
    const col = c || "#c8261e";
    const x0 = CX - w / 2 + 6, x1 = CX + w / 2 - 6;
    let d = `M${x0} ${y + 4}`;
    const n = 9;
    for (let i = 1; i <= n; i++) d += ` L${f(x0 + ((x1 - x0) / n) * i)} ${y + (i % 2 ? 9 : 2)}`;
    let drips = "";
    for (let i = 0; i < 3; i++) {
      const x = x0 + 20 + r() * (x1 - x0 - 40);
      drips += `<path d="M${f(x - 3)} ${y + 6} q3 ${f(10 + r() * 8)} 6 0" fill="${col}"/>`;
    }
    const stroke = shade(col, -0.25);
    return { svg: `<path d="${d}" stroke="${stroke}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${col}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${drips}`, h: 7 };
  },
  generic(y, w, c, r) {
    const col = c || "#b5835a";
    const x0 = CX - w / 2 - 2, x1 = CX + w / 2 + 2;
    return { svg: `<path d="M${x0} ${y + 7}${wave(x0, x1, y + 5, 3, 8, r)} L${x1} ${y + 14} L${x0} ${y + 14} Z" fill="${col}" stroke="${shade(col, -0.2)}" stroke-width="1.5"/>`, h: 14 };
  },
};

// ---------- pane ----------
function baseBottom(kind, y, w) {
  const x0 = CX - w / 2, x1 = CX + w / 2;
  switch (kind) {
    case "wrap":
    case "burrito": {
      const col = kind === "burrito" ? "#ecca8a" : "#f1d9a0";
      let s = `<path d="M${x0 - 8} ${y} L${x1 + 8} ${y} Q${x1 + 10} ${y + 14} ${x1 - 6} ${y + 16} L${x0 + 6} ${y + 16} Q${x0 - 10} ${y + 14} ${x0 - 8} ${y} Z" fill="${col}"/>`;
      for (let i = 0; i < 9; i++) s += `<ellipse cx="${x0 + 14 + i * (w / 9)}" cy="${y + 9 + (i % 2) * 2}" rx="5" ry="2" fill="#c6914a" opacity=".7"/>`;
      return { svg: s, h: 16 };
    }
    case "tray":
      return { svg: "", h: 0 };
    case "ciabatta":
      return {
        svg: `<rect x="${x0}" y="${y}" width="${w}" height="30" rx="9" fill="#d7a35e"/><rect x="${x0}" y="${y}" width="${w}" height="10" rx="4" fill="#f3dcae"/>
              <circle cx="${x0 + 40}" cy="${y + 20}" r="2" fill="#fff" opacity=".7"/><circle cx="${x1 - 60}" cy="${y + 22}" r="2" fill="#fff" opacity=".7"/>`,
        h: 30,
      };
    case "hotdog":
      return { svg: `<rect x="${x0}" y="${y}" width="${w}" height="26" rx="13" fill="#d98f45"/><rect x="${x0 + 6}" y="${y}" width="${w - 12}" height="8" rx="4" fill="#f2d39e"/>`, h: 26 };
    default:
      return {
        svg: `<path d="M${x0} ${y} L${x1} ${y} L${x1} ${y + 18} Q${x1} ${y + 34} ${x1 - 24} ${y + 34} L${x0 + 24} ${y + 34} Q${x0} ${y + 34} ${x0} ${y + 18} Z" fill="#d98f45"/><rect x="${x0}" y="${y}" width="${w}" height="9" rx="3" fill="#f2d39e"/>`,
        h: 34,
      };
  }
}

function baseTop(kind, yBottom, w, r) {
  // yBottom = bordo inferiore del pane sopra; si disegna verso l'alto
  const x0 = CX - w / 2, x1 = CX + w / 2;
  switch (kind) {
    case "wrap":
    case "burrito": {
      const col = kind === "burrito" ? "#ecca8a" : "#f1d9a0";
      const h = 26;
      const y = yBottom - h;
      let s = `<path d="M${x0 - 10} ${yBottom} Q${x0 - 14} ${y} ${x0 + 30} ${y + 2} L${x1 - 30} ${y + 2} Q${x1 + 14} ${y} ${x1 + 10} ${yBottom} Z" fill="${col}"/>`;
      if (kind === "burrito") for (let i = 0; i < 5; i++) s += `<path d="M${x0 + 30 + i * 46} ${y + 8} l24 14" stroke="#b98443" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
      else for (let i = 0; i < 8; i++) s += `<ellipse cx="${f(x0 + 20 + r() * (w - 40))}" cy="${f(y + 8 + r() * 10)}" rx="5" ry="2" fill="#c6914a" opacity=".7"/>`;
      return { svg: s, h };
    }
    case "tray":
      return { svg: "", h: 0 };
    case "ciabatta": {
      const h = 42, y = yBottom - h;
      let s = `<path d="M${x0} ${yBottom} L${x0} ${y + 18} Q${x0} ${y} ${x0 + 30} ${y + 2} L${x1 - 30} ${y} Q${x1} ${y} ${x1} ${y + 18} L${x1} ${yBottom} Z" fill="#d7a35e"/>
               <rect x="${x0}" y="${yBottom - 9}" width="${w}" height="9" rx="3" fill="#f3dcae"/>`;
      for (let i = 0; i < 12; i++) s += `<circle cx="${f(x0 + 16 + r() * (w - 32))}" cy="${f(y + 6 + r() * 16)}" r="${f(2 + r() * 3)}" fill="#fff" opacity=".55"/>`;
      return { svg: s, h };
    }
    case "hotdog": {
      const h = 32, y = yBottom - h;
      return { svg: `<path d="M${x0} ${yBottom} Q${x0} ${y} ${x0 + 40} ${y} L${x1 - 40} ${y} Q${x1} ${y} ${x1} ${yBottom} Z" fill="#d98f45"/><path d="M${x0 + 30} ${y + 8} Q${CX} ${y + 2} ${x1 - 30} ${y + 8}" stroke="#eab47a" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="${x0 + 4}" y="${yBottom - 8}" width="${w - 8}" height="8" rx="3" fill="#f2d39e"/>`, h };
    }
    default: {
      const h = 76, y = yBottom - h;
      let s = `<path d="M${x0} ${yBottom} L${x0} ${yBottom - 18} Q${x0} ${y} ${CX} ${y} Q${x1} ${y} ${x1} ${yBottom - 18} L${x1} ${yBottom} Z" fill="#d98f45"/>
               <path d="M${x0 + 30} ${y + 28} Q${CX} ${y - 2} ${x1 - 40} ${y + 22}" stroke="#eab47a" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
               <rect x="${x0}" y="${yBottom - 9}" width="${w}" height="9" rx="3" fill="#f2d39e"/>`;
      for (let i = 0; i < 16; i++) {
        const t = r();
        const sx = x0 + 22 + t * (w - 44);
        const top = y + 10 + Math.pow((sx - CX) / (w / 2), 2) * 36 + r() * 16;
        s += `<ellipse cx="${f(sx)}" cy="${f(top)}" rx="4" ry="2" fill="#fbf1d6" transform="rotate(${f(-30 + r() * 60)} ${f(sx)} ${f(top)})"/>`;
      }
      return { svg: s, h };
    }
  }
}

function tray(yTop, yBottom, w) {
  const x0 = CX - w / 2 - 16, x1 = CX + w / 2 + 16;
  return `<path d="M${x0} ${yTop} L${x1} ${yTop} L${x1 - 18} ${yBottom} L${x0 + 18} ${yBottom} Z" fill="#c9b08a"/>
          <path d="M${x0} ${yTop} L${x1} ${yTop}" stroke="#a88d63" stroke-width="5" stroke-linecap="round"/>
          <path d="M${x0 + 30} ${yTop + 14} L${x1 - 30} ${yTop + 14}" stroke="#b89c70" stroke-width="2" stroke-dasharray="6 6"/>`;
}

function can(x, yBottom, color) {
  const h = 92, w = 54;
  const y = yBottom - h;
  return `<g class="can">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${color}"/>
    <rect x="${x + 4}" y="${y - 4}" width="${w - 8}" height="8" rx="3" fill="#c9cdd2"/>
    <rect x="${x}" y="${y + 32}" width="${w}" height="20" fill="#fff" opacity=".9"/>
    <rect x="${x + 8}" y="${y + 10}" width="6" height="${h - 20}" rx="3" fill="#fff" opacity=".25"/>
  </g>`;
}

/**
 * Disegna il panino.
 * base: item del pane (o null), layers: [{ key, visual, seed }], drinks: [{ visual }]
 * newKey: chiave dello strato appena aggiunto (cade dall'alto)
 */
export function drawSandwich({ base, layers, drinks = [], newKey = null }) {
  const baseKind = base ? parseVisual(base.visual).kind : null;
  const w = baseWidth(baseKind);
  const parts = [];
  let y = 0; // si costruisce verso l'alto con y negativi, poi si trasla
  const plateY = 0;

  // piatto / carta
  parts.push({ z: 0, svg: `<ellipse cx="${CX}" cy="${plateY + 6}" rx="${w / 2 + 50}" ry="16" fill="rgba(0,0,0,.18)"/>` });

  if (!base) {
    let s = `<g class="ghost"><path d="M${CX - 125} ${y - 34} h250 M${CX - 125} ${y - 34} v-20 a125 70 0 0 1 250 0 v20" stroke="#fff" stroke-width="3" stroke-dasharray="8 8" fill="none" opacity=".5"/>`;
    s += `<text x="${CX}" y="${y - 60}" text-anchor="middle" fill="#fff" opacity=".85" font-family="var(--font-display)" font-size="22">Scegli il pane</text></g>`;
    parts.push({ z: 1, svg: s });
    y -= 140;
  }

  const bottom = base ? baseBottom(baseKind, 0, w) : { svg: "", h: 0 };
  y -= bottom.h;
  if (base) parts.push({ z: 1, svg: `<g transform="translate(0 ${y})">${bottom.svg}</g>`, key: "base", isNew: newKey === "base" });

  const trayStart = y;
  if (baseKind === "tray") y -= 10;

  const lw = baseKind === "tray" ? w - 10 : w - 6;
  for (const l of layers) {
    const v = parseVisual(l.visual);
    const draw = LAYERS[v.kind] || LAYERS.generic;
    const r = rng(l.seed || 1);
    // si disegna con y=0 come bordo superiore e poi si sposta
    const color = String(l.visual || "").includes(":") ? v.color : PRESETS[v.kind]?.color || null;
    const probe = draw(0, lw, color, r);
    const overlap = v.kind === "sauce" ? 3 : 2;
    y -= probe.h - overlap;
    parts.push({ z: 2, svg: `<g transform="translate(0 ${f(y)})">${probe.svg}</g>`, key: l.key, isNew: newKey === l.key });
  }

  if (base && baseKind !== "tray") {
    const r = rng(99);
    const top = baseTop(baseKind, 0, w, r);
    parts.push({ z: 3, svg: `<g transform="translate(0 ${f(y)})">${top.svg}</g>`, key: "top", isTop: true });
    y -= top.h;
  }
  if (baseKind === "tray") {
    const front = tray(trayStart - 34, trayStart + 6, w);
    parts.push({ z: 4, svg: front, key: "tray", isNew: newKey === "base" });
  }

  // bibite accanto
  const canX = CX + w / 2 + 6;
  drinks.slice(0, 3).forEach((d, i) => {
    const v = parseVisual(d.visual);
    parts.push({ z: 5, svg: can(canX + i * 22 - (drinks.length > 1 ? 30 : 0), 4, v.color), key: d.key, isNew: newKey === d.key });
  });

  const top = Math.min(y, -120) - 30;
  const extraRight = drinks.length ? 90 : 0;
  const minX = -20, width = W + 40 + extraRight;
  const height = -top + 30;
  const body = parts
    .sort((a, b) => a.z - b.z)
    .map((p) => {
      const cls = ["part"];
      if (p.isNew) cls.push("is-new");
      if (p.isTop) cls.push("is-top");
      return `<g class="${cls.join(" ")}">${p.svg}</g>`;
    })
    .join("");
  return { svg: `<svg viewBox="${minX} ${f(top)} ${width} ${f(height)}" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`, height, width };
}
