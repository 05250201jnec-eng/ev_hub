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
    db.collection('sessions').doc(state.sessionId).set({
      stationId,
      sessionId: state.sessionId,
      energyConsumed: energyTotal,
      duration: Math.round(duration / 1000),
      status: 'completed',
      startTime: new Date(state.sessionStartTime).toISOString(),
      endTime: new Date().toISOString(),
      source: 'ocpp-simulator',
    }).catch(() => { });
  }

  state.sessionId = null;
  state.sessionStartTime = null;
  state.energyDelivered = 0;

  writeToFirestore(stationId, { status: 'available', activeSession: null });
  io.emit('session_stopped', { stationId, energyTotal });
}

// ─── Main Simulation Loop ─────────────────────────────────────────────────────
const CYCLE_MS = {
  available: 15000,   // Stay available for 15s
  reserved: 8000,     // Reserved for 8s
  charging: 30000,    // Charging for 30s
};

let statusIndexes = {};
STATIONS.forEach(s => { statusIndexes[s.id] = 0; });

function runSimulationCycle(stationId) {
  // Automatic cycling DISABLED. Only manual triggers allowed.
  console.log(`[Simulator] ${stationId} ready for manual control.`);
}

function tickStation(stationId) {
  // Manual mode: No automatic ticking.
}

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

      // Kick off the state machine
      runSimulationCycle(station.id);
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

  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] EV Hub OCPP Simulator running on http://localhost:${PORT}`);
  startSimulator();
});
