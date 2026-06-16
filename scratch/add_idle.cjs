const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// Update /api/admin/override to call handleChargeCompleted instead of Unplugged
code = code.replace(
  'console.log(`[IoT] Battery 100%. Auto-stopping session for ${stationId}.`);\n          await handleChargerUnplugged(stationId);',
  'console.log(`[IoT] Battery 100%. Entering Grace Period for ${stationId}.`);\n          await handleChargeCompleted(stationId);'
);
code = code.replace(
  "newStatus: 'available', note: 'Auto-completed at 100%'",
  "newStatus: 'idle', note: 'Entered Grace Period at 100%'"
);

// We need to inject handleChargeCompleted
const unpluggedIndex = code.indexOf('async function handleChargerUnplugged(stationId) {');

const injectCode = `
async function handleChargeCompleted(stationId) {
  console.log(\`[IoT] Charge 100% at \${stationId}. Entering idle state.\`);
  log(stationId, 'IoT_Complete', { source: 'Hardware', stationId });

  // Do the same billing logic as unplugged, but set status to idle
  await processSessionCompletion(stationId, 'idle');
}

async function handleChargerUnplugged(stationId) {
  console.log(\`[IoT] Physical unplug detected at station: \${stationId}\`);
  log(stationId, 'IoT_Unplug', { source: 'Hardware', stationId });
  
  const state = stationState[stationId];
  // If it was already idle, the session was already billed. Just mark available.
  if (state && state.status === 'idle') {
    simulateStatusChange(stationId, 'available');
    state.idleStartTime = null;
    const admin = require('firebase-admin');
    if (db) {
       await db.collection('stations').doc(stationId).update({
         status: 'available',
         plugInUser: null,
         plugInUserName: null,
         activeSessionId: null,
         lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
       }).catch(()=>{});
    }
    return;
  }

  await processSessionCompletion(stationId, 'available');
}

async function processSessionCompletion(stationId, finalStatus) {
  const activeSessionId = stationState[stationId] ? stationState[stationId].sessionId : null;
  const activeUserId    = stationState[stationId] ? stationState[stationId].userId    : null;

  simulateStopTransaction(stationId);
  simulateStatusChange(stationId, finalStatus);
  
  if (stationState[stationId]) {
     if (finalStatus === 'idle') {
        stationState[stationId].idleStartTime = Date.now();
        stationState[stationId].userId = activeUserId; // keep user linked for idle fees
     } else {
        stationState[stationId].idleStartTime = null;
     }
  }

  if (db && activeSessionId) {
    try {
      const sessionDoc = await db.collection('sessions').doc(activeSessionId).get();
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        const energyConsumed = sessionData.energyConsumed || parseFloat((Math.random() * 20 + 5).toFixed(2));
        const energyCost = parseFloat((energyConsumed * 15).toFixed(2)); 

        if (sessionData.bookingId) {
          await db.collection('bookings').doc(sessionData.bookingId).update({
            status: 'completed',
            updatedAt: Date.now()
          });
        } else {
          const activeBookings = await db.collection('bookings')
            .where('userId', '==', sessionData.userId || activeUserId)
            .where('stationId', '==', stationId)
            .where('status', 'in', ['active', 'confirmed', 'pending'])
            .get();
          activeBookings.forEach(async (bDoc) => {
            await db.collection('bookings').doc(bDoc.id).update({
              status: 'completed',
              updatedAt: Date.now()
            });
          });
        }

        const userId = sessionData.userId || activeUserId;
        if (userId) {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const currentCredits = userDoc.data().credits || 0;
            const newCredits = Math.max(0, currentCredits - energyCost);
            await db.collection('users').doc(userId).update({ credits: newCredits });
            console.log(\`[IoT] Deducted Nu \${energyCost} from \${userId}. New balance: Nu \${newCredits}\`);
          }
        }

        await db.collection('sessions').doc(activeSessionId).update({
          totalCost: energyCost
        }).catch(() => {});
      }

      const admin = require('firebase-admin');
      await db.collection('stations').doc(stationId).update({
        status: finalStatus,
        plugInUser: finalStatus === 'idle' ? activeUserId : null,
        activeSessionId: null,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[IoT] processSessionCompletion Firestore update error:', err.message);
    }
  }
}
`;

const endOfOldUnplugged = code.indexOf('// ─── Socket.IO events ─────────────────────────────────────────────────────────');

code = code.substring(0, unpluggedIndex) + injectCode + '\n\n' + code.substring(endOfOldUnplugged);

// Now inject the idle fee checker in the httpServer.listen block
const idleCheckCode = `
  // ── Idle Fee Monitor (Demo: 30s Grace Period) ──────────
  setInterval(async () => {
    const now = Date.now();
    for (const stationId in stationState) {
      const state = stationState[stationId];
      if (state.status === 'idle' && state.idleStartTime) {
        const GRACE_PERIOD_MS = 30000; // 30 seconds for demo!
        if (now - state.idleStartTime > GRACE_PERIOD_MS) {
          // Charge idle fee! 5 Nu per tick
          const userId = state.userId;
          if (userId && db) {
            try {
              const userDoc = await db.collection('users').doc(userId).get();
              if (userDoc.exists) {
                const currentCredits = userDoc.data().credits || 0;
                const newCredits = Math.max(0, currentCredits - 5);
                await db.collection('users').doc(userId).update({ credits: newCredits });
                console.log(\`[IdleFee] Charged Nu 5 to \${userId} for station \${stationId}. New balance: Nu \${newCredits}\`);
              }
            } catch(e) { console.error('Idle fee error', e); }
          }
          // Reset the timer so it charges again in 30 seconds
          state.idleStartTime = now;
        }
      }
    }
  }, 5000); // Check every 5 seconds
`;

code = code.replace('// ── Keep-Alive Self-Ping', idleCheckCode + '\n\n  // ── Keep-Alive Self-Ping');

fs.writeFileSync('server/index.js', code);
