
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
    const dLon = (lng2 - lng1) * Math.PI / 180; 
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
        attributionControl: false, // Clean look
        scrollWheelZoom: 'center' // Better UX
      });

      // Use a cleaner, high-contrast map tile for better readability
      // Applied custom class for desaturation
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 20,
        subdomains: 'abcd',
        className: 'map-tiles'
      });
      
      tileLayer.addTo(mapRef.current);

      // Detect manual interaction to disable "Follow Me"
      mapRef.current.on('dragstart', () => { 
          isUserInteractingRef.current = true; 
          setIsFollowing(false); 
      });
      mapRef.current.on('zoomstart', () => { 
          isUserInteractingRef.current = true; 
          setIsFollowing(false); 
      });
    }

    // ResizeObserver to ensure map fills container correctly
    const resizeObserver = new ResizeObserver(() => {
        if(mapRef.current) mapRef.current.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); 

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
                            <div class="absolute inset-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
                            <div class="absolute inset-1 bg-white rounded-full shadow-lg"></div>
                            <div class="absolute inset-2 bg-blue-600 rounded-full border border-white"></div>
                        </div>
                      `,
                      iconSize: [32, 32],
                      iconAnchor: [16, 16]
                  });
                  userMarkerRef.current = L.marker(latLng, { icon: pulseIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
              } else {
                  userMarkerRef.current.setLatLng(latLng);
              }

              // B. Update Accuracy Circle (Subtle)
              if (!accuracyCircleRef.current) {
                  accuracyCircleRef.current = L.circle(latLng, {
                      radius: acc,
                      color: 'transparent',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.05
                  }).addTo(mapRef.current);
              } else {
                  accuracyCircleRef.current.setLatLng(latLng);
                  accuracyCircleRef.current.setRadius(acc);
              }

              // C. "Follow Me" Logic
              // Only follow if explicit state says so AND user isn't interacting manually
              if (isFollowing && !isUserInteractingRef.current) {
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
  }, [onLocationUpdate, isFollowing]);

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

      // Collect bounds to fit map later
      const bounds = L.latLngBounds([]);
      if (userMarkerRef.current) {
          bounds.extend(userMarkerRef.current.getLatLng());
      }

      // Add Store Markers
      stores.forEach(store => {
          const isSelected = selectedStore?.id === store.id;
          
          let colorClass = 'bg-orange-500';
          let ringClass = 'ring-orange-200';
          let svg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`;
          
          if (store.type === 'produce') { 
              colorClass = 'bg-emerald-500';
              ringClass = 'ring-emerald-200';
              svg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
          }
          if (store.type === 'dairy') { 
              colorClass = 'bg-blue-500'; 
              ringClass = 'ring-blue-200';
              svg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`;
          }
          
          const iconHtml = `
            <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'z-50' : 'z-10 hover:z-50'}">
                <div class="w-10 h-10 ${colorClass} rounded-full rounded-br-none transform rotate-45 flex items-center justify-center shadow-lg border-2 border-white transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
                    ${svg}
                </div>
                ${isSelected ? `<div class="absolute -bottom-2 w-4 h-1 bg-black/20 rounded-full blur-[2px]"></div>` : ''}
                ${isSelected ? `<div class="absolute -inset-4 ${ringClass} rounded-full opacity-30 animate-ping"></div>` : ''}
            </div>
          `;

          const icon = L.divIcon({
              className: 'bg-transparent',
              html: iconHtml,
              iconSize: [40, 40],
              iconAnchor: [20, 40] // Bottom center anchor
          });

          const marker = L.marker([store.lat, store.lng], { icon, zIndexOffset: isSelected ? 500 : 0 })
              .addTo(mapRef.current)
              .on('click', () => {
                  onSelectStore(store);
                  mapRef.current.flyTo([store.lat, store.lng], 16, { duration: 0.8 });
                  isUserInteractingRef.current = true; // Stop following user
                  setIsFollowing(false);
              });
          
          storeMarkersRef.current.push(marker);
          bounds.extend([store.lat, store.lng]);
      });

      // Render Route if valid
      if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
      
      // Dynamic Padding based on Screen Size (Mobile vs Desktop)
      const isMobile = window.innerWidth < 768;
      const bottomPadding = isMobile ? 180 : 80; // Larger bottom padding on mobile for floating card
      const sidePadding = isMobile ? 50 : 80;

      if (showRoute && selectedStore && userMarkerRef.current) {
          const userLatLng = userMarkerRef.current.getLatLng();
          const storeLatLng = [selectedStore.lat, selectedStore.lng];
          
          // Modern solid route line with shadow effect
          const shadowLine = L.polyline([userLatLng, storeLatLng], {
              color: 'black',
              weight: 8,
              opacity: 0.1,
              lineCap: 'round'
          }).addTo(mapRef.current);
          routeLineRef.current = L.layerGroup([
              shadowLine,
              L.polyline([userLatLng, storeLatLng], {
                  color: '#10b981', // Brand Emerald
                  weight: 5,
                  opacity: 1,
                  lineCap: 'round',
                  dashArray: '1, 12', // Dot dash
                  dashOffset: '0'
              })
          ]).addTo(mapRef.current);

          const d = getDistance(userLatLng.lat, userLatLng.lng, selectedStore.lat, selectedStore.lng);
          setDistanceText(`${d.toFixed(1)} km`);

          // Fit map to route (User <-> Store)
          const routeBounds = L.latLngBounds([userLatLng, storeLatLng]);
          mapRef.current.fitBounds(routeBounds, { 
              paddingTopLeft: [sidePadding, sidePadding],
              paddingBottomRight: [sidePadding, bottomPadding], 
              maxZoom: 16, 
              animate: true 
          });
          setIsFollowing(false);
          isUserInteractingRef.current = true; 

      } else {
          setDistanceText('');

          // If showing stores list (not route), fit map to show all visible stores + user
          if (stores.length > 0 && !selectedStore && !isUserInteractingRef.current && bounds.isValid()) {
             mapRef.current.fitBounds(bounds, { 
                 paddingTopLeft: [40, 40],
                 paddingBottomRight: [40, 40], // Less padding needed when no card is selected
                 maxZoom: 15, 
                 animate: true 
             });
             setIsFollowing(false);
          }
      }

  }, [stores, selectedStore, showRoute]);

  // --- Handlers ---
  const handleRecenter = (e: React.MouseEvent) => {
      e.stopPropagation();
      isUserInteractingRef.current = false;
      setIsFollowing(true);
      if (userMarkerRef.current && mapRef.current) {
          mapRef.current.flyTo(userMarkerRef.current.getLatLng(), 17, { animate: true, duration: 0.8 });
      } else {
          startTracking(); // Restart if lost
      }
  };

  return (
    <div className={`w-full bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-inner border border-white/50 group ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 relative outline-none" style={{ minHeight: '100%' }} />

      {/* --- Top Left: GPS Indicator Pill --- */}
      <div className="absolute top-4 left-4 z-[400] pointer-events-none">
          <div className="glass-panel px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 animate-fade-in transition-all">
              {gpsStatus === 'LOCKED' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-700">GPS Active</span>
                  </>
              ) : gpsStatus === 'SEARCHING' ? (
                  <>
                     <div className="w-3 h-3 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                     <span className="text-[10px] font-bold text-slate-500">Locating...</span>
                  </>
              ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold text-slate-500">GPS Off</span>
                  </>
              )}
          </div>
      </div>

      {/* --- Top Right: Recenter FAB --- */}
      <div className="absolute top-4 right-4 z-[400]">
          <button
            onClick={handleRecenter}
            className={`w-10 h-10 glass-panel rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
                isFollowing ? 'text-blue-600 bg-blue-50/50 border-blue-200' : 'text-slate-500 hover:text-blue-600'
            }`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
             </svg>
          </button>
      </div>

      {/* --- Bottom: Store Card (Floating Glass) --- */}
      {selectedStore && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] animate-slide-up">
            <div className="glass-panel p-4 rounded-[1.5rem] shadow-xl flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                     selectedStore.type === 'produce' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 
                     selectedStore.type === 'dairy' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 
                     'bg-gradient-to-br from-orange-400 to-orange-600'
                 }`}>
                    {selectedStore.type === 'produce' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : selectedStore.type === 'dairy' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                     <h4 className="font-black text-slate-900 text-sm truncate">{selectedStore.name}</h4>
                     <p className="text-[11px] text-slate-500 font-medium truncate">{selectedStore.address}</p>
                     <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-slate-600 bg-white/60 px-2 py-0.5 rounded-md border border-slate-100">
                             {distanceText || selectedStore.distance}
                         </span>
                         {mode === 'DELIVERY' && (
                             <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50/80 px-2 py-0.5 rounded-md">
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 ~12 min
                             </span>
                         )}
                     </div>
                 </div>
                 {enableExternalNavigation && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`, '_blank');
                        }}
                        className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors shadow-lg active:scale-95 flex-shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                 )}
            </div>
        </div>
      )}
    </div>
  );
};
