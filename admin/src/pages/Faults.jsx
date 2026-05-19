import React, { useMemo } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { 
  AlertTriangle, 
  Activity, 
  Search, 
  Filter, 
  Clock, 
  Settings,
  ShieldAlert,
  Info
} from 'lucide-react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Faults = () => {
  const { stations, ocppLog } = useAdminContext();

  const handleClearFaults = async () => {
    try {
      const q = query(collection(db, 'ocpp_logs'), where('payload.status', '==', 'Faulted'));
      const snap = await getDocs(q);
      const batch = snap.docs.map(d => deleteDoc(doc(db, 'ocpp_logs', d.id)));
      await Promise.all(batch);
    } catch (e) {
      console.error('Failed to clear faults:', e);
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const activeFaults = useMemo(() => {
    const list = [];
    
    // Current offline stations are critical faults
    stations.filter(s => s.status === 'offline').forEach(s => {
      list.push({
        id: `F-${s.id}`,
        charger: s.id,
        type: 'SystemFailure',
        severity: 'critical',
        msg: `Communication lost with ${s.name}. Hardware is currently unresponsive.`,
        timestamp: s.lastUpdated || Date.now()
      });
    });

    // Recent StatusNotifications with errors from OCPP log
    ocppLog.filter(log => log.type === 'StatusNotification' && log.payload.status === 'Faulted').forEach(log => {
      list.push({
        id: `LOG-${log.timestamp}`,
        charger: log.stationId,
        type: 'HardwareFault',
        severity: 'high',
        msg: `Hardware error reported: ${log.payload.errorCode || 'Internal Error'}`,
        timestamp: log.timestamp
      });
    });

    return list.sort((a,b) => b.timestamp - a.timestamp);
  }, [stations, ocppLog]);

  const criticalCount = activeFaults.filter(f => f.severity === 'critical').length;
  const highCount = activeFaults.filter(f => f.severity === 'high').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <AlertTriangle className="text-rose-500" size={28} />
            Fault Monitoring
          </h1>
          <p className="text-gray-400 text-sm">Real-time alerts and system diagnostics.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleClearFaults}
            className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all"
          >
            Clear All Resolved
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-2xl border border-rose-500/10 bg-rose-500/5">
          <p className="text-rose-500 text-xs font-bold uppercase mb-2">Critical Faults</p>
          <p className="text-3xl font-bold">{criticalCount}</p>
          <p className="text-rose-400 text-xs mt-2 font-medium">Requires immediate action</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-amber-500/10 bg-amber-500/5">
          <p className="text-amber-500 text-xs font-bold uppercase mb-2">High Severity</p>
          <p className="text-3xl font-bold">{highCount}</p>
          <p className="text-amber-400 text-xs mt-2 font-medium">Connector & Power issues</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Network Stability</p>
          <p className="text-3xl font-bold">{stations.length > 0 ? (stations.filter(s => s.status !== 'offline').length / stations.length * 100).toFixed(0) : 100}%</p>
          <p className="text-emerald-500 text-xs mt-2 font-bold">Live connectivity ratio</p>
        </div>
        <div className="glass p-6 rounded-2xl border border-white/5">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">Event Density</p>
          <p className="text-3xl font-bold">{ocppLog.length}</p>
          <p className="text-gray-500 text-xs mt-2">Active log entries</p>
        </div>
      </div>

      <div className="space-y-4">
        {activeFaults.length > 0 ? activeFaults.map(fault => (
          <div key={fault.id} className={`glass p-6 rounded-2xl border transition-all hover:scale-[1.01] flex items-start gap-6 ${
            fault.severity === 'critical' ? 'border-rose-500/20 bg-rose-500/5' : 
            fault.severity === 'high' ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/10'
          }`}>
            <div className={`p-4 rounded-2xl h-fit ${
              fault.severity === 'critical' ? 'bg-rose-500/20 text-rose-500' :
              fault.severity === 'high' ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-500/20 text-gray-400'
            }`}>
              <ShieldAlert size={28} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                    fault.severity === 'critical' ? 'bg-rose-500 text-white' : 
                    fault.severity === 'high' ? 'bg-amber-500 text-black' : 'bg-gray-600 text-white'
                  }`}>
                    {fault.severity}
                  </span>
                  <h3 className="font-bold text-lg">{fault.type}</h3>
                  <span className="text-gray-500 text-xs font-mono">{fault.charger}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Clock size={14} />
                  {getRelativeTime(fault.timestamp)}
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{fault.msg}</p>
              <div className="flex gap-3 pt-2">
                <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  <Settings size={14} /> Run Diagnostics
                </button>
                <button className="text-xs font-bold text-gray-400 hover:text-white hover:underline flex items-center gap-1">
                  <Info size={14} /> View Details
                </button>
              </div>
            </div>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all self-center text-gray-400">
              Acknowledge
            </button>
          </div>
        )) : (
          <div className="glass p-20 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center opacity-50">
             <Activity size={48} className="mb-4" />
             <p className="font-bold text-lg">No active faults detected</p>
             <p className="text-sm">The network is currently operating within normal parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Faults;
