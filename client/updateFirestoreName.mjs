import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB37vOC15wpXlFRAgQq4M2KlJTBoNXHB_0",
  authDomain: "ev-hub-f19f0.firebaseapp.com",
  projectId: "ev-hub-f19f0",
  storageBucket: "ev-hub-f19f0.firebasestorage.app",
  messagingSenderId: "904071153317",
  appId: "1:904071153317:web:a8b9ddf5a7692ca372af4c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function update() {
  try {
    await updateDoc(doc(db, "stations", "st-001"), {
      "name": "Bhutan Post Corporation Parking"
    });
    console.log("Successfully updated Firebase name!");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

update();
