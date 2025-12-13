
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetches a driving route between two points using the free OSRM API.
 * @param startLat Latitude of starting point
 * @param startLng Longitude of starting point
 * @param endLat Latitude of destination
 * @param endLng Longitude of destination
 * @returns Array of [lat, lng] coordinates for Leaflet Polyline, or empty array on failure.
 */
export const getRoute = async (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number
): Promise<[number, number][]> => {
  try {
    // OSRM expects coordinates in "longitude,latitude" format
    // Options: overview=full (detailed path), geometries=geojson (easy parsing)
    const url = `${OSRM_BASE_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Routing failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn("OSRM returned no routes.");
      return [];
    }

    // OSRM returns GeoJSON: [longitude, latitude]
    // Leaflet expects: [latitude, longitude]
    return data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
    
  } catch (error) {
    console.error("OSM Routing Service Error:", error);
    return [];
  }
};
