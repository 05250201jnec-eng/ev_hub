import React, { useEffect, useState, useRef } from 'react';
import { X, QrCode, Camera, CheckCircle2, Plug, Zap, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const QRScannerModal = ({ onClose, onScanSuccess }) => {
  const [scanState, setScanState] = useState('scanning'); // scanning | verifying | plug_in | success | failed
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState([
    { label: 'Reading Station QR', status: 'pending' },
    { label: 'Verifying User Account', status: 'pending' },
    { label: 'Checking Active Reservations', status: 'pending' },
    { label: 'Unlocking Charger Solenoid', status: 'pending' }
  ]);
  
  const { addNotification, bookings, user, stations, activeSession } = useAppContext();
  const [libLoaded, setLibLoaded] = useState(false);
  const scannerRef = useRef(null);
  const isCameraActive = useRef(false);
  const [resolvedStationId, setResolvedStationId] = useState('');

  // Auto-close when the physical ESP32 plug trigger starts the session in Firestore
  useEffect(() => {
    if (activeSession && resolvedStationId) {
      const isTargetMatch = resolvedStationId === 'universal' || activeSession.stationId === resolvedStationId;
      if (isTargetMatch) {
        addNotification("⚡ Contactless connection established! Charging session started.", "success");
        handleClose();
      }
    }
  }, [activeSession, resolvedStationId]);

  // Load html5-qrcode dynamically from CDN once
  useEffect(() => {
    if (window.Html5Qrcode) {
      setLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => setLibLoaded(true);
    document.body.appendChild(script);
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
          const utcToday = now.toISOString().split('T')[0];
          const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const todayStrings = [utcToday, localToday];
          
          let stationId = decodedText;
          if (decodedText.includes('universal') || decodedText === 'ev-hub-universal') {
            stationId = 'universal';
          } else if (decodedText.includes('/')) {
            const parts = decodedText.split('/');
            stationId = parts[parts.length - 1];
          }

          const convert12to24 = (timeStr) => {
            if (!timeStr) return -1;
            const [time, modifier] = timeStr.split(' ');
            let [hours] = time.split(':').map(Number);
            if (hours === 12) hours = 0;
            if (modifier === 'PM') hours += 12;
            return hours;
          };
          const currentHour = now.getHours();

          let finalStationId = stationId;
          let activeBooking = null;

          const todayBookings = bookings.filter(b => 
            b.userId === user.id &&
            (stationId === 'universal' || b.stationId === stationId) &&
            (todayStrings.includes(b.date) || !b.date) &&
            ['pending', 'confirmed'].includes(b.status)
          );

          if (todayBookings.length === 0) {
            setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed' } : s));
            setScanState('failed');
            setErrorMessage('You must reserve a station first to scan!');
            addNotification('You must reserve a station first to scan!', 'error');
            
            setTimeout(() => {
              handleClose();
            }, 2500);
            return;
          }

          activeBooking = todayBookings.find(b => convert12to24(b.time) === currentHour);

          if (!activeBooking) {
            const nextBooking = todayBookings[0];
            setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed' } : s));
            setScanState('failed');
            setErrorMessage(`Time mismatch! Your reservation is for ${nextBooking.time}. Please scan during your reserved hour.`);
            addNotification(`Reservation time mismatch (reserved: ${nextBooking.time})`, 'error');
            
            setTimeout(() => {
              handleClose();
            }, 3000);
            return;
          }

          if (stationId === 'universal') {
            finalStationId = activeBooking.stationId;
          }

          setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'success' } : s));
          setCurrentStep(3);
          await new Promise(r => setTimeout(r, 600));

          // Step 4: Unlock Solenoid
          setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'success' } : s));
          await new Promise(r => setTimeout(r, 500));

          setResolvedStationId(stationId);
          setScanState('plug_in');
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

  // Safely stop camera before calling onClose
  const handleClose = () => {
    if (scannerRef.current && isCameraActive.current) {
      isCameraActive.current = false;
      scannerRef.current.stop()
        .then(() => onClose())
        .catch(err => {
          console.warn("Error stopping scanner during manual close:", err);
          onClose();
        });
    } else {
      onClose();
    }
  };

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
        const utcToday = now.toISOString().split('T')[0];
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayStrings = [utcToday, localToday];

        const convert12to24 = (timeStr) => {
          if (!timeStr) return -1;
          const [time, modifier] = timeStr.split(' ');
          let [hours] = time.split(':').map(Number);
          if (hours === 12) hours = 0;
          if (modifier === 'PM') hours += 12;
          return hours;
        };
        const currentHour = now.getHours();

        const todayBookings = bookings.filter(b => 
          b.userId === user.id &&
          (todayStrings.includes(b.date) || !b.date) &&
          ['pending', 'confirmed'].includes(b.status)
        );

        if (todayBookings.length === 0) {
          setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed' } : s));
          setScanState('failed');
          setErrorMessage('You must reserve a station first to scan!');
          addNotification('You must reserve a station first to scan!', 'error');
          
          setTimeout(() => {
            handleClose();
          }, 2500);
          return;
        }

        const activeBooking = todayBookings.find(b => convert12to24(b.time) === currentHour);

        if (!activeBooking) {
          const nextBooking = todayBookings[0];
          setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'failed' } : s));
          setScanState('failed');
          setErrorMessage(`Time mismatch! Your reservation is for ${nextBooking.time}. Please scan during your reserved hour.`);
          addNotification(`Reservation time mismatch (reserved: ${nextBooking.time})`, 'error');
          
          setTimeout(() => {
            handleClose();
          }, 3000);
          return;
        }

        setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'success' } : s));
        setCurrentStep(3);
        await new Promise(r => setTimeout(r, 600));

        // Step 4
        setSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'success' } : s));
        await new Promise(r => setTimeout(r, 500));

        setResolvedStationId('universal');
        setScanState('plug_in');
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
          onClick={handleClose}
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
          {scanState === 'plug_in' && 'Vehicle verification successful!'}
          {scanState === 'success' && 'Verification Complete! Charger Unlocked.'}
          {scanState === 'failed' && 'Security Verification Failed'}
        </p>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '300px',
        aspectRatio: '1',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(0,0,0,0.5)',
        border: '3px solid rgba(255,255,255,0.1)',
        background: '#0a101d',
        display: scanState === 'scanning' ? 'block' : 'none' // Keep in DOM to avoid race unmount crash
      }}>
        <div id="qr-reader-container" style={{ width: '100%', height: '100%' }} />
      </div>

      {scanState === 'verifying' || scanState === 'failed' ? (
        <div className="glass animate-fade-in" style={{
          width: '100%',
          maxWidth: '350px',
          padding: '2rem',
          borderRadius: '24px',
          border: `1px solid ${scanState === 'failed' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: scanState === 'failed' ? '0 0 30px rgba(239,68,68,0.15)' : 'none',
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
      ) : null}

      {scanState === 'plug_in' && (
        <div className="glass animate-fade-in" style={{
          width: '100%',
          maxWidth: '350px',
          padding: '2rem',
          borderRadius: '24px',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 0 25px rgba(57,255,20,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          textAlign: 'center'
        }}>
          <div className="animate-bounce" style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'rgba(57,255,20,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
            border: '2px dashed var(--accent-primary)'
          }}>
            <Plug size={32} />
          </div>
          
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
              Reservation Verified!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Unlock complete! Please connect the physical charging cable to your car to begin.
            </p>
          </div>

          <button 
            onClick={() => {
              onScanSuccess(resolvedStationId);
              handleClose();
            }}
            className="btn btn-primary hover-scale"
            style={{
              width: '100%',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(57,255,20,0.3)',
              fontSize: '0.875rem'
            }}
          >
            <Zap size={16} /> Plug In Charger Cable 🔌
          </button>
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
