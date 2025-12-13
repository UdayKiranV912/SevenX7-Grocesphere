const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetches a driving route between two points using the free OSRM API.
 */
export const getRoute = async (
  startLat: number, 
  startLng: number, 
  endLat: number, 
  endLng: number
): Promise<[number, number][]> => {
  try {
    const url = `${OSRM_BASE_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Routing failed: ${response.statusText}`);

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return [];

    return data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
  } catch (error) {
    console.error("OSM Routing Service Error:", error);
    return [];
  }
};

/**
 * Enhanced fetchRoute for MapCustomer that returns full geometry and duration.
 */
export const fetchRoute = async (
  from: [number, number],
  to: [number, number]
) => {
  const r = await fetch(
    `${OSRM_BASE_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
  )
  const j = await r.json()
  return {
    geometry: j.routes[0].geometry,
    duration: j.routes[0].duration
  }
}
