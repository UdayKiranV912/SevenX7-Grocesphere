
export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  'User-Agent': 'Grocesphere-App/1.0',
  'Accept-Language': 'en-US,en;q=0.9' // Prefer English results
};

/**
 * Forward Geocoding: Search for an address
 */
export const geocode = async (query: string): Promise<NominatimResult[]> => {
  try {
    const url = `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
    const response = await fetch(url, { headers: HEADERS });
    
    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Nominatim Geocode Failed:', error);
    return [];
  }
};

/**
 * Reverse Geocoding: Get address from coordinates
 */
export const reverse = async (lat: number, lon: number): Promise<NominatimResult | null> => {
  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, { headers: HEADERS });
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Nominatim Reverse Failed:', error);
    return null;
  }
};
