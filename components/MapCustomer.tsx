
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap } from 'react-leaflet'
import { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import './MapCustomer.css'
import { fetchRoute } from '../services/routingService'
import { useDeliveryRealtime } from '../hooks/useDeliveryRealtime'
import { useETA } from '../hooks/useETA'
import MapHeader from './MapHeader'

// Fix default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapCustomerProps {
    orderId: string;
    store: [number, number];
    customer: [number, number];
    radius?: number;
    className?: string;
    storeName?: string;
    storeRating?: number;
    distance?: string;
    onShopNow?: () => void;
}

// Component to handle map view adjustments
const MapController = ({ 
    bounds 
}: { 
    bounds: L.LatLngBoundsExpression | null 
}) => {
    const map = useMap();
    
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
        }
    }, [bounds, map]);

    return null;
};

export default function MapCustomer({
  orderId,
  store,
  customer,
  radius = 6,
  className,
  storeName,
  storeRating,
  distance,
  onShopNow
}: MapCustomerProps) {
  const deliveryPos = useDeliveryRealtime(orderId)
  const { etaMin, setETA } = useETA()
  const [route, setRoute] = useState<any>(null)
  
  // Live GPS State
  const [liveUserPos, setLiveUserPos] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);

  // Icons
  const storeIcon = L.divIcon({
      className: 'custom-store-icon',
      html: `<div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-brand-DEFAULT">🏪</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
  });

  const deliveryIcon = L.divIcon({
      className: 'custom-delivery-icon',
      html: `<div class="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
  });

  const driverIcon = L.divIcon({
      className: 'driver-marker',
      html: `
         <div class="relative flex items-center justify-center w-12 h-12 transition-transform duration-1000 ease-linear">
            <span class="text-4xl filter drop-shadow-xl -scale-x-100 z-50">🛵</span>
         </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
  });

  const userPulseIcon = L.divIcon({
      className: 'user-pulse',
      html: `
        <div class="relative flex items-center justify-center w-6 h-6">
           <span class="absolute w-12 h-12 rounded-full bg-blue-500 opacity-20 animate-ping"></span>
           <div class="relative w-4 h-4 rounded-full bg-blue-600 border-[3px] border-white shadow-md z-50"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
  });

  // Watch Position
  useEffect(() => {
      if (!navigator.geolocation) return;
      
      const watchId = navigator.geolocation.watchPosition(
          (pos) => {
              setLiveUserPos([pos.coords.latitude, pos.coords.longitude]);
          },
          (err) => console.warn("Live tracking error", err),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch Route & ETA
  useEffect(() => {
    // Only fetch route once for static path (Store -> Customer)
    // Dynamic rerouting for driver would be separate, but this is the "Planned Route"
    fetchRoute(store, customer).then(r => {
      setRoute(r.geometry)
      setETA(r.duration)
    })
  }, []) // Keep simplified for performance

  useEffect(() => {
    if (deliveryPos)
      fetchRoute(deliveryPos, customer).then(r => setETA(r.duration))
  }, [deliveryPos])

  // Update Bounds dynamically
  useEffect(() => {
      const points: [number, number][] = [store, customer];
      if (deliveryPos) points.push(deliveryPos);
      if (liveUserPos) points.push(liveUserPos);

      const latLngs = points.map(p => L.latLng(p[0], p[1]));
      const bounds = L.latLngBounds(latLngs);
      setMapBounds(bounds);
  }, [store, customer, deliveryPos, liveUserPos]);

  return (
    <div className={`map-root ${className || ''}`}>
      <MapHeader eta={etaMin} />

      <MapContainer center={customer} zoom={14} className="map" zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        {/* Dynamic View Controller */}
        <MapController bounds={mapBounds} />

        {/* Store Radius */}
        <Circle 
            center={store} 
            radius={200} 
            color='gray'
            fillColor='gray'
            fillOpacity={0.1}
            weight={1}
            dashArray='4, 4'
        />

        {/* Route Line */}
        {route && (
          <Polyline 
            positions={route.coordinates.map(([lng, lat]: any) => [lat, lng])} 
            color='#0f172a'
            weight={5}
            opacity={0.6}
            lineCap='round'
          />
        )}

        {/* Store Marker */}
        <Marker position={store} icon={storeIcon} zIndexOffset={50}>
          <Popup closeButton={false} offset={[0, -10]} className="store-popup-container">
            <div className="min-w-[140px] text-center font-sans p-1">
              <h3 className="font-black text-slate-800 text-sm mb-1">{storeName || 'Store Location'}</h3>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 mb-3">
                 {storeRating && <span className="text-amber-500">⭐ {storeRating}</span>}
                 {distance && <span>• {distance}</span>}
              </div>
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      if (onShopNow) onShopNow();
                  }}
                  className="w-full bg-slate-900 text-white text-[10px] font-black uppercase py-2.5 rounded-lg hover:bg-black transition-colors shadow-lg active:scale-95"
              >
                  Shop Here Again
              </button>
            </div>
          </Popup>
        </Marker>

        {/* Delivery Address Marker (Fixed Destination) */}
        <Marker position={customer} icon={deliveryIcon} />

        {/* Live User Location (Blue Pulse) - Shows "You are here" */}
        {liveUserPos && (
            <>
                <Marker position={liveUserPos} icon={userPulseIcon} zIndexOffset={100} />
                <Circle 
                    center={liveUserPos} 
                    radius={30} 
                    color='#3b82f6' 
                    weight={1} 
                    opacity={0.2} 
                    fillOpacity={0.1} 
                />
            </>
        )}

        {/* Delivery Driver */}
        {deliveryPos && (
            <Marker position={deliveryPos} icon={driverIcon} zIndexOffset={1000} />
        )}

      </MapContainer>
      
      {/* Recenter Control */}
      <button 
        onClick={() => {
            const points: [number, number][] = [store, customer];
            if (deliveryPos) points.push(deliveryPos);
            const latLngs = points.map(p => L.latLng(p[0], p[1]));
            setMapBounds(L.latLngBounds(latLngs));
        }}
        className="absolute bottom-4 right-4 z-[500] bg-white p-3 rounded-2xl shadow-xl text-slate-700 hover:text-brand-DEFAULT transition-colors active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
