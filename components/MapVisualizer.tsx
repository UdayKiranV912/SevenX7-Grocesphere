
import React, { useEffect, useRef, useState } from 'react';
import { Store, OrderMode } from '../types';

interface MapVisualizerProps {
  stores: Store[];
  userLat: number | null;
  userLng: number | null;
  userAccuracy?: number | null; // Accuracy in meters
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
  className?: string;
  mode: OrderMode; 
  showRoute?: boolean; // Explicit control for showing route line
  enableExternalNavigation?: boolean; // Control for Google Maps button
  onRequestLocation?: () => void;
}

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ 
  stores, 
  userLat, 
  userLng, 
  userAccuracy,
  selectedStore, 
  onSelectStore, 
  className = "h-48",
  mode,
  showRoute = false,
  enableExternalNavigation = false,
  onRequestLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const hasCenteredRef = useRef(false);
  const prevStoreIdRef = useRef<string | null>(null);
  
  // Center fallback: Bangalore or Store
  const mapCenterLat = userLat || (selectedStore ? selectedStore.lat - 0.008 : 12.9716);
  const mapCenterLng = userLng || (selectedStore ? selectedStore.lng - 0.005 : 77.5946);
  
  const [dynamicDistance, setDynamicDistance] = useState<string>('');
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Sync state with props
  useEffect(() => {
    if (userLat && userLng) {
        setHasUserLocation(true);
        if (isLocating) setIsLocating(false); 
    } else {
        setHasUserLocation(false);
    }
  }, [userLat, userLng]);

  // Haversine Distance Calc
  const calculateDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1) + ' km';
  };

  // Update distance based on props updates
  useEffect(() => {
      // Prioritize real user location if available
      const lat = userLat;
      const lng = userLng;

      if (selectedStore && lat && lng) {
          const dist = calculateDist(lat, lng, selectedStore.lat, selectedStore.lng);
          setDynamicDistance(dist);
      } else {
        setDynamicDistance('');
      }
  }, [userLat, userLng, selectedStore]);

  const handleLocateMe = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLocating(true);
    hasCenteredRef.current = false; // Reset so the next update forces recenter

    if (onRequestLocation) {
        onRequestLocation();
    }

    if (mapInstanceRef.current && userLat && userLng) {
        // Immediate visual feedback if we have location
        mapInstanceRef.current.flyTo([userLat, userLng], 16, { animate: true, duration: 1.5 });
        setTimeout(() => setIsLocating(false), 1500);
    } else {
        // Fallback timeout
        setTimeout(() => setIsLocating(false), 8000);
    }
  };

  const openGoogleMaps = (e?: React.MouseEvent) => {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    if (selectedStore) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`;
        window.open(url, '_blank');
    }
  };

  // Map Initialization & Updates
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [mapCenterLat, mapCenterLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        trackResize: true
      });

      // Use CartoDB Voyager for a much cleaner, app-like look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '',
        maxZoom: 20,
        subdomains: 'abcd'
      }).addTo(mapInstanceRef.current);
      
      // Fix for map not rendering tiles correctly in some containers
      setTimeout(() => {
          mapInstanceRef.current.invalidateSize();
      }, 100);
    } 

    // Handle User Marker & Accuracy Circle
    if (userLat && userLng) {
        const latLng = [userLat, userLng];
        
        // Custom Pulse Marker
        if (!userMarkerRef.current) {
             userMarkerRef.current = L.marker(latLng, {
                icon: L.divIcon({
                    className: 'user-pin-live',
                    html: `
                      <div class="relative w-full h-full flex items-center justify-center">
                        <div class="w-4 h-4 bg-blue-500 rounded-full border-[3px] border-white shadow-lg z-20 relative"></div>
                        <div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping z-10"></div>
                        <div class="absolute w-20 h-20 bg-blue-400/10 rounded-full z-0"></div>
                      </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                }),
                zIndexOffset: 1000
             }).addTo(mapInstanceRef.current);
        } else {
            userMarkerRef.current.setLatLng(latLng);
            // Smoothly move marker if it exists (Leaflet handles this mostly, but setLatLng is instant. 
            // For smoother animation, one would need a plugin, but standard update is usually fine for walking speed).
        }

        // Accuracy Circle
        if (userAccuracy) {
            if (!accuracyCircleRef.current) {
                accuracyCircleRef.current = L.circle(latLng, {
                    radius: userAccuracy,
                    color: '#3b82f6',
                    weight: 1,
                    opacity: 0,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.08
                }).addTo(mapInstanceRef.current);
            } else {
                accuracyCircleRef.current.setLatLng(latLng);
                accuracyCircleRef.current.setRadius(userAccuracy);
            }
        }
        
        // Initial Center Logic
        // Only center if we haven't yet, OR if user explicitly requested location
        if (!hasCenteredRef.current && !selectedStore && !showRoute) {
            mapInstanceRef.current.setView(latLng, 15);
            hasCenteredRef.current = true;
        }
    } else {
        // Remove marker if location is lost/null
        if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
        }
        if (accuracyCircleRef.current) {
             mapInstanceRef.current.removeLayer(accuracyCircleRef.current);
             accuracyCircleRef.current = null;
        }
    }

    // Update Store Markers
    markersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m));
    markersRef.current = [];

    const createIcon = (type: Store['type'], isSelected: boolean) => {
       let color = '#ef4444'; 
       let emoji = '🏪';
       let borderColor = isSelected ? '#000' : '#fff';
       
       if (type === 'produce') {
         color = '#22c55e';
         emoji = '🥦';
       } else if (type === 'dairy') {
         color = '#3b82f6';
         emoji = '🥛';
       }

       const size = isSelected ? 48 : 36;

       return L.divIcon({
          className: 'custom-pin',
          html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50% 50% 50% 5px;
            transform: rotate(-45deg);
            border: ${isSelected ? '3px' : '2px'} solid ${borderColor};
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex; 
            align-items: center; 
            justify-content: center;
            z-index: ${isSelected ? 100 : 1};
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
          ">
            <div style="transform: rotate(45deg); font-size: ${isSelected ? 24 : 18}px; line-height: 1;">${emoji}</div>
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size/2, size] // Anchor at the bottom tip
       });
    };

    stores.forEach(store => {
      const isSelected = selectedStore?.id === store.id;
      const marker = L.marker([store.lat, store.lng], {
        icon: createIcon(store.type, isSelected),
        zIndexOffset: isSelected ? 1000 : 0
      }).addTo(mapInstanceRef.current);

      marker.on('click', () => {
          onSelectStore(store);
          // Only zoom to store if not in route mode, otherwise the route logic handles view
          if (!showRoute) {
            mapInstanceRef.current.flyTo([store.lat, store.lng], 16, { animate: true, duration: 1 });
          }
      });
      markersRef.current.push(marker);
    });

    // Handle Route Line & Bounds
    if (routeLineRef.current) {
        mapInstanceRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
    }

    // Draw route and Fit Bounds
    if (selectedStore && showRoute && userLat && userLng) {
        const latlngs = [
            [userLat, userLng],
            [selectedStore.lat, selectedStore.lng]
        ];
        
        // Consistent line style for visibility, dashed for both to imply 'path'
        routeLineRef.current = L.polyline(latlngs, {
            color: '#059669', // Brand Green
            weight: 6,
            opacity: 0.9,
            dashArray: '12, 12', 
            lineCap: 'round',
            className: 'animate-dash' // Assuming global css animation for dash
        }).addTo(mapInstanceRef.current);

        // Calculate Bounds Logic
        // We only auto-fit bounds if:
        // 1. We just switched to this store (new selection)
        // 2. We just enabled routing
        // 3. The user explicitly asked to "Locate Me"/Center
        const storeChanged = prevStoreIdRef.current !== selectedStore.id;
        
        if (storeChanged || isLocating) {
            const bounds = L.latLngBounds(latlngs);
            // Add padding for accuracy
            if (userAccuracy) {
                 const accuracyBuffer = userAccuracy / 111000; 
                 bounds.extend([userLat + accuracyBuffer, userLng + accuracyBuffer]);
                 bounds.extend([userLat - accuracyBuffer, userLng - accuracyBuffer]);
            }
            mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
            hasCenteredRef.current = true;
        }
        
        prevStoreIdRef.current = selectedStore.id;
    }

  }, [stores, userLat, userLng, userAccuracy, selectedStore, onSelectStore, mode, showRoute, enableExternalNavigation, isLocating]);

  return (
    <div className={`w-full bg-slate-100 rounded-[2.5rem] overflow-hidden relative shadow-inner border border-white ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 outline-none" style={{ minHeight: '100%' }}></div>

      <button 
        onClick={handleLocateMe}
        className={`absolute top-4 left-4 z-[1000] w-11 h-11 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isLocating ? 'text-brand-DEFAULT ring-2 ring-brand-light' : 
            !hasUserLocation ? 'text-slate-300' : 'text-slate-700 hover:text-brand-DEFAULT'
        }`}
        title="Recenter Map"
        type="button"
      >
        {isLocating ? (
             <div className="w-5 h-5 border-2 border-slate-200 border-t-brand-DEFAULT rounded-full animate-spin"></div>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
        )}
      </button>

      {/* Navigate Button for Pickup */}
      {enableExternalNavigation && selectedStore && mode === 'PICKUP' && (
          <button 
            onClick={openGoogleMaps}
            className="absolute top-4 right-4 z-[1000] bg-white text-brand-dark pl-3 pr-4 py-2.5 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all font-black text-xs animate-scale-in group cursor-pointer"
          >
             <div className="w-6 h-6 bg-brand-light rounded-full flex items-center justify-center group-hover:bg-brand-DEFAULT group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <span>Navigate</span>
          </button>
      )}

      {/* Selected Store Info */}
      {selectedStore && (
        <div 
            onClick={mode === 'PICKUP' ? openGoogleMaps : undefined}
            className={`absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-soft-xl flex items-center justify-between border border-white/50 z-[1000] animate-fade-in-up ${mode === 'PICKUP' ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
        >
             <div className="flex items-center gap-3 overflow-hidden">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm text-white flex-shrink-0 ${
                    selectedStore.type === 'produce' ? 'bg-emerald-500' : selectedStore.type === 'dairy' ? 'bg-sky-500' : 'bg-orange-500'
                 }`}>
                    {selectedStore.type === 'produce' ? '🥦' : selectedStore.type === 'dairy' ? '🥛' : '🏪'}
                 </div>
                 <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        {mode === 'DELIVERY' ? 'Delivering From' : 'Pickup At'}
                    </div>
                    <div className="text-sm font-black text-slate-800 truncate">{selectedStore.name}</div>
                 </div>
             </div>
             
             {/* Distance Info - Only show if we have a valid distance calculation */}
             {showRoute && hasUserLocation && (
               <div className="text-right whitespace-nowrap pl-2 border-l border-slate-100 ml-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Dist.</div>
                  <div className="text-sm font-black text-brand-DEFAULT">{dynamicDistance || selectedStore.distance}</div>
               </div>
             )}
        </div>
      )}
    </div>
  );
};
