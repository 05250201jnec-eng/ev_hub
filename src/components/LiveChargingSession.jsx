import React, { useState, useEffect } from 'react';
import { Battery, Zap, Clock, IndianRupee, PowerOff } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext';

const LiveChargingSession = ({ booking }) => {
  const { addNotification, updateStationStatus } = useAppContext();
  const [soc, setSoc] = useState(24); // Start at 24%
  const [power] = useState(22.4); // kW
  const [elapsed, setElapsed] = useState(0); // seconds
  const [cost, setCost] = useState(0); // Nu
  
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
      
      // Increase SoC slowly
      setSoc(prev => {
        if (prev >= 100) return 100;
        // Increase by 1% every ~5 seconds for demo purposes
        return prev + 0.2;
      });
      
      // Calculate cost: say Nu 15 per kWh. 22.4kW = 22.4 kWh per hour = 0.0062 kWh per sec
      setCost(prev => prev + (22.4 * 15) / 3600);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stopCharging = async () => {
    try {
      // IoT session: created in 'sessions' collection with source: 'iot-esp32'
      if (booking.source === 'iot-esp32' || booking.sessionId) {
        const sessionDocId = booking.id || booking.sessionId;
        await updateDoc(doc(db, 'sessions', sessionDocId), {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
        // Update the underlying booking to completed if it's linked
        if (booking.bookingId) {
          await updateDoc(doc(db, 'bookings', booking.bookingId), { status: 'completed' });
        }
      } else {
        // Legacy booking session
        const docId = booking.id || booking.firestoreId;
        await updateDoc(doc(db, 'bookings', docId), { status: 'completed' });
      }
      await updateStationStatus(booking.stationId, 'available');
      addNotification('Charging completed successfully ✅', 'success');
    } catch (e) {
      addNotification('Failed to stop charging: ' + e.message, 'error');
    }
  };

  return (
    <div className="glass" style={{
      padding: '2rem',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pulse Effect */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 50%)',
        animation: 'pulse 4s infinite',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#10b981' }}>Live Charging</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{booking.stationName}</p>
          </div>
          <div className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span className="live-dot" style={{ background: '#10b981', display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span>
            ACTIVE
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {/* SoC Circle */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              position: 'relative', 
              width: '120px', 
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: `conic-gradient(#10b981 ${soc}%, rgba(255,255,255,0.05) 0)`
            }}>
              <div style={{
                position: 'absolute',
                width: '100px',
                height: '100px',
                background: 'var(--bg-secondary)',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{Math.floor(soc)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SoC</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ flex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Zap size={16} color="#3b82f6" />
                <span style={{ fontSize: '0.875rem' }}>Power</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{power} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kW</span></div>
            </div>
            
            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Battery size={16} color="#10b981" />
                <span style={{ fontSize: '0.875rem' }}>Energy Added</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{((power * elapsed) / 3600).toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kWh</span></div>
            </div>

            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Clock size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.875rem' }}>Duration</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsed)}</div>
            </div>

            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <IndianRupee size={16} color="#8b5cf6" />
                <span style={{ fontSize: '0.875rem' }}>Est. Cost</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>Nu {cost.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <button 
          onClick={stopCharging}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
          }}
        >
          <PowerOff size={20} />
          STOP CHARGING
        </button>
      </div>
    </div>
  );
};

export default LiveChargingSession;
