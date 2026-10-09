import { esc, euro, loadPublic, showError, icon } from "./common.js";
import { drawSandwich } from "./visuals.js";
import { renderHead, renderFoot } from "./chrome.js";

renderHead("/componi");

const $ = (id) => document.getElementById(id);
const STORE = "rf-componi-v2";
const MAX_PER_ITEM = 3;
const MAX_SANDWICHES = 20;
const MAX_QTY = 20;

let cats = [];
const itemsById = new Map();
const catOf = new Map();
let site = {};

// Un ordine = più panini. Ogni panino: pane, ingredienti in ordine di scelta, quantità.
let order = { list: [], cur: 0 };
let lastKey = null;
let keyCounter = 0;
const newKey = () => "k" + ++keyCounter;
const blank = () => ({ uid: newKey(), base: null, picks: [], qty: 1 });
const cur = () => order.list[order.cur];

// ---------- salvataggio nel browser ----------
function save() {
  try {
    localStorage.setItem(
      STORE,
      JSON.stringify({ cur: order.cur, list: order.list.map((s) => ({ base: s.base, picks: s.picks.map((p) => p.id), qty: s.qty })) })
    );
  } catch {}
}
function restore() {
  const ok = (id) => itemsById.has(id) && itemsById.get(id).available;
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "null");
    if (s && Array.isArray(s.list)) {
      order.list = s.list.slice(0, MAX_SANDWICHES).map((x) => ({
        uid: newKey(),
        base: ok(x.base) ? x.base : null,
        picks: (Array.isArray(x.picks) ? x.picks : []).filter(ok).map((id) => ({ key: newKey(), id })),
        qty: Math.min(MAX_QTY, Math.max(1, Number(x.qty) || 1)),
      }));
      order.cur = Math.min(Math.max(0, Number(s.cur) || 0), order.list.length - 1);
    }
  } catch {}
  if (!order.list.length) order = { list: [blank()], cur: 0 };
}

// ---------- conti ----------
const count = (s, id) => s.picks.filter((p) => p.id === id).length;
const catCount = (s, catId) => s.picks.filter((p) => catOf.get(p.id).id === catId).length;
const isEmpty = (s) => !s.base && !s.picks.length;

function unitPrice(s) {
  let t = s.base ? itemsById.get(s.base).price_cents || 0 : 0;
  for (const p of s.picks) t += itemsById.get(p.id).price_cents || 0;
  return t;
}
const linePrice = (s) => unitPrice(s) * s.qty;
const filled = () => order.list.filter((s) => !isEmpty(s));
const orderTotal = () => filled().reduce((t, s) => t + linePrice(s), 0);
const orderPieces = () => filled().reduce((n, s) => n + s.qty, 0);

// Ogni panino si chiama "Prodotto n.1", "Prodotto n.2", … nell'ordine.
const nameOf = (s, i) => `Prodotto n.${i + 1}`;

function lines(s) {
  const out = [];
  if (s.base) {
    const b = itemsById.get(s.base);
    out.push({ name: b.name, qty: 1, price: b.price_cents || 0 });
  }
  const grouped = new Map();
  for (const p of s.picks) {
    const it = itemsById.get(p.id);
    const g = grouped.get(p.id) || { name: it.name, qty: 0, price: 0 };
    g.qty++;
    g.price += it.price_cents || 0;
    grouped.set(p.id, g);
  }
  return out.concat([...grouped.values()]);
}
const ingredientsText = (s) => lines(s).map((l) => (l.qty > 1 ? `${l.qty}× ${l.name}` : l.name)).join(", ");

// ---------- disegno ----------
function renderStage() {
  const s = cur();
  const base = s.base ? itemsById.get(s.base) : null;
  const layers = [];
  const drinks = [];
  for (const p of s.picks) {
    const it = itemsById.get(p.id);
    const entry = { key: p.key, visual: it.visual || "generic", seed: it.id * 31 + layers.length * 7 };
    if (catOf.get(p.id).componi_role === "drink") drinks.push(entry);
    else layers.push(entry);
  }
  $("art").innerHTML = drawSandwich({ base, layers, drinks, newKey: lastKey }).svg;
  $("name").innerHTML = `${esc(nameOf(s, order.cur))}${s.qty > 1 ? ` <span class="stage__qty">×${s.qty}</span>` : ""}`;
  const tag = $("tag");
  tag.textContent = euro(unitPrice(s));
  tag.classList.remove("pop");
  void tag.offsetWidth;
  tag.classList.add("pop");

  $("tabs").innerHTML =
    order.list
      .map(
        (x, i) => `<button type="button" role="tab" class="otab${i === order.cur ? " is-on" : ""}" data-tab="${i}" aria-selected="${i === order.cur}">
          <span class="otab__n">${i + 1}</span><span class="otab__p">${isEmpty(x) ? "vuoto" : euro(linePrice(x))}</span>${x.qty > 1 ? `<span class="otab__q">×${x.qty}</span>` : ""}
        </button>`
      )
      .join("") +
    (order.list.length < MAX_SANDWICHES
      ? `<button type="button" class="otab otab--add" data-act="new" ${isEmpty(cur()) ? "disabled" : ""}>${icon("burger")}<span>Altro panino</span></button>`
      : "");
  $("tabs").querySelector(".is-on")?.scrollIntoView({ block: "nearest", inline: "nearest" });

  const n = orderPieces();
  $("count").textContent = n ? `${n} ${n === 1 ? "prodotto" : "prodotti"}` : "Ordine vuoto";
  $("sum").textContent = euro(orderTotal());
  $("go").disabled = !n;
}

function chip(item, cat, s) {
  const n = cat.componi_role === "base" ? (s.base === item.id ? 1 : 0) : count(s, item.id);
  const seasonal = item.tags.includes("stagionale");
  const off = !item.available;
  return `
    <div class="chip${n ? " is-on" : ""}${off ? " is-off" : ""}" data-id="${item.id}">
      <button type="button" class="chip__add" ${off ? "disabled" : ""} aria-label="${esc(item.name)}, ${euro(item.price_cents)}${n ? `, scelto ${n}` : ""}">
        <span class="chip__name">${esc(item.name)}${seasonal ? '<sup class="star">*</sup>' : ""}</span>
        <span class="chip__price">${off ? "esaurito" : euro(item.price_cents)}</span>
        ${n > 1 ? `<span class="chip__n">×${n}</span>` : ""}
      </button>
      ${n && cat.componi_role !== "base" ? `<button type="button" class="chip__minus" aria-label="Togli ${esc(item.name)}">${icon("close")}</button>` : ""}
    </div>`;
}

function renderPicker() {
  const s = cur();
  const i = order.cur;
  const sections = cats.map((c) => {
    const hint = c.componi_role === "base" ? "uno a scelta" : c.componi_max ? `fino a ${c.componi_max}` : c.componi_role === "drink" ? "facoltativo" : "";
    return `
      <section class="step" data-cat="${c.id}">
        <h2 class="step__title display">${esc(c.componi_label || c.name)}${hint ? ` <span class="step__hint">${hint}</span>` : ""}</h2>
        <div class="chips">${c.items.map((it) => chip(it, c, s)).join("")}</div>
      </section>`;
  });
  const seasonal = cats.some((c) => c.items.some((it) => it.tags.includes("stagionale")));
  const many = order.list.length > 1;
  $("picker").innerHTML = `
    <div class="tools">
      <p class="tools__title"><strong>${many ? `Prodotto n.${i + 1} di ${order.list.length}` : "Prodotto n.1"}</strong><span>Tocca gli ingredienti: il panino si costruisce nell'ordine in cui li scegli. Tocca di nuovo per raddoppiare.</span></p>
      <div class="tools__row">
        <div class="qty" role="group" aria-label="Quantità di questo panino">
          <button type="button" data-act="minus" ${s.qty <= 1 ? "disabled" : ""} aria-label="Uno in meno">−</button>
          <output aria-live="polite">${s.qty}</output>
          <button type="button" data-act="plus" ${s.qty >= MAX_QTY ? "disabled" : ""} aria-label="Uno in più">+</button>
        </div>
        <button type="button" class="tbtn" data-act="dup" ${isEmpty(s) || order.list.length >= MAX_SANDWICHES ? "disabled" : ""}>Duplica</button>
        <button type="button" class="tbtn" data-act="new" ${isEmpty(s) || order.list.length >= MAX_SANDWICHES ? "disabled" : ""}>+ Altro panino</button>
        ${many || !isEmpty(s) ? `<button type="button" class="tbtn tbtn--del" data-act="del">${many ? "Elimina" : "Svuota"}</button>` : ""}
      </div>
    </div>
    ${sections.join("")}
    <section class="receipt" aria-label="Riepilogo dell'ordine">
      <h2 class="step__title display">Il tuo ordine</h2>
      ${
        filled().length
          ? `<ol class="receipt__list">${order.list
              .map((x, j) =>
                isEmpty(x)
                  ? ""
                  : `<li class="${j === order.cur ? "is-cur" : ""}"><button type="button" data-tab="${j}">
                      <span class="receipt__name">${x.qty > 1 ? `${x.qty}× ` : ""}${esc(nameOf(x, j))}</span>
                      <span class="receipt__price">${euro(linePrice(x))}</span>
                      <span class="receipt__ing">${esc(ingredientsText(x))}</span>
                    </button></li>`
              )
              .join("")}</ol>
             <p class="receipt__total"><span>Totale</span><span class="display">${euro(orderTotal())}</span></p>`
          : `<p class="receipt__empty">Ancora niente: comincia dal pane.</p>`
      }
      ${seasonal && site.seasonal_note ? `<p class="receipt__note"><span class="star">*</span>${esc(site.seasonal_note)}</p>` : ""}
    </section>`;
}

function refresh({ focusId, focusMinus, scrollTop } = {}) {
  renderStage();
  renderPicker();
  save();
  if (scrollTop) {
    const y = $("picker").getBoundingClientRect().top + window.scrollY - (matchMedia("(min-width: 900px)").matches ? 140 : 0);
    if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }
  if (focusId) {
    const sel = `.chip[data-id="${focusId}"] ${focusMinus ? ".chip__minus" : ".chip__add"}`;
    ($("picker").querySelector(sel) || $("picker").querySelector(`.chip[data-id="${focusId}"] .chip__add`))?.focus({ preventScroll: true });
  }
}

function flash(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.remove("show");
  void t.offsetWidth;
  t.classList.add("show");
}

// ---------- azioni ----------
function add(id) {
  const s = cur();
  const item = itemsById.get(id);
  const cat = catOf.get(id);
  if (!item.available) return;
  if (cat.componi_role === "base") {
    if (s.base === id) return;
    s.base = id;
    lastKey = "base";
  } else {
    if (count(s, id) >= MAX_PER_ITEM) return flash(`Massimo ${MAX_PER_ITEM} volte lo stesso ingrediente`);
    if (cat.componi_max && catCount(s, cat.id) >= cat.componi_max) return flash(`${cat.componi_label || cat.name}: massimo ${cat.componi_max}`);
    const key = newKey();
    s.picks.push({ key, id });
    lastKey = key;
  }
  refresh({ focusId: id });
}

function removeOne(id) {
  const s = cur();
  for (let i = s.picks.length - 1; i >= 0; i--) {
    if (s.picks[i].id === id) {
      s.picks.splice(i, 1);
      break;
    }
  }
  lastKey = null;
  refresh({ focusId: id, focusMinus: count(s, id) > 0 });
}

function switchTo(i) {
  if (i === order.cur || !order.list[i]) return;
  // un panino lasciato vuoto non serve: si toglie
  const leaving = cur();
  order.cur = i;
  if (isEmpty(leaving) && order.list.length > 1) {
    const idx = order.list.indexOf(leaving);
    order.list.splice(idx, 1);
    order.cur = order.list.indexOf(order.list[i > idx ? i - 1 : i]);
    if (order.cur < 0) order.cur = 0;
  }
  lastKey = "base";
  refresh();
}

function act(name) {
  const s = cur();
  if (name === "plus" && s.qty < MAX_QTY) s.qty++;
  else if (name === "minus" && s.qty > 1) s.qty--;
  else if (name === "new" || name === "dup") {
    if (isEmpty(s) || order.list.length >= MAX_SANDWICHES) return;
    const next = name === "dup" ? { uid: newKey(), base: s.base, picks: s.picks.map((p) => ({ key: newKey(), id: p.id })), qty: 1 } : blank();
    order.list.splice(order.cur + 1, 0, next);
    order.cur++;
    lastKey = name === "dup" ? "base" : null;
    refresh({ scrollTop: true });
    flash(name === "dup" ? `Prodotto n.${order.cur + 1}: copia del precedente` : `Prodotto n.${order.cur + 1}: scegli il pane`);
    return;
  } else if (name === "del") {
    if (order.list.length === 1) {
      order.list[0] = blank();
    } else {
      order.list.splice(order.cur, 1);
      order.cur = Math.min(order.cur, order.list.length - 1);
    }
    lastKey = "base";
    refresh();
    return;
  }
  lastKey = null;
  refresh();
}

function openTicket() {
  const list = filled();
  $("ticket-list").innerHTML = list
    .map(
      (s) => `<li><div class="ticket__row"><span>${s.qty > 1 ? `${s.qty}× ` : ""}${esc(nameOf(s, order.list.indexOf(s)))}</span><span>${euro(linePrice(s))}</span></div>
        <p class="ticket__ing">${esc(ingredientsText(s))}${s.qty > 1 ? ` · ${euro(unitPrice(s))} l'uno` : ""}</p></li>`
    )
    .join("");
  $("ticket-title").textContent = orderPieces() > 1 ? `Il mio ordine · ${orderPieces()} prodotti` : "Il mio ordine";
  $("ticket-sum").textContent = euro(orderTotal());
  $("ticket-note").textContent = "Mostra questo scontrino alla cassa.";
  const d = $("ticket");
  if (d.showModal) d.showModal();
  else d.setAttribute("open", "");
}

function init(data) {
  site = data.site;
  cats = data.categories.filter((c) => c.show_in_componi && c.items.length);
  const rank = { base: 0, filling: 1, drink: 2 };
  cats.sort((a, b) => rank[a.componi_role] - rank[b.componi_role]);
  for (const c of cats)
    for (const it of c.items) {
      itemsById.set(it.id, it);
      catOf.set(it.id, c);
    }
  restore();
  lastKey = null;
  refresh();

  $("picker").addEventListener("click", (e) => {
    const a = e.target.closest("[data-act]");
    if (a) return act(a.dataset.act);
    const t = e.target.closest("[data-tab]");
    if (t) return switchTo(Number(t.dataset.tab));
    const chipEl = e.target.closest(".chip");
    if (!chipEl) return;
    const id = Number(chipEl.dataset.id);
    if (e.target.closest(".chip__minus")) removeOne(id);
    else if (e.target.closest(".chip__add")) add(id);
  });
  $("tabs").addEventListener("click", (e) => {
    const a = e.target.closest("[data-act]");
    if (a) return act(a.dataset.act);
    const t = e.target.closest("[data-tab]");
    if (t) switchTo(Number(t.dataset.tab));
  });
  $("reset").addEventListener("click", () => {
    if (!filled().length) return;
    if (filled().length > 1 && !confirm("Svuotare tutto l'ordine?")) return;
    order = { list: [blank()], cur: 0 };
    lastKey = null;
    refresh({ scrollTop: true });
    flash("Si riparte dal pane");
  });
  $("go").addEventListener("click", openTicket);
}

function start() {
  loadPublic().then(init, () => showError($("picker"), start));
}
start();
renderFoot();
