// Logika game murni (tanpa DOM / Firebase) supaya mudah diuji.
// Bentuk dokumen game: { type, status: "lobby"|"playing"|"done", host, players:[{uid,name,avatar}], turn, winner, scores, s }
export const QTIME = 15000;

export const GAMES = {
  xo:   { name: "Tic-Tac-Toe",   icon: "❌", min: 2, max: 2, mode: "1 vs 1",      desc: "Susun tiga tanda sejajar." },
  c4:   { name: "Empat Sejajar", icon: "🔴", min: 2, max: 2, mode: "1 vs 1",      desc: "Jatuhkan koin, susun empat sejajar." },
  rps:  { name: "Suit",          icon: "✊", min: 2, max: 2, mode: "1 vs 1",      desc: "Batu gunting kertas, adu 3 ronde." },
  quiz: { name: "Kuis Kilat",    icon: "🧠", min: 2, max: 4, mode: "Mabar 2 sampai 4", desc: "Jawab cepat dan benar." },
  mem:  { name: "Kartu Kembar",  icon: "🃏", min: 2, max: 4, mode: "Mabar 2 sampai 4", desc: "Cari pasangan kartu bergiliran." }
};

export const QUIZ = [
  { q: "Planet yang paling dekat dengan Matahari?", o: ["Venus", "Merkurius", "Mars", "Bumi"], a: 1 },
  { q: "Hewan khas Pulau Komodo?", o: ["Komodo", "Orangutan", "Harimau", "Badak"], a: 0 },
  { q: "Proklamator kemerdekaan Indonesia bersama Soekarno?", o: ["Sutan Sjahrir", "Mohammad Hatta", "Ki Hajar Dewantara", "Soeharto"], a: 1 },
  { q: "Gunung tertinggi di Indonesia?", o: ["Semeru", "Rinjani", "Puncak Jaya", "Kerinci"], a: 2 },
  { q: "Bahasa resmi negara Brasil?", o: ["Spanyol", "Portugis", "Inggris", "Prancis"], a: 1 },
  { q: "Samudra terluas di dunia?", o: ["Hindia", "Atlantik", "Arktik", "Pasifik"], a: 3 },
  { q: "Hasil dari 7 x 8?", o: ["54", "56", "64", "48"], a: 1 },
  { q: "Unsur kimia dengan simbol O?", o: ["Emas", "Oksigen", "Perak", "Osmium"], a: 1 },
  { q: "Ibu kota Jepang?", o: ["Osaka", "Kyoto", "Tokyo", "Nagoya"], a: 2 },
  { q: "Benua terbesar di dunia?", o: ["Afrika", "Asia", "Eropa", "Amerika"], a: 1 },
  { q: "Alat musik bambu tradisional dari Jawa Barat?", o: ["Sasando", "Angklung", "Gamelan", "Tifa"], a: 1 },
  { q: "Candi Buddha terbesar di dunia yang ada di Magelang?", o: ["Prambanan", "Mendut", "Borobudur", "Sewu"], a: 2 },
  { q: "Hewan darat tercepat?", o: ["Singa", "Cheetah", "Kuda", "Rusa"], a: 1 },
  { q: "Berapa hari dalam setahun kabisat?", o: ["365", "364", "366", "367"], a: 2 },
  { q: "Mata uang Jepang?", o: ["Won", "Yuan", "Yen", "Ringgit"], a: 2 },
  { q: "Planet yang dijuluki planet merah?", o: ["Mars", "Jupiter", "Venus", "Saturnus"], a: 0 },
  { q: "Tanggal Hari Kemerdekaan Indonesia?", o: ["10 November", "17 Agustus", "1 Juni", "28 Oktober"], a: 1 },
  { q: "Menara Eiffel ada di negara?", o: ["Italia", "Jerman", "Prancis", "Spanyol"], a: 2 },
  { q: "Mamalia yang bisa terbang?", o: ["Burung hantu", "Kelelawar", "Elang", "Camar"], a: 1 },
  { q: "Alat untuk mengukur suhu?", o: ["Barometer", "Termometer", "Speedometer", "Higrometer"], a: 1 },
  { q: "Hasil dari 100 dibagi 4?", o: ["20", "25", "40", "50"], a: 1 },
  { q: "Campuran warna biru dan kuning menghasilkan?", o: ["Ungu", "Oranye", "Hijau", "Cokelat"], a: 2 },
  { q: "Pencipta lagu Indonesia Raya?", o: ["Ismail Marzuki", "W.R. Supratman", "Ibu Sud", "C. Simanjuntak"], a: 1 },
  { q: "Jumlah pemain satu tim sepak bola di lapangan?", o: ["9", "10", "11", "12"], a: 2 },
  { q: "Bahan utama pembuatan tempe?", o: ["Kedelai", "Jagung", "Kacang tanah", "Singkong"], a: 0 },
  { q: "Planet yang terkenal dengan cincinnya?", o: ["Neptunus", "Saturnus", "Uranus", "Merkurius"], a: 1 },
  { q: "Organ yang memompa darah ke seluruh tubuh?", o: ["Paru-paru", "Hati", "Jantung", "Ginjal"], a: 2 },
  { q: "Tari Kecak berasal dari?", o: ["Bali", "Aceh", "Papua", "Sumatra Barat"], a: 0 },
  { q: "Satuan kuat arus listrik?", o: ["Volt", "Watt", "Ampere", "Ohm"], a: 2 },
  { q: "Ibu kota Malaysia?", o: ["Johor Bahru", "Kuala Lumpur", "Penang", "Malaka"], a: 1 },
  { q: "Jumlah warna pada pelangi?", o: ["5", "6", "7", "8"], a: 2 },
  { q: "Hewan yang menjadi lambang WWF?", o: ["Panda", "Harimau", "Gajah", "Paus"], a: 0 },
  { q: "Pulau yang dijuluki Pulau Dewata?", o: ["Lombok", "Bali", "Sumba", "Flores"], a: 1 },
  { q: "Zat hijau daun yang berperan dalam fotosintesis?", o: ["Klorofil", "Hemoglobin", "Melanin", "Keratin"], a: 0 }
];
const EMOJI = ["🍎", "🍌", "🍇", "🍉", "🍓", "🍒", "🥝", "🍍"];

const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pidx = (g, uid) => g.players.findIndex(p => p.uid === uid);
const nextOf = (g, uid) => g.players[(pidx(g, uid) + 1) % g.players.length].uid;
export function best(g, scores) {
  const v = g.players.map(p => scores[p.uid] || 0), mx = Math.max(...v);
  return v.filter(x => x === mx).length > 1 ? "draw" : g.players[v.indexOf(mx)].uid;
}

export function newGame(type, creator) {
  if (!GAMES[type]) throw new Error("Game tidak dikenal.");
  return { type, status: "lobby", host: creator.uid, players: [creator], turn: null, winner: null, scores: {}, s: {} };
}
export function joinG(g, p) {
  if (g.status !== "lobby") throw new Error("Game sudah dimulai.");
  if (g.players.some(x => x.uid === p.uid)) return null;
  if (g.players.length >= GAMES[g.type].max) throw new Error("Pemain sudah penuh.");
  return { players: [...g.players, p] };
}
export function startG(g, uid) {
  if (uid !== g.host) throw new Error("Hanya pembuat game yang bisa memulai.");
  if (g.players.length < GAMES[g.type].min) throw new Error(`Butuh minimal ${GAMES[g.type].min} pemain.`);
  const ps = g.players, base = { status: "playing", winner: null, scores: Object.fromEntries(ps.map(x => [x.uid, 0])) }, first = ps[Math.floor(Math.random() * ps.length)].uid;
  switch (g.type) {
    case "xo": return { ...base, turn: first, s: { b: Array(9).fill(""), line: [] } };
    case "c4": return { ...base, turn: first, s: { b: Array(42).fill(0), line: [] } };
    case "rps": return { ...base, turn: null, s: { picks: {}, round: 1, last: null } };
    case "quiz": return { ...base, turn: null, s: { q: shuffle(QUIZ.map((_, i) => i)).slice(0, 8), i: 0, ans: {}, rev: false } };
    case "mem": return { ...base, turn: first, s: { c: shuffle([...EMOJI, ...EMOJI]), m: Array(16).fill(0), o: [], pend: false } };
  }
}
export const rematchG = (g, uid) => startG({ ...g, status: "lobby" }, uid);

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function c4line(b, r, c, me) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < 6 && cc >= 0 && cc < 7 && b[rr * 7 + cc] === me) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; } }
    if (cells.length >= 4) return cells.map(([x, y]) => x * 7 + y);
  }
  return [];
}
function reveal(g, s, scores) {
  const q = QUIZ[s.q[s.i]];
  for (const p of g.players) { const x = s.ans[p.uid]; if (x && x.c === q.a) scores[p.uid] = (scores[p.uid] || 0) + 100 + Math.round((QTIME - x.ms) / 150); }
  s.rev = true; return { s, scores };
}

// Mengembalikan patch untuk dokumen, null kalau tidak ada perubahan, atau melempar Error kalau aksi tidak sah.
export function act(g, uid, a) {
  if (g.status !== "playing") throw new Error("Game belum berjalan.");
  if (pidx(g, uid) < 0) throw new Error("Kamu hanya menonton game ini.");
  const T = g.type;
  if (T === "xo") {
    if (g.turn !== uid) throw new Error("Bukan giliranmu.");
    const b = [...g.s.b], i = a.i;
    if (!(i >= 0 && i < 9) || b[i]) throw new Error("Kotak tidak valid.");
    const sym = pidx(g, uid) === 0 ? "X" : "O"; b[i] = sym;
    const line = LINES.find(l => l.every(k => b[k] === sym));
    if (line) return { s: { b, line }, status: "done", winner: uid, turn: null };
    if (b.every(Boolean)) return { s: { b, line: [] }, status: "done", winner: "draw", turn: null };
    return { s: { b, line: [] }, turn: nextOf(g, uid) };
  }
  if (T === "c4") {
    if (g.turn !== uid) throw new Error("Bukan giliranmu.");
    const c = a.c, b = [...g.s.b];
    if (!(c >= 0 && c < 7)) throw new Error("Kolom tidak valid.");
    let r = 5; while (r >= 0 && b[r * 7 + c]) r--;
    if (r < 0) throw new Error("Kolom sudah penuh.");
    const me = pidx(g, uid) + 1; b[r * 7 + c] = me;
    const line = c4line(b, r, c, me);
    if (line.length) return { s: { b, line }, status: "done", winner: uid, turn: null };
    if (b.every(Boolean)) return { s: { b, line: [] }, status: "done", winner: "draw", turn: null };
    return { s: { b, line: [] }, turn: nextOf(g, uid) };
  }
  if (T === "rps") {
    if (!["r", "p", "s"].includes(a.v)) throw new Error("Pilihan tidak valid.");
    const s = { ...g.s, picks: { ...g.s.picks } };
    if (s.picks[uid]) throw new Error("Kamu sudah memilih.");
    s.picks[uid] = a.v;
    const [p1, p2] = g.players;
    if (!s.picks[p1.uid] || !s.picks[p2.uid]) return { s };
    const x = s.picks[p1.uid], y = s.picks[p2.uid], beats = { r: "s", s: "p", p: "r" };
    const w = x === y ? "draw" : beats[x] === y ? p1.uid : p2.uid, scores = { ...g.scores };
    if (w !== "draw") scores[w] = (scores[w] || 0) + 1;
    s.last = { picks: { ...s.picks }, w, round: s.round }; s.picks = {}; s.round += 1;
    if (w !== "draw" && scores[w] >= 2) return { s, scores, status: "done", winner: w };
    return { s, scores };
  }
  if (T === "quiz") {
    const s = { ...g.s, ans: { ...g.s.ans } }, scores = { ...g.scores };
    if (a.t === "ans") {
      if (s.rev || a.i !== s.i) throw new Error("Pertanyaan ini sudah lewat.");
      if (s.ans[uid]) throw new Error("Kamu sudah menjawab.");
      if (!(a.c >= 0 && a.c < 4)) throw new Error("Jawaban tidak valid.");
      s.ans[uid] = { c: a.c, ms: Math.max(0, Math.min(QTIME, a.ms | 0)) };
      return g.players.every(p => s.ans[p.uid]) ? reveal(g, s, scores) : { s };
    }
    if (a.t === "timeup") return s.rev || a.i !== s.i ? null : reveal(g, s, scores);
    if (a.t === "next") {
      if (!s.rev || a.i !== s.i) return null;
      if (s.i + 1 >= s.q.length) return { s, status: "done", winner: best(g, scores) };
      s.i += 1; s.ans = {}; s.rev = false; return { s };
    }
    throw new Error("Aksi tidak dikenal.");
  }
  if (T === "mem") {
    const s = { ...g.s, o: [...g.s.o], m: [...g.s.m] }, scores = { ...g.scores };
    if (a.t === "flip") {
      if (g.turn !== uid) throw new Error("Bukan giliranmu.");
      if (s.pend) throw new Error("Tunggu kartu tertutup lagi.");
      const i = a.i;
      if (!(i >= 0 && i < 16) || s.m[i] || s.o.includes(i)) throw new Error("Kartu tidak valid.");
      s.o.push(i);
      if (s.o.length < 2) return { s };
      const [x, y] = s.o;
      if (s.c[x] === s.c[y]) {
        s.m[x] = s.m[y] = pidx(g, uid) + 1; scores[uid] = (scores[uid] || 0) + 1; s.o = [];
        if (s.m.every(Boolean)) return { s, scores, status: "done", winner: best(g, scores), turn: null };
        return { s, scores };
      }
      s.pend = true; return { s };
    }
    if (a.t === "hide") {
      if (!s.pend || s.o.join(",") !== a.k) return null;
      s.o = []; s.pend = false; return { s, turn: nextOf(g, g.turn) };
    }
    throw new Error("Aksi tidak dikenal.");
  }
  throw new Error("Game tidak dikenal.");
}
