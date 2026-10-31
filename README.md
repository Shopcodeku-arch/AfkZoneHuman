# AFK Zone Human

Tempat istirahat buat manusia internet: room maks 4 orang, voice, chat, dan api unggun.

## Struktur
- `index.html`, `style.css`, `app.js`: aplikasi
- `firebase-config.js`: config Firebase dan server ICE
- `vercel.json`: header izin mic
- `firestore.rules`: rules untuk ditempel di Firebase Console

## Room
Publik: muncul di daftar, siapa saja bisa gabung. Privat: tidak muncul di daftar, gabung lewat Room ID dan kode angka 4 sampai 6 digit.

## Deploy
1. Push semua file ini ke root repo GitHub.
2. Di Vercel: Add New Project, pilih repo. Framework Preset: **Other**. Build Command dan Output Directory dikosongkan. Klik Deploy.
3. Firebase Console: Build, Firestore Database, Create database. Tempel isi `firestore.rules` di tab Rules lalu Publish.

## Uji lokal
`npx serve .` lalu buka http://localhost:3000 (mic hanya jalan di https atau localhost).
