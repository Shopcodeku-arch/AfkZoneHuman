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

## Nonton dari link apa saja
Host cukup menempel link. Urutan kerjanya:
1. YouTube, Vimeo, dan file video langsung (.mp4, .webm, .m3u8, dll.) dikenali langsung dan **sinkron penuh** (play, pause, geser ikut host).
2. Link halaman lain dikirim ke fungsi `api/resolve.js` (jalan di Vercel) yang mencari video di dalamnya: tag video, og:video, JSON-LD, tautan .mp4/.m3u8, atau embed YouTube/Vimeo. Kalau ketemu file video atau YouTube/Vimeo, hasilnya sinkron penuh.
3. Kalau yang ditemukan hanya pemutar embed (Dailymotion, Twitch, Google Drive, Streamable, dll.), pemutar itu ditampilkan di semua peserta tetapi **tidak bisa disinkronkan otomatis**, jadi semua orang menekan play sendiri.
Tidak didukung: layanan berbayar atau berDRM (Netflix, Disney+, dan sejenisnya), serta situs yang memblokir akses server.
Fungsi `api/resolve.js` hanya jalan setelah deploy ke Vercel. Kalau diuji lokal dengan `npx serve`, link YouTube/Vimeo/file tetap jalan tetapi pencarian video di halaman lain tidak.

## Menu room (sidebar)
Tombol menu (tiga garis) ada di bar atas room. Isinya: Chat, Pengguna, Nobar, Game, Polling, dan Tautan.
- **Pengguna:** daftar orang di room. Host bisa memberi **izin video** dan **izin kick** ke pengguna lain, dan mengeluarkan siapa pun. Pengguna dengan izin kick bisa mengeluarkan pengguna biasa. Orang yang dikeluarkan tidak bisa masuk lagi selama 10 menit.
- **Nobar:** pasang video (host dan yang diberi izin video). Yang lain hanya menonton dan mengikuti otomatis.
- **Game:** adu dadu, tap cepat, undian.
- **Polling:** satu polling aktif per room, semua orang bisa voting.
- **Tautan:** link room untuk dibagikan.
Semua pembatasan izin dijaga oleh aplikasi, belum oleh database. Untuk keamanan penuh perlu Firebase Authentication.

## Upload file, gambar, dan pesan suara
Chat bisa mengirim gambar atau file apa saja sampai 10 MB (lebih dari itu ditolak) dan pesan suara (VN). VN hanya bisa direkam saat mic kamu mati. Tidak perlu Firebase Storage atau kartu bank.
- **Default (tanpa setup tambahan):** file dipecah per 750 KB dan disimpan di Firestore. Cukup update `firestore.rules`. Foto besar otomatis diperkecil (maks 1920 px) supaya hemat kuota. Gambar dan VN kecil (di bawah 1 MB) dimuat otomatis, sisanya dimuat saat diketuk.
- **Opsional, lebih hemat kuota:** isi `CLOUDINARY_CLOUD` dan `CLOUDINARY_PRESET` di `firebase-config.js` (akun Cloudinary gratis, preset Unsigned). File akan diunggah ke Cloudinary dan Firestore hanya menyimpan link-nya.
File yang disimpan di Firestore otomatis ikut terhapus saat pesan atau room dihapus. Selama upload berjalan, tombol lampiran dikunci dan browser memperingatkan kalau halaman mau ditutup atau di-refresh.
Perhatikan kuota Firestore gratis (Spark): 20.000 tulis dan 50.000 baca per hari, 1 GiB penyimpanan. File 10 MB memakai sekitar 14 tulis dan 14 baca per orang yang membukanya.

## Bisukan pengguna
Host bisa membisukan pengguna lain dan memberi **izin mute** supaya pengguna tertentu juga bisa membisukan. Pengguna yang dibisukan tidak bisa menyalakan mic sampai bisunya dibuka (ia tetap bisa mengirim pesan suara).

## Game seru (1 vs 1 dan mabar)
Di menu room, tab **Game**, pilih game: Tic-Tac-Toe, Empat Sejajar, dan Suit (1 vs 1), serta Kuis Kilat dan Kartu Kembar (mabar 2 sampai 4 orang). Pembuat game otomatis mengirim undangan ke chat berisi link:
`/game/IDROOM/game?=IDGAME`
Pemain lain gabung lewat link itu (atau tombol Gabung di daftar game), lalu pembuat menekan **Mulai game**. Orang lain di room bisa menonton. Game berjalan di dalam room, jadi suara dan chat tetap aktif. Perlu update `firestore.rules` (ada aturan baru `games`).

## Link di chat
Link yang dikirim di chat tampil biru dan punya tombol **Buka** (atau **Buka game** untuk link game). Link internal dibuka tanpa memuat ulang halaman, link eksternal dibuka di tab baru.
