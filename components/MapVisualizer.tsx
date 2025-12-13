
import React, { useEffect, useRef, useState } from 'react';
import { Store, OrderMode } from '../types';
import L from 'leaflet';

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
  driverLocation?: { lat: number; lng: number }; 
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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null); 
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Styling for distinct markers
  const getMarkerHtml = (type: Store['type'], isSelected: boolean) => {
    const size = isSelected ? 48 : 36;
    const emoji = type === 'produce' ? '🥦' : type === 'dairy' ? '🥛' : '🏪';
    const bgColor = type === 'produce' ? 'bg-emerald-500' : type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500';
    const borderColor = isSelected ? 'border-slate-900' : 'border-white';
    
    return `
      <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-110 z-50' : 'hover:scale-110 z-10'}">
         <div class="${bgColor} w-[${size}px] h-[${size}px] rounded-full flex items-center justify-center shadow-lg border-[3px] ${borderColor}" style="width: ${size}px; height: ${size}px;">
            <span class="text-[${isSelected ? '24px' : '18px'}] leading-none select-none">${emoji}</span>
         </div>
         ${isSelected ? '<div class="absolute -bottom-2 w-2 h-2 bg-slate-900 rotate-45"></div>' : ''}
      </div>
    `;
  };

  // Popup Content for "View Details"
  const getPopupHtml = (store: Store) => {
    const emoji = store.type === 'produce' ? '🥦' : store.type === 'dairy' ? '🥛' : '🏪';
    // NOTE: using onclick="window.handleStoreSelect(...)" to bridge Leaflet HTML -> React
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
                <button 
                  onclick="window.handleStoreSelect('${store.id}')"
                  class="text-[9px] font-black text-brand-DEFAULT uppercase tracking-wide bg-brand-light px-3 py-1.5 rounded-md hover:bg-brand-DEFAULT hover:text-white transition-colors cursor-pointer"
                >
                   Shop Now →
                </button>
             </div>
         </div>
      </div>
    `;
  };

  // Center logic - Prioritize User if no selected store, or fit both if both exist
  const mapCenterLat = userLat || (selectedStore ? selectedStore.lat : 12.9716);
  const mapCenterLng = userLng || (selectedStore ? selectedStore.lng : 77.5946);

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocating(true);
    if (onRequestLocation) onRequestLocation();
    
    if (mapInstanceRef.current && userLat && userLng) {
      mapInstanceRef.current.flyTo([userLat, userLng], 17, { animate: true, duration: 1.5 });
      setTimeout(() => setIsLocating(false), 1000);
    } else {
      setTimeout(() => setIsLocating(false), 2000);
    }
  };

  const openGoogleMaps = () => {
    if (selectedStore) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`;
        window.open(url, '_blank');
    }
  };

  useEffect(() => {
    // Bridge for Leaflet Popup Button to React State
    (window as any).handleStoreSelect = (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (store) {
            onSelectStore(store);
            // Also center on it for better UX
            mapInstanceRef.current?.flyTo([store.lat, store.lng], 16, { animate: true });
        }
    };

    return () => {
        // Cleanup global handler
        delete (window as any).handleStoreSelect;
    };
  }, [stores, onSelectStore]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [mapCenterLat, mapCenterLng],
        zoom: 16, // Closer start zoom for better accuracy perception
        zoomControl: false,
        attributionControl: false,
        layers: [
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 20,
                subdomains: 'abcd',
            })
        ]
      });
    }

    // User Location Marker with Pulse & Accuracy Circle
    if (userLat && userLng) {
      // 1. Accuracy Circle
      if (!accuracyCircleRef.current) {
         accuracyCircleRef.current = L.circle([userLat, userLng], {
             radius: 30, // Approximate accuracy radius in meters
             color: '#3b82f6',
             fillColor: '#3b82f6',
             fillOpacity: 0.1,
             weight: 1,
             dashArray: '4, 4'
         }).addTo(mapInstanceRef.current);
      } else {
         accuracyCircleRef.current.setLatLng([userLat, userLng]);
      }

      // 2. The Pin
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-marker-container',
          html: `
            <div class="relative flex flex-col items-center justify-center w-6 h-6">
               <span class="absolute w-full h-full rounded-full bg-blue-500 opacity-75 animate-ping"></span>
               <span class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></span>
               <span class="absolute -top-6 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">You</span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }
    }

    // NEW: Driver Marker
    if (driverLocation) {
        if (!driverMarkerRef.current) {
             const driverIcon = L.divIcon({
                 className: 'driver-marker',
                 html: `
                    <div class="relative flex items-center justify-center w-12 h-12 transition-transform duration-100 ease-linear">
                       <span class="text-4xl filter drop-shadow-xl -scale-x-100 z-50">🛵</span>
                       <div class="absolute bottom-1 w-8 h-2 bg-black/20 blur-sm rounded-full"></div>
                    </div>
                 `,
                 iconSize: [48, 48],
                 iconAnchor: [24, 24]
             });
             driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon, zIndexOffset: 2000 }).addTo(mapInstanceRef.current);
        } else {
             driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
        }
    } else if (driverMarkerRef.current) {
        mapInstanceRef.current.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
    }

    // Store Markers
    markersRef.current.forEach(m => mapInstanceRef.current?.removeLayer(m));
    markersRef.current = [];

    stores.forEach(store => {
      const isSelected = selectedStore?.id === store.id;
      const icon = L.divIcon({
        className: 'custom-store-marker',
        html: getMarkerHtml(store.type, isSelected),
        iconSize: [isSelected ? 48 : 36, isSelected ? 48 : 36],
        iconAnchor: [isSelected ? 24 : 18, isSelected ? 48 : 36] // Tip for selected
      });

      const marker = L.marker([store.lat, store.lng], { icon, zIndexOffset: isSelected ? 900 : 100 })
        .addTo(mapInstanceRef.current!)
        .bindPopup(getPopupHtml(store), {
            closeButton: false,
            className: 'store-popup-container',
            offset: [0, -10],
            autoPan: true
        });
      
      marker.on('click', () => {
        onSelectStore(store);
        // Animate to fit both user and store if possible, else just store
        if (userLat && userLng) {
             const bounds = L.latLngBounds([[userLat, userLng], [store.lat, store.lng]]);
             mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
        } else {
             mapInstanceRef.current?.flyTo([store.lat, store.lng], 16, { animate: true, duration: 1 });
        }
      });

      if (isSelected) {
          setTimeout(() => marker.openPopup(), 300); // Slight delay for smoother animation
      }

      markersRef.current.push(marker);
    });

    // Draw Route
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (showRoute && userLat && userLng && selectedStore) {
       const latlngs: [number, number][] = [[userLat, userLng], [selectedStore.lat, selectedStore.lng]];
       
       // Dashed line for 'pending' path feel
       routeLineRef.current = L.polyline(latlngs, {
         color: '#0f172a',
         weight: 4,
         opacity: 0.7,
         dashArray: '10, 10',
         lineCap: 'round'
       }).addTo(mapInstanceRef.current);

       // Fit bounds slightly padded
       const bounds = L.latLngBounds(latlngs);
       // Include driver in bounds if exists
       if (driverLocation) bounds.extend([driverLocation.lat, driverLocation.lng]);
       
       mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    } else if (selectedStore && userLat && userLng) {
        // If simply selecting a store, ensure user is also visible
        const bounds = L.latLngBounds([[userLat, userLng], [selectedStore.lat, selectedStore.lng]]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    } else if (selectedStore) {
       // If no route, just fly to store
       mapInstanceRef.current.flyTo([selectedStore.lat, selectedStore.lng], 16, { animate: true });
    } else if (userLat && userLng) {
       // Just fly to user if no store selected (on mount)
       // Check if map center is far from user
       const center = mapInstanceRef.current.getCenter();
       const dist = center.distanceTo([userLat, userLng]);
       if (dist > 500) {
           mapInstanceRef.current.flyTo([userLat, userLng], 16, { animate: true });
       }
    }

  }, [stores, userLat, userLng, selectedStore, showRoute, mode, driverLocation]);

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
