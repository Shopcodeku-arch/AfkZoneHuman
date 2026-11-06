// Mencari video yang bisa diputar dari sebuah link halaman web.
// Dipanggil dari browser: /api/resolve?url=https://...
const dns = require("node:dns/promises");
const net = require("node:net");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_BYTES = 1500000;
const VIDEO_HOSTS = /(dailymotion\.com|dai\.ly|twitch\.tv|streamable\.com|rumble\.com|bilibili\.com|odysee\.com|archive\.org|facebook\.com\/plugins\/video|tiktok\.com\/embed|vk\.com\/video_ext|ok\.ru\/videoembed|\/\/player\.|\/embed\/)/i;

function privIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) return privIp(x.slice(7));
  return x === "::1" || x === "::" || /^f[cd]/.test(x) || x.startsWith("fe80");
}

async function check(u) {
  const url = new URL(u);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Link harus diawali http atau https.");
  const h = url.hostname.replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) throw new Error("Link ini tidak diizinkan.");
  if (net.isIP(h)) { if (privIp(h)) throw new Error("Link ini tidak diizinkan."); return url; }
  const rs = await dns.lookup(h, { all: true });
  if (!rs.length || rs.some(r => privIp(r.address))) throw new Error("Link ini tidak diizinkan.");
  return url;
}

async function get(u) {
  let cur = u;
  for (let i = 0; i < 5; i++) {
    const url = await check(cur);
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 7000);
    let r;
    try {
      r = await fetch(url, { redirect: "manual", signal: ac.signal, headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,video/*;q=0.9,*/*;q=0.5", "accept-language": "id-ID,id;q=0.9,en;q=0.8" } });
    } finally { clearTimeout(t); }
    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, url).href; try { await r.body?.cancel(); } catch {} continue; }
    return { r, url: url.href };
  }
  throw new Error("Terlalu banyak pengalihan di link ini.");
}

async function readText(r) {
  const reader = r.body.getReader(), dec = new TextDecoder("utf-8", { fatal: false });
  let out = "", n = 0; const end = Date.now() + 6000;
  while (n < MAX_BYTES && Date.now() < end) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length; out += dec.decode(value, { stream: true });
  }
  try { await reader.cancel(); } catch {}
  return out;
}

const attr = (tag, name) => { const m = tag.match(new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", "i")); return m ? (m[1] !== undefined ? m[1] : m[2]) : ""; };

function classify(raw, base, from) {
  let u; try { u = new URL(raw.trim(), base).href; } catch { return null; }
  u = u.replace(/^http:/, "https:");
  if (!/^https:/.test(u)) return null;
  let m;
  if ((m = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed|v)\/|youtu\.be\/|youtube\.com\/watch\?(?:[^"'\s]*&)?v=)([\w-]{11})/))) return { kind: "yt", src: m[1], score: 100 };
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d{5,})/))) return { kind: "vimeo", src: "https://vimeo.com/" + m[1], score: 95 };
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return { kind: "file", src: u, score: 80 };
  if (/\.m3u8(\?|#|$)/i.test(u)) return { kind: "file", src: u, score: 70 };
  if (from === "meta") return { kind: "iframe", src: u, score: 30 };
  if (from === "iframe" && VIDEO_HOSTS.test(u)) return { kind: "iframe", src: u, score: 25 };
  return null;
}

function extract(html, base) {
  const text = html.replace(/\\u002F/gi, "/").replace(/\\u0026/gi, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const cands = [], add = c => { if (c) cands.push(c); };
  let title = "";
  for (const tag of text.match(/<meta\b[^>]*>/gi) || []) {
    const p = (attr(tag, "property") || attr(tag, "name")).toLowerCase(), c = attr(tag, "content");
    if (p === "og:title" && c && !title) title = c;
    if (c && ["og:video", "og:video:url", "og:video:secure_url", "twitter:player:stream", "twitter:player"].includes(p)) add(classify(c, base, "meta"));
  }
  if (!title) { const m = text.match(/<title[^>]*>([^<]{1,200})</i); if (m) title = m[1].trim(); }
  for (const m of text.matchAll(/<(?:video|source)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) add(classify(m[1], base, "tag"));
  for (const m of text.matchAll(/"contentUrl"\s*:\s*"([^"]+)"/g)) add(classify(m[1], base, "tag"));
  for (const m of text.matchAll(/"embedUrl"\s*:\s*"([^"]+)"/g)) add(classify(m[1], base, "meta"));
  for (const m of text.matchAll(/<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) add(classify(m[1], base, "iframe"));
  for (const m of text.matchAll(/https?:\/\/[^"'\s<>\\)]+?\.(?:m3u8|mp4|webm|mov)(?:\?[^"'\s<>\\)]*)?/gi)) add(classify(m[0], base, "raw"));
  cands.sort((a, b) => b.score - a.score);
  return { best: cands[0] || null, title };
}

function frameable(h) {
  const xf = (h.get("x-frame-options") || "").toLowerCase();
  if (xf.includes("deny") || xf.includes("sameorigin")) return false;
  const m = (h.get("content-security-policy") || "").match(/frame-ancestors([^;]*)/i);
  return !(m && !/\*/.test(m[1]));
}

async function resolve(input) {
  const { r, url } = await get(input);
  if (r.status >= 400) throw new Error(`Situs menolak akses (kode ${r.status}).`);
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  if (/^(video|audio)\//.test(ct) || /mpegurl/.test(ct) || (/octet-stream/.test(ct) && /\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(url))) {
    try { await r.body?.cancel(); } catch {}
    return { kind: "file", src: url, via: "direct" };
  }
  if (!/html|xml/.test(ct)) throw new Error("Link ini bukan halaman video.");
  const html = await readText(r), { best, title } = extract(html, url);
  if (best) return { kind: best.kind, src: best.src, title, via: "page" };
  if (frameable(r.headers)) return { kind: "iframe", src: url, title, via: "frame" };
  throw new Error("Tidak ada video yang bisa diambil dari halaman ini. Situs streaming berbayar (Netflix, Disney+, dll.) atau situs yang memblokir akses tidak didukung.");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  try {
    const u = (req.query && req.query.url) || new URL(req.url, "http://x").searchParams.get("url");
    if (!u) throw new Error("Parameter url kosong.");
    res.status(200).json(await resolve(u));
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(422).json({ error: e && e.name === "AbortError" ? "Situs terlalu lama merespons." : (e && e.message) || "Gagal membaca link." });
  }
};
module.exports._extract = extract;
