// Testata e piè di pagina uguali su tutte le pagine pubbliche.
import { esc, icon, loadPublic } from "./common.js";

const NAV = [
  ["/menu", "Menù"],
  ["/componi", "Componi tu"],
  ["/del-mese", "Del mese", "is-wide"],
];

export function renderHead(current) {
  const el = document.getElementById("sitehead");
  if (!el) return;
  el.className = "sitehead";
  el.innerHTML = `
    <div class="wrap sitehead__bar">
      <a class="sitehead__logo" href="/" aria-label="Rock and Feller, pagina iniziale"><img src="/img/logo.svg" alt="" width="621" height="396"></a>
      <nav class="sitehead__nav" aria-label="Pagine">
        ${NAV.map(([href, label, cls]) => `<a href="${href}" class="${cls || ""}" ${href === current ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
    </div>
    <div class="checker checker-strip" aria-hidden="true"></div>`;
}

function tel(n) {
  return "tel:" + String(n).replace(/[^\d+]/g, "");
}

function qrSvg(text) {
  if (!window.qrcode) return "";
  const q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}" fill="#a01915"/></svg>`;
}

export async function renderFoot() {
  const el = document.getElementById("sitefoot");
  if (!el) return;
  let site = {};
  let links = [];
  try {
    const data = await loadPublic();
    site = data.site;
    links = data.links;
  } catch {}
  const insta = links.find((l) => /instagram\.com/.test(l.url));
  const items = [];
  if (site.handle) {
    items.push(
      insta
        ? `<a class="sitefoot__item" href="${esc(insta.url)}" target="_blank" rel="noopener">${icon("camera")}<span>${esc(site.handle)}<small>Seguici</small></span></a>`
        : `<span class="sitefoot__item">${icon("camera")}<span>${esc(site.handle)}</span></span>`
    );
  }
  for (const n of [site.phone, site.phone2].filter(Boolean)) {
    items.push(`<a class="sitefoot__item" href="${tel(n)}">${icon("phone")}<span>${esc(n)}<small>Chiama per ordinare</small></span></a>`);
  }
  const qr = typeof location !== "undefined" ? qrSvg(`${location.origin}/qr/home`) : "";
  el.className = "sitefoot";
  el.innerHTML = `
    <div class="checker checker-strip" aria-hidden="true"></div>
    <div class="sitefoot__band">
      <div class="wrap sitefoot__inner">
        ${qr ? `<div class="sitefoot__qr" title="Inquadra per aprire il sito sul telefono">${qr}</div>` : ""}
        ${items.join("")}
        <a class="sitefoot__logo" href="/" aria-label="Pagina iniziale"><img src="/img/logo.svg" alt="" width="621" height="396"></a>
      </div>
    </div>
    <div class="checker checker-strip" aria-hidden="true" style="border-top:0"></div>
    <div class="sitefoot__legal">
      <div class="wrap">
        <span>${esc(site.name || "Rock and Feller")}${site.address ? ` · ${site.maps_url ? `<a href="${esc(site.maps_url)}" target="_blank" rel="noopener">${esc(site.address)}</a>` : esc(site.address)}` : ""}</span>
        <span>${esc(site.tagline || "")}</span>
      </div>
    </div>`;
}
