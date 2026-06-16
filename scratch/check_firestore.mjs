import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function check() {
  const snapshot = await getDocs(collection(db, 'stations'));
  snapshot.docs.forEach(doc => {
    if (doc.id === 'st-014') {
      console.log('st-014:', doc.data());
    }
  });
  process.exit(0);
}

check();
