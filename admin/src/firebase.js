import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB37vOC15wpXlFRAgQq4M2KlJTBoNXHB_0",
  authDomain: "ev-hub-f19f0.firebaseapp.com",
  projectId: "ev-hub-f19f0",
  storageBucket: "ev-hub-f19f0.firebasestorage.app",
  messagingSenderId: "904071153317",
  appId: "1:904071153317:web:a8b9ddf5a7692ca372af4c",
  measurementId: "G-WGSWZR92VW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
