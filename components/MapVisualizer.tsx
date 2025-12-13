
import React, { useEffect, useState } from 'react';
import { Store, OrderMode } from '../types';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

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

// Sub-component to handle map view updates (FlyTo/FitBounds)
const MapController: React.FC<{
  userLat: number | null;
  userLng: number | null;
  selectedStore: Store | null;
  driverLocation?: { lat: number; lng: number };
  showRoute: boolean;
}> = ({ userLat, userLng, selectedStore, driverLocation, showRoute }) => {
  const map = useMap();

  useEffect(() => {
    // 1. Show Route: Fit bounds to User + Store + Driver
    if (showRoute && userLat && userLng && selectedStore) {
       const bounds = L.latLngBounds([[userLat, userLng], [selectedStore.lat, selectedStore.lng]]);
       if (driverLocation) bounds.extend([driverLocation.lat, driverLocation.lng]);
       map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    } 
    // 2. Select Store: Fly to Store
    else if (selectedStore) {
        map.flyTo([selectedStore.lat, selectedStore.lng], 16, { animate: true });
    } 
    // 3. Just User: Fly to User if far away
    else if (userLat && userLng) {
       const center = map.getCenter();
       const dist = center.distanceTo([userLat, userLng]);
       if (dist > 500) {
           map.flyTo([userLat, userLng], 16, { animate: true });
       }
    }
  }, [userLat, userLng, selectedStore, showRoute, driverLocation, map]);

  return null;
};

// Sub-component for the Recenter Button inside Map context
const RecenterControl: React.FC<{
  userLat: number | null;
  userLng: number | null;
  onRequestLocation?: () => void;
}> = ({ userLat, userLng, onRequestLocation }) => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocating(true);
    
    if (onRequestLocation) onRequestLocation();
    
    if (userLat && userLng) {
      map.flyTo([userLat, userLng], 17, { animate: true, duration: 1.5 });
      setTimeout(() => setIsLocating(false), 1000);
    } else {
      setTimeout(() => setIsLocating(false), 2000);
    }
  };

  return (
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
  );
};

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
  
  // Custom Cluster Icon
  const createClusterCustomIcon = (cluster: any) => {
    return L.divIcon({
      html: `<div class="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black border-4 border-white shadow-lg text-sm">${cluster.getChildCount()}</div>`,
      className: 'custom-marker-cluster',
      iconSize: L.point(40, 40, true),
    });
  };

  // Helper for Store Marker Icon
  const getStoreIcon = (type: Store['type'], isSelected: boolean) => {
    const size = isSelected ? 48 : 36;
    const emoji = type === 'produce' ? '🥦' : type === 'dairy' ? '🥛' : '🏪';
    const bgColor = type === 'produce' ? 'bg-emerald-500' : type === 'dairy' ? 'bg-blue-500' : 'bg-orange-500';
    const borderColor = isSelected ? 'border-slate-900' : 'border-white';
    
    return L.divIcon({
      className: 'custom-store-marker',
      html: `
        <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-110 z-50' : 'hover:scale-110 z-10'}">
           <div class="${bgColor} w-[${size}px] h-[${size}px] rounded-full flex items-center justify-center shadow-lg border-[3px] ${borderColor}" style="width: ${size}px; height: ${size}px;">
              <span class="text-[${isSelected ? '24px' : '18px'}] leading-none select-none">${emoji}</span>
           </div>
           ${isSelected ? '<div class="absolute -bottom-2 w-2 h-2 bg-slate-900 rotate-45"></div>' : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size/2, size]
    });
  };

  const userIcon = L.divIcon({
    className: 'user-marker-container',
    html: `
      <div class="relative flex flex-col items-center justify-center w-6 h-6">
         <span class="absolute w-8 h-8 rounded-full bg-blue-500 opacity-40 animate-ping"></span>
         <div class="relative w-4 h-4 rounded-full bg-blue-600 border-[3px] border-white shadow-md z-50 box-content"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

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

  const mapCenterLat = userLat || (selectedStore ? selectedStore.lat : 12.9716);
  const mapCenterLng = userLng || (selectedStore ? selectedStore.lng : 77.5946);

  const openGoogleMaps = () => {
    if (selectedStore) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`;
        window.open(url, '_blank');
    }
  };

  return (
    <div className={`relative w-full bg-slate-100 rounded-[2rem] overflow-hidden shadow-inner border border-white isolate ${className}`}>
      
      <MapContainer 
        center={[mapCenterLat, mapCenterLng]} 
        zoom={16} 
        zoomControl={false} 
        className="w-full h-full z-0 mix-blend-multiply opacity-90"
      >
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapController 
          userLat={userLat} 
          userLng={userLng} 
          selectedStore={selectedStore} 
          driverLocation={driverLocation} 
          showRoute={showRoute} 
        />

        {/* User Location: Pulse & Accuracy Circle */}
        {userLat && userLng && (
          <>
            <Circle 
              center={[userLat, userLng]} 
              radius={50} 
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1, opacity: 0.4, dashArray: '4, 8' }} 
            />
            <Marker position={[userLat, userLng]} icon={userIcon} zIndexOffset={1000} />
          </>
        )}

        {/* Driver Marker */}
        {driverLocation && (
           <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} zIndexOffset={2000} />
        )}

        {/* Store Clusters */}
        <MarkerClusterGroup 
          chunkedLoading 
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={40}
        >
          {stores.map(store => {
             const isSelected = selectedStore?.id === store.id;
             const emoji = store.type === 'produce' ? '🥦' : store.type === 'dairy' ? '🥛' : '🏪';
             
             return (
               <Marker 
                  key={store.id} 
                  position={[store.lat, store.lng]} 
                  icon={getStoreIcon(store.type, isSelected)}
                  zIndexOffset={isSelected ? 900 : 100}
                  eventHandlers={{
                    click: () => onSelectStore(store)
                  }}
               >
                 <Popup closeButton={false} offset={[0, -10]} className="store-popup-container">
                    <div className="min-w-[160px] font-sans">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl border border-slate-100 shadow-sm">
                                {emoji}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-sm leading-tight">{store.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[140px]">{store.address.split(',')[0]}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                <span>⭐ {store.rating}</span>
                                <span className="text-slate-300">•</span>
                                <span>{store.distance}</span>
                            </div>
                            <div className="flex-1 text-right">
                                <button 
                                  onClick={() => onSelectStore(store)}
                                  className="text-[9px] font-black text-brand-DEFAULT uppercase tracking-wide bg-brand-light px-3 py-1.5 rounded-md hover:bg-brand-DEFAULT hover:text-white transition-colors cursor-pointer"
                                >
                                   Shop Now →
                                </button>
                            </div>
                        </div>
                    </div>
                 </Popup>
               </Marker>
             );
          })}
        </MarkerClusterGroup>

        {/* Route Line */}
        {showRoute && userLat && userLng && selectedStore && (
           <Polyline 
              positions={[[userLat, userLng], [selectedStore.lat, selectedStore.lng]]} 
              pathOptions={{ color: '#0f172a', weight: 4, opacity: 0.7, dashArray: '10, 10', lineCap: 'round' }} 
           />
        )}

        <RecenterControl 
           userLat={userLat} 
           userLng={userLng} 
           onRequestLocation={onRequestLocation} 
        />

      </MapContainer>

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
