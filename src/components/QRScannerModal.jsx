import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Camera, CheckCircle2, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const QRScannerModal = ({ onClose, onScanSuccess }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [scanState, setScanState] = useState('scanning'); // scanning | success | error
  const { addNotification } = useAppContext();

  useEffect(() => {
    // Attempt to access the rear camera
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.warn('Camera access denied or unavailable:', error);
        // Fallback to simulated animation if camera is blocked/unavailable
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simulate a successful scan after 3 seconds for demonstration
  const handleSimulateScan = () => {
    setScanState('success');
    addNotification('QR Code detected!', 'success');
    
    // In a real app, this would decode the QR string (e.g., "st-001")
    // For this prototype, we'll pretend it scanned Thimphu Main Station
    setTimeout(() => {
      onScanSuccess('st-001'); // Pass back a station ID
      onClose();
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '2rem'
    }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button 
          onClick={onClose}
          style={{ 
            background: 'rgba(255,255,255,0.1)', 
            border: 'none', 
            borderRadius: '50%', 
            width: 48, 
            height: 48, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Scan Station QR</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Align the QR code within the frame to unlock</p>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '300px',
        aspectRatio: '1',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: scanState === 'success' ? '0 0 40px rgba(57, 255, 20, 0.5)' : '0 0 30px rgba(0,0,0,0.5)',
        border: `3px solid ${scanState === 'success' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
        transition: 'all 0.3s ease'
      }}>
        
        {/* Camera Feed or Simulated Feed */}
        {stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0a101d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <Camera size={48} color="rgba(255,255,255,0.2)" />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>Camera access required</span>
          </div>
        )}

        {/* Scanning Overlay UI */}
        {scanState === 'scanning' && (
          <>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.3)'
            }} />
            
            {/* Neon Scanning Line Animation */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '3px',
              background: 'var(--accent-primary)',
              boxShadow: '0 0 15px var(--accent-primary)',
              animation: 'scan-laser 2s infinite linear'
            }} />
            
            {/* Corner Markers */}
            <div style={{ position: 'absolute', top: 20, left: 20, width: 30, height: 30, borderTop: '4px solid var(--accent-primary)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '4px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 30, height: 30, borderTop: '4px solid var(--accent-primary)', borderRight: '4px solid var(--accent-primary)', borderRadius: '0 4px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 30, height: 30, borderBottom: '4px solid var(--accent-primary)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '0 0 0 4px' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 30, height: 30, borderBottom: '4px solid var(--accent-primary)', borderRight: '4px solid var(--accent-primary)', borderRadius: '0 0 4px 0' }} />
          </>
        )}

        {/* Success Overlay */}
        {scanState === 'success' && (
          <div className="animate-fade-in" style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(57, 255, 20, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <CheckCircle2 size={64} color="var(--accent-primary)" />
          </div>
        )}
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={handleSimulateScan}
          className="btn btn-primary"
          style={{ padding: '1rem 2rem', gap: '0.75rem', fontSize: '1rem' }}
        >
          <QrCode size={20} /> Simulate Scan
        </button>
      </div>

      <style>{`
        @keyframes scan-laser {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScannerModal;
