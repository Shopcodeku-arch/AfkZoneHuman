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

// Server ICE untuk voice. STUN gratis cukup untuk sebagian besar jaringan.
// Kalau ada yang suaranya tidak tersambung, tambahkan server TURN, contoh:
// { urls: "turn:turn.contoh.com:3478", username: "user", credential: "pass" }
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];
