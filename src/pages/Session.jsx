import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Zap, Map } from 'lucide-react';
import LiveChargingSession from '../components/LiveChargingSession';

const Session = () => {
  const { bookings } = useAppContext();
  const navigate = useNavigate();

  // Find the currently active charging session
  const activeBooking = bookings?.find(b => b.status === 'charging');

  if (!activeBooking) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <Zap size={40} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>No Active Session</h2>
        <p style={{ marginBottom: '2rem' }}>You are not currently charging your vehicle.</p>
        
        <button 
          onClick={() => navigate('/map')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Map size={18} /> Find a Station
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Active Session</h1>
      <LiveChargingSession booking={activeBooking} />
    </div>
  );
};

export default Session;
