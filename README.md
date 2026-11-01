# AFK Zone Human

Tempat istirahat buat manusia internet: room maks 4 orang, voice, chat, dan api unggun.

## Halaman
- `/` : masuk (isi nama dan foto). Kalau sudah punya profil otomatis ke `/beranda`
- `/beranda` : daftar room publik, buat room, gabung room privat
- `/beranda/join/room/ID` : masuk ke room (link bisa dibagikan, room privat minta kode angka)
- `/profile/settings` : ganti nama dan foto (bawaan atau upload)

## Struktur
- `index.html`, `style.css`, `app.js`: aplikasi
- `firebase-config.js`: config Firebase dan server ICE/TURN
- `vercel.json`: rewrite semua path ke index.html, header izin mic
- `firestore.rules`: rules untuk ditempel di Firebase Console

## Deploy
1. Push semua file ke root repo GitHub.
2. Vercel: Add New Project, pilih repo. Framework Preset **Other**, Build Command dan Output Directory kosong. Deploy.
3. Firebase Console: Firestore Database, tempel `firestore.rules` di tab Rules, Publish.

## Uji lokal
`npx serve -s .` (flag `-s` penting supaya path seperti /beranda tetap membuka index.html). Mic hanya jalan di https atau localhost.

## Perilaku room
Room dihapus otomatis saat orang terakhir keluar. Selama masih ada orang di dalam, room tetap ada walau pembuatnya sudah keluar.

## Domain: afk.gimoystudio.my.id
1. Vercel: Project, Settings, Domains, tambahkan `afk.gimoystudio.my.id`.
2. Di pengelola DNS `gimoystudio.my.id`, tambahkan record yang ditampilkan Vercel. Untuk subdomain biasanya CNAME dengan nama `afk` dan nilai `cname.vercel-dns.com`.
3. Tunggu sampai status di Vercel berubah menjadi Valid Configuration. Sertifikat HTTPS dibuat otomatis (mic butuh https).
4. Kalau API key Firebase kamu dibatasi di Google Cloud Console (Credentials, HTTP referrers), tambahkan `https://afk.gimoystudio.my.id/*`. Kalau tidak dibatasi, tidak perlu apa-apa.

## Nonton bareng (YouTube)
Host room menempel link YouTube lalu video muncul di semua peserta. Hanya host yang bisa play, pause, dan geser. Peserta lain mengikuti otomatis. Host adalah pembuat room, atau peserta yang masuk paling awal kalau pembuatnya sedang tidak ada. Perlu rules baru di `firestore.rules` (ada tambahan `meta`).

## Video yang didukung
- YouTube (watch, youtu.be, shorts, embed, live)
- Vimeo (publik atau tidak terdaftar)
- File video langsung: .mp4, .webm, .ogg, .mov, dan stream .m3u8 (HLS). Link harus mengarah langsung ke file video dan memakai https. Stream .m3u8 dari server lain butuh izin CORS.
Halaman web biasa yang hanya berisi pemutar (bukan file video langsung) tidak bisa disinkronkan.

## Suara tidak tersambung?
Koneksi suara memakai WebRTC. Pengguna di jaringan ketat (data seluler tertentu, kantor, kampus) butuh server TURN. Cara termudah:
1. Buat akun di penyedia TURN yang punya paket gratis (misal Metered).
2. Salin URL "credentials" dari dashboard-nya (yang mengembalikan JSON daftar server).
3. Tempel ke `TURN_API_URL` di `firebase-config.js`, lalu push.
Di dalam room ada tombol **Aktifkan mic & suara** dan **Sambungkan ulang** untuk memicu koneksi secara manual.
