export function romeDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

// Elenco dei QR con le scansioni degli ultimi 30 giorni.
export async function listQr(env) {
  const since = romeDay(new Date(Date.now() - 29 * 86400000));
  const [codes, days] = await Promise.all([
    env.DB.prepare("SELECT slug, label, target, scans, created_at, updated_at FROM qr_codes ORDER BY created_at, rowid").all(),
    env.DB.prepare("SELECT slug, day, count FROM qr_scans WHERE day >= ? ORDER BY day").bind(since).all(),
  ]);
  const bySlug = {};
  for (const d of days.results) (bySlug[d.slug] ||= {})[d.day] = d.count;
  return codes.results.map((c) => ({ ...c, days: bySlug[c.slug] || {} }));
}
