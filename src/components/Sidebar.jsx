import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  LayoutDashboard, Map, Calendar, User, LogOut,
  Zap, Shield, Wifi, WifiOff, Activity, Clock, QrCode
} from 'lucide-react';
import QRScannerModal from './QRScannerModal';

const navItems = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/map', icon: <Map size={20} />, label: 'Stations Map' },
  { to: '/schedule', icon: <Clock size={20} />, label: 'Schedule' },
  { to: '/bookings', icon: <Calendar size={20} />, label: 'My Reservations' },
  { to: '/profile', icon: <User size={20} />, label: 'Profile' },
];

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { user, logout, stations, simulatorStatus, activeSession, startSession, addNotification } = useAppContext();
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [batteryPercent, setBatteryPercent] = React.useState(20);
  const [notifiedCompleted, setNotifiedCompleted] = React.useState(false);

  React.useEffect(() => {
    if (!activeSession) {
      setBatteryPercent(20);
      setNotifiedCompleted(false);
      return;
    }

    const calculateBattery = () => {
      const elapsedMs = Date.now() - new Date(activeSession.startTime).getTime();
      const elapsedSec = Math.floor(elapsedMs / 1000);
      // Reach 100% in approx 50 seconds (1.6% per second)
      const currentPct = Math.min(100, 20 + Math.floor(elapsedSec * 1.6));
      setBatteryPercent(currentPct);

      if (currentPct === 100 && !notifiedCompleted) {
        addNotification("⚡ Charging Completed! Your vehicle battery is at 100%.", "success");
        setNotifiedCompleted(true);
      }
    };

    calculateBattery();
    const interval = setInterval(calculateBattery, 1000);
    return () => clearInterval(interval);
  }, [activeSession, notifiedCompleted]);

  const available = stations.filter(s => s.status === 'available' || s.status === 'reserved').length;
  const charging = stations.filter(s => s.status === 'charging' || s.status === 'occupied').length;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          }}>
            <Zap size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.01em' }}>EV Hub</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>BHUTAN NETWORK</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '0 0.5rem', marginBottom: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Navigation
        </p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-sm)',
              marginBottom: '0.25rem',
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500, fontSize: '0.9rem',
              borderLeft: `3px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
              transition: 'all 0.2s',
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.borderLeftColor.includes('3b82f6')) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={e => { if (!e.currentTarget.style.borderLeftColor.includes('3b82f6')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.label === 'My Reservations' && activeSession && (
              <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--status-charging)', animation: 'livePulse 1.5s ease-in-out infinite' }} />
            )}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '1rem 0.5rem 0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Admin
            </p>
            <a href="http://localhost:5177" target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-sm)',
              color: '#8b5cf6', fontWeight: 600, fontSize: '0.9rem',
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)',
              transition: 'all 0.2s',
            }}>
              <Shield size={20} />
              <span>Admin Panel</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.6 }}>↗</span>
            </a>
          </>
        )}
      </nav>

      {/* QR Scanner Button */}
      <button
        onClick={() => setScannerOpen(true)}
        className="btn btn-primary hover-scale"
        style={{
          margin: '0 0.75rem 1rem',
          width: 'calc(100% - 1.5rem)',
          padding: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(57, 255, 20, 0.4)'
        }}
      >
        <QrCode size={20} />
        <span style={{ fontWeight: 800, letterSpacing: '0.02em' }}>Scan Station QR</span>
      </button>

      {/* Active Charging Session Widget */}
      {activeSession && (
        <div style={{
          margin: '0 0.75rem 1rem',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 0 15px rgba(57, 255, 20, 0.15)'
        }}>
          <p style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            color: 'var(--accent-primary)',
            marginBottom: '0.5rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Active Charging</span>
            <span className="live-dot" style={{ background: 'var(--accent-primary)' }} />
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.5rem 0' }}>
            <svg viewBox="0 0 90 32" width="100%" height="45">
              <defs>
                <linearGradient id="car-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset={`${batteryPercent}%`} stopColor="var(--accent-primary)" />
                  <stop offset={`${batteryPercent}%`} stopColor="rgba(255,255,255,0.08)" />
                </linearGradient>
              </defs>
              <path
                d="M10,22 L8,22 C5.8,22 4,20.2 4,18 L4,14 C4,10.7 6.7,8 10,8 L20,8 L28,2 C30,0.5 33,0.5 35,2 L43,8 L76,8 C79.3,8 82,10.7 82,14 L82,18 C82,20.2 80.2,22 78,22 L76,22 C76,18 72,14 67,14 C62,14 58,18 58,22 L32,22 C32,18 28,14 23,14 C18,14 14,18 14,22 Z"
                fill="url(#car-fill)"
                stroke={batteryPercent === 100 ? "var(--accent-primary)" : "rgba(255,255,255,0.2)"}
                strokeWidth="1.5"
              />
              <circle cx="23" cy="22" r="4.5" fill="#080f1e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
              <circle cx="23" cy="22" r="1.5" fill={batteryPercent > 25 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'} />
              <circle cx="67" cy="22" r="4.5" fill="#080f1e" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
              <circle cx="67" cy="22" r="1.5" fill={batteryPercent > 75 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'} />
            </svg>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Battery State</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{batteryPercent}%</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Station:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSession.stationName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Delivered:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(batteryPercent * 0.45).toFixed(1)} kWh</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Stats Mini */}
      <div style={{ margin: '0 0.75rem 0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Network Status</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Available</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-available)' }}>{available}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Charging</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-charging)' }}>{charging}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {simulatorStatus === 'connected'
            ? <><Wifi size={12} color="var(--status-available)" /><span style={{ fontSize: '0.7rem', color: 'var(--status-available)', fontWeight: 600 }}>OCPP Simulator Live</span></>
            : <><WifiOff size={12} color="var(--text-secondary)" /><span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Simulator offline</span></>
          }
        </div>
      </div>

      {/* User + Logout */}
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', marginBottom: '0.5rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: '0.875rem', fontWeight: 800, color: 'white',
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {scannerOpen && (
        <QRScannerModal 
          onClose={() => {
            setScannerOpen(false);
            navigate('/'); // Redirect to dashboard
          }} 
          onScanSuccess={(stationId) => {
            let targetId = stationId;
            if (stationId === 'universal') {
               const now = new Date();
               const todayStr = now.toISOString().split('T')[0];
               const myBooking = bookings.find(b => 
                 b.userId === user.id &&
                 (b.date === todayStr || !b.date) &&
                 ['pending', 'confirmed'].includes(b.status)
               );
               if (myBooking) {
                 targetId = myBooking.stationId;
               } else {
                 addNotification("You must reserve a station first to scan!", "error");
                 return;
               }
            }

            const station = stations.find(s => s.id === targetId);
            if (station) {
               addNotification("QR Match! Authenticating...", "info");
               setTimeout(async () => {
                 const success = await startSession(station.id);
                 if (success) {
                   navigate('/');
                   if (window.innerWidth <= 768 && closeSidebar) closeSidebar();
                 }
               }, 1000);
            } else {
               addNotification("Invalid Station QR Code", "error");
            }
          }} 
        />
      )}
    </aside>
  );
};

export default Sidebar;
