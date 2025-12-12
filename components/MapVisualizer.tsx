
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Store, OrderMode } from '../types';

interface MapVisualizerProps {
  stores: Store[];
  // Initial fallback location from parent
  userLat: number | null;
  userLng: number | null;
  userAccuracy?: number;
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
  className?: string;
  mode: OrderMode;
  showRoute?: boolean;
  enableExternalNavigation?: boolean;
  // Callback to inform parent of significant location changes
  onLocationUpdate?: (location: { lat: number; lng: number; accuracy: number }) => void;
  onRequestLocation?: () => void;
}

export const MapVisualizer: React.FC<MapVisualizerProps> = ({
  stores,
  userLat: initialLat,
  userLng: initialLng,
  userAccuracy,
  selectedStore,
  onSelectStore,
  className = "h-48",
  mode,
  showRoute = false,
  enableExternalNavigation = false,
  onLocationUpdate,
}) => {
  // --- Refs for Leaflet Instances (Mutable, no re-renders) ---
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const storeMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);

  // --- Local State for UI ---
  const [gpsStatus, setGpsStatus] = useState<'SEARCHING' | 'LOCKED' | 'DENIED' | 'ERROR'>('SEARCHING');
  const [accuracy, setAccuracy] = useState<number | null>(userAccuracy || null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [distanceText, setDistanceText] = useState('');

  // --- Helper: Haversine Distance ---
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180; // Fixed: Renamed dLng to dLon
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // km
  };

  // --- 1. Initialize Map ---
  useEffect(() => {
    const L = (window as any).L;
    if (!mapContainerRef.current || !L) return;

    if (!mapRef.current) {
      // Default center: Bengaluru or Initial Props
      const startLat = initialLat || 12.9716;
      const startLng = initialLng || 77.5946;

      mapRef.current = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 20,
        subdomains: 'abcd'
      }).addTo(mapRef.current);

      // Detect manual interaction to disable "Follow Me"
      mapRef.current.on('dragstart', () => { isUserInteractingRef.current = true; setIsFollowing(false); });
      mapRef.current.on('zoomstart', () => { isUserInteractingRef.current = true; setIsFollowing(false); });
    }

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run once

  // --- 2. Live Geolocation Tracking ---
  const startTracking = useCallback(() => {
      if (!navigator.geolocation) {
          setGpsStatus('ERROR');
          return;
      }

      setGpsStatus('SEARCHING');
      
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

      const L = (window as any).L;

      watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
              const { latitude, longitude, accuracy: acc } = pos.coords;
              if (latitude === 0 && longitude === 0) return; // Ignore bad data

              setGpsStatus('LOCKED');
              setAccuracy(acc);

              if (!mapRef.current) return;

              // A. Update User Marker (Blue Dot)
              const latLng = [latitude, longitude];
              
              if (!userMarkerRef.current) {
                  // Create Pulse Icon
                  const pulseIcon = L.divIcon({
                      className: 'user-marker',
                      html: `
                        <div class="relative w-8 h-8 flex items-center justify-center">
                            <div class="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                            <div class="absolute inset-1 bg-blue-500 rounded-full opacity-40"></div>
                            <div class="relative w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
                        </div>
                      `,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16]
                  });
                  userMarkerRef.current = L.marker(latLng, { icon: pulseIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
              } else {
                  userMarkerRef.current.setLatLng(latLng);
              }

              // B. Update Accuracy Circle
              if (!accuracyCircleRef.current) {
                  accuracyCircleRef.current = L.circle(latLng, {
                      radius: acc,
                      color: 'transparent',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.1
                  }).addTo(mapRef.current);
              } else {
                  accuracyCircleRef.current.setLatLng(latLng);
                  accuracyCircleRef.current.setRadius(acc);
              }

              // C. "Follow Me" Logic
              if (!isUserInteractingRef.current) {
                  mapRef.current.flyTo(latLng, 16, { animate: true, duration: 1 });
              }

              // D. Inform Parent (Throttled/Debounced in logic, direct call here)
              if (onLocationUpdate) {
                  onLocationUpdate({ lat: latitude, lng: longitude, accuracy: acc });
              }
          },
          (err) => {
              console.warn("GPS Error", err);
              if (err.code === 1) setGpsStatus('DENIED');
              else setGpsStatus('ERROR');
          },
          {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
          }
      );
  }, [onLocationUpdate]);

  useEffect(() => {
      startTracking();
  }, [startTracking]);

  // --- 3. Render Stores & Route ---
  useEffect(() => {
      if (!mapRef.current) return;
      const L = (window as any).L;

      // Clear existing store markers
      storeMarkersRef.current.forEach(m => mapRef.current.removeLayer(m));
      storeMarkersRef.current = [];

      // Add Store Markers
      stores.forEach(store => {
          const isSelected = selectedStore?.id === store.id;
          
          let color = '#f97316'; // orange
          let svg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`;
          
          if (store.type === 'produce') { 
              color = '#10b981'; 
              svg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
          }
          if (store.type === 'dairy') { 
              color = '#3b82f6'; 
              svg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`;
          }
          
          const icon = L.divIcon({
              className: 'custom-pin',
              html: `<div style="
                background-color: ${color};
                width: ${isSelected ? 48 : 36}px;
                height: ${isSelected ? 48 : 36}px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
              ">
                <div style="transform: rotate(45deg);">${svg}</div>
              </div>`,
              iconSize: [48, 48],
              iconAnchor: [24, 48]
          });

          const marker = L.marker([store.lat, store.lng], { icon, zIndexOffset: isSelected ? 500 : 0 })
              .addTo(mapRef.current)
              .on('click', () => {
                  onSelectStore(store);
                  mapRef.current.flyTo([store.lat, store.lng], 16);
                  isUserInteractingRef.current = true; // Stop following user
                  setIsFollowing(false);
              });
          
          storeMarkersRef.current.push(marker);
      });

      // Render Route if valid
      if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
      
      if (showRoute && selectedStore && userMarkerRef.current) {
          const userLatLng = userMarkerRef.current.getLatLng();
          const storeLatLng = [selectedStore.lat, selectedStore.lng];
          
          routeLineRef.current = L.polyline([userLatLng, storeLatLng], {
              color: '#10b981',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10',
              lineCap: 'round'
          }).addTo(mapRef.current);

          const d = getDistance(userLatLng.lat, userLatLng.lng, selectedStore.lat, selectedStore.lng);
          setDistanceText(`${d.toFixed(1)} km`);
      } else {
          setDistanceText('');
      }

  }, [stores, selectedStore, showRoute]);

  // --- Handlers ---
  const handleRecenter = (e: React.MouseEvent) => {
      e.stopPropagation();
      isUserInteractingRef.current = false;
      setIsFollowing(true);
      if (userMarkerRef.current && mapRef.current) {
          mapRef.current.flyTo(userMarkerRef.current.getLatLng(), 17, { animate: true });
      } else {
          startTracking(); // Restart if lost
      }
  };

  return (
    <div className={`w-full bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-inner border-[3px] border-white group ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 relative outline-none" style={{ minHeight: '100%' }} />

      {/* --- Top Left: GPS Status --- */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm flex items-center gap-2 animate-fade-in">
              {gpsStatus === 'LOCKED' ? (
                  <>
                    <div className="flex gap-0.5 items-end h-3">
                        <div className={`w-1 rounded-sm ${accuracy && accuracy < 50 ? 'bg-emerald-500' : 'bg-slate-300'} h-1.5`}></div>
                        <div className={`w-1 rounded-sm ${accuracy && accuracy < 20 ? 'bg-emerald-500' : 'bg-slate-300'} h-2`}></div>
                        <div className={`w-1 rounded-sm ${accuracy && accuracy < 10 ? 'bg-emerald-500' : 'bg-slate-300'} h-3`}></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-800 leading-none uppercase">GPS Active</span>
                        <span className="text-[8px] font-bold text-slate-400 leading-none">
                             ±{accuracy ? Math.round(accuracy) : '-'}m
                        </span>
                    </div>
                  </>
              ) : gpsStatus === 'SEARCHING' ? (
                  <>
                     <div className="w-3 h-3 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                     <span className="text-[10px] font-bold text-slate-500">Locating...</span>
                  </>
              ) : (
                  <span className="text-[10px] font-bold text-red-500">GPS Off</span>
              )}
          </div>
      </div>

      {/* --- Top Right: Recenter Button --- */}
      <div className="absolute top-4 right-4 z-[400]">
          <button
            onClick={handleRecenter}
            className={`w-10 h-10 bg-white rounded-xl shadow-lg border flex items-center justify-center transition-all active:scale-95 ${
                isFollowing ? 'text-blue-500 border-blue-200 bg-blue-50' : 'text-slate-400 border-slate-100 hover:text-blue-500'
            }`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
             </svg>
          </button>
      </div>

      {/* --- Bottom: Store Info Overlay --- */}
      {selectedStore && (
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-lg border border-white/50 z-[400] animate-fade-in-up flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm border border-white ${
                 selectedStore.type === 'produce' ? 'bg-emerald-500' : selectedStore.type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500'
             }`}>
                {selectedStore.type === 'produce' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ) : selectedStore.type === 'dairy' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                )}
             </div>
             <div className="flex-1 min-w-0">
                 <h4 className="font-black text-slate-800 text-sm truncate">{selectedStore.name}</h4>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                     <span>{distanceText || selectedStore.distance}</span>
                     {mode === 'DELIVERY' && <span className="text-emerald-600">• ~12 min</span>}
                 </div>
             </div>
             {enableExternalNavigation && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`, '_blank');
                    }}
                    className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </button>
             )}
        </div>
      )}
    </div>
  );
};
