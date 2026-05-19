import React, { useState, useMemo, useEffect } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts';
import {
  Activity, Zap, Users, BatteryCharging, TrendingUp,
  Clock, MapPin, AlertTriangle, CheckCircle, Calendar,
  ArrowUpRight, ArrowDownRight, DollarSign, LayoutGrid,
  Search, Filter, Maximize2, MoreHorizontal
} from 'lucide-react';

// --- Theme & Style Constants ---
const COLORS = {
  primary: '#10b981', // Neon Green
  secondary: '#3b82f6', // Neon Blue
  accent: '#8b5cf6', // Neon Purple
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b'
  }
};

const CHART_CONFIG = {
  tooltip: {
    contentStyle: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      backdropFilter: 'blur(8px)',
      color: '#f8fafc'
    },
    itemStyle: { fontSize: '12px', fontWeight: 600 },
    labelStyle: { fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }
  }
};

// --- Helper Components ---

const StatCard = ({ label, value, icon, trend, chartData, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ scale: 1.02, translateY: -5 }}
    className="glass group relative overflow-hidden p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300"
    style={{ minWidth: '180px' }}
  >
    {/* Glow Effect */}
    <div className="absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 rounded-full" style={{ background: color }} />

    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
        {React.cloneElement(icon, { size: 20, color })}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>

    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-white tracking-tighter">
          {typeof value === 'number' ? <Counter value={value} /> : value}
        </h3>
      </div>
    </div>

    {/* Mini Sparkline Simulation */}
    <div className="mt-4 h-8 w-full opacity-30 group-hover:opacity-60 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData || [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 18 }, { v: 14 }, { v: 20 }]}>
          <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

const Counter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const stepTime = Math.abs(Math.floor(duration / value));
    if (isNaN(stepTime) || stepTime === Infinity) {
      setDisplayValue(value);
      return;
    }
    const timer = setInterval(() => {
      start += Math.ceil(value / 50);
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayValue.toLocaleString()}</span>;
};

const SectionHeader = ({ title, subtitle, icon }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      {icon && <div className="p-2 rounded-lg bg-white/5 text-primary">{icon}</div>}
      <div>
        <h2 className="text-lg font-black text-white tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="flex gap-2">
      <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><Maximize2 size={16} /></button>
      <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"><MoreHorizontal size={16} /></button>
    </div>
  </div>
);

// --- Main Analytics Component ---

const Analytics = () => {
  const { stations, sessions, bookings, totalRegisteredUsers, ocppLog } = useAdminContext();
  const [activeTab, setActiveTab] = useState('performance');

  const todayStr = new Date().toISOString().split('T')[0];

  // Derived Data
  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.price) || 50), 0);
    const energyDelivered = sessions.reduce((sum, s) => sum + (Number(s.energyConsumed) || 0), 0);
    const activeChargers = stations.filter(s => ['charging', 'occupied'].includes(s.status)).length;
    const occupancyRate = stations.length > 0 ? (activeChargers / stations.length) * 100 : 0;
    const bookingsToday = bookings.filter(b => b.date === todayStr).length;
    const faults = stations.filter(s => s.status === 'offline').length;

    return {
      totalSessions: sessions.length,
      revenue: totalRevenue,
      occupancy: occupancyRate.toFixed(1),
      activeChargers,
      totalUsers: totalRegisteredUsers,
      bookingsToday,
      faults,
      energy: energyDelivered.toFixed(1)
    };
  }, [sessions, bookings, stations, totalRegisteredUsers, todayStr]);

  // Chart Data Preparation
  const performanceData = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, i) => `${i.toString().padStart(2, '0')}:00`);
    return hours.map(h => ({
      time: h,
      sessions: sessions.filter(s => s.startTime && new Date(s.startTime).getHours() === parseInt(h)).length,
      energy: sessions.filter(s => s.startTime && new Date(s.startTime).getHours() === parseInt(h))
        .reduce((sum, s) => sum + (Number(s.energyConsumed) || 0), 0),
      revenue: bookings.filter(b => b.time && b.time.startsWith(h.split(':')[0]))
        .reduce((sum, b) => sum + (Number(b.price) || 50), 0)
    }));
  }, [sessions, bookings]);

  const stationStatusData = useMemo(() => [
    { name: 'Available', value: stations.filter(s => s.status === 'available' || s.status === 'reserved').length, color: COLORS.primary },
    { name: 'Occupied', value: stations.filter(s => ['charging', 'occupied'].includes(s.status)).length, color: COLORS.secondary },
    { name: 'System Failure', value: stations.filter(s => s.status === 'offline').length, color: COLORS.danger },
  ].filter(d => d.value > 0), [stations]);

  const topStations = useMemo(() => {
    return stations
      .map(s => ({
        name: s.name,
        sessions: sessions.filter(x => x.stationId === s.id).length,
        revenue: bookings.filter(x => x.stationId === s.id).reduce((sum, b) => sum + (Number(b.price) || 50), 0)
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [stations, sessions, bookings]);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <LayoutGrid className="text-primary" size={28} />
            Network Analytics
          </h1>
          <p className="text-slate-400 font-medium text-sm mt-1">Enterprise monitoring & predictive insights dashboard</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
          {['performance', 'revenue', 'hardware'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${activeTab === tab ? 'bg-primary text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="glass p-6 rounded-3xl lg:col-span-2 border border-white/5"
        >
          <SectionHeader title="Network Performance" subtitle="Hourly charging activity and energy distribution" icon={<Activity size={20} />} />

          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="time" stroke={COLORS.text.muted} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.text.muted} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_CONFIG.tooltip} />
                <Area type="monotone" dataKey="sessions" name="Sessions" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorSessions)" strokeWidth={3} />
                <Area type="monotone" dataKey="energy" name="Energy (kWh)" stroke={COLORS.secondary} fillOpacity={1} fill="url(#colorEnergy)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="glass p-6 rounded-3xl border border-white/5"
        >
          <SectionHeader title="Hardware Status" subtitle="Real-time charger availability matrix" icon={<LayoutGrid size={20} />} />

          <div className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stationStatusData}
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {stationStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CHART_CONFIG.tooltip} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right"
                  formatter={(v) => <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {stationStatusData.map(d => (
              <div key={d.name} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{d.name}</p>
                <p className="text-xl font-black text-white mt-1">{d.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Row 2: Revenue & Busiest Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="glass p-6 rounded-3xl border border-white/5"
        >
          <SectionHeader title="Revenue Analytics" subtitle="Monetary flow and booking profitability" icon={<DollarSign size={20} />} />
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke={COLORS.text.muted} fontSize={10} hide />
                <Tooltip {...CHART_CONFIG.tooltip} />
                <Area type="stepAfter" dataKey="revenue" name="Revenue (Nu)" stroke="#8b5cf6" fill="url(#colorRev)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-6 p-4 bg-accent/5 rounded-2xl border border-accent/10">
            <div>
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Average Daily Peak</p>
              <p className="text-xl font-black text-white">Nu 4,500</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Est. Monthly</p>
              <p className="text-xl font-black text-white">Nu 120,400</p>
            </div>
          </div>
        </motion.div>

        {/* Top Stations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="glass p-6 rounded-3xl border border-white/5"
        >
          <SectionHeader title="Top Performing Stations" subtitle="Ranking by utilization and network impact" icon={<TrendingUp size={20} />} />
          <div className="space-y-4 mt-6">
            {topStations.map((s, i) => {
              const max = topStations[0].sessions;
              const pct = (s.sessions / max) * 100;
              return (
                <div key={s.name} className="relative group cursor-pointer">
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-500 w-4">0{i + 1}</span>
                      <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400">{s.sessions} Sessions</span>
                      <span className="text-xs font-black text-primary">Nu {s.revenue}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 1 + (i * 0.1) }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Live Events & Fault Monitor */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Live Event Stream */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="glass p-6 rounded-3xl xl:col-span-2 border border-white/5 overflow-hidden"
        >
          <div className="flex justify-between items-center mb-6">
            <SectionHeader title="Live Network Events" subtitle="Real-time transaction & state log" icon={<Activity size={20} />} />
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Stream</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {ocppLog.slice(0, 10).map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className={`p-2 rounded-lg ${log.type === 'Heartbeat' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {log.type === 'Heartbeat' ? <Clock size={14} /> : <Zap size={14} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-xs font-bold text-white">{log.stationId}</p>
                    <p className="text-[10px] font-medium text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{log.type}: {JSON.stringify(log.payload).slice(0, 60)}...</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Fault Frequency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="glass p-6 rounded-3xl border border-white/5"
        >
          <SectionHeader title="System Integrity" subtitle="Fault frequency and uptime analysis" icon={<AlertTriangle size={20} />} />

          <div className="h-[200px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { day: 'M', f: 2 }, { day: 'T', f: 5 }, { day: 'W', f: 3 },
                { day: 'T', f: 1 }, { day: 'F', f: 4 }, { day: 'S', f: 2 }, { day: 'S', f: 0 }
              ]}>
                <XAxis dataKey="day" stroke={COLORS.text.muted} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_CONFIG.tooltip} />
                <Bar dataKey="f" name="Faults" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500"><AlertTriangle size={16} /></div>
                <div>
                  <p className="text-xs font-bold text-white">Active Faults</p>
                  <p className="text-[10px] text-slate-500">Requires attention</p>
                </div>
              </div>
              <p className="text-xl font-black text-rose-500">{stats.faults}</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><CheckCircle size={16} /></div>
                <div>
                  <p className="text-xs font-bold text-white">Network Uptime</p>
                  <p className="text-[10px] text-slate-500">Last 30 days</p>
                </div>
              </div>
              <p className="text-xl font-black text-emerald-500">99.8%</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Analytics;
