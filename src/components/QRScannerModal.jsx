import React, { useEffect, useState, useRef } from 'react';
import { X, QrCode, Camera, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const QRScannerModal = ({ onClose, onScanSuccess }) => {
  const [scanState, setScanState] = useState('scanning'); // scanning | success
  const { addNotification, bookings, user } = useAppContext();
  const [libLoaded, setLibLoaded] = useState(false);
  const scannerRef = useRef(null);

  // Load html5-qrcode dynamically from CDN to avoid npm install blocks
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => setLibLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => console.warn(err));
      }
    };
  }, []);

  useEffect(() => {
    if (!libLoaded) return;

    const timer = setTimeout(() => {
      try {
        const html5QrCode = new window.Html5Qrcode("qr-reader-container");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" }, // Prioritize back camera for mobile
          {
            fps: 15,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            setScanState('success');
            addNotification('QR Code scanned successfully!', 'success');
            
            // Extract station ID from scan text (e.g. "st-001")
            let stationId = decodedText;
            if (decodedText.includes('/')) {
              const parts = decodedText.split('/');
              stationId = parts[parts.length - 1];
            }

            setTimeout(() => {
              onScanSuccess(stationId);
              onClose();
            }, 1200);
          },
          (errorMessage) => {
            // Quietly ignore frame errors when no QR is visible
          }
        ).catch((err) => {
          console.warn("Back camera failed, trying front camera:", err);
          // Fallback to user (front) camera if environment camera fails (e.g. on laptops)
          html5QrCode.start(
            { facingMode: "user" },
            { fps: 15, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              setScanState('success');
              addNotification('QR Code scanned successfully!', 'success');
              let stationId = decodedText;
              if (decodedText.includes('/')) {
                const parts = decodedText.split('/');
                stationId = parts[parts.length - 1];
              }
              setTimeout(() => {
                onScanSuccess(stationId);
                onClose();
              }, 1200);
            },
            () => {}
          ).catch(fallbackErr => {
            console.error("All cameras failed to start:", fallbackErr);
          });
        });
      } catch (err) {
        console.error("Html5Qrcode initialization error:", err);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.warn(err));
      }
    };
  }, [libLoaded]);

  // Simulate scan fallback - dynamically picks the user's reserved station
  const handleSimulateScan = () => {
    let targetStationId = 'st-001';
    
    if (user && bookings.length > 0) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      // Find user's active booking today
      const myBooking = bookings.find(b => 
        b.userId === user.id &&
        (b.date === todayStr || !b.date) &&
        ['pending', 'confirmed'].includes(b.status)
      );
      if (myBooking) {
        targetStationId = myBooking.stationId;
      }
    }

    setScanState('success');
    addNotification('QR Code simulated!', 'success');
    setTimeout(() => {
      onScanSuccess(targetStationId);
      onClose();
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
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
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
        transition: 'all 0.3s ease',
        background: '#0a101d'
      }}>
        
        <div id="qr-reader-container" style={{ width: '100%', height: '100%' }} />

        {scanState === 'success' && (
          <div className="animate-fade-in" style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(57, 255, 20, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            zIndex: 10
          }}>
            <CheckCircle2 size={64} color="var(--accent-primary)" />
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button 
          onClick={handleSimulateScan}
          className="btn btn-primary hover-scale"
          style={{ padding: '0.75rem 1.5rem', gap: '0.5rem', fontSize: '0.9rem' }}
        >
          <QrCode size={18} /> Simulate Scan
        </button>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Tip: You can scan any QR code containing a valid Station ID (e.g. <strong>st-001</strong>, <strong>st-014</strong>)
        </span>
      </div>

      <style>{`
        #qr-reader-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #qr-reader-container__scan_region {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default QRScannerModal;
