import React, { useState, useMemo } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { Clock, AlertTriangle, CheckCircle, Activity, MapPin, XCircle, Trash2 } from 'lucide-react';

const STATUS_COLORS = {
  available: '#10b981',
  reserved: '#3b82f6',
  charging: '#f59e0b',
  offline: '#ef4444',
  past: 'var(--bg-tertiary)',
};

const Schedule = () => {
  const { stations, bookings, sessions, deleteBooking } = useAdminContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [now, setNow] = useState(new Date());
  const [inspectedSlot, setInspectedSlot] = useState(null);

  const handleDeleteBooking = async () => {
    if (!inspectedSlot?.booking?.id) return;
    if (window.confirm('Are you sure you want to delete this reservation? This will immediately release the station for others.')) {
      const res = await deleteBooking(inspectedSlot.booking.id);
      if (res.success) {
        setInspectedSlot(null);
      } else {
        alert('Failed to delete booking: ' + res.error);
      }
    }
  };

  // Keep clock running for 'Live' feel
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const currentHour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];

  // Generate 7 days for date selector
  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  }, []);

  const convert12to24 = (timeStr) => {
    if (typeof timeStr !== 'string' || !timeStr) return -1;
    const parts = timeStr.trim().split(' ');
    if (parts.length !== 2) return -1;
    const [timePart, modifier] = parts;
    const timeComponents = timePart.split(':');
    if (timeComponents.length < 1) return -1;

    let hours = parseInt(timeComponents[0], 10);
    if (isNaN(hours)) return -1;
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours;
  };

  const getSlotDetails = (station, date, hour) => {
    const isToday = date === todayStr;

    const slotBookings = (bookings || []).filter(b =>
      b.stationId === station.id &&
      (b.date === date || !b.date) &&
      convert12to24(b.time) === hour &&
      ['pending', 'confirmed', 'charging', 'active'].includes(b.status)
    );

    let status = 'available';

    if (slotBookings.length >= 1) {
      status = slotBookings[0].status === 'charging' || slotBookings[0].status === 'active' ? 'charging' : 'reserved';
    } else if (isToday && hour < currentHour) {
      status = 'past';
    } else if (isToday && hour === currentHour) {
      if (station.status === 'charging' || station.status === 'occupied') status = 'charging';
    }

    return { status, slotBookings };
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock className="text-primary" /> Master Schedule
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Monitor station timelines, reservations, and real-time network utilization.
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 text-right">
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Network Time</div>
            <div className="text-xl font-black text-white">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginTop: '1.5rem' }}>
          {dates.map(date => {
            const d = new Date(date);
            const isSelected = selectedDate === date;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  cursor: 'pointer', transition: 'all 0.2s', minWidth: 60
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: isSelected ? 0.9 : 0.6, textTransform: 'uppercase' }}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{d.getDate()}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', padding: '0 0.5rem' }}>
        {[
          { label: 'Available', color: STATUS_COLORS.available },
          { label: 'Reserved', color: STATUS_COLORS.reserved },
          { label: 'Charging', color: STATUS_COLORS.charging },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Timeline Grid */}
      <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {stations.map(station => (
              <div key={station.id}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{station.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {station.location?.address}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const { status, slotBookings } = getSlotDetails(station, selectedDate, hour);
                    const isNow = selectedDate === todayStr && hour === currentHour;

                    return (
                      <div
                        key={hour}
                        title={slotBookings.length > 0 ? slotBookings.map(b => `${b.userName}: ${b.time} (${b.duration} mins)`).join(', ') : 'Available'}
                          onClick={() => {
                            if (slotBookings.length > 0) {
                              setInspectedSlot({ stationName: station.name, date: selectedDate, hour, booking: slotBookings[0] });
                            }
                          }}
                          style={{
                            minWidth: '60px', height: '60px',
                            borderRadius: 'var(--radius-sm)',
                            background: status === 'available' ? 'var(--bg-secondary)' : STATUS_COLORS[status],
                            opacity: status === 'past' ? 0.3 : 1,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            border: isNow ? '2px solid var(--accent-primary)' : `1px solid ${status === 'available' ? 'var(--border-color)' : 'transparent'}`,
                            cursor: slotBookings.length > 0 ? 'pointer' : 'default',
                            position: 'relative',
                            boxShadow: isNow ? '0 0 10px var(--accent-primary-transparent)' : 'none',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={e => { if(slotBookings.length > 0) e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: status === 'available' ? 'var(--text-primary)' : '#fff' }}>
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        {isNow && (
                          <div style={{
                            position: 'absolute', top: -8,
                            background: 'var(--accent-primary)', color: 'white',
                            fontSize: '8px', fontWeight: 900, padding: '2px 4px',
                            borderRadius: '4px', letterSpacing: '1px'
                          }}>
                            NOW
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Reservation Detail Modal */}
      {inspectedSlot && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            backdropFilter: 'blur(8px)'
          }} 
          onClick={() => setInspectedSlot(null)}
        >
          <div 
            className="glass" 
            style={{
              width: '100%', maxWidth: 420, borderRadius: 32, padding: '2.5rem',
              position: 'relative', border: '1px solid rgba(255,255,255,0.1)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Reservation Details</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Active booking on {inspectedSlot.date}</p>
              </div>
              <button 
                onClick={() => setInspectedSlot(null)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 16 }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</label>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginTop: '0.25rem' }}>{inspectedSlot.booking.userName || 'Karma Wangchuk'}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 16 }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Time Slot</label>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{inspectedSlot.booking.time}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 16 }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Duration</label>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{inspectedSlot.booking.duration || '60'} mins</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 16 }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Station Hub</label>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.25rem' }}>{inspectedSlot.stationName}</div>
              </div>

              <div style={{ 
                marginTop: '0.5rem', 
                padding: '1rem', 
                background: 'rgba(59,130,246,0.05)', 
                borderRadius: 16,
                border: '1px solid rgba(59,130,246,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                 <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BOOKING REFERENCE</span>
                 <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                   #{inspectedSlot.booking.id?.slice(-8)?.toUpperCase() || 'REF-ID'}
                 </span>
              </div>
            </div>
            
            <button 
              onClick={handleDeleteBooking}
              style={{
                width: '100%', marginTop: '1rem', padding: '1rem', borderRadius: 16,
                background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 800, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <Trash2 size={18} /> Delete Reservation
            </button>

            <button 
              onClick={() => setInspectedSlot(null)}
              style={{
                width: '100%', marginTop: '1rem', padding: '1rem', borderRadius: 16,
                background: 'var(--accent-primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(59,130,246,0.2)',
                fontSize: '0.9rem'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
