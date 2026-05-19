import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { 
  Power, 
  Play, 
  Square, 
  RefreshCw, 
  Unlock, 
  Zap, 
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { collection, addDoc, doc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const RemoteControl = () => {
  const { stations } = useAdminContext();
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [isActing, setIsActing] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChargers = stations.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createSystemNotification = async (title, msg, type = 'info') => {
    try {
      await addDoc(collection(db, 'system_notifications'), {
        title, msg, type,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) { console.error('Failed to create system notification:', e); }
  };

  const handleAction = async (actionName) => {
    if (!selectedCharger) return;
    setIsActing(true);
    setLastAction(null);
    
    // Simulate OCPP remote command
    setTimeout(async () => {
      setIsActing(false);
      setLastAction({ action: actionName, status: 'success', time: new Date().toLocaleTimeString() });

      if (actionName === 'Reset') {
        // Resolve System Failure if station was offline
        await updateDoc(doc(db, 'stations', selectedCharger.id), { 
          status: 'available', 
          lastUpdated: Date.now() 
        });
        
        createSystemNotification(
          'System Resolved', 
          `${selectedCharger.name} has been successfully reset and is now ONLINE.`,
          'success'
        );
      } else if (actionName === 'RemoteStartTransaction') {
        await updateDoc(doc(db, 'stations', selectedCharger.id), { 
          status: 'charging', 
          lastUpdated: Date.now() 
        });
        createSystemNotification(
          'Session Started', 
          `Remote Start successful on ${selectedCharger.name}.`,
          'success'
        );
      } else if (actionName === 'RemoteStopTransaction') {
        await updateDoc(doc(db, 'stations', selectedCharger.id), { 
          status: 'available', 
          lastUpdated: Date.now() 
        });
        createSystemNotification(
          'Session Stopped', 
          `Remote Stop successful on ${selectedCharger.name}.`,
          'info'
        );
      } else if (actionName === 'UnlockConnector') {
        await updateDoc(doc(db, 'stations', selectedCharger.id), { 
          status: 'available', 
          lastUpdated: Date.now() 
        });

        // Clear fault logs for this station
        try {
          const q = query(
            collection(db, 'ocpp_logs'), 
            where('stationId', '==', selectedCharger.id),
            where('payload.status', '==', 'Faulted')
          );
          const snap = await getDocs(q);
          const batch = snap.docs.map(d => deleteDoc(doc(db, 'ocpp_logs', d.id)));
          await Promise.all(batch);
        } catch (e) { console.error('Failed to clear station logs:', e); }

        createSystemNotification(
          'Connector Unlocked', 
          `${selectedCharger.name} connector has been unlocked remotely and is now AVAILABLE.`,
          'success'
        );
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Power className="text-primary" size={28} />
          Remote Charger Control
        </h1>
        <p className="text-gray-400 text-sm">Send JSON-RPC commands to chargers via OCPP Central System.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charger Selection List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              placeholder="Search charger ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          <div className="glass rounded-2xl border border-white/5 divide-y divide-border overflow-hidden">
            {filteredChargers.length > 0 ? filteredChargers.map(charger => (
              <button
                key={charger.id}
                onClick={() => setSelectedCharger(charger)}
                className={`w-full p-4 flex items-center justify-between transition-all hover:bg-white/5 ${
                  selectedCharger?.id === charger.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                }`}
              >
                <div className="text-left">
                  <p className="font-bold text-sm">{charger.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{charger.id}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  charger.status === 'available' ? 'bg-emerald-500' :
                  ['charging', 'occupied'].includes(charger.status) ? 'bg-primary animate-pulse' : 'bg-gray-600'
                }`} />
              </button>
            )) : (
              <div className="p-8 text-center text-gray-500 text-xs italic">No matching chargers found</div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="lg:col-span-2">
          {selectedCharger ? (
            <div className="glass rounded-3xl p-8 border border-white/5 space-y-8 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedCharger.name}</h2>
                  <p className="text-gray-400 font-mono text-sm">OCPP Identity: {selectedCharger.id}</p>
                </div>
                <div className="px-4 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
                  Connected
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  disabled={isActing}
                  onClick={() => handleAction('RemoteStartTransaction')}
                  className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-3 group hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                    <Play size={24} fill="currentColor" />
                  </div>
                  <span className="font-bold text-sm">Remote Start</span>
                </button>

                <button 
                  disabled={isActing}
                  onClick={() => handleAction('RemoteStopTransaction')}
                  className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col items-center gap-3 group hover:bg-rose-500/20 transition-all disabled:opacity-50"
                >
                  <div className="p-3 bg-rose-500/20 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                    <Square size={24} fill="currentColor" />
                  </div>
                  <span className="font-bold text-sm">Remote Stop</span>
                </button>

                <button 
                  disabled={isActing}
                  onClick={() => handleAction('Reset')}
                  className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-3 group hover:bg-amber-500/20 transition-all disabled:opacity-50"
                >
                  <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                    <RefreshCw size={24} />
                  </div>
                  <span className="font-bold text-sm">Soft Reset</span>
                </button>

                <button 
                  disabled={isActing}
                  onClick={() => handleAction('UnlockConnector')}
                  className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col items-center gap-3 group hover:bg-blue-500/20 transition-all disabled:opacity-50"
                >
                  <div className="p-3 bg-blue-500/20 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                    <Unlock size={24} />
                  </div>
                  <span className="font-bold text-sm">Unlock Connector</span>
                </button>
              </div>

              {isActing && (
                <div className="absolute inset-0 bg-bg-secondary/60 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="font-bold text-lg animate-pulse">Transmitting OCPP Command...</p>
                  </div>
                </div>
              )}

              {lastAction && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <p className="text-sm font-medium">Command <span className="font-mono text-primary">{lastAction.action}</span> executed successfully.</p>
                  </div>
                  <span className="text-xs text-gray-500">{lastAction.time}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center glass rounded-3xl border border-dashed border-border p-12 text-center text-gray-500">
              <Zap size={48} className="mb-4 opacity-20" />
              <p>Select a charging station from the list to enable remote control panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemoteControl;
