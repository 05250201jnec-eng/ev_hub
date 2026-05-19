import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  Activity, 
  Users, 
  CalendarClock, 
  CreditCard, 
  BarChart3, 
  AlertTriangle, 
  Settings, 
  Bell, 
  Power,
  LogOut,
  PlayCircle,
  Clock
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Charger Management', path: '/chargers', icon: <Zap size={20} /> },
    { name: 'OCPP Monitoring', path: '/ocpp', icon: <Activity size={20} /> },
    { name: 'User Management', path: '/users', icon: <Users size={20} /> },
    { name: 'Schedule', path: '/schedule', icon: <Clock size={20} /> },
    { name: 'Transactions', path: '/transactions', icon: <CreditCard size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
    { name: 'Fault Logs', path: '/faults', icon: <AlertTriangle size={20} /> },
    { name: 'Simulation', path: '/simulation-control', icon: <PlayCircle size={20} /> },
    { name: 'Notifications', path: '/notifications', icon: <Bell size={20} /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-bg-secondary border-r border-border flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg flex items-center justify-center">
            <Zap size={24} color="white" fill="white" />
          </div>
          <h1 className="text-xl font-bold text-gradient">Admin Hub</h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  onClick={() => onClose?.()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20 font-semibold' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  {item.icon}
                  <span className="text-sm">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-6 border-t border-border space-y-4">
          <div className="glass p-4 rounded-xl text-center">
            <p className="text-xs text-gray-400 mb-1">System Status</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem('ev_user');
              localStorage.removeItem('ev_bookings');
              const host = window.location.hostname;
              window.location.href = `http://${host}:5173/login`;
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 border border-gray-700"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout System</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
