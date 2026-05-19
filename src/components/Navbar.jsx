import React from 'react';
import { Search, Bell, User, Zap, Wifi, WifiOff, Menu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Navbar = ({ toggleSidebar }) => {
  const { user, simulatorStatus, searchQuery, setSearchQuery } = useAppContext();

  return (
    <header className="glass" style={{
      height: 'var(--navbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--border-color)',
      borderRadius: 0,
      boxShadow: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="navbar-search" style={{ flex: 1, display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-tertiary)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: 400,
          border: '1px solid var(--border-color)',
          transition: 'all 0.2s',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search stations, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              marginLeft: '0.75rem',
              outline: 'none',
              fontSize: '0.9rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Simulator Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
          {simulatorStatus === 'connected' ? (
            <><div className="live-dot" /><span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-available)' }}>SIMULATOR LIVE</span></>
          ) : (
            <><WifiOff size={14} color="var(--text-secondary)" /><span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>OFFLINE</span></>
          )}
        </div>

        {/* Notifications */}
        <button style={{ position: 'relative', color: 'var(--text-secondary)', transition: 'all 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: 'var(--accent-primary)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            border: '2px solid var(--bg-color)',
          }}></span>
        </button>

        {/* User Info */}
        <div className="navbar-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{user?.name || 'Guest'}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user?.role || 'EV Owner'}</p>
          </div>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
