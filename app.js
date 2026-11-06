import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { GAMES, QUIZ, QTIME, newGame, joinG, startG, rematchG, act as gact } from "./games.js";
import { firebaseConfig, ICE_SERVERS, TURN_API_URL, CLOUDINARY_CLOUD, CLOUDINARY_PRESET } from "./firebase-config.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit, where, runTransaction, writeBatch, serverTimestamp, deleteField, Bytes } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const fbApp = initializeApp(firebaseConfig), db = getFirestore(fbApp);
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
const DEF = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1c1c1c"/><circle cx="32" cy="24" r="11" fill="#8a8a8a"/><path d="M10 60c2-16 12-22 22-22s20 6 22 22z" fill="#8a8a8a"/></svg>');
const PRESETS = [["🦊","#2b2b2b"],["🐻","#3a3a3a"],["🐼","#4a4a4a"],["🐸","#333333"],["🦉","#555555"],["🐙","#444444"],["🐱","#262626"],["🐰","#3f3f3f"],["🦌","#505050"],["🐧","#2f2f2f"]];
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
let lastLoc = "";
window.addEventListener("popstate", () => { if (location.pathname + location.search !== lastLoc) route(); });
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-link]");
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); go(a.getAttribute("href")); }
});
const HOME_TITLE = "AFK Zone Human – Room Online, Nobar & Ngobrol Bareng";
const PAGE_TITLES = { login: "Masuk – AFK Zone Human", lobby: "Beranda – AFK Zone Human", settings: "Pengaturan profil – AFK Zone Human" };
function updateHome() {
  $("hnavbtn").textContent = profile ? "Beranda" : "Masuk";
  $("hhint").textContent = profile ? `Masuk sebagai ${profile.name}` : "";
}
function showScreen(n) {
  document.documentElement.className = "";
  if (n === "home") { document.title = HOME_TITLE; updateHome(); } else if (PAGE_TITLES[n]) document.title = PAGE_TITLES[n];
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === n));
  $("nav").classList.toggle("hide", !profile || !["lobby", "settings"].includes(n));
  if (profile) { $("nav-av").src = profile.avatar || DEF; $("nav-name").textContent = profile.name; }
  window.scrollTo(0, 0);
}
let routeTk = 0;
async function route() {
  lastLoc = location.pathname + location.search;
  const tk = ++routeTk, p = path(), m = p.match(/^\/beranda\/join\/room\/([A-Za-z0-9]+)$/), gm = p.match(/^\/game\/([A-Za-z0-9]+)\/game$/), roomId = m ? m[1].toUpperCase() : gm ? gm[1].toUpperCase() : null;
  if (rid && rid !== roomId) { await leave(); if (tk !== routeTk) return; }
  if (!roomId && unRooms && p !== "/beranda") { unRooms(); unRooms = null; }
  if (p === "/") { showScreen("home"); return; }
  if (!profile) {
    if (p !== "/masuk") { sessionStorage.setItem("afk_next", p + location.search); history.replaceState({}, "", "/masuk"); lastLoc = "/masuk"; }
    showScreen("login"); return;
  }
  syncMe();
  if (p === "/masuk") return go("/beranda", true);
  if (roomId) { await enterRoom(roomId); if (tk === routeTk && rid === roomId) setGameView(gm ? gameId() : ""); return; }
  if (p === "/profile/settings") { setSt.avatar = profile.avatar; $("sname").value = profile.name; $("serr").textContent = ""; drawSet(); showScreen("settings"); return; }
  if (p === "/beranda") { showScreen("lobby"); watchRooms(); return; }
  return go("/beranda", true);
}

// ---------- Lobby ----------
let unRooms = null;
async function purge(id) {
  for (const sub of ["messages", "signals", "meta", "files", "games"]) {
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
let shown = new Set(), vstate = null, isHost = false, isCtl = false, canKick = false, hostSid = null, roomOwner = "", roomPub = true, vPoll = null, suppress = 0, lastT = 0, lastTs = 0, lastState = "", lastPubT = 0, gotVideo = false, perms = {}, kicks = {}, joinedAt = 0, forced = {}, canMute = false, wasForced = false;
const pvolMap = (() => { try { return JSON.parse(localStorage.getItem("afk_pvol") || "{}"); } catch { return {}; } })();
const pvol = uid => (uid && uid in pvolMap ? pvolMap[uid] : 1);
function setPVol(sid, uid, v) {
  pvolMap[uid] = v; try { localStorage.setItem("afk_pvol", JSON.stringify(pvolMap)); } catch {}
  const a = document.getElementById("a-" + sid); if (a) a.volume = v;
}
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
  isHost = false; isCtl = false; canKick = false; hostSid = null; perms = {}; kicks = {}; forced = {}; canMute = false; wasForced = false; joinedAt = Date.now();
  $("rt").textContent = data.name; document.title = data.name + " – AFK Zone Human"; $("rmeta").textContent = (data.public ? "Room publik" : "Room privat") + ", ID " + id;
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
  unsubs.push(onSnapshot(mref(id, "mutes"), s => { forced = s.exists() ? (s.data().f || {}) : {}; applyForced(); }));
  unsubs.push(onSnapshot(collection(db, "rooms", id, "games"), s => { gamesList = s.docs.map(d => ({ id: d.id, ...d.data() })); renderGameList(); }));
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
    d.onclick = () => openSide("users"); d.title = m.name;
    d.style.left = 50 + 63 * Math.cos(a) + "%"; d.style.top = 50 + 63 * Math.sin(a) + "%";
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
  Object.keys(rc).forEach(k => delete rc[k]); stopGame(); clearGameView(); stopRec(false); forced = {}; canMute = false; wasForced = false; closeSide(); setUnread(0);
  $("stage").classList.remove("wv"); $("vbox").hidden = true; $("vctl").hidden = true; $("strip").innerHTML = "";
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
    a.volume = pvol(lastMembers && lastMembers[id] && lastMembers[id].uid); a.srcObject = st; voiceStat(); a.play().catch(() => { $("unlock").hidden = false; });
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
    localStream = s; muted = wasForced; addMeter(me.id, s);
    if (wasForced) s.getAudioTracks().forEach(t => { t.enabled = false; });
    updateDoc(rref, { [`members.${me.id}.muted`]: muted }).catch(() => {});
  }
  micUI(); unlockAudio(); reconnectAll(); toast("Mic aktif, menyambungkan suara...");
}
$("unlock").onclick = unlockAudio;
$("venable").onclick = enableVoice;
$("vredo").onclick = () => { reconnectAll(); toast("Menyambungkan ulang suara..."); };
document.addEventListener("pointerdown", () => { if (rid) { ac?.resume?.(); document.querySelectorAll("#audios audio").forEach(a => { if (a.paused) a.play().catch(() => {}); }); } }, { passive: true });

// ---------- Nonton bareng ----------
let vp = null, vpKey = "", vpTk = 0, lastApply = 0, fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
let soundOK = false, userMuted = false, vmute = false, tryStage = 0, tryT = 0;
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
function mkYT(box, v, start, play, muted) {
  const el = document.createElement("div"); box.append(el); let p;
  return {
    ready: loadYT().then(() => new Promise(res => { p = new YT.Player(el, { width: "100%", height: "100%", videoId: v.src, playerVars: { controls: 1, disablekb: 1, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, autoplay: play ? 1 : 0, mute: muted ? 1 : 0, start: Math.floor(start) }, events: { onReady: () => { if (muted) p.mute(); res(); } } }); })),
    play: () => p.playVideo(), pause: () => p.pauseVideo(), seek: t => p.seekTo(t, true), time: () => p.getCurrentTime(), vol: x => p.setVolume(x * 100), mute: b => { if (b) p.mute(); else p.unMute(); },
    state: () => { const s = p.getPlayerState(), S = YT.PlayerState; return s === S.PLAYING ? "playing" : s === S.BUFFERING ? "buffering" : s === S.ENDED ? "ended" : "paused"; },
    destroy: () => { try { p.destroy(); } catch {} }
  };
}
function mkVimeo(box, v, start, play, muted) {
  const el = document.createElement("div"); el.className = "vimeo"; box.append(el);
  let p, t = start, st = "paused";
  const ready = loadScript("vimeo-sdk", "https://player.vimeo.com/api/player.js").then(() => new Promise((res, rej) => {
    p = new Vimeo.Player(el, { url: v.src, autopause: false, dnt: true, muted: !!muted });
    p.on("play", () => { st = "playing"; }); p.on("pause", () => { st = "paused"; }); p.on("ended", () => { st = "ended"; });
    p.on("bufferstart", () => { st = "buffering"; }); p.on("bufferend", () => { if (st === "buffering") st = "playing"; });
    p.on("timeupdate", e => { t = e.seconds; }); p.on("seeked", e => { t = e.seconds; });
    p.ready().then(() => { p.setCurrentTime(start).catch(() => {}); if (play) p.play().catch(() => {}); res(); }).catch(() => rej(new Error("Video Vimeo ini tidak bisa diputar (privat atau dibatasi).")));
  }));
  return { ready, play: () => p.play().catch(() => { $("vgate").hidden = false; }), pause: () => p.pause().catch(() => {}), seek: x => { t = x; p.setCurrentTime(x).catch(() => {}); }, time: () => t, vol: x => p.setVolume(x).catch(() => {}), mute: b => p.setMuted(b).catch(() => {}), state: () => st, destroy: () => { try { p.destroy(); } catch {} } };
}
function mkFile(box, v, start, play, muted) {
  const el = document.createElement("video"); el.controls = true; el.playsInline = true; el.setAttribute("playsinline", ""); el.preload = "auto"; el.muted = !!muted; box.append(el);
  let hls;
  el.addEventListener("loadedmetadata", () => { try { el.currentTime = start; } catch {} if (play) el.play().catch(() => {}); }, { once: true });
  el.onerror = () => toast("Video tidak bisa diputar dari link ini. Pakai link YouTube, Vimeo, atau file video langsung (.mp4, .webm, .m3u8).");
  const isHls = /\.m3u8(\?|#|$)/i.test(v.src) && !el.canPlayType("application/vnd.apple.mpegurl");
  const ready = isHls
    ? loadScript("hls-js", "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js").then(() => { hls = new Hls(); hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) toast("Stream HLS gagal dimuat (cek link atau CORS)."); }); hls.loadSource(v.src); hls.attachMedia(el); })
    : Promise.resolve().then(() => { el.src = v.src; });
  return { ready, play: () => el.play().catch(() => { $("vgate").hidden = false; }), pause: () => el.pause(), seek: t => { try { el.currentTime = t; } catch {} }, time: () => el.currentTime, vol: x => { el.volume = x; }, mute: b => { el.muted = b; },
    state: () => el.ended ? "ended" : el.paused ? "paused" : el.readyState < 3 ? "buffering" : "playing",
    destroy: () => { try { el.onerror = null; hls && hls.destroy(); el.pause(); el.removeAttribute("src"); el.load(); } catch {} } };
}
function mkFrame(box, v) {
  const f = document.createElement("iframe");
  f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"; f.allowFullscreen = true;
  f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups allow-forms");
  let src = v.src; try { const u = new URL(src); if (u.hostname === "player.twitch.tv") { u.searchParams.set("parent", location.hostname); src = u.href; } } catch {}
  f.src = src; box.append(f);
  return { sync: false, ready: new Promise(res => { f.onload = () => res(); setTimeout(res, 6000); }), play() {}, pause() {}, seek() {}, time: () => 0, vol() {}, mute() {}, state: () => "paused", destroy: () => { try { f.src = "about:blank"; f.remove(); } catch {} } };
}
const vol = () => Number($("vvol").value) / 100;
function destroyPlayer() { vpTk++; if (vp) { try { vp.destroy(); } catch {} vp = null; } vpKey = ""; $("ytwrap").innerHTML = ""; $("vgate").hidden = true; }
const expected = v => v.playing ? v.pos + Math.max(0, Date.now() - tm(v.at)) / 1000 : v.pos;
function applyVideo() {
  const v = vstate; if (!v || !v.src || !vp || vp.sync === false) return;
  const t = expected(v), cur = vp.time() || 0, st = vp.state();
  if (v.playing) {
    if (Math.abs(cur - t) > 2) vp.seek(t);
    ensurePlaying();
  } else {
    tryStage = 0; if (st === "playing" || st === "buffering") vp.pause();
    if (Math.abs(cur - v.pos) > .8) vp.seek(v.pos);
  }
}
const SPK_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SPK_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
const canSound = () => soundOK || (!matchMedia("(pointer:coarse)").matches && !!(navigator.userActivation && navigator.userActivation.hasBeenActive));
function syncSound() {
  const v = vstate, has = !!(v && v.src && v.kind !== "iframe");
  $("vctl").hidden = !has || !rid; if (!has) return;
  const off = vmute || vol() === 0, ask = vmute && !userMuted;
  $("vspk").innerHTML = off ? SPK_OFF : SPK_ON; $("vspk").classList.toggle("pulse", ask);
  $("vspk").setAttribute("aria-label", off ? "Nyalakan suara video" : "Matikan suara video");
  $("vpct").textContent = vmute ? "Bisu" : Math.round(vol() * 100) + "%";
  $("vmsg").textContent = ask ? "Ketuk speaker untuk menyalakan suara" : "";
}
function applySound() { try { if (vp) { vp.mute(vmute); vp.vol(vol()); } } catch {} localStorage.setItem("afk_vol", $("vvol").value); syncSound(); }
// Penonton: coba putar dengan suara; kalau diblokir browser (umum di HP), putar dalam keadaan bisu; kalau masih gagal, minta ketukan.
function ensurePlaying() {
  const st = vp.state();
  if (st === "playing" || st === "buffering") { tryStage = 0; return; }
  const now = Date.now(); if (now - tryT < 1500 || !$("vgate").hidden) return;
  tryT = now;
  if (tryStage === 0) { vp.play(); tryStage = 1; }
  else if (tryStage === 1) { if (!vmute) { vmute = true; try { vp.mute(true); } catch {} syncSound(); } vp.play(); tryStage = 2; }
  else $("vgate").hidden = false;
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
  $("vform").hidden = !isCtl; $("vclose").hidden = !(isCtl && has); $("vblock").hidden = isCtl || fr;
  $("vfs").hidden = !(has && fsOK); $("vinfo").textContent = infoText(v, has); syncSound();
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
    const startMuted = userMuted || (!isCtl && !canSound()); vmute = startMuted; tryStage = 0; tryT = Date.now();
    try { p = make($("ytwrap"), v, start, play, startMuted); await p.ready; } catch (e) { toast((e && e.message) || "Video gagal dimuat."); if (tk === vpTk) { vp = null; } return; }
    if (tk !== vpTk || !rid) { p.destroy(); return; }
    vp = p; try { vp.vol(vol()); vp.mute(vmute); } catch {} syncSound();
    if (isCtl) suppress = Date.now() + 2500;
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
$("vgate").onclick = () => { $("vgate").hidden = true; soundOK = true; vmute = userMuted; applySound(); if (vp && vstate) { vp.seek(expected(vstate)); vp.play(); } tryStage = 0; tryT = Date.now(); };
$("vvol").value = localStorage.getItem("afk_vol") || "100";
$("vvol").addEventListener("input", () => { soundOK = true; if (vmute && vol() > 0) { vmute = false; userMuted = false; } applySound(); });
$("vspk").onclick = () => { soundOK = true; if (vmute) { vmute = false; userMuted = false; if (vol() === 0) $("vvol").value = 60; } else { vmute = true; userMuted = true; } applySound(); };
$("vfs").onclick = () => { const b = $("vbox"); (b.requestFullscreen || b.webkitRequestFullscreen || (() => {})).call(b); };

// ---------- Indikator bicara & mic ----------
function addMeter(id, stream) {
  try { const an = ac.createAnalyser(); an.fftSize = 256; ac.createMediaStreamSource(stream).connect(an); meters[id] = { an, buf: new Uint8Array(an.frequencyBinCount) }; } catch {}
}
function micUI() {
  const off = muted || !localStream, btn = $("mute");
  btn.innerHTML = off ? MICOFF : MIC; btn.classList.toggle("off", off);
  const t = !localStream ? "Mic tidak tersedia" : wasForced ? "Dibisukan oleh host" : muted ? "Nyalakan mic" : "Matikan mic";
  btn.setAttribute("aria-label", t); btn.title = t;
  voiceStat(); updVN();
}
function voiceStat() {
  if (!rid) return;
  const ids = Object.keys(peers), ok = ids.filter(k => peers[k].pc.connectionState === "connected").length;
  const mic = !localStream ? "Mic tidak tersedia, kamu hanya mendengar" : muted ? (wasForced ? "Dibisukan oleh host" : "Mic mati") : "Mic menyala";
  $("vstat").textContent = mic + (ids.length ? `, suara tersambung ${ok}/${ids.length}` : "");
  $("venable").hidden = !!localStream; $("vredo").hidden = !(ids.length && ok < ids.length);
}
$("mute").onclick = () => {
  if (!localStream) return;
  if (wasForced) { toast("Kamu dibisukan oleh host, mic tidak bisa dinyalakan."); return; }
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
const LIM = 100, MAXLEN = 100000, MAXFILE = 10 * 1024 * 1024;
function setUnread(n) {
  unread = n; const t = n > 99 ? "99+" : String(n);
  for (const id of ["badge", "tbadge"]) { const b = $(id); b.textContent = t; b.hidden = !n; }
  if (n) { const b = $("badge"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  $("menu").classList.toggle("wave", n > 0);
}
function peekMsg(d) {
  const e = $("peek"), t = d.file ? (d.file.vn ? "Pesan suara" : "File: " + d.file.name) : d.text;
  e.textContent = `${d.name}: ${t}`; e.hidden = false;
  e.style.animation = "none"; void e.offsetWidth; e.style.animation = "";
  clearTimeout(peekT); peekT = setTimeout(() => { e.hidden = true; }, 3500);
}
function notifyMsg(d) { if (sideOpen && curTab === "chat") return; setUnread(unread + 1); if (!sideOpen) peekMsg(d); }
function sys(t) { const e = mkEl("div", "sys", t), b = $("msgs"); b.append(e); b.scrollTop = b.scrollHeight; }
function copyText(t, ok) {
  const fb = () => {
    const ta = document.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;opacity:0;left:0;top:0"; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); toast(ok); } catch { toast("Gagal menyalin."); } ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => toast(ok)).catch(fb); else fb();
}
const fmtSize = n => n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB";
const fmtDur = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const cleanUrl = m => { let u = m; while (/[.,!?;:)\]}]$/.test(u)) u = u.slice(0, -1); return u; };
function toHref(u) { try { const x = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u); return /^https?:$/.test(x.protocol) ? x : null; } catch { return null; } }
function openLink(u) {
  const x = toHref(u); if (!x) return;
  if (x.origin === location.origin && /^\/(game|beranda|profile)\//.test(x.pathname)) { closeSide(); go(x.pathname + x.search); }
  else window.open(x.href, "_blank", "noopener,noreferrer");
}
function linkNodes(text) {
  const frag = document.createDocumentFragment(); let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const u = cleanUrl(m[0]), x = toHref(u); if (!x) continue;
    if (m.index > last) frag.append(text.slice(last, m.index));
    const a = mkEl("a", "lnk", u); a.href = x.href; a.target = "_blank"; a.rel = "noopener noreferrer nofollow"; a.onclick = e => { e.preventDefault(); openLink(u); };
    frag.append(a); last = m.index + u.length;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}
function linkRow(text) {
  const links = [...new Set([...text.matchAll(URL_RE)].map(m => cleanUrl(m[0])).filter(toHref))].slice(0, 3);
  if (!links.length) return null;
  const row = mkEl("div", "lrow");
  links.forEach(u => {
    const x = toHref(u), game = x.origin === location.origin && /^\/game\//.test(x.pathname), b = mkEl("button", "openbtn", game ? "Buka game" : "Buka"); b.type = "button"; b.onclick = () => openLink(u);
    row.append(b, mkEl("span", "lhost", x.hostname.replace(/^www\./, "")));
  });
  return row;
}
function textBlock(text) {
  const wrap = mkEl("div", "tx"), p = mkEl("p", ""), lr = linkRow(text);
  if (text.length <= LIM && !text.includes("\n")) { p.append(linkNodes(text)); wrap.append(p); if (lr) wrap.append(lr); return wrap; }
  const first = text.split("\n")[0]; let cut = Math.min(first.length, LIM);
  for (const m of first.matchAll(URL_RE)) { const e = m.index + cleanUrl(m[0]).length; if (m.index < cut && e > cut) cut = e; }
  const short = first.slice(0, cut); let open = false; const btn = mkEl("button", "more"); btn.type = "button";
  const set = () => { p.replaceChildren(linkNodes(open ? text : short)); if (!open) p.append("…"); btn.textContent = open ? "Tampilkan lebih sedikit" : "Baca selengkapnya"; btn.setAttribute("aria-expanded", String(open)); };
  btn.onclick = () => { open = !open; set(); };
  set(); wrap.append(p, btn); if (lr) wrap.append(lr); return wrap;
}
function fileBlock(f, roomId) {
  const wrap = mkEl("div", "fb"), isAud = !!f.vn || /^audio\//.test(f.type || ""), isImg = /^image\//.test(f.type || "");
  const render = url => {
    wrap.innerHTML = "";
    if (isAud) {
      const a = document.createElement("audio"); a.controls = true; a.preload = "metadata"; a.src = url;
      wrap.append(mkEl("div", "vnl", "Pesan suara" + (f.dur ? " · " + fmtDur(f.dur) : "")), a);
    } else if (isImg) {
      const l = document.createElement("a"), im = document.createElement("img");
      l.href = url; l.target = "_blank"; l.rel = "noopener noreferrer"; im.className = "pic"; im.src = url; im.alt = f.name || "gambar";
      im.addEventListener("load", () => { const b = $("msgs"); if (b.scrollHeight - b.scrollTop - b.clientHeight < 420) b.scrollTop = b.scrollHeight; });
      l.append(im); wrap.append(l, mkEl("div", "fmeta", `${f.name || "gambar"} · ${fmtSize(f.size || 0)}`));
    } else {
      const l = document.createElement("a"); l.className = "fcard"; l.href = url; l.target = "_blank"; l.rel = "noopener noreferrer"; l.download = f.name || "";
      l.append(mkEl("b", "", "📄"), mkEl("span", "fname", f.name || "file"), mkEl("em", "", fmtSize(f.size || 0)));
      wrap.append(l);
    }
  };
  if (f.kind === "fs") {
    const btn = mkEl("button", "ghost loadbtn", isAud ? "Putar pesan suara" : isImg ? `Muat gambar (${fmtSize(f.size || 0)})` : `Unduh ${f.name || "file"} (${fmtSize(f.size || 0)})`); btn.type = "button";
    const load = async () => {
      btn.disabled = true; btn.classList.add("busy");
      try {
        const url = URL.createObjectURL(await fsBlob(f, roomId));
        if (isAud || isImg) render(url);
        else { const a = document.createElement("a"); a.href = url; a.download = f.name || "file"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); btn.disabled = false; btn.classList.remove("busy"); }
      } catch (e) { toast(e.message || "Gagal memuat file."); btn.disabled = false; btn.classList.remove("busy"); }
    };
    btn.onclick = load; wrap.append(btn);
    if ((isAud || isImg) && (f.size || 0) <= 1048576) load();
  } else {
    const url = String(f.url || ""); if (/^https:\/\//.test(url)) render(url);
  }
  return wrap;
}
async function delMsg(id, msg) {
  try {
    await deleteDoc(doc(db, "rooms", rid, "messages", id));
    if (msg.file && msg.file.kind === "fs") delFs(rid, msg.file);
  } catch (e) { toast("Gagal menghapus: " + e.message); }
}
function addMsg(id, msg) {
  if (seen.has(id)) return; seen.add(id);
  const el = mkEl("div", "m" + (msg.uid === me.id ? " own" : "")); el.dataset.id = id; el.dataset.uid = msg.uid;
  const im = document.createElement("img"); im.src = (info[msg.uid] && info[msg.uid].avatar) || DEF; im.alt = "";
  const w = mkEl("div", "bub"), hd = mkEl("div", "mh"), acts = mkEl("span", "macts");
  hd.append(mkEl("b", "", msg.name));
  const cp = mkEl("button", "ghost mini", msg.text ? "Salin" : "Salin link"); cp.type = "button";
  cp.onclick = () => copyText(msg.text || (msg.file && msg.file.url) || "", msg.text ? "Pesan tersalin" : "Link tersalin");
  acts.append(cp);
  if (msg.uid === me.id) { const d = mkEl("button", "ghost mini", "Hapus"); d.type = "button"; d.onclick = () => { delMsg(id, msg); }; acts.append(d); }
  hd.append(acts); w.append(hd);
  if (msg.text) w.append(textBlock(msg.text));
  if (msg.file) w.append(fileBlock(msg.file, rid));
  el.append(im, w);
  const box = $("msgs"); box.append(el); box.scrollTop = box.scrollHeight;
}
function sendMsg() {
  const t = $("cm").value.trim(); if (!t || !rid) return;
  $("cm").value = ""; grow();
  addDoc(collection(db, "rooms", rid, "messages"), { uid: me.id, name: me.name, text: t.slice(0, MAXLEN), t: serverTimestamp() }).catch(e => toast("Pesan gagal: " + e.message));
}
function grow() { const c = $("cm"); c.style.height = "auto"; c.style.height = Math.min(c.scrollHeight, 140) + "px"; }
$("send").onclick = sendMsg;
$("cm").addEventListener("input", grow);
$("cm").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMsg(); } });
$("cm").addEventListener("paste", e => { const f = e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]; if (f) { e.preventDefault(); sendFile(f); } });

// ---------- Upload file (tanpa Firebase Storage) ----------
// Default: file dipecah dan disimpan di Firestore (gratis, tanpa kartu). Opsional: Cloudinary kalau diisi di firebase-config.js.
let uploading = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CLOUD_ON = !!(CLOUDINARY_CLOUD && CLOUDINARY_PRESET);
const CH = 750 * 1024, cid = (fid, i) => `${fid}_${String(i).padStart(3, "0")}`;
const blobCache = new Map();
function lockUpload(on) {
  uploading = on; $("attach").disabled = on; $("attach").classList.toggle("loading", on); updVN();
  window.onbeforeunload = on ? (e => { e.preventDefault(); e.returnValue = ""; return ""; }) : null;
}
function uploadRow(name) {
  const el = mkEl("div", "m own up"), bub = mkEl("div", "bub"), top = mkEl("div", "uptop"), nm = mkEl("span", "fname", name), pct = mkEl("b", "", "0%");
  const bar = mkEl("div", "pbar"), fill = mkEl("i"), cancel = mkEl("button", "ghost mini", "Batal"); cancel.type = "button";
  bar.append(fill); top.append(mkEl("i", "spin sm"), nm, pct);
  bub.append(mkEl("div", "mute small", "Mengunggah. Jangan tutup atau refresh halaman."), top, bar, cancel); el.append(bub);
  const box = $("msgs"); box.append(el); box.scrollTop = box.scrollHeight;
  return { cancel, set(p, t) { fill.style.width = Math.round(p * 100) + "%"; pct.textContent = t || Math.round(p * 100) + "%"; }, remove() { el.remove(); } };
}
function fsBlob(f, roomId) {
  if (blobCache.has(f.fid)) return blobCache.get(f.fid);
  const p = (async () => {
    const s = await getDocs(query(collection(db, "rooms", roomId, "files"), where("fid", "==", f.fid)));
    const parts = s.docs.map(d => d.data()).sort((a, b) => a.i - b.i).map(d => d.d.toUint8Array());
    if (parts.length !== f.n) throw new Error("File belum lengkap atau sudah dihapus.");
    return new Blob(parts, { type: f.type || "application/octet-stream" });
  })();
  blobCache.set(f.fid, p); p.catch(() => blobCache.delete(f.fid));
  return p;
}
async function delFs(roomId, f) {
  try { const b = writeBatch(db); for (let i = 0; i < f.n; i++) b.delete(doc(db, "rooms", roomId, "files", cid(f.fid, i))); await b.commit(); } catch {}
}
async function putFs(file, roomId, onProg, ctl) {
  const fid = rand(10), n = Math.ceil(file.size / CH); ctl.fs = { fid, n, done: 0 };
  for (let i = 0; i < n; i++) {
    if (ctl.cancelled) throw Object.assign(new Error("Upload dibatalkan."), { code: "canceled" });
    const buf = new Uint8Array(await file.slice(i * CH, (i + 1) * CH).arrayBuffer());
    await setDoc(doc(db, "rooms", roomId, "files", cid(fid, i)), { fid, i, d: Bytes.fromUint8Array(buf) });
    ctl.fs.done = i + 1; onProg((i + 1) / n);
    await sleep(120);
  }
  return { kind: "fs", fid, n };
}
function putCloud(file, onProg, ctl) {
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest(), fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProg(e.loaded / e.total); };
    xhr.onload = () => {
      try { const j = JSON.parse(xhr.responseText); if (xhr.status < 300 && j.secure_url) res({ kind: "url", url: j.secure_url }); else rej(new Error((j.error && j.error.message) || `Upload ditolak (${xhr.status}).`)); }
      catch { rej(new Error("Respons upload tidak valid.")); }
    };
    xhr.onerror = () => rej(new Error("Koneksi upload gagal."));
    xhr.onabort = () => rej(Object.assign(new Error("Upload dibatalkan."), { code: "canceled" }));
    ctl.abort = () => xhr.abort(); xhr.send(fd);
  });
}
function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 800 * 1024) return Promise.resolve(file);
  return new Promise(res => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1920 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(u); res(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", .85);
    };
    img.onerror = () => { URL.revokeObjectURL(u); res(file); };
    img.src = u;
  });
}
async function sendFile(file, extra) {
  if (!rid) return;
  if (uploading) { toast("Tunggu upload yang sedang berjalan selesai."); return; }
  if (!file.size) { toast("File kosong."); return; }
  if (file.size > MAXFILE) { toast(`File terlalu besar (${fmtSize(file.size)}). Maksimal 10 MB.`); return; }
  const roomId = rid, row = uploadRow(file.name || "file"), ctl = { cancelled: false, abort: null, fs: null };
  row.cancel.onclick = () => { ctl.cancelled = true; if (ctl.abort) ctl.abort(); };
  lockUpload(true);
  let ok = false;
  try {
    let meta, f = file;
    if (CLOUD_ON) meta = await putCloud(f, p => row.set(p), ctl);
    else { f = await shrinkImage(file); meta = await putFs(f, roomId, p => row.set(p), ctl); }
    if (rid === roomId) await addDoc(collection(db, "rooms", roomId, "messages"), { uid: me.id, name: me.name, text: "", t: serverTimestamp(), file: { ...meta, name: file.name || f.name || "file", size: f.size, type: f.type || "", ...(extra || {}) } });
    ok = true; row.set(1, "Selesai");
    await sleep(1200);
  } catch (e) {
    const msg = String((e && e.message) || "");
    toast(e && e.code === "canceled" ? "Upload dibatalkan." : /permission/i.test(msg) ? "Upload ditolak. Update firestore.rules dengan versi terbaru (lihat README)." : "Upload gagal: " + msg);
  } finally {
    if (!ok && ctl.fs && ctl.fs.done) delFs(roomId, { fid: ctl.fs.fid, n: ctl.fs.n });
    row.remove(); lockUpload(false);
  }
}
$("attach").onclick = () => { if (!uploading) $("fileIn").click(); };
$("fileIn").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) sendFile(f); };

// ---------- Pesan suara (hanya saat mic mati) ----------
let rec = null;
const canVN = () => !!rid && (muted || !localStream);
function updVN() {
  const b = $("vnbtn"); b.disabled = !rid || (!canVN() && !rec) || uploading;
  b.title = canVN() ? "Rekam pesan suara" : "Matikan mic dulu untuk mengirim pesan suara";
  b.setAttribute("aria-label", b.title);
  if (rec && !canVN()) { toast("Mic dinyalakan, rekaman VN dibatalkan."); stopRec(false); }
}
async function startRec() {
  if (rec || uploading) return;
  if (!canVN()) { toast("Pesan suara hanya bisa dikirim saat mic kamu mati."); return; }
  if (!window.MediaRecorder) { toast("Browser ini tidak mendukung rekam suara."); return; }
  let stream; try { stream = await getMic(); } catch { toast("Izin mic ditolak, VN tidak bisa direkam."); return; }
  if (!rid || !canVN()) { stream.getTracks().forEach(t => t.stop()); return; }
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(t => MediaRecorder.isTypeSupported(t)) || "";
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [], r = { mr, t0: Date.now(), cancelled: false, timer: 0 };
  rec = r;
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop()); clearInterval(r.timer); $("recbar").hidden = true; $("vnbtn").classList.remove("rec");
    if (rec === r) rec = null; updVN();
    if (r.cancelled) return;
    const dur = Math.round((Date.now() - r.t0) / 1000);
    if (dur < 1) { toast("VN terlalu pendek."); return; }
    const type = (mr.mimeType || mime || "audio/webm").split(";")[0], ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    sendFile(new File([new Blob(chunks, { type })], `vn-${Date.now()}.${ext}`, { type }), { vn: true, dur });
  };
  mr.start(250); $("recbar").hidden = false; $("vnbtn").classList.add("rec"); $("rectime").textContent = "0:00";
  r.timer = setInterval(() => { const s = Math.round((Date.now() - r.t0) / 1000); $("rectime").textContent = fmtDur(s); if (s >= 120) stopRec(true); }, 500);
}
function stopRec(send) { if (!rec) return; rec.cancelled = !send; try { rec.mr.stop(); } catch { $("recbar").hidden = true; rec = null; } }
$("vnbtn").onclick = startRec; $("recx").onclick = () => stopRec(false); $("recok").onclick = () => stopRec(true);

// ---------- Pengguna, izin, kick ----------
function updPerms() {
  const wasCtl = isCtl;
  isCtl = isHost || !!(perms.video && perms.video[me.uid]);
  canKick = isHost || !!(perms.kick && perms.kick[me.uid]);
  canMute = isHost || !!(perms.mute && perms.mute[me.uid]);
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
function applyForced() {
  const f = !!forced[me.uid];
  if (f && !wasForced) toast("Kamu dibisukan oleh host.");
  if (!f && wasForced) toast("Kamu boleh menyalakan mic lagi.");
  wasForced = f;
  if (f && !muted) { muted = true; if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = false; }); if (rid) updateDoc(rref, { [`members.${me.id}.muted`]: true }).catch(() => {}); }
  micUI(); renderUsers();
}
function setForced(uid, val) {
  if (!canMute || !uid || !rid) return;
  setDoc(mref(rid, "mutes"), { f: { [uid]: val } }, { merge: true }).catch(e => toast("Gagal mengubah bisu: " + e.message));
}
function kickedOut() { if (!rid) return; toast("Kamu dikeluarkan dari room."); go("/beranda", true); }
function permBtn(label, on, fn) {
  const b = mkEl("button", "sm tg" + (on ? " on" : ""), label); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
  b.onclick = () => { fn(); }; return b;
}
function renderUsers() {
  const box = $("ulist"); box.innerHTML = "";
  $("ucount").textContent = rid ? `${curMs.length}/${MAX}` : "";
  $("uinfo").textContent = isHost ? "Kamu host: atur izin video, kick, dan mute, bisukan atau keluarkan pengguna." : (canKick || canMute) ? "Kamu punya izin " + [canKick && "kick", canMute && "mute"].filter(Boolean).join(" dan ") + "." : "Pengguna yang ada di room ini.";
  curMs.forEach(([k, m]) => {
    const row = mkEl("div", "urow"), im = document.createElement("img"); im.src = m.avatar || DEF; im.alt = "";
    const inf = mkEl("div", "uinfo"), tags = mkEl("div", "tags");
    inf.append(mkEl("b", "", m.name + (k === me.id ? " (kamu)" : "")), tags);
    const isH = k === hostSid, fm = !isH && !!forced[m.uid], pm = !isH && !!(perms.mute && perms.mute[m.uid]), pv = !isH && !!(perms.video && perms.video[m.uid]), pk = !isH && !!(perms.kick && perms.kick[m.uid]);
    if (isH) tags.append(mkEl("span", "tag gold", "Host"));
    if (m.muted) tags.append(mkEl("span", "tag", "Mic mati"));
    if (pv) tags.append(mkEl("span", "tag acc", "Izin video"));
    if (pk) tags.append(mkEl("span", "tag acc", "Izin kick"));
    if (pm) tags.append(mkEl("span", "tag acc", "Izin mute"));
    if (fm) tags.append(mkEl("span", "tag bad", "Dibisukan"));
    row.append(im, inf);
    if (k !== me.id) {
      const uv = mkEl("div", "uvol"), r = mkEl("input"), pc = mkEl("span", "mute small", Math.round(pvol(m.uid) * 100) + "%");
      r.type = "range"; r.min = 0; r.max = 100; r.value = Math.round(pvol(m.uid) * 100); r.setAttribute("aria-label", `Volume suara ${m.name}`);
      r.oninput = () => { setPVol(k, m.uid, r.value / 100); pc.textContent = r.value + "%"; };
      uv.append(mkEl("span", "mute small", "Suara"), r, pc); row.append(uv);
    }
    if (k !== me.id && !isH && (isHost || canKick || canMute)) {
      const act = mkEl("div", "uact");
      if (isHost) act.append(permBtn("Izin video", pv, () => setPerm(m.uid, "video", !pv)), permBtn("Izin kick", pk, () => setPerm(m.uid, "kick", !pk)), permBtn("Izin mute", pm, () => setPerm(m.uid, "mute", !pm)));
      if (isHost) { const mb = mkEl("button", "sm tg" + (fm ? " on" : ""), fm ? "Buka bisu" : "Bisukan"); mb.type = "button"; mb.onclick = () => setForced(m.uid, !fm); act.append(mb); }
      if (!isHost && canMute) { const mb = mkEl("button", "sm tg" + (fm ? " on" : ""), fm ? "Buka bisu" : "Bisukan"); mb.type = "button"; mb.onclick = () => setForced(m.uid, !fm); act.append(mb); }
      if (canKick) { const kb = mkEl("button", "sm danger", "Keluarkan"); kb.type = "button"; kb.onclick = () => { kickUser(k, m); }; act.append(kb); }
      row.append(act);
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

// ---------- Game seru (1 vs 1 dan mabar) ----------
let curGame = null, curGid = "", unGame = null, gamesList = [], prevG = null, qSeen = { k: "", t: 0, p: 0 }, sentK = "", gtimer = null;
const gdoc = (id, gid) => doc(db, "rooms", id, "games", gid);
const roomUrl = () => "/beranda/join/room/" + rid;
function gameId() { const q = new URLSearchParams(location.search); return ((q.get("") || q.get("game") || q.get("id") || "").match(/^[A-Za-z0-9]{4,12}$/) || [""])[0].toUpperCase(); }
const meP = () => ({ uid: me.uid, name: me.name, avatar: me.avatar });
const nameOf = (g, uid) => (g.players.find(p => p.uid === uid) || { name: "?" }).name;

function buildGameCards() {
  const box = $("gnew"); box.innerHTML = "";
  for (const [t, g] of Object.entries(GAMES)) {
    const b = mkEl("button", "gcard"); b.type = "button";
    b.append(mkEl("b", "", g.icon), mkEl("span", "", g.name), mkEl("small", "", g.mode));
    b.onclick = () => { createGame(t); }; box.append(b);
  }
}
buildGameCards();
function renderGameList() {
  const box = $("glist"); box.innerHTML = "";
  const list = gamesList.filter(g => g.status !== "done");
  if (!list.length) { box.append(mkEl("p", "mute small", "Belum ada game yang berjalan di room ini.")); return; }
  list.forEach(g => {
    const sp = GAMES[g.type]; if (!sp) return;
    const row = mkEl("div", "grow"), inf = mkEl("div", "ginfo");
    inf.append(mkEl("b", "", `${sp.icon} ${sp.name}`), mkEl("small", "mute", `${g.status === "lobby" ? "Menunggu pemain" : "Sedang bermain"} (${g.players.length}/${sp.max}) · oleh ${nameOf(g, g.host)}`));
    const b = mkEl("button", "sm", g.players.some(p => p.uid === me.uid) ? "Lanjut" : g.status === "lobby" ? "Gabung" : "Tonton"); b.type = "button";
    b.onclick = () => { closeSide(); go(`/game/${rid}/game?=${g.id}`); };
    row.append(inf, b); box.append(row);
  });
}
async function createGame(type) {
  if (!rid) return;
  const gid = genId();
  try {
    await setDoc(gdoc(rid, gid), { ...newGame(type, meP()), created: serverTimestamp() });
    const url = `${location.origin}/game/${rid}/game?=${gid}`;
    addDoc(collection(db, "rooms", rid, "messages"), { uid: me.id, name: me.name, text: `Ajak main ${GAMES[type].name}: ${url}`, t: serverTimestamp() }).catch(() => {});
    closeSide(); go(`/game/${rid}/game?=${gid}`);
  } catch (e) { toast("Gagal membuat game: " + e.message); }
}
function setGameView(gid) {
  if (gid === curGid) return;
  curGid = gid; if (unGame) { unGame(); unGame = null; } curGame = null; prevG = null; clearInterval(gtimer); gtimer = null;
  $("stage").classList.toggle("gm", !!gid);
  if (!gid) { $("gamev").innerHTML = ""; return; }
  unGame = onSnapshot(gdoc(rid, gid), s => { curGame = s.exists() ? s.data() : null; if (curGame) trackQ(curGame); renderGameView(); });
  gtimer = setInterval(gameTick, 250); renderGameView();
}
function clearGameView() { if (unGame) { unGame(); unGame = null; } clearInterval(gtimer); gtimer = null; curGid = ""; curGame = null; prevG = null; gamesList = []; $("stage").classList.remove("gm"); $("gamev").innerHTML = ""; }

async function gtx(fn, quiet) {
  if (!rid || !curGid) return;
  const ref = gdoc(rid, curGid);
  try {
    await runTransaction(db, async tx => {
      const s = await tx.get(ref); if (!s.exists()) throw new Error("Game sudah ditutup.");
      const p = fn(s.data()); if (p) tx.update(ref, p);
    });
  } catch (e) { if (!quiet) toast(e.message); }
}
const doAct = (a, quiet) => gtx(g => gact(g, me.uid, a), quiet);
const doJoin = () => gtx(g => joinG(g, meP()));
const doStart = () => gtx(g => startG(g, me.uid));
const doRematch = () => gtx(g => rematchG(g, me.uid));
function closeGame() {
  if (!curGame || curGame.host !== me.uid || !confirm("Tutup game ini untuk semua orang?")) return;
  deleteDoc(gdoc(rid, curGid)).catch(() => {}); go(roomUrl());
}

function trackQ(g) {
  if (g.type !== "quiz" || g.status !== "playing") return;
  const k = `${curGid}:${g.s.i}:${g.s.rev}`;
  if (qSeen.k !== k) { qSeen = { k, t: Date.now(), p: performance.now() }; sentK = ""; }
}
function gameTick() {
  const g = curGame; if (!g || g.status !== "playing" || !g.players.some(p => p.uid === me.uid)) return;
  const lead = g.host === me.uid;
  if (g.type === "quiz") {
    trackQ(g);
    const k = qSeen.k, el = Date.now() - qSeen.t, f = $("qfill");
    if (!g.s.rev) {
      if (f) f.style.width = Math.max(0, 100 - el / QTIME * 100) + "%";
      if (el > QTIME + (lead ? 300 : 2500) && sentK !== k) { sentK = k; doAct({ t: "timeup", i: g.s.i }, true); }
    } else if (el > 3200 + (lead ? 0 : 2500) && sentK !== k) { sentK = k; doAct({ t: "next", i: g.s.i }, true); }
  }
  if (g.type === "mem" && g.s.pend) {
    const key = g.s.o.join(","), k = `${curGid}:m:${key}`;
    if (qSeen.k !== k) { qSeen = { k, t: Date.now(), p: 0 }; sentK = ""; }
    if (Date.now() - qSeen.t > (g.turn === me.uid ? 1200 : 3200) && sentK !== k) { sentK = k; doAct({ t: "hide", k: key }, true); }
  }
}

function playerChips(g) {
  const row = mkEl("div", "gplayers");
  g.players.forEach((p, i) => {
    const c = mkEl("div", "gp" + (g.status === "playing" && g.turn === p.uid ? " turn" : "") + (g.winner === p.uid ? " won" : "")), im = document.createElement("img");
    im.src = p.avatar || DEF; im.alt = "";
    const mark = g.type === "xo" ? (i ? "O" : "X") : g.type === "c4" ? (i ? "●" : "○") : g.type === "mem" ? ["①", "②", "③", "④"][i] : "";
    const sc = g.status !== "lobby" && ["rps", "quiz", "mem"].includes(g.type) ? String((g.scores || {})[p.uid] || 0) : "";
    c.append(im, mkEl("b", "", p.name + (p.uid === me.uid ? " (kamu)" : "") + (p.uid === g.host ? " ★" : "")), mkEl("span", "gs", [mark, sc].filter(Boolean).join(" ")));
    row.append(c);
  });
  return row;
}
function statusText(g) {
  const mine = g.players.some(p => p.uid === me.uid);
  if (g.status === "lobby") return "Menunggu pemain...";
  if (g.status === "done") return g.winner === "draw" ? "Hasil seri!" : g.winner === me.uid ? "Kamu menang! 🎉" : `${nameOf(g, g.winner)} menang!`;
  if (!mine) return "Kamu menonton game ini.";
  if (g.type === "rps") return g.s.picks[me.uid] ? "Menunggu lawan memilih..." : "Pilih batu, kertas, atau gunting.";
  if (g.type === "quiz") return g.s.rev ? "Jawaban benar ditampilkan." : g.s.ans[me.uid] ? "Menunggu pemain lain..." : "Pilih jawaban secepat mungkin.";
  return g.turn === me.uid ? "Giliranmu!" : `Giliran ${nameOf(g, g.turn)}.`;
}
function lobbyUI(g) {
  const sp = GAMES[g.type], w = mkEl("div", "globby"), inGame = g.players.some(p => p.uid === me.uid);
  w.append(mkEl("p", "mute", `Pemain ${g.players.length}/${sp.max}. ${sp.desc} Minimal ${sp.min} pemain untuk mulai.`));
  const lk = mkEl("input"); lk.type = "text"; lk.readOnly = true; lk.value = `${location.origin}/game/${rid}/game?=${curGid}`; lk.setAttribute("aria-label", "Link game");
  const cp = mkEl("button", "ghost sm", "Salin link"); cp.type = "button"; cp.onclick = () => copyText(lk.value, "Link game tersalin");
  const r1 = mkEl("div", "vform"); r1.append(lk, cp); w.append(r1);
  const act = mkEl("div", "row");
  if (!inGame) { const b = mkEl("button", "", "Gabung main"); b.type = "button"; b.disabled = g.players.length >= sp.max; b.onclick = doJoin; act.append(b); }
  if (g.host === me.uid) { const b = mkEl("button", "", "Mulai game"); b.type = "button"; b.disabled = g.players.length < sp.min; b.onclick = doStart; act.append(b); }
  w.append(act); return w;
}
function doneUI(g) {
  const act = mkEl("div", "row");
  if (g.host === me.uid) { const a = mkEl("button", "", "Main lagi"); a.type = "button"; a.onclick = doRematch; act.append(a); } else act.append(mkEl("span", "mute small", "Menunggu pembuat game untuk main lagi..."));
  return act;
}
function boardXO(g, pv) {
  const w = mkEl("div", "xo"), my = g.status === "playing" && g.turn === me.uid;
  g.s.b.forEach((v, i) => {
    const c = mkEl("button", "cell" + (v ? " " + v.toLowerCase() : "") + (g.s.line.includes(i) ? " win" : "") + (pv && pv.s.b && pv.s.b[i] !== v ? " new" : ""), v); c.type = "button";
    c.disabled = !my || !!v; c.onclick = () => doAct({ i }); w.append(c);
  });
  return w;
}
function boardC4(g, pv) {
  const w = mkEl("div", "c4"), my = g.status === "playing" && g.turn === me.uid;
  for (let c = 0; c < 7; c++) {
    const col = mkEl("button", "col"); col.type = "button"; col.disabled = !my || g.s.b[c] !== 0; col.setAttribute("aria-label", "Kolom " + (c + 1)); col.onclick = () => doAct({ c });
    for (let r = 0; r < 6; r++) { const i = r * 7 + c, v = g.s.b[i]; col.append(mkEl("i", "disc" + (v ? " p" + v : "") + (g.s.line.includes(i) ? " win" : "") + (v && pv && pv.s.b && pv.s.b[i] !== v ? " drop" : ""))); }
    w.append(col);
  }
  return w;
}
function boardRPS(g) {
  const w = mkEl("div", "rps"), mine = g.players.some(p => p.uid === me.uid), picked = g.s.picks[me.uid], E = { r: "🪨", p: "📄", s: "✂️" }, N = { r: "Batu", p: "Kertas", s: "Gunting" };
  if (g.s.last) {
    const l = g.s.last, res = mkEl("div", "rlast");
    g.players.forEach(p => res.append(mkEl("span", "", `${p.name}: ${E[l.picks[p.uid]]}`)));
    res.append(mkEl("b", "", l.w === "draw" ? "Seri, ulangi!" : `${nameOf(g, l.w)} menang ronde ${l.round}`)); w.append(res);
  }
  const row = mkEl("div", "rpsrow");
  for (const k of ["r", "p", "s"]) {
    const b = mkEl("button", "rpsb" + (picked === k ? " sel" : "")); b.type = "button"; b.append(mkEl("b", "", E[k]), mkEl("span", "", N[k]));
    b.disabled = !mine || g.status !== "playing" || !!picked; b.onclick = () => doAct({ v: k }); row.append(b);
  }
  w.append(row); return w;
}
function boardQuiz(g) {
  const w = mkEl("div", "quiz"), s = g.s, q = QUIZ[s.q[s.i]], mine = g.players.some(p => p.uid === me.uid), my = s.ans[me.uid];
  trackQ(g);
  const bar = mkEl("div", "qbar"), fill = mkEl("i"); fill.id = "qfill"; bar.append(fill);
  fill.style.width = s.rev ? "0%" : Math.max(0, 100 - (Date.now() - qSeen.t) / QTIME * 100) + "%";
  w.append(mkEl("div", "mute small", `Pertanyaan ${s.i + 1} dari ${s.q.length}`), bar, mkEl("h3", "qtext", q.q));
  const opts = mkEl("div", "qopts");
  q.o.forEach((o, k) => {
    const b = mkEl("button", "qopt" + (s.rev ? (k === q.a ? " ok" : my && my.c === k ? " bad" : "") : my && my.c === k ? " sel" : ""), o); b.type = "button";
    b.disabled = !mine || s.rev || !!my || g.status !== "playing";
    b.onclick = () => doAct({ t: "ans", i: s.i, c: k, ms: Math.round(performance.now() - qSeen.p) }); opts.append(b);
  });
  const who = mkEl("div", "tags"); g.players.forEach(p => who.append(mkEl("span", "tag" + (s.ans[p.uid] ? " acc" : ""), p.name + (s.ans[p.uid] ? " ✓" : " …"))));
  w.append(opts, who); return w;
}
function boardMem(g, pv) {
  const w = mkEl("div", "mem"), my = g.status === "playing" && g.turn === me.uid && !g.s.pend;
  g.s.c.forEach((e, i) => {
    const up = !!(g.s.m[i] || g.s.o.includes(i)), was = !!(pv && pv.s.c && (pv.s.m[i] || pv.s.o.includes(i)));
    const b = mkEl("button", "mcard" + (up ? " up" : "") + (g.s.m[i] ? " own" + g.s.m[i] : "") + (up && !was ? " flip" : ""), up ? e : "?"); b.type = "button";
    b.disabled = !my || up; b.onclick = () => doAct({ t: "flip", i }); w.append(b);
  });
  return w;
}
const BOARDS = { xo: boardXO, c4: boardC4, rps: boardRPS, quiz: boardQuiz, mem: boardMem };
function renderGameView() {
  const box = $("gamev"); box.innerHTML = "";
  if (!curGid) return;
  const top = mkEl("div", "ghead"), back = mkEl("button", "ghost sm", "← Kembali ke api unggun"); back.type = "button"; back.onclick = () => go(roomUrl());
  top.append(back); box.append(top);
  const g = curGame;
  if (!g || !GAMES[g.type]) { box.append(mkEl("p", "mute", "Game tidak ditemukan atau sudah ditutup.")); return; }
  const sp = GAMES[g.type];
  top.append(mkEl("h2", "", `${sp.icon} ${sp.name}`), mkEl("span", "tag", sp.mode));
  if (g.host === me.uid) { const c = mkEl("button", "ghost sm", "Tutup game"); c.type = "button"; c.onclick = closeGame; top.append(c); }
  box.append(playerChips(g), mkEl("p", "gstatus", statusText(g)));
  if (g.status === "lobby") box.append(lobbyUI(g));
  else { box.append(BOARDS[g.type](g, prevG && prevG.status !== "lobby" ? prevG : null)); if (g.status === "done") box.append(doneUI(g)); }
  prevG = g;
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
