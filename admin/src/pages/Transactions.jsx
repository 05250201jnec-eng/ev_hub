import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { Search, Zap, Clock, MapPin, CheckCircle, CreditCard, User, Calendar } from 'lucide-react';

const Transactions = () => {
  const { bookings } = useAdminContext();
  const [search, setSearch] = useState('');

  // We consider confirmed/pending/charging as paid reservations
  // Sort by newest first
  const sortedBookings = [...(bookings || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const filtered = sortedBookings.filter(b => {
    const matchSearch = b.stationName?.toLowerCase().includes(search.toLowerCase()) ||
      b.userName?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.price) || 50), 0);
  const totalReservations = bookings.length;
  const todayRevenue = bookings
    .filter(b => b.date === new Date().toISOString().split('T')[0])
    .reduce((sum, b) => sum + (Number(b.price) || 50), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Reservation Payments</h1>
          <p style={{ color: '#64748b' }}>{bookings.length} successful transactions processed</p>
        </div>
        <div className="glass" style={{ padding: '0.5rem 1rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Sync Active</span>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Revenue', value: `Nu ${totalRevenue}`, color: '#10b981', icon: <CreditCard size={20} color="#10b981"/> },
          { label: 'Total Reservation', value: totalReservations, color: '#8b5cf6', icon: <CheckCircle size={20} color="#8b5cf6"/> },
        ].map(k => (
          <div key={k.label} className="glass" style={{ padding: '1.25rem 1.5rem', borderRadius: 18, borderLeft: `3px solid ${k.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: 10, background: `${k.color}18` }}>{k.icon}</div>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{k.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or station..."
            style={{ paddingLeft: 34, width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }} />
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Transaction Details', 'Station', 'Amount', 'Schedule', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => {
              const amount = b.price || 50;
              return (
                <tr key={b.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={14} color="#64748b"/>
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{b.userName || 'Guest User'}</p>
                        <p style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase' }}>TXNID: {b.id?.slice(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                      <MapPin size={13}/>{b.stationName || 'Unknown Station'}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <p style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>Nu {amount}</p>
                    <p style={{ fontSize: '0.65rem', color: '#475569' }}>Prepaid</p>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#fff' }}>
                        <Calendar size={12} color="#64748b"/> {b.date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#94a3b8' }}>
                        <Clock size={12} color="#64748b"/> {b.time} ({b.duration}m)
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                      <CheckCircle size={12}/> PAID
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>No reservation payments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
