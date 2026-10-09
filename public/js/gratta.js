// Gratta e vinci. L'esito arriva dal server al primo tocco: qui si disegna solo la patina da grattare.
import { esc } from "./common.js";

const $ = (id) => document.getElementById(id);
const scratchEl = $("scratch");
const layer = $("layer");
const ctx = layer.getContext("2d");
const resultEl = $("result");
const hintEl = $("hint");
const revealBtn = $("reveal");

let state = null;
let outcome = null; // risposta del server dopo la giocata
let playing = null; // promessa della giocata in corso
let revealed = false;

const fmtDate = (ts) => new Date(ts).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

function setHint(t) {
  hintEl.textContent = t;
}

function resultHtml(r) {
  if (r.win) {
    return `
      <div class="res res--win">
        <p class="res__big display">Hai vinto!</p>
        <p class="res__prize">${esc(r.prize || state.prize)}${state.potm ? ` <span>(${esc(state.potm)})</span>` : ""}</p>
        <p class="res__code" aria-label="Codice ${esc(r.code)}">${esc(r.code)}</p>
        ${r.expires_at ? `<p class="res__exp">Mostralo alla cassa entro ${esc(fmtDate(r.expires_at))}</p>` : ""}
      </div>`;
  }
  return `
    <div class="res res--lose">
      <p class="res__big display">Niente<br>stavolta</p>
      <p class="res__prize">Riprova domani, il panino del mese ti aspetta.</p>
    </div>`;
}

// ---------- patina da grattare ----------
function paintLayer() {
  const r = scratchEl.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  layer.width = Math.round(r.width * dpr);
  layer.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width;
  const h = r.height;
  // base metallizzata
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#c9c6c0");
  g.addColorStop(0.45, "#efede8");
  g.addColorStop(0.55, "#d9d6cf");
  g.addColorStop(1, "#b9b5ad");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // scacchiera leggera
  const s = 16;
  ctx.fillStyle = "rgba(21, 86, 52, 0.10)";
  for (let y = 0; y < h; y += s) for (let x = (y / s) % 2 ? s : 0; x < w; x += s * 2) ctx.fillRect(x, y, s, s);
  // scritta
  ctx.fillStyle = "#155634";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fs = Math.max(24, Math.min(44, w / 8));
  ctx.font = `${fs}px "RF Display", Georgia, serif`;
  ctx.fillText("Gratta qui", w / 2, h / 2 - fs * 0.35);
  ctx.font = `600 ${Math.round(fs * 0.38)}px "RF Body", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(21, 86, 52, 0.75)";
  ctx.fillText("con il dito", w / 2, h / 2 + fs * 0.55);
  ctx.globalCompositeOperation = "destination-out";
}

let last = null;
let strokes = 0;
function scratchAt(x, y) {
  const r = layer.getBoundingClientRect();
  const px = x - r.left;
  const py = y - r.top;
  const rad = Math.max(18, r.width / 14);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = rad * 2;
  ctx.beginPath();
  if (last) ctx.moveTo(last.x, last.y);
  else ctx.moveTo(px - 0.1, py);
  ctx.lineTo(px, py);
  ctx.stroke();
  last = { x: px, y: py };
  if (++strokes % 8 === 0) checkCleared();
}

function clearedRatio() {
  const { width, height } = layer;
  const data = ctx.getImageData(0, 0, width, height).data;
  let clear = 0;
  let n = 0;
  for (let i = 3; i < data.length; i += 4 * 24) {
    n++;
    if (data[i] < 40) clear++;
  }
  return clear / n;
}

function checkCleared() {
  if (!revealed && outcome && clearedRatio() > 0.45) finish();
}

async function play() {
  if (!playing) {
    playing = fetch("/api/gratta", { method: "POST", credentials: "same-origin" })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Qualcosa è andato storto.");
        return d;
      })
      .then((d) => {
        outcome = d;
        resultEl.innerHTML = resultHtml(d);
        resultEl.hidden = false;
        checkCleared();
        return d;
      })
      .catch((err) => {
        layer.hidden = true;
        resultEl.hidden = false;
        resultEl.innerHTML = `<div class="res res--lose"><p class="res__prize">${esc(err.message)}</p></div>`;
        setHint("");
        revealBtn.hidden = true;
      });
  }
  return playing;
}

function finish() {
  if (revealed) return;
  revealed = true;
  layer.classList.add("is-gone");
  revealBtn.hidden = true;
  if (outcome.win) {
    setHint("Fai uno screenshot o mostra questa pagina alla cassa.");
    if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    confetti();
  } else {
    setHint("Si gioca una volta al giorno.");
  }
}

function startScratch() {
  paintLayer();
  setHint("Gratta la patina per scoprire se hai vinto.");
  revealBtn.hidden = false;
  resultEl.hidden = true;
  let down = false;
  layer.addEventListener("pointerdown", (e) => {
    down = true;
    last = null;
    layer.setPointerCapture(e.pointerId);
    play();
    scratchAt(e.clientX, e.clientY);
  });
  layer.addEventListener("pointermove", (e) => {
    if (down) scratchAt(e.clientX, e.clientY);
  });
  const up = () => {
    down = false;
    last = null;
    checkCleared();
  };
  layer.addEventListener("pointerup", up);
  layer.addEventListener("pointercancel", up);
  revealBtn.addEventListener("click", async () => {
    await play();
    if (outcome) finish();
  });
}

function showStatic(html, hint) {
  layer.hidden = true;
  resultEl.hidden = false;
  resultEl.innerHTML = html;
  setHint(hint);
}

// ---------- coriandoli ----------
function confetti() {
  if (reduced) return;
  const c = $("confetti");
  const g = c.getContext("2d");
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  g.scale(dpr, dpr);
  const colors = ["#155634", "#e10814", "#da8910", "#1262a8", "#ffffff", "#f2a23a"];
  const bits = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14,
    vy: -6 - Math.random() * 12,
    s: 6 + Math.random() * 8,
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    col: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.35;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.r);
      g.fillStyle = b.col;
      g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      g.restore();
    }
    if (t - t0 < 3500) requestAnimationFrame(frame);
    else g.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

// ---------- avvio ----------
async function start() {
  try {
    const res = await fetch("/api/gratta", { credentials: "same-origin" });
    state = await res.json();
  } catch {
    return showStatic(`<div class="res res--lose"><p class="res__prize">Non riesco a collegarmi. Controlla la connessione e ricarica.</p></div>`, "");
  }
  $("prize").innerHTML = `In palio: <strong>${esc(state.prize)}</strong>${state.potm ? ` <span>(${esc(state.potm)})</span>` : ""}`;
  $("rules").textContent = "Una giocata al giorno per telefono. Lo sconto vale una volta, sul panino del mese, mostrando il codice alla cassa.";

  if (!state.active) {
    return showStatic(`<div class="res res--lose"><p class="res__big display">In pausa</p><p class="res__prize">Il gratta e vinci tornerà presto.</p></div>`, "");
  }
  if (state.last && state.plays_left <= 0) {
    outcome = state.last;
    return showStatic(
      resultHtml(state.last),
      state.last.win ? (state.last.used ? "Questo codice è già stato usato." : "Mostra questa pagina alla cassa.") : "Hai già giocato oggi. Riprova domani!"
    );
  }
  if (!state.has_pass) {
    return showStatic(
      `<div class="res res--lose"><p class="res__big display">Si gioca nel locale</p><p class="res__prize">Inquadra il QR del gratta e vinci da Rock and Feller per giocare.</p><a class="res__btn" href="/menu">Intanto guarda il menù</a></div>`,
      ""
    );
  }
  await document.fonts.load('40px "RF Display"').catch(() => {});
  startScratch();
}

let resizeT;
addEventListener("resize", () => {
  if (revealed || !state?.can_play || strokes) return;
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    ctx.globalCompositeOperation = "source-over";
    paintLayer();
  }, 150);
});

start();
