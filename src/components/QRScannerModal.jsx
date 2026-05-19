import React, { useEffect, useState, useRef } from 'react';
import { X, QrCode, Camera, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const QRScannerModal = ({ onClose, onScanSuccess }) => {
  const [scanState, setScanState] = useState('scanning'); // scanning | verifying | success | failed
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([
    { label: 'Reading Station QR', status: 'pending' },
    { label: 'Verifying User Account', status: 'pending' },
    { label: 'Checking Active Reservations', status: 'pending' },
    { label: 'Unlocking Charger Solenoid', status: 'pending' }
  ]);
  
  const { addNotification, bookings, user, stations } = useAppContext();
  const [libLoaded, setLibLoaded] = useState(false);
  const scannerRef = useRef(null);
  const isCameraActive = useRef(false);

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

        const handleSuccess = (decodedText) => {
          // Immediately mark inactive to prevent unmount double-stop
          isCameraActive.current = false;
          
          // Stop camera FIRST. Only transition state when stopped, keeping the DOM container alive
          html5QrCode.stop().then(() => {
            setScanState('verifying');
            runVerification(decodedText);
          }).catch(err => {
            console.warn("Error stopping scanner, forcing transition:", err);
            setScanState('verifying');
            runVerification(decodedText);
          });
        };

        // Define verification inside useEffect to have access to scope
        const runVerification = async (decodedText) => {
          // Step 1: Read QR
          setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'success' } : s));
          setCurrentStep(1);
          await new Promise(r => setTimeout(r, 600));

          // Step 2: Verify User
          if (!user) {
            setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'failed' } : s));
            setScanState('failed');
            setErrorMessage('No authenticated user found. Please login.');
            return;
          }
          setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'success' } : s));
          setCurrentStep(2);
          await new Promise(r => setTimeout(r, 600));

          // Step 3: Check Reservation
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          
          let stationId = decodedText;
          if (decodedText.includes('universal') || decodedText === 'ev-hub-universal') {
            stationId = 'universal';
          } else if (decodedText.includes('/')) {
            const parts = decodedText.split('/');
            stationId = parts[parts.length - 1];
          }

          let finalStationId = stationId;
          let activeBooking = null;

          if (stationId === 'universal') {
            activeBooking = bookings.find(b => 
              b.userId === user.id &&
              (b.date === todayStr || !b.date) &&
              ['pending', 'confirmed'].includes(b.status)
            );
            if (activeBooking) {
              finalStationId = activeBooking.stationId;
            }
          } else {
            activeBooking = bookings.find(b => 
              b.stationId === stationId && 
              b.userId === user.id &&
              (b.date === todayStr || !b.date) &&
              ['pending', 'confirmed'].includes(b.status)
            );
          }

          if (!activeBooking) {
            setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed' } : s));
            setScanState('failed');
            setErrorMessage('You must reserve a station first to scan!');
            addNotification('You must reserve a station first to scan!', 'error');
            
            // Automatically redirect to dashboard after 1.8 seconds
            setTimeout(() => {
              onClose();
            }, 1800);
            return;
          }

          setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'success' } : s));
          setCurrentStep(3);
          await new Promise(r => setTimeout(r, 600));

          // Step 4: Unlock Solenoid
          setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'success' } : s));
          await new Promise(r => setTimeout(r, 500));

          setScanState('success');
          setTimeout(() => {
            onScanSuccess(stationId);
            onClose();
          }, 1000);
        };

        html5QrCode.start(
          { facingMode: "environment" }, // Prioritize back camera for mobile
          {
            fps: 15,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            isCameraActive.current = true;
            handleSuccess(decodedText);
          },
          (errorMessage) => {
            // Quietly ignore frame errors when no QR is visible
          }
        ).then(() => {
          isCameraActive.current = true;
        }).catch((err) => {
          console.warn("Back camera failed, trying front camera:", err);
          // Fallback to user (front) camera if environment camera fails (e.g. on laptops)
          html5QrCode.start(
            { facingMode: "user" },
            { fps: 15, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              isCameraActive.current = true;
              handleSuccess(decodedText);
            },
            () => {}
          ).then(() => {
            isCameraActive.current = true;
          }).catch(fallbackErr => {
            console.error("All cameras failed to start:", fallbackErr);
            isCameraActive.current = false;
          });
        });
      } catch (err) {
        console.error("Html5Qrcode initialization error:", err);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && isCameraActive.current) {
        try {
          // Only stop if camera is confirmed active
          isCameraActive.current = false;
          scannerRef.current.stop()
            .then(() => console.log("Camera stopped cleanly on unmount"))
            .catch(err => console.warn("Camera stop error on unmount:", err));
        } catch (e) {
          console.warn("Camera stop sync exception on unmount:", e);
        }
      }
    };
  }, [libLoaded]);

  // Simulate scan fallback - dynamically picks the user's reserved station
  const handleSimulateScan = () => {
    // Reset steps
    setSteps([
      { label: 'Reading Station QR', status: 'pending' },
      { label: 'Verifying User Account', status: 'pending' },
      { label: 'Checking Active Reservations', status: 'pending' },
      { label: 'Unlocking Charger Solenoid', status: 'pending' }
    ]);
    
    // Simulate reading 'universal' QR code
    isCameraActive.current = false;

    const startVerification = () => {
      setScanState('verifying');

      const runVerification = async () => {
        // Step 1
        setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'success' } : s));
        setCurrentStep(1);
        await new Promise(r => setTimeout(r, 600));

        // Step 2
        if (!user) {
          setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'failed' } : s));
          setScanState('failed');
          setErrorMessage('No authenticated user found.');
          return;
        }
        setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'success' } : s));
        setCurrentStep(2);
        await new Promise(r => setTimeout(r, 600));

        // Step 3: Check Reservation
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const activeBooking = bookings.find(b => 
          b.userId === user.id &&
          (b.date === todayStr || !b.date) &&
          ['pending', 'confirmed'].includes(b.status)
        );

        if (!activeBooking) {
          setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed' } : s));
          setScanState('failed');
          setErrorMessage('You must reserve a station first to scan!');
          addNotification('You must reserve a station first to scan!', 'error');
          
          // Auto redirect to dashboard after 1.8 seconds
          setTimeout(() => {
            onClose();
          }, 1800);
          return;
        }

        setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'success' } : s));
        setCurrentStep(3);
        await new Promise(r => setTimeout(r, 600));

        // Step 4
        setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'success' } : s));
        await new Promise(r => setTimeout(r, 500));

        setScanState('success');
        setTimeout(() => {
          onScanSuccess('universal');
          onClose();
        }, 1000);
      };

      runVerification();
    };

    if (scannerRef.current) {
      scannerRef.current.stop()
        .then(() => startVerification())
        .catch(err => {
          console.warn("Simulate stop catch:", err);
          startVerification();
        });
    } else {
      startVerification();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(12px)',
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>EV Hub Scanner</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
          {scanState === 'scanning' && 'Align the QR code within the frame to unlock'}
          {scanState === 'verifying' && 'Running secure handshake protocol...'}
          {scanState === 'success' && 'Verification Complete! Charger Unlocked.'}
          {scanState === 'failed' && 'Security Verification Failed'}
        </p>
      </div>

      {scanState === 'scanning' ? (
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '300px',
          aspectRatio: '1',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          border: '3px solid rgba(255,255,255,0.1)',
          background: '#0a101d'
        }}>
          <div id="qr-reader-container" style={{ width: '100%', height: '100%' }} />
        </div>
      ) : (
        <div className="glass animate-fade-in" style={{
          width: '100%',
          maxWidth: '350px',
          padding: '2rem',
          borderRadius: '24px',
          border: `1px solid ${scanState === 'success' ? 'var(--accent-primary)' : scanState === 'failed' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: scanState === 'success' ? '0 0 30px rgba(57,255,20,0.15)' : scanState === 'failed' ? '0 0 30px rgba(239,68,68,0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: idx > currentStep ? 0.4 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{step.label}</span>
              <span style={{ 
                fontSize: '0.85rem', 
                fontWeight: 800,
                color: step.status === 'success' ? 'var(--accent-primary)' : step.status === 'failed' ? '#ef4444' : '#64748b'
              }}>
                {step.status === 'success' && '✓'}
                {step.status === 'failed' && '✗'}
                {step.status === 'pending' && idx === currentStep && '...'}
                {step.status === 'pending' && idx > currentStep && 'WAIT'}
              </span>
            </div>
          ))}

          {scanState === 'failed' && (
            <div className="animate-shake" style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
              fontSize: '0.8rem',
              textAlign: 'center',
              fontWeight: 600
            }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      {scanState === 'scanning' && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={handleSimulateScan}
            className="btn btn-primary hover-scale"
            style={{ padding: '0.75rem 1.5rem', gap: '0.5rem', fontSize: '0.9rem' }}
          >
            <QrCode size={18} /> Simulate Scan
          </button>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            Tip: Scan any QR containing a valid Station ID or use Simulation
          </span>
        </div>
      )}

      {scanState === 'failed' && (
        <button 
          onClick={() => {
            setScanState('scanning');
            setSteps([
              { label: 'Reading Station QR', status: 'pending' },
              { label: 'Verifying User Account', status: 'pending' },
              { label: 'Checking Active Reservations', status: 'pending' },
              { label: 'Unlocking Charger Solenoid', status: 'pending' }
            ]);
            setCurrentStep(0);
          }}
          className="btn btn-outline"
          style={{ marginTop: '2rem', padding: '0.75rem 1.5rem' }}
        >
          Try Again
        </button>
      )}

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
