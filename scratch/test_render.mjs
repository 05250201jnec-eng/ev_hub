import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, setDoc } from 'firebase/firestore';

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

async function testRenderBackend() {
  console.log("Setting st-014 to plug_in state...");
  await updateDoc(doc(db, 'stations', 'st-014'), {
    status: 'plug_in',
    plugInUser: 'user-test',
    plugInUserName: 'Test User',
    lastUpdated: Date.now()
  });

  // Make sure we have a booking too, just in case handleChargerPlugged requires it
  await setDoc(doc(db, 'bookings', 'test-booking'), {
    userId: 'user-test',
    stationId: 'st-014',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
  });

  console.log("Sending HTTP POST to Render...");
  const response = await fetch('https://ev-hub-fhid.onrender.com/api/admin/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stationId: 'st-014', status: 'charging', battery: 0 })
  });
  const data = await response.json();
  console.log("Render response:", data);
  
  // Wait a moment for Render to write to Firestore
  await new Promise(r => setTimeout(r, 2000));
  process.exit(0);
}

testRenderBackend();
