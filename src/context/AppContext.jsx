import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { EV_STATIONS } from '../data/mockData';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDocs,
  addDoc,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [totalOnlineUsers, setTotalOnlineUsers] = useState(0);
  const [stations, setStations] = useState(EV_STATIONS);
  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatorStatus, setSimulatorStatus] = useState('disconnected'); // connected | disconnected
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef(null);

  // ── Session persistence (DISABLED per user request) ──────────────────────────
  useEffect(() => {
    setLoading(false);
  }, []);

  // ── Real-time stations (Firestore) ───────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'stations'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setStations(data.length > 0 ? data : EV_STATIONS);
      setLoading(false);
    }, (err) => {
      console.warn('[Stations] listener error:', err.message);
      setStations(EV_STATIONS);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Real-time bookings (all users, for schedule and conflict prevention) ────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allBookings = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setBookings(allBookings);
      
      const convert12to24 = (timeStr) => {
        if (!timeStr) return -1;
        const [time, modifier] = timeStr.split(' ');
        let [hours] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours;
      };

      // GHOST FIX: If a station is reserved but has no matching booking for THIS HOUR, release it
      setStations(currentStations => {
        if (currentStations.length > 0) {
          const now = new Date();
          const utcToday = now.toISOString().split('T')[0];
          const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const todayStrings = [utcToday, localToday];
          const currentHour = now.getHours();

          currentStations.forEach(station => {
            if (station.status === 'reserved') {
              const hasLiveBooking = allBookings.some(b => 
                b.stationId === station.id && 
                (todayStrings.includes(b.date) || !b.date) &&
                convert12to24(b.time) === currentHour &&
                ['pending', 'confirmed', 'active'].includes(b.status)
              );
              if (!hasLiveBooking) {
                console.log(`[Ghost Fix] Releasing stuck station: ${station.name}`);
                updateDoc(doc(db, 'stations', station.id), { 
                  status: 'available', 
                  reservedBy: null, 
                  reservedUntil: null, 
                  lastUpdated: Date.now() 
                }).catch(() => {});
              }
            }
          });
        }
        return currentStations;
      });
    }, (err) => console.warn('[Bookings] listener error:', err.message));
    return unsub;
  }, []); // Empty dependency array prevents re-subscribing to bookings on every station change

  // ── Auto-Release No-Shows (15 Min Grace Period) ──────────────────────────
  useEffect(() => {
    const checkNoShows = () => {
      if (bookings.length === 0 || stations.length === 0) return;
      const now = new Date();
      const utcToday = now.toISOString().split('T')[0];
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayStrings = [utcToday, localToday];

      bookings.forEach(b => {
        if (['pending', 'confirmed'].includes(b.status) && (todayStrings.includes(b.date) || !b.date)) {
          if (!b.time) return;
          const timeParts = b.time.match(/(\d+):(\d+)\s(AM|PM)/);
          if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const mins = parseInt(timeParts[2]);
            const ampm = timeParts[3];
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            const bookingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins);
            const diffMs = now - bookingDate;
            const diffMins = Math.floor(diffMs / 60000);

            // If 15 minutes past the start time...
            if (diffMins >= 15) {
              const station = stations.find(s => s.id === b.stationId);
              // Only cancel if station is STILL reserved (meaning they didn't plug in)
              if (station && station.status === 'reserved') {
                console.log(`[Auto-Release] Booking ${b.id} expired. User no-show.`);
                
                // 1. Mark booking as cancelled (no-show)
                updateDoc(doc(db, 'bookings', b.id), { 
                  status: 'cancelled',
                  cancelReason: 'no-show (15 min limit)',
                  updatedAt: Date.now() 
                }).catch(() => {});

                // 2. Release station
                updateDoc(doc(db, 'stations', b.stationId), {
                  status: 'available',
                  reservedBy: null,
                  reservedUntil: null,
                  lastUpdated: Date.now()
                }).catch(() => {});

                // 3. Notify simulator
                if (socketRef.current) {
                  socketRef.current.emit('admin_override', { 
                    stationId: b.stationId, 
                    status: 'available' 
                  });
                }
              }
            }
          }
        }
      });
    };

    const interval = setInterval(checkNoShows, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [bookings, stations]);

  // ── Real-time sessions (current user) ────────────────────────────────────────
  useEffect(() => {
    if (!user) { setSessions([]); setActiveSession(null); return; }
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setSessions(all);
      const running = all.find(s => s.status === 'active');
      setActiveSession(running || null);
    }, (err) => console.warn('[Sessions] listener error:', err.message));
    return unsub;
  }, [user]);

  // ── Real-time user credits (live wallet sync) ─────────────────────────────
  // Keeps credits in sync when server deducts after IoT unplug or booking
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (snap.exists()) {
        const fresh = snap.data();
        if (fresh.credits !== undefined) {
          setUser(prev => {
            if (!prev || prev.credits === fresh.credits) return prev;
            const updated = { ...prev, credits: fresh.credits };
            localStorage.setItem('ev_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    }, (err) => console.warn('[UserCredits] listener error:', err.message));
    return unsub;
  }, [user?.id]);

  // ── Online users count ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'online'));
    const unsub = onSnapshot(q, (snapshot) => setTotalOnlineUsers(snapshot.size));
    return unsub;
  }, []);

  // ── Socket.IO connection to OCPP Simulator ──────────────────────────────────
  useEffect(() => {
    const SIMULATOR_URL = import.meta.env.VITE_SIMULATOR_URL || 'http://localhost:4000';
    let socket;

    const connectSocket = async () => {
      try {
        // Dynamic import so build doesn't fail if server is down
        const { io } = await import('socket.io-client');
        socket = io(SIMULATOR_URL, { transports: ['websocket'], reconnection: true });
        socketRef.current = socket;

        socket.on('connect', () => {
          setSimulatorStatus('connected');
          console.log('[Socket.IO] Connected to OCPP simulator');
        });

        socket.on('connect_error', (err) => {
          setSimulatorStatus('disconnected');
          console.error('[Socket.IO] Connection Error:', err.message);
          // Only notify once to avoid spamming
          if (!window.hasNotifiedOffline) {
            addNotification(`Simulator Offline: ${err.message}. Check if server is running on port 4000.`, 'error');
            window.hasNotifiedOffline = true;
          }
        });

        socket.on('disconnect', () => {
          setSimulatorStatus('disconnected');
          console.log('[Socket.IO] Disconnected from simulator');
        });

        // Live status updates from simulator
        socket.on('station_status_update', ({ stationId, status }) => {
          setStations(prev =>
            prev.map(s => s.id === stationId ? { ...s, status, lastUpdated: Date.now() } : s)
          );
        });

        socket.on('reservation_conflict', ({ stationId }) => {
          addNotification(`System Conflict: A vehicle was physically plugged into a reserved station (${stationId}).`, 'error');
        });

        socket.on('session_started', ({ stationId, sessionId }) => {
          setStations(prev =>
            prev.map(s => s.id === stationId ? { ...s, status: 'charging' } : s)
          );
        });

        socket.on('session_stopped', ({ stationId }) => {
          setStations(prev =>
            prev.map(s => s.id === stationId ? { ...s, status: 'available' } : s)
          );
        });
      } catch {
        setSimulatorStatus('disconnected');
      }
    };

    connectSocket();
    return () => { if (socket) socket.disconnect(); };
  }, []);

  // ── Tab close cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleTabClose = () => {
      if (user) {
        updateDoc(doc(db, 'users', user.id), { status: 'offline', lastSeen: Date.now() }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleTabClose);
    return () => window.removeEventListener('beforeunload', handleTabClose);
  }, [user]);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const isAdmin = email.toLowerCase().endsWith('@evhub.com');
      const userId = isAdmin ? 'admin-1' : `user-${email.replace(/[^a-z0-9]/gi, '')}`;

      // Read existing user data from Firestore to preserve credits balance
      const existingDoc = await getDoc(doc(db, 'users', userId));
      const existingData = existingDoc.exists() ? existingDoc.data() : {};

      const userData = {
        id: userId,
        name: existingData.name || email.split('@')[0],
        email,
        role: isAdmin ? 'admin' : 'user',
        credits: existingData.credits ?? (isAdmin ? 9999 : 1500), // preserve real balance
        status: 'online',
        lastSeen: Date.now(),
      };
      await setDoc(doc(db, 'users', userData.id), userData, { merge: true });
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('ev_user', JSON.stringify(userData));
      addNotification(`Welcome back, ${userData.name}! ⚡`, 'success');
      return { success: true };
    } catch (error) {
      addNotification('Login failed: ' + error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const role = formData.email?.toLowerCase().endsWith('@evhub.com') ? 'admin' : 'user';
      const newUser = {
        id: `user-${Date.now()}`,
        ...formData,
        credits: 1500,
        history: [],
        createdAt: Date.now(),
        role,
        status: 'online',
        lastSeen: Date.now(),
      };
      await setDoc(doc(db, 'users', newUser.id), newUser);
      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('ev_user', JSON.stringify(newUser));
      addNotification('Account created! Welcome to EV Hub ⚡', 'success');
      return { success: true };
    } catch (error) {
      addNotification('Registration failed', 'error');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user) {
      updateDoc(doc(db, 'users', user.id), { status: 'offline', lastSeen: Date.now() }).catch(() => {});
    }
    if (socketRef.current) socketRef.current.disconnect();
    setIsAuthenticated(false);
    setUser(null);
    setBookings([]);
    setSessions([]);
    setActiveSession(null);
    localStorage.removeItem('ev_user');
    addNotification('Logged out successfully', 'info');
  };

  // ── Notifications ─────────────────────────────────────────────────────────────
  const addNotification = (message, type = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  const createSystemNotification = async (title, msg, type = 'info') => {
    try {
      await addDoc(collection(db, 'system_notifications'), {
        title, msg, type,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) { console.error('Failed to create system notification:', e); }
  };

  // ── Booking ───────────────────────────────────────────────────────────────────
  const bookSlot = async (stationId, connectorId, time, duration, dateStr) => {
    if (!user) { addNotification('Please login first', 'error'); return; }
    
    setLoading(true);
    // Default to today if dateStr is not provided
    const date = dateStr || new Date().toISOString().split('T')[0];

    try {
      const hasConflict = bookings.find(b => 
        b.stationId === stationId && 
        b.date === date && 
        b.time.trim() === time.trim() && 
        ['pending', 'confirmed', 'charging'].includes(b.status)
      );

      if (hasConflict) {
        addNotification('This time slot is already reserved by another user', 'error');
        setLoading(false);
        return;
      }

      const station = stations.find(s => s.id === stationId);
      const isAvailable = station?.status === 'available';
      const newBooking = {
        userId: user.id,
        userName: user.name,
        stationId,
        stationName: station?.name || 'Unknown',
        connectorId,
        time,
        date,
        duration,
        price: 50, // Fixed reservation fee
        status: isAvailable ? 'confirmed' : 'pending',
        createdAt: Date.now(),
      };
      await addDoc(collection(db, 'bookings'), newBooking);
      
      createSystemNotification(
        'New Reservation', 
        `${user.name} has reserved a slot at ${station?.name || 'Unknown'} for ${time}.`,
        'success'
      );
      
      // RULE: Booking only affects status if it's for TODAY and the CURRENT HOUR
      const now = new Date();
      const utcToday = now.toISOString().split('T')[0];
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayStrings = [utcToday, localToday];
      const currentHour = now.getHours();
      
      const convert12to24 = (timeStr) => {
        if (!timeStr) return -1;
        const [time, modifier] = timeStr.split(' ');
        let [hours] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours;
      };

      if (isAvailable && todayStrings.includes(date) && convert12to24(time) === currentHour) {
        await updateDoc(doc(db, 'stations', stationId), {
          status: 'reserved',
          reservedBy: user.name,
          reservedUntil: time,
          lastUpdated: Date.now(),
        }).catch(() => {});
      }
      // Deduct Nu 50 reservation fee from user credits
      const newCredits = (user.credits || 0) - 50;
      await updateDoc(doc(db, 'users', user.id), { credits: newCredits }).catch(() => {});
      setUser(prev => ({ ...prev, credits: newCredits }));
      localStorage.setItem('ev_user', JSON.stringify({ ...user, credits: newCredits }));

      addNotification(`Slot reserved for ${time} ✅ (Nu 50 deducted)`, 'success');
    } catch (error) {
      addNotification('Booking failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      // 1. Update Booking status to cancelled
      await updateDoc(doc(db, 'bookings', bookingId), { 
        status: 'cancelled',
        updatedAt: Date.now() 
      });
      
      // 2. Release the station if it was reserved by this booking
      const station = stations.find(s => s.id === booking.stationId);
      if (station && station.status === 'reserved') {
        await updateDoc(doc(db, 'stations', station.id), {
          status: 'available',
          reservedBy: null,
          reservedUntil: null,
          lastUpdated: Date.now()
        });
        
        // Notify simulator to release the lock
        if (socketRef.current) {
          socketRef.current.emit('admin_override', { 
            stationId: station.id, 
            status: 'available' 
          });
        }
      }
      addNotification('Reservation cancelled and slot released ✅', 'success');
    } catch (error) {
      addNotification('Cancel failed: ' + error.message, 'error');
    }
  };

  const deleteBooking = async (bookingId) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'bookings', bookingId));
      addNotification('Booking removed from history', 'info');
    } catch (error) {
      addNotification('Delete failed: ' + error.message, 'error');
    }
  };

  // ── Start Charging Session ────────────────────────────────────────────────────
  const startSession = async (stationId) => {
    if (!user) { addNotification('Please login first', 'error'); return null; }
    try {
      const station = stations.find(s => s.id === stationId);
      
      const now = new Date();
      const utcToday = now.toISOString().split('T')[0];
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayStrings = [utcToday, localToday];
      
      const currentHour = now.getHours();

      const convert12to24 = (timeStr) => {
        if (!timeStr) return -1;
        const [time, modifier] = timeStr.split(' ');
        let [hours] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours;
      };
      
      // AUTHENTICATION CHECK: Verify user has an active booking for this station today and now
      const activeBooking = bookings.find(b => 
        b.stationId === stationId && 
        b.userId === user.id &&
        (todayStrings.includes(b.date) || !b.date) &&
        convert12to24(b.time) === currentHour &&
        ['pending', 'confirmed'].includes(b.status)
      );

      if (!activeBooking) {
        const otherBooking = bookings.find(b => 
          b.stationId === stationId && 
          b.userId === user.id &&
          (todayStrings.includes(b.date) || !b.date) &&
          ['pending', 'confirmed'].includes(b.status)
        );
        if (otherBooking) {
          addNotification(`Reservation time mismatch (reserved: ${otherBooking.time})`, 'error');
        } else {
          addNotification('You must reserve this station first to scan!', 'error');
        }
        return null;
      }

      // Update the booking to 'active'
      await updateDoc(doc(db, 'bookings', activeBooking.id), {
        status: 'active',
        updatedAt: Date.now()
      }).catch(() => {});

      const session = {
        userId: user.id,
        userName: user.name,
        stationId,
        stationName: station?.name || 'Unknown',
        status: 'active',
        energyConsumed: 0,
        startTime: new Date().toISOString(),
        createdAt: Date.now(),
      };
      const ref = await addDoc(collection(db, 'sessions'), session);
      await updateDoc(doc(db, 'stations', stationId), {
        status: 'charging', lastUpdated: Date.now(),
      }).catch(() => {});

      // Admin override via socket
      if (socketRef.current) {
        socketRef.current.emit('admin_override', { stationId, status: 'charging' });
      }

      addNotification('Charging session started! ⚡', 'success');
      
      createSystemNotification(
        'Charging Started',
        `${user.name} has plugged in at ${stations.find(s => s.id === stationId)?.name || 'Unknown'}.`,
        'info'
      );
      return ref.id;
    } catch (error) {
      addNotification('Failed to start session: ' + error.message, 'error');
      return null;
    }
  };

  const stopSession = async (sessionId, stationId) => {
    try {
      const energyConsumed = parseFloat((Math.random() * 20 + 5).toFixed(2));
      const energyCost = parseFloat((energyConsumed * 15).toFixed(2)); // Nu 15 per kWh

      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        endTime: new Date().toISOString(),
        energyConsumed,
        totalCost: energyCost,
      });

      // Mark the linked booking as completed
      const linked = bookings.find(b =>
        b.stationId === stationId &&
        b.userId === user?.id &&
        ['active', 'confirmed', 'pending'].includes(b.status)
      );
      if (linked) {
        await updateDoc(doc(db, 'bookings', linked.id), {
          status: 'completed', updatedAt: Date.now()
        }).catch(() => {});
      }

      await updateDoc(doc(db, 'stations', stationId), {
        status: 'available', lastUpdated: Date.now(),
      }).catch(() => {});

      // Deduct energy cost from credits
      const newCredits = Math.max(0, (user?.credits || 0) - energyCost);
      await updateDoc(doc(db, 'users', user.id), { credits: newCredits }).catch(() => {});
      setUser(prev => ({ ...prev, credits: newCredits }));
      localStorage.setItem('ev_user', JSON.stringify({ ...user, credits: newCredits }));

      if (socketRef.current) {
        socketRef.current.emit('admin_override', { stationId, status: 'available' });
      }

      addNotification(`Session complete — ${energyConsumed} kWh (Nu ${energyCost} charged) ✅`, 'success');
      
      createSystemNotification(
        'Charging Completed',
        `${user?.name || 'User'} finished charging at ${stations.find(s => s.id === stationId)?.name || 'Unknown'}. Energy: ${energyConsumed} kWh, Cost: Nu ${energyCost}.`,
        'success'
      );
    } catch (error) {
      addNotification('Failed to stop session: ' + error.message, 'error');
    }
  };

  // ── Station Status Override ───────────────────────────────────────────────────
  const updateStationStatus = async (stationId, status) => {
    try {
      await updateDoc(doc(db, 'stations', stationId), { status, lastUpdated: Date.now() });
      if (socketRef.current) socketRef.current.emit('admin_override', { stationId, status });
      addNotification(`Station status → ${status}`, 'info');
    } catch {
      setStations(prev => prev.map(s => s.id === stationId ? { ...s, status } : s));
    }
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, user, setUser,
      login, register, logout,
      stations, setStations,
      notifications, addNotification, removeNotification,
      bookings, bookSlot, cancelBooking, deleteBooking,
      sessions, activeSession,
      startSession, stopSession,
      updateStationStatus,
      loading, totalOnlineUsers,
      simulatorStatus,
      searchQuery, setSearchQuery,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
