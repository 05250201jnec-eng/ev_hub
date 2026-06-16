import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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

async function checkBookings() {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(5));
  const snapshot = await getDocs(q);
  snapshot.docs.forEach(doc => {
    console.log(doc.id, doc.data());
  });
  process.exit(0);
}

checkBookings();
