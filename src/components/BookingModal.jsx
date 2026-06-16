import React, { useState } from 'react';
import { X, Clock, CreditCard } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BookingModal = ({ station, onClose }) => {
  const { bookSlot } = useAppContext();
  const [selectedConnector, setSelectedConnector] = useState('');
  const [selectedTime, setSelectedTime] = useState(station?.prefillTime || '');
  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState(station?.prefillDate || getLocalDateStr());
  const [duration, setDuration] = useState('30');
  const [selectedPayment, setSelectedPayment] = useState('bob');
  const [step, setStep] = useState(1); // 1: details, 2: payment

  const timeSlots = Array.from({ length: 24 }).map((_, i) => {
    const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
    const ampm = i >= 12 ? 'PM' : 'AM';
    return `${hour.toString().padStart(2, '0')}:00 ${ampm}`;
  });

  const handleConfirm = () => {
    if (step === 1) {
      if (!selectedConnector || !selectedTime) return;
      setStep(2);
    } else {
      bookSlot(station.id, selectedConnector, selectedTime, duration, selectedDate);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="glass animate-fade-in modal-content" style={{
        width: '100%',
        maxWidth: '500px',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        background: 'var(--bg-secondary)',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-secondary)' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {step === 1 ? 'Reserve a Slot' : 'Confirm Payment'}
        </h2>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Connector</label>
              <select 
                value={selectedConnector}
                onChange={(e) => setSelectedConnector(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'white'
                }}
              >
                <option value="">Select a connector</option>
                {station?.connectors?.map(c => (
                  <option key={c.id} value={c.id} disabled={c.status === 'offline'}>
                    {c.type} - {c.power} ({c.price})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Date</label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Time</label>
                <select 
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'white'
                  }}
                >
                  <option value="">Select a time</option>
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Duration (minutes)</label>
              <select 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'white'
                }}
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              background: 'var(--bg-tertiary)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Summary</h3>
              <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Station:</span>
                <span>{station.name}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                <span>{selectedDate}</span>
              </p>
              <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Time:</span>
                <span>{selectedTime} ({duration} mins)</span>
              </p>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0' }} />
              <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem' }}>
                <span>Reservation Fee:</span>
                <span className="text-gradient">Nu 50</span>
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Payment Method</label>
              <div style={{ display: 'flex' }}>
                <button 
                  onClick={() => setSelectedPayment('bob')}
                  style={{
                    flex: 1,
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--accent-primary)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: '6px', background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: 'black' }}>B</div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block' }}>mBoB (Bank of Bhutan)</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Secure Bank Transfer</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          {step === 2 && (
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1 }}
              onClick={() => setStep(1)}
            >
              Back
            </button>
          )}
          <button 
            className="btn btn-primary" 
            style={{ flex: 2 }}
            onClick={handleConfirm}
            disabled={step === 1 && (!selectedConnector || !selectedTime)}
          >
            {step === 1 ? 'Proceed to Payment' : 'Confirm Booking'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BookingModal;
