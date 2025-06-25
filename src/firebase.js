 // src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Import getAnalytics only if you intend to use Firebase Analytics
// import { getAnalytics } from 'firebase/analytics'; // Uncomment if needed

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBNkwfo1M0YKkOLoguixQhn42qwyCxFX4c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "find-someone-who-bingo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "find-someone-who-bingo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "find-someone-who-bingo.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "136531916308",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:136531916308:web:497b7e7d4b234113629901",
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyANMkgevmn9i8mdRu_Pa0W-M4AI16rnOzI"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Uncomment if using Analytics

export const auth = getAuth(app);
export const db = getFirestore(app);
export const geminiApiKey = firebaseConfig.geminiApiKey; // Export the geminiApiKey