import { json, error, readJson } from "../../_lib/auth.js";

const TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_BYTES = 1_500_000;

function sniff(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

// Le foto arrivano già rimpicciolite dal browser del pannello (max 1400px), in base64.
export async function onRequestPost({ request, env }) {
  const b = await readJson(request, 2_600_000);
  if (typeof b.data !== "string") return error("Immagine mancante.");
  let bytes;
  try {
    const bin = atob(b.data);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return error("Immagine non leggibile.");
  }
  if (bytes.length > MAX_BYTES) return error("Immagine troppo pesante (massimo 1,5 MB).", 413);
  const mime = sniff(bytes);
  if (!mime || !TYPES.has(mime)) return error("Formato non supportato: usa JPG, PNG o WebP.");
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("INSERT INTO images (id, mime, data, created_at) VALUES (?, ?, ?, ?)").bind(id, mime, bytes, Date.now()).run();
  await cleanup(env).catch(() => {});
  return json({ id, url: `/foto/${id}` }, { status: 201 });
}

// Toglie le foto caricate da più di un giorno che non sono usate da nessuna parte.
async function cleanup(env) {
  const potm = await env.DB.prepare("SELECT value FROM settings WHERE key = 'potm'").first();
  let potmImg = "";
  try {
    potmImg = JSON.parse(potm?.value || "{}").image_id || "";
  } catch {}
  await env.DB.prepare(
    `DELETE FROM images WHERE created_at < ? AND id != ?
       AND id NOT IN (SELECT image_id FROM items WHERE image_id IS NOT NULL)
       AND id NOT IN (SELECT image_id FROM links WHERE image_id IS NOT NULL)`
  ).bind(Date.now() - 86400000, potmImg).run();
}
