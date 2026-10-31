import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { firebaseConfig, ICE_SERVERS } from "./firebase-config.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, where, runTransaction, writeBatch, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(initializeApp(firebaseConfig));
const $ = id => document.getElementById(id);
const MAX = 4, STALE = 120000, EMPTY_GC = 180000;
const SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3';
const MIC = SV + '"/></svg>', MICOFF = SV + 'M4 4l16 16"/></svg>';
const tm = v => (v && v.toMillis ? v.toMillis() : Date.now());
const fresh = m => !!m && Date.now() - tm(m.t) < STALE;
const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]).join("");
const genId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), x => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32]).join("");
let toastT;
function toast(t) { const e = $("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove("on"), 3500); }

// ---------- Avatar ----------
const DEF = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1a2a38"/><circle cx="32" cy="24" r="11" fill="#7b94a7"/><path d="M10 60c2-16 12-22 22-22s20 6 22 22z" fill="#7b94a7"/></svg>');
const PRESETS = [["🦊","#3a5a7a"],["🐻","#4a5d4a"],["🐼","#55607a"],["🐸","#2f6b5a"],["🦉","#5b4a7a"],["🐙","#7a4a5e"],["🐱","#6b5a3a"],["🐰","#3d6a7a"],["🦌","#5a4a3a"],["🐧","#2f4f6b"]];
const preset = ([e, c]) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${c}"/><text x="32" y="34" font-size="34" text-anchor="middle" dominant-baseline="central">${e}</text></svg>`);
const randPreset = () => preset(PRESETS[Math.floor(Math.random() * PRESETS.length)]);

function picker(root, st) {
  root.innerHTML = '<img class="avatar big" alt="Foto profil"><div class="pgrid"></div><label class="btn ghost">Upload foto<input type="file" accept="image/*" hidden></label>';
  const pv = root.querySelector(".avatar"), grid = root.querySelector(".pgrid"), file = root.querySelector("input");
  const draw = () => { pv.src = st.avatar || DEF; grid.querySelectorAll("button").forEach(b => b.classList.toggle("sel", b.dataset.src === st.avatar)); };
  PRESETS.forEach(p => {
    const src = preset(p), b = document.createElement("button"), im = document.createElement("img");
    b.type = "button"; b.dataset.src = src; b.setAttribute("aria-label", "Avatar bawaan " + p[0]); im.src = src; im.alt = "";
    b.append(im); b.onclick = () => { st.avatar = src; draw(); }; grid.append(b);
  });
  file.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(), u = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 96;
      const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 96, 96);
      st.avatar = c.toDataURL("image/jpeg", .7); URL.revokeObjectURL(u); draw();
    };
    img.onerror = () => toast("File gambar tidak bisa dibaca.");
    img.src = u; file.value = "";
  };
  draw(); return draw;
}

// ---------- Profil ----------
let profile = null;
try { profile = JSON.parse(localStorage.getItem("afk_profile") || "null"); } catch {}
if (!profile) { try { const o = JSON.parse(localStorage.getItem("afk_me") || "null"); if (o && o.name) { profile = { uid: rand(12), name: o.name, avatar: o.avatar || randPreset() }; localStorage.setItem("afk_profile", JSON.stringify(profile)); } } catch {} }
const saveProfile = () => localStorage.setItem("afk_profile", JSON.stringify(profile));
const me = { id: rand(8), uid: "", name: "", avatar: "" };
const oldSid = sessionStorage.getItem("afk_sid"); sessionStorage.setItem("afk_sid", me.id);
const syncMe = () => { me.uid = profile.uid; me.name = profile.name; me.avatar = profile.avatar; };

const loginSt = { avatar: randPreset() }, drawLogin = picker($("pk-login"), loginSt);
const setSt = { avatar: "" }, drawSet = picker($("pk-set"), setSt);

$("enter").onclick = () => {
  const n = $("name").value.trim();
  if (!n) { $("err").textContent = "Isi nama dulu."; return; }
  profile = { uid: rand(12), name: n, avatar: loginSt.avatar || randPreset() }; saveProfile(); syncMe();
  const nx = sessionStorage.getItem("afk_next"); sessionStorage.removeItem("afk_next");
  go(nx || "/beranda", true);
};
$("name").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) $("enter").click(); });
$("ssave").onclick = () => {
  const n = $("sname").value.trim();
  if (!n) { $("serr").textContent = "Nama tidak boleh kosong."; return; }
  profile.name = n; profile.avatar = setSt.avatar || randPreset(); saveProfile(); syncMe();
  toast("Profil disimpan"); go("/beranda");
};
$("slogout").onclick = () => {
  if (!confirm("Keluar dari akun? Nama dan foto di perangkat ini akan dihapus.")) return;
  localStorage.removeItem("afk_profile"); localStorage.removeItem("afk_me"); profile = null; go("/", true);
};

// ---------- Router ----------
const path = () => location.pathname.replace(/\/+$/, "") || "/";
function go(p, replace) { history[replace ? "replaceState" : "pushState"]({}, "", p); return route(); }
window.addEventListener("popstate", route);
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-link]");
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); go(a.getAttribute("href")); }
});
function showScreen(n) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === n));
  $("nav").classList.toggle("hide", !profile || !["lobby", "settings"].includes(n));
  if (profile) { $("nav-av").src = profile.avatar || DEF; $("nav-name").textContent = profile.name; }
  window.scrollTo(0, 0);
}
let routeTk = 0;
async function route() {
  const tk = ++routeTk, p = path(), m = p.match(/^\/beranda\/join\/room\/([A-Za-z0-9]+)$/), roomId = m ? m[1].toUpperCase() : null;
  if (rid && rid !== roomId) { await leave(); if (tk !== routeTk) return; }
  if (!roomId && unRooms && p !== "/beranda") { unRooms(); unRooms = null; }
  if (!profile) {
    if (p !== "/") { sessionStorage.setItem("afk_next", p); history.replaceState({}, "", "/"); }
    showScreen("login"); return;
  }
  syncMe();
  if (roomId) return enterRoom(roomId);
  if (p === "/profile/settings") { setSt.avatar = profile.avatar; $("sname").value = profile.name; $("serr").textContent = ""; drawSet(); showScreen("settings"); return; }
  if (p === "/beranda") { showScreen("lobby"); watchRooms(); return; }
  return go("/beranda", true);
}

// ---------- Lobby ----------
let unRooms = null;
async function purge(id) {
  for (const sub of ["messages", "signals"]) {
    const s = await getDocs(collection(db, "rooms", id, sub));
    let b = writeBatch(db), n = 0;
    for (const d of s.docs) { b.delete(d.ref); if (++n % 400 === 0) { await b.commit(); b = writeBatch(db); } }
    await b.commit();
  }
}
const removeRoom = id => deleteDoc(doc(db, "rooms", id)).then(() => purge(id)).catch(() => {});
function roomCard(id, r, live) {
  const el = document.createElement("div"); el.className = "room";
  const t = document.createElement("b"); t.textContent = r.name;
  const st = document.createElement("div"); st.className = "stack";
  live.forEach(m => { const i = document.createElement("img"); i.src = m.avatar || DEF; i.alt = ""; st.append(i); });
  const nm = document.createElement("small"); nm.className = "mute"; nm.textContent = `${live.length}/${MAX}: ` + live.map(m => m.name).join(", ");
  const b = document.createElement("button"), full = live.length >= MAX;
  b.type = "button"; b.textContent = full ? "Penuh" : "Gabung"; b.disabled = full; b.onclick = () => go("/beranda/join/room/" + id);
  el.append(t, st, nm, b); return el;
}
function watchRooms() {
  if (unRooms) return;
  unRooms = onSnapshot(query(collection(db, "rooms"), where("public", "==", true)), snap => {
    const box = $("rooms"); box.innerHTML = ""; let n = 0;
    snap.forEach(d => {
      const r = d.data(), live = Object.values(r.members || {}).filter(fresh);
      if (!live.length) { if (Date.now() - tm(r.lastSeen) > EMPTY_GC) removeRoom(d.id); return; }
      n++; box.append(roomCard(d.id, r, live));
    });
    if (!n) box.innerHTML = '<div class="empty">Belum ada room publik. Buat satu dan nyalakan apinya.</div>';
  }, e => { $("lerr").textContent = "Gagal memuat room: " + e.message; });
}
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
    const data = { name, public: pub, owner: me.uid, created: serverTimestamp(), lastSeen: serverTimestamp(), members: {} };
    if (!pub) { data.pin = await hashPin(pin, id); sessionStorage.setItem("afk_ok_" + id, "1"); }
    await setDoc(doc(db, "rooms", id), data);
    $("lerr").textContent = ""; $("rname").value = ""; $("rpin").value = ""; go("/beranda/join/room/" + id);
  } catch (e) { $("lerr").textContent = "Gagal membuat room: " + e.message; }
};
$("jbtn").onclick = async () => {
  const id = $("jid").value.trim().toUpperCase(), pin = $("jpin").value.trim();
  try {
    const s = await getDoc(doc(db, "rooms", id)), d = s.exists() && s.data();
    if (!d || (!d.public && d.pin !== await hashPin(pin, id))) { $("lerr").textContent = "Room ID atau kode salah."; return; }
    if (!d.public) sessionStorage.setItem("afk_ok_" + id, "1");
    $("lerr").textContent = ""; $("jpin").value = ""; go("/beranda/join/room/" + id);
  } catch (e) { $("lerr").textContent = "Gagal bergabung: " + e.message; }
};
function askPin(id, d) {
  return new Promise(res => {
    const dlg = $("pinDlg"); $("pinIn").value = ""; $("pinErr").textContent = ""; let done = false;
    const end = v => { if (done) return; done = true; if (dlg.open) dlg.close(); res(v); };
    $("pinForm").onsubmit = async e => {
      e.preventDefault();
      try {
        if (await hashPin($("pinIn").value.trim(), id) === d.pin) { sessionStorage.setItem("afk_ok_" + id, "1"); end(true); }
        else $("pinErr").textContent = "Kode salah.";
      } catch { $("pinErr").textContent = "Browser tidak mendukung (butuh https)."; }
    };
    $("pinCancel").onclick = () => end(false);
    dlg.oncancel = () => end(false);
    dlg.showModal(); $("pinIn").focus();
  });
}

// ---------- Room ----------
let joining = false, seen = new Set(), info = {}, rid = null, rref = null, localStream = null, peers = {}, unsubs = [], tick = null, init = false, ac = null, meters = {}, raf = 0, muted = false, lastMembers = null, prevNames = null, lastSig = "";
const rcfg = { iceServers: ICE_SERVERS, iceCandidatePoolSize: 2 };
let sigQ = Promise.resolve(), sigN = 0, early = {};

async function enterRoom(id) {
  if (rid === id || joining) return;
  showScreen("loading");
  let d;
  try { const s = await getDoc(doc(db, "rooms", id)); d = s.exists() && s.data(); }
  catch (e) { toast("Gagal memuat room: " + e.message); return go("/beranda", true); }
  if (!d) { toast("Room tidak ditemukan atau sudah dihapus."); return go("/beranda", true); }
  if (!Object.values(d.members || {}).some(fresh) && Date.now() - tm(d.lastSeen) > EMPTY_GC) { removeRoom(id); toast("Room sudah tidak aktif dan dihapus."); return go("/beranda", true); }
  if (!d.public && !sessionStorage.getItem("afk_ok_" + id) && !(await askPin(id, d))) return go("/beranda", true);
  joining = true;
  try { await _join(id); } catch (e) { toast(e.message); go("/beranda", true); } finally { joining = false; }
}

async function _join(id) {
  const ref = doc(db, "rooms", id); let data;
  await runTransaction(db, async tx => {
    const s = await tx.get(ref);
    if (!s.exists()) throw new Error("Room sudah tidak ada.");
    data = s.data();
    const n = Object.entries(data.members || {}).filter(([k, m]) => k !== me.id && k !== oldSid && fresh(m)).length;
    if (n >= MAX) throw new Error("Room penuh (maks 4 orang).");
    const up = { [`members.${me.id}`]: { name: me.name, avatar: me.avatar, t: serverTimestamp(), muted: false }, lastSeen: serverTimestamp() };
    if (oldSid && oldSid !== me.id) up[`members.${oldSid}`] = deleteField();
    tx.update(ref, up);
  });
  rid = id; rref = ref; init = false; seen.clear(); prevNames = null; lastSig = ""; lastMembers = null;
  $("rt").textContent = data.name; $("rmeta").textContent = (data.public ? "Room publik" : "Room privat") + ", ID " + id;
  $("msgs").innerHTML = ""; sys("Kamu bergabung ke room"); showScreen("room");

  try { localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); } catch { localStream = null; }
  if (rid !== id) { localStream?.getTracks().forEach(t => t.stop()); localStream = null; return; }
  micUI(); updateDoc(rref, { [`members.${me.id}.muted`]: !localStream }).catch(() => {});
  ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.();
  if (localStream) addMeter(me.id, localStream);

  unsubs.push(onSnapshot(rref, snap => {
    if (!snap.exists()) { if (rid) { toast("Room sudah ditutup."); go("/beranda", true); } return; }
    lastMembers = snap.data().members || {}; procRoom();
  }));
  unsubs.push(onSnapshot(query(collection(db, "rooms", id, "messages"), orderBy("t"), limit(100)), snap => {
    snap.docChanges().forEach(c => {
      if (c.type === "added") addMsg(c.doc.id, c.doc.data());
      else if (c.type === "removed") { seen.delete(c.doc.id); document.querySelector(`.m[data-id="${c.doc.id}"]`)?.remove(); }
    });
  }));
  unsubs.push(onSnapshot(query(collection(db, "rooms", id, "signals"), where("to", "==", me.id)), snap => {
    const got = [];
    snap.docChanges().forEach(c => { if (c.type !== "added") return; got.push(c.doc.data()); deleteDoc(c.doc.ref).catch(() => {}); });
    got.sort((a, b) => (a.n || 0) - (b.n || 0));
    got.forEach(s => { sigQ = sigQ.then(() => onSig(s)).catch(() => {}); });
  }));
  let n = 0; tick = setInterval(() => { if (++n % 3 === 0) heartbeat(); procRoom(); }, 5000);
  raf = requestAnimationFrame(loop);
}
const heartbeat = () => rref && rid && updateDoc(rref, { [`members.${me.id}.t`]: serverTimestamp(), lastSeen: serverTimestamp() }).catch(() => {});

function procRoom() {
  if (!rid || !lastMembers) return;
  const ms = Object.entries(lastMembers).filter(([k, m]) => k === me.id || fresh(m));
  ms.forEach(([k, m]) => {
    if (info[k]?.avatar !== m.avatar) document.querySelectorAll(`.m[data-uid="${k}"] img`).forEach(i => i.src = m.avatar || DEF);
    info[k] = { name: m.name, avatar: m.avatar };
  });
  const sig = ms.map(([k, m]) => k + m.name + m.muted + (m.avatar || "").length).join("|");
  if (sig !== lastSig) { lastSig = sig; renderSeats(ms); }
  const cur = Object.fromEntries(ms.map(([k, m]) => [k, m.name]));
  if (prevNames) {
    for (const k in cur) if (!(k in prevNames) && k !== me.id) sys(`${cur[k]} bergabung ke room`);
    for (const k in prevNames) if (!(k in cur)) sys(`${prevNames[k]} keluar dari room`);
  }
  prevNames = cur;
  const ids = ms.map(([k]) => k).filter(k => k !== me.id);
  ids.forEach(k => { if (!peers[k] && me.id < k) call(k); });
  Object.keys(peers).forEach(k => { if (!ids.includes(k)) closePeer(k); });
}

function renderSeats(ms) {
  const ring = $("ring"); ring.querySelectorAll(".seat").forEach(e => e.remove());
  const n = ms.length;
  ms.forEach(([k, m], i) => {
    const a = (Math.PI * 2 * i) / Math.max(n, 1) - Math.PI / 2;
    const d = document.createElement("div"); d.className = "seat"; d.dataset.id = k;
    d.style.left = 50 + 58 * Math.cos(a) + "%"; d.style.top = 50 + 58 * Math.sin(a) + "%";
    const im = document.createElement("img"); im.src = m.avatar || DEF; im.alt = "";
    const sp = document.createElement("span"); sp.textContent = k === me.id ? m.name + " (kamu)" : m.name;
    d.append(im, sp);
    if (m.muted) { const b = document.createElement("i"); b.className = "mb"; b.innerHTML = MICOFF; d.append(b); }
    ring.append(d);
  });
}

async function leave() {
  if (!rid) return;
  const id = rid, ref = rref; rid = null;
  clearInterval(tick); cancelAnimationFrame(raf);
  unsubs.forEach(u => u()); unsubs = [];
  Object.keys(peers).forEach(closePeer);
  localStream?.getTracks().forEach(t => t.stop()); localStream = null;
  try { ac?.close(); } catch {}
  ac = null; meters = {}; early = {}; muted = false; ps = []; em = []; lastMembers = null; prevNames = null; $("unlock").hidden = true;
  try {
    const res = await runTransaction(db, async tx => {
      const s = await tx.get(ref); if (!s.exists()) return "gone";
      const others = Object.entries(s.data().members || {}).filter(([k, m]) => k !== me.id && fresh(m));
      if (!others.length) { tx.delete(ref); return "del"; }
      tx.update(ref, { [`members.${me.id}`]: deleteField(), lastSeen: serverTimestamp() });
      return "ok";
    });
    if (res === "del") purge(id).catch(() => {});
  } catch {}
}
$("leave").onclick = () => go("/beranda");
$("copy").onclick = () => { if (rid) navigator.clipboard?.writeText(location.origin + "/beranda/join/room/" + rid).then(() => toast("Link room tersalin")); };
window.addEventListener("pagehide", () => { if (rid && rref) updateDoc(rref, { [`members.${me.id}`]: deleteField(), lastSeen: serverTimestamp() }).catch(() => {}); });
window.addEventListener("pageshow", e => { if (e.persisted) location.reload(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && rid) { heartbeat(); ac?.resume?.(); } });

// ---------- WebRTC ----------
function mk(id) {
  const pc = new RTCPeerConnection(rcfg), p = { pc, pending: [], tries: 0, rt: 0 };
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  else pc.addTransceiver("audio", { direction: "recvonly" });
  pc.onicecandidate = e => e.candidate && sig(id, "ice", e.candidate.toJSON());
  pc.ontrack = e => {
    let a = document.getElementById("a-" + id);
    if (!a) { a = document.createElement("audio"); a.id = "a-" + id; a.autoplay = true; a.setAttribute("playsinline", ""); $("audios").append(a); }
    const st = e.streams[0] || new MediaStream([e.track]);
    a.srcObject = st; voiceStat(); a.play().catch(() => { $("unlock").hidden = false; });
    if (ac && !meters[id]) addMeter(id, st);
  };
  pc.onconnectionstatechange = () => {
    const s = pc.connectionState; voiceStat();
    if (s === "connected") {
      p.tries = 0;
      pc.getSenders().forEach(x => { if (x.track?.kind !== "audio") return; const pr = x.getParameters(); pr.encodings = pr.encodings?.length ? pr.encodings : [{}]; pr.encodings[0].maxBitrate = 48000; x.setParameters(pr).catch(() => {}); });
    }
    if ((s === "failed" || s === "disconnected") && me.id < id) {
      clearTimeout(p.rt);
      p.rt = setTimeout(() => {
        if (peers[id] !== p || pc.connectionState === "connected" || !rid || p.tries >= 3) return;
        const t = p.tries + 1; closePeer(id); call(id); if (peers[id]) peers[id].tries = t;
      }, s === "failed" ? 300 : 5000);
    }
  };
  return (peers[id] = p);
}
async function call(id) {
  const p = peers[id] || mk(id);
  try { await p.pc.setLocalDescription(); sig(id, "offer", p.pc.localDescription.toJSON()); } catch (e) { console.warn("call", e); }
}
function sig(to, type, data) {
  if (!rid) return;
  addDoc(collection(db, "rooms", rid, "signals"), { from: me.id, to, type, data: JSON.stringify(data), n: ++sigN }).catch(() => {});
}
async function onSig(s) {
  if (!rid) return;
  let p = peers[s.from];
  if (p && s.type === "offer" && ["failed", "closed"].includes(p.pc.connectionState)) { closePeer(s.from); p = null; }
  if (!p) {
    if (s.type === "ice") { (early[s.from] = early[s.from] || []).push(JSON.parse(s.data)); return; }
    if (s.type !== "offer") return;
    p = mk(s.from); p.pending.push(...(early[s.from] || [])); delete early[s.from];
  }
  const pc = p.pc, data = JSON.parse(s.data);
  try {
    if (s.type === "offer") {
      if (pc.signalingState !== "stable" && me.id < s.from) return;
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
  const p = peers[id]; if (p) { clearTimeout(p.rt); p.pc.onconnectionstatechange = null; p.pc.close(); }
  delete peers[id]; delete meters[id]; delete early[id]; document.getElementById("a-" + id)?.remove(); voiceStat();
}
$("unlock").onclick = () => { ac?.resume?.(); document.querySelectorAll("#audios audio").forEach(a => a.play().catch(() => {})); $("unlock").hidden = true; };
document.addEventListener("pointerdown", () => { if (rid) { ac?.resume?.(); document.querySelectorAll("#audios audio").forEach(a => { if (a.paused) a.play().catch(() => {}); }); } }, { passive: true });

// ---------- Indikator bicara & mic ----------
function addMeter(id, stream) {
  try { const an = ac.createAnalyser(); an.fftSize = 256; ac.createMediaStreamSource(stream).connect(an); meters[id] = { an, buf: new Uint8Array(an.frequencyBinCount) }; } catch {}
}
function micUI() {
  const off = muted || !localStream, btn = $("mute");
  btn.innerHTML = off ? MICOFF : MIC; btn.classList.toggle("off", off);
  const t = !localStream ? "Mic tidak tersedia" : muted ? "Nyalakan mic" : "Matikan mic";
  btn.setAttribute("aria-label", t); btn.title = t;
  voiceStat();
}
function voiceStat() {
  if (!rid) return;
  const ids = Object.keys(peers), ok = ids.filter(k => peers[k].pc.connectionState === "connected").length;
  const mic = !localStream ? "Mic tidak tersedia, kamu hanya mendengar" : muted ? "Mic mati" : "Mic menyala";
  $("vstat").textContent = mic + (ids.length ? `, suara tersambung ${ok}/${ids.length}` : "");
}
$("mute").onclick = () => {
  if (!localStream) return;
  muted = !muted; localStream.getAudioTracks().forEach(t => t.enabled = !muted);
  micUI(); ac?.resume?.();
  updateDoc(rref, { [`members.${me.id}.muted`]: muted }).catch(() => {});
};

// ---------- Chat ----------
function sys(t) { const e = document.createElement("div"); e.className = "sys"; e.textContent = t; const b = $("msgs"); b.append(e); b.scrollTop = b.scrollHeight; }
function addMsg(id, m) {
  if (seen.has(id)) return; seen.add(id);
  const el = document.createElement("div"); el.className = "m"; el.dataset.id = id; el.dataset.uid = m.uid;
  const im = document.createElement("img"); im.src = info[m.uid]?.avatar || DEF; im.alt = "";
  const w = document.createElement("div"), h = document.createElement("div"); h.className = "mh";
  const b = document.createElement("b"); b.textContent = m.name; h.append(b);
  if (m.uid === me.id) {
    const d = document.createElement("button"); d.className = "ghost del"; d.type = "button"; d.textContent = "Hapus";
    d.onclick = () => deleteDoc(doc(db, "rooms", rid, "messages", id)).catch(e => toast("Gagal menghapus: " + e.message));
    h.append(d);
  }
  const p = document.createElement("p"); p.textContent = m.text;
  w.append(h, p); el.append(im, w);
  const box = $("msgs"); box.append(el); box.scrollTop = box.scrollHeight;
}
function sendMsg() {
  const t = $("cm").value.trim(); if (!t || !rid) return; $("cm").value = "";
  addDoc(collection(db, "rooms", rid, "messages"), { uid: me.id, name: me.name, text: t.slice(0, 300), t: serverTimestamp() }).catch(e => toast("Pesan gagal: " + e.message));
}
$("send").onclick = sendMsg;
$("cm").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendMsg(); } });

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

route();
