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

// Server ICE untuk voice. STUN membantu sebagian besar jaringan.
// TURN dibutuhkan kalau salah satu pengguna ada di balik jaringan ketat (data seluler, kantor, kampus).
// Server TURN publik gratis di bawah ini hanya cadangan dan bisa lambat atau mati sewaktu-waktu.
// Untuk hasil stabil, ganti dengan TURN milikmu sendiri (misal dari Metered, Twilio, atau coturn).
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turns:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" }
];
