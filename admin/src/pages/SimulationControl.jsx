import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { 
  Zap, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Info, 
  ArrowRight,
  Database,
  RefreshCw,
  Search,
  Activity,
  AlertCircle,
  Lock
} from 'lucide-react';

import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SimulationControl = () => {
  const { stations, socket, loading } = useAdminContext();
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(null); // stationId-event

  const createSystemNotification = async (title, msg, type = 'info') => {
    try {
      await addDoc(collection(db, 'system_notifications'), {
        title, msg, type,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) { console.error('Failed to create system notification:', e); }
  };

  const handleTrigger = (stationId, event) => {
    if (!socket) {
      alert("Simulator socket not connected!");
      return;
    }
    
    setIsProcessing(`${stationId}-${event}`);
    
    // Emit event to simulator
    socket.emit('simulate_event', { stationId, event });

    // Generate Admin Notifications based on simulation
    const station = stations.find(s => s.id === stationId);
    const stationName = station?.name || stationId;

    if (event === 'plug_in') {
      createSystemNotification('Station Update', `${stationName}: Charging session has been initiated.`, 'success');
      updateDoc(doc(db, 'stations', stationId), { status: 'charging', lastUpdated: Date.now() });
    } else if (event === 'unplug') {
      createSystemNotification('Station Update', `${stationName}: Vehicle has disconnected. Session finalized.`, 'info');
      updateDoc(doc(db, 'stations', stationId), { status: 'available', lastUpdated: Date.now() });
    } else if (event === 'set_offline') {
      createSystemNotification('Critical Alert', `${stationName} has entered a SYSTEM FAILURE state.`, 'alert');
      updateDoc(doc(db, 'stations', stationId), { status: 'offline', lastUpdated: Date.now() });
      // Also add to ocpp_logs for historical tracking in Fault Logs
      addDoc(collection(db, 'ocpp_logs'), {
        stationId,
        type: 'StatusNotification',
        timestamp: Date.now(),
        payload: { status: 'Faulted', errorCode: 'InternalError', info: 'Simulated System Failure' }
      });
    } else if (event === 'connector_issue') {
      createSystemNotification('Hardware Alert', `${stationName} reported a physical connector lock failure.`, 'alert');
      updateDoc(doc(db, 'stations', stationId), { status: 'locked', lastUpdated: Date.now() });
      addDoc(collection(db, 'ocpp_logs'), {
        stationId,
        type: 'StatusNotification',
        timestamp: Date.now(),
        payload: { status: 'Faulted', errorCode: 'ConnectorLockFailure', info: 'Simulated Connector Lock Issue' }
      });
    } else if (event === 'set_occupied') {
      createSystemNotification('Station Update', `${stationName} has been manually set to OCCUPIED.`, 'info');
      updateDoc(doc(db, 'stations', stationId), { status: 'occupied', lastUpdated: Date.now() });
    } else if (event === 'set_available') {
      createSystemNotification('Station Update', `${stationName} is now ONLINE and AVAILABLE.`, 'success');
      updateDoc(doc(db, 'stations', stationId), { status: 'available', lastUpdated: Date.now() });
    }
    
    // Visual feedback delay
    setTimeout(() => {
      setIsProcessing(null);
    }, 1000);
  };

  const filteredStations = stations.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="text-primary" size={32} />
            Simulation Control
          </h1>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <div className="bg-bg-tertiary border border-border rounded-lg px-4 py-2 flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
              <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">Simulator Socket: {socket?.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
           </div>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search virtual stations..."
            className="w-full bg-bg-tertiary border border-border rounded-xl pl-12 pr-4 py-3 text-white focus:border-primary outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           <div className="glass px-4 py-2 rounded-lg text-sm flex-1 md:flex-none text-center">
             <span className="text-gray-500 mr-2">Available:</span>
             <span className="text-green-500 font-bold">{stations.filter(s => s.status === 'available' || s.status === 'reserved').length}</span>
           </div>
           <div className="glass px-4 py-2 rounded-lg text-sm flex-1 md:flex-none text-center">
             <span className="text-gray-500 mr-2">Charging:</span>
             <span className="text-amber-500 font-bold">{stations.filter(s => s.status === 'charging' || s.status === 'occupied').length}</span>
           </div>
        </div>
      </div>

      {/* Grid of Stations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStations.map(station => (
          <div 
            key={station.id} 
            className={`glass p-6 rounded-2xl border transition-all duration-300 ${selectedStation?.id === station.id ? 'border-primary ring-1 ring-primary/50' : 'border-border hover:border-gray-700'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-white text-lg">{station.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">{station.id}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-bg-tertiary/50 px-2 py-1 rounded-full border border-border">
                   <div className={`w-2.5 h-2.5 rounded-full ${
                     station.status === 'available' ? 'bg-green-500 shadow-[0_0_8px_#10b981]' :
                     station.status === 'reserved' ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse' :
                     station.status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' :
                     'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                   }`} />
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Hardware LED</span>
                </div>
                <span className={`status-badge status-${station.status} text-[10px]`}>
                  {station.status === 'offline' ? 'INACTIVE' : station.status.toUpperCase()}
                </span>
              </div>
            </div>

            {station.status === 'reserved' && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <p className="font-bold text-[10px] uppercase tracking-wider">Physical Display: RESERVED</p>
                </div>
                <p className="text-white font-semibold">{station.reservedBy || 'Authorized User'}</p>
                <p className="text-[10px] text-blue-300/70 mt-0.5">Slot: {station.reservedUntil || '9:00 AM'}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleTrigger(station.id, 'plug_in')}
                disabled={station.status === 'charging' || isProcessing === `${station.id}-plug_in`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg-tertiary hover:bg-primary/10 hover:border-primary/30 transition-all group disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-border"
              >
                {isProcessing === `${station.id}-plug_in` ? (
                  <Loader className="animate-spin text-primary mb-2" size={20} />
                ) : (
                  <Zap className="text-primary mb-2 group-hover:scale-110 transition-transform" size={20} />
                )}
                <span className="text-xs font-bold text-white">Plug In</span>
                <span className="text-[10px] text-gray-500 mt-1">Start Session</span>
              </button>

              <button 
                onClick={() => handleTrigger(station.id, 'unplug')}
                disabled={station.status !== 'charging' && station.status !== 'occupied' || isProcessing === `${station.id}-unplug`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg-tertiary hover:bg-red-500/10 hover:border-red-500/30 transition-all group disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-border"
              >
                {isProcessing === `${station.id}-unplug` ? (
                  <Loader className="animate-spin text-red-500 mb-2" size={20} />
                ) : (
                  <Square className="text-red-500 mb-2 group-hover:scale-110 transition-transform" size={20} />
                )}
                <span className="text-xs font-bold text-white">Unplug</span>
                <span className="text-[10px] text-gray-500 mt-1">End Session</span>
              </button>

              <button 
                onClick={() => handleTrigger(station.id, 'set_available')}
                disabled={station.status === 'available' || isProcessing === `${station.id}-set_available`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg-tertiary hover:bg-green-500/10 hover:border-green-500/30 transition-all group disabled:opacity-30"
              >
                <CheckCircle className="text-green-500 mb-2 group-hover:scale-110 transition-transform" size={20} />
                <span className="text-xs font-bold text-white">Available</span>
              </button>

              <button 
                onClick={() => handleTrigger(station.id, 'set_occupied')}
                disabled={station.status === 'occupied' || isProcessing === `${station.id}-set_occupied`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg-tertiary hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group disabled:opacity-30"
              >
                <XCircle className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" size={20} />
                <span className="text-xs font-bold text-white">Occupied</span>
              </button>

              <button 
                onClick={() => handleTrigger(station.id, 'set_offline')}
                disabled={station.status === 'offline' || isProcessing === `${station.id}-set_offline`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg-tertiary hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group disabled:opacity-30"
              >
                <AlertCircle className="text-rose-500 mb-2 group-hover:scale-110 transition-transform" size={20} />
                <span className="text-xs font-bold text-white uppercase">Inactive</span>
              </button>

              <button 
                onClick={() => handleTrigger(station.id, 'connector_issue')}
                disabled={station.status === 'locked' || isProcessing === `${station.id}-connector_issue`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-bg-tertiary hover:bg-orange-500/10 hover:border-orange-500/30 transition-all group disabled:opacity-30"
              >
                <Lock className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" size={20} />
                <span className="text-xs font-bold text-white uppercase">Connector Issue</span>
              </button>
            </div>
            
            {station.status === 'charging' && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center gap-2 animate-pulse">
                <Loader className="animate-spin text-primary" size={14} />
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Active Transaction</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredStations.length === 0 && (
        <div className="glass p-12 rounded-3xl text-center">
          <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-gray-500" size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No stations found</h3>
          <p className="text-gray-400">Try searching for a different name or ID.</p>
        </div>
      )}
    </div>
  );
};

export default SimulationControl;
