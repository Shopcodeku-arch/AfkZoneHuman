import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { firebaseConfig, ICE_SERVERS } from "./firebase-config.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, updateDoc, onSnapshot, query, orderBy, limit, where, runTransaction, serverTimestamp, deleteDoc, deleteField } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(initializeApp(firebaseConfig));

const $ = id => document.getElementById(id);
const MAX = 4, STALE = 30000;
const DEF = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1a2a38"/><circle cx="32" cy="24" r="11" fill="#7b94a7"/><path d="M10 60c2-16 12-22 22-22s20 6 22 22z" fill="#7b94a7"/></svg>');
const me = { id: Math.random().toString(36).slice(2, 10), name: "", avatar: "" };
const fresh = m => m && Date.now() - m.t < STALE;
const show = id => { document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id)); };

// ---------- Profil ----------
try { const s = JSON.parse(localStorage.getItem("afk_me") || "{}"); me.name = s.name || ""; me.avatar = s.avatar || ""; } catch {}
$("name").value = me.name; $("pv").src = me.avatar || DEF;

$("file").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const s = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 96, 96);
    me.avatar = c.toDataURL("image/jpeg", .7); $("pv").src = me.avatar;
  };
  img.src = URL.createObjectURL(f);
};
$("enter").onclick = () => {
  const n = $("name").value.trim();
  if (!n) { $("err").textContent = "Isi nama dulu."; return; }
  me.name = n;
  localStorage.setItem("afk_me", JSON.stringify({ name: me.name, avatar: me.avatar }));
  $("me-name").textContent = me.name; $("me-av").src = me.avatar || DEF;
  show("lobby"); watchRooms();
};
$("name").onkeydown = e => e.key === "Enter" && $("enter").click();
$("logout").onclick = () => { unRooms && unRooms(); show("login"); };

// ---------- Lobby ----------
let unRooms = null;
function watchRooms() {
  unRooms && unRooms();
  unRooms = onSnapshot(query(collection(db, "rooms"), where("public", "==", true)), snap => {
    const box = $("rooms"); box.innerHTML = "";
    let n = 0;
    snap.forEach(d => {
      const r = d.data();
      const live = Object.values(r.members || {}).filter(fresh), cnt = live.length;
      if (!cnt && Date.now() - (r.created || 0) > 60000) return;
      n++;
      const el = document.createElement("div"); el.className = "room";
      const l = document.createElement("div");
      const b = document.createElement("b"); b.textContent = r.name;
      const sm = document.createElement("small"); sm.textContent = ` ${cnt}/${MAX}` + (cnt ? ": " + live.map(m => m.name).join(", ") : "");
      l.append(b, document.createElement("br"), sm);
      const btn = document.createElement("button"); btn.textContent = cnt >= MAX ? "Penuh" : "Gabung"; btn.disabled = cnt >= MAX;
      btn.onclick = () => joinRoom(d.id);
      el.append(l, btn); box.append(el);
    });
    if (!n) box.innerHTML = '<div class="empty">Belum ada room publik. Buat satu dan nyalakan apinya.</div>';
  }, e => $("lerr").textContent = "Gagal memuat room: " + e.message);
}
const genId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), x => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32]).join("");
async function hashPin(pin, id) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id + ":" + pin));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const vis = () => document.querySelector("input[name=vis]:checked").value;
document.querySelectorAll("input[name=vis]").forEach(r => r.onchange = () => { $("rpin").hidden = vis() !== "priv"; });
$("mk").onclick = async () => {
  const pub = vis() === "pub", pin = $("rpin").value.trim();
  if (!pub && !/^\d{4,6}$/.test(pin)) { $("lerr").textContent = "Kode privat harus 4 sampai 6 angka."; return; }
  const id = genId(), name = $("rname").value.trim() || `Api unggun ${me.name}`;
  try {
    const data = { name, public: pub, created: Date.now(), members: {} };
    if (!pub) data.pin = await hashPin(pin, id);
    await setDoc(doc(db, "rooms", id), data);
    $("rname").value = ""; $("rpin").value = ""; joinRoom(id);
  } catch (e) { $("lerr").textContent = "Gagal membuat room: " + e.message; }
};
$("jbtn").onclick = async () => {
  const id = $("jid").value.trim().toUpperCase(), pin = $("jpin").value.trim();
  try {
    const s = await getDoc(doc(db, "rooms", id)), d = s.exists() && s.data();
    if (!d || (!d.public && d.pin !== await hashPin(pin, id))) { $("lerr").textContent = "Room ID atau kode salah."; return; }
    $("jpin").value = ""; joinRoom(id);
  } catch (e) { $("lerr").textContent = "Gagal bergabung: " + e.message; }
};

// ---------- Room ----------
let rid = null, rref = null, localStream = null, peers = {}, unsubs = [], hb = null, init = false, ac = null, meters = {}, raf = 0, muted = false;
const rcfg = { iceServers: ICE_SERVERS };

async function joinRoom(id) {
  let info = {};
  $("lerr").textContent = "";
  rref = doc(db, "rooms", id);
  try {
    await runTransaction(db, async tx => {
      const s = await tx.get(rref);
      if (!s.exists()) throw new Error("Room sudah tidak ada.");
      info = s.data(); const ms = info.members || {};
      const n = Object.entries(ms).filter(([k, m]) => k !== me.id && fresh(m)).length;
      if (n >= MAX) throw new Error("Room penuh (maks 4 orang).");
      tx.update(rref, { [`members.${me.id}`]: { name: me.name, avatar: me.avatar, t: Date.now() } });
    });
  } catch (e) { $("lerr").textContent = e.message; return; }

  rid = id; init = false; $("rt").textContent = info.name;
  $("rmeta").textContent = info.public ? `Room publik, kode ${id}` : `Room privat, kode ${id}`; $("msgs").innerHTML = ""; show("room");
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    $("vstat").textContent = "Mic aktif"; $("mute").disabled = false;
  } catch { localStream = null; $("vstat").textContent = "Mic tidak tersedia (hanya mendengar)"; $("mute").disabled = true; }
  ac = new (window.AudioContext || window.webkitAudioContext)();
  if (localStream) addMeter(me.id, localStream);

  hb = setInterval(() => updateDoc(rref, { [`members.${me.id}.t`]: Date.now() }).catch(() => {}), 10000);
  unsubs.push(onSnapshot(rref, onRoom));
  unsubs.push(onSnapshot(query(collection(db, "rooms", rid, "messages"), orderBy("t"), limit(100)), snap => {
    snap.docChanges().forEach(c => { if (c.type === "added") addMsg(c.doc.data()); });
  }));
  const t0 = Date.now() - 15000;
  unsubs.push(onSnapshot(query(collection(db, "rooms", rid, "signals"), where("to", "==", me.id)), snap => {
    snap.docChanges().forEach(c => {
      if (c.type !== "added") return;
      const s = c.doc.data(); deleteDoc(c.doc.ref).catch(() => {});
      if (s.t > t0) onSig(s);
    });
  }));
  raf = requestAnimationFrame(loop);
}
$("copy").onclick = () => rid && navigator.clipboard?.writeText(rid).then(() => { $("copy").textContent = "Tersalin"; setTimeout(() => $("copy").textContent = "Salin kode", 1500); });

function onRoom(snap) {
  if (!snap.exists()) { leave(); return; }
  const ms = Object.entries(snap.data().members || {}).filter(([k, m]) => k === me.id || fresh(m));
  renderSeats(ms);
  const ids = ms.map(([k]) => k).filter(k => k !== me.id);
  if (!init) { init = true; ids.forEach(k => call(k)); }   // pendatang baru yang menelepon
  Object.keys(peers).forEach(k => { if (!ids.includes(k)) closePeer(k); });
}

function renderSeats(ms) {
  const ring = $("ring");
  ring.querySelectorAll(".seat").forEach(e => e.remove());
  const n = ms.length;
  ms.forEach(([k, m], i) => {
    const a = (Math.PI * 2 * i) / Math.max(n, 1) - Math.PI / 2;
    const d = document.createElement("div"); d.className = "seat"; d.dataset.id = k;
    d.style.left = 50 + 58 * Math.cos(a) + "%"; d.style.top = 50 + 58 * Math.sin(a) + "%";
    const im = document.createElement("img"); im.src = m.avatar || DEF; im.alt = "";
    const sp = document.createElement("span"); sp.textContent = k === me.id ? m.name + " (kamu)" : m.name;
    d.append(im, sp); ring.append(d);
  });
}

// ---------- WebRTC ----------
function mk(id) {
  const pc = new RTCPeerConnection(rcfg);
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  else pc.addTransceiver("audio", { direction: "recvonly" });
  pc.onicecandidate = e => e.candidate && sig(id, "ice", e.candidate.toJSON());
  pc.ontrack = e => {
    let a = document.getElementById("a-" + id);
    if (!a) { a = document.createElement("audio"); a.id = "a-" + id; a.autoplay = true; $("audios").append(a); }
    a.srcObject = e.streams[0]; a.play().catch(() => {});
    addMeter(id, e.streams[0]);
  };
  return (peers[id] = { pc, pending: [] });
}
async function call(id) {
  const p = peers[id] || mk(id);
  await p.pc.setLocalDescription();
  sig(id, "offer", p.pc.localDescription.toJSON());
}
function sig(to, type, data) {
  addDoc(collection(db, "rooms", rid, "signals"), { from: me.id, to, type, data: JSON.stringify(data), t: Date.now() }).catch(() => {});
}
async function onSig(s) {
  if (!rid) return;
  const p = peers[s.from] || mk(s.from), pc = p.pc, data = JSON.parse(s.data);
  try {
    if (s.type === "offer") {
      if (pc.signalingState !== "stable" && me.id < s.from) return;   // tabrakan: id lebih kecil menang
      await pc.setRemoteDescription(data); await pc.setLocalDescription();
      sig(s.from, "answer", pc.localDescription.toJSON()); await flush(p);
    } else if (s.type === "answer") {
      if (pc.signalingState === "have-local-offer") { await pc.setRemoteDescription(data); await flush(p); }
    } else if (s.type === "ice") {
      if (pc.remoteDescription) await pc.addIceCandidate(data); else p.pending.push(data);
    }
  } catch (e) { console.warn("signal", e); }
}
async function flush(p) { for (const c of p.pending.splice(0)) await p.pc.addIceCandidate(c).catch(() => {}); }
function closePeer(id) {
  peers[id]?.pc.close(); delete peers[id]; delete meters[id];
  document.getElementById("a-" + id)?.remove();
}

// ---------- Indikator bicara ----------
function addMeter(id, stream) {
  try {
    const an = ac.createAnalyser(); an.fftSize = 256;
    ac.createMediaStreamSource(stream).connect(an);
    meters[id] = { an, buf: new Uint8Array(an.frequencyBinCount) };
  } catch {}
}
// ---------- Api unggun (canvas) ----------
const fcv = $("fire"), fx = fcv.getContext("2d"), BX = 150, BY = 205;
let ps = [], em = [], tt = 0, fr = 1;
const rnd = () => Math.random(), gs = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
function fireStep() {
  tt += .016;
  fr = Math.min(1.15, Math.max(.75, .92 + .1 * Math.sin(tt * 11) * Math.sin(tt * 3.3) + (rnd() - .5) * .1));
  $("stage").style.setProperty("--f", fr.toFixed(3));
  fx.globalCompositeOperation = "source-over"; fx.clearRect(0, 0, 300, 300);
  fx.lineCap = "round";
  [[100, 226, 196, 204], [104, 206, 200, 228]].forEach(([x1, y1, x2, y2]) => {
    fx.lineWidth = 15; fx.strokeStyle = "#1e130c"; fx.beginPath(); fx.moveTo(x1, y1); fx.lineTo(x2, y2); fx.stroke();
    fx.lineWidth = 4; fx.strokeStyle = `rgba(255,110,30,${.55 * fr})`; fx.beginPath(); fx.moveTo(x1 + 6, y1 + 3); fx.lineTo(x2 - 6, y2 + 3); fx.stroke();
  });
  fx.globalCompositeOperation = "lighter";
  const g0 = fx.createRadialGradient(BX, BY - 18, 0, BX, BY - 18, 90 * fr);
  g0.addColorStop(0, "rgba(255,170,70,.45)"); g0.addColorStop(1, "rgba(255,90,20,0)");
  fx.fillStyle = g0; fx.fillRect(0, 0, 300, 300);
  for (let i = 0; i < 7; i++) ps.push({ x: BX + gs() * 30, y: BY + rnd() * 6, vx: 0, vy: -(1.1 + rnd() * 1.7), l: 0, m: 38 + rnd() * 34, r: 11 + rnd() * 11, s: rnd() * 6 });
  if (rnd() < .12) em.push({ x: BX + gs() * 30, y: BY - 15, vx: (rnd() - .5) * .8, vy: -(.7 + rnd() * 1.3), l: 0, m: 90 + rnd() * 70, s: 1 + rnd() * 1.6, p: rnd() * 6 });
  ps = ps.filter(p => p.l < p.m);
  for (const p of ps) {
    p.l++; const t = p.l / p.m;
    p.vx += (BX - p.x) * .0045 + Math.sin(p.l * .17 + p.s) * .05; p.x += p.vx; p.y += p.vy; p.vy *= .992; p.r *= .984;
    const col = t < .22 ? "255,238,170" : t < .55 ? "255,150,40" : "205,55,18", a = (1 - t) * .5 * fr;
    const g = fx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    fx.fillStyle = g; fx.beginPath(); fx.arc(p.x, p.y, p.r, 0, 6.3); fx.fill();
  }
  em = em.filter(e => e.l < e.m);
  for (const e of em) {
    e.l++; e.x += e.vx + Math.sin(e.l * .08 + e.p) * .4; e.y += e.vy;
    fx.fillStyle = `rgba(255,${150 + (rnd() * 60 | 0)},60,${1 - e.l / e.m})`;
    fx.beginPath(); fx.arc(e.x, e.y, e.s, 0, 6.3); fx.fill();
  }
}
function loop() {
  fireStep();
  for (const [id, m] of Object.entries(meters)) {
    m.an.getByteFrequencyData(m.buf);
    const v = m.buf.reduce((a, b) => a + b, 0) / m.buf.length;
    document.querySelector(`.seat[data-id="${id}"]`)?.classList.toggle("talk", v > 18 && !(id === me.id && muted));
  }
  raf = requestAnimationFrame(loop);
}
$("mute").onclick = () => {
  muted = !muted; localStream?.getAudioTracks().forEach(t => t.enabled = !muted);
  $("mute").textContent = muted ? "Nyalakan mic" : "Mute mic";
  $("vstat").textContent = muted ? "Mic mati" : "Mic aktif";
};

// ---------- Chat ----------
function addMsg(m) {
  const el = document.createElement("div"); el.className = "m";
  const im = document.createElement("img"); im.src = m.avatar || DEF; im.alt = "";
  const w = document.createElement("div"); const b = document.createElement("b"); b.textContent = m.name;
  const p = document.createElement("p"); p.textContent = m.text;
  w.append(b, p); el.append(im, w);
  const box = $("msgs"); box.append(el); box.scrollTop = box.scrollHeight;
}
async function sendMsg() {
  const t = $("cm").value.trim(); if (!t || !rid) return; $("cm").value = "";
  addDoc(collection(db, "rooms", rid, "messages"), { uid: me.id, name: me.name, avatar: me.avatar, text: t, t: serverTimestamp() }).catch(e => alert("Pesan gagal: " + e.message));
}
$("send").onclick = sendMsg;
$("cm").onkeydown = e => e.key === "Enter" && sendMsg();

// ---------- Keluar ----------
function leave() {
  if (!rid) return;
  cancelAnimationFrame(raf); clearInterval(hb);
  unsubs.forEach(u => u()); unsubs = [];
  Object.keys(peers).forEach(closePeer);
  localStream?.getTracks().forEach(t => t.stop()); localStream = null;
  ac?.close(); ac = null; ps = []; em = []; meters = {}; muted = false; $("mute").textContent = "Mute mic";
  updateDoc(rref, { [`members.${me.id}`]: deleteField() }).catch(() => {});
  rid = null; show("lobby");
}
$("leave").onclick = leave;
window.addEventListener("pagehide", () => { if (rid) updateDoc(rref, { [`members.${me.id}`]: deleteField() }).catch(() => {}); });
