import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Users, 
  CreditCard, 
  BatteryCharging, 
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Loader,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useAdminContext } from '../context/AdminContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const data = [
  { name: 'Mon', value: 2400, sessions: 12 },
  { name: 'Tue', value: 1398, sessions: 8 },
  { name: 'Wed', value: 9800, sessions: 45 },
  { name: 'Thu', value: 3908, sessions: 20 },
  { name: 'Fri', value: 4800, sessions: 25 },
  { name: 'Sat', value: 3800, sessions: 18 },
  { name: 'Sun', value: 4300, sessions: 22 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const { stations, ocppLog, totalOnlineUsers, totalRegisteredUsers, loading } = useAdminContext();
  const navigate = useNavigate();

  const stats = {
    totalRevenue: 'BTNU 45,280',
    activeSessions: stations.filter(s => s.status === 'charging' || s.status === 'occupied').length,
    available: stations.filter(s => s.status === 'available').length,
    inactive: stations.filter(s => s.status === 'offline').length,
    totalStations: stations.length
  };

  const statusData = [
    { name: 'Available', value: stats.available },
    { name: 'Reserved', value: stations.filter(s => s.status === 'reserved').length },
    { name: 'Charging', value: stats.activeSessions },
    { name: 'Inactive', value: stats.inactive },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">Network Overview</h1>
          <p className="text-gray-400 text-sm">Real-time performance metrics and system health.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           <button onClick={() => window.location.reload()} className="p-2.5 rounded-xl bg-bg-tertiary border border-border hover:border-primary/50 text-gray-400 hover:text-primary transition-all flex-1 md:flex-none flex justify-center">
             <RefreshCw size={20} />
           </button>
           <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3 flex-[2] md:flex-none justify-center md:justify-start">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest whitespace-nowrap">Core Services Live</span>
           </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><BatteryCharging size={64} /></div>
          <p className="text-gray-400 text-sm font-medium mb-2">Active Sessions</p>
          <h3 className="text-2xl font-bold text-white mb-4">{stats.activeSessions}</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-500/10 w-fit px-2 py-1 rounded-lg">
             {stats.activeSessions > 0 ? 'CURRENTLY CHARGING' : 'NO ACTIVE LOADS'}
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Zap size={64} /></div>
          <p className="text-gray-400 text-sm font-medium mb-2">Total Station Available</p>
          <h3 className="text-2xl font-bold text-white mb-4">{stats.available} / {stats.totalStations}</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg">
             READY FOR USE
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={64} /></div>
          <p className="text-gray-400 text-sm font-medium mb-2">Registered Users</p>
          <h3 className="text-2xl font-bold text-white mb-4">{totalRegisteredUsers || 154}</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/10 w-fit px-2 py-1 rounded-lg">
             {totalOnlineUsers} CURRENTLY ONLINE
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-[2.5rem] border border-white/5">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Sessions Trend</h3>
              <p className="text-xs text-gray-500">Daily charging activities across the network</p>
            </div>
            <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              Live Usage Data
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1b1e', borderRadius: '1rem', border: '1px solid #ffffff10', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="sessions" stroke="#10b981" fill="url(#colorSessions)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6">Station Details</h3>
          <div className="flex-1 flex flex-col justify-center">
             {/* Simple Status Distribution List */}
             <div className="space-y-6">
                {statusData.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-gray-400">{item.name}</span>
                      <span className="text-white">{item.value}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${(item.value / stats.totalStations) * 100}%`,
                          backgroundColor: COLORS[index]
                        }}
                      />
                    </div>
                  </div>
                ))}
             </div>
             
             <div className="mt-10 p-6 rounded-3xl bg-primary/5 border border-primary/10 text-center">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">System Efficiency</p>
                <h4 className="text-3xl font-black text-white">
                  {Math.round((stats.activeSessions / stats.totalStations) * 100)}%
                </h4>
                <p className="text-[10px] text-gray-500 mt-2 italic">Current load vs. capacity</p>
             </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <button 
           onClick={() => navigate('/simulation-control')}
           className="glass p-6 rounded-3xl border border-white/5 hover:border-primary/50 transition-all group flex items-center gap-4 text-left"
         >
           <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform"><Database size={24} /></div>
           <div>
             <h4 className="font-bold text-white">Simulation Center</h4>
             <p className="text-xs text-gray-500">Trigger manual OCPP events</p>
           </div>
         </button>

         <button 
           onClick={() => navigate('/ocpp')}
           className="glass p-6 rounded-3xl border border-white/5 hover:border-indigo-500/50 transition-all group flex items-center gap-4 text-left"
         >
           <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform"><Activity size={24} /></div>
           <div>
             <h4 className="font-bold text-white">Network Logs</h4>
             <p className="text-xs text-gray-500">Real-time status notifications</p>
           </div>
         </button>

         <button 
           onClick={() => navigate('/chargers')}
           className="glass p-6 rounded-3xl border border-white/5 hover:border-emerald-500/50 transition-all group flex items-center gap-4 text-left"
         >
           <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform"><MapPin size={24} /></div>
           <div>
             <h4 className="font-bold text-white">Manage Hardware</h4>
             <p className="text-xs text-gray-500">Coordinate and connectivity</p>
           </div>
         </button>
      </div>
    </div>
  );
};

export default Dashboard;
