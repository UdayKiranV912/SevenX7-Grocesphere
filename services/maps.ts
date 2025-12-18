
import { NominatimResult } from './nominatim'; // Keeping interface for type compatibility

export interface MapSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

// 1. Geocoding (Nominatim)
export const geocode = async (query: string): Promise<MapSearchResult[]> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
      { headers: { 'User-Agent': 'Grocesphere-Customer/1.0' } }
    );
    if (!response.ok) throw new Error("Geocoding failed");
    return await response.json();
  } catch (error) {
    console.error("Map API Error:", error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<MapSearchResult | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      { headers: { 'User-Agent': 'Grocesphere-Customer/1.0' } }
    );
    if (!response.ok) throw new Error("Reverse geocoding failed");
    return await response.json();
  } catch (error) {
    console.error("Map API Error:", error);
    return null;
  }
};

// 2. Routing (OSRM)
export const route = async (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number
): Promise<[number, number][]> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes?.[0]) return [];
    
    // Convert [lon, lat] -> [lat, lon] for Leaflet
    return data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
  } catch (error) {
    console.error("Routing Error:", error);
    return [];
  }
};
