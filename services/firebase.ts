
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPiIhH7fXM9aXuM0SfpNFyiGZ9y1cpTbA",
  authDomain: "neuralprep.firebaseapp.com",
  projectId: "neuralprep",
  storageBucket: "neuralprep.firebasestorage.app",
  messagingSenderId: "960861808988",
  appId: "1:960861808988:web:1bf44da7647cbf1c013999"
};

const isFirebaseConfigured = true; // Hardcoded keys provided

// Initialize Firebase only if config is present
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export { isFirebaseConfigured };

