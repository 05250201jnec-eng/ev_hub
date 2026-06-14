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
  { id: 'st-001', name: 'Thimphu City Center Charging Hub' },
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
app.post('/api/admin/override', async (req, res) => {
  const { stationId, status } = req.body;
  if (!stationState[stationId]) {
    return res.status(404).json({ error: 'Station not found' });
  }
  simulateStatusChange(stationId, status);
  res.json({ success: true, stationId, newStatus: status });
});

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
    console.log(`[IoT] Physical plug-in detected at station: ${stationId}`);
    log(stationId, 'IoT_PlugIn', { source: 'ESP32', stationId });

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
      // Allow the physical plug to still start a guest/walk-in session so the
      // Wokwi switch always triggers a visible charging state change.
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
        source: 'iot-esp32',
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
  });

  socket.on('charger_unplugged', async ({ stationId }) => {
    console.log(`[IoT] Physical unplug detected at station: ${stationId}`);
    log(stationId, 'IoT_Unplug', { source: 'ESP32', stationId });

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
