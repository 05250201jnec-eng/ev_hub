import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  LayoutDashboard, Map, Calendar, User, LogOut,
  Zap, Shield, Wifi, WifiOff, Activity, Clock
} from 'lucide-react';

const navItems = [
  { to: '/',        icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/map',     icon: <Map size={20} />,              label: 'Stations Map' },
  { to: '/schedule',icon: <Clock size={20} />,            label: 'Schedule' },
  { to: '/bookings',icon: <Calendar size={20} />,         label: 'My Bookings' },
  { to: '/profile', icon: <User size={20} />,             label: 'Profile' },
];

const Sidebar = () => {
  const { user, logout, stations, simulatorStatus, activeSession } = useAppContext();
  const navigate = useNavigate();

  const available = stations.filter(s => s.status === 'available').length;
  const charging  = stations.filter(s => s.status === 'charging' || s.status === 'occupied').length;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside style={{
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
            {item.label === 'My Bookings' && activeSession && (
              <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--status-charging)', animation: 'livePulse 1.5s ease-in-out infinite' }} />
            )}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '1rem 0.5rem 0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Admin
            </p>
            <a href={`http://${window.location.hostname}:5177`} target="_blank" rel="noreferrer" style={{
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
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
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
    </aside>
  );
};

export default Sidebar;
