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
