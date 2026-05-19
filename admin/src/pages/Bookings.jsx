import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Clock, MapPin, Zap, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const STATUS = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Pending',   icon: <AlertCircle size={13}/> },
  confirmed: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Confirmed', icon: <CheckCircle size={13}/> },
  active:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Active',    icon: <Zap size={13}/> },
  completed: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Completed', icon: <CheckCircle size={13}/> },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Cancelled', icon: <XCircle size={13}/> },
  rejected:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Rejected',  icon: <XCircle size={13}/> },
};

const AdminBookings = () => {
  const { bookings, stations, overrideStationStatus } = useAdminContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  const filtered = bookings.filter(b => {
    const matchSearch = b.stationName?.toLowerCase().includes(search.toLowerCase()) ||
      b.userName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === 'all' || b.status === filter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (bookingId, status) => {
    setUpdating(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { 
        status, 
        updatedAt: Date.now() 
      });
      
      const booking = bookings.find(b => b.id === bookingId);
      if (['cancelled', 'rejected', 'completed'].includes(status) && booking) {
        const station = stations.find(s => s.id === booking.stationId);
        if (station && station.status === 'reserved') {
          overrideStationStatus(station.id, 'available');
        }
      }
    } catch (e) { 
      console.error('[Admin] Update status failed:', e.message); 
    }
    setUpdating(null);
  };

  const stats = ['pending', 'confirmed', 'active', 'completed', 'cancelled'].map(s => ({
    label: s, count: bookings.filter(b => b.status === s).length, ...STATUS[s],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Reservations</h1>
        <p style={{ color: '#64748b' }}>{bookings.length} total reservations</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
        {stats.map(s => (
          <div key={s.label} className="glass" style={{ padding: '1rem 1.25rem', borderRadius: 16, borderLeft: `3px solid ${s.color}`, cursor: 'pointer' }}
            onClick={() => setFilter(filter === s.label ? 'all' : s.label)}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by station or user..."
            style={{ paddingLeft: 34, width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {['all', ...Object.keys(STATUS)].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '0.45rem 0.875rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
              background: filter === f ? '#3b82f6' : 'rgba(255,255,255,0.06)',
              color: filter === f ? 'white' : '#64748b',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['User', 'Station', 'Time / Duration', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => {
              const s = STATUS[b.status] || STATUS.pending;
              return (
                <tr key={b.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{b.userName || 'Unknown'}</p>
                    <p style={{ fontSize: '0.7rem', color: '#475569' }}>{b.userId?.slice(0, 12)}...</p>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <MapPin size={13} />{b.stationName || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Clock size={13}/>{b.time}</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.2rem' }}>{b.duration} mins</div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.625rem', borderRadius: 999, background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 700 }}>
                      {s.icon}{s.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', color: '#475569' }}>
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id} style={{ padding: '0.3rem 0.625rem', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer' }}>
                            Confirm
                          </button>
                          <button onClick={() => updateStatus(b.id, 'rejected')} disabled={updating === b.id} style={{ padding: '0.3rem 0.625rem', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                            Reject
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id} style={{ padding: '0.3rem 0.625rem', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6', cursor: 'pointer' }}>
                            Complete
                          </button>
                          <button onClick={() => updateStatus(b.id, 'cancelled')} disabled={updating === b.id} style={{ padding: '0.3rem 0.625rem', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>No reservations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBookings;
