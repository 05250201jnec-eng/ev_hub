import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [totalOnlineUsers, setTotalOnlineUsers]       = useState(0);
  const [totalRegisteredUsers, setTotalRegisteredUsers] = useState(0);
  const [stations, setStations]                       = useState([]);
  const [bookings, setBookings]                       = useState([]);
  const [sessions, setSessions]                       = useState([]);
  const [ocppLog, setOcppLog]                         = useState([]);
  const [simulatorStatus, setSimulatorStatus]         = useState('disconnected');
  const [notifications, setNotifications]           = useState([]);
  const [loading, setLoading]                         = useState(true);
  const [error, setError]                             = useState(null);
  const [socket, setSocket]                           = useState(null);

  // ── Firestore listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [];
    try {
      unsubs.push(onSnapshot(
        query(collection(db, 'users'), where('status', '==', 'online')),
        snap => setTotalOnlineUsers(snap.size),
        err  => console.warn('[Admin] online users:', err.message)
      ));
      unsubs.push(onSnapshot(
        collection(db, 'users'),
        snap => { setTotalRegisteredUsers(snap.size); setLoading(false); },
        err  => { setError(err.message); setLoading(false); }
      ));
      unsubs.push(onSnapshot(
        collection(db, 'stations'),
        snap => setStations(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.warn('[Admin] stations:', err.message)
      ));
      unsubs.push(onSnapshot(
        collection(db, 'bookings'),
        snap => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.warn('[Admin] bookings:', err.message)
      ));
      unsubs.push(onSnapshot(
        collection(db, 'sessions'),
        snap => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.warn('[Admin] sessions:', err.message)
      ));
      unsubs.push(onSnapshot(
        query(collection(db, 'system_notifications'), where('timestamp', '>', 0)),
        snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)),
        err  => console.warn('[Admin] notifications:', err.message)
      ));
      unsubs.push(onSnapshot(
        collection(db, 'ocpp_logs'),
        snap => setOcppLog(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)),
        err  => console.warn('[Admin] ocpp_logs:', err.message)
      ));
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
    return () => unsubs.forEach(u => u());
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
    }, 3000); // Wait 3s for data to sync across network

    return () => clearTimeout(timer);
  }, [bookings, stations]);

  // ── Socket.IO → OCPP Simulator ────────────────────────────────────────────
  useEffect(() => {
    let socket;
    const SIMULATOR_URL = import.meta.env.VITE_SIMULATOR_URL || `http://${window.location.hostname}:4000`;

    const connect = async () => {
      try {
        // Fetch initial logs
        console.log('[AdminContext] Fetching logs from:', `${SIMULATOR_URL}/api/ocpp-log`);
        const logRes = await fetch(`${SIMULATOR_URL}/api/ocpp-log`).catch(err => {
          console.error('[AdminContext] Log fetch failed:', err.message);
          return null;
        });

        if (logRes && logRes.ok) {
          const logs = await logRes.json();
          console.log(`[AdminContext] Fetched ${logs.length} historical logs.`);
          setOcppLog(logs);
        } else if (logRes) {
          console.error('[AdminContext] Log fetch error status:', logRes.status);
        }

        const { io } = await import('socket.io-client');
        const s = io(SIMULATOR_URL, { transports: ['websocket'], reconnection: true });
        setSocket(s);

        s.on('connect',    () => setSimulatorStatus('connected'));
        s.on('disconnect', () => setSimulatorStatus('disconnected'));

        s.on('ocpp_event', (entry) => {
          console.log('[AdminContext] Received OCPP event:', entry);
          setOcppLog(prev => [entry, ...prev].slice(0, 80));
        });

        s.on('station_status_update', ({ stationId, status }) => {
          setStations(prev => prev.map(s => s.id === stationId ? { ...s, status } : s));
        });
      } catch {
        setSimulatorStatus('disconnected');
      }
    };

    connect();
    return () => { 
      // Use the local variable from the useEffect scope if possible, 
      // but connect() is async, so we'll just handle it inside connect or rely on setSocket(null)
    };
  }, []);

  // ── Admin actions ──────────────────────────────────────────────────────────
  const overrideStationStatus = async (stationId, status) => {
    try {
      const updates = { status, lastUpdated: Date.now() };
      if (status === 'available') {
        updates.reservedBy = null;
        updates.reservedUntil = null;
      }
      await updateDoc(doc(db, 'stations', stationId), updates);
      if (socket) {
        socket.emit('admin_override', { stationId, status });
      }
    } catch (err) {
      console.error('[Admin] override failed:', err.message);
    }
  };

  const deleteBooking = async (bookingId) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        const station = stations.find(s => s.id === booking.stationId);
        if (station && station.status === 'reserved') {
          await updateDoc(doc(db, 'stations', station.id), {
            status: 'available',
            reservedBy: null,
            reservedUntil: null,
            lastUpdated: Date.now()
          });
        }
      }
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'bookings', bookingId));
      return { success: true };
    } catch (err) {
      console.error('[Admin] delete booking failed:', err.message);
      return { success: false, error: err.message };
    }
  };

  const updateUser = async (updates) => {
    try {
      const saved = JSON.parse(localStorage.getItem('ev_user') || 'null');
      if (!saved?.id) return { success: false };
      await updateDoc(doc(db, 'users', saved.id), updates);
      localStorage.setItem('ev_user', JSON.stringify({ ...saved, ...updates }));
      return { success: true };
    } catch { return { success: false }; }
  };

  return (
    <AdminContext.Provider value={{
      totalOnlineUsers, totalRegisteredUsers,
      stations, bookings, sessions,
      ocppLog, simulatorStatus, socket,
      overrideStationStatus, deleteBooking,
      loading, error, updateUser,
      notifications,
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => useContext(AdminContext);
