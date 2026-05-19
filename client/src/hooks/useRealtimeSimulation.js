import { useEffect, useRef } from 'react';

/**
 * Simulates real-time station status changes.
 * Every `intervalMs`, one random station's status and connectors will update,
 * mimicking what a real IoT/backend system would push via WebSocket.
 */
export const useRealtimeSimulation = (stations, setStations, addNotification, intervalMs = 8000) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStations(prev => {
        const idx = Math.floor(Math.random() * prev.length);
        const station = prev[idx];
        
        // Pick a new status randomly (weighted: available is most common)
        const rand = Math.random();
        let newStatus;
        if (rand < 0.55) newStatus = 'available';
        else if (rand < 0.85) newStatus = 'occupied';
        else newStatus = 'offline';

        // Don't notify if nothing changed
        if (newStatus === station.status) return prev;

        // Update connectors to match station status
        const updatedConnectors = station.connectors.map(conn => {
          if (newStatus === 'offline') return { ...conn, status: 'offline' };
          if (newStatus === 'available') {
            return { ...conn, status: Math.random() > 0.3 ? 'available' : 'occupied' };
          }
          // occupied
          return { ...conn, status: Math.random() > 0.4 ? 'occupied' : 'available' };
        });

        const updated = [...prev];
        updated[idx] = {
          ...station,
          status: newStatus,
          connectors: updatedConnectors,
          lastUpdated: Date.now()
        };

        // Fire notification
        const statusColors = { available: 'success', occupied: 'info', offline: 'error' };
        addNotification(
          `${station.name} is now ${newStatus.toUpperCase()}`,
          statusColors[newStatus]
        );

        return updated;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setStations, addNotification, intervalMs]);
};
