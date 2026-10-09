// Funzioni condivise dalle pagine pubbliche.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// 850 → "8,50€" (come sul menù cartaceo)
export function euro(cents) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",") + "€";
}

// Testo degli ingredienti: *parole tra asterischi* diventano arancioni (es. *Selezione Letizia*).
export function richText(s) {
  return esc(s).replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');
}

export function photo(id) {
  return id ? `/foto/${id}` : "";
}

let cache = null;
export async function loadPublic() {
  if (!cache) {
    cache = fetch("/api/public", { headers: { Accept: "application/json" } }).then(async (r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
    cache.catch(() => (cache = null));
  }
  return cache;
}

export function showError(el, retry) {
  el.innerHTML = `<div class="load-error"><p>Non riesco a caricare il menù. Controlla la connessione.</p><button type="button">Riprova</button></div>`;
  el.querySelector("button").addEventListener("click", retry);
}

// Icone semplici a tratto (nessun logo di marchi: per quelli si può caricare un'immagine dal pannello).
const P = {
  menu: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 16h6"/>',
  burger: '<path d="M4 10a8 6 0 0 1 16 0z"/><path d="M3 14h18M4 18h16a0 0 0 0 1 0 0 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
  scooter: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17h7l-2-8h3M13 9h-3M15.5 17 18 11"/><path d="M3 12h6v3H3z"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  camera: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-4 3.2-6 6.5-6s5.9 2 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 1.6 5.5 5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  table: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 21V3c-2.2 1-3.5 3.5-3.5 7v3H16"/>',
  ticket: '<path d="M3 7a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z"/><path d="M14 5v14" stroke-dasharray="2 3"/>',
  gift: '<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zm0 0s2-5 4.5-3.5S15 8 12 8z"/>',
};
export const ICON_NAMES = Object.keys(P);

export function icon(name, cls = "icon") {
  const body = P[name] || P.link;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function isExternal(url) {
  return /^https?:\/\//.test(url);
}
