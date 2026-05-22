import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Clock, Calendar as CalendarIcon, MapPin, Zap, AlertCircle } from 'lucide-react';
import BookingModal from '../components/BookingModal';

const STATUS_COLORS = {
  available: 'var(--status-available)', // Green
  reserved: '#3b82f6', // Blue
  charging: '#f59e0b', // Orange
  offline: '#ef4444', // Red
  past: 'var(--bg-tertiary)' // Grey
};

const Schedule = () => {
  const { stations, bookings } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedStationForBooking, setSelectedStationForBooking] = useState(null);

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

  const getSlotStatus = (station, date, hour) => {
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    const convert12to24 = (timeStr) => {
      if (!timeStr) return -1;
      const parts = timeStr.split(' ');
      if (parts.length !== 2) return -1;
      const [time, modifier] = parts;
      let [hours] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      return parseInt(hours, 10);
    };

    if (station.status === 'offline') return 'offline';
    if (isToday && hour < currentHour) return 'past';

    // Find if there's any active booking for this slot
    const slotBooking = bookings.find(b => 
      b.stationId === station.id && 
      (b.date === date || !b.date) && 
      convert12to24(b.time) === hour &&
      ['pending', 'confirmed', 'charging'].includes(b.status)
    );

    if (slotBooking) {
      return slotBooking.status === 'charging' ? 'charging' : 'reserved';
    }

    // Fallback to station real-time status if it's the current hour and no booking is found
    if (isToday && hour === currentHour) {
      if (station.status === 'charging' || station.status === 'occupied') return 'charging';
      if (station.status === 'reserved') return 'reserved';
    }

    return 'available';
  };

  const handleBookSlot = (station, hour, status) => {
    if (status !== 'available') return;
    const timeString = `${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour).toString().padStart(2, '0')}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
    setSelectedStationForBooking({ ...station, prefillTime: timeString, prefillDate: selectedDate });
    setBookingModalOpen(true);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ minWidth: '200px', flex: '1' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock className="text-primary" /> Charging Schedule
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            View charger availability and timeline.
          </p>
        </div>
        
        {/* Date Selector */}
        <div className="custom-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', width: '100%', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          {dates.map(date => {
            const d = new Date(date);
            const isSelected = selectedDate === date;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px',
                  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                }}
              >
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, opacity: isSelected ? 0.9 : 0.6 }}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', padding: '0 0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Available', color: STATUS_COLORS.available },
          { label: 'Reserved', color: STATUS_COLORS.reserved },
          { label: 'Charging', color: STATUS_COLORS.charging },
          { label: 'Offline', color: STATUS_COLORS.offline }
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Schedule Grid */}
      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem' }}>
          {stations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No stations available.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {stations.map(station => (
                <div key={station.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {station.name}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={12} /> {station.location?.address}
                      </p>
                    </div>
                  </div>
                  
                  {/* Timeline Row */}
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const status = getSlotStatus(station, selectedDate, hour);
                      const timeString = `${hour.toString().padStart(2, '0')}:00`;
                      
                      return (
                        <div 
                          key={hour}
                          onClick={() => handleBookSlot(station, hour, status)}
                          style={{
                            minWidth: '80px',
                            padding: '0.75rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: status === 'available' ? 'var(--bg-secondary)' : STATUS_COLORS[status],
                            border: `1px solid ${status === 'available' ? 'var(--status-available)' : 'transparent'}`,
                            opacity: status === 'past' ? 0.4 : 1,
                            cursor: status === 'available' ? 'pointer' : 'not-allowed',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            if (status === 'available') {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.2)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (status === 'available') {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: status === 'available' ? 'var(--text-primary)' : '#fff' }}>
                            {timeString}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: status === 'available' ? 'var(--status-available)' : 'rgba(255,255,255,0.8)' }}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {bookingModalOpen && selectedStationForBooking && (
        <BookingModal 
          station={selectedStationForBooking} 
          onClose={() => { setBookingModalOpen(false); setSelectedStationForBooking(null); }} 
        />
      )}
    </div>
  );
};

export default Schedule;
