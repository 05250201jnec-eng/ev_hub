import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import {
  Wifi, WifiOff, Activity, Terminal, Zap, CheckCircle,
  AlertTriangle, Radio, RefreshCw, Clock
} from 'lucide-react';

const ACTION_COLORS = {
  Heartbeat:           '#3b82f6',
  StatusNotification:  '#10b981',
};

const STATUS_COLOR = {
  available: '#10b981',
  reserved:  '#3b82f6',
  charging:  '#f59e0b',
  occupied:  '#f59e0b',
  offline:   '#64748b',
};

const STATION_IDS = [
  'st-001','st-002','st-003','st-004','st-005','st-006','st-007',
  'st-008','st-009','st-010','st-011','st-012','st-013','st-014',
];

const OCPP = () => {
  const { ocppLog, simulatorStatus, stations, overrideStationStatus } = useAdminContext();
  const [filter, setFilter]             = useState('all');
  const [overrideStation, setOverrideStation] = useState('');
  const [overrideStatus, setOverrideStatus]   = useState('available');
  const [overriding, setOverriding]           = useState(false);
  const [overrideMsg, setOverrideMsg]         = useState('');

  const filteredLog = filter === 'all'
    ? ocppLog
    : ocppLog.filter(e => e.action === filter);

  const handleOverride = async () => {
    if (!overrideStation) return;
    setOverriding(true);
    await overrideStationStatus(overrideStation, overrideStatus);
    setOverrideMsg(`✅ ${overrideStation} → ${overrideStatus}`);
    setOverriding(false);
    setTimeout(() => setOverrideMsg(''), 3000);
  };

  const actionCounts = ocppLog.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            OCPP Simulator
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Virtual charger events — Open Charge Point Protocol
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1.1rem', borderRadius: '999px',
          background: simulatorStatus === 'connected' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
          border: `1px solid ${simulatorStatus === 'connected' ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.25)'}`,
          fontSize: '0.8125rem', fontWeight: 700,
        }}>
          {simulatorStatus === 'connected'
            ? <><Wifi size={14} style={{ color: '#10b981' }} /><span style={{ color: '#10b981' }}>Simulator Connected</span></>
            : <><WifiOff size={14} style={{ color: '#64748b' }} /><span style={{ color: '#64748b' }}>Simulator Inactive</span></>
          }
        </div>
      </div>

      {/* ── Event Counts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {Object.entries(ACTION_COLORS).map(([action, color]) => (
          <div key={action} className="glass p-4 rounded-2xl" style={{
            padding: '1rem 1.25rem', borderRadius: 16,
            borderLeft: `3px solid ${color}`,
          }}>
            <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
              {action}
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{actionCounts[action] || 0}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Event Log */}
        <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
          {/* Log header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} color="#3b82f6" /> Live OCPP Event Log
            </h2>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {['all', ...Object.keys(ACTION_COLORS)].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                  background: filter === f ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                  color: filter === f ? 'white' : '#64748b',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Log entries */}
          <div style={{ maxHeight: 480, overflowY: 'auto', padding: '0.75rem' }}>
            {filteredLog.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
                <Radio size={32} style={{ margin: '0 auto 1rem', display: 'block' }} />
                <p style={{ fontWeight: 600 }}>Waiting for OCPP events...</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.375rem' }}>Start the simulator server to see live data.</p>
              </div>
            ) : filteredLog.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
                padding: '0.875rem', borderRadius: 12, marginBottom: '0.375rem',
                background: 'rgba(255,255,255,0.025)',
                borderLeft: `3px solid ${ACTION_COLORS[entry.action] || '#475569'}`,
              }}>
                <div style={{
                  padding: '0.375rem', borderRadius: 8, flexShrink: 0,
                  background: `${ACTION_COLORS[entry.action] || '#475569'}22`,
                }}>
                  {entry.action === 'Heartbeat' && <Activity size={16} color={ACTION_COLORS[entry.action]} />}
                  {entry.action === 'StatusNotification' && <Radio size={16} color={ACTION_COLORS[entry.action]} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: ACTION_COLORS[entry.action] || '#e2e8f0' }}>
                      {entry.action}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={11} />
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                    [{entry.stationId}] {JSON.stringify(entry.payload).slice(0, 80)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Live Station Status */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Station States</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto' }}>
              {stations.map(s => (
                <div key={s.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.875rem', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: `3px solid ${STATUS_COLOR[s.status] || '#475569'}`,
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {s.name || s.id}
                  </span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: STATUS_COLOR[s.status] || '#475569',
                  }}>
                    {s.status === 'offline' ? 'Inactive' : (s.status || 'unknown')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCPP;
