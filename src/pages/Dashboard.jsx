import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  BatteryCharging, Clock, CreditCard, Zap, Radio, MapPin,
  RefreshCw, Activity, TrendingUp, ChevronRight, Wifi, WifiOff,
  Play, Square, Timer, Bolt
} from 'lucide-react';

const timeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

const formatDuration = (startTime) => {
  if (!startTime) return '00:00';
  const secs = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const StatCard = ({ icon, label, value, gradient, sub }) => (
  <div className="stat-card glass" style={{
    padding: '1.5rem',
    borderRadius: 'var(--radius-lg)',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    minWidth: '200px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{
      background: gradient,
      padding: '1rem',
      borderRadius: 'var(--radius-md)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    }}>
      {icon}
    </div>
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{value}</h3>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{sub}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const { user, stations, loading, simulatorStatus, activeSession, startSession, stopSession } = useAppContext();
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const [sessionTicker, setSessionTicker] = useState('00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(n => n + 1);
      if (activeSession?.startTime) {
        setSessionTicker(formatDuration(activeSession.startTime));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  const available = stations.filter(s => s.status === 'available' || s.status === 'reserved').length;
  const charging = stations.filter(s => s.status === 'charging' || s.status === 'occupied').length;
  const reserved = stations.filter(s => s.status === 'reserved').length;
  const offline = stations.filter(s => s.status === 'offline').length;

  const recentStations = [...stations]
    .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
    .slice(0, 6);

  const statusColor = {
    available: 'var(--status-available)',
    charging: 'var(--status-charging)',
    occupied: 'var(--status-charging)',
    reserved: 'var(--status-reserved)',
    offline: 'var(--status-offline)',
  };

  const statusBg = {
    available: 'rgba(16,185,129,0.1)',
    charging: 'rgba(245,158,11,0.1)',
    occupied: 'rgba(245,158,11,0.1)',
    reserved: 'rgba(59,130,246,0.1)',
    offline: 'rgba(239,68,68,0.1)',
  };

  const statusLabel = s => {
    if (s === 'charging' || s === 'occupied') return 'CHARGING';
    return s.toUpperCase();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.375rem', letterSpacing: '-0.02em' }}>
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0] || 'Traveler'}</span> ⚡
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Real-time Bhutan EV network — <strong style={{ color: 'var(--text-primary)' }}>{stations.length}</strong> stations monitored
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Simulator Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
            background: simulatorStatus === 'connected' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.15)',
            border: `1px solid ${simulatorStatus === 'connected' ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}`,
            fontSize: '0.8125rem', fontWeight: 600,
          }}>
            {simulatorStatus === 'connected'
              ? <><Wifi size={14} style={{ color: 'var(--status-available)' }} /><span style={{ color: 'var(--status-available)' }}>OCPP Live</span></>
              : <><WifiOff size={14} style={{ color: 'var(--text-secondary)' }} /><span style={{ color: 'var(--text-secondary)' }}>Simulator</span></>}
          </div>
          {/* Live dot */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <span className="live-dot" />
            <span style={{ color: 'var(--status-available)', fontWeight: 700, fontSize: '0.8125rem' }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* ── Active Session Banner ── */}
      {activeSession && (
        <div className="glass animate-fade-in" style={{
          padding: '1.25rem 1.75rem',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08))',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={22} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                Charging in Progress
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                {activeSession.stationName}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{sessionTicker}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duration</p>
            </div>
            <button
              onClick={() => stopSession(activeSession.id, activeSession.stationId)}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                fontWeight: 700, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            >
              <Square size={14} /> Stop Session
            </button>
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <StatCard
          icon={<Zap size={22} color="white" />}
          label="Available"
          value={available}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          sub="Ready to charge"
        />
        <StatCard
          icon={<BatteryCharging size={22} color="white" />}
          label="Charging Now"
          value={charging}
          gradient="linear-gradient(135deg, #f59e0b, #f97316)"
          sub={`${reserved} reserved`}
        />
        <StatCard
          icon={<Radio size={22} color="white" />}
          label="Offline"
          value={offline}
          gradient="linear-gradient(135deg, #ef4444, #dc2626)"
          sub="Needs attention"
        />
        <StatCard
          icon={<Activity size={22} color="white" />}
          label="Total Stations"
          value={stations.length}
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          sub="Bhutan network"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>

        {/* Live Station Grid */}
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} color="var(--accent-primary)" />
              Live Station Monitor
            </h2>
            <button
              onClick={() => navigate('/map')}
              style={{
                fontSize: '0.8125rem', color: 'var(--accent-primary)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer',
                background: 'none', border: 'none',
              }}
            >
              View Map <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem' }}>
            {recentStations.map(station => (
              <div
                key={station.id}
                onClick={() => navigate('/map')}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${statusColor[station.status] || 'var(--text-secondary)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, lineHeight: 1.4, maxWidth: '170px' }}>
                    {station.name}
                  </h4>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.6875rem', fontWeight: 700,
                    background: statusBg[station.status] || 'rgba(100,116,139,0.1)',
                    color: statusColor[station.status] || 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}>
                    {statusLabel(station.status || 'offline')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                  <MapPin size={11} />
                  <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {station.location?.address || 'Bhutan'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  <span>{station.connectors?.filter(c => c.status === 'available').length || 0}/{station.connectors?.length || 1} free</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <RefreshCw size={10} /> {timeAgo(station.lastUpdated)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Quick Actions */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/map')}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'flex-start', gap: '0.75rem' }}
              >
                <MapPin size={18} /> Find Charging Station
              </button>
              <button
                onClick={() => navigate('/bookings')}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', gap: '0.75rem' }}
              >
                <Clock size={18} /> My Reservations
              </button>
            </div>
          </div>

          {/* Network Status Summary */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Network Health</h2>
            {[
              { label: 'Available', count: available, total: stations.length, color: '#10b981' },
              { label: 'In Use', count: charging, total: stations.length, color: '#f59e0b' },
              { label: 'Offline', count: offline, total: stations.length, color: '#ef4444' },
            ].map(({ label, count, total, color }) => (
              <div key={label} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{count}/{total}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${total > 0 ? (count / total) * 100 : 0}%`,
                    background: color, borderRadius: 99,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Sessions */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Sessions</h2>
            {(user?.history || []).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
                No sessions yet. Start charging!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(user.history || []).slice(0, 3).map((item) => (
                  <div key={item.id} style={{
                    background: 'var(--bg-tertiary)',
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--accent-primary)',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>{item.station}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      <span>{item.energy} • {item.duration}</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{item.cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
