import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../context/AppContext';
import {
  Navigation2, Clock, X, Loader, LocateFixed, Search,
  MapPin, Zap, Star, Play, Lock, AlertCircle, QrCode
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import BookingModal from '../components/BookingModal';
import { bhutanBorder } from '../data/bhutanBorder';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_COLOR = {
  available: '#10b981',
  reserved:  '#3b82f6',
  charging:  '#f59e0b',
  occupied:  '#f59e0b',
  offline:   '#ef4444',
  fault:     '#b91c1c',
  locked:    '#f97316',
};

const MapPage = () => {
  const { stations, bookings, startSession, activeSession, addNotification, searchQuery } = useAppContext();
  const [selected, setSelected] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mapType, setMapType] = useState('roadmap');
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const markersRef = useRef({});
  const routeRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);
  const routeDestinationMarkerRef = useRef(null);
  const locationWatchId = useRef(null);
  const initialLocSet = useRef(false);

  const [userLocation, setUserLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [nearestStation, setNearestStation] = useState(null);

  const BHUTAN_BOUNDS = [
    [26.0, 88.0], // Southwest (Expanded)
    [29.0, 93.0]  // Northeast (Expanded)
  ];
  const INITIAL_CENTER = [27.5, 90.5];

  const refreshMarkers = () => {
    if (!map || !mapReady) return;

    const filtered = stations.filter(s => {
      const status = (s.status || 'available').toLowerCase();
      const currentFilter = filterStatus.toLowerCase();

      // Status Filter (Case-insensitive)
      const matchStatus = currentFilter === 'all' || 
        (currentFilter === 'charging' ? (status === 'charging' || status === 'occupied') : status === currentFilter);
      
      // Search Filter (Case-insensitive)
      const query = (searchQuery || '').toLowerCase().trim();
      const matchSearch = !query || 
        s.name?.toLowerCase().includes(query) || 
        s.location?.address?.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });

    console.log(`[Map] Full Refresh: ${filtered.length} markers`);
    
    // Clear and rebuild markers for absolute reliability
    Object.keys(markersRef.current).forEach(id => markersRef.current[id].remove());
    markersRef.current = {};

    filtered.forEach(s => {
      if (!s.location || s.location.lat === undefined || s.location.lng === undefined) return;
      
      const lat = parseFloat(s.location.lat);
      const lng = parseFloat(s.location.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const statusKey = (s.status || 'available').toLowerCase();
      const color = STATUS_COLOR[statusKey] || '#64748b';
      const isNearest = nearestStation?.id === s.id;
      const isLocked = statusKey === 'locked';
      const isFault = statusKey === 'fault';
      const glowAnim = statusKey === 'available' ? 'marker-glow-green' : 
                       (statusKey === 'charging' || statusKey === 'occupied') ? 'marker-glow-orange' : 
                       (statusKey === 'offline' || statusKey === 'fault') ? 'marker-glow-red' : 
                       statusKey === 'locked' ? 'marker-glow-purple' : 'marker-glow-blue';

      const svgIcon = isLocked 
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
        : isFault
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

      const icon = L.divIcon({
        html: `<div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
          ${isNearest ? `<div style="position:absolute; inset:-8px; background:${color}44; border-radius:50%; animation:ping 1.5s infinite;"></div>` : ''}
          <div style="background:${color}; width:28px; height:28px; border-radius:50%; border:2.5px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; position:relative; z-index:2; animation: ${glowAnim} 2s ease-in-out infinite;">
            ${svgIcon}
          </div>
          <div style="position:absolute; bottom:-4px; width:6px; height:6px; background:${color}; border-radius:50%; border:1.5px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:1;"></div>
        </div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: isNearest ? 1000 : 0 })
        .addTo(map)
        .on('click', () => setSelected(s));
      
      markersRef.current[s.id || Math.random()] = marker;
    });

    setTimeout(() => map.invalidateSize(), 200);
  };

  // ── Initialize Map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || map) return;

    const instance = L.map(mapRef.current, {
      center: INITIAL_CENTER,
      zoom: 8,
      minZoom: 7,
      maxZoom: 20,
      maxBounds: BHUTAN_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    instance.fitBounds(BHUTAN_BOUNDS, { animate: false });

    L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      attribution: '© Google', subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 20, maxNativeZoom: 20
    }).addTo(instance);

    // Draw Bhutan Border (Outer Glow/Shadow for depth)
    L.polyline(bhutanBorder, {
      color: '#020617',
      weight: 8,
      opacity: 0.3,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(instance);

    // Draw Bhutan Border (Main crisp bold line)
    L.polyline(bhutanBorder, {
      color: '#1e293b',
      weight: 3,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(instance);

    setMap(instance);
    setMapReady(true);

    // Initial check for location
    requestLocation(false);

    return () => {
      if (instance) {
        instance.remove();
      }
    };
  }, []);

  // Update markers when state changes
  useEffect(() => {
    refreshMarkers();
  }, [stations, filterStatus, nearestStation, map, mapReady, searchQuery]);

  // ── Auto-Pan to Search Result ────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !mapReady || !searchQuery || searchQuery.trim().length < 3) return;

    const query = searchQuery.toLowerCase().trim();
    const matches = stations.filter(s => 
      s.name?.toLowerCase().includes(query) || 
      s.location?.address?.toLowerCase().includes(query)
    );

    if (matches.length === 1) {
      const s = matches[0];
      const lat = parseFloat(s.location.lat);
      const lng = parseFloat(s.location.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log(`[Search] Auto-panning to: ${s.name}`);
        map.setView([lat, lng], 15, { animate: true, duration: 1 });
        setSelected(s);
      }
    } else if (matches.length > 1 && matches.length <= 5) {
      const bounds = L.latLngBounds(matches.map(s => [parseFloat(s.location.lat), parseFloat(s.location.lng)]));
      map.fitBounds(bounds.pad(0.3));
    }
  }, [searchQuery, map, mapReady]);

  // ── Fix for JNEC Duplicate Connectors ──────────────────────────────────────
  useEffect(() => {
    const jnec = stations.find(s => s.id === 'st-014');
    if (jnec && jnec.connectors?.[1]?.type === 'Type 2' && jnec.connectors?.[0]?.type === 'Type 2') {
      console.log('[Fix] Updating JNEC connectors in Firestore...');
      updateDoc(doc(db, 'stations', 'st-014'), {
        connectors: [
          { id: "c1", type: "GBT (Solar)", power: "22kW", status: "available", price: "Nu 12/kWh" },
          { id: "c2", type: "Type 2 (Solar)", power: "22kW", status: "available", price: "Nu 12/kWh" }
        ]
      }).catch(err => console.error('[Fix] Failed to update JNEC:', err));
    }
  }, [stations]);

  // Map type effect (Roadmap / Satellite)
  useEffect(() => {
    if (!map) return;
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    if (mapType === 'roadmap') {
      L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { 
        attribution: '© Google', 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], 
        maxZoom: 20, 
        maxNativeZoom: 20 
      }).addTo(map);
    } else {
      L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { 
        attribution: '© Google', 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], 
        maxZoom: 20, 
        maxNativeZoom: 20 
      }).addTo(map);
    }
  }, [mapType, map, mapReady]);

  // ── User Location & Nearest Station Tracking ─────────────────────────────────
  useEffect(() => {
    const isLocalIP = /^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && !isLocalIP) {
      addNotification("Secure HTTPS connection required for live location.", "error");
      return;
    }

    if (!navigator.geolocation) {
      addNotification("Geolocation is not supported by your browser.", "error");
      return;
    }

    locationWatchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const loc = [lat, lng];

        // Filter out low-accuracy jumps (e.g., indoor WiFi positioning > 150m)
        if (accuracy > 150 && userLocation) {
          console.warn(`[GPS] Ignoring low accuracy update: ${accuracy}m`);
          return;
        }

        setUserLocation(loc);

        if (map) {
          // Update Accuracy Circle (Blue halo)
          if (userAccuracyCircleRef.current) {
            userAccuracyCircleRef.current.setLatLng(loc);
            userAccuracyCircleRef.current.setRadius(accuracy);
          } else {
            userAccuracyCircleRef.current = L.circle(loc, {
              radius: accuracy,
              fillColor: '#4285F4',
              fillOpacity: 0.1,
              color: '#4285F4',
              weight: 1,
              opacity: 0.2,
            }).addTo(map);
          }

          // Update User Marker (Blue dot)
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(loc);
          } else {
            const icon = L.divIcon({
              html: `<div style="position:relative;width:20px;height:20px;">
                <div style="position:absolute;inset:0;background:rgba(66,133,244,0.3);border-radius:50%;animation:pulse 2s infinite"></div>
                <div style="position:absolute;top:4px;left:4px;width:12px;height:12px;background:#4285F4;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(66,133,244,0.6);"></div>
              </div>`,
              className: '', iconSize: [20, 20], iconAnchor: [10, 10],
            });
            userMarkerRef.current = L.marker(loc, { icon, zIndexOffset: 2000 }).addTo(map);
          }

          // Auto-center on first valid lock only
          if (!initialLocSet.current && accuracy < 100) {
             map.setView(loc, 15, { animate: true });
             initialLocSet.current = true;
          }
        }
      },
      (err) => {
        console.warn("[GPS Error]", err.code, err.message);
        if (err.code === 1) {
          addNotification("Location permission denied. Please click the map to set your location.", "warning");
        } else if (err.code === 3) {
          // Timeout - common indoors.
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (userLocation && stations.length > 0) {
      // Find nearest station for the marker "ping" animation (non-map-moving)
      let min = Infinity;
      let found = null;
      stations.forEach(s => {
        if (!s.location) return;
        const lat = parseFloat(s.location.lat);
        const lng = parseFloat(s.location.lng);
        const d = Math.sqrt(Math.pow(lat - userLocation[0], 2) + Math.pow(lng - userLocation[1], 2));
        if (d < min) { min = d; found = s; }
      });
      if (found) setNearestStation(found);
    }
  }, [userLocation, stations]);

  const requestLocation = (moveMap = true) => {
    if (userLocation && map && moveMap) {
      map.setView(userLocation, 15, { animate: true });
    } else if (!userLocation && moveMap) {
      addNotification("Waiting for GPS location lock...", "info");
    }
  };

  const locateAndJump = (targetLoc = null) => {
    if (!map || !stations.length) return;

    const performSearch = (loc) => {
      let min = Infinity;
      let found = null;
      
      // Phase 1: Try to find nearest AVAILABLE station
      stations.forEach(s => {
        if (!s.location || (s.status !== 'available' && s.status !== 'reserved')) return;
        const lat = parseFloat(s.location.lat);
        const lng = parseFloat(s.location.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const d = Math.sqrt(Math.pow(lat - loc[0], 2) + Math.pow(lng - loc[1], 2));
        if (d < min) { min = d; found = s; }
      });

      // Phase 2: If no available found, check ALL stations
      if (!found) {
        min = Infinity;
        stations.forEach(s => {
          if (!s.location) return;
          const lat = parseFloat(s.location.lat);
          const lng = parseFloat(s.location.lng);
          if (isNaN(lat) || isNaN(lng)) return;
          const d = Math.sqrt(Math.pow(lat - loc[0], 2) + Math.pow(lng - loc[1], 2));
          if (d < min) { min = d; found = s; }
        });
      }

      if (found) {
        const target = [parseFloat(found.location.lat), parseFloat(found.location.lng)];
        map.setView(target, 16, { animate: true, duration: 1.5 });
        setSelected(found);
        setNearestStation(found);
        addNotification(`Nearest: ${found.name}`, "success");
      } else {
        addNotification("No stations found in the network.", "warning");
      }
    };

    if (targetLoc) {
      performSearch(targetLoc);
    } else if (userLocation) {
      performSearch(userLocation);
    } else {
      addNotification("Getting GPS Lock...", "info");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          performSearch(loc);
        },
        () => {
          addNotification("Could not find you. Please click on your location on the map.", "warning");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleDirections = async (station) => {
    if (!map || !station?.location) return;

    if (!userLocation) {
      addNotification("Wait for GPS lock before navigating", "error");
      return;
    }

    setLoadingRoute(true);
    const lat = parseFloat(station.location.lat);
    const lng = parseFloat(station.location.lng);

    try {
      // Calculate straight-line distance for sanity check
      const straightDist = Math.sqrt(Math.pow(lat - userLocation[0], 2) + Math.pow(lng - userLocation[1], 2)) * 111; // approx km
      
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${lng},${lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      
      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        const routeKm = route.distance / 1000;

        // If route is > 3x straight distance and > 50km, it's likely a massive detour through India
        if (routeKm > straightDist * 3 && straightDist < 100) {
           addNotification("Note: Route takes a long detour through highways. Use mountain roads for shorter path.", "info");
        }

        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

        if (routeRef.current) routeRef.current.remove();
        if (routeDestinationMarkerRef.current) routeDestinationMarkerRef.current.remove();

        routeRef.current = L.polyline(coords, { color: '#3b82f6', weight: 5, opacity: 0.8 }).addTo(map);

        setRouteInfo({
          distance: (data.routes[0].distance / 1000).toFixed(1) + ' km',
          duration: Math.round(data.routes[0].duration / 60) + ' min'
        });
        map.fitBounds(routeRef.current.getBounds(), { padding: [50, 50] });
      } else {
        addNotification("Route not found", "warning");
      }
    } catch (e) {
      addNotification("Routing service error", "error");
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleStartSession = async (station) => {
    setStartingSession(true);
    const success = await startSession(station.id);
    setStartingSession(false);
    if (success) setSelected(null);
  };

  const currentSelected = selected ? stations.find(s => s.id === selected.id) : null;

  return (
    <div className="animate-fade-in map-layout" style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.25rem', position: 'relative' }}>
      <style>{`
        .map-layout {
          height: calc(100vh - 120px);
        }
        .map-sidebar {
          width: 360px;
          flex-shrink: 0;
        }
        .map-filters-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }
        .map-filters {
          display: flex;
          gap: 0.35rem;
        }
        .route-info-banner {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          z-index: 1000;
        }
        @media (max-width: 768px) {
          .map-layout {
            flex-direction: column;
            height: calc(100dvh - 100px) !important;
            gap: 0.5rem !important;
          }
          .map-filters-container {
            flex-direction: column;
            align-items: stretch !important;
          }
          .map-filters {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 2px;
          }
          .map-filters::-webkit-scrollbar {
            display: none;
          }
          .map-sidebar {
            width: 100% !important;
            height: auto;
            max-height: 50vh;
            overflow-y: auto;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2000;
            border-radius: 24px 24px 0 0 !important;
            padding: 1.5rem 1.5rem 3rem 1.5rem !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.6) !important;
            background: var(--bg-secondary) !important;
            border: 1px solid var(--border-color);
            border-bottom: none;
          }
          .map-empty-state {
            display: none !important;
          }
          /* Ensure map takes available space */
          .map-main-area {
            flex: 1;
            height: 100%;
          }
          .map-legend {
            display: none !important;
          }
          .route-info-banner {
            bottom: auto !important;
            top: 1rem !important;
            left: 1rem !important;
            right: auto !important;
            padding: 0.75rem 1rem !important;
            gap: 1rem !important;
          }
        }
      `}</style>

      <div className="map-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div className="map-filters-container">
          <div className="glass map-filters" style={{ padding: '0.35rem', borderRadius: 'var(--radius-md)' }}>
            {['all', 'available', 'charging', 'offline'].map(key => (
              <button key={key} onClick={() => setFilterStatus(key)} style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 700, background: filterStatus === key ? 'var(--accent-primary)' : 'transparent', color: filterStatus === key ? 'white' : 'var(--text-secondary)', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
                {key === 'offline' ? 'inactive' : key}
              </button>
            ))}
          </div>
          <div className="glass map-filters" style={{ padding: '0.35rem', borderRadius: 'var(--radius-md)' }}>
            <button onClick={() => setMapType('roadmap')} style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700, background: mapType === 'roadmap' ? 'var(--accent-primary)' : 'transparent', color: mapType === 'roadmap' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>ROADMAP</button>
            <button onClick={() => setMapType('satellite')} style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700, background: mapType === 'satellite' ? 'var(--accent-primary)' : 'transparent', color: mapType === 'satellite' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>SATELLITE</button>
          </div>
        </div>

        <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          
          {/* Map Legend */}
          <div className="glass map-legend" style={{ 
            position: 'absolute', 
            top: '1rem', 
            left: '1rem', 
            zIndex: 1000, 
            padding: '0.85rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: '130px'
          }}>
            <h4 style={{ 
              fontSize: '0.6rem', 
              fontWeight: 800, 
              color: 'var(--text-secondary)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              marginBottom: '0.2rem',
              opacity: 0.8
            }}>Station Legend</h4>
            {[
              { label: 'Available', color: '#10b981', icon: Zap },
              { label: 'Charging', color: '#f59e0b', icon: Zap },
              { label: 'Inactive', color: '#ef4444', icon: Zap },
              { label: 'Fault', color: '#b91c1c', icon: AlertCircle },
              { label: 'Connector Issue', color: '#f97316', icon: Lock }
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  background: item.color, 
                  boxShadow: `0 2px 8px ${item.color}55`,
                  border: '1.5px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {item.icon ? (
                    <item.icon 
                       size={11} 
                       strokeWidth={2.5}
                       fill={item.label === 'Available' || item.label === 'Charging' ? 'white' : 'none'} 
                    />
                  ) : null}
                </div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => requestLocation(true)} className="glass hover-scale" style={{ width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer' }}>
              <LocateFixed size={20} />
            </button>
            <button onClick={() => locateAndJump()} className="glass hover-scale" style={{ width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }} title="Find Nearest Station">
              <Zap size={20} fill="#10b981" />
            </button>
          </div>

          {routeInfo && (
            <div className="glass animate-fade-in route-info-banner" style={{ padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><Navigation2 size={18} color="var(--accent-primary)" /><span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{routeInfo.distance}</span></div>
              <div style={{ width: 1, height: 20, background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}><Clock size={18} color="var(--accent-primary)" /><span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{routeInfo.duration}</span></div>
              <button onClick={() => {
                if (routeRef.current) routeRef.current.remove();
                if (routeDestinationMarkerRef.current) routeDestinationMarkerRef.current.remove();
                setRouteInfo(null);
              }} style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
          )}
        </div>
      </div>

      {currentSelected ? (
        <div className="glass animate-slide-in map-sidebar" style={{ borderRadius: 'var(--radius-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>{currentSelected.name}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} /> {currentSelected.location?.address}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`status-badge status-${currentSelected.status || 'available'}`}>
              {(currentSelected.status === 'locked' ? 'CONNECTOR ISSUE' : 
                currentSelected.status || 'available').toUpperCase()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}><Star size={14} fill="#f59e0b" /> {currentSelected.rating || '4.5'}</div>
          </div>

          <div style={{ 
            width: '100%', 
            height: '180px', 
            borderRadius: 'var(--radius-md)', 
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            marginTop: '0.5rem'
          }}>
            <img 
              src="/station-preview.png" 
              alt={currentSelected.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              padding: '1rem', 
              background: 'linear-gradient(transparent, rgba(15,23,42,0.9))',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem'
            }}>
              {currentSelected.amenities?.filter(a => !['Restroom', 'WiFi', 'Library'].includes(a)).map(amenity => (
                <span key={amenity} style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  background: 'rgba(255,255,255,0.1)', 
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Connectors</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentSelected.connectors?.map(conn => (
                <div key={conn.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.05)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)' }}>
                      <Zap size={14} fill="currentColor" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{conn.type}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{conn.power} • {conn.price}</div>
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: 700, 
                    color: conn.status === 'available' ? '#10b981' : '#f59e0b',
                    textTransform: 'uppercase'
                  }}>
                    {conn.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {selected.status !== 'offline' && (
              <button onClick={() => setBookingOpen(true)} className="btn btn-primary" style={{ height: 52 }}>📅 Reserve Slot</button>
            )}
            <button onClick={() => handleDirections(selected)} disabled={loadingRoute} className="btn btn-outline" style={{ height: 52 }}>
              {loadingRoute ? <Loader className="animate-spin" size={20} /> : <><Navigation2 size={18} /> Navigate</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass map-sidebar map-empty-state" style={{ borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <MapPin size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Select a Station</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Click a marker to view details</p>
        </div>
      )}
      {bookingOpen && <BookingModal station={selected} onClose={() => setBookingOpen(false)} />}
    </div>
  );
};

export default MapPage;
