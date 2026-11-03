// Config Firebase (aman ditaruh di frontend; keamanan diatur lewat firestore.rules)
export const firebaseConfig = {
  apiKey: "AIzaSyCtEt2kKa_-60M8PNDrh2FpitCcn6LWUfo",
  authDomain: "afkzonehuman.firebaseapp.com",
  projectId: "afkzonehuman",
  storageBucket: "afkzonehuman.firebasestorage.app",
  messagingSenderId: "467860979596",
  appId: "1:467860979596:web:9f3374e88e6e9eedb7a0a9",
  measurementId: "G-S0E9ZVCLXP"
};

// Server ICE untuk voice: STUN Google + TURN ExpressTURN.
// Catatan: username dan password TURN ikut terkirim ke browser, jadi siapa pun yang membuka
// website bisa melihatnya. Pantau kuota di dashboard ExpressTURN dan ganti kredensial kalau perlu.
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: ["turn:free.expressturn.com:3478", "turn:free.expressturn.com:3478?transport=tcp"],
    username: "000000002108953391",
    credential: "4kvvO61HNR8nNUPHlETKuSHidB8="
  }
];

// Opsional tapi sangat disarankan: URL yang mengembalikan daftar ICE server (STUN/TURN) dalam bentuk JSON array.
// Contoh Metered (ada paket gratis): "https://NAMAAPP.metered.live/api/v1/turn/credentials?apiKey=API_KEY_KAMU"
// Kalau diisi, server TURN dari URL ini dipakai tambahan di atas daftar di atas supaya suara bisa tembus jaringan ketat.
export const TURN_API_URL = "";
