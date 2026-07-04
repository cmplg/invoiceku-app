import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7Q0abMkr5ESEnwGPXVBlm9iXlugR0Kv8",
  authDomain: "dotted-flames-qr4g1.firebaseapp.com",
  projectId: "dotted-flames-qr4g1",
  storageBucket: "dotted-flames-qr4g1.firebasestorage.app",
  messagingSenderId: "591401786274",
  appId: "1:591401786274:web:59945028f6fe8a05cdf0fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with the custom database ID provided by the environment
export const db = getFirestore(app, "ai-studio-invoicemanagemen-0267ab3b-4cc2-4d0f-99f4-7ddd7bdf0f0b");
