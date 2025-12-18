
import React, { useEffect, useRef, useState } from 'react';
import { Store, OrderMode } from '../types';
import { getRoute } from '../services/routingService';

interface MapVisualizerProps {
  stores: Store[];
  userLat: number | null;
  userLng: number | null;
  selectedStore: Store | null;
  onSelectStore: (store: Store) => void;
  className?: string;
  mode: OrderMode; 
  showRoute?: boolean;
  enableExternalNavigation?: boolean;
  onRequestLocation?: () => void;
  driverLocation?: { lat: number; lng: number }; // Driver Location Prop
}

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ 
  stores, 
  userLat, 
  userLng, 
  selectedStore, 
  onSelectStore, 
  className = "h-48",
  mode,
  showRoute = false,
  enableExternalNavigation = false,
  onRequestLocation,
  driverLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // State to check if we have done the initial fly to user (Fix for "wrong location" startup)
  const [hasInitialFlyTo, setHasInitialFlyTo] = useState(false);
  
  // Hash to track when to re-fit bounds (visual stability)
  const prevBoundsHash = useRef<string>("");
  // Hash to track when to re-fetch route (data efficiency)
  const prevRouteKey = useRef<string>("");
  
  // State to hold the actual road geometry path
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  // Styling for distinct markers
  const getMarkerHtml = (type: Store['type'], isSelected: boolean) => {
    const emoji = type === 'produce' ? '🥦' : type === 'dairy' ? '🥛' : '🏪';
    const bgColor = type === 'produce' ? 'bg-emerald-500' : type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500';
    const borderColor = isSelected ? 'border-slate-900' : 'border-white';
    
    // SELECTED: Teardrop Pin Shape
    if (isSelected) {
        // Tailwind class for dynamic border color triangle
        const triangleColor = type === 'produce' ? 'border-t-emerald-500' : type === 'dairy' ? 'border-t-blue-500' : 'border-t-orange-500';
        
        return `
          <div class="relative flex flex-col items-center justify-center transition-all duration-300 z-50 -translate-y-6">
             <!-- Pin Head -->
             <div class="${bgColor} w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border-[3px] ${borderColor} z-20">
                <span class="text-2xl leading-none select-none filter drop-shadow-sm">${emoji}</span>
             </div>
             <!-- Pin Tail -->
             <div class="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] ${triangleColor} -mt-[1px] z-10"></div>
             <!-- Shadow on Ground -->
             <div class="absolute -bottom-1 w-4 h-1.5 bg-black/20 blur-[2px] rounded-full"></div>
          </div>
        `;
    }

    // UNSELECTED: Compact Circle
    return `
      <div class="relative flex items-center justify-center transition-transform duration-300 hover:scale-110 z-10">
         <div class="${bgColor} w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white opacity-90">
            <span class="text-sm leading-none select-none">${emoji}</span>
         </div>
      </div>
    `;
  };

  // Popup Content for "View Details"
  const getPopupHtml = (store: Store) => {
    const emoji = store.type === 'produce' ? '🥦' : store.type === 'dairy' ? '🥛' : '🏪';
    return `
      <div class="min-w-[160px] font-sans">
         <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl border border-slate-100 shadow-sm">
                ${emoji}
            </div>
            <div>
                <h3 class="font-black text-slate-900 text-sm leading-tight">${store.name}</h3>
                <p class="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[140px]">${store.address.split(',')[0]}</p>
            </div>
         </div>
         <div class="flex items-center justify-between gap-2">
             <div class="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                <span>⭐ ${store.rating}</span>
                <span class="text-slate-300">•</span>
                <span>${store.distance}</span>
             </div>
             <div class="flex-1 text-right">
                <span class="text-[9px] font-black text-brand-DEFAULT uppercase tracking-wide bg-brand-light px-2 py-1 rounded-md">
                   Shop Now →
                </span>
             </div>
         </div>
      </div>
    `;
  };

  // Center logic - Prioritize Driver -> User -> Selected Store -> Default
  const mapCenterLat = driverLocation ? driverLocation.lat : (userLat || (selectedStore ? selectedStore.lat : 12.9716));
  const mapCenterLng = driverLocation ? driverLocation.lng : (userLng || (selectedStore ? selectedStore.lng : 77.5946));

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocating(true);
    setHasInitialFlyTo(false); // Reset to force a fly on next update
    if (onRequestLocation) onRequestLocation();
    
    // Fallback: If no location update happens in 5s, stop spinner
    setTimeout(() => {
        setIsLocating(false);
    }, 5000);
  };

  const openGoogleMaps = () => {
    if (selectedStore) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`;
        window.open(url, '_blank');
    }
  };

  // --- 0. Watch for Location Updates to Trigger FlyTo ---
  useEffect(() => {
      // If we get a valid user location and haven't flown yet (or explicitly requested via button)
      if (userLat && userLng && mapInstanceRef.current && !driverLocation) {
          if (!hasInitialFlyTo || isLocating) {
              mapInstanceRef.current.flyTo([userLat, userLng], 15, { animate: true, duration: 1.5 });
              setHasInitialFlyTo(true);
              setIsLocating(false);
          }
      }
  }, [userLat, userLng, isLocating, hasInitialFlyTo, driverLocation]);

  // --- 1. Async Route Fetching Effect (Optimized) ---
  useEffect(() => {
    let isActive = true;

    const fetchPath = async () => {
        if (showRoute && userLat && userLng) {
            // Determine start point: STRICTLY Prioritize Driver if available (Delivery Tracking)
            const startNode = driverLocation || selectedStore;
            
            if (startNode) {
                // Optimization: Increased precision check to 5 decimal places (~1.1m) for smoother updates
                const startStr = `${startNode.lat.toFixed(5)},${startNode.lng.toFixed(5)}`;
                const endStr = `${userLat.toFixed(5)},${userLng.toFixed(5)}`;
                const routeKey = `${startStr}->${endStr}`;

                // Force update if driver moves
                if (prevRouteKey.current === routeKey && routePath.length > 0) {
                    return; // Skip refetch if data is essentially the same
                }

                try {
                    // Fetch real road geometry
                    const points = await getRoute(startNode.lat, startNode.lng, userLat, userLng);
                    
                    if (isActive) {
                        if (points.length > 0) {
                            setRoutePath(points);
                            prevRouteKey.current = routeKey;
                        } else {
                            // Fallback to straight line if routing service returns empty
                            setRoutePath([[startNode.lat, startNode.lng], [userLat, userLng]]);
                        }
                    }
                } catch (e) {
                    // Fallback on error
                    if (isActive) {
                        setRoutePath([[startNode.lat, startNode.lng], [userLat, userLng]]);
                    }
                }
            }
        } else {
            if (isActive) {
                setRoutePath([]);
                prevBoundsHash.current = ""; // Reset hash to allow refit if route appears again
                prevRouteKey.current = "";
            }
        }
    };

    fetchPath();

    return () => { isActive = false; };
  }, [userLat, userLng, selectedStore?.id, driverLocation?.lat, driverLocation?.lng, showRoute]);


  // --- 2. Map Rendering & Updates ---
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Initialize Map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [mapCenterLat, mapCenterLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false, // Disable default to remove Leaflet prefix
        layers: [
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 20,
                attribution: '&copy; OpenStreetMap' // Explicitly set attribution text without link
            })
        ]
      });

      // Add Attribution Control with prefix: false to remove "Leaflet" link
      L.control.attribution({ prefix: false }).addTo(mapInstanceRef.current);
    }

    // User Location Marker with Pulse
    if (userLat && userLng && userLat !== 0 && userLng !== 0) {
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-marker-container',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
               <div class="absolute w-full h-full bg-blue-500/30 rounded-full animate-ping"></div>
               <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16] // Center of the pulse
        });
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }
    }

    // Driver Marker - HIGHEST PRIORITY
    if (driverLocation) {
        if (!driverMarkerRef.current) {
             const driverIcon = L.divIcon({
                 className: 'driver-marker-container',
                 html: `
                    <div class="relative flex flex-col items-center justify-center transition-all duration-300">
                       <div class="absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-[60] animate-bounce-soft">
                          Your Order
                       </div>
                       <div class="relative w-12 h-12 flex items-center justify-center z-50">
                          <div class="absolute inset-0 bg-brand-DEFAULT rounded-full opacity-20 animate-ping"></div>
                          <div class="relative w-10 h-10 bg-white rounded-full border-[3px] border-brand-DEFAULT shadow-xl flex items-center justify-center">
                              <span class="text-xl transform -scale-x-100">🛵</span>
                          </div>
                       </div>
                    </div>
                 `,
                 iconSize: [48, 48],
                 iconAnchor: [24, 24]
             });
             driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { 
                 icon: driverIcon, 
                 zIndexOffset: 10000 // Ensure it is visually on top of everything
             }).addTo(mapInstanceRef.current);
        } else {
             driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
        }
    } else if (driverMarkerRef.current) {
        mapInstanceRef.current.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
    }

    // Store Markers
    markersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m));
    markersRef.current = [];

    stores.forEach(store => {
      const isSelected = selectedStore?.id === store.id;
      
      const icon = L.divIcon({
        className: 'custom-store-marker',
        html: getMarkerHtml(store.type, isSelected),
        iconSize: isSelected ? [48, 60] : [32, 32],
        // Precise Anchoring:
        // Selected: Tip of the pin is at bottom center (x=24, y=60)
        // Unselected: Center of the circle (x=16, y=16)
        iconAnchor: isSelected ? [24, 60] : [16, 16] 
      });

      const marker = L.marker([store.lat, store.lng], { icon, zIndexOffset: isSelected ? 900 : 100 })
        .addTo(mapInstanceRef.current)
        .bindPopup(getPopupHtml(store), {
            closeButton: false,
            className: 'store-popup-container',
            offset: [0, -40], // Move popup above the pin head
            autoPan: true
        });
      
      marker.on('click', () => {
        onSelectStore(store);
        // Force reset hash to ensure we fit bounds for new store
        prevBoundsHash.current = "";
        
        if (!userLat || !userLng) {
             mapInstanceRef.current.flyTo([store.lat, store.lng], 15, { animate: true, duration: 1 });
        }
      });

      if (isSelected && !driverLocation) {
          // Open popup only if not in active tracking mode to avoid covering driver
          setTimeout(() => marker.openPopup(), 300);
      }

      markersRef.current.push(marker);
    });

    // Draw Route (Polyline)
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (routePath.length > 0) {
       // Check if it's a real route (many points) or fallback line (2 points)
       const isRealRoute = routePath.length > 2;
       
       routeLineRef.current = L.polyline(routePath, {
         color: '#3b82f6', // Blue for active route
         weight: 5,
         opacity: 0.8,
         dashArray: isRealRoute ? null : '10, 10', // Dash if fallback straight line
         lineCap: 'round',
         lineJoin: 'round'
       }).addTo(mapInstanceRef.current);

       // Smart Bounds Fitting:
       // If driver is active, we prioritize fitting bounds to show movement
       const boundsHash = `${routePath[0][0]}-${routePath[0][1]}-${routePath[routePath.length-1][0]}-${routePath[routePath.length-1][1]}`;
       
       if (prevBoundsHash.current !== boundsHash) {
           const bounds = L.latLngBounds(routePath);
           mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
           prevBoundsHash.current = boundsHash;
       }
    
    } else if (selectedStore && !showRoute) {
        // Just fly to selected store if not routing and no hash set for it
        const storeHash = `store-${selectedStore.id}`;
        if (prevBoundsHash.current !== storeHash) {
            mapInstanceRef.current.flyTo([selectedStore.lat, selectedStore.lng], 15, { animate: true });
            prevBoundsHash.current = storeHash;
        }
    }

  }, [stores, userLat, userLng, selectedStore, showRoute, mode, driverLocation, routePath]);

  return (
    <div className={`relative w-full bg-slate-100 rounded-[2rem] overflow-hidden shadow-inner border border-white isolate ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 mix-blend-multiply opacity-90" />
      
      {/* Recenter / Locate Button */}
      <button 
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-[500] w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90 border border-slate-100"
      >
        {isLocating ? (
           <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
             <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
           </svg>
        )}
      </button>

      {/* External Nav for Pickup */}
      {enableExternalNavigation && selectedStore && mode === 'PICKUP' && (
         <button 
           onClick={openGoogleMaps}
           className="absolute top-4 right-4 z-[500] bg-slate-900 text-white px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
         >
           <span>Navigate</span>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
           </svg>
         </button>
      )}

      {/* Overlay Gradient for depth */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none z-[400]" />
    </div>
  );
};
