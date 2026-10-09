import { esc, euro, photo, icon, ICON_NAMES } from "/js/common.js";
import { PRESETS, parseVisual, drawSandwich } from "/js/visuals.js";

// ---------------------------------------------------------------- base
const app = document.getElementById("app");
const sheet = document.getElementById("sheet");
const toastEl = document.getElementById("toast");

const PALETTE = [
  ["Rosso", "#9e1c1f"], ["Rosso logo", "#e10814"], ["Verde", "#0c5636"], ["Verde chiaro", "#00a54f"],
  ["Blu", "#1262a8"], ["Arancio", "#d7892c"], ["Giallo", "#f2a23a"], ["Nero", "#231f20"],
];
const TAGS = [["veg", "Vegetariano"], ["stagionale", "Stagionale (*)"], ["piccante", "Piccante"], ["nuovo", "Novità"]];
const ICON_LABELS = {
  menu: "Foglio menù", burger: "Panino", scooter: "Motorino (consegna)", bag: "Busta (asporto)", camera: "Foto (Instagram)",
  music: "Nota musicale (TikTok)", people: "Persone (Facebook)", pin: "Posizione", phone: "Telefono", clock: "Orologio",
  star: "Stella (recensioni)", table: "Forchetta e coltello (prenota)", ticket: "Biglietto", chat: "Fumetto (WhatsApp)", link: "Link", gift: "Regalo", leaf: "Foglia", arrow: "Freccia",
};

let D = null; // dati dal server
let view = localStorage.getItem("rf-admin-view") || "prodotti";
let prodFilter = "menu";
let reorderMode = false;

function toast(msg, bad = false) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (toastEl.className = "toast"), 2600);
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (res.status === 401 && !url.endsWith("/login")) {
    renderLogin("La sessione è scaduta: rientra.");
    throw new Error("401");
  }
  if (!res.ok) throw new Error((data && data.error) || `Errore ${res.status}`);
  return data;
}

// "8,50" / "8.5" / "8" / "8,50€" → 850 ; "" → null
function parsePrice(s) {
  const t = String(s ?? "").replace(/[€\s]/g, "").replace(",", ".");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100);
}
const priceText = (c) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

const timeAgo = (ts) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "adesso";
  if (s < 3600) return `${Math.round(s / 60)} min fa`;
  if (s < 86400) return `${Math.round(s / 3600)} h fa`;
  return new Date(ts).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

async function reload() {
  D = await api("GET", "/api/admin/data");
  return D;
}

// ---------------------------------------------------------------- login
function renderLogin(msg = "") {
  sheet.open && sheet.close();
  app.innerHTML = `
    <main class="login">
      <div class="checker login__strip" aria-hidden="true"></div>
      <img src="/img/logo.svg" alt="Rock and Feller" width="621" height="396">
      <h1 class="display">Pannello</h1>
      <form id="login" class="login__form">
        <label>Utente<input name="username" autocomplete="username" autocapitalize="none" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
        <p class="form-err" id="login-err">${esc(msg)}</p>
        <button class="btn btn--primary" type="submit">Entra</button>
      </form>
    </main>`;
  const f = document.getElementById("login");
  f.username.focus();
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button");
    btn.disabled = true;
    try {
      await api("POST", "/api/admin/login", { username: f.username.value, password: f.password.value });
      await reload();
      renderShell();
      if (D.me.username === "admin" && !D.users.length) {
        view = "altro";
        renderShell();
        toast("Crea gli account per te e per il proprietario");
      }
    } catch (err) {
      document.getElementById("login-err").textContent = err.message;
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------- shell
const TABS = [
  ["prodotti", "Prodotti", "menu"],
  ["mese", "Del mese", "star"],
  ["link", "Link", "link"],
  ["qr", "QR", "camera"],
  ["gratta", "Gratta", "ticket"],
  ["altro", "Altro", "people"],
];

function renderShell() {
  app.innerHTML = `
    <header class="ahead">
      <div class="ahead__bar">
        <a href="/" target="_blank" rel="noopener" class="ahead__logo" title="Apri il sito"><img src="/img/logo.svg" alt="Rock and Feller" width="621" height="396"></a>
        <span class="ahead__title display">Pannello</span>
        <span class="ahead__who">${esc(D.me.display_name)}</span>
        <button class="ahead__out" id="logout" type="button">Esci</button>
      </div>
      <div class="checker ahead__strip" aria-hidden="true"></div>
    </header>
    <div class="ashell">
      <nav class="tabs" aria-label="Sezioni">
        ${TABS.map(([k, label, ic]) => `<button type="button" data-tab="${k}" class="${view === k ? "is-on" : ""}" aria-current="${view === k ? "page" : "false"}">${icon(ic)}<span>${label}</span></button>`).join("")}
        <a class="tabs__site" href="/" target="_blank" rel="noopener">${icon("arrow")}<span>Apri il sito</span></a>
      </nav>
      <main class="amain" id="view"></main>
    </div>`;
  app.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    view = b.dataset.tab;
    localStorage.setItem("rf-admin-view", view);
    reorderMode = false;
    renderShell();
    window.scrollTo(0, 0);
  });
  document.getElementById("logout").addEventListener("click", async () => {
    await api("POST", "/api/admin/logout").catch(() => {});
    renderLogin();
  });
  renderView();
}

function renderView() {
  const el = document.getElementById("view");
  if (!el) return;
  ({ prodotti: viewProducts, mese: viewPotm, link: viewLinks, qr: viewQr, gratta: viewGratta, altro: viewMore }[view] || viewProducts)(el);
}

// ---------------------------------------------------------------- prodotti
function viewProducts(el) {
  const cats = D.categories.filter((c) => (prodFilter === "menu" ? c.show_in_menu : c.show_in_componi));
  el.innerHTML = `
    <div class="vhead">
      <div class="seg" role="tablist">
        <button type="button" data-f="menu" class="${prodFilter === "menu" ? "is-on" : ""}">Menù</button>
        <button type="button" data-f="componi" class="${prodFilter === "componi" ? "is-on" : ""}">Componi tu</button>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" id="reorder">${reorderMode ? "Fatto" : "Riordina"}</button>
    </div>
    <p class="hint">${prodFilter === "menu"
      ? "Cambia il prezzo direttamente nella casella: si salva da solo. Tocca il nome per modificare tutto il resto."
      : "Questi sono gli ingredienti della pagina Componi tu. Ogni ingrediente ha un disegno che finisce nel panino."}</p>
    ${cats.map((c) => catBlock(c)).join("")}
    ${reorderMode ? `<div class="catorder"><h3>Ordine delle categorie</h3>${cats.map((c, i) => `<div class="orow"><span>${esc(c.name)}</span>${moveBtns("cat", c.id, i, cats.length)}</div>`).join("")}</div>` : ""}
    <button type="button" class="btn btn--wide" id="newcat">${icon("menu")} Nuova categoria</button>`;

  el.querySelector(".seg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    prodFilter = b.dataset.f;
    renderView();
  });
  el.querySelector("#reorder").addEventListener("click", () => {
    reorderMode = !reorderMode;
    renderView();
  });
  el.querySelector("#newcat").addEventListener("click", () =>
    editCategory({ name: "", layout: "list", color: "#9e1c1f", item_color: "#0c5636", note: "", show_in_menu: prodFilter === "menu", show_in_componi: prodFilter === "componi", componi_label: "", componi_role: "filling", componi_max: 0, visible: true })
  );

  el.onclick = async (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const id = Number(t.dataset.id);
    const act = t.dataset.act;
    if (act === "item") editItem(findItem(id));
    else if (act === "cat") editCategory(D.categories.find((c) => c.id === id));
    else if (act === "add") editItem({ category_id: id, name: "", description: "", prefix: "", pieces: "", price_cents: null, variants: [], tags: [], visual: "", image_id: null, available: true, visible: true });
    else if (act === "avail") quickPut("items", id, { available: !findItem(id).available });
    else if (act === "up" || act === "down") move(t.dataset.kind, id, act === "up" ? -1 : 1);
  };
  el.onchange = async (e) => {
    const inp = e.target.closest("input[data-price]");
    if (!inp) return;
    const id = Number(inp.dataset.price);
    const cents = parsePrice(inp.value);
    if (Number.isNaN(cents)) {
      inp.classList.add("bad");
      return toast("Prezzo non valido: scrivi ad esempio 8,50", true);
    }
    inp.classList.remove("bad");
    const it = findItem(id);
    if (cents === it.price_cents) return;
    try {
      const updated = await api("PUT", `/api/admin/res/items/${id}`, { price_cents: cents });
      Object.assign(it, updated);
      inp.value = priceText(updated.price_cents);
      inp.classList.add("ok");
      setTimeout(() => inp.classList.remove("ok"), 1200);
      toast(`${it.name}: ${euro(cents) || "senza prezzo"}`);
    } catch (err) {
      if (err.message !== "401") toast(err.message, true);
    }
  };
  el.onkeydown = (e) => {
    if (e.key === "Enter" && e.target.matches("input[data-price]")) e.target.blur();
  };
}

function moveBtns(kind, id, i, n) {
  return `<span class="mv">
    <button type="button" data-act="up" data-kind="${kind}" data-id="${id}" ${i === 0 ? "disabled" : ""} aria-label="Sposta su">↑</button>
    <button type="button" data-act="down" data-kind="${kind}" data-id="${id}" ${i === n - 1 ? "disabled" : ""} aria-label="Sposta giù">↓</button>
  </span>`;
}

function catBlock(c) {
  const flags = [];
  if (!c.visible) flags.push("nascosta");
  return `
    <section class="cblock" style="--c:${esc(c.color)}">
      <header class="cblock__head">
        <button type="button" class="cblock__name display" data-act="cat" data-id="${c.id}">${esc(c.name)}</button>
        ${flags.map((f) => `<span class="pill">${f}</span>`).join("")}
        <button type="button" class="iconbtn" data-act="cat" data-id="${c.id}" aria-label="Modifica categoria ${esc(c.name)}">✎</button>
      </header>
      ${c.note ? `<p class="cblock__note">${esc(c.note)}</p>` : ""}
      <ul class="ilist">
        ${c.items.map((it, i) => itemRow(it, i, c.items.length)).join("")}
      </ul>
      <button type="button" class="btn btn--ghost btn--sm add" data-act="add" data-id="${c.id}">+ Aggiungi a ${esc(c.name)}</button>
    </section>`;
}

function itemRow(it, i, n) {
  const muted = !it.visible ? " is-hidden" : "";
  const off = !it.available;
  return `
    <li class="irow${muted}${off ? " is-off" : ""}">
      ${it.image_id ? `<img class="irow__img" src="${photo(it.image_id)}" alt="">` : ""}
      <button type="button" class="irow__name" data-act="item" data-id="${it.id}">
        <strong>${esc(it.name)}</strong>
        <small>${[!it.visible && "nascosto", it.pieces, it.variants.length && `${it.variants.length} varianti`, it.tags.join(", ")].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</small>
      </button>
      ${reorderMode
        ? moveBtns("item", it.id, i, n)
        : `<button type="button" class="avail${off ? " is-off" : ""}" data-act="avail" data-id="${it.id}" aria-pressed="${off}" title="${off ? "Segna come disponibile" : "Segna come esaurito"}">${off ? "Esaurito" : "Disp."}</button>
           <label class="pin"><span class="sr-only">Prezzo di ${esc(it.name)}</span><input data-price="${it.id}" inputmode="decimal" value="${priceText(it.price_cents)}" placeholder="—" autocomplete="off"><span>€</span></label>`}
    </li>`;
}

function findItem(id) {
  for (const c of D.categories) for (const i of c.items) if (i.id === id) return i;
  return null;
}

async function quickPut(res, id, body) {
  try {
    const updated = await api("PUT", `/api/admin/res/${res}/${id}`, body);
    const it = findItem(id);
    Object.assign(it, updated);
    renderView();
    if ("available" in body) toast(`${it.name}: ${updated.available ? "di nuovo disponibile" : "esaurito"}`);
  } catch (err) {
    if (err.message !== "401") toast(err.message, true);
  }
}

async function move(kind, id, dir) {
  let list, resource;
  if (kind === "cat") {
    list = D.categories;
    resource = "categories";
  } else if (kind === "link") {
    list = D.links;
    resource = "links";
  } else {
    const it = findItem(id);
    list = D.categories.find((c) => c.id === it.category_id).items;
    resource = "items";
  }
  // per le categorie si sposta tra quelle visibili nel filtro corrente, ma si salva l'ordine completo
  const visible = kind === "cat" ? list.filter((c) => (prodFilter === "menu" ? c.show_in_menu : c.show_in_componi)) : list;
  const i = visible.findIndex((x) => x.id === id);
  const j = i + dir;
  if (j < 0 || j >= visible.length) return;
  const a = list.indexOf(visible[i]);
  const b = list.indexOf(visible[j]);
  [list[a], list[b]] = [list[b], list[a]];
  renderView();
  try {
    await api("POST", "/api/admin/reorder", { resource, ids: list.map((x) => x.id) });
  } catch (err) {
    if (err.message !== "401") toast(err.message, true);
  }
}

// ---------------------------------------------------------------- finestre di modifica
function openSheet(title, bodyHtml, { onSubmit, onDelete, deleteLabel = "Elimina", submitLabel = "Salva" } = {}) {
  sheet.innerHTML = `
    <form class="sheet__form" novalidate>
      <header class="sheet__head">
        <h2>${esc(title)}</h2>
        <button type="button" class="iconbtn" data-close aria-label="Chiudi">${icon("close")}</button>
      </header>
      <div class="sheet__body">${bodyHtml}</div>
      <p class="form-err" data-err></p>
      <footer class="sheet__foot">
        ${onDelete ? `<button type="button" class="btn btn--danger" data-del>${esc(deleteLabel)}</button>` : ""}
        <button type="submit" class="btn btn--primary">${esc(submitLabel)}</button>
      </footer>
    </form>`;
  const form = sheet.querySelector("form");
  const err = sheet.querySelector("[data-err]");
  sheet.querySelector("[data-close]").onclick = () => sheet.close();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      await onSubmit(form);
      sheet.close();
    } catch (ex) {
      if (ex.message !== "401") err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });
  if (onDelete) {
    sheet.querySelector("[data-del]").onclick = async () => {
      try {
        if (await onDelete()) sheet.close();
      } catch (ex) {
        if (ex.message !== "401") err.textContent = ex.message;
      }
    };
  }
  sheet.showModal();
  sheet.querySelector(".sheet__body").scrollTop = 0;
  return form;
}

const field = (label, inner, hint = "") => `<label class="fld"><span class="fld__l">${label}</span>${inner}${hint ? `<span class="fld__h">${hint}</span>` : ""}</label>`;
const check = (name, label, on) => `<label class="chk"><input type="checkbox" name="${name}" ${on ? "checked" : ""}><span>${label}</span></label>`;
function swatches(name, value) {
  const custom = !PALETTE.some(([, h]) => h === value);
  return `<div class="sw" role="radiogroup">${PALETTE.map(
    ([l, h]) => `<label title="${l}"><input type="radio" name="${name}" value="${h}" ${h === value ? "checked" : ""}><span style="background:${h}"></span><em class="sr-only">${l}</em></label>`
  ).join("")}<label class="sw__custom" title="Altro colore"><input type="radio" name="${name}" value="custom" ${custom ? "checked" : ""}><input type="color" name="${name}_custom" value="${esc(custom ? value : "#888888")}"></label></div>`;
}
function readSwatch(form, name) {
  const v = form.querySelector(`input[name="${name}"]:checked`)?.value;
  return v === "custom" ? form[`${name}_custom`].value : v;
}

// Foto: si rimpicciolisce nel browser prima di caricarla
async function resizeImage(file, max = 1400) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("Non riesco a leggere questa immagine. Usa una foto JPG o PNG.");
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.82));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.84));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function photoField(current) {
  return `<div class="photo" data-photo="${esc(current || "")}">
    <div class="photo__prev">${current ? `<img src="${photo(current)}" alt="">` : `<span>Nessuna foto</span>`}</div>
    <div class="photo__btns">
      <label class="btn btn--ghost btn--sm">Scegli foto<input type="file" accept="image/*" hidden></label>
      ${current ? `<button type="button" class="btn btn--ghost btn--sm" data-rmphoto>Togli</button>` : ""}
    </div>
  </div>`;
}
function wirePhoto(root) {
  const box = root.querySelector(".photo");
  if (!box) return;
  box.addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    box.querySelector(".photo__prev").innerHTML = "<span>Carico…</span>";
    try {
      const data = await resizeImage(f);
      const res = await api("POST", "/api/admin/images", { data });
      box.dataset.photo = res.id;
      box.querySelector(".photo__prev").innerHTML = `<img src="${res.url}" alt="">`;
      if (!box.querySelector("[data-rmphoto]")) box.querySelector(".photo__btns").insertAdjacentHTML("beforeend", `<button type="button" class="btn btn--ghost btn--sm" data-rmphoto>Togli</button>`);
    } catch (err) {
      box.querySelector(".photo__prev").innerHTML = `<span class="bad">${esc(err.message)}</span>`;
    }
  });
  box.addEventListener("click", (e) => {
    if (!e.target.closest("[data-rmphoto]")) return;
    box.dataset.photo = "";
    box.querySelector(".photo__prev").innerHTML = "<span>Nessuna foto</span>";
    e.target.remove();
  });
}
const readPhoto = (root) => root.querySelector(".photo")?.dataset.photo || null;

function variantRow(v = { label: "", type: "plus", price_cents: null }) {
  return `<div class="vrow">
    <input name="v_label" placeholder="es. Doppio hamburger" value="${esc(v.label)}" aria-label="Nome variante">
    <select name="v_type" aria-label="Tipo di prezzo">
      <option value="plus" ${v.type !== "price" ? "selected" : ""}>+ in più</option>
      <option value="price" ${v.type === "price" ? "selected" : ""}>prezzo totale</option>
    </select>
    <input name="v_price" inputmode="decimal" placeholder="0,50" value="${priceText(v.price_cents)}" aria-label="Prezzo variante">
    <button type="button" class="iconbtn" data-rmvar aria-label="Togli variante">${icon("close")}</button>
  </div>`;
}

function visualPicker(value, catRole) {
  const v = parseVisual(value || "generic");
  const groups = Object.entries(PRESETS).filter(([, p]) => (catRole === "base" ? p.role === "base" : catRole === "drink" ? p.role === "drink" : !p.role));
  return `<div class="vis">
    <div class="vis__prev" data-visprev></div>
    <div>
      ${field("Disegno nel panino", `<select name="visual_kind">${groups.map(([k, p]) => `<option value="${k}" ${k === v.kind ? "selected" : ""}>${esc(p.label)}</option>`).join("")}</select>`)}
      ${field("Colore del disegno", `<input type="color" name="visual_color" value="${esc(v.color)}">`, "Conta solo per salse, formaggi, melanzane, bibite e generico.")}
    </div>
  </div>`;
}
function readVisual(form) {
  if (!form.visual_kind) return undefined;
  const k = form.visual_kind.value;
  return PRESETS[k]?.color ? `${k}:${form.visual_color.value}` : k;
}
function updateVisPrev(form) {
  const box = form.querySelector("[data-visprev]");
  if (!box) return;
  const visual = readVisual(form);
  const kind = parseVisual(visual).kind;
  const role = PRESETS[kind]?.role;
  const base = role === "base" ? { visual } : { visual: "bun" };
  const { svg } = drawSandwich({
    base,
    layers: role ? [] : [{ key: "x", visual, seed: 5 }],
    drinks: role === "drink" ? [{ key: "d", visual }] : [],
  });
  box.innerHTML = svg;
}

function editItem(it) {
  const isNew = !it.id;
  const cat = D.categories.find((c) => c.id === it.category_id);
  const form = openSheet(isNew ? `Nuovo in ${cat.name}` : it.name, `
    ${field("Nome", `<input name="name" value="${esc(it.name)}" required maxlength="80">`)}
    <div class="grid2">
      ${field("Prezzo (€)", `<input name="price" inputmode="decimal" value="${priceText(it.price_cents)}" placeholder="8,50">`)}
      ${field("Pezzi", `<input name="pieces" value="${esc(it.pieces)}" placeholder="es. 5pz" maxlength="20">`)}
    </div>
    ${field("Categoria", `<select name="category_id">${D.categories.map((c) => `<option value="${c.id}" ${c.id === it.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}
    <div class="form-sub" ${cat.show_in_menu ? "" : "hidden"}>
    ${field("Ingredienti", `<textarea name="description" rows="3" maxlength="400">${esc(it.description)}</textarea>`, "Metti tra asterischi le parole da colorare in arancio: *Selezione Letizia*")}
    ${field("Nota prima del nome", `<input name="prefix" value="${esc(it.prefix)}" placeholder="es. servito con ciabatta" maxlength="60">`)}
    <fieldset class="fs"><legend>Varianti</legend><div data-vars>${it.variants.map(variantRow).join("")}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-addvar>+ Aggiungi variante</button></fieldset>
    <fieldset class="fs"><legend>Foto</legend>${photoField(it.image_id)}</fieldset>
    </div>
    <fieldset class="fs"><legend>Etichette</legend><div class="chks">${TAGS.map(([k, l]) => check(`tag_${k}`, l, it.tags.includes(k))).join("")}</div></fieldset>
    ${cat.show_in_componi ? `<fieldset class="fs"><legend>Componi tu</legend>${visualPicker(it.visual, cat.componi_role)}</fieldset>` : ""}
    <div class="chks">
      ${check("available", "Disponibile (togli la spunta se è finito)", it.available)}
      ${check("visible", "Visibile sul sito", it.visible)}
    </div>`, {
    onSubmit: async (f) => {
      const price = parsePrice(f.price.value);
      if (Number.isNaN(price)) throw new Error("Prezzo non valido: scrivi ad esempio 8,50");
      const variants = [...f.querySelectorAll(".vrow")].map((r) => {
        const p = parsePrice(r.querySelector('[name="v_price"]').value);
        if (Number.isNaN(p)) throw new Error("Prezzo di una variante non valido.");
        return { label: r.querySelector('[name="v_label"]').value, type: r.querySelector('[name="v_type"]').value, price_cents: p };
      }).filter((v) => v.label.trim());
      const body = {
        name: f.name.value,
        price_cents: price,
        pieces: f.pieces.value,
        category_id: Number(f.category_id.value),
        description: f.description.value,
        prefix: f.prefix.value,
        variants,
        tags: TAGS.filter(([k]) => f[`tag_${k}`].checked).map(([k]) => k),
        image_id: readPhoto(f),
        available: f.available.checked,
        visible: f.visible.checked,
      };
      const vis = readVisual(f);
      if (vis !== undefined) body.visual = vis;
      if (isNew) await api("POST", "/api/admin/res/items", body);
      else await api("PUT", `/api/admin/res/items/${it.id}`, body);
      await reload();
      renderView();
      toast(isNew ? `Aggiunto "${body.name}"` : "Salvato");
    },
    onDelete: isNew ? null : async () => {
      if (!confirm(`Eliminare "${it.name}"? Non si torna indietro. (Per toglierlo solo per un po' usa "Visibile sul sito").`)) return false;
      await api("DELETE", `/api/admin/res/items/${it.id}`);
      await reload();
      renderView();
      toast("Eliminato");
      return true;
    },
  });
  wirePhoto(form);
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-addvar]")) form.querySelector("[data-vars]").insertAdjacentHTML("beforeend", variantRow());
    if (e.target.closest("[data-rmvar]")) e.target.closest(".vrow").remove();
  });
  if (form.visual_kind) {
    updateVisPrev(form);
    form.visual_kind.addEventListener("change", () => updateVisPrev(form));
    form.visual_color.addEventListener("input", () => updateVisPrev(form));
  }
}

function editCategory(c) {
  const isNew = !c.id;
  const form = openSheet(isNew ? "Nuova categoria" : `Categoria ${c.name}`, `
    ${field("Nome", `<input name="name" value="${esc(c.name)}" required maxlength="60">`)}
    ${field("Nota accanto al titolo", `<input name="note" value="${esc(c.note)}" placeholder="es. aggiungi 3,50€ per avere il menù" maxlength="160">`)}
    <div class="fld"><span class="fld__l">Colore del titolo</span>${swatches("color", c.color)}</div>
    <div class="fld"><span class="fld__l">Colore dei nomi dei prodotti</span>${swatches("item_color", c.item_color)}</div>
    ${field("Aspetto nel menù", `<select name="layout"><option value="list" ${c.layout !== "combo" ? "selected" : ""}>Normale (elenco)</option><option value="combo" ${c.layout === "combo" ? "selected" : ""}>Riquadro offerta (come il menù bambini)</option></select>`, "Nel riquadro i prodotti diventano le scelte e la nota diventa \"& …\". Se hanno tutti lo stesso prezzo compare \"solo X€\".")}
    <div class="chks">
      ${check("show_in_menu", "Mostra nel menù", c.show_in_menu)}
      ${check("show_in_componi", "Mostra nel Componi tu", c.show_in_componi)}
      ${check("visible", "Visibile sul sito", c.visible)}
    </div>
    <fieldset class="fs" data-componi ${c.show_in_componi ? "" : "hidden"}><legend>Nel Componi tu</legend>
      ${field("Titolo della sezione", `<input name="componi_label" value="${esc(c.componi_label)}" placeholder="es. Scegli la base" maxlength="40">`)}
      ${field("Tipo", `<select name="componi_role">
        <option value="filling" ${c.componi_role === "filling" ? "selected" : ""}>Ingredienti (si impilano nel panino)</option>
        <option value="base" ${c.componi_role === "base" ? "selected" : ""}>Pane (se ne sceglie uno)</option>
        <option value="drink" ${c.componi_role === "drink" ? "selected" : ""}>Bibite (accanto al panino)</option></select>`)}
      ${field("Massimo scelte", `<input name="componi_max" type="number" min="0" max="50" value="${c.componi_max || 0}">`, "0 = senza limite")}
    </fieldset>`, {
    onSubmit: async (f) => {
      const body = {
        name: f.name.value,
        note: f.note.value,
        color: readSwatch(f, "color"),
        item_color: readSwatch(f, "item_color"),
        show_in_menu: f.show_in_menu.checked,
        show_in_componi: f.show_in_componi.checked,
        visible: f.visible.checked,
        componi_label: f.componi_label.value,
        componi_role: f.componi_role.value,
        componi_max: Number(f.componi_max.value || 0),
        layout: f.layout.value,
      };
      if (isNew) await api("POST", "/api/admin/res/categories", body);
      else await api("PUT", `/api/admin/res/categories/${c.id}`, body);
      await reload();
      renderView();
      toast("Categoria salvata");
    },
    onDelete: isNew ? null : async () => {
      const n = c.items.length;
      if (!confirm(`Eliminare la categoria "${c.name}"${n ? ` e i suoi ${n} prodotti` : ""}? Non si torna indietro.`)) return false;
      await api("DELETE", `/api/admin/res/categories/${c.id}`);
      await reload();
      renderView();
      toast("Categoria eliminata");
      return true;
    },
  });
  form.show_in_componi.addEventListener("change", () => (form.querySelector("[data-componi]").hidden = !form.show_in_componi.checked));
}

// ---------------------------------------------------------------- prodotto del mese
function viewPotm(el) {
  const p = D.potm || { active: true, label: "Panino del mese", period: "", item_id: null, title: "", description: "", price_cents: null, image_id: null };
  const menuItems = D.categories.filter((c) => c.show_in_menu).flatMap((c) => c.items.map((i) => ({ ...i, cat: c.name })));
  el.innerHTML = `
    <div class="vhead"><h1 class="display">Prodotto del mese</h1><a class="btn btn--ghost btn--sm" href="/del-mese" target="_blank" rel="noopener">Vedi la pagina</a></div>
    <p class="hint">Il QR "Panino del mese" porta sempre alla pagina /del-mese: cambi il prodotto qui e il QR stampato resta lo stesso.</p>
    <form class="card form" id="potm">
      ${check("active", "Mostra il prodotto del mese sul sito", p.active)}
      <div class="grid2">
        ${field("Etichetta", `<input name="label" value="${esc(p.label)}" maxlength="40">`)}
        ${field("Periodo", `<input name="period" value="${esc(p.period)}" placeholder="es. Ottobre" maxlength="40">`)}
      </div>
      ${field("Prodotto del menù", `<select name="item_id"><option value="">— nessuno, scrivo io i dati —</option>${menuItems.map((i) => `<option value="${i.id}" ${i.id === p.item_id ? "selected" : ""}>${esc(i.name)} (${esc(i.cat)})</option>`).join("")}</select>`, "Se scegli un prodotto, nome, ingredienti, prezzo e foto si prendono da lì. Puoi comunque sovrascriverli qui sotto.")}
      ${field("Nome (lascia vuoto per usare quello del prodotto)", `<input name="title" value="${esc(p.title)}" maxlength="80">`)}
      ${field("Descrizione", `<textarea name="description" rows="3" maxlength="400">${esc(p.description)}</textarea>`)}
      ${field("Prezzo (€)", `<input name="price" inputmode="decimal" value="${priceText(p.price_cents)}" placeholder="dal prodotto">`)}
      <div class="fld"><span class="fld__l">Foto (consigliata: rende tanto sul telefono)</span>${photoField(p.image_id)}</div>
      <p class="form-err" id="potm-err"></p>
      <button class="btn btn--primary" type="submit">Salva</button>
    </form>`;
  const f = el.querySelector("#potm");
  wirePhoto(f);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = el.querySelector("#potm-err");
    err.textContent = "";
    const price = parsePrice(f.price.value);
    if (Number.isNaN(price)) return (err.textContent = "Prezzo non valido.");
    try {
      await api("PUT", "/api/admin/settings/potm", {
        active: f.active.checked, label: f.label.value, period: f.period.value,
        item_id: f.item_id.value ? Number(f.item_id.value) : null,
        title: f.title.value, description: f.description.value, price_cents: price, image_id: readPhoto(f),
      });
      await reload();
      toast("Prodotto del mese salvato");
    } catch (ex) {
      if (ex.message !== "401") err.textContent = ex.message;
    }
  });
}

// ---------------------------------------------------------------- link
function viewLinks(el) {
  el.innerHTML = `
    <div class="vhead"><h1 class="display">Link</h1><button type="button" class="btn btn--ghost btn--sm" id="reorder">${reorderMode ? "Fatto" : "Riordina"}</button></div>
    <p class="hint">Sono i bottoni della pagina iniziale. I "bottoni grandi" sono quelli colorati, i "social" stanno nella fila sotto.</p>
    <ul class="llist">
      ${D.links.map((l, i) => `
        <li class="lrow${l.visible ? "" : " is-hidden"}">
          <span class="lrow__sw" style="background:${esc(l.color)}">${l.image_id ? `<img src="${photo(l.image_id)}" alt="">` : icon(l.icon)}</span>
          <button type="button" class="lrow__main" data-act="link" data-id="${l.id}">
            <strong>${esc(l.label)}</strong><small>${l.kind === "social" ? "social · " : ""}${esc(l.url)}</small>
          </button>
          ${reorderMode ? moveBtns("link", l.id, i, D.links.length) : ""}
        </li>`).join("")}
    </ul>
    <button type="button" class="btn btn--wide" id="newlink">+ Nuovo link</button>`;
  el.querySelector("#reorder").onclick = () => {
    reorderMode = !reorderMode;
    renderView();
  };
  el.querySelector("#newlink").onclick = () => editLink({ label: "", url: "https://", icon: "link", color: "#9e1c1f", kind: "button", image_id: null, visible: true });
  el.onclick = (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const id = Number(t.dataset.id);
    if (t.dataset.act === "link") editLink(D.links.find((l) => l.id === id));
    else if (t.dataset.act === "up" || t.dataset.act === "down") move("link", id, t.dataset.act === "up" ? -1 : 1);
  };
  el.onchange = null;
}

function editLink(l) {
  const isNew = !l.id;
  const form = openSheet(isNew ? "Nuovo link" : l.label, `
    ${field("Testo del bottone", `<input name="label" value="${esc(l.label)}" required maxlength="60">`)}
    ${field("Link", `<input name="url" value="${esc(l.url)}" required inputmode="url" autocapitalize="none">`, "Un indirizzo completo (https://…) oppure una pagina del sito: /menu, /componi, /del-mese")}
    ${field("Tipo", `<select name="kind"><option value="button" ${l.kind !== "social" ? "selected" : ""}>Bottone grande colorato</option><option value="social" ${l.kind === "social" ? "selected" : ""}>Social (fila piccola sotto)</option></select>`)}
    <div class="fld"><span class="fld__l">Colore</span>${swatches("color", l.color)}</div>
    ${field("Icona", `<select name="icon">${ICON_NAMES.map((n) => `<option value="${n}" ${n === l.icon ? "selected" : ""}>${esc(ICON_LABELS[n] || n)}</option>`).join("")}</select>`)}
    <div class="fld"><span class="fld__l">Oppure un'icona tua (PNG trasparente)</span>${photoField(l.image_id)}</div>
    ${check("visible", "Visibile sul sito", l.visible)}`, {
    onSubmit: async (f) => {
      const body = { label: f.label.value, url: f.url.value.trim(), kind: f.kind.value, color: readSwatch(f, "color"), icon: f.icon.value, image_id: readPhoto(f), visible: f.visible.checked };
      if (isNew) await api("POST", "/api/admin/res/links", body);
      else await api("PUT", `/api/admin/res/links/${l.id}`, body);
      await reload();
      renderView();
      toast("Link salvato");
    },
    onDelete: isNew ? null : async () => {
      if (!confirm(`Eliminare il link "${l.label}"?`)) return false;
      await api("DELETE", `/api/admin/res/links/${l.id}`);
      await reload();
      renderView();
      toast("Link eliminato");
      return true;
    },
  });
  wirePhoto(form);
}

// ---------------------------------------------------------------- QR
function qrMatrix(text) {
  const q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}
function qrSvg(text, { margin = 4, fg = "#000", bg = "#fff" } = {}) {
  const { n, dark } = qrMatrix(text);
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  const s = n + margin * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}
async function qrPng(text, label) {
  const { n, dark } = qrMatrix(text);
  const scale = Math.floor(1000 / (n + 8));
  const size = (n + 8) * scale;
  const labelH = label ? Math.round(size * 0.16) : 0;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size + labelH;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (dark(r, col)) g.fillRect((col + 4) * scale, (r + 4) * scale, scale, scale);
  if (label) {
    await document.fonts.load(`80px "RF Display"`).catch(() => {});
    g.fillStyle = "#9e1c1f";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let fs = Math.round(labelH * 0.62);
    g.font = `${fs}px "RF Display", Georgia, serif`;
    while (g.measureText(label).width > size * 0.9 && fs > 20) g.font = `${(fs -= 4)}px "RF Display", Georgia, serif`;
    g.fillText(label, size / 2, size + labelH * 0.32);
  }
  return new Promise((r) => c.toBlob(r, "image/png"));
}
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

function sparkline(days) {
  const out = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - i * 86400000));
    out.push(days[d] || 0);
  }
  const max = Math.max(1, ...out);
  const last7 = out.slice(-7).reduce((a, b) => a + b, 0);
  const bars = out.map((v, i) => `<rect x="${i * 4}" y="${f1(24 - (v / max) * 22)}" width="3" height="${f1((v / max) * 22 + (v ? 0 : 1))}" rx="1" fill="${v ? "var(--verde)" : "#ddd"}"><title>${v}</title></rect>`).join("");
  return { svg: `<svg viewBox="0 0 120 24" class="spark" aria-hidden="true">${bars}</svg>`, last7, last30: out.reduce((a, b) => a + b, 0) };
}
const f1 = (n) => Math.round(n * 10) / 10;

const QR_TARGETS = [["/del-mese", "Pagina del prodotto del mese"], ["/menu", "Menù"], ["/componi", "Componi tu"], ["/", "Pagina iniziale (link)"]];

function viewQr(el) {
  const origin = location.origin;
  const looksTemp = /localhost|127\.0\.0\.1|\.pages\.dev$/.test(location.hostname);
  el.innerHTML = `
    <div class="vhead"><h1 class="display">QR code</h1><button type="button" class="btn btn--ghost btn--sm" id="newqr">+ Nuovo QR</button></div>
    <p class="hint">Ogni QR punta a un indirizzo fisso del sito (es. ${esc(origin)}/qr/menu). Da qui decidi dove porta: il QR stampato non cambia mai.</p>
    ${looksTemp ? `<p class="warn">Stai usando l'indirizzo provvisorio <strong>${esc(location.host)}</strong>. Scarica e stampa i QR dopo aver collegato il dominio definitivo, entrando nel pannello da quel dominio.</p>` : ""}
    <div class="qgrid">
      ${D.qr.map((q) => {
        const sp = sparkline(q.days);
        const url = `${origin}/qr/${q.slug}`;
        const preset = QR_TARGETS.find(([t]) => t === q.target);
        const prodMatch = /^\/menu#p(\d+)$/.exec(q.target);
        const prod = prodMatch ? findItem(Number(prodMatch[1])) : null;
        const destLabel = preset ? preset[1] : prod ? `${prod.name} nel menù` : q.target;
        return `
        <article class="qcard card" data-slug="${esc(q.slug)}">
          <div class="qcard__img">${qrSvg(url)}</div>
          <div class="qcard__body">
            <h2>${esc(q.label)}</h2>
            <p class="qcard__url">${esc(url.replace(/^https?:\/\//, ""))}</p>
            <p class="qcard__dest">Porta a: <strong>${esc(destLabel)}</strong></p>
            <div class="qcard__stats">${sp.svg}<span><strong>${q.scans}</strong> scansioni in tutto · ${sp.last7} negli ultimi 7 giorni</span></div>
            <div class="qcard__btns">
              <button type="button" class="btn btn--sm btn--primary" data-qa="edit">Cambia destinazione</button>
              <button type="button" class="btn btn--sm btn--ghost" data-qa="png">PNG</button>
              <button type="button" class="btn btn--sm btn--ghost" data-qa="pngl">PNG con nome</button>
              <button type="button" class="btn btn--sm btn--ghost" data-qa="svg">SVG</button>
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>`;
  el.querySelector("#newqr").onclick = () => editQr(null);
  el.onchange = null;
  el.onclick = async (e) => {
    const b = e.target.closest("[data-qa]");
    if (!b) return;
    const q = D.qr.find((x) => x.slug === b.closest("[data-slug]").dataset.slug);
    const url = `${origin}/qr/${q.slug}`;
    if (b.dataset.qa === "edit") editQr(q);
    else if (b.dataset.qa === "svg") download(new Blob([qrSvg(url)], { type: "image/svg+xml" }), `qr-${q.slug}.svg`);
    else download(await qrPng(url, b.dataset.qa === "pngl" ? q.label : ""), `qr-${q.slug}.png`);
  };
}

function editQr(q) {
  const isNew = !q;
  q = q || { slug: "", label: "", target: "/del-mese" };
  const preset = QR_TARGETS.find(([t]) => t === q.target);
  const products = D.categories.filter((c) => c.show_in_menu).flatMap((c) => c.items);
  const form = openSheet(isNew ? "Nuovo QR" : `QR ${q.label}`, `
    ${field("Nome", `<input name="label" value="${esc(q.label)}" required maxlength="60" placeholder="es. Volantino estate">`)}
    ${isNew ? field("Nome breve nell'indirizzo", `<input name="slug" value="" required maxlength="40" placeholder="es. volantino-estate" autocapitalize="none">`, "Finisce nel QR (/qr/volantino-estate) e poi non si può più cambiare.") : ""}
    <fieldset class="fs"><legend>Dove porta</legend>
      <div class="chks">
        ${QR_TARGETS.map(([t, l]) => `<label class="chk"><input type="radio" name="dest" value="${t}" ${preset && preset[0] === t ? "checked" : ""}><span>${l}</span></label>`).join("")}
        <label class="chk"><input type="radio" name="dest" value="product" ${!preset && /^\/menu#p\d+$/.test(q.target) ? "checked" : ""}><span>Un prodotto preciso del menù</span></label>
        <label class="chk"><input type="radio" name="dest" value="custom" ${!preset && !/^\/menu#p\d+$/.test(q.target) ? "checked" : ""}><span>Un altro link</span></label>
      </div>
      <div data-prod>${field("Prodotto", `<select name="product">${products.map((p) => `<option value="${p.id}" ${q.target === `/menu#p${p.id}` ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`)}</div>
      <div data-custom>${field("Link", `<input name="custom" value="${preset || /^\/menu#p\d+$/.test(q.target) ? "https://" : esc(q.target)}" inputmode="url" autocapitalize="none">`, "es. la pagina Google per le recensioni, un modulo, una promo")}</div>
    </fieldset>`, {
    onSubmit: async (f) => {
      const dest = f.querySelector('[name="dest"]:checked')?.value;
      if (!dest) throw new Error("Scegli dove deve portare il QR.");
      const target = dest === "custom" ? f.custom.value.trim() : dest === "product" ? `/menu#p${f.product.value}` : dest;
      if (isNew) await api("POST", "/api/admin/qr", { slug: f.slug.value.trim().toLowerCase(), label: f.label.value, target });
      else await api("PUT", `/api/admin/qr/${encodeURIComponent(q.slug)}`, { label: f.label.value, target });
      await reload();
      renderView();
      toast(isNew ? "QR creato" : "Destinazione aggiornata: il QR stampato ora porta lì");
    },
    onDelete: isNew ? null : async () => {
      if (!confirm(`Eliminare il QR "${q.label}"? I QR già stampati porteranno alla pagina iniziale.`)) return false;
      await api("DELETE", `/api/admin/qr/${encodeURIComponent(q.slug)}`);
      await reload();
      renderView();
      toast("QR eliminato");
      return true;
    },
  });
  const sync = () => {
    const dest = form.querySelector('[name="dest"]:checked')?.value;
    form.querySelector("[data-prod]").hidden = dest !== "product";
    form.querySelector("[data-custom]").hidden = dest !== "custom";
  };
  form.addEventListener("change", sync);
  sync();
}

// ---------------------------------------------------------------- gratta e vinci
const CODE_STATUS = {
  valido: ["ok", "Valido: applica il 10% e segnalo come usato"],
  usato: ["used", "Già usato"],
  scaduto: ["bad", "Scaduto"],
  inesistente: ["bad", "Codice inesistente"],
};
const fmtDay = (ts) => new Date(ts).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

function codeStatus(c) {
  if (c.used_at) return "usato";
  if (c.expires_at && Date.now() > c.expires_at) return "scaduto";
  return "valido";
}

async function viewGratta(el) {
  el.innerHTML = `<div class="loading">Un attimo…</div>`;
  let G;
  try {
    G = await api("GET", "/api/admin/gratta");
  } catch (err) {
    if (err.message !== "401") el.innerHTML = `<p class="warn">${esc(err.message)}</p>`;
    return;
  }
  const c = G.config;
  const userName = (u) => D.users.find((x) => x.username === u)?.display_name || u;
  el.innerHTML = `
    <div class="vhead"><h1 class="display">Gratta e vinci</h1></div>
    <p class="hint">Non è nel link tree: si apre solo dal QR "Gratta e vinci" (lo scarichi dalla scheda QR). L'esito lo decide il server, una giocata al giorno per telefono.</p>

    <form class="card form gcheck" id="gcheck">
      <h3>Verifica un codice</h3>
      <div class="gcheck__row">
        <input name="code" placeholder="RF-ABC234" autocapitalize="characters" autocomplete="off" aria-label="Codice da verificare" required>
        <button class="btn btn--primary" type="submit">Verifica</button>
      </div>
      <div id="gres"></div>
    </form>

    <div class="gstats">
      <div class="card"><span>Oggi</span><strong>${G.today.plays}</strong><small>giocate · ${G.today.wins} vinte</small></div>
      <div class="card"><span>Ultimi 30 giorni</span><strong>${G.month.plays}</strong><small>giocate · ${G.month.wins} vinte · ${G.month.used} usate</small></div>
    </div>

    <h1 class="display">Regole</h1>
    <form class="card form" id="gcfg">
      ${check("active", "Gioco attivo", c.active)}
      ${field("Premio", `<input name="prize" value="${esc(c.prize)}" required maxlength="120">`)}
      <div class="grid2">
        ${field("Probabilità di vincere (%)", `<input name="win_percent" type="number" min="0" max="100" value="${c.win_percent}">`, "es. 10 = 1 su 10")}
        ${field("Vincite massime al giorno", `<input name="max_wins_day" type="number" min="0" max="10000" value="${c.max_wins_day}">`, "0 = senza limite")}
        ${field("Giocate per telefono al giorno", `<input name="plays_per_day" type="number" min="1" max="20" value="${c.plays_per_day}">`)}
        ${field("Validità del codice (giorni)", `<input name="valid_days" type="number" min="1" max="365" value="${c.valid_days}">`)}
      </div>
      <p class="form-err" id="gcfg-err"></p>
      <button class="btn btn--primary" type="submit">Salva</button>
    </form>

    <h1 class="display">Ultimi codici vinti</h1>
    <ul class="card log glist">${
      G.recent
        .map((r) => {
          const st = codeStatus(r);
          return `<li><span><strong class="gcode">${esc(r.code)}</strong> <small>vinto il ${fmtDay(r.ts)}${r.used_at ? ` · usato il ${fmtDay(r.used_at)} da ${esc(userName(r.used_by))}` : ` · scade il ${fmtDay(r.expires_at)}`}</small></span><span class="gpill gpill--${CODE_STATUS[st][0]}">${st}</span></li>`;
        })
        .join("") || "<li>Ancora nessuna vincita.</li>"
    }</ul>`;

  const cf = el.querySelector("#gcheck");
  const out = el.querySelector("#gres");
  const showCode = (r) => {
    const [cls, label] = CODE_STATUS[r.status];
    out.innerHTML = `
      <div class="gresult gresult--${cls}">
        <p><strong class="gcode">${esc(r.code)}</strong> <span class="gpill gpill--${cls}">${esc(r.status)}</span></p>
        <p>${esc(label)}${r.ts ? ` · vinto il ${fmtDay(r.ts)}` : ""}${r.used_at ? ` · usato il ${fmtDay(r.used_at)} da ${esc(userName(r.used_by))}` : r.expires_at ? ` · scade il ${fmtDay(r.expires_at)}` : ""}</p>
        ${r.status === "valido" ? `<button type="button" class="btn btn--primary" id="guse">Segna come usato</button>` : ""}
      </div>`;
    out.querySelector("#guse")?.addEventListener("click", async () => {
      try {
        const u = await api("POST", `/api/admin/gratta/code/${encodeURIComponent(r.code)}`);
        showCode(u);
        toast(`${u.code}: usato`);
      } catch (ex) {
        if (ex.message !== "401") toast(ex.message, true);
      }
    });
  };
  cf.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      showCode(await api("GET", `/api/admin/gratta/code/${encodeURIComponent(cf.code.value.trim())}`));
    } catch (ex) {
      if (ex.message !== "401") out.innerHTML = `<p class="form-err">${esc(ex.message)}</p>`;
    }
  });

  const gf = el.querySelector("#gcfg");
  gf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = el.querySelector("#gcfg-err");
    err.textContent = "";
    try {
      await api("PUT", "/api/admin/gratta", {
        active: gf.active.checked, prize: gf.prize.value,
        win_percent: Number(gf.win_percent.value), max_wins_day: Number(gf.max_wins_day.value || 0),
        plays_per_day: Number(gf.plays_per_day.value || 1), valid_days: Number(gf.valid_days.value || 7),
      });
      toast("Regole salvate");
    } catch (ex) {
      if (ex.message !== "401") err.textContent = ex.message;
    }
  });
  el.onclick = null;
  el.onchange = null;
}

// ---------------------------------------------------------------- altro: info, account, registro
function viewMore(el) {
  const s = D.site;
  const recovery = D.me.username === "admin";
  el.innerHTML = `
    ${recovery ? `<p class="warn">Sei entrato con l'accesso di emergenza. Crea qui sotto un account per te e uno per il proprietario, poi usate quelli.</p>` : ""}
    <h1 class="display">Il locale</h1>
    <form class="card form" id="site">
      <div class="grid2">
        ${field("Nome", `<input name="name" value="${esc(s.name)}" required maxlength="60">`)}
        ${field("Sottotitolo", `<input name="tagline" value="${esc(s.tagline)}" maxlength="80">`)}
      </div>
      ${field("Nome sui social", `<input name="handle" value="${esc(s.handle || "")}" maxlength="40" placeholder="@rockandfeller">`)}
      ${field("Indirizzo", `<input name="address" value="${esc(s.address)}" maxlength="160" placeholder="Via…, Caserta">`)}
      ${field("Link Google Maps", `<input name="maps_url" value="${esc(s.maps_url)}" inputmode="url" autocapitalize="none" placeholder="https://maps.app.goo.gl/…">`)}
      <div class="grid2">
        ${field("Telefono", `<input name="phone" value="${esc(s.phone)}" inputmode="tel" maxlength="30">`)}
        ${field("Secondo telefono", `<input name="phone2" value="${esc(s.phone2 || "")}" inputmode="tel" maxlength="30">`)}
      </div>
      ${field("Orari", `<textarea name="hours" rows="3" maxlength="400" placeholder="Lun–Gio 18:30–24:00&#10;Ven–Dom 18:30–01:00">${esc(s.hours)}</textarea>`)}
      ${field("Nota prodotti stagionali", `<input name="seasonal_note" value="${esc(s.seasonal_note)}" maxlength="160">`)}
      ${field("Nota allergeni", `<textarea name="allergen_note" rows="2" maxlength="300">${esc(s.allergen_note)}</textarea>`)}
      <p class="form-err" id="site-err"></p>
      <button class="btn btn--primary" type="submit">Salva</button>
    </form>

    <h1 class="display">Account</h1>
    <div class="card">
      <ul class="ulist">${D.users.map((u) => `
        <li><span><strong>${esc(u.display_name)}</strong> <small>utente: ${esc(u.username)}</small></span>
          <span class="ulist__btns">
            <button type="button" class="btn btn--sm btn--ghost" data-pw="${esc(u.username)}">Cambia password</button>
            ${u.username !== D.me.username ? `<button type="button" class="btn btn--sm btn--danger" data-rmu="${esc(u.username)}">Elimina</button>` : ""}
          </span></li>`).join("") || "<li><span>Nessun account ancora.</span></li>"}
      </ul>
      <form class="form" id="newuser">
        <h3>Nuovo account</h3>
        <div class="grid2">
          ${field("Nome", `<input name="display_name" placeholder="es. Mauro" maxlength="40">`)}
          ${field("Utente", `<input name="username" required placeholder="es. mauro" autocapitalize="none" maxlength="30">`)}
        </div>
        ${field("Password", `<input name="password" type="password" required minlength="8" autocomplete="new-password">`, "Almeno 8 caratteri.")}
        <p class="form-err" id="nu-err"></p>
        <button class="btn btn--primary" type="submit">Crea account</button>
      </form>
    </div>

    <h1 class="display">Ultime modifiche</h1>
    <ul class="card log">${D.activity.map((a) => `<li><span>${esc(D.users.find((u) => u.username === a.user)?.display_name || a.user)} ${esc(a.action)}</span><time>${timeAgo(a.ts)}</time></li>`).join("") || "<li>Ancora niente.</li>"}</ul>`;

  const sf = el.querySelector("#site");
  sf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = el.querySelector("#site-err");
    err.textContent = "";
    try {
      D.site = await api("PUT", "/api/admin/settings/site", {
        name: sf.name.value, tagline: sf.tagline.value, address: sf.address.value, maps_url: sf.maps_url.value.trim(),
        phone: sf.phone.value, phone2: sf.phone2.value, handle: sf.handle.value, hours: sf.hours.value, seasonal_note: sf.seasonal_note.value, allergen_note: sf.allergen_note.value,
      });
      toast("Informazioni salvate");
    } catch (ex) {
      if (ex.message !== "401") err.textContent = ex.message;
    }
  });
  const nu = el.querySelector("#newuser");
  nu.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = el.querySelector("#nu-err");
    err.textContent = "";
    try {
      await api("POST", "/api/admin/users", { display_name: nu.display_name.value, username: nu.username.value, password: nu.password.value });
      await reload();
      renderView();
      toast("Account creato");
    } catch (ex) {
      if (ex.message !== "401") err.textContent = ex.message;
    }
  });
  el.onchange = null;
  el.onclick = async (e) => {
    const pw = e.target.closest("[data-pw]");
    const rm = e.target.closest("[data-rmu]");
    if (pw) {
      const u = pw.dataset.pw;
      openSheet(`Nuova password per ${u}`, field("Nuova password", `<input name="password" type="password" required minlength="8" autocomplete="new-password">`, "Almeno 8 caratteri."), {
        onSubmit: async (f) => {
          await api("PUT", `/api/admin/users/${encodeURIComponent(u)}`, { password: f.password.value });
          toast("Password cambiata");
        },
      });
    }
    if (rm && confirm(`Eliminare l'account ${rm.dataset.rmu}?`)) {
      try {
        await api("DELETE", `/api/admin/users/${encodeURIComponent(rm.dataset.rmu)}`);
        await reload();
        renderView();
        toast("Account eliminato");
      } catch (ex) {
        if (ex.message !== "401") toast(ex.message, true);
      }
    }
  };
}

// ---------------------------------------------------------------- avvio
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) sheet.close();
});

(async function start() {
  try {
    const s = await api("GET", "/api/admin/session");
    if (!s.user) return renderLogin();
    await reload();
    renderShell();
  } catch (err) {
    if (err.message !== "401") app.innerHTML = `<div class="load-error"><p>${esc(err.message)}</p><button type="button" onclick="location.reload()">Riprova</button></div>`;
  }
})();

