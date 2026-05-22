import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, Clock, MapPin, Zap, CheckCircle, XCircle, AlertCircle, Navigation2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_MAP = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <AlertCircle size={14} />, label: 'Pending' },
  confirmed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle size={14} />, label: 'Confirmed' },
  active:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <Zap size={14} />,         label: 'Active' },
  completed: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: <CheckCircle size={14} />, label: 'Completed' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: <XCircle size={14} />,     label: 'Cancelled' },
  rejected:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: <XCircle size={14} />,     label: 'Rejected' },
};

const Bookings = () => {
  const { bookings, stations, cancelBooking, deleteBooking, user } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const myBookings = bookings.filter(b => b.userId === user?.id);

  const filtered = filter === 'all' 
    ? [...myBookings].sort((a, b) => b.createdAt - a.createdAt)
    : myBookings.filter(b => b.status === filter).sort((a, b) => b.createdAt - a.createdAt);

  if (myBookings.length === 0) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1.5rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={36} color="var(--text-secondary)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Reservations Yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Reserve a charging slot to see it here.</p>
          <button onClick={() => navigate('/map')} className="btn btn-primary">Find a Station</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>My Reservations</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{myBookings.length} total reservation{myBookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/map')} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Zap size={16} /> Book New Slot
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass custom-scrollbar" style={{ display: 'flex', padding: '0.35rem', borderRadius: 'var(--radius-md)', gap: '0.35rem', width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700,
            background: filter === f ? 'var(--accent-primary)' : 'transparent',
            color: filter === f ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s', textTransform: 'capitalize',
            flexShrink: 0
          }}>{f}</button>
        ))}
      </div>

      {/* Bookings Grid */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>No {filter} reservations.</p>
      ) : (
        <div className="bookings-grid" style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {filtered.map(booking => {
            const station = stations.find(s => s.id === booking.stationId);
            const s = STATUS_MAP[booking.status] || STATUS_MAP.pending;
            const canCancel = !['cancelled', 'rejected', 'completed'].includes(booking.status);
            return (
              <div key={booking.id} className="glass" style={{
                padding: '1.5rem', borderRadius: 'var(--radius-lg)',
                borderLeft: `4px solid ${s.color}`,
                transition: 'transform 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                    {booking.stationName || station?.name || 'Unknown Station'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                      background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {s.icon} {s.label}
                    </span>
                    <button 
                      onClick={() => { if(window.confirm('Erase this booking from history?')) deleteBooking(booking.id); }}
                      style={{ color: 'var(--text-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      title="Clear from history"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={14} />
                    <span>{station?.location?.address || 'Bhutan'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} />
                    <span>{booking.time} — {booking.duration} mins</span>
                  </div>
                  {booking.connectorId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Zap size={14} />
                      <span>Connector: {booking.connectorId}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} />
                    <span>{new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => navigate('/map')}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.8125rem', gap: '0.4rem' }}
                  >
                    <Navigation2 size={14} /> Navigate
                  </button>
                  <button
                    onClick={() => canCancel ? cancelBooking(booking.id) : null}
                    disabled={!canCancel}
                    style={{
                      flex: 1, padding: '0.625rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
                      background: 'rgba(239,68,68,0.08)', 
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444', 
                      fontWeight: 600, cursor: canCancel ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                      opacity: canCancel ? 1 : 0.6
                    }}
                    onMouseEnter={e => { if (canCancel) e.currentTarget.style.background = 'rgba(239,68,68,0.18)' }}
                    onMouseLeave={e => { if (canCancel) e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                  >
                    {booking.status === 'cancelled' ? 'Cancelled' : 
                     booking.status === 'completed' ? 'Completed' :
                     booking.status === 'rejected' ? 'Rejected' : 'Cancel'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bookings;
