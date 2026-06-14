// --- NEW FUNCTIONS TO INSERT AROUND LINE 345 ---
async function handleChargerPlugged(stationId) {
  console.log(`[IoT] Physical plug-in detected at station: ${stationId}`);
  log(stationId, 'IoT_PlugIn', { source: 'Hardware', stationId });

  if (!db) {
    // No Firestore: just simulate the session
    simulateStartTransaction(stationId);
    simulateStatusChange(stationId, 'charging');
    return;
  }

  try {
    // 1. Read the pending user who scanned the QR code for this station
    const stationDoc = await db.collection('stations').doc(stationId).get();
    if (!stationDoc.exists) {
      console.warn(`[IoT] Station ${stationId} not found in Firestore — falling back to in-memory simulation`);
      simulateStartTransaction(stationId);
      simulateStatusChange(stationId, 'charging');
      return;
    }

    const stationData = stationDoc.data();
    let pendingUserId = stationData.plugInUser;
    let pendingUserName = stationData.plugInUserName;

    // ── FALLBACK: No pre-registered user (QR not scanned or race condition) ──
    if (!pendingUserId) {
      console.warn(`[IoT] No pending user at station ${stationId} — starting guest session via in-memory sim`);
      simulateStartTransaction(stationId);
      simulateStatusChange(stationId, 'charging');
      return;
    }

    console.log(`[IoT] Starting session for user: ${pendingUserName} (${pendingUserId}) at ${stationId}`);

    // 2. Find the active booking for this user
    let linkedBookingId = null;
    const bookingsSnapshot = await db.collection('bookings')
      .where('userId', '==', pendingUserId)
      .where('stationId', '==', stationId)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    if (!bookingsSnapshot.empty) {
      const bDoc = bookingsSnapshot.docs[0];
      linkedBookingId = bDoc.id;
      await db.collection('bookings').doc(linkedBookingId).update({
        status: 'active',
        updatedAt: Date.now()
      });
    }

    // 3. Generate session ID
    const sessionId = `sess-${stationId}-${Date.now()}`;
    const startTime = new Date().toISOString();

    // 4. Create the active session document — the client app listens for this
    await db.collection('sessions').doc(sessionId).set({
      sessionId,
      stationId,
      stationName: stationData.name || stationId,
      userId: pendingUserId,
      userName: pendingUserName,
      bookingId: linkedBookingId, // Link the booking
      status: 'active',           // Must match AppContext: find(s => s.status === 'active')
      startTime,
      energyDelivered: 0,
      source: 'iot-hardware',
    });

    // 4. Update the station to charging state and clear the pending user
    await db.collection('stations').doc(stationId).update({
      status: 'charging',
      plugInUser: null,
      plugInUserName: null,
      activeSessionId: sessionId,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Update in-memory state & broadcast
    if (stationState[stationId]) {
      stationState[stationId].status = 'charging';
      stationState[stationId].sessionId = sessionId;
      stationState[stationId].sessionStartTime = Date.now();
      stationState[stationId].userId = pendingUserId;
      stationState[stationId].energyDelivered = 0;
      stationState[stationId].reached100Time = null;
    }

    io.emit('station_status_update', {
      stationId,
      status: 'charging',
      color: STATUS_COLORS['charging'],
      timestamp: Date.now(),
    });

    io.emit('session_started', { stationId, sessionId, userId: pendingUserId, startTime });
    console.log(`[IoT] Session ${sessionId} started successfully for ${pendingUserName}`);

  } catch (err) {
    console.error('[IoT] charger_plugged handler error:', err.message);
  }
}

async function handleChargerUnplugged(stationId) {
  console.log(`[IoT] Physical unplug detected at station: ${stationId}`);
  log(stationId, 'IoT_Unplug', { source: 'Hardware', stationId });

  // Capture the sessionId before stopping the transaction
  const activeSessionId = stationState[stationId] ? stationState[stationId].sessionId : null;
  const activeUserId    = stationState[stationId] ? stationState[stationId].userId    : null;

  simulateStopTransaction(stationId);
  simulateStatusChange(stationId, 'available');

  if (db && activeSessionId) {
    try {
      // 1. Get the session we just completed
      const sessionDoc = await db.collection('sessions').doc(activeSessionId).get();
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        const energyConsumed = sessionData.energyConsumed || parseFloat((Math.random() * 20 + 5).toFixed(2));
        const energyCost = parseFloat((energyConsumed * 15).toFixed(2)); // Nu 15 per kWh

        // 2. Mark the associated booking completed
        if (sessionData.bookingId) {
          await db.collection('bookings').doc(sessionData.bookingId).update({
            status: 'completed',
            updatedAt: Date.now()
          });
        } else {
          // Fallback: find any active booking for this user and station
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

        // 3. Deduct energy cost from user credits
        const userId = sessionData.userId || activeUserId;
        if (userId) {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const currentCredits = userDoc.data().credits || 0;
            const newCredits = Math.max(0, currentCredits - energyCost);
            await db.collection('users').doc(userId).update({ credits: newCredits });
            console.log(`[IoT] Deducted Nu ${energyCost} from ${userId}. New balance: Nu ${newCredits}`);
          }
        }

        // 4. Update session with final cost
        await db.collection('sessions').doc(activeSessionId).update({
          totalCost: energyCost
        }).catch(() => {});
      }

      // 5. Reset the station state
      await db.collection('stations').doc(stationId).update({
        status: 'available',
        plugInUser: null,
        plugInUserName: null,
        activeSessionId: null,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('[IoT] charger_unplugged Firestore update error:', err.message);
    }
  }
}
