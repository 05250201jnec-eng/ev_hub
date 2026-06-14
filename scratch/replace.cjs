const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');
const newFuncs = fs.readFileSync('scratch/refactor.js', 'utf8');

// Replace the /api/admin/override
const overrideTarget = `app.post('/api/admin/override', async (req, res) => {
  const { stationId, status } = req.body;
  if (!stationState[stationId]) {
    return res.status(404).json({ error: 'Station not found' });
  }
  simulateStatusChange(stationId, status);
  res.json({ success: true, stationId, newStatus: status });
});`;

const overrideReplacement = `app.post('/api/admin/override', async (req, res) => {
  const { stationId, status, battery } = req.body;
  if (!stationState[stationId]) {
    return res.status(404).json({ error: 'Station not found' });
  }
  
  if (battery !== undefined) {
    if (status === 'charging') {
      await handleChargerPlugged(stationId);
    } else if (status === 'available') {
      await handleChargerUnplugged(stationId);
    }
    return res.json({ success: true, stationId, newStatus: status, note: 'Triggered hardware plug flow' });
  }

  simulateStatusChange(stationId, status);
  res.json({ success: true, stationId, newStatus: status });
});`;

code = code.replace(overrideTarget, overrideReplacement);

// Inject functions before io.on
code = code.replace('// ─── Socket.IO events', newFuncs + '\n\n// ─── Socket.IO events');

// Instead of regex, we can just replace the whole section from "socket.on('charger_plugged'" to the end of charger_unplugged.
const startIndex = code.indexOf(`socket.on('charger_plugged', async ({ stationId }) => {`);
const endStr = `// 5. Reset the station state
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
  });`;
const endIndex = code.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newSocketEvents = `socket.on('charger_plugged', async ({ stationId }) => {
    await handleChargerPlugged(stationId);
  });

  socket.on('charger_unplugged', async ({ stationId }) => {
    await handleChargerUnplugged(stationId);
  });`;
  
  code = code.substring(0, startIndex) + newSocketEvents + code.substring(endIndex);
} else {
  console.error("Could not find start/end bounds for socket replacement");
}

fs.writeFileSync('server/index.js', code);
console.log('Refactoring complete!');
