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
  const [stations, setStations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatorStatus, setSimulatorStatus] = useState('disconnected'); // connected | disconnected
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

  // ── Real-time bookings (all users) ────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allBookings = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setBookings(allBookings);
    }, (err) => console.warn('[Bookings] listener error:', err.message));
    return unsub;
  }, []);

  // ── GHOST FIX: Background Cleanup ──────────────────────────────────────────
  useEffect(() => {
    if (stations.length === 0) return;

    const timer = setTimeout(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHour = now.getHours();

      const convertTo24 = (timeStr) => {
        if (!timeStr) return -1;
        const [time, modifier] = timeStr.split(' ');
        let [hours] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours;
      };

      stations.forEach(station => {
        if (station.status === 'reserved') {
          const hasLiveBooking = bookings.some(b => 
            b.stationId === station.id && 
            (b.date === todayStr || !b.date) &&
            convertTo24(b.time) === currentHour &&
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
    }, 2000); // Wait 2s for all listeners to settle

    return () => clearTimeout(timer);
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

  // ── Online users count ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'online'));
    const unsub = onSnapshot(q, (snapshot) => setTotalOnlineUsers(snapshot.size));
    return unsub;
  }, []);

  // ── Socket.IO connection to OCPP Simulator ──────────────────────────────────
  useEffect(() => {
    const SIMULATOR_URL = import.meta.env.VITE_SIMULATOR_URL || `http://${window.location.hostname}:4000`;
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

        socket.on('disconnect', () => {
          setSimulatorStatus('disconnected');
        });

        // Live status updates from simulator
        socket.on('station_status_update', ({ stationId, status }) => {
          setStations(prev =>
            prev.map(s => s.id === stationId ? { ...s, status, lastUpdated: Date.now() } : s)
          );
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

        socket.on('charging_completed', ({ stationId, userId, message }) => {
          const currentUserStr = localStorage.getItem('ev_user');
          if (currentUserStr) {
            const currentUser = JSON.parse(currentUserStr);
            if (currentUser.id === userId || !userId) {
              // Add the pop-up notification
              addNotification(`🔋 ${message}`, 'success');
            }
          }
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
      const userData = {
        id: isAdmin ? 'admin-1' : `user-${email.replace(/[^a-z0-9]/gi, '')}`,
        name: email.split('@')[0],
        email,
        role: isAdmin ? 'admin' : 'user',
        credits: 500,
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

  // ── Booking ───────────────────────────────────────────────────────────────────
  const bookSlot = async (stationId, connectorId, time, duration, dateStr, price) => {
    if (!user) { addNotification('Please login first', 'error'); return; }
    
    setLoading(true);
    // Default to today if dateStr is not provided
    const date = dateStr || new Date().toISOString().split('T')[0];

    try {
      // 1. STRIcT CONFLICT CHECK via Firestore (prevents race conditions/closure staleness)
      const q = query(
        collection(db, 'bookings'),
        where('stationId', '==', stationId),
        where('date', '==', date),
        where('time', '==', time),
        where('status', 'in', ['pending', 'confirmed', 'charging'])
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        addNotification('This time slot is already booked by another user', 'error');
        setLoading(false);
        return;
      }

      // 2. Fallback check for old bookings without date
      const oldConflict = bookings.find(b => 
         b.stationId === stationId && 
         !b.date && 
         b.time.trim() === time.trim() && 
         ['pending', 'confirmed', 'charging'].includes(b.status)
      );

      if (oldConflict) {
        addNotification('This time slot is already booked by another user', 'error');
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
        price: price || (parseInt(duration) / 60 * 300), // Fallback if price missing
        status: isAvailable ? 'confirmed' : 'pending',
        createdAt: Date.now(),
      };
      await addDoc(collection(db, 'bookings'), newBooking);
      
      // RULE: Booking only affects status if it's for TODAY and the CURRENT HOUR
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      
      const convert12to24 = (timeStr) => {
        if (!timeStr) return -1;
        const [time, modifier] = timeStr.split(' ');
        let [hours] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours;
      };

      if (isAvailable && date === todayStr && convert12to24(time) === currentHour) {
        await updateDoc(doc(db, 'stations', stationId), {
          status: 'reserved',
          reservedBy: user.name,
          reservedUntil: time,
          lastUpdated: Date.now(),
        }).catch(() => {});
      }
      addNotification(`Slot booked for ${time} ✅`, 'success');
    } catch (error) {
      addNotification('Booking failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      const updateData = booking ? { ...booking, status: 'cancelled' } : { status: 'cancelled' };
      delete updateData.id; // Prevent id field from polluting Firestore data
      await setDoc(doc(db, 'bookings', bookingId), updateData, { merge: true });
      
      // RULE: If no charging is active, cancelling booking returns station to available
      if (booking) {
        const station = stations.find(s => s.id === booking.stationId);
        if (station && station.status === 'reserved') {
           updateStationStatus(station.id, 'available');
        }
      }
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
      const session = {
        userId: user.id,
        userName: user.name,
        stationId,
        stationName: stations.find(s => s.id === stationId)?.name || 'Unknown',
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
      return ref.id;
    } catch (error) {
      addNotification('Failed to start session: ' + error.message, 'error');
      return null;
    }
  };

  const stopSession = async (sessionId, stationId) => {
    try {
      const energyConsumed = parseFloat((Math.random() * 20 + 5).toFixed(2));
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        endTime: new Date().toISOString(),
        energyConsumed,
      });
      await updateDoc(doc(db, 'stations', stationId), {
        status: 'available', lastUpdated: Date.now(),
      }).catch(() => {});

      if (socketRef.current) {
        socketRef.current.emit('admin_override', { stationId, status: 'available' });
      }

      addNotification(`Session complete — ${energyConsumed} kWh delivered ✅`, 'success');
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
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
