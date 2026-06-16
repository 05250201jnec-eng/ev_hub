import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  Activity, 
  Users, 
  CreditCard, 
  BarChart3, 
  AlertTriangle, 
  Bell, 
  LogOut,
  PlayCircle,
  Clock,
  X,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard',        path: '/',                    icon: <LayoutDashboard size={18} /> },
  { name: 'Station Management', path: '/chargers',          icon: <Zap size={18} /> },
  { name: 'OCPP Monitoring',  path: '/ocpp',                icon: <Activity size={18} /> },
  { name: 'User Management',  path: '/users',               icon: <Users size={18} /> },
  { name: 'Schedule',         path: '/schedule',            icon: <Clock size={18} /> },
  { name: 'Transactions',     path: '/transactions',        icon: <CreditCard size={18} /> },
  { name: 'Analytics',        path: '/analytics',           icon: <BarChart3 size={18} /> },
  { name: 'Fault Logs',       path: '/faults',              icon: <AlertTriangle size={18} /> },
  { name: 'Simulation',       path: '/simulation-control',  icon: <PlayCircle size={18} /> },
  { name: 'Notifications',    path: '/notifications',       icon: <Bell size={18} /> },
];

const handleLogout = () => {
  // Clear all stored session data
  localStorage.removeItem('ev_user');
  localStorage.removeItem('ev_bookings');

  const host = window.location.hostname;
  const userUrl = import.meta.env.VITE_USER_URL;
  const isLocalIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);

  if (userUrl) {
    // Env var set — use it (strip trailing slash)
    const base = userUrl.replace(/\/$/, '');
    // If we're on a local IP, replace 'localhost' with the actual IP
    const resolved = (host === 'localhost' || host === '127.0.0.1')
      ? base
      : base.replace('localhost', host);
    window.location.href = `${resolved}/login`;
  } else if (host === 'localhost' || host === '127.0.0.1') {
    window.location.href = 'http://localhost:5173/login';
  } else if (isLocalIP) {
    // Phone on local network — use same IP, user app port 5173
    window.location.href = `http://${host}:5173/login`;
  } else if (host.includes('ev-hub-eg1e')) {
    // Vercel admin → redirect to Vercel user app
    window.location.href = 'https://ev-hub-liard.vercel.app/login';
  } else {
    // Fallback: relative path (won't cross origins but better than nothing)
    window.location.href = '/login';
  }
};

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile dark overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border
        flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg flex items-center justify-center">
              <Zap size={20} color="white" fill="white" />
            </div>
            <h1 className="text-lg font-bold text-gradient">Admin Hub</h1>
          </div>
          {/* Close button — visible only on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav (scrolls if too many items) ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 min-h-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose?.()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm
                    ${isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Footer — always pinned at bottom, never scrolls away ── */}
        <div className="shrink-0 p-4 border-t border-border space-y-3">
          {/* System status */}
          <div className="glass px-4 py-3 rounded-xl flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">System Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">Online</span>
            </div>
          </div>

          {/* Logout — big tap target, always accessible */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
              text-gray-400 hover:text-red-400 active:text-red-400
              border border-gray-700 hover:border-red-500/40 active:border-red-500/40
              hover:bg-red-500/10 active:bg-red-500/10
              transition-all duration-200 cursor-pointer select-none"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">Logout System</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
