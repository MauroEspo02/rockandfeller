import { esc, euro, richText, photo, loadPublic, showError, icon } from "./common.js";
import { renderHead, renderFoot } from "./chrome.js";

renderHead("/menu");

const menuEl = document.getElementById("menu");
const navEl = document.getElementById("catnav");

function variantPrice(v) {
  if (v.price_cents == null) return "";
  return v.type === "price" ? euro(v.price_cents) : "+" + euro(v.price_cents);
}

function nameBits(item, cat) {
  const veg = item.tags.includes("veg");
  const seasonal = item.tags.includes("stagionale");
  return {
    color: veg ? "var(--verdino)" : cat.item_color,
    after:
      (item.pieces ? ` <span class="it__pz">${esc(item.pieces)}</span>` : "") +
      (seasonal ? `<sup class="it__star" title="Prodotto stagionale">*</sup>` : "") +
      (veg ? ` <span class="it__veg" title="Vegetariano">${icon("leaf")}<span class="sr-only">vegetariano</span></span>` : ""),
  };
}

function badges(item, potmId) {
  let out = "";
  if (item.id === potmId) out += `<span class="badge badge--potm">del mese</span>`;
  if (!item.available) out += `<span class="badge badge--off">esaurito</span>`;
  return out;
}

function fullItem(item, cat, potmId) {
  const { color, after } = nameBits(item, cat);
  const img = item.image_id ? `<img class="it__img" src="${photo(item.image_id)}" alt="" loading="lazy">` : "";
  const vars = item.variants.length
    ? `<ul class="it__vars">${item.variants.map((v) => `<li>${esc(v.label)} <span class="price">${variantPrice(v)}</span></li>`).join("")}</ul>`
    : "";
  return `
    <article class="it it--full${item.available ? "" : " is-off"}${img ? " has-img" : ""}" id="p${item.id}">
      ${img}
      <div class="it__text">
        ${item.prefix ? `<p class="it__prefix">${esc(item.prefix)}</p>` : ""}
        <h3 class="it__head"><span class="it__name" style="color:${esc(color)}">${esc(item.name)}</span>${after}
          <span class="price">${euro(item.price_cents)}</span>${badges(item, potmId)}</h3>
        ${item.description ? `<p class="it__desc">${richText(item.description)}</p>` : ""}
        ${vars}
      </div>
    </article>`;
}

function compactItem(item, cat, potmId) {
  const { color, after } = nameBits(item, cat);
  return `
    <li class="row${item.available ? "" : " is-off"}" id="p${item.id}">
      <span class="row__name" style="color:${esc(color)}">${esc(item.name)}${after}</span>
      <span class="row__dots" aria-hidden="true"></span>
      <span class="price">${euro(item.price_cents)}</span>${badges(item, potmId)}
    </li>`;
}

function render(data) {
  const cats = data.categories.filter((c) => c.show_in_menu && c.items.length);
  const potmId = data.potm ? data.potm.item_id : null;
  navEl.innerHTML = cats
    .map((c) => `<a href="#c${c.id}" style="--c:${esc(c.color)}" data-cat="${c.id}">${esc(c.name)}</a>`)
    .join("");

  const sections = cats.map((c) => {
    const isFull = (i) => i.description || i.variants.length || i.image_id || i.prefix;
    const full = c.items.filter(isFull);
    const compact = c.items.filter((i) => !isFull(i));
    return `
      <section class="cat" id="c${c.id}" style="--c:${esc(c.color)}">
        <h2 class="cat__title display">${esc(c.name)}${c.note ? ` <span class="cat__note">${esc(c.note)}</span>` : ""}</h2>
        ${compact.length ? `<ul class="rows">${compact.map((i) => compactItem(i, c, potmId)).join("")}</ul>` : ""}
        ${full.length ? `<div class="fulls">${full.map((i) => fullItem(i, c, potmId)).join("")}</div>` : ""}
      </section>`;
  });

  const s = data.site;
  const hasSeasonal = cats.some((c) => c.items.some((i) => i.tags.includes("stagionale")));
  menuEl.innerHTML = `
    ${sections.join("")}
    <footer class="menu__foot">
      ${hasSeasonal && s.seasonal_note ? `<p class="seasonal"><span class="it__star">*</span>${esc(s.seasonal_note)}</p>` : ""}
      <a class="cta" href="/componi"><span class="display">Componi il tuo panino</span>${icon("arrow")}</a>
      ${s.allergen_note ? `<p class="allergeni">${esc(s.allergen_note)}</p>` : ""}
    </footer>`;

  // Evidenzia nella barra la categoria che si sta guardando
  const links = new Map([...navEl.querySelectorAll("a")].map((a) => [a.dataset.cat, a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.id.slice(1);
        links.forEach((a, k) => a.classList.toggle("is-on", k === id));
        const a = links.get(id);
        if (a && navEl.scrollWidth > navEl.clientWidth) navEl.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
      }
    },
    { rootMargin: "-160px 0px -60% 0px" }
  );
  menuEl.querySelectorAll(".cat").forEach((el) => io.observe(el));

  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

function start() {
  loadPublic().then(render, () => showError(menuEl, start));
}
start();
renderFoot();
