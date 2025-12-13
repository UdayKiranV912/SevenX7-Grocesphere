
import { MapContainer, TileLayer, Marker, Polyline, Circle } from 'react-leaflet'
import { useEffect, useState } from 'react'
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
}

export default function MapCustomer({
  orderId,
  store,
  customer,
  radius = 6,
  className
}: MapCustomerProps) {
  const deliveryPos = useDeliveryRealtime(orderId)
  const { etaMin, setETA } = useETA()
  const [route, setRoute] = useState<any>(null)

  useEffect(() => {
    fetchRoute(store, customer).then(r => {
      setRoute(r.geometry)
      setETA(r.duration)
    })
  }, [])

  useEffect(() => {
    if (deliveryPos)
      fetchRoute(deliveryPos, customer).then(r => setETA(r.duration))
  }, [deliveryPos])

  return (
    <div className={`map-root ${className || ''}`}>
      <MapHeader eta={etaMin} />

      <MapContainer center={customer} zoom={14} className="map" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle 
            center={store} 
            radius={radius * 1000} 
            color='blue'
            dashArray='5, 5'
            opacity={0.3}
        />
        {route && (
          <Polyline 
            positions={route.coordinates.map(([lng, lat]: any) => [lat, lng])} 
            color='#0f172a'
            weight={4}
          />
        )}
        <Marker position={store} />
        <Marker position={customer} />
        {deliveryPos && <Marker position={deliveryPos} icon={L.divIcon({ html: '🛵', className: 'text-2xl', iconSize: [24,24] })} />}
      </MapContainer>
    </div>
  )
}
