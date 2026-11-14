"use strict";

const $ = (s) => document.querySelector(s);
const RING = 2 * Math.PI * 52;
const LOG_KEY = "dehnen.log.v1";

/* ============================================================
   Platzhalterbild, falls Screenshot fehlt
   ============================================================ */
const AREA_EMOJI = { Nacken:"🙆", Schultern:"🤷", Brust:"🫁", "Oberer Rücken":"🧘", Wirbelsäule:"🐈", Hüfte:"🦵", Beinrückseite:"🙇", Waden:"🐕", Entspannung:"😌" };
function placeholder(ex) {
  const e = AREA_EMOJI[ex.area] || "🧘";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f2a2b"/><stop offset="1" stop-color="#191c23"/></linearGradient></defs>
    <rect width="320" height="200" fill="url(#g)"/>
    <text x="160" y="118" font-size="72" text-anchor="middle">${e}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function setImg(el, ex) {
  el.onerror = () => { el.onerror = null; el.src = placeholder(ex); };
  el.src = ex.img || placeholder(ex);
}

/* ============================================================
   Sound
   Hauptweg: Web Audio. Jeder Piep wird genau in dem Moment gespielt,
   in dem die Zahl im Ring umspringt – Ton und Anzeige bleiben synchron.
   navigator.audioSession "ambient": Töne halten sich an den Lautlos-
   Schalter des iPhones und mischen sich mit Musik (die läuft weiter).
   Fallback nur, wenn es gar kein Web Audio gibt: WAV über <audio>.
   ============================================================ */
const RATE = 22050;
function makePcm(notes) {
  const total = notes.reduce((s, n) => Math.max(s, n.at + n.dur), 0);
  const len = Math.ceil(total * RATE);
  const data = new Float32Array(len);
  for (const n of notes) {
    const start = Math.floor(n.at * RATE), l = Math.floor(n.dur * RATE);
    for (let i = 0; i < l && start + i < len; i++) {
      const t = i / RATE;
      const env = Math.min(1, i / (RATE * 0.005)) * Math.exp(-t * (n.decay || 6));
      data[start + i] += Math.sin(2 * Math.PI * n.f * t) * env * (n.vol || 0.5);
    }
  }
  return data;
}
function pcmToWavUrl(data) {
  const len = data.length, buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
const PCM = {
  tick:   makePcm([{ f: 880, at: 0, dur: 0.15, decay: 18, vol: 0.45 }]),
  go:     makePcm([{ f: 660, at: 0, dur: 0.4, decay: 7 }, { f: 990, at: 0.14, dur: 0.6, decay: 5 }]),
  // Seitenwechsel: tiefes "Ding-Dong" zweimal – klingt bewusst anders als Tick und Gong
  side:   makePcm([
    { f: 784, at: 0,    dur: 0.25, decay: 9, vol: 0.5 }, { f: 523, at: 0.16, dur: 0.35, decay: 8, vol: 0.5 },
    { f: 784, at: 0.40, dur: 0.22, decay: 9, vol: 0.5 }, { f: 523, at: 0.54, dur: 0.4,  decay: 7, vol: 0.5 },
  ]),
  finish: makePcm([523, 659, 784, 1047].map((f, i) => ({ f, at: i * 0.13, dur: 0.9, decay: 4, vol: 0.4 }))),
};

let actx = null;          // AudioContext
const BUF = {};           // AudioBuffer pro Ton
let htmlAudio = null;     // Fallback

function unlockAudio() {  // muss in einem Tap passieren (iOS-Regel)
  try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (_) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC && !actx) {
    try {
      actx = new AC();
      for (const [name, data] of Object.entries(PCM)) {
        const b = actx.createBuffer(1, data.length, RATE);
        b.getChannelData(0).set(data);
        BUF[name] = b;
      }
    } catch (_) { actx = null; }
  }
  if (actx) {
    if (actx.state !== "running") actx.resume().catch(() => {});
    // kurzer stummer Puffer schaltet Audio auf iOS sicher frei
    const s = actx.createBufferSource(); s.buffer = actx.createBuffer(1, 1, RATE); s.connect(actx.destination); s.start(0);
    return;
  }
  if (!htmlAudio) {
    htmlAudio = {};
    for (const [name, data] of Object.entries(PCM)) htmlAudio[name] = new Audio(pcmToWavUrl(data));
    for (const a of Object.values(htmlAudio)) {
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
    }
  }
}

// Ton sofort abspielen (Web Audio: kleine, gleichbleibende Verzögerung).
// <audio> nur, falls das Gerät gar kein Web Audio kann.
function play(name) {
  if (actx && actx.state !== "running") actx.resume().catch(() => {});
  if (actx && actx.state === "running" && BUF[name]) {
    const src = actx.createBufferSource();
    src.buffer = BUF[name];
    src.connect(actx.destination);
    src.start(0);
    return;
  }
  if (htmlAudio) {
    const a = htmlAudio[name];
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (_) {}
  }
}

/* ============================================================
   Bildschirm wach halten
   ============================================================ */
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (_) {}
}

/* ============================================================
   Verlauf speichern
   ============================================================ */
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const loadLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY)) || {}; } catch (_) { return {}; } };
function saveSession(doneCount) {
  if (doneCount < 1) return;
  const log = loadLog(), k = dayKey(new Date());
  const prev = log[k] || { done: 0 };
  log[k] = { done: Math.max(prev.done, doneCount), total: EXERCISES.length };
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}
const isFull = (e) => e && e.done >= e.total;

/* ============================================================
   Startseite
   ============================================================ */
function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; }

function renderHome() {
  const list = $("#exercise-list");
  list.innerHTML = "";
  EXERCISES.forEach((ex, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<img alt=""><div><div class="t"></div><div class="a"></div></div><span class="n">${ex.sides ? "⇄ " : ""}${fmt(exDur(ex))}</span>`;
    li.querySelector(".t").textContent = ex.name;
    li.querySelector(".a").textContent = ex.area;
    setImg(li.querySelector("img"), ex);
    list.appendChild(li);
  });
  const mins = Math.round(totalTime() / 60);
  $("#start-sub").textContent = `${EXERCISES.length} Übungen · ~${mins} min`;

  // Streak: aufeinanderfolgende Tage (heute oder gestern beginnend)
  const log = loadLog();
  let d = new Date(), streak = 0;
  if (!log[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (log[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  const today = log[dayKey(new Date())];
  $("#streak").textContent =
    today && isFull(today) ? `Heute schon erledigt ✓  ·  ${streak} Tag${streak === 1 ? "" : "e"} in Folge`
    : streak > 0 ? `🔥 ${streak} Tag${streak === 1 ? "" : "e"} in Folge – weiter so!`
    : "Bereit für deine Session?";
}

/* ============================================================
   Session-Ablauf
   Phasen:  "prep"   – Mach dich bereit (vor jeder Übung)
            "work"   – Übung läuft (bei einseitigen: eine Hälfte)
            "switch" – Seitenwechsel-Pause zwischen den Hälften
   ============================================================ */
const S = { idx: 0, phase: "prep", half: 1, endTs: 0, remaining: 0, paused: false, running: false, timer: 0, lastSec: -1, completed: 0 };
const FLASH_MS = 1300; // so lange ist der grüne "Weiter"-Bildschirm zu sehen – zählt nicht zur Wechselzeit
// Eigene Dauer pro Übung möglich (duration: 90), sonst Standard aus SETTINGS
const exDur = (ex) => ex.duration || SETTINGS.duration;
const sideLbl = (ex) => (ex.sides === true ? "Seite" : ex.sides);
const totalWork = () => EXERCISES.reduce((s, e) => s + exDur(e), 0);
const totalTime = () => totalWork() + EXERCISES.length * SETTINGS.prep + EXERCISES.filter((e) => e.sides).length * SETTINGS.switch;
function phaseLen(p) {
  const ex = EXERCISES[S.idx];
  if (p === "prep") return SETTINGS.prep * 1000;
  if (p === "switch") return SETTINGS.switch * 1000;
  return (ex.sides ? exDur(ex) / 2 : exDur(ex)) * 1000;
}

function startSession() {
  unlockAudio();
  keepAwake(true);
  const btn = $("#btn-start"), burst = $("#burst");
  btn.classList.add("launch");
  const r = btn.getBoundingClientRect();
  burst.style.left = r.left + r.width / 2 + "px";
  burst.style.top = r.top + r.height / 2 + "px";
  burst.classList.remove("go"); void burst.offsetWidth; burst.classList.add("go");

  setTimeout(() => {
    btn.classList.remove("launch");
    Object.assign(S, { idx: 0, half: 1, paused: false, running: true, completed: 0 });
    $("#session").hidden = false;
    enterPhase(SETTINGS.prep > 0 ? "prep" : "work", true);
    S.timer = setInterval(tick, 100);          // Reserve, falls der Bildschirmtakt pausiert
    const loop = () => { if (!S.running) return; tick(); S.raf = requestAnimationFrame(loop); };
    S.raf = requestAnimationFrame(loop);
  }, 380);
}

// holdMs: Countdown startet erst danach (z. B. während der grüne Übergang läuft)
function enterPhase(phase, animate, holdMs = 0) {
  S.phase = phase;
  S.remaining = phaseLen(phase);
  S.endTs = Date.now() + holdMs + S.remaining;
  S.lastSec = -1;
  const ex = EXERCISES[S.idx];
  const sess = $("#session");
  sess.classList.toggle("prep", phase === "prep");
  sess.classList.toggle("switching", phase === "switch");
  $("#s-count").textContent = `Übung ${S.idx + 1} / ${EXERCISES.length}`;
  $("#s-area").textContent = ex.area;
  $("#s-name").textContent = ex.name;
  $("#s-tip").textContent = ex.tip || "";
  $("#side-text").textContent = `${ex.sides ? sideLbl(ex) : "Seite"} wechseln`;
  $("#s-state").textContent =
    phase === "prep" ? "gleich geht's los"
    : phase === "switch" ? "wechseln"
    : ex.sides ? `${sideLbl(ex)} ${S.half}` : "halten & atmen";
  const nx = EXERCISES[S.idx + 1];
  $("#s-next").textContent = nx ? `Danach: ${nx.name}` : "Letzte Übung 💪";
  if (animate) {
    const wrap = $(".s-img-wrap");
    setImg($("#s-img"), ex);
    setImg($("#s-img-bg"), ex);
    wrap.classList.remove("swap"); void wrap.offsetWidth; wrap.classList.add("swap");
  }
  if (phase === "work") play("go");
  if (phase === "switch") play("side");
  render();
}

function nextExercise(withFlash) {
  if (S.idx + 1 >= EXERCISES.length) { finishSession(); return false; }
  S.idx++;
  S.half = 1;
  if (withFlash) showFlash(EXERCISES[S.idx].name);
  if (SETTINGS.prep > 0) enterPhase("prep", true, withFlash ? FLASH_MS : 0);
  else enterPhase("work", true);
  return true;
}

// Eine Phase ist abgelaufen → nächste Phase bestimmen
function advance() {
  const ex = EXERCISES[S.idx];
  if (S.phase === "prep") return enterPhase("work", false), true;
  if (S.phase === "switch") { S.half = 2; enterPhase("work", false); return true; }
  // work vorbei
  if (ex.sides && S.half === 1) {
    if (SETTINGS.switch > 0) enterPhase("switch", false);
    else { S.half = 2; play("side"); enterPhase("work", false); }
    return true;
  }
  S.completed = S.idx + 1;
  return nextExercise(true);
}

function tick() {
  if (!S.running || S.paused) return;
  S.remaining = Math.min(S.endTs - Date.now(), phaseLen(S.phase));
  // Falls die App im Hintergrund war, ggf. mehrere Phasen nachholen
  while (S.remaining <= 0 && S.running) {
    const overshoot = -S.remaining;
    if (!advance()) return;
    S.endTs -= overshoot;
    S.remaining = Math.min(S.endTs - Date.now(), phaseLen(S.phase));
  }
  render();
}

// Welche Sekunden piepen?  Wechselzeit (prep): jede Sekunde 5-4-3-2-1,
// Ende einer Übung / Seitenwechsel-Pause: 3-2-1
function beepsAt(sec) {
  if (S.phase === "prep") return sec >= 1 && sec <= SETTINGS.prep;
  return sec >= 1 && sec <= 3 && sec * 1000 < phaseLen(S.phase);
}

function render() {
  const len = phaseLen(S.phase);
  const real = S.endTs - Date.now();             // echte Restzeit (während des grünen Übergangs > len)
  const shown = Math.max(0, Math.min(real, len));
  $("#ring-fg").style.strokeDashoffset = RING * (1 - shown / len);
  $("#s-time").textContent = fmt(Math.ceil(shown / 1000));
  const sec = Math.ceil(real / 1000);
  if (sec !== S.lastSec) {
    S.lastSec = sec;
    if (S.running && !S.paused && beepsAt(sec)) {
      play("tick");
      const wrap = $("#ring-tap");
      wrap.classList.remove("last3"); void wrap.offsetWidth; wrap.classList.add("last3");
    }
  }
}

function showFlash(nextName) {
  const f = $("#flash");
  $("#flash-text").textContent = `Weiter: ${nextName}`;
  f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
}

function togglePause() {
  if (!S.running) return;
  S.paused = !S.paused;
  if (S.paused) { S.remaining = Math.min(S.endTs - Date.now(), phaseLen(S.phase)); keepAwake(false); }
  else { S.endTs = Date.now() + S.remaining; keepAwake(true); }
  $("#session").classList.toggle("paused", S.paused);
  $("#ico-pause").hidden = S.paused;
  $("#ico-play").hidden = !S.paused;
}

function skip() {
  if (!S.running) return;
  if (S.paused) togglePause();
  if (S.phase === "prep") return enterPhase("work", false);
  if (S.phase === "switch") { S.half = 2; return enterPhase("work", false); }
  nextExercise(true);
}

function endSession() {
  clearInterval(S.timer);
  cancelAnimationFrame(S.raf);
  S.running = false;
  S.paused = false;
  keepAwake(false);
  const sess = $("#session");
  sess.classList.remove("paused", "prep", "switching");
  $("#ico-pause").hidden = false; $("#ico-play").hidden = true;
  sess.hidden = true;
}

function stopSession() {
  if (!confirm("Session beenden?")) return;
  saveSession(S.completed);
  endSession();
  renderHome(); renderCalendar();
}

function finishSession() {
  S.completed = EXERCISES.length;
  saveSession(S.completed);
  endSession();
  play("finish");
  const mins = Math.round(totalWork() / 60);
  $("#done-text").textContent = `${EXERCISES.length} Übungen · ${mins} Minuten gedehnt`;
  $("#done").hidden = false;
  confetti();
  renderHome(); renderCalendar();
}

/* ============================================================
   Konfetti
   ============================================================ */
function confetti() {
  const c = $("#confetti"), ctx = c.getContext("2d"), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ["#4fd1a5", "#3aa0ff", "#ffb547", "#ff6b8b", "#f1f2f5"];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2, y: innerHeight * 0.4,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    s: Math.random() * 6 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (t - t0 < 4000 && !$("#done").hidden) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

/* ============================================================
   Kalender
   ============================================================ */
let calOffset = 0;
function renderCalendar() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Montag = 0
  const log = loadLog();
  $("#cal-title").textContent = first.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const grid = $("#cal-grid");
  grid.innerHTML = "";
  for (let i = 0; i < lead; i++) grid.appendChild(document.createElement("span"));
  let count = 0, full = 0;
  for (let d = 1; d <= days; d++) {
    const date = new Date(first.getFullYear(), first.getMonth(), d);
    const k = dayKey(date), e = log[k];
    const el = document.createElement("div");
    el.textContent = d;
    if (k === dayKey(now)) el.classList.add("today");
    if (date > now) el.classList.add("future");
    if (e) {
      count++;
      if (isFull(e)) { full++; el.classList.add("full"); el.style.animationDelay = d * 15 + "ms"; }
      else el.classList.add("part");
    }
    grid.appendChild(el);
  }
  const elapsed = calOffset === 0 ? now.getDate() : days;
  $("#cal-summary").textContent = count
    ? `${count} von ${elapsed} Tagen gedehnt${full !== count ? ` (${full} komplett)` : ""}`
    : "Noch keine Session in diesem Monat";
}

/* ============================================================
   Events
   ============================================================ */
$("#btn-start").addEventListener("click", startSession);
$("#btn-pause").addEventListener("click", togglePause);
$("#ring-tap").addEventListener("click", togglePause);
$("#pause-veil").addEventListener("click", togglePause);
$("#btn-skip").addEventListener("click", skip);
$("#btn-stop").addEventListener("click", stopSession);
$("#btn-done").addEventListener("click", () => { $("#done").hidden = true; });

document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".tabbar button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  $(`#view-${b.dataset.view}`).classList.add("active");
  if (b.dataset.view === "history") renderCalendar();
}));
document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
  calOffset = Number(b.dataset.offset);
  renderCalendar();
}));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (S.running && !S.paused) {
      keepAwake(true);
      if (actx && actx.state !== "running") actx.resume().catch(() => {});
      tick();
    }
    renderHome();
  }
});

renderHome();
renderCalendar();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
