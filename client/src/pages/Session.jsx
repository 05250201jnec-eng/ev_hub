import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Zap, Map, QrCode, Power, ShieldCheck, RefreshCw, X } from 'lucide-react';
import LiveChargingSession from '../components/LiveChargingSession';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Session = () => {
  const { bookings, user, stations, addNotification } = useAppContext();
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState('st-014'); // Default to JNEC Solar Charging Hub
  const [scanning, setScanning] = useState(false);

  // Find the currently active charging session (either via bookings list or from active status)
  const activeBooking = bookings?.find(b => b.status === 'charging' && b.userId === user?.id);

  // Check if any station is currently in the "plug_in" pending state for the logged-in user
  const pendingStation = stations?.find(s => s.status === 'plug_in' && s.plugInUser === user?.id);

  // QR Code scan simulator handler
  const handleSimulateScan = () => {
    if (!user) {
      addNotification('Please login first', 'error');
      return;
    }
    setScanning(true);

    // Simulate standard camera scan delay
    setTimeout(async () => {
      try {
        const station = stations.find(s => s.id === selectedStationId);
        if (!station) {
          addNotification('Invalid station QR Code', 'error');
          setScanning(false);
          return;
        }

        if (station.status === 'offline') {
          addNotification('This station is currently offline for maintenance', 'error');
          setScanning(false);
          return;
        }

        // Set the station to plug_in state and assign it to the current user
        await updateDoc(doc(db, 'stations', selectedStationId), {
          status: 'plug_in',
          plugInUser: user.id,
          plugInUserName: user.name,
          lastUpdated: Date.now(),
        });

        addNotification('QR Code Verified! Station connected. ⚡', 'success');
        setScanning(false);
        setShowQRModal(false);
      } catch (err) {
        addNotification('Scan failed: ' + err.message, 'error');
        setScanning(false);
      }
    }, 2000);
  };

  const handleCancelPlugIn = async (stationId) => {
    try {
      await updateDoc(doc(db, 'stations', stationId), {
        status: 'available',
        plugInUser: null,
        plugInUserName: null,
        lastUpdated: Date.now(),
      });
      addNotification('Plug-in request cancelled', 'info');
    } catch (err) {
      addNotification('Failed to cancel: ' + err.message, 'error');
    }
  };

  // ── Case 1: Active charging session is running ──
  if (activeBooking) {
    return (
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.02em' }}>Active Session</h1>
        <LiveChargingSession booking={activeBooking} />
      </div>
    );
  }

  // ── Case 2: Scanned successfully, waiting for physical connection ──
  if (pendingStation) {
    return (
      <div className="animate-fade-in" style={{
        maxWidth: 600,
        margin: '2rem auto',
        padding: '2.5rem',
        borderRadius: 24,
        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Animated plug connection graphic */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', position: 'relative' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulseGlow 2s infinite',
          }}>
            <Power size={48} color="#3b82f6" className="animate-pulse" />
          </div>
          <style>{`
            @keyframes pulseGlow {
              0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
              70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
              100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
          `}</style>
        </div>

        <div className="status-badge" style={{
          background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.5rem 1rem',
          borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em', marginBottom: '1.5rem',
        }}>
          <span className="live-dot" style={{ background: '#3b82f6' }} />
          Waiting for Hardware
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
          Plug in Charging Cable
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          QR Code verified for <strong style={{ color: '#3b82f6' }}>{pendingStation.name}</strong>.<br />
          Please physically plug the connector gun into your vehicle's port. 
          The session will launch automatically once the hardware detects the connection.
        </p>

        {/* Local Network/ESP32 Instruction Box */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '1.25rem',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '2.5rem',
          textAlign: 'left',
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ Developer Node Simulation
          </p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
            Press the <strong>physical button</strong> on your ESP32 node (or trigger a "plug_in" action in the OCPP Admin Control panel) to complete the connection process.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => handleCancelPlugIn(pendingStation.id)}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '0.875rem' }}
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  // ── Case 3: No active session or pending connection — show scan option ──
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65vh', color: 'var(--text-secondary)' }}>
      <div style={{
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.75rem',
        border: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <QrCode size={44} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
      </div>
      <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Start a New Charge</h2>
      <p style={{ marginBottom: '2rem', fontSize: '0.9375rem', textAlign: 'center', maxWidth: '320px', lineHeight: 1.5 }}>
        Scan the QR code printed on the EV Hub charging station to verify and connect.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/map')}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Map size={18} /> Browse Stations
        </button>
        
        <button
          onClick={() => setShowQRModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}
        >
          <QrCode size={18} /> Scan QR Code
        </button>
      </div>

      {/* ── Simulated QR Code Scanner Modal ── */}
      {showQRModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 100, padding: '1rem',
        }}>
          <div className="glass modal-content animate-fade-in" style={{
            width: '100%', maxWidth: '460px', borderRadius: 24,
            padding: '2rem', background: '#1e293b', position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <button
              onClick={() => setShowQRModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>
              Verify Station QR Code
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Simulating camera focus. Select the station you want to scan:
            </p>

            {/* Station dropdown selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8' }}>
                Active Station Target
              </label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                style={{
                  width: '100%', padding: '0.875rem', borderRadius: 12,
                  background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', fontSize: '0.9rem', outline: 'none',
                }}
              >
                {stations?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Premium Simulated Viewfinder */}
            <div style={{
              width: '100%', height: '220px', background: '#090d16',
              borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.2)',
              position: 'relative', overflow: 'hidden', display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              marginBottom: '2rem',
            }}>
              {/* Corner brackets */}
              <div style={{ position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTop: '3px solid #3b82f6', borderLeft: '3px solid #3b82f6' }} />
              <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTop: '3px solid #3b82f6', borderRight: '3px solid #3b82f6' }} />
              <div style={{ position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottom: '3px solid #3b82f6', borderLeft: '3px solid #3b82f6' }} />
              <div style={{ position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottom: '3px solid #3b82f6', borderRight: '3px solid #3b82f6' }} />

              {scanning ? (
                <div style={{ textAlign: 'center' }}>
                  <RefreshCw size={36} color="#3b82f6" className="animate-spin" style={{ marginBottom: '1rem' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6', margin: 0 }}>
                    Scanning QR Code...
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <QrCode size={48} color="#475569" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                    Align QR code within the frame
                  </p>
                </div>
              )}

              {/* Scanning moving green bar */}
              {scanning && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: '4px',
                  background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                  boxShadow: '0 0 10px #10b981',
                  animation: 'scannerLine 2s linear infinite',
                }} />
              )}
              <style>{`
                @keyframes scannerLine {
                  0% { top: 10%; }
                  50% { top: 90%; }
                  100% { top: 10%; }
                }
              `}</style>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={scanning}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <ShieldCheck size={18} /> {scanning ? 'Verifying...' : 'Simulate Camera Scan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Session;
