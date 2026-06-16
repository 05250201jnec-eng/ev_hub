/**
 * EV Hub - OCPP Simulation Server
 * Mimics real OCPP 1.6/2.0 charger behavior via Firebase Realtime writes.
 * Runs as a standalone Node.js service.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');

// ─── Firebase Admin SDK ────────────────────────────────────────────────────────
let db;
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Fallback: use application default credentials (works in Cloud environments)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  db = admin.firestore();
  console.log('[Firebase] Admin SDK initialized.');
} catch (err) {
  console.warn('[Firebase] Admin SDK init failed – running in LOCAL SIMULATION mode:', err.message);
  db = null;
}

// ─── Express + Socket.IO ───────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── OCPP Station Definitions (mirrors Firestore stations) ────────────────────
const STATIONS = [
  { id: 'st-001', name: 'Bhutan Post Corporation Parking' },
  { id: 'st-002', name: 'Paro Airport EV Hub' },
  { id: 'st-003', name: 'Punakha Dzong Eco Charger' },
  { id: 'st-004', name: 'Phuentsholing Border Charger' },
  { id: 'st-005', name: 'Bumthang Valley Charging' },
  { id: 'st-006', name: 'Wangdue Phodrang Station' },
  { id: 'st-007', name: 'Trongsa Dzong Hub' },
  { id: 'st-008', name: 'Mongar Town Station' },
  { id: 'st-009', name: 'Trashigang District Hub' },
  { id: 'st-010', name: 'Samdrup Jongkhar Center' },
  { id: 'st-011', name: 'Gelephu City Hub' },
  { id: 'st-012', name: 'Haa Valley Charging' },
  { id: 'st-013', name: 'Samtse Border Hub' },
  { id: 'st-014', name: 'JNEC Solar Charging Hub' },
];

// In-memory state mirror for all stations
const stationState = {};
STATIONS.forEach(s => {
  stationState[s.id] = {
    id: s.id,
    name: s.name,
    status: 'available',
    connectorStatus: 'Available',
    sessionId: null,
    energyDelivered: 0,     // kWh
    sessionStartTime: null,
    heartbeatInterval: null,
    ocppLog: [],
  };
});

// ─── OCPP Event Helpers ────────────────────────────────────────────────────────
const STATUS_SEQUENCE = ['available', 'reserved', 'charging', 'available'];
const STATUS_COLORS = {
  available: '#10b981',
  reserved: '#3b82f6',
  charging: '#f59e0b',
  idle: '#f97316',
  offline: '#ef4444',
};

function log(stationId, action, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    stationId,
    action,
    payload,
  };
  if (stationState[stationId]) {
    stationState[stationId].ocppLog.unshift(entry);
    // Keep last 20 log entries per station
    stationState[stationId].ocppLog = stationState[stationId].ocppLog.slice(0, 20);
  }
  // Broadcast to admin dashboard via Socket.IO
  io.emit('ocpp_event', entry);
  console.log(`[OCPP] [${stationId}] ${action}`, payload);
}

async function writeToFirestore(stationId, updates) {
  if (!db) return; // local simulation only
  try {
    await db.collection('stations').doc(stationId).update({
      ...updates,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Station might not exist yet – silently skip
  }
}

// ─── OCPP Simulation State Machine ─────────────────────────────────────────────
function simulateBootNotification(stationId) {
  const state = stationState[stationId];
  log(stationId, 'BootNotification', {
    chargePointModel: 'EV-SIM-v2',
    chargePointVendor: 'EVHub Labs',
    firmwareVersion: '2.1.0',
  });
  writeToFirestore(stationId, { status: state.status });
}

function simulateHeartbeat(stationId) {
  log(stationId, 'Heartbeat', { currentTime: new Date().toISOString() });
}

function simulateStatusChange(stationId, newStatus) {
  const state = stationState[stationId];
  const prevStatus = state.status;

  // RULE: If station is charging (plugged in), it cannot become available via status notification
  if (state.sessionId && newStatus === 'available') {
    console.log(`[OCPP] [${stationId}] BLOCKED: Status change to available rejected (EV still plugged in)`);
    return;
  }

  state.status = newStatus;
  log(stationId, 'StatusNotification', {
    connectorId: 1,
    errorCode: 'NoError',
    status: newStatus,
    prevStatus,
  });

  writeToFirestore(stationId, { status: newStatus });

  // Broadcast live update to all connected clients
  io.emit('station_status_update', {
    stationId,
    status: newStatus,
    color: STATUS_COLORS[newStatus],
    timestamp: Date.now(),
  });
}

function simulateStartTransaction(stationId) {
  const state = stationState[stationId];
  const sessionId = `sess-${stationId}-${Date.now()}`;
  state.sessionId = sessionId;
  state.sessionStartTime = Date.now();
  state.energyDelivered = 0;
  state.reached100Time = null;
  state.userId = null;

  log(stationId, 'StartTransaction', {
    connectorId: 1,
    transactionId: sessionId,
    meterStart: 0,
  });

  writeToFirestore(stationId, {
    status: 'charging',
    activeSession: {
      sessionId,
      startTime: new Date().toISOString(),
      energyDelivered: 0,
    },
  });

  io.emit('session_started', { stationId, sessionId, startTime: state.sessionStartTime });
}

function simulateStopTransaction(stationId) {
  const state = stationState[stationId];
  const energyTotal = parseFloat((Math.random() * 25 + 5).toFixed(2));
  const duration = state.sessionStartTime ? Date.now() - state.sessionStartTime : 0;

  log(stationId, 'StopTransaction', {
    transactionId: state.sessionId,
    meterStop: energyTotal,
    reason: 'Local',
    duration: Math.round(duration / 1000) + 's',
  });

  // Write completed session to Firestore sessions collection
  if (db && state.sessionId) {
    const sessionIdToUpdate = state.sessionId;
    db.collection('sessions').doc(sessionIdToUpdate).update({
      energyConsumed: energyTotal,
      duration: Math.round(duration / 1000),
      status: 'completed',
      endTime: new Date().toISOString()
    }).then(() => {
      // Find the linked booking and mark it completed too
      return db.collection('sessions').doc(sessionIdToUpdate).get();
    }).then(docSnap => {
      if (docSnap.exists && docSnap.data().bookingId) {
        return db.collection('bookings').doc(docSnap.data().bookingId).update({
          status: 'completed',
          updatedAt: Date.now()
        });
      }
    }).catch(err => console.error('[Simulator] StopTransaction DB error:', err));
  }

  state.sessionId = null;
  state.sessionStartTime = null;
  state.energyDelivered = 0;
  state.reached100Time = null;
  state.userId = null;

  writeToFirestore(stationId, { status: 'available', activeSession: null });
  io.emit('session_stopped', { stationId, energyTotal });
}

// Start a global simulation loop that ticks every 5 seconds to simulate charging progress
setInterval(() => {
  const now = Date.now();
  Object.values(stationState).forEach(state => {
    if (state.status === 'charging' && state.sessionId) {
      // Simulate energy delivery (approx 0.2 to 0.5 kWh per 5 seconds)
      state.energyDelivered += (Math.random() * 0.3 + 0.2);
      
      const durationSecs = (now - state.sessionStartTime) / 1000;
      
      // Broadcast live charging progress to clients
      io.emit('charging_progress', {
         stationId: state.id,
         sessionId: state.sessionId,
         energyDelivered: state.energyDelivered.toFixed(2),
         duration: durationSecs
      });
      
      // Auto-stop logic: simulate reaching 100% after 15 kWh or 60 seconds
      if (state.energyDelivered >= 15 || durationSecs >= 60) {
         if (!state.reached100Time) {
             state.reached100Time = now;
             
             // Send message to user
             io.emit('charging_completed', { 
               stationId: state.id, 
               userId: state.userId, 
               message: 'Your car is fully charged (100%). Please unplug within 5 minutes to avoid idle fees.' 
             });
             
             log(state.id, 'Notification', { message: 'Car reached 100% charge' });
             console.log(`[Simulator] ${state.id} reached 100% charge.`);
         }
         
         // If 5 minutes have passed since reaching 100%
         if (now - state.reached100Time >= 5 * 60 * 1000) {
             console.log(`[Simulator] ${state.id} auto-stopping session (5 min timeout after 100%)`);
             log(state.id, 'Timeout', { message: 'Session auto-stopped due to 5 min idle after 100%' });
             
             // Stop session automatically if user forgot to unplug
             simulateStopTransaction(state.id);
             simulateStatusChange(state.id, 'available');
         }
      }
    }
  });
}, 5000);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
function startSimulator() {
  console.log('[Simulator] Booting OCPP simulation engine...');

  STATIONS.forEach(station => {
    // Boot notification for each simulated station
    setTimeout(() => {
      simulateBootNotification(station.id);

      // Start heartbeat every 30 seconds
      stationState[station.id].heartbeatInterval = setInterval(() => {
        simulateHeartbeat(station.id);
      }, 30000);

      // Automatic state cycling is replaced by the global setInterval

    }, Math.random() * 5000);
  });

  console.log(`[Simulator] ${STATIONS.length} virtual stations initialized.`);
}

// ─── REST API ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    simulator: 'running',
    stations: STATIONS.length,
    uptime: process.uptime(),
  });
});

app.get('/api/stations', (req, res) => {
  const state = Object.values(stationState).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    sessionId: s.sessionId,
    energyDelivered: s.energyDelivered,
    sessionStartTime: s.sessionStartTime,
    lastLog: s.ocppLog[0] || null,
  }));
  res.json(state);
});

app.get('/api/ocpp-log', (req, res) => {
  const allLogs = Object.values(stationState)
    .flatMap(s => s.ocppLog)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 200);
  res.json(allLogs);
});

// Admin override: force a station status
const hardwareToLogicalStation = {};

app.post('/api/admin/override', async (req, res) => {
  let { stationId, status, battery } = req.body;

  if (hardwareToLogicalStation[stationId]) {
    const mappedId = hardwareToLogicalStation[stationId];
    console.log(`[IoT-Hackathon] Translating incoming ${stationId} to ${mappedId}`);
    stationId = mappedId;
    if (status === 'available') {
      delete hardwareToLogicalStation[req.body.stationId];
    }
  }

  if (!stationState[stationId]) {
    return res.status(404).json({ error: 'Station not found' });
  }
  
  if (battery !== undefined) {
    if (status === 'charging') {
      if (battery >= 100) {
        // Battery full! Auto-complete the session
        if (stationState[stationId].status !== 'available') {
          console.log(`[IoT] Battery 100%. Entering Grace Period for ${stationId}.`);
          await handleChargeCompleted(stationId);
        }
        return res.json({ success: true, stationId, newStatus: 'idle', note: 'Entered Grace Period at 100%' });
      } else {
        // Normal charging: only trigger plug if not already charging
        if (stationState[stationId].status !== 'charging') {
          await handleChargerPlugged(stationId);
        }
      }
    } else if (status === 'available') {
      if (stationState[stationId].status !== 'available') {
        await handleChargerUnplugged(stationId);
      }
    }
    return res.json({ success: true, stationId, newStatus: status, note: 'Triggered hardware plug flow' });
  }

  simulateStatusChange(stationId, status);
  res.json({ success: true, stationId, newStatus: status });
});

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
    let targetStationId = stationId;
    let stationDoc = await db.collection('stations').doc(targetStationId).get();
    let stationData = stationDoc.exists ? stationDoc.data() : null;
    let pendingUserId = stationData ? stationData.plugInUser : null;
    let pendingUserName = stationData ? stationData.plugInUserName : null;

    // ── HACKATHON FORGIVENESS: If this station has no pending user, search ALL stations ──
    if (!pendingUserId) {
      const allPlugInStations = await db.collection('stations').where('status', '==', 'plug_in').get();
      if (!allPlugInStations.empty) {
        const foundDoc = allPlugInStations.docs[0];
        targetStationId = foundDoc.id;
        stationData = foundDoc.data();
        pendingUserId = stationData.plugInUser;
        pendingUserName = stationData.plugInUserName;
        console.log(`[IoT-Hackathon] Rerouting plug event from ${stationId} to ${targetStationId}`);
        hardwareToLogicalStation[stationId] = targetStationId;
      }
    }

    // ── FALLBACK: Still no pre-registered user ──
    if (!pendingUserId) {
      console.warn(`[IoT] No pending user anywhere — starting guest session via in-memory sim for ${stationId}`);
      simulateStartTransaction(stationId);
      simulateStatusChange(stationId, 'charging');
      return;
    }

    console.log(`[IoT] Starting session for user: ${pendingUserName} (${pendingUserId}) at ${targetStationId}`);

    // 2. Find the active booking for this user
    let linkedBookingId = null;
    const bookingsSnapshot = await db.collection('bookings')
      .where('userId', '==', pendingUserId)
      .where('stationId', '==', targetStationId)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    // 3. Generate session ID
    const sessionId = `sess-${targetStationId}-${Date.now()}`;
    const startTime = new Date().toISOString();

    const writePromises = [];

    if (!bookingsSnapshot.empty) {
      const bDoc = bookingsSnapshot.docs[0];
      linkedBookingId = bDoc.id;
      writePromises.push(
        db.collection('bookings').doc(linkedBookingId).update({
          status: 'active',
          updatedAt: Date.now()
        })
      );
    }

    // 4. Create the active session document
    writePromises.push(
      db.collection('sessions').doc(sessionId).set({
        sessionId,
        stationId: targetStationId,
        stationName: stationData.name || targetStationId,
        userId: pendingUserId,
        userName: pendingUserName,
        bookingId: linkedBookingId, // Link the booking
        status: 'active',
        startTime,
        energyDelivered: 0,
        source: 'iot-hardware',
      })
    );

    // 4. Update the station to charging state
    writePromises.push(
      db.collection('stations').doc(targetStationId).update({
        status: 'charging',
        plugInUser: null,
        plugInUserName: null,
        activeSessionId: sessionId,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    // Execute all database writes concurrently for maximum speed
    await Promise.all(writePromises);

    // 5. Update in-memory state & broadcast
    if (stationState[targetStationId]) {
      stationState[targetStationId].status = 'charging';
      stationState[targetStationId].sessionId = sessionId;
      stationState[targetStationId].sessionStartTime = Date.now();
      stationState[targetStationId].userId = pendingUserId;
      stationState[targetStationId].energyDelivered = 0;
      stationState[targetStationId].reached100Time = null;
    }

    io.emit('station_status_update', {
      stationId: targetStationId,
      status: 'charging',
      color: STATUS_COLORS['charging'],
      timestamp: Date.now(),
    });

    io.emit('session_started', { stationId: targetStationId, sessionId, userId: pendingUserId, startTime });
    console.log(`[IoT] Session ${sessionId} started successfully for ${pendingUserName}`);

  } catch (err) {
    console.error('[IoT] charger_plugged handler error:', err.message);
  }
}


async function handleChargeCompleted(stationId) {
  console.log(`[IoT] Charge 100% at ${stationId}. Entering idle state.`);
  log(stationId, 'IoT_Complete', { source: 'Hardware', stationId });

  // Do the same billing logic as unplugged, but set status to idle
  await processSessionCompletion(stationId, 'idle');
}

async function handleChargerUnplugged(stationId) {
  console.log(`[IoT] Physical unplug detected at station: ${stationId}`);
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
            console.log(`[IoT] Deducted Nu ${energyCost} from ${userId}. New balance: Nu ${newCredits}`);
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


// ─── Socket.IO events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);

  // Send current state snapshot on connect
  socket.emit('state_snapshot', Object.values(stationState).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    sessionId: s.sessionId,
    energyDelivered: s.energyDelivered,
  })));

  socket.on('admin_override', ({ stationId, status }) => {
    if (stationState[stationId]) {
      simulateStatusChange(stationId, status);
    }
  });

  socket.on('simulate_event', ({ stationId, event }) => {
    if (stationState[stationId]) {
      const prevState = stationState[stationId].status;
      console.log(`[Demo] Manual event trigger: ${event} for ${stationId} (Prev: ${prevState})`);

      if (event === 'plug_in') {
        if (prevState === 'reserved') {
          log(stationId, 'Alert', { message: 'Conflict: Physical connection detected on reserved station!' });
          io.emit('reservation_conflict', { stationId });
        } else {
          log(stationId, 'Notification', { message: 'Guest session started (Physical plug-in on available station)' });
        }
        simulateStartTransaction(stationId);
        simulateStatusChange(stationId, 'charging');
      } else if (event === 'unplug') {
        simulateStopTransaction(stationId);
        simulateStatusChange(stationId, 'available');
      } else if (event === 'set_available') {
        simulateStatusChange(stationId, 'available');
      } else if (event === 'set_occupied') {
        simulateStatusChange(stationId, 'charging');
      }
    }
  });

  // ── Physical IoT Plug Events (from ESP32 / Wokwi hardware node) ──────────────
  socket.on('charger_plugged', async ({ stationId }) => {
    await handleChargerPlugged(stationId);
  });

  socket.on('charger_unplugged', async ({ stationId }) => {
    await handleChargerUnplugged(stationId);
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] EV Hub OCPP Simulator running on http://localhost:${PORT}`);
  startSimulator();

  
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
                console.log(`[IdleFee] Charged Nu 5 to ${userId} for station ${stationId}. New balance: Nu ${newCredits}`);
              }
            } catch(e) { console.error('Idle fee error', e); }
          }
          // Reset the timer so it charges again in 30 seconds
          state.idleStartTime = now;
        }
      }
    }
  }, 5000); // Check every 5 seconds


  // ── Keep-Alive Self-Ping (prevents Render free tier from sleeping) ──────────
  // Pings itself every 10 minutes so the server stays warm during demo
  setInterval(async () => {
    try {
      const http = require('http');
      const https = require('https');
      const url = SERVER_URL.startsWith('https') ? https : http;
      url.get(`${SERVER_URL}/health`, (res) => {
        console.log(`[KeepAlive] Self-ping OK — status: ${res.statusCode}`);
      }).on('error', (e) => {
        console.warn('[KeepAlive] Self-ping failed:', e.message);
      });
    } catch (e) {
      console.warn('[KeepAlive] Ping error:', e.message);
    }
  }, 10 * 60 * 1000); // every 10 minutes
});
