import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

// Maps old connector types to new simple names
const typeMap = {
  'CCS2': 'DC Connector',
  'CHAdeMO': 'DC Connector',
  'GBT': 'DC Connector',
  'Type 2': 'AC Connector',
  'GBT (Solar)': 'DC Connector (Solar)',
  'Type 2 (Solar)': 'AC Connector (Solar)',
};

async function updateConnectors() {
  const snapshot = await getDocs(collection(db, 'stations'));
  let updated = 0;
  for (const stationDoc of snapshot.docs) {
    const data = stationDoc.data();
    if (!data.connectors) continue;
    
    const newConnectors = data.connectors.map(c => ({
      ...c,
      type: typeMap[c.type] || c.type // keep if already renamed
    }));
    
    const changed = newConnectors.some((c, i) => c.type !== data.connectors[i].type);
    if (changed) {
      await updateDoc(doc(db, 'stations', stationDoc.id), { connectors: newConnectors });
      console.log(`✅ Updated: ${data.name}`);
      updated++;
    } else {
      console.log(`⏭️  Already up to date: ${data.name}`);
    }
  }
  console.log(`\nDone! ${updated} station(s) updated.`);
  process.exit(0);
}

updateConnectors().catch(e => { console.error(e); process.exit(1); });
