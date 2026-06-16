require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : null;
if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

async function reset() {
  const stations = await db.collection('stations').get();
  let count = 0;
  for (const doc of stations.docs) {
    if (doc.data().status === 'plug_in' || doc.data().status === 'charging') {
      await db.collection('stations').doc(doc.id).update({
        status: 'available',
        plugInUser: null,
        plugInUserName: null,
        activeSessionId: null
      });
      console.log('Reset', doc.id);
      count++;
    }
  }
  console.log('Done clearing', count, 'stations');
  process.exit(0);
}
reset();
