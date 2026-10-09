import { esc, euro, richText, photo, loadPublic, showError, icon, isExternal } from "./common.js";
import { renderFoot } from "./chrome.js";

const $ = (id) => document.getElementById(id);

// Testo scuro sui colori chiari (arancio, giallo), bianco sugli altri.
export function inkFor(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05) >= 4.5 ? "#fff" : "#231f20";
}

const linkAttrs = (url) => (isExternal(url) ? `href="${esc(url)}" target="_blank" rel="noopener"` : `href="${esc(url)}"`);
const linkIcon = (l, cls) => (l.image_id ? `<img class="${cls}" src="${photo(l.image_id)}" alt="">` : icon(l.icon, cls));

function renderPotm(p) {
  if (!p || !p.title) return "";
  return `
    <a class="potm${p.image_id ? " has-photo" : ""}" href="/del-mese">
      ${p.image_id ? `<img class="potm__photo" src="${photo(p.image_id)}" alt="">` : ""}
      <div class="potm__body">
        <p class="potm__label display">${esc(p.label)}${p.period ? ` <span>${esc(p.period)}</span>` : ""}</p>
        <p class="potm__name">${esc(p.title)}</p>
        ${p.description ? `<p class="potm__desc">${richText(p.description)}</p>` : ""}
        <p class="potm__foot"><span class="potm__price display">${euro(p.price_cents)}</span><span class="potm__go">Scoprilo ${icon("arrow")}</span></p>
      </div>
    </a>`;
}

function render({ site, links, potm }) {
  if (site.tagline) $("tagline").textContent = site.tagline;
  $("potm").innerHTML = renderPotm(potm);

  $("links").innerHTML = links
    .filter((l) => l.kind !== "social")
    .map(
      (l) => `<a class="btn-big" ${linkAttrs(l.url)} style="--c:${esc(l.color)};--ink:${inkFor(l.color)}">
        <span class="btn-big__label">${esc(l.label)}</span>${linkIcon(l, "btn-big__icon")}</a>`
    )
    .join("");

  $("social").innerHTML = links
    .filter((l) => l.kind === "social")
    .map((l) => `<a class="soc" ${linkAttrs(l.url)}>${linkIcon(l, "soc__icon")}<span>${esc(l.label)}</span></a>`)
    .join("");

  const info = [];
  if (site.address) {
    const a = esc(site.address);
    info.push(`<p>${icon("pin")}${site.maps_url ? `<a ${linkAttrs(site.maps_url)}>${a}</a>` : `<span>${a}</span>`}</p>`);
  }
  if (site.hours) info.push(`<p>${icon("clock")}<span>${esc(site.hours).replace(/\n/g, "<br>")}</span></p>`);
  $("info").innerHTML = info.join("");
}

function start() {
  loadPublic().then(render, () => showError($("links"), start));
}
start();
renderFoot();
