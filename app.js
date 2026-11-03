import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { firebaseConfig, ICE_SERVERS, TURN_API_URL } from "./firebase-config.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, where, runTransaction, writeBatch, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const db = getFirestore(initializeApp(firebaseConfig));
const $ = id => document.getElementById(id);
const MAX = 4, STALE = 120000, EMPTY_GC = 180000;
const SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3';
const MIC = SV + '"/></svg>', MICOFF = SV + 'M4 4l16 16"/></svg>';
const CROWN = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 19h18v2H3zM3 7l5 4 4-6 4 6 5-4-2 10H5z"/></svg>';
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
  for (const sub of ["messages", "signals", "meta"]) {
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
  $("rooms").innerHTML = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  unRooms = onSnapshot(query(collection(db, "rooms"), where("public", "==", true)), snap => {
    const box = $("rooms"); box.innerHTML = ""; let n = 0;
    snap.forEach(d => {
      const r = d.data(), live = Object.values(r.members || {}).filter(fresh);
      if (!live.length) { if (Date.now() - tm(r.lastSeen) > EMPTY_GC) removeRoom(d.id); return; }
      const c = roomCard(d.id, r, live); c.style.setProperty("--i", n++); box.append(c);
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
async function busy(b, fn) {
  if (b.disabled) return;
  b.disabled = true; b.classList.add("busy");
  try { await fn(); } finally { b.disabled = false; b.classList.remove("busy"); }
}
$("mk").onclick = () => busy($("mk"), async () => {
  const pub = vis() === "pub", pin = $("rpin").value.trim();
  if (!pub && !/^\d{4,6}$/.test(pin)) { $("lerr").textContent = "Kode privat harus 4 sampai 6 angka."; return; }
  const id = genId(), name = $("rname").value.trim() || `Api unggun ${me.name}`;
  try {
    const data = { name, public: pub, owner: me.uid, created: serverTimestamp(), lastSeen: serverTimestamp(), members: {} };
    if (!pub) { data.pin = await hashPin(pin, id); sessionStorage.setItem("afk_ok_" + id, "1"); }
    await setDoc(doc(db, "rooms", id), data);
    $("lerr").textContent = ""; $("rname").value = ""; $("rpin").value = ""; go("/beranda/join/room/" + id);
  } catch (e) { $("lerr").textContent = "Gagal membuat room: " + e.message; }
});
$("jbtn").onclick = () => busy($("jbtn"), async () => {
  const id = $("jid").value.trim().toUpperCase(), pin = $("jpin").value.trim();
  try {
    const s = await getDoc(doc(db, "rooms", id)), d = s.exists() && s.data();
    if (!d || (!d.public && d.pin !== await hashPin(pin, id))) { $("lerr").textContent = "Room ID atau kode salah."; return; }
    if (!d.public) sessionStorage.setItem("afk_ok_" + id, "1");
    $("lerr").textContent = ""; $("jpin").value = ""; go("/beranda/join/room/" + id);
  } catch (e) { $("lerr").textContent = "Gagal bergabung: " + e.message; }
});
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
let joining = false, seen = new Set(), info = {}, rid = null, rref = null, localStream = null, peers = {}, unsubs = [], tick = null, ac = null, meters = {}, raf = 0, muted = false, lastMembers = null, prevNames = null, lastSig = "", curMs = [];
const rcfg = { iceServers: ICE_SERVERS, iceCandidatePoolSize: 2 };
let sigQ = Promise.resolve(), sigN = 0, early = {};
let shown = new Set(), vstate = null, isHost = false, isCtl = false, canKick = false, hostSid = null, roomOwner = "", roomPub = true, vPoll = null, suppress = 0, lastT = 0, lastTs = 0, lastState = "", lastPubT = 0, gotVideo = false, perms = {}, kicks = {}, joinedAt = 0;
const mref = (id, n) => doc(db, "rooms", id, "meta", n);
const mkEl = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

async function enterRoom(id) {
  if (rid === id || joining) return;
  showScreen("loading");
  let d, kd = {};
  try {
    const s = await getDoc(doc(db, "rooms", id)); d = s.exists() && s.data();
    if (d) { const k = await getDoc(mref(id, "kicks")); kd = k.exists() ? (k.data().k || {}) : {}; }
  } catch (e) { toast("Gagal memuat room: " + e.message); return go("/beranda", true); }
  if (!d) { toast("Room tidak ditemukan atau sudah dihapus."); return go("/beranda", true); }
  if (kd[me.uid] && Date.now() - tm(kd[me.uid]) < 600000) { toast("Kamu dikeluarkan dari room ini. Coba lagi beberapa menit lagi."); return go("/beranda", true); }
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
    const up = { [`members.${me.id}`]: { name: me.name, avatar: me.avatar, t: serverTimestamp(), muted: false, uid: me.uid, j: Date.now() }, lastSeen: serverTimestamp() };
    if (oldSid && oldSid !== me.id) up[`members.${oldSid}`] = deleteField();
    tx.update(ref, up);
  });
  rid = id; rref = ref; seen.clear(); prevNames = null; lastSig = ""; lastMembers = null; curMs = [];
  roomOwner = data.owner || ""; roomPub = !!data.public; vstate = null; gotVideo = false; shown.clear();
  isHost = false; isCtl = false; canKick = false; hostSid = null; perms = {}; kicks = {}; joinedAt = Date.now();
  $("rt").textContent = data.name; $("rmeta").textContent = (data.public ? "Room publik" : "Room privat") + ", ID " + id;
  $("msgs").innerHTML = ""; closeSide(); setUnread(0); msgReady = false; resetPanes();
  sys("Kamu bergabung ke room"); showScreen("room");

  await loadIce();
  try { localStream = await getMic(); } catch { localStream = null; }
  if (rid !== id) { localStream?.getTracks().forEach(t => t.stop()); localStream = null; return; }
  micUI(); updateDoc(rref, { [`members.${me.id}.muted`]: !localStream }).catch(() => {});
  ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.();
  if (localStream) addMeter(me.id, localStream);

  unsubs.push(onSnapshot(rref, snap => {
    if (!snap.exists()) { if (rid) { toast("Room sudah ditutup."); go("/beranda", true); } return; }
    lastMembers = snap.data().members || {}; procRoom();
  }));
  unsubs.push(onSnapshot(query(collection(db, "rooms", id, "messages"), orderBy("t"), limit(100)), snap => {
    const first = !msgReady; setTimeout(() => { msgReady = true; }, 0);
    snap.docChanges().forEach(c => {
      if (c.type === "added") {
        const d = c.doc.data(), isNew = !seen.has(c.doc.id);
        addMsg(c.doc.id, d);
        if (!first && isNew && d.uid !== me.id && Date.now() - tm(d.t) < 60000) notifyMsg(d);
      } else if (c.type === "removed") { seen.delete(c.doc.id); document.querySelector(`.m[data-id="${c.doc.id}"]`)?.remove(); }
    });
  }));
  unsubs.push(onSnapshot(query(collection(db, "rooms", id, "signals"), where("to", "==", me.id)), snap => {
    const got = [];
    snap.docChanges().forEach(c => { if (c.type !== "added") return; got.push(c.doc.data()); deleteDoc(c.doc.ref).catch(() => {}); });
    got.sort((a, b) => (a.n || 0) - (b.n || 0));
    got.forEach(s => { sigQ = sigQ.then(() => onSig(s)).catch(() => {}); });
  }));
  unsubs.push(onSnapshot(mref(id, "video"), onVideoSnap));
  unsubs.push(onSnapshot(mref(id, "perms"), s => { perms = s.exists() ? s.data() : {}; updPerms(); }));
  unsubs.push(onSnapshot(mref(id, "kicks"), s => {
    kicks = s.exists() ? (s.data().k || {}) : {};
    const t = kicks[me.uid];
    if (t && !s.metadata.hasPendingWrites && tm(t) > joinedAt - 3000) kickedOut();
  }));
  unsubs.push(onSnapshot(mref(id, "game"), onGame));
  unsubs.push(onSnapshot(mref(id, "poll"), onPoll));
  vPoll = setInterval(videoTick, 500);
  let n = 0; tick = setInterval(() => { if (++n % 3 === 0) heartbeat(); procRoom(); autoRetry(); }, 5000);
  raf = requestAnimationFrame(loop);
}
const heartbeat = () => rref && rid && updateDoc(rref, { [`members.${me.id}.t`]: serverTimestamp(), lastSeen: serverTimestamp() }).catch(() => {});

function procRoom() {
  if (!rid || !lastMembers) return;
  const ms = Object.entries(lastMembers).filter(([k, m]) => k === me.id || fresh(m));
  curMs = ms;
  ms.forEach(([k, m]) => {
    if (info[k]?.avatar !== m.avatar) document.querySelectorAll(`.m[data-uid="${k}"] img`).forEach(i => i.src = m.avatar || DEF);
    info[k] = { name: m.name, avatar: m.avatar };
  });
  const om = ms.find(([, m]) => m.uid && m.uid === roomOwner);
  const hs = om ? om[0] : ([...ms].sort((a, b) => (a[1].j || 0) - (b[1].j || 0))[0] || [null])[0], wasHost = isHost;
  hostSid = hs; isHost = hs === me.id;
  const sig = ms.map(([k, m]) => k + m.name + m.muted + (m.avatar || "").length).join("|") + "#" + hs;
  if (sig !== lastSig) { lastSig = sig; renderSeats(ms); renderUsers(); }
  if (wasHost !== isHost) updPerms();
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
  const ring = $("ring"), strip = $("strip");
  ring.querySelectorAll(".seat").forEach(e => e.remove()); strip.innerHTML = "";
  const n = ms.length;
  ms.forEach(([k, m], i) => {
    const a = (Math.PI * 2 * i) / Math.max(n, 1) + Math.PI / 2, isNew = !shown.has(k); shown.add(k);
    const d = mkEl("div", "seat" + (isNew ? " in" : "")); d.dataset.pid = k;
    d.style.left = 50 + 60 * Math.cos(a) + "%"; d.style.top = 50 + 60 * Math.sin(a) + "%";
    const lg = mkEl("div", "slog"); lg.style.setProperty("--rot", (a * 180 / Math.PI + 90).toFixed(1) + "deg");
    const im = document.createElement("img"); im.src = m.avatar || DEF; im.alt = "";
    const sp = mkEl("span", "", k === me.id ? m.name + " (kamu)" : m.name);
    d.append(lg, im, sp);
    if (m.muted) { const b = mkEl("i", "mb"); b.innerHTML = MICOFF; d.append(b); }
    if (k === hostSid) { const b = mkEl("i", "hb"); b.title = "Host"; b.innerHTML = CROWN; d.append(b); }
    ring.append(d);
    const c = mkEl("div", "chip"); c.dataset.pid = k;
    const ci = document.createElement("img"); ci.src = m.avatar || DEF; ci.alt = "";
    c.append(ci, mkEl("span", "", (k === hostSid ? "★ " : "") + m.name));
    if (m.muted) { const b = mkEl("i", "mb"); b.innerHTML = MICOFF; c.append(b); }
    strip.append(c);
  });
}

async function leave() {
  if (!rid) return;
  const id = rid, ref = rref; rid = null;
  clearInterval(tick); clearInterval(vPoll); cancelAnimationFrame(raf);
  unsubs.forEach(u => u()); unsubs = [];
  destroyPlayer(); vstate = null; isHost = false; isCtl = false; canKick = false; hostSid = null; perms = {}; kicks = {}; shown.clear();
  Object.keys(rc).forEach(k => delete rc[k]); stopGame(); closeSide(); setUnread(0);
  $("stage").classList.remove("wv"); $("vbox").hidden = true; $("strip").innerHTML = "";
  Object.keys(peers).forEach(closePeer);
  localStream?.getTracks().forEach(t => t.stop()); localStream = null;
  try { ac?.close(); } catch {}
  ac = null; meters = {}; early = {}; muted = false; ps = []; em = []; lastMembers = null; prevNames = null; curMs = []; $("unlock").hidden = true;
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
window.addEventListener("pagehide", () => { if (rid && rref) updateDoc(rref, { [`members.${me.id}`]: deleteField(), lastSeen: serverTimestamp() }).catch(() => {}); });
window.addEventListener("pageshow", e => { if (e.persisted) location.reload(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && rid) { heartbeat(); ac?.resume?.(); } });

// ---------- WebRTC ----------
const getMic = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
let iceReady = null, hintShown = false;
const rc = {};
function loadIce() {
  if (!iceReady) iceReady = (async () => {
    if (!TURN_API_URL) return;
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 4000);
      const a = await (await fetch(TURN_API_URL, { signal: c.signal })).json();
      if (Array.isArray(a)) rcfg.iceServers = [...ICE_SERVERS, ...a];
    } catch {}
  })();
  return iceReady;
}
const others = () => Object.entries(lastMembers || {}).filter(([k, m]) => k !== me.id && fresh(m)).map(([k]) => k);
function mk(id, g) {
  const pc = new RTCPeerConnection(rcfg), p = { pc, g, pending: [], rt: 0, t0: Date.now() };
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  else pc.addTransceiver("audio", { direction: "recvonly" });
  pc.onicecandidate = e => e.candidate && sig(id, "ice", e.candidate.toJSON(), g);
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
      rc[id] = 0;
      pc.getSenders().forEach(x => { if (x.track?.kind !== "audio") return; const pr = x.getParameters(); pr.encodings = pr.encodings?.length ? pr.encodings : [{}]; pr.encodings[0].maxBitrate = 48000; x.setParameters(pr).catch(() => {}); });
    }
    if (s === "failed" || s === "disconnected") {
      clearTimeout(p.rt);
      p.rt = setTimeout(() => {
        if (peers[id] !== p || pc.connectionState === "connected" || !rid) return;
        if ((rc[id] || 0) >= 3) { if (!hintShown) { hintShown = true; toast("Suara belum tersambung. Jaringan tertentu butuh server TURN (lihat README)."); } return; }
        rc[id] = (rc[id] || 0) + 1;
        if (me.id < id) { closePeer(id); call(id); } else sig(id, "redo", {});
      }, s === "failed" ? 300 : 5000);
    }
  };
  return (peers[id] = p);
}
async function call(id) {
  if (peers[id] || !rid) return;
  const p = mk(id, rand(6));
  try { await p.pc.setLocalDescription(); sig(id, "offer", p.pc.localDescription.toJSON(), p.g); } catch (e) { console.warn("call", e); }
}
function sig(to, type, data, g) {
  if (!rid) return;
  addDoc(collection(db, "rooms", rid, "signals"), { from: me.id, to, type, g: g || "", data: JSON.stringify(data), n: ++sigN }).catch(() => {});
}
async function onSig(s) {
  if (!rid) return;
  if (s.type === "redo") { if (me.id < s.from && others().includes(s.from)) { closePeer(s.from); call(s.from); } return; }
  let p = peers[s.from];
  if (s.type === "ice") {
    if (!p || p.g !== s.g) { (early[s.from] = early[s.from] || []).push({ g: s.g, d: JSON.parse(s.data) }); return; }
  } else if (s.type === "offer") {
    const buf = (early[s.from] || []).filter(x => x.g === s.g).map(x => x.d);
    early[s.from] = (early[s.from] || []).filter(x => x.g !== s.g);
    if (p && p.g !== s.g) { closePeer(s.from); p = null; }
    if (!p) { p = mk(s.from, s.g); p.pending.push(...buf); }
  } else if (s.type === "answer") {
    if (!p || p.g !== s.g) return;
  }
  if (!p) return;
  const pc = p.pc, data = JSON.parse(s.data);
  try {
    if (s.type === "offer") {
      await pc.setRemoteDescription(data); await pc.setLocalDescription();
      sig(s.from, "answer", pc.localDescription.toJSON(), p.g); await flush(p);
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
  delete peers[id]; delete meters[id]; document.getElementById("a-" + id)?.remove(); voiceStat();
}
function autoRetry() {
  for (const [id, p] of Object.entries(peers)) {
    if (me.id < id && p.pc.connectionState !== "connected" && Date.now() - p.t0 > 20000 && (rc[id] || 0) < 3) { rc[id] = (rc[id] || 0) + 1; closePeer(id); call(id); }
  }
}
function reconnectAll() {
  Object.keys(peers).forEach(closePeer);
  others().forEach(k => { if (me.id < k) call(k); else sig(k, "redo", {}); });
}
function unlockAudio() { ac?.resume?.(); document.querySelectorAll("#audios audio").forEach(a => a.play().catch(() => {})); $("unlock").hidden = true; }
async function enableVoice() {
  if (!rid) return;
  try { if (!ac || ac.state === "closed") ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume(); } catch {}
  if (!localStream) {
    let s;
    try { s = await getMic(); }
    catch (e) { toast(e && e.name === "NotAllowedError" ? "Izin mic ditolak. Tap ikon gembok di address bar, izinkan Mikrofon, lalu tekan tombol ini lagi." : "Mic tidak ditemukan atau sedang dipakai aplikasi lain."); return; }
    if (!rid) { s.getTracks().forEach(t => t.stop()); return; }
    localStream = s; muted = false; addMeter(me.id, s);
    updateDoc(rref, { [`members.${me.id}.muted`]: false }).catch(() => {});
  }
  micUI(); unlockAudio(); reconnectAll(); toast("Mic aktif, menyambungkan suara...");
}
$("unlock").onclick = unlockAudio;
$("venable").onclick = enableVoice;
$("vredo").onclick = () => { reconnectAll(); toast("Menyambungkan ulang suara..."); };
document.addEventListener("pointerdown", () => { if (rid) { ac?.resume?.(); document.querySelectorAll("#audios audio").forEach(a => { if (a.paused) a.play().catch(() => {}); }); } }, { passive: true });

// ---------- Nonton bareng ----------
let vp = null, vpKey = "", vpTk = 0, lastApply = 0, fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const MEDIA_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv|m3u8|mp3|m4a|wav|aac|flac)(\?|#|$)/i;
function parseSrc(u) {
  u = (u || "").trim(); if (!u) return null;
  if (/^[\w-]{11}$/.test(u)) return { kind: "yt", src: u };
  let x; try { x = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u); } catch { return null; }
  if (!/^https?:$/.test(x.protocol) || !x.hostname.includes(".")) return null;
  x.protocol = "https:";
  const h = x.hostname.replace(/^www\./, ""), p = x.pathname; let m, id = "";
  if (h === "youtu.be") id = p.slice(1).split("/")[0];
  else if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) id = x.searchParams.get("v") || ((p.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/) || [])[2] || "");
  if (/^[\w-]{11}$/.test(id)) return { kind: "yt", src: id };
  if (/(^|\.)vimeo\.com$/.test(h) && (m = p.match(/\/(\d{5,})(?:\/([a-z0-9]+))?/i))) return { kind: "vimeo", src: "https://vimeo.com/" + m[1] + (m[2] ? "/" + m[2] : "") };
  if (/(^|\.)dailymotion\.com$/.test(h) && (m = p.match(/\/video\/([a-z0-9]+)/i))) return { kind: "iframe", src: "https://www.dailymotion.com/embed/video/" + m[1] };
  if (h === "dai.ly" && p.length > 1) return { kind: "iframe", src: "https://www.dailymotion.com/embed/video/" + p.slice(1) };
  if (h === "twitch.tv") {
    if ((m = p.match(/^\/videos\/(\d+)/))) return { kind: "iframe", src: "https://player.twitch.tv/?video=v" + m[1] + "&autoplay=false" };
    if ((m = p.match(/^\/(\w+)\/?$/))) return { kind: "iframe", src: "https://player.twitch.tv/?channel=" + m[1] + "&autoplay=false" };
  }
  if (h === "drive.google.com" && (m = p.match(/\/file\/d\/([\w-]+)/))) return { kind: "iframe", src: "https://drive.google.com/file/d/" + m[1] + "/preview" };
  if (h === "archive.org" && (m = p.match(/^\/(?:details|embed)\/([^/]+)/))) return { kind: "iframe", src: "https://archive.org/embed/" + m[1] };
  if (MEDIA_EXT.test(p)) return { kind: "file", src: x.href };
  return { kind: "resolve", src: x.href };
}
function loadYT() {
  if (window.YT && YT.Player) return Promise.resolve();
  return new Promise((res, rej) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
    if (!document.getElementById("yt-api")) {
      const s = document.createElement("script"); s.id = "yt-api"; s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => rej(new Error("YouTube diblokir di browser ini.")); document.head.append(s);
    }
    setTimeout(() => rej(new Error("YouTube tidak termuat.")), 10000);
  });
}
const loadScript = (id, src) => new Promise((res, rej) => {
  const old = document.getElementById(id);
  if (old) { if (old.dataset.ok) return res(); old.addEventListener("load", () => res()); old.addEventListener("error", () => rej(new Error("Pemutar gagal dimuat."))); return; }
  const s = document.createElement("script"); s.id = id; s.src = src;
  s.onload = () => { s.dataset.ok = "1"; res(); }; s.onerror = () => rej(new Error("Pemutar gagal dimuat.")); document.head.append(s);
});
function mkYT(box, v, start, play) {
  const el = document.createElement("div"); box.append(el); let p;
  return {
    ready: loadYT().then(() => new Promise(res => { p = new YT.Player(el, { width: "100%", height: "100%", videoId: v.src, playerVars: { controls: 1, disablekb: 1, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, autoplay: play ? 1 : 0, start: Math.floor(start) }, events: { onReady: () => res() } }); })),
    play: () => p.playVideo(), pause: () => p.pauseVideo(), seek: t => p.seekTo(t, true), time: () => p.getCurrentTime(), vol: x => p.setVolume(x * 100),
    state: () => { const s = p.getPlayerState(), S = YT.PlayerState; return s === S.PLAYING ? "playing" : s === S.BUFFERING ? "buffering" : s === S.ENDED ? "ended" : "paused"; },
    destroy: () => { try { p.destroy(); } catch {} }
  };
}
function mkVimeo(box, v, start, play) {
  const el = document.createElement("div"); el.className = "vimeo"; box.append(el);
  let p, t = start, st = "paused";
  const ready = loadScript("vimeo-sdk", "https://player.vimeo.com/api/player.js").then(() => new Promise((res, rej) => {
    p = new Vimeo.Player(el, { url: v.src, autopause: false, dnt: true });
    p.on("play", () => { st = "playing"; }); p.on("pause", () => { st = "paused"; }); p.on("ended", () => { st = "ended"; });
    p.on("bufferstart", () => { st = "buffering"; }); p.on("bufferend", () => { if (st === "buffering") st = "playing"; });
    p.on("timeupdate", e => { t = e.seconds; }); p.on("seeked", e => { t = e.seconds; });
    p.ready().then(() => { p.setCurrentTime(start).catch(() => {}); if (play) p.play().catch(() => {}); res(); }).catch(() => rej(new Error("Video Vimeo ini tidak bisa diputar (privat atau dibatasi).")));
  }));
  return { ready, play: () => p.play().catch(() => { $("vgate").hidden = false; }), pause: () => p.pause().catch(() => {}), seek: x => { t = x; p.setCurrentTime(x).catch(() => {}); }, time: () => t, vol: x => p.setVolume(x).catch(() => {}), state: () => st, destroy: () => { try { p.destroy(); } catch {} } };
}
function mkFile(box, v, start, play) {
  const el = document.createElement("video"); el.controls = true; el.playsInline = true; el.setAttribute("playsinline", ""); el.preload = "auto"; box.append(el);
  let hls;
  el.addEventListener("loadedmetadata", () => { try { el.currentTime = start; } catch {} if (play) el.play().catch(() => {}); }, { once: true });
  el.onerror = () => toast("Video tidak bisa diputar dari link ini. Pakai link YouTube, Vimeo, atau file video langsung (.mp4, .webm, .m3u8).");
  const isHls = /\.m3u8(\?|#|$)/i.test(v.src) && !el.canPlayType("application/vnd.apple.mpegurl");
  const ready = isHls
    ? loadScript("hls-js", "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js").then(() => { hls = new Hls(); hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) toast("Stream HLS gagal dimuat (cek link atau CORS)."); }); hls.loadSource(v.src); hls.attachMedia(el); })
    : Promise.resolve().then(() => { el.src = v.src; });
  return { ready, play: () => el.play().catch(() => { $("vgate").hidden = false; }), pause: () => el.pause(), seek: t => { try { el.currentTime = t; } catch {} }, time: () => el.currentTime, vol: x => { el.volume = x; },
    state: () => el.ended ? "ended" : el.paused ? "paused" : el.readyState < 3 ? "buffering" : "playing",
    destroy: () => { try { el.onerror = null; hls && hls.destroy(); el.pause(); el.removeAttribute("src"); el.load(); } catch {} } };
}
function mkFrame(box, v) {
  const f = document.createElement("iframe");
  f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"; f.allowFullscreen = true;
  f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups allow-forms");
  let src = v.src; try { const u = new URL(src); if (u.hostname === "player.twitch.tv") { u.searchParams.set("parent", location.hostname); src = u.href; } } catch {}
  f.src = src; box.append(f);
  return { sync: false, ready: new Promise(res => { f.onload = () => res(); setTimeout(res, 6000); }), play() {}, pause() {}, seek() {}, time: () => 0, vol() {}, state: () => "paused", destroy: () => { try { f.src = "about:blank"; f.remove(); } catch {} } };
}
const vol = () => Number($("vvol").value) / 100;
function destroyPlayer() { vpTk++; if (vp) { try { vp.destroy(); } catch {} vp = null; } vpKey = ""; $("ytwrap").innerHTML = ""; $("vgate").hidden = true; }
const expected = v => v.playing ? v.pos + Math.max(0, Date.now() - tm(v.at)) / 1000 : v.pos;
function applyVideo() {
  const v = vstate; if (!v || !v.src || !vp || vp.sync === false) return;
  const t = expected(v), cur = vp.time() || 0, st = vp.state();
  if (v.playing) {
    if (Math.abs(cur - t) > 2) vp.seek(t);
    if (st !== "playing" && st !== "buffering") { vp.play(); gateCheck(); }
  } else {
    if (st === "playing" || st === "buffering") vp.pause();
    if (Math.abs(cur - v.pos) > .8) vp.seek(v.pos);
  }
}
function gateCheck() {
  setTimeout(() => {
    if (!vp || !vstate || !vstate.playing) return;
    const s = vp.state(); if (s !== "playing" && s !== "buffering") $("vgate").hidden = false;
  }, 2200);
}
function publish(playing, pos) {
  if (!isCtl || !vstate || !vstate.src || !vp) return;
  const v = { kind: vstate.kind, src: vstate.src, playing, pos: pos != null ? pos : (vp.time() || 0), by: me.name, hid: me.id, rev: (vstate.rev || 0) + 1 };
  vstate = { ...v, at: null }; lastPubT = Date.now();
  setDoc(doc(db, "rooms", rid, "meta", "video"), { ...v, at: serverTimestamp() }).catch(() => {});
}
function videoTick() {
  if (!vp || !vstate || !vstate.src || vp.sync === false) return;
  const now = Date.now(), st = vp.state(), cur = vp.time() || 0;
  if (st === "playing") $("vgate").hidden = true;
  if (isCtl) {
    const exp = lastT + (lastState === "playing" ? (now - lastTs) / 1000 : 0);
    if (now >= suppress && st !== "buffering") {
      if (lastState && (st === "playing") !== (lastState === "playing")) publish(st === "playing", cur);
      else if (Math.abs(cur - exp) > 1.5) publish(st === "playing", cur);
      else if (st === "playing" && now - lastPubT > 5000) publish(true, cur);
    }
    lastT = cur; lastTs = now; if (st !== "buffering") lastState = st;
  } else if (now - lastApply > 1000) { lastApply = now; applyVideo(); }
}
function onVideoSnap(snap) {
  if (snap.metadata.hasPendingWrites) return;
  const v = snap.exists() ? snap.data() : null;
  if (isCtl && v && v.hid === me.id) return;
  if (v && v.src && gotVideo && v.src !== (vstate && vstate.src)) sys(`${v.by} memasang video`);
  gotVideo = true; vstate = v && v.src ? v : null;
  if (isCtl) suppress = Date.now() + 2500;
  renderVideo();
}
function infoText(v, has) {
  if (has && v.kind === "iframe") return "Pemutar ini tidak bisa disinkronkan otomatis. Semua orang menekan play sendiri.";
  if (isHost) return has ? "Kamu host. Putar, jeda, atau geser video, semua orang ikut." : "Kamu host. Tempel link video apa saja supaya semua orang nonton bareng.";
  if (isCtl) return has ? "Kamu punya izin video. Putar, jeda, atau geser video, semua orang ikut." : "Kamu punya izin video. Tempel link video apa saja untuk nonton bareng.";
  return has ? `Diputar oleh ${v.by}. Hanya host atau yang diberi izin yang bisa play, pause, dan geser.` : "Belum ada video. Host atau yang diberi izin video bisa memasangnya.";
}
function updVideoUI() {
  const v = vstate, has = !!(v && v.src), fr = has && v.kind === "iframe";
  $("vform").hidden = !isCtl; $("vclose").hidden = !(isCtl && has); $("volbox").hidden = !has || fr; $("vblock").hidden = isCtl || fr;
  $("vfs").hidden = !(has && fsOK); $("vinfo").textContent = infoText(v, has);
}
async function renderVideo() {
  if (!rid) return;
  const v = vstate, has = !!(v && v.src);
  $("stage").classList.toggle("wv", has); $("vbox").hidden = !has; updVideoUI();
  if (!has) { destroyPlayer(); return; }
  if (!v.playing) $("vgate").hidden = true;
  const key = v.kind + "|" + v.src;
  if (key !== vpKey) {
    destroyPlayer(); vpKey = key; const tk = ++vpTk, start = expected(v), play = v.playing;
    const make = { yt: mkYT, vimeo: mkVimeo, iframe: mkFrame }[v.kind] || mkFile;
    let p;
    try { p = make($("ytwrap"), v, start, play); await p.ready; } catch (e) { toast((e && e.message) || "Video gagal dimuat."); if (tk === vpTk) { vp = null; } return; }
    if (tk !== vpTk || !rid) { p.destroy(); return; }
    vp = p; try { vp.vol(vol()); } catch {}
    if (isCtl) suppress = Date.now() + 2500;
    if (play) gateCheck();
    return;
  }
  if (vp) { if (isCtl) suppress = Date.now() + 2000; applyVideo(); }
}
async function resolveLink(u) {
  let r, d;
  try { r = await fetch("/api/resolve?url=" + encodeURIComponent(u)); d = await r.json(); }
  catch { throw new Error("Pencari video tidak tersedia. Fitur ini butuh website di-deploy di Vercel."); }
  if (!r.ok || d.error || !d.src) throw new Error(d.error || "Video tidak ditemukan di link ini.");
  return d;
}
async function setVideo() {
  const btn = $("vset"); if (btn.disabled || !isCtl) return;
  if (!$("vurl").value.trim()) { toast("Tempel link video dulu."); return; }
  let s = parseSrc($("vurl").value);
  if (!s) { toast("Link tidak valid."); return; }
  btn.disabled = true; btn.classList.add("busy");
  try {
    if (s.kind === "resolve") { toast("Mencari video di link ini..."); s = await resolveLink(s.src); }
    if (!rid || !isCtl) return;
    const v = { kind: s.kind, src: s.src, playing: false, pos: 0, by: me.name, hid: me.id, rev: ((vstate && vstate.rev) || 0) + 1 };
    vstate = { ...v, at: null }; lastT = 0; lastTs = Date.now(); lastState = ""; $("vurl").value = "";
    setDoc(mref(rid, "video"), { ...v, at: serverTimestamp() }).catch(e => toast("Gagal memasang video: " + e.message));
    renderVideo();
  } catch (e) { toast(e.message); }
  finally { btn.disabled = false; btn.classList.remove("busy"); }
}
$("vset").onclick = setVideo;
$("vurl").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); setVideo(); } });
$("vclose").onclick = () => { if (!isCtl) return; deleteDoc(mref(rid, "video")).catch(() => {}); vstate = null; renderVideo(); };
$("vgate").onclick = () => { $("vgate").hidden = true; if (vp && vstate) { vp.seek(expected(vstate)); vp.play(); } };
$("vvol").value = localStorage.getItem("afk_vol") || "100";
$("vvol").addEventListener("input", () => { localStorage.setItem("afk_vol", $("vvol").value); try { vp && vp.vol(vol()); } catch {} });
$("vfs").onclick = () => { const b = $("vbox"); (b.requestFullscreen || b.webkitRequestFullscreen || (() => {})).call(b); };

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
  $("venable").hidden = !!localStream; $("vredo").hidden = !(ids.length && ok < ids.length);
}
$("mute").onclick = () => {
  if (!localStream) return;
  muted = !muted; localStream.getAudioTracks().forEach(t => t.enabled = !muted);
  micUI(); ac?.resume?.();
  updateDoc(rref, { [`members.${me.id}.muted`]: muted }).catch(() => {});
};

// ---------- Sidebar ----------
let sideOpen = false, curTab = "chat", unread = 0, msgReady = false, peekT;
const TITLES = { chat: "Chat", users: "Pengguna", video: "Nonton bareng", game: "Minigame", poll: "Polling", link: "Tautan room" };
function showTab(t) {
  curTab = t;
  document.querySelectorAll("#tabs button").forEach(b => { const on = b.dataset.tab === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
  document.querySelectorAll(".pane").forEach(p => { p.hidden = p.dataset.pane !== t; });
  $("stitle").textContent = TITLES[t];
  if (t === "chat" && sideOpen) { setUnread(0); const m = $("msgs"); m.scrollTop = m.scrollHeight; }
}
function openSide(t) { sideOpen = true; $("rwrap").classList.add("so"); $("menu").setAttribute("aria-expanded", "true"); $("peek").hidden = true; showTab(t || curTab); }
function closeSide() { sideOpen = false; $("rwrap").classList.remove("so"); $("menu").setAttribute("aria-expanded", "false"); }
$("menu").onclick = () => { if (sideOpen) closeSide(); else openSide(); };
$("sclose").onclick = closeSide;
$("cbd").onclick = closeSide;
$("tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && sideOpen && !$("pinDlg").open) closeSide(); });
function resetPanes() { game = null; poll = null; renderGame(); renderPoll(); renderUsers(); updVideoUI(); renderLink(); showTab("chat"); }

// ---------- Chat ----------
function setUnread(n) {
  unread = n; const t = n > 99 ? "99+" : String(n);
  for (const id of ["badge", "tbadge"]) { const b = $(id); b.textContent = t; b.hidden = !n; }
  if (n) { const b = $("badge"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  $("menu").classList.toggle("wave", n > 0);
}
function peekMsg(d) {
  const e = $("peek"); e.textContent = `${d.name}: ${d.text}`; e.hidden = false;
  e.style.animation = "none"; void e.offsetWidth; e.style.animation = "";
  clearTimeout(peekT); peekT = setTimeout(() => { e.hidden = true; }, 3500);
}
function notifyMsg(d) { if (sideOpen && curTab === "chat") return; setUnread(unread + 1); if (!sideOpen) peekMsg(d); }
function sys(t) { const e = mkEl("div", "sys", t), b = $("msgs"); b.append(e); b.scrollTop = b.scrollHeight; }
function addMsg(id, m) {
  if (seen.has(id)) return; seen.add(id);
  const el = mkEl("div", "m" + (m.uid === me.id ? " own" : "")); el.dataset.id = id; el.dataset.uid = m.uid;
  const im = document.createElement("img"); im.src = (info[m.uid] && info[m.uid].avatar) || DEF; im.alt = "";
  const w = mkEl("div", "bub"), hd = mkEl("div", "mh"); hd.append(mkEl("b", "", m.name));
  if (m.uid === me.id) {
    const d = mkEl("button", "ghost del", "Hapus"); d.type = "button";
    d.onclick = () => deleteDoc(doc(db, "rooms", rid, "messages", id)).catch(e => toast("Gagal menghapus: " + e.message));
    hd.append(d);
  }
  w.append(hd, mkEl("p", "", m.text)); el.append(im, w);
  const box = $("msgs"); box.append(el); box.scrollTop = box.scrollHeight;
}
function sendMsg() {
  const t = $("cm").value.trim(); if (!t || !rid) return; $("cm").value = "";
  addDoc(collection(db, "rooms", rid, "messages"), { uid: me.id, name: me.name, text: t.slice(0, 300), t: serverTimestamp() }).catch(e => toast("Pesan gagal: " + e.message));
}
$("send").onclick = sendMsg;
$("cm").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendMsg(); } });

// ---------- Pengguna, izin, kick ----------
function updPerms() {
  const wasCtl = isCtl;
  isCtl = isHost || !!(perms.video && perms.video[me.uid]);
  canKick = isHost || !!(perms.kick && perms.kick[me.uid]);
  if (wasCtl !== isCtl) { lastT = 0; lastTs = Date.now(); lastState = ""; renderVideo(); } else updVideoUI();
  renderUsers();
}
function setPerm(uid, kind, val) {
  if (!isHost || !uid || !rid) return;
  setDoc(mref(rid, "perms"), { [kind]: { [uid]: val } }, { merge: true }).catch(e => toast("Gagal mengubah izin: " + e.message));
}
async function kickUser(sid, m) {
  if (!canKick || !m.uid || sid === hostSid || !rid) return;
  if (!confirm(`Keluarkan ${m.name} dari room?`)) return;
  try {
    await setDoc(mref(rid, "kicks"), { k: { [m.uid]: serverTimestamp() } }, { merge: true });
    await updateDoc(rref, { [`members.${sid}`]: deleteField() });
    toast(`${m.name} dikeluarkan`);
  } catch (e) { toast("Gagal mengeluarkan: " + e.message); }
}
function kickedOut() { if (!rid) return; toast("Kamu dikeluarkan dari room."); go("/beranda", true); }
function permBtn(label, on, fn) {
  const b = mkEl("button", "sm tg" + (on ? " on" : ""), label); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
  b.onclick = () => { fn(); }; return b;
}
function renderUsers() {
  const box = $("ulist"); box.innerHTML = "";
  $("ucount").textContent = rid ? `${curMs.length}/${MAX}` : "";
  $("uinfo").textContent = isHost ? "Kamu host: atur izin video, izin kick, dan keluarkan pengguna." : canKick ? "Kamu punya izin kick." : "Pengguna yang ada di room ini.";
  curMs.forEach(([k, m]) => {
    const row = mkEl("div", "urow"), im = document.createElement("img"); im.src = m.avatar || DEF; im.alt = "";
    const inf = mkEl("div", "uinfo"), tags = mkEl("div", "tags");
    inf.append(mkEl("b", "", m.name + (k === me.id ? " (kamu)" : "")), tags);
    const isH = k === hostSid, pv = !isH && !!(perms.video && perms.video[m.uid]), pk = !isH && !!(perms.kick && perms.kick[m.uid]);
    if (isH) tags.append(mkEl("span", "tag gold", "Host"));
    if (m.muted) tags.append(mkEl("span", "tag", "Mic mati"));
    if (pv) tags.append(mkEl("span", "tag acc", "Izin video"));
    if (pk) tags.append(mkEl("span", "tag acc", "Izin kick"));
    row.append(im, inf);
    if (k !== me.id && !isH && (isHost || canKick)) {
      const act = mkEl("div", "uact");
      if (isHost) act.append(permBtn("Izin video", pv, () => setPerm(m.uid, "video", !pv)), permBtn("Izin kick", pk, () => setPerm(m.uid, "kick", !pk)));
      const kb = mkEl("button", "sm danger", "Keluarkan"); kb.type = "button"; kb.onclick = () => { kickUser(k, m); };
      act.append(kb); row.append(act);
    }
    box.append(row);
  });
  if (!curMs.length) box.append(mkEl("p", "mute", "Belum ada pengguna."));
}

// ---------- Minigame ----------
let game = null, goT0 = 0, lastGoR = 0, spinR = 0, spinning = false, spinT = null, gameTimer = null;
const gref = () => mref(rid, "game");
const wr = p => p.catch(e => toast("Gagal: " + e.message));
function stopGame() { clearTimeout(gameTimer); clearInterval(spinT); spinning = false; game = null; lastGoR = 0; spinR = 0; }
function onGame(snap) {
  game = snap.exists() ? snap.data() : null;
  if (game && game.type === "tap" && game.state === "go" && lastGoR !== game.r) { lastGoR = game.r; goT0 = performance.now(); }
  renderGame();
}
function startGame(type) {
  if (!rid) return;
  const base = { type, r: Date.now(), by: me.name, results: {} };
  if (type === "dice") wr(setDoc(gref(), { ...base, state: "open" }));
  else if (type === "tap") {
    wr(setDoc(gref(), { ...base, state: "wait" }));
    clearTimeout(gameTimer);
    gameTimer = setTimeout(() => { if (game && game.r === base.r && game.state === "wait") updateDoc(gref(), { state: "go" }).catch(() => {}); }, 2000 + Math.random() * 3500);
  } else if (type === "spin") {
    const m = curMs[Math.floor(Math.random() * curMs.length)]; if (!m) return;
    wr(setDoc(gref(), { ...base, state: "done", pick: { n: m[1].name, u: m[1].uid } }));
  }
}
const submit = v => wr(updateDoc(gref(), { [`results.${me.uid}`]: { n: me.name, v } }));
document.querySelectorAll("#gpick button").forEach(b => { b.onclick = () => startGame(b.dataset.g); });
function runSpin() {
  spinning = true; clearInterval(spinT);
  const names = curMs.map(([, m]) => m.name), t0 = Date.now(); let i = 0;
  spinT = setInterval(() => {
    const e = $("spinname"); if (!e) { clearInterval(spinT); spinning = false; return; }
    if (Date.now() - t0 > 1900 || !names.length) { clearInterval(spinT); spinning = false; e.textContent = game && game.pick ? game.pick.n : ""; e.classList.add("win"); return; }
    e.textContent = names[i++ % names.length];
  }, 90);
}
function renderGame() {
  const box = $("gbody"); box.innerHTML = "";
  if (!game || !rid) { box.append(mkEl("p", "mute", "Pilih game di atas untuk dimainkan bersama semua orang di room.")); return; }
  const res = game.results || {}, mine = res[me.uid], names = { dice: "Adu dadu", tap: "Tap cepat", spin: "Putar undian" };
  box.append(mkEl("h3", "", names[game.type] || "Game"), mkEl("p", "mute", `Dimulai oleh ${game.by}`));
  const rows = Object.values(res);
  if (game.type === "dice") {
    const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    box.append(mkEl("div", "die", mine ? faces[mine.v - 1] : "🎲"));
    const b = mkEl("button", "", mine ? "Kamu sudah melempar" : "Lempar dadu"); b.type = "button"; b.disabled = !!mine;
    b.onclick = () => submit(1 + Math.floor(Math.random() * 6)); box.append(b);
    rows.sort((x, y) => y.v - x.v);
  } else if (game.type === "tap") {
    const b = mkEl("button", "tapbtn " + game.state), done = !!mine; b.type = "button";
    b.textContent = done ? (mine.v < 0 ? "Terlalu cepat!" : `${mine.v} ms`) : game.state === "go" ? "TAP!" : "Tunggu sampai hijau...";
    b.disabled = done;
    b.onclick = () => submit(game.state === "go" ? Math.max(1, Math.round(performance.now() - goT0)) : -1);
    box.append(b);
    rows.sort((x, y) => (x.v < 0) - (y.v < 0) || x.v - y.v);
  } else if (game.type === "spin") {
    const isNew = game.r !== spinR && Date.now() - game.r < 6000;
    spinR = game.r;
    const e = mkEl("div", "spinname", isNew || spinning ? "..." : (game.pick && game.pick.n) || "");
    if (isNew || spinning) e.id = "spinname"; else e.classList.add("win");
    box.append(e);
    if (isNew) runSpin();
  }
  if (rows.length) {
    const list = mkEl("div", "rlist"), top = rows[0] && rows[0].v > 0 ? rows[0].v : null;
    rows.forEach(r => {
      const row = mkEl("div", "rrow" + (top !== null && r.v === top ? " first" : ""));
      row.append(mkEl("span", "", (top !== null && r.v === top ? "🏆 " : "") + r.n), mkEl("b", "", game.type === "dice" ? String(r.v) : r.v < 0 ? "terlalu cepat" : r.v + " ms"));
      list.append(row);
    });
    box.append(list);
  }
  const act = mkEl("div", "row"), again = mkEl("button", "", "Ronde baru"), close = mkEl("button", "ghost", "Tutup game");
  again.type = close.type = "button"; again.onclick = () => startGame(game.type); close.onclick = () => wr(deleteDoc(gref()));
  act.append(again, close); box.append(act);
}

// ---------- Polling ----------
let poll = null;
const pref = () => mref(rid, "poll");
function onPoll(snap) { poll = snap.exists() ? snap.data() : null; renderPoll(); }
$("pmake").onclick = () => {
  const q = $("pq").value.trim(), opts = [...new Set($("popts").value.split("\n").map(s => s.trim()).filter(Boolean))].slice(0, 6);
  if (!q) { toast("Isi pertanyaan polling dulu."); return; }
  if (opts.length < 2) { toast("Minimal 2 pilihan, satu per baris."); return; }
  wr(setDoc(pref(), { q, opts: opts.map(s => s.slice(0, 60)), by: me.name, u: me.uid, r: Date.now(), open: true, votes: {} }));
  $("pq").value = ""; $("popts").value = "";
};
function renderPoll() {
  const box = $("pres"); box.innerHTML = ""; $("pform").hidden = !!poll || !rid;
  if (!poll || !rid) return;
  const votes = poll.votes || {}, counts = poll.opts.map((_, i) => Object.values(votes).filter(v => v === i).length), total = counts.reduce((a, b) => a + b, 0), mine = votes[me.uid];
  box.append(mkEl("h3", "", poll.q), mkEl("p", "mute", `Dibuat oleh ${poll.by}. ${total} suara${poll.open ? "" : ", voting ditutup"}.`));
  poll.opts.forEach((o, i) => {
    const b = mkEl("button", "opt" + (mine === i ? " mine" : "")), bar = mkEl("i"), row = mkEl("span");
    b.type = "button"; bar.style.setProperty("--p", total ? Math.round(counts[i] / total * 100) + "%" : "0%");
    row.append(mkEl("em", "", o), mkEl("b", "", `${counts[i]} (${total ? Math.round(counts[i] / total * 100) : 0}%)`));
    b.append(bar, row); b.disabled = !poll.open;
    b.onclick = () => wr(updateDoc(pref(), { [`votes.${me.uid}`]: i }));
    box.append(b);
  });
  if (poll.u === me.uid || isHost) {
    const act = mkEl("div", "row");
    if (poll.open) { const c = mkEl("button", "ghost", "Tutup voting"); c.type = "button"; c.onclick = () => wr(updateDoc(pref(), { open: false })); act.append(c); }
    const d = mkEl("button", "ghost", "Hapus polling"); d.type = "button"; d.onclick = () => wr(deleteDoc(pref())); act.append(d);
    box.append(act);
  }
}

// ---------- Tautan ----------
function renderLink() {
  if (!rid) { $("linkurl").value = ""; $("linkinfo").textContent = ""; return; }
  $("linkurl").value = location.origin + "/beranda/join/room/" + rid;
  $("linkinfo").textContent = (roomPub ? "Room publik. " : "Room privat, penerima link perlu kode angka. ") + "ID room: " + rid;
  $("lshare").hidden = !navigator.share;
}
$("lcopy").onclick = () => {
  const v = $("linkurl").value; if (!v) return;
  if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => toast("Link room tersalin")).catch(() => { $("linkurl").select(); toast("Tekan Ctrl+C untuk menyalin"); });
  else { $("linkurl").select(); toast("Tekan Ctrl+C untuk menyalin"); }
};
$("lshare").onclick = () => { navigator.share?.({ title: "AFK Zone Human", text: "Gabung ke room " + $("rt").textContent, url: $("linkurl").value }).catch(() => {}); };

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
    const on = v > 18 && !(id === me.id && muted);
    document.querySelectorAll(`[data-pid="${id}"]`).forEach(e => e.classList.toggle("talk", on));
  }
  raf = requestAnimationFrame(loop);
}

if (window.visualViewport) {
  const vv = window.visualViewport, upd = () => {
    const r = document.documentElement.style;
    r.setProperty("--vvh", vv.height + "px"); r.setProperty("--vvt", vv.offsetTop + "px");
  };
  vv.addEventListener("resize", upd); vv.addEventListener("scroll", upd); upd();
}

route();
